// THE CHART ANSWERS, AND SAYS NOTHING IT HAS NOT EARNED. `node tests/chart.test.js`
//
// Sean, playing on his phone, 2026-10-02, three remarks in one message:
//
//   "when I try to dive near the pier at start, I seem unable to ... I also
//    don't get a message in the text window saying the sea floor is just
//    beneath the hull."
//   "Plotting a course by tapping a hex more than one space away works
//    inconsistently."
//   "the hole icon shouldn't be there"
//
// All three were the same fault: a tap that did nothing and said nothing, or a
// mark that meant something other than what it drew. What this file holds:
//
//   1. A tap on a hex not beside the boat ALWAYS answers — a course, or why not.
//   2. A mark that is on the chart answers first, and the second tap sails to it.
//   3. A mark that is NOT on the chart is not a mark: the tap sails, LOOK is
//      silent, and neither one names the thing. (They both named undiscovered
//      sinkholes. Sean's ruling of 2026-08-06 is that sonar finds those.)
//   4. The pier means "take me alongside".
//   5. A dive arrow that cannot move her says what is in the way, for nothing.
//   6. The home hex draws no mark of its own.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0; if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {}; return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }
const script = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'fathom-chart.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '3', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {}; return mk(); } });
// MONOTONIC, NOT FROZEN — see save.test.js for why a stopped clock is wrong here.
let clock = 1754265600000; const mem = {}; const L = [];
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (clock += 1000) : t[p]; } });
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; sb.__L = L; vm.createContext(sb);
vm.runInContext(script + [
  ';gameStarted = true; tipsOn = false;',
  'const __log0 = log; log = function (t, c, e) { __L.push({ t: String(t), c: c || "", e: e || "" }); return __log0.apply(this, arguments); };',
  // A world from a seed, and a boat at the pier the way a new game leaves her:
  // everything within five hexes seen from the surface, nothing sounded.
  'function __seed(s, light) {',
  '  worldSeed = s; interiorSalt = ":" + s; interiorCache.clear(); rng = mulberry32(s); resetWorldCaches(); spawnedChunks.clear();',
  '  revealed.clear(); visited.clear(); state.creatures = []; state.enclaves = []; state.ships = []; state.threats = []; state.leads = [];',
  '  state.poisFound = []; state.items = {}; state.fits = {}; state.foot = null; state.hunt = null; state.travel = null; state.autoTarget = null;',
  '  state.alive = true; state.moves = 0; state._asked = null; activeSubKey = "erebus"; state.hull = SUBS.erebus.hull; state.air = SUBS.erebus.air;',
  '  state.crew = [{ name: "Osei", role: "ear", xp: 2, conditions: [], nerve: 70 }, { name: "Ito", role: "hand", xp: 0, conditions: [], nerve: 70 }];',
  '  tileAt(0, 0); const C = Math.ceil(26 / CHUNK) + 1; if (!light) for (let cq = -C; cq <= C; cq++) for (let cr = -C; cr <= C; cr++) ensureChunk(cq, cr);',
  '  __reset(); }',
  // The same ocean, with the boat back at the pier and nothing found: a new captain in an old world.
  'function __reset() {',
  '  revealed.clear(); visited.clear(); state.creatures = []; state.threats = []; state.poisFound = []; state.travel = null; state.autoTarget = null;',
  '  state.alive = true; state.moves = 0; state._asked = null; state.hull = SUBS.erebus.hull; state.air = SUBS.erebus.air; state.foot = null;',
  '  state.q = 0; state.r = 0; state.currentDepth = 0; visited.add(hexKey(0, 0));',
  '  for (let dq = -5; dq <= 5; dq++) for (let dr = Math.max(-5, -dq - 5); dr <= Math.min(5, -dq + 5); dr++) revealAt(dq, dr, 0);',
  '}',
  // Put her down somewhere on the surface with the water round her seen from the surface.
  'function __at(q, r, R) { tileAt(q, r); state.q = q; state.r = r; state.currentDepth = 0; state.travel = null; state._asked = null; state.creatures = []; visited.add(hexKey(q, r));',
  '  for (let dq = -R; dq <= R; dq++) for (let dr = Math.max(-R, -dq - R); dr <= Math.min(R, -dq + R); dr++) { tileAt(q + dq, r + dr); revealAt(q + dq, r + dr, 0); } }',
  'function __sea(q, r) { const t = getTile(q, r); return !!t && !t.wall && cells.has(cellKey(q, r, 0)); }',
  // Sinkholes within R, each with the depth of its mouth and whether the chart draws it now.
  'function __holes(R) { const out = []; for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) { if (hexDistance({ q, r }, { q: 0, r: 0 }) > R) continue;',
  '  const t = getTile(q, r); if (t && t.poi === "opening") out.push({ q, r, mouth: Math.round(poiSeenDepth(t) / DEPTH_GRID) * DEPTH_GRID }); } return out; }',
  // A sea hex exactly n hexes from (q, r) with a straight line of sea between.
  'function __off(q, r, n) { for (const [dq, dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]) { let ok = true;',
  '  for (let k = 1; k <= n; k++) { tileAt(q + dq * k, r + dr * k); if (!__sea(q + dq * k, r + dr * k) || getTile(q + dq * k, r + dr * k).poi) { ok = false; break; } }',
  '  if (ok) return { q: q + dq * n, r: r + dr * n }; } return null; }',
  'function __finish() { let n = 0; while (state.travel && state.travel.length && n++ < 60) travelStep(); return n; }',
  'function __land(R) { for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) { const t = getTile(q, r);',
  '  if (t && t.land && t.type !== "dock" && revealed.has(hexKey(q, r)) && hexDistance({ q, r }, { q: state.q, r: state.r }) >= 2) return { q, r }; } return null; }',
  // n hexes of open, unmarked sea in a straight line from the pier: [origin, 1, 2 ... n], or null.
  'function __line(n) { for (const [dq, dr] of [[-1,0],[0,-1],[1,-1],[-1,1],[1,0],[0,1]]) { const out = [{ q: 0, r: 0 }]; let ok = true;',
  '  for (let k = 1; k <= n; k++) { const q = dq * k, r = dr * k; tileAt(q, r); if (!__sea(q, r) || getTile(q, r).poi) { ok = false; break; } out.push({ q, r }); }',
  '  if (ok) return out; } return null; }',
  'function __known(q, r) { return visited.has(hexKey(q, r)) || revealed.has(hexKey(q, r)); }',
  // Hexes charted outside the pier ring that lie more than one hex from anywhere she has been.
  'function __strays(track, ring) { let n = 0; for (const k of revealed.keys()) { const p = k.split(",").map(Number), h = { q: p[0], r: p[1] };',
  '  if (hexDistance(h, { q: 0, r: 0 }) <= ring) continue; if (!track.some(t => hexDistance(h, t) <= 1)) n++; } return n; }',
  // A straight run of sea through (q, r): three hexes back on one side, two on past it on the other.
  'function __through(q, r) { for (const [dq, dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]) { let ok = true;',
  '  for (const k of [-3, -2, -1, 1, 2]) { const a = q + dq * k, b = r + dr * k; tileAt(a, b); if (!__sea(a, b) || getTile(a, b).poi) { ok = false; break; } }',
  '  if (ok) return { from: { q: q - dq * 3, r: r - dr * 3 }, far: { q: q + dq * 2, r: r + dr * 2 } }; } return null; }',
  // Surface water the boat can sail to from the pier, inside R hexes.
  'function __reach(R) { const seen = new Set(["0,0"]); let fr = [{ q: 0, r: 0 }]; while (fr.length) { const nx = []; for (const c of fr) for (const n of hexNeighbors(c.q, c.r)) {',
  '  const k = n.q + "," + n.r; if (seen.has(k) || hexDistance(n, { q: 0, r: 0 }) > R) continue; const t = tileAt(n.q, n.r); if (!t || t.wall || !hexAcceptsDepth(t, 0)) continue;',
  '  seen.add(k); nx.push(n); } fr = nx; } return seen.size; }',
  // The same seed, made the way every world before generation 2 was made.
  'function __gen1reach(s, R) { worldGen = 1; __seed(s, true); const n = __reach(R); worldGen = WORLD_GEN; return n; }',
  'var __X = { state, farTap, nearTap, travelStep, diveTap, diveBlocked, changeDepth, glyphShown, getTile, describeSpace, wait, homeDock, quayAlongside, hexDistance,',
  '  revealAt, poiSeenDepth, cellRun, hexKey, activeSub, hexNeighbors, TILES };',
].join('\n'), sb, { timeout: 600000 });
const X = sb.__X, S = X.state;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};
const said = () => L.map(l => l.t);
const here = () => S.q + ',' + S.r;

