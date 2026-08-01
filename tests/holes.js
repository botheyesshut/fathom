// WHAT KIND OF HOLE IS THIS? — an instrument. `node tests/holes.js`
//
// Sean, on what a base site should feel like: "In TW2002, it was foolhardy to
// make a base at a crossroads because it would be nearly impossible to stay
// hidden or defend it. What you wanted was a cul de sac in some far off area
// nobody knew about... Finding a spot for a base like that was one of the joys
// of the game."
//
// The generator already varies beaches — 1 to 3 mouths, four kinds of system
// behind each, 1 to 4 segments deep. So the question is not "is there variety"
// but "is the variety the RIGHT SHAPE": are there genuine cul-de-sacs, are there
// genuine crossroads, how rare is a good one, and — the part that decides
// whether any of it is a joy — could a captain standing on the sand tell which
// one they are standing in?
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
var __X = { L: __L, state,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear(); },
  tileAt, getTile, hexKey, hexDistance, homeDock, cells, cellKey, cellRun,
  beachMouths, CAVE_SEGS, DEPTH_GRID, MOUTH_LETTERS, draughtLine };
`, sb, { timeout: 180000 });
const X = sb.__X;

const SEEDS = [90210, 4242, 7, 31337, 512, 8675309, 1123, 44, 90909, 2718];
const RING = 30;

// Every beach in reach, with the shape of what lies behind it.
const sites = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    for (let z = 0; z <= 11000; z += X.DEPTH_GRID) {
      const c = X.cells.get(X.cellKey(q, r, z));
      if (!c || c.kind !== 'beach') continue;
      const mouths = X.beachMouths(q, r, z);
      sites.push({
        seed, q, r, d: z,
        n: mouths.length,
        types: mouths.map(m => m.type),
        // How much cave there is to walk: the sum of every mouth's depth.
        rooms: mouths.reduce((s, m) => s + m.segs, 0),
        // A PASSAGE IS A WAY THROUGH — it comes out at another beach entirely.
        // Anything else ends. That is the whole cul-de-sac question.
        ways: mouths.filter(m => m.type === 'passage').length,
        dist: X.hexDistance({ q, r }, hd),
      });
    }
  }
}

const pct = (n) => (100 * n / Math.max(1, sites.length)).toFixed(1) + '%';
const tally = (fn) => { const o = {}; for (const s of sites) { const k = fn(s); o[k] = (o[k] || 0) + 1; } return o; };
const show = (o) => Object.keys(o).sort((a, b) => (+a) - (+b) || String(a).localeCompare(b))
  .map(k => k + ': ' + o[k] + ' (' + (100 * o[k] / sites.length).toFixed(0) + '%)').join('   ');

console.log('WHAT KIND OF HOLE IS THIS?');
console.log(sites.length + ' cavern beaches across ' + SEEDS.length + ' worlds, within ' + RING + ' of the dock\n');

console.log('--- HOW MANY WAYS IN OFF THE SAND ---');
console.log('  ' + show(tally(s => s.n + ' mouth' + (s.n > 1 ? 's' : ''))));

console.log('\n--- WHAT IS BEHIND THEM ---');
const typeCount = {};
for (const s of sites) for (const t of s.types) typeCount[t] = (typeCount[t] || 0) + 1;
const totalM = Object.values(typeCount).reduce((a, b) => a + b, 0);
console.log('  ' + Object.entries(typeCount).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => k + ' ' + (100 * v / totalM).toFixed(0) + '%').join('   ')
  + '   (' + totalM + ' systems)');

console.log('\n--- HOW MUCH CAVE THERE IS TO WALK ---');
console.log('  ' + show(tally(s => String(s.rooms).padStart(2, ' ') + ' rooms')));

console.log('\n--- THE QUESTION THAT MATTERS: CUL-DE-SAC OR CROSSROADS? ---');
const dead = sites.filter(s => s.ways === 0);
const one = sites.filter(s => s.ways === 1);
const many = sites.filter(s => s.ways >= 2);
console.log('  no way through at all (a dead end)      ' + dead.length + '   ' + pct(dead.length));
console.log('  one passage out                          ' + one.length + '   ' + pct(one.length));
console.log('  two or more — a crossroads               ' + many.length + '   ' + pct(many.length));

console.log('\n--- AND THE SITE A CAPTAIN IS ACTUALLY LOOKING FOR ---');
// Sean's ideal: sealed at the back, deep enough to be worth holding, far from
// the dock so nobody stumbles into it.
const ideal = sites.filter(s => s.ways === 0 && s.rooms >= 3 && s.dist >= 15);
console.log('  sealed, roomy (3+), and 15+ hexes out   ' + ideal.length + '   ' + pct(ideal.length)
  + '   (' + (ideal.length / SEEDS.length).toFixed(1) + ' per world)');
const bad = sites.filter(s => s.ways >= 2 && s.dist < 10);
console.log('  a crossroads right on the doorstep      ' + bad.length + '   ' + pct(bad.length));

console.log('\n--- CAN THE CAPTAIN TELL, STANDING ON THE SAND? ---');
console.log('  Yes, as of the draught. The mouths were always countable and the');
console.log('  SHAPE was not — what lay behind one went unnamed until walked, and');
console.log('  whether it came out anywhere was unknown until followed to its end,');
console.log('  so the one site per world worth holding could only be found by');
console.log('  exhausting every other. Now the air answers: a passage moves it and');
console.log('  nothing else does. Still air is a dead end, and a dead end is a');
console.log('  fortress. It says a way through EXISTS and never where it goes.');

// ---- THE DRAUGHT MUST NOT LIE ----------------------------------------------
// The line a captain reads off the sand is the ONLY way to tell a fortress from
// a road before committing to one. If it ever says "still" over a site with a
// way through, it is worse than saying nothing — a captain would build there.
console.log('\n--- DOES THE SAND TELL THE TRUTH? ---');
let wrong = 0, stillAndSealed = 0, stirsAndOpen = 0;
const samples = {};
for (const s of sites) {
  const mouths = s.types.map(t => ({ type: t }));
  const line = X.draughtLine(mouths);
  const saysStill = /air is still/.test(line);
  const saysStirs = /air stirs/.test(line);
  if (saysStill && s.ways > 0) wrong++;
  if (saysStirs && s.ways === 0) wrong++;
  if (saysStill && s.ways === 0) stillAndSealed++;
  if (saysStirs && s.ways > 0) stirsAndOpen++;
  const key = s.n + 'mouth/' + s.ways + 'through';
  if (!samples[key]) samples[key] = line;
}
console.log('  sealed sites told "still"        ' + stillAndSealed + ' of ' + sites.filter(s => s.ways === 0).length);
console.log('  sites with a way told "stirs"    ' + stirsAndOpen + ' of ' + sites.filter(s => s.ways > 0).length);
console.log('  OUTRIGHT LIES                    ' + wrong);
console.log('\n  every shape it can say, once each:');
for (const k of Object.keys(samples).sort()) console.log('    ' + k.padEnd(16) + samples[k]);
process.exit(wrong === 0 ? 0 : 1);
