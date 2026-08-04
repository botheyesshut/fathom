// THE STATION'S WORKS — two approaches, and the bargain in digging.
//
// Sean's ruling, and the reason this exists: "the only reason the crew would be
// ashore in the base is if the sub were docked at the cavern beachhead... There
// isn't any good reason to leave a member in the base at all if the sub is going
// to sea. The base will defend itself with guns and mines and drones and who
// knows what all else... including human military to defend against invaders
// both from sea and from further back in the caves if there are points of egress
// in the base leading to the tunnel network."
//
// So: nothing here may depend on a crewman standing in a station, a station has
// TWO faces, and cutting rock has to cost something as well as buy something.
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
// A CLOCK THAT DOES NOT MOVE.
//
// `resumeGame` reseeds the gameplay dice with `worldSeed ^ Date.now()` — on
// purpose, so reloading a save does not replay the same coin flips. The cost is
// that every suite exercising save/reload became unreproducible from that line
// on: combat rolls, item detonations and curse bleeds all differed run to run,
// inside checks written tolerantly enough not to notice. A regression could sit
// in that wobble indefinitely.
//
// Only `now` is pinned. `new Date()` still works, because the transcript export
// formats real dates and has no business being frozen.
// MONOTONIC, NOT FROZEN. A clock pinned to one instant is reproducible and also
// wrong: `restart()` derives a fresh world seed from `Date.now()`, so a stopped
// clock made every restart regenerate the SAME ocean — and save.test caught it,
// which is the check doing exactly its job. This advances a fixed step per read,
// so the Nth call is always the same number across runs while still moving
// forward within one.
let _tick = 1754265600000;   // 2025-08-04T00:00:00Z, arbitrary
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (_tick += 1000) : t[p]; } });
const sb = { console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
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
var __X = { L: __L, state, WORKS, workByKey, baseHold, caveExposure, nextWork, weakFace,
  migrateBaseWorks, DEFENCE_LEGACY, placeWord, baseTick, startSiege, breachStation,
  networkNear, digHolesThrough, DIG_SAFE_TILES,
  fortifyBase, onOwnDeckNow, plural };
`, sb, { timeout: 120000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, detail) => {
  if (c) { ok++; console.log('  PASS  ' + what + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + what + (detail ? '  — ' + detail : '')); }
};
const mkBase = (over) => Object.assign({
  q: 0, r: 0, d: 1200, kind: 'cave', stores: { crates: 100, relics: 0, items: {} },
  defence: 0, threat: 0, siege: null, breached: false, boarder: null,
  carved: [], works: [], _worksFrom: true }, over || {});

console.log('THE WORKS — a station holds because of what is bolted to it\n');

//--- 1. NOTHING HERE NEEDS A CREWMAN ------------------------------------------
console.log('--- 1. NOBODY IS STATIONED IN A STATION ---');
X.state.base = mkBase({ works: ['lock', 'turret'] });
X.state.crew = [];
const holdNoCrew = X.baseHold('sea');
X.state.crew = [{ name: 'A', role: 'diver', xp: 9, conditions: [] },
                { name: 'B', role: 'engineer', xp: 9, conditions: [] }];
const holdWithCrew = X.baseHold('sea');
check(holdNoCrew === holdWithCrew && holdNoCrew > 1,
  'what a station holds does not change with who is in the crew',
  'no crew ' + holdNoCrew + ', full crew ' + holdWithCrew);
X.state.crew = [];

//--- 2. TWO APPROACHES --------------------------------------------------------
console.log('\n--- 2. THE SEA AND THE WORKINGS ARE DIFFERENT DOORS ---');
X.state.base = mkBase({ works: ['lock', 'turret', 'netbar'] });
const seaOnly = { sea: X.baseHold('sea'), cave: X.baseHold('cave') };
check(seaOnly.sea > seaOnly.cave,
  'works laid on the water do nothing for the back of the station',
  'lock+turret+barrage -> sea ' + seaOnly.sea + ', workings ' + seaOnly.cave);
X.state.base = mkBase({ works: ['grille', 'choke'] });
const caveOnly = { sea: X.baseHold('sea'), cave: X.baseHold('cave') };
check(caveOnly.cave > caveOnly.sea,
  '...and the reverse is just as true',
  'grille+choke -> sea ' + caveOnly.sea + ', workings ' + caveOnly.cave);
X.state.base = mkBase({ works: ['watch'] });
check(X.baseHold('sea') === X.baseHold('cave') && X.baseHold('sea') > 1,
  'a hired watch answers to both, being people rather than plate',
  'sea ' + X.baseHold('sea') + ', workings ' + X.baseHold('cave'));

//--- 3. A BACK DOOR IS A HOLE YOU CUT, NOT ROCK YOU MOVED ----------------------
// The first version of this read `carved.length`, so moving rock raised the odds
// of an attack from behind whether or not a cut had ever met open cave. Sean:
// "So I decide I want to carve one unit of space and I do so, and when I do the
// rock falls inward and there's a tunnel exposed back there for sure, every
// time?" It never exposed anything — it just quietly counted tiles. Exposure is
// counted in HOLES now, each one an announced event.
console.log('\n--- 3. WHAT CUTTING ROCK COSTS YOU ---');
X.state.base = mkBase({ carved: new Array(40).fill('x'), holes: 0 });
const dugNoHole = X.caveExposure();
check(dugNoHole === 0,
  'forty rooms cut and nothing broken into is still a sealed station',
  'exposure ' + dugNoHole);
X.state.base = mkBase({ carved: new Array(6).fill('x'), holes: 1 });
const hole1 = X.caveExposure();
X.state.base = mkBase({ carved: new Array(6).fill('x'), holes: 3 });
const hole3 = X.caveExposure();
check(hole1 > 0 && hole3 > hole1, 'one hole opens the back, and each one after widens it',
  '1 hole ' + hole1.toFixed(2) + ' -> 3 holes ' + hole3.toFixed(2));
X.state.base = mkBase({ holes: 12 });
check(X.caveExposure() <= 0.6, 'but the front door never stops being the likelier one',
  'capped at ' + X.caveExposure().toFixed(2));
// And a cut can only break into something that is there to break into. Do NOT
// assume a coordinate is empty — 99999,99999 had a chamber near it, which is
// what an infinite world is for. Go and find a lonely one, then assert.
let lonely = null;
for (let q = 400; q < 900 && !lonely; q += 7) {
  for (let r = 400; r < 900; r += 7) {
    if (X.networkNear(q, r, 1200) === 0) { lonely = { q, r }; break; }
  }
}
check(!!lonely, 'there is somewhere in the rock with no chamber beside it',
  lonely ? lonely.q + ',' + lonely.r : 'searched 5,000 spots and found none');
if (lonely) {
  X.state.base = mkBase({ q: lonely.q, r: lonely.r, d: 1200, carved: new Array(20).fill('x') });
  let holed = 0;
  for (let i = 0; i < 500; i++) if (X.digHolesThrough(X.state.base)) holed++;
  check(holed === 0, 'and five hundred cuts there hole through to nothing',
    holed + ' holes in 500 cuts, neighbours: ' + X.networkNear(lonely.q, lonely.r, 1200));
}

//--- 4. THE BUTTON OFFERS THE WEAKER SIDE -------------------------------------
console.log('\n--- 4. FORTIFY READS THE STATION ---');
X.state.base = mkBase({ carved: [] });
check(X.weakFace() === 'sea', 'with nothing broken into, there is only the sea to answer for', X.weakFace());
X.state.base = mkBase({ holes: 2, works: ['lock', 'turret'] });
check(X.weakFace() === 'cave',
  'hole through and neglect the back, and the button starts offering you a grille',
  'weaker face: ' + X.weakFace() + ' (next: ' + (X.nextWork(X.weakFace()) || {}).name + ')');
X.state.base = mkBase({ holes: 2, works: ['grille', 'choke', 'watch', 'drone'] });
check(X.weakFace() === 'sea', '...and swaps back once the workings are answered for', X.weakFace());

//--- 5. AN OLD SAVE KEEPS WHAT IT PAID FOR ------------------------------------
console.log('\n--- 5. A STATION SAVED BEFORE THE WORKS EXISTED ---');
const legacy = { q: 0, r: 0, d: 1200, kind: 'ruin', stores: { crates: 0, relics: 0, items: {} },
                 defence: 3, threat: 0, siege: null, breached: false, boarder: null, carved: [] };
X.state.base = legacy;
X.migrateBaseWorks(legacy);
check(Array.isArray(legacy.works) && legacy.works.length === 3,
  'three rungs of the old ladder become the three works they were',
  legacy.works.join(', '));
check(X.baseHold('sea') > 1, 'and the station still holds what it used to hold',
  'sea hold ' + X.baseHold('sea'));
const before = legacy.works.slice();
X.migrateBaseWorks(legacy);
check(legacy.works.length === before.length,
  'migrating twice does not fit the same works twice', legacy.works.join(', '));

//--- 6. THE BREACH TAKES THE SIDE THAT FAILED ---------------------------------
console.log('\n--- 6. WHAT A BREACH WRECKS ---');
X.state.base = mkBase({ works: ['turret', 'grille'], siege: { power: 99, breach: 100, face: 'cave' } });
X.state.creatures = [];
X.state.foot = null;
X.breachStation();
const left = X.state.base.works;
check(left.indexOf('turret') >= 0 && left.indexOf('grille') < 0,
  'something that came through the workings did not wreck the gun laid on the water',
  'left standing: ' + (left.join(', ') || '(nothing)'));

//--- 7. THE WORD FOR THE PLACE YOU ARE STANDING IN ----------------------------
console.log('\n--- 7. A CAVERN IS NOT A DECK ---');
const words = ['hull', 'cave', 'ruin', 'deepruin', 'beach'].map(k => k + '->' + X.placeWord(k));
check(X.placeWord('hull') === 'deck', 'a sunken submarine has decks, because it is a boat', words.join('  '));
check(X.placeWord('cave') !== 'deck' && X.placeWord('ruin') !== 'deck' && X.placeWord('beach') !== 'deck',
  'and nothing else does', words.join('  '));

console.log('\n' + (fail === 0 ? 'THE WORKS HOLD — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