console.log('THE CHART ANSWERS — every tap, and nothing it has not earned\n');

// A world with a sinkhole whose mouth is too deep to be seen from the surface.
const SEEDS = [20261002, 20261002 + 9173, 20261002 + 2 * 9173, 20261002 + 3 * 9173, 20261002 + 5 * 9173];
// Making an ocean is the slow part, so one is made once and the boat is put back at its pier.
let loaded = null;
const load = (seed) => { if (loaded === seed) sb.__reset(); else { sb.__seed(seed); loaded = seed; } };
let world = null;
for (const seed of SEEDS) {
  load(seed);
  const deep = sb.__holes(26).filter(h => h.mouth >= 240 && sb.__off(h.q, h.r, 3));
  if (deep.length) { world = { seed, hole: deep[0] }; break; }
}
if (!world) { console.log('  FAIL  no world in the list has a sinkhole deep enough to be hidden — the suite cannot run'); process.exit(1); }
const hole = world.hole;
const holeTile = () => X.getTile(hole.q, hole.r);

//--- 1. A HIDDEN MARK IS NOT A MARK -----------------------------------------
console.log('--- 1. A SINKHOLE NOBODY HAS FOUND IS PLAIN WATER TO THE CHART ---');
const from = sb.__off(hole.q, hole.r, 3);
sb.__at(from.q, from.r, 5);
check(!X.glyphShown(holeTile()), 'seen from the surface only, a hole with its mouth at ' + hole.mouth + ' m is not drawn', 'seed ' + world.seed);
L.length = 0;
const start = here();
X.farTap(hole.q, hole.r);
check(!said().some(t => /sinkhole/i.test(t)), 'a tap on that water does not say what is under it', said().join(' | ').slice(0, 110));
check(here() !== start || (S.travel && S.travel.length), 'and it sets a course there, like any other water', 'from ' + start + ' now ' + here());

