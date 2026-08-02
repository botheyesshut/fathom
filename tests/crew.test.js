// THE ROSTER. `node tests/crew.test.js`
//
// Sean: "I like the idea of a sonarman (but we should de-gender it somehow
// without it sounding bland or too obviously evasive in a political way)... what
// if new sailors started with two sailors, Mate and Sonar, and they could later
// upgrade to five or six? So the party would start at three."
//
// The de-gendering is a change of REGISTER, not a scrub — a hand is named for
// the job they do on the boat. The risky half is the rename: there are campaigns
// in progress with hands whose role is `sonarman`, and they must not become
// people the game has no name for.
'use strict';
const fs = require('fs'), vm = require('vm');
function stub() {
  const fn = function () { return s };
  const s = new Proxy(fn, { get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
      return s;
    }, apply() { return s }, set() { return true }, has() { return true } });
  return s;
}
const script = fs.readFileSync(process.argv[2] || __dirname + '/../fathom-chart.html', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
  if (p === 'addEventListener') return () => {};
  return stub();
}});
const sb = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
  parseInt, parseFloat, isNaN, isFinite, setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {}, location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb;
vm.createContext(sb);
vm.runInContext(script + `
;var __L=[]; log=function(t,c,e){ __L.push(String(t)) };
gameStarted = true;
var __X = { L: __L, state, ROLES, ROLE_WAS, CREW_ROLES, roleName, migrateCrewRoles,
  startingCrew, crewLvl, firstMate, mateName, SUBS, portRows, CREW_HIRE_COST };
`, sb, { timeout: 120000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};

console.log('THE ROSTER — ' + X.CREW_ROLES.length + ' trades, and nobody is a man by title\n');

//--- 1. THE DE-GENDERING -----------------------------------------------------
console.log('--- 1. NAMED FOR THE JOB, NOT THE SEX OF WHO DOES IT ---');
const names = X.CREW_ROLES.map(k => X.ROLES[k].name);
console.log('    ' + names.join(', '));
const gendered = X.CREW_ROLES.filter(k => /man\b|men\b|boy|girl|woman/i.test(k + ' ' + X.ROLES[k].name));
check(gendered.length === 0, 'no role carries a sex in its name', gendered.join(', ') || 'none of the ' + X.CREW_ROLES.length);
const bland = X.CREW_ROLES.filter(k => /person|operator|specialist|technician/i.test(X.ROLES[k].name));
check(bland.length === 0, 'and none of them took the bland way out either',
  bland.length ? bland.join(', ') : 'no -person, -operator, -specialist');
check(X.CREW_ROLES.every(k => (X.ROLES[k].of || '').length > 12),
  'every trade says what it is for', X.CREW_ROLES.length + ' described');

//--- 2. A CAMPAIGN IN PROGRESS DOES NOT LOSE ITS PEOPLE ----------------------
console.log('\n--- 2. AN OLD SAVE\'S HANDS KEEP THEIR JOBS ---');
X.state.crew = [
  { name: 'Salt', role: 'sonarman', xp: 9, conditions: [], nerve: 70 },
  { name: 'Green', role: 'engineer', xp: 4, conditions: [], nerve: 70 },
  { name: 'Ida', role: 'diver', xp: 2, conditions: [], nerve: 70 },
];
X.state.portHire = { name: 'Bel', role: 'sonarman' };
X.migrateCrewRoles();
const after = X.state.crew.map(m => m.role);
check(after.join(',') === 'ear,wrench,diver', 'sonarman becomes the Ear, engineer the Wrench, diver stays',
  'sonarman,engineer,diver -> ' + after.join(','));
check(X.state.portHire.role === 'ear', 'and the hand waiting on the quay is migrated too',
  X.state.portHire.role);
check(X.state.crew.every(m => X.ROLES[m.role]), 'nobody ends up in a trade the game cannot name',
  after.map(r => X.roleName(r)).join(', '));
// The dials they were wired to must still find them.
check(X.crewLvl('ear') === 3 && X.crewLvl('wrench') === 2,
  'and the dials they turn still find them', 'ear ' + X.crewLvl('ear') + ', wrench ' + X.crewLvl('wrench'));
// Idempotent — a save loaded twice must not double-migrate into nothing.
X.migrateCrewRoles();
check(X.state.crew.map(m => m.role).join(',') === 'ear,wrench,diver',
  'migrating twice changes nothing', X.state.crew.map(m => m.role).join(','));

//--- 3. YOU DO NOT CAST OFF ALONE -------------------------------------------
console.log('\n--- 3. TWO HANDS, AND A BERTH LEFT OPEN ---');
const fresh = X.startingCrew();
check(fresh.length === 2, 'a new captain sails with two hands', fresh.length + ' aboard');
check(fresh[0].name !== fresh[1].name, 'and they are two different people',
  fresh.map(m => m.name + ' (' + X.roleName(m.role) + ')').join(', '));
check(fresh.every(m => m.xp === 0 && !m.lost && !m.wounded && Array.isArray(m.conditions)),
  'both green, both whole, both properly built', 'xp 0, no wounds, conditions []');
check(fresh.some(m => m.role === 'ear'),
  'one of them is the Ear — knowing where the floor opens is the early game',
  fresh.map(m => m.role).join(' + '));
X.state.crew = fresh;
check(!!X.mateName(), 'and one of the two is your Mate from turn one', X.mateName());

//--- 4. THE LADDER ----------------------------------------------------------
console.log('\n--- 4. THREE, FOUR, SIX ---');
const caps = Object.keys(X.SUBS).map(k => ({ n: X.SUBS[k].name, cap: X.SUBS[k].crewCap, tier: X.SUBS[k].tier }))
  .sort((a, b) => a.tier - b.tier);
for (const c of caps) console.log('    ' + c.n.padEnd(9) + ' cap ' + c.cap);
check(caps[0].cap === 3, 'the Erebus takes three — two aboard and one empty berth',
  'an empty berth is what makes the Hiring Hall and the 5-crate sign-on mean anything');
check(caps.every((c, i) => i === 0 || c.cap >= caps[i - 1].cap), 'and the cap never goes backwards',
  caps.map(c => c.cap).join(' -> '));
check(caps[caps.length - 1].cap >= 5, 'the best hull carries five or six, as asked',
  'top cap ' + caps[caps.length - 1].cap);

//--- 5. THE HIRING HALL STILL HAS A BERTH TO SELL ---------------------------
console.log('\n--- 5. THE HALL IS NOT DEAD ON ARRIVAL ---');
X.state.crew = X.startingCrew();
X.state.cargoBanked = 50;
X.state.q = 1; X.state.r = 0; X.state.currentDepth = 0;
X.state.portHire = null;
let hireRow = null;
try { hireRow = (X.portRows() || []).filter(r => r.act === 'hire')[0]; } catch (e) {}
check(!!hireRow, 'with two aboard and a cap of three, the hall still offers a hand',
  hireRow ? hireRow.name + ' — ' + hireRow.desc : 'NO HIRE ROW');
check(!hireRow || /the (Ear|Wrench|Gun|Diver|Hand)/.test(hireRow.desc),
  'and the offer names the trade properly', hireRow ? hireRow.desc.slice(0, 60) + '...' : '—');

console.log('\n' + (fail === 0 ? 'THE ROSTER HOLDS — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
