// Sonar is not X-ray. soundColumn must only report a neighbor opening the
// sound could REACH through the sub's own water — stone in the sub's column
// stops it dead. This is the exact "chamber floor" case from playtesting:
// sitting on the floor must NOT reveal open water sealed below it.
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
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
function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, { get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'length') return 0;
    if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
    return stub;
  }, apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; } });
  return stub;
}
const stub = makeStub();
const documentStub = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
  if (p === 'addEventListener') return () => {};
  return stub;
}});
const sandbox = { console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' }, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(script +
  '\nfunction __clear(){ cells.clear(); }' +
  '\nfunction __set(q,r,d){ cells.set(cellKey(q,r,d), {type:"passage",kind:"passage"}); }' +
  '\nfunction __sound(sq,sr,cd,nq,nr,dr){ return soundColumn(sq,sr,cd,nq,nr,dr); }', sandbox, { timeout: 15000 }); } catch (e) {}

let failures = 0;
const check = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) failures++; };

const DG = 60, RANGE = 180;
// Sub at (0,0,780). Neighbor (1,0). Depth grid multiples: 720,780,840,900...

// Case A — X-RAY: sub's column bottoms out (floor at 780; 840 is stone), but
// the neighbor has open water at 900. Must NOT be reported (sealed by floor).
sandbox.__clear();
sandbox.__set(0,0,780); sandbox.__set(0,0,720); sandbox.__set(0,0,660); // sub column open UP, blocked DOWN
sandbox.__set(1,0,900); // neighbor opening far below, behind the floor
let s = sandbox.__sound(0,0,780,1,0,RANGE);
check(s.below === null, 'no down-arrow through the chamber floor (the X-ray fix)', 'below=' + s.below);

// Case B — LEGIT: sub's column continues DOWN to 840; neighbor opens at 840.
// The sound reaches it through water — must be reported.
sandbox.__clear();
sandbox.__set(0,0,780); sandbox.__set(0,0,840); // sub column open downward one step
sandbox.__set(1,0,840); // neighbor opening at that reachable depth
s = sandbox.__sound(0,0,780,1,0,RANGE);
check(s.below === 60, 'a reachable opening in the floor IS reported', 'below=' + s.below);

// Case C — LEGIT UP: sub's column open upward to 660; neighbor opens at 660.
sandbox.__clear();
sandbox.__set(0,0,780); sandbox.__set(0,0,720); sandbox.__set(0,0,660);
sandbox.__set(1,0,660);
s = sandbox.__sound(0,0,780,1,0,RANGE);
check(s.above === 120, 'an opening reachable by rising through own water IS reported', 'above=' + s.above);

// Case D — sealed both ways: sub column blocked up (720 stone) and down (840
// stone); neighbor open above and below. Nothing reaches — nothing reported.
sandbox.__clear();
sandbox.__set(0,0,780); // sub column is a single isolated cell
sandbox.__set(1,0,660); sandbox.__set(1,0,900);
s = sandbox.__sound(0,0,780,1,0,RANGE);
check(s.above === null && s.below === null, 'a boxed-in sub sounds nothing beyond its own cell', 'above=' + s.above + ' below=' + s.below);

console.log(failures === 0 ? '\nALL PING CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