sb.__at(from.q, from.r, 5);
// One hex short of it, so the hole is the next hex over.
const beside = X.hexNeighbors(hole.q, hole.r).find(n => sb.__sea(n.q, n.r) && !X.getTile(n.q, n.r).poi);
sb.__at(beside.q, beside.r, 2);
const look = X.describeSpace('ask');
check(!/sinkhole/i.test(look), 'LOOK, one hex from it, does not name it either', look.slice(0, 90) + '…');

// Over many holes: LOOK names a sinkhole next door exactly when the chart draws it.
let cases = 0, agree = 0, drawn = 0;
for (const seed of SEEDS.filter(x => x !== world.seed).concat([world.seed])) {     // the first world last, so it is the one left loaded
  load(seed);
  for (const h of sb.__holes(26)) {
    const nb = X.hexNeighbors(h.q, h.r).find(n => sb.__sea(n.q, n.r) && !X.getTile(n.q, n.r).poi);
    if (!nb) continue;
    sb.__at(nb.q, nb.r, 2);
    const shown = X.glyphShown(X.getTile(h.q, h.r));
    const named = /sinkhole/i.test(X.describeSpace('ask'));
    cases++; if (shown) drawn++; if (shown === named) agree++;
  }
}
check(cases >= 12 && agree === cases, 'over ' + cases + ' sinkholes in ' + SEEDS.length + ' worlds, LOOK names one exactly when the chart draws it',
  drawn + ' drawn (shallow mouths), ' + (cases - drawn) + ' hidden, ' + (cases - agree) + ' disagreements');

