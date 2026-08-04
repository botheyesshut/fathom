// THE FIRST MATE SPEAKS UP. `node tests/mate.test.js`
//
// Sean: "what if we also had a First Mate to give situation reports when they
// arise, such as 'Sail ho, capn, 600 meters SW' or 'Something at the hull, capn,
// she's under attack!'"
//
// The rule this is built to, and the thing this file exists to hold: IF THE MATE
// SPEAKS, YOU MUST HAVE A DECISION TO MAKE. He told me two sessions ago that the
// log was unreadable and we cut it to one description per hex and depth. A voice
// that chatters would undo that in a morning — so the Mate must never ADD a
// line, only ever say the line the boat was already going to say.
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
;var __L=[]; log=function(t,c,e){ __L.push({t:String(t), c:String(c||''), e:String(e||'')}) };
gameStarted = true;
var __X = { L: __L, state, mateSays, mateName, mateAddress, firstMate, AIR_STEPS, airCounsel:(typeof airCounsel==='function'?airCounsel:null) };
`, sb, { timeout: 120000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};
const crew = (n) => { X.state.crew = n; X.state.aiMate = false; };
const said = () => X.L.map(l => l.t);

console.log('THE FIRST MATE — a voice, not a chatterbox\n');

//--- 1. THE MATE NEVER ADDS A LINE ------------------------------------------
console.log('--- 1. ONE EVENT, ONE LINE, WHOEVER IS ABOARD ---');
crew([]);
X.L.length = 0;
X.mateSays('spoken version', 'plain version', '', 'SAIL');
const alone = said().length;
crew([{ name: 'Ida Verrall', role: 'sonarman', xp: 5, conditions: [], nerve: 70 }]);
X.L.length = 0;
X.mateSays('spoken version', 'plain version', '', 'SAIL');
const withMate = said().length;
check(alone === 1 && withMate === 1,
  'the same event is exactly one line with a mate and without one',
  'alone ' + alone + ', with a mate ' + withMate);

//--- 2. WHO SAYS IT --------------------------------------------------------
console.log('\n--- 2. WHO IS TELLING YOU ---');
crew([]);
X.L.length = 0; X.mateSays('Sail ho', 'Sail sighted', '', 'SAIL');
const soloLine = said()[0];
check(soloLine === 'Sail sighted' && !/:/.test(soloLine),
  'sailing alone, the boat reports flatly off the instruments', soloLine);

crew([{ name: 'Ida Verrall', role: 'sonarman', xp: 9, conditions: [], nerve: 70 }]);
X.L.length = 0; X.mateSays('Sail ho', 'Sail sighted', '', 'SAIL');
const mateLine = said()[0];
check(/Ida Verrall/.test(mateLine) && /Sail ho/.test(mateLine),
  'with a hand aboard, a named person says it', mateLine);

X.state.crew = []; X.state.aiMate = true;
X.L.length = 0; X.mateSays('Sail ho', 'Sail sighted', '', 'SAIL');
const machineLine = said()[0];
check(/calculator/i.test(machineLine), 'and the brass engine reports in its own name', machineLine);
check(X.mateAddress() === '', 'the machine does not call you captain', '"' + X.mateAddress() + '"');
X.state.aiMate = false;

//--- 3. THE LONGEST-SERVING ABLE HAND ---------------------------------------
console.log('\n--- 3. WHICH HAND ---');
crew([
  { name: 'Green', role: 'diver', xp: 0, conditions: [], nerve: 70 },
  { name: 'Salt', role: 'engineer', xp: 12, conditions: [], nerve: 70 },
]);
check(X.mateName() === 'Salt', 'the longest-serving hand has the watch', X.mateName());
crew([
  { name: 'Green', role: 'diver', xp: 0, conditions: [], nerve: 70 },
  { name: 'Salt', role: 'engineer', xp: 12, conditions: [], nerve: 70, wounded: true },
]);
check(X.mateName() === 'Green', 'a wounded hand does not stand the watch', X.mateName());
crew([{ name: 'Salt', role: 'engineer', xp: 12, conditions: [], nerve: 70, lost: true }]);
check(X.mateName() === null, 'and a boat of the lost has nobody to speak', String(X.mateName()));

//--- 4. THE ADDRESS IS A PERSON TALKING -------------------------------------
console.log('\n--- 4. HOW A HAND ADDRESSES YOU ---');
crew([{ name: 'Ida', role: 'diver', xp: 3, conditions: [], nerve: 70 }]);
const forms = new Set();
for (let i = 0; i < 60; i++) forms.add(X.mateAddress());
check(forms.size >= 2, 'a hand does not say the same word every single time',
  [...forms].map(f => '"' + f.trim() + '"').join(' / '));
check([...forms].every(f => /^,\s/.test(f)), 'and it always reads as an address, not a label',
  [...forms].join(' | '));

//--- 5. IT IS THE SAME COUNSEL, ONLY SPOKEN ---------------------------------
console.log('\n--- 5. THE AIR LADDER SAYS THE SAME THING ---');
crew([{ name: 'Ida', role: 'diver', xp: 3, conditions: [], nerve: 70 }]);
X.L.length = 0;
X.mateSays('40 per cent air, cap’n. ' + X.AIR_STEPS[0].text, X.AIR_STEPS[0].text, '', 'AIR');
const spokenAir = said()[0];
check(spokenAir.indexOf(X.AIR_STEPS[0].text) >= 0,
  'the counsel itself is word for word what it always was',
  '...' + X.AIR_STEPS[0].text.slice(0, 40) + '...');
check(/per cent air/.test(spokenAir), 'with the reading a decision needs in front of it',
  spokenAir.slice(0, 52) + '...');

//--- 6. NOTHING THE MATE SAYS IS AMBIENT ------------------------------------
console.log('\n--- 6. EVERY REPORT IS A DECISION ---');
// Every mateSays call site in the source, and the tag it fires under. Ambient
// prose must never come through here — that is the noise Sean asked me to cut.
const src = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const callTags = [...src.matchAll(/mateSays\(([\s\S]*?)\);/g)]
  .map(m => (m[1].match(/'([A-Z ]+)'\s*$/) || [])[1])
  .filter(Boolean);
const allowed = ['SAIL', 'STRIKE', 'AIR'];
const stray = callTags.filter(t => allowed.indexOf(t) < 0);
console.log('    the mate speaks under: ' + (callTags.join(', ') || '(none found)'));
check(callTags.length >= 3, 'the mate has something to report at all', callTags.length + ' call sites');
check(stray.length === 0, 'and every one of them is a change in your situation',
  stray.length ? 'stray: ' + stray.join(', ') : 'sail, hull strike, air — nothing ambient');

console.log('\n' + (fail === 0 ? 'THE MATE HOLDS — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