//--- 2. A MARK ON THE CHART ANSWERS, THEN SAILS -----------------------------
console.log('\n--- 2. A MARK ANSWERS FIRST, AND THE SECOND TAP SAILS TO IT ---');
load(world.seed);
sb.__at(from.q, from.r, 5);
X.revealAt(hole.q, hole.r, hole.mouth);                 // the ping found it
check(X.glyphShown(holeTile()), 'once sounded, the hole is on the chart');
L.length = 0;
const before = here();
X.farTap(hole.q, hole.r);
check(/sinkhole/i.test(said()[0] || '') && here() === before && !S.travel, 'the first tap says what it is and the boat does not move', said()[0]);
check(/Tap it again to steer for it/.test(said()[0] || ''), 'and the answer says what the next tap does');
X.farTap(hole.q, hole.r);
check(here() !== before || (S.travel && S.travel.length), 'the second tap sets the course', 'now ' + here());
sb.__finish();
check(here() === hole.q + ',' + hole.r, 'and she arrives on it', here());

sb.__at(from.q, from.r, 5);
L.length = 0;
X.farTap(hole.q, hole.r);
X.wait();                                               // a turn passes
const n0 = L.length;
X.farTap(hole.q, hole.r);
check(here() === from.q + ',' + from.r && L.slice(n0).some(l => /sinkhole/i.test(l.t)), 'a turn in between, and the tap is a question again', (L[L.length - 1] || {}).t);

// Over the hole, with its mouth charted: the depth quoted is the mouth's.
load(world.seed);
sb.__at(hole.q, hole.r, 2);
X.revealAt(hole.q, hole.r, hole.mouth);
const over = X.describeSpace('ask');
const m = /sinkhole in this water, (\d+) m below/i.exec(over);
check(!!m && +m[1] === hole.mouth, 'LOOK over a sinkhole quotes the depth of its mouth, not the bottom of the shaft',
  m ? m[1] + ' m quoted, mouth at ' + hole.mouth + ' m, column bottom ' + holeTile().floor + ' m' : 'no depth quoted: ' + over.slice(0, 120));

//--- 3. EVERY OTHER TAP SAYS WHY NOT ----------------------------------------
console.log('\n--- 3. NO TAP GOES UNANSWERED ---');
load(world.seed);
let at0 = here();
const shore = sb.__land(6);
L.length = 0;
if (shore) X.farTap(shore.q, shore.r);
check(!!shore && /shore/i.test(said()[0] || '') && here() === at0, 'the land says it is the shore', said()[0]);
L.length = 0;
X.farTap(0, 0);
check(L.length === 0 && here() === at0, 'and her own hex is not somewhere to go', 'nothing said, nothing moved');

//--- 3b. BY EYE ---------------------------------------------------------------
// A boat under way charts her own hex and the six round it. So in water she had
// never sailed, no course could be more than one hex long and every far tap said
// "no course through water you have charted" — the larger half of "plotting a
// course works inconsistently", and all of "sailing around happens step by step".
console.log('\n--- 3b. ON THE SURFACE SHE STEERS BY EYE; UNDER IT SHE DOES NOT ---');
load(world.seed);
const run = sb.__line(10);                               // ten hexes of open sea in a straight line from the pier
check(!!run, 'there is a straight run of open sea off the pier to try it on', run ? 'toward ' + run[10].q + ',' + run[10].r : 'none in this world');
if (run) {
  const a = run[4], dark = run[10];
  sb.__at(a.q, a.r, 1);
  check(!sb.__known(dark.q, dark.r), 'the mark is water she has never seen', 'six hexes off, past everything charted at the pier');
  const hullA = S.hull;
  L.length = 0;
  X.farTap(dark.q, dark.r);
  check(/by eye/i.test(said()[0] || '') && here() !== a.q + ',' + a.r && S.travel && S.travel.eye === true,
    'a tap on it from the surface is a heading, and she is already under way', said()[0]);
  const track = [a, { q: S.q, r: S.r }];
  let n = 0;
  while (S.travel && n++ < 40) { X.travelStep(); track.push({ q: S.q, r: S.r }); }
  // A sighting on the way hands the helm back; a captain taps again.
  for (let again = 0; again < 6 && here() !== dark.q + ',' + dark.r; again++) {
    X.farTap(dark.q, dark.r); track.push({ q: S.q, r: S.r });
    n = 0; while (S.travel && n++ < 40) { X.travelStep(); track.push({ q: S.q, r: S.r }); }
  }
  check(here() === dark.q + ',' + dark.r && S.hull === hullA, 'she gets there, and touches nothing on the way', 'at ' + here() + ', hull ' + S.hull);
  const stray = sb.__strays(track, 5);
  check(stray === 0, 'and she charted her own track and the hexes beside it — exactly what the same taps would have', stray + ' hex(es) charted further off than that');

  // The same tap from sixty metres down, in the same ocean before any of that was charted.
  load(world.seed);
  sb.__at(a.q, a.r, 1);
  X.changeDepth(X.activeSub().diveStep);
  const under = S.currentDepth, at1 = here();
  L.length = 0;
  X.farTap(dark.q, dark.r);
  check(under > 0 && here() === at1 && !S.travel && /No course to there through water you have charted\. On the surface she can steer for it by eye/.test(said()[0] || ''),
    'under water there is no course into the dark, and the answer says where there would be', said()[0]);
}
// Any tap takes the helm back — the hex beside her included. It used to step her
// by hand and leave the course running.
load(world.seed);
if (run) {
  sb.__at(run[4].q, run[4].r, 1);
  // (A sail can come into sight on the very first step and end the course; tap until one is running.)
  for (let i = 0; i < 6 && !S.travel; i++) X.farTap(run[10].q, run[10].r);
  const underWay = !!S.travel, mid = here();
  const nb = X.hexNeighbors(S.q, S.r).find(h => sb.__sea(h.q, h.r));
  L.length = 0;
  X.nearTap(nb.q, nb.r);
  check(underWay && !S.travel && here() === mid && said().some(x => /took the helm back/.test(x)),
    'while a course runs, a tap on the hex beside her takes the helm back and does not step her', said()[0]);
}
// Land in the way: steer for the middle of the island from open water.
load(world.seed);
const off3 = sb.__off(0, 0, 3);
if (off3) {
  sb.__at(off3.q, off3.r, 1);
  const hullB = S.hull;
  // (Tapped again if a sail ends the course on the way in, until it is the land that stops her.)
  let byLand = null;
  for (let i = 0; i < 8 && !byLand; i++) {
    L.length = 0;
    X.farTap(0, 12);                                      // the island's own centre, never seen
    let n2 = 0; while (S.travel && n2++ < 40) X.travelStep();
    byLand = said().filter(x => /way (ahead|toward it) is not open/.test(x))[0] || null;
  }
  const t = X.getTile(S.q, S.r);
  check(!S.travel && S.hull === hullB && t && !t.wall && !!byLand,
    'steered at the land, she stops in the water in front of it and says so', 'at ' + here() + ', hull ' + S.hull + ' — ' + (byLand || 'nothing said'));
}
// Something sighted: an unfound sinkhole on the line. She must not sail on past it.
load(world.seed);
const thr = sb.__through(hole.q, hole.r);
check(!!thr, 'there is a straight run of sea through the hidden hole to try it on');
if (thr) {
  sb.__at(thr.from.q, thr.from.r, 1);
  L.length = 0;
  X.farTap(thr.far.q, thr.far.r);
  let n3 = 0; while (S.travel && n3++ < 40) X.travelStep();
  const lines = said();
  const opened = lines.findIndex(x => /A sinkhole opens beneath you/.test(x));
  check(here() === hole.q + ',' + hole.r && !S.travel && opened >= 0,
    'a course that crosses an unfound sinkhole ends over it, not two hexes past it', 'at ' + here() + ' — ' + (lines[opened] || 'no line'));
  check(opened >= 0 && !lines.slice(opened + 1).some(x => /Helm is yours|take the helm back/.test(x)),
    'and the line that stopped her is the last word — nothing is said over it');
}

//--- 4. THE PIER MEANS ALONGSIDE ---------------------------------------------
console.log('\n--- 4. TAP THE PIER, AND SHE GOES ALONGSIDE ---');
load(world.seed);
const hd = X.homeDock();
const out = sb.__off(0, 0, 3) || { q: -3, r: 0 };
sb.__at(out.q, out.r, 6);
L.length = 0;
// (Tapped again if the helm comes back for something sighted on the way, as a captain would.)
for (let i = 0; i < 6 && !X.quayAlongside(); i++) { X.farTap(hd.q, hd.r + 2); sb.__finish(); }   // the landward end of the pier, three tiles long
check(X.hexDistance({ q: S.q, r: S.r }, hd) <= 1 && !!X.quayAlongside(), 'a tap on the far end of the pier brings her alongside the quay', 'at ' + here() + ', quay ' + hd.q + ',' + hd.r);
L.length = 0;
X.farTap(hd.q, hd.r + 2);
check(/alongside already/i.test(said()[0] || ''), 'and tapped again from there, it says she is alongside', said()[0]);

//--- 5. THE DIVE ARROW ANSWERS ------------------------------------------------
console.log('\n--- 5. AN ARROW THAT CANNOT MOVE HER SAYS WHAT IS IN THE WAY ---');
load(world.seed);
const step = X.activeSub().diveStep;
L.length = 0;
X.diveTap(-step);
check(/on the surface/i.test(said()[0] || ''), 'up, at the surface: she is on the surface', said()[0]);
let guard = 0;
while (!X.diveBlocked(1) && guard++ < 40) X.diveTap(step);
const floorAt = S.currentDepth, hull0 = S.hull, moves0 = S.moves, air0 = S.air;
L.length = 0;
X.diveTap(step);
check(/sea floor is just beneath the hull/i.test(said()[0] || ''), 'down, on the floor: the sea floor is just beneath the hull', said()[0]);
check(S.hull === hull0 && S.moves === moves0 && S.air === air0 && S.currentDepth === floorAt, 'and it costs nothing — no hull, no turn, no air', 'hull ' + S.hull + ', moves ' + S.moves);
X.diveTap(step); X.diveTap(step * 2);
check(L.length === 1, 'hammering the arrow says it once', L.length + ' line(s) for three taps');
check(X.diveBlocked(-1) === null, 'and the way up is still open');

//--- 6. THE HOME HEX ----------------------------------------------------------
console.log('\n--- 6. THE PIER IS THE LANDMARK; THE HEX BESIDE IT IS WATER ---');
load(world.seed);
check(!X.glyphShown(X.getTile(0, 0)) && !X.TILES.surface.char, 'the hex she starts on draws no mark of its own');
sb.__at(out.q, out.r, 6);
L.length = 0; at0 = here();
for (let i = 0; i < 6 && here() !== '0,0'; i++) { X.farTap(0, 0); sb.__finish(); }
check(here() === '0,0' && !said().some(t => /dock and the shore/i.test(t)), 'and a tap on it from three hexes off is a course home, not a question', 'at ' + here());

//--- 7. THE HARBOUR IS OPEN ----------------------------------------------------
// This suite's own first seed found it: the home island's outline swells on any
// bearing, and when it swelled toward the pier the boat sat in one hex of water
// with land on six sides. 27 worlds in 200 — one new game in seven could not
// make its first move.
console.log('\n--- 7. SHE CAN LEAVE THE PIER, IN EVERY WORLD ---');
const BOXED = 1401180166;                                // one of the twenty-seven, by name
let worst = Infinity, worstSeed = 0, shut = 0;
const many = [BOXED];
for (let i = 1; i <= 59; i++) many.push((Math.imul(i, 2654435761) ^ 977) | 0);
loaded = null;
for (const seed of many) {
  sb.__seed(seed, true);                               // only the water round the pier is asked for
  const n = sb.__reach(12);
  if (n < 30) shut++;
  if (n < worst) { worst = n; worstSeed = seed; }
}
check(shut === 0, 'over ' + many.length + ' worlds there is open water to sail into from the pier',
  shut ? shut + ' boxed in, the worst reaching ' + worst + ' hex(es) (seed ' + worstSeed + ')' : 'the tightest harbour still reaches ' + worst + ' hexes within 12');
// And an ocean already being sailed keeps the coast it has — land must not move under a saved boat.
const oldReach = sb.__gen1reach(BOXED, 12);
sb.__seed(BOXED, true);
check(oldReach < 30 && sb.__reach(12) >= 30, 'a world made before the fix is left exactly as it was; the same seed made now is open',
  'made under the old rules ' + oldReach + ' hex(es), made now ' + sb.__reach(12));

console.log('\n' + (fail === 0 ? 'THE CHART HOLDS — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
