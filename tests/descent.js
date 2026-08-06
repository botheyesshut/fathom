// tests/descent.js — CAN A CAPTAIN ACTUALLY GET TO THE DEEP?
//
// The bot wants to. `playtest.js` gives the reckless persona `deepTarget: 4200`
// and the hoarder 1800, and across 24 runs of 800 turns the MEDIAN MAX DEPTH
// WAS 240 m and nobody once passed 2400. That is not a timid bot declining to
// dive; it is a bot trying to dive and not getting there.
//
// Which matters more than it sounds, because most of the game lives down there:
// 24 of 36 items are gated at 900 m or below, the trenches, the deep cities,
// the abyssal prizes, the pressure-wraith, and every faction whose depth band
// is 'deep'. If the bottom half of the world is effectively unreachable then
// the game is half the size it looks on paper, and no suite in the battery
// would ever say so — they all check that things are CORRECT, not that anybody
// can get to them.
//
// The shelf floor is not the sea floor. The way through is a sinkhole (drawn O,
// SINKHOLE_CHANCE 0.35 per top-band cave node). So this measures the door:
//
//   1. how far from the dock is the nearest sinkhole
//   2. how many are there, per area of shelf
//   3. what depth does one actually let you reach
//   4. and — the real question — could a captain who is LOOKING find one
//
//     node tests/descent.js [seeds]
'use strict';
const fs = require('fs'), vm = require('vm');

function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0;
  if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0;
  if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {};
  return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }

const script = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {};
  return mk(); } });
let clock = 0;
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date, Array, Object, Map, Set,
  String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {}, removeEventListener: () => {},
  location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; vm.createContext(sb);
vm.runInContext(script + `
;gameStarted = true;
function __st(){return state}
function __seed(s){worldSeed=s;interiorSalt=':'+s;interiorCache.clear();resetWorldCaches();spawnedChunks.clear();}
function __chunk(cq,cr){ensureChunk(cq,cr)}
function __tile(q,r){return tileAt(q,r)}
function __get(q,r){return getTile(q,r)}
function __home(){return homeDock()}
function __dist(a,b){return hexDistance(a,b)}
function __K(){return{chance:SINKHOLE_CHANCE, grid:DEPTH_GRID}}
// THE VOXEL MAP IS THE TRUTH, NOT A TILE FIELD. The first version of this probe
// read tile.volumes, which does not exist — tiles carry a ceiling and a floor
// and the open space itself lives in cells, keyed q,r,d. It therefore reported
// "deepest standable 0 m" and "the sinkhole leads nowhere" for every hex in six
// worlds, which read exactly like a catastrophic terrain bug and was a typo.
// hexAcceptsDepth is the rule the sub itself obeys, so ask that.
function __deepestStandable(q,r){
  var t=getTile(q,r); if(!t||t.wall||t.land) return null;
  var best=null;
  for (var d=0; d<=12000; d+=DEPTH_GRID) if (hexAcceptsDepth(t,d)) best=d;
  return best;
}
function __columnAt(q,r){
  var t=getTile(q,r); if(!t) return [];
  var out=[], run=null;
  for (var d=0; d<=12000; d+=DEPTH_GRID){
    if (hexAcceptsDepth(t,d)) { if(!run) { run={a:d,b:d}; out.push(run); } else run.b=d; }
    else run=null;
  }
  return out.map(function(r2){return r2.a+"-"+r2.b+" m";});
}
function __shelfFloor(q,r){return shelfSeafloorDepth(q,r)}
function __cell(q,r,d){return cells.has(cellKey(q,r,d))}
function __nbrs(q,r){return hexNeighbors(q,r)}
`, sb, { timeout: 180000 });

const K = sb.__K();
const SEEDS = (process.argv[2] ? Number(process.argv[2]) : 6);
const seeds = Array.from({ length: SEEDS }, (_, i) => 4242 + i * 1013);
const R = 40;                       // hexes of shelf to sweep around the dock

console.log('THE DESCENT — can anybody get off the shelf?\n');
console.log('  SINKHOLE_CHANCE ' + K.chance + ' per top-band cave node, ' + SEEDS + ' worlds, '
  + R + ' hexes around the dock\n');

const nearest = [], counts = [], deepestReach = [], shelfFloors = [];
for (const seed of seeds) {
  sb.__seed(seed);
  const CH = Math.ceil(R / 16) + 1;
  for (let cq = -CH; cq <= CH; cq++) for (let cr = -CH; cr <= CH; cr++) sb.__chunk(cq, cr);
  const hd = sb.__home();
  let found = [], deepest = 0, floorSum = 0, floorN = 0;
  for (let dq = -R; dq <= R; dq++) {
    for (let dr = -R; dr <= R; dr++) {
      const q = hd.q + dq, r = hd.r + dr;
      if (sb.__dist({ q: q, r: r }, hd) > R) continue;
      const t = sb.__get(q, r);
      if (!t) continue;
      const sf = sb.__shelfFloor(q, r);
      if (sf != null) { floorSum += sf; floorN++; }
      if (t.poi === 'opening') found.push({ q: q, r: r, d: sb.__dist({ q: q, r: r }, hd) });
      const st = sb.__deepestStandable(q, r);
      if (st != null && st > deepest) deepest = st;
    }
  }
  counts.push(found.length);
  found.sort((a, b) => a.d - b.d);
  nearest.push(found.length ? found[0].d : Infinity);
  deepestReach.push(deepest);
  shelfFloors.push(floorN ? Math.round(floorSum / floorN) : 0);
}

const med = a => { const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
const show = (n) => n === Infinity ? 'NONE FOUND' : String(n);

console.log('--- 1. THE DOOR: sinkholes within ' + R + ' hexes of the dock ---');
console.log('  how many        ' + counts.join(', '));
console.log('  nearest one     ' + nearest.map(show).join(', ') + '   (median ' + show(med(nearest)) + ' hexes)');
const noneAt = nearest.filter(n => n === Infinity).length;
if (noneAt) console.log('  ' + noneAt + '/' + SEEDS + ' WORLDS HAVE NO WAY DOWN within ' + R + ' hexes of the start.');

console.log('\n--- 2. WHAT THE SHELF ITSELF ALLOWS ---');
console.log('  mean shelf floor near the dock   ' + med(shelfFloors) + ' m');
console.log('  deepest standable water found    ' + med(deepestReach) + ' m   (best ' + Math.max.apply(null, deepestReach) + ' m)');
console.log('  the bot\'s measured median max depth was 240 m, against personas asking for 4200.');

console.log('\n--- 3. IS THE DEEP BEHIND THE DOOR, OR JUST FAR? ---');
{
  // Follow the nearest sinkhole down and see what depth it actually opens onto.
  sb.__seed(seeds[0]);
  const CH = Math.ceil(R / 16) + 1;
  for (let cq = -CH; cq <= CH; cq++) for (let cr = -CH; cr <= CH; cr++) sb.__chunk(cq, cr);
  const hd = sb.__home();
  let best = null;
  for (let dq = -R; dq <= R; dq++) for (let dr = -R; dr <= R; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    const t = sb.__get(q, r);
    if (t && t.poi === 'opening') {
      const d = sb.__dist({ q: q, r: r }, hd);
      if (!best || d < best.d) best = { q: q, r: r, d: d };
    }
  }
  if (!best) console.log('  no sinkhole in seed ' + seeds[0] + ' to follow.');
  else {
    const t = sb.__get(best.q, best.r);
    const vols = sb.__columnAt(best.q, best.r).join(', ');
    console.log('  nearest sinkhole in seed ' + seeds[0] + ': ' + best.d + ' hexes out');
    console.log('  the water column under it: ' + (vols || 'NONE — the O leads nowhere'));
    console.log('  shelf floor there: ' + Math.round(sb.__shelfFloor(best.q, best.r) || 0) + ' m');
  }
}
//--- 4. THE ONLY QUESTION THAT SETTLES IT --------------------------------------
// Breadth-first over the ACTUAL voxel graph the sub obeys, from the dock at the
// surface. Two moves exist and no others:
//   horizontally to a neighbour hex that has an open cell at your depth;
//   vertically one 60 m step inside your own hex, if that cell is open.
// A gap in a column is therefore a wall you must go round, which is what makes
// the water a three-dimensional maze rather than a lift shaft. If BFS finds a
// route, the deep is reachable and the bot is simply not clever enough to use
// it. If BFS finds none, the bottom half of the game is decoration.
console.log('\n--- 4. IS THERE A ROUTE DOWN AT ALL? (breadth-first, the sub\'s own rules) ---');
const GRID = K.grid;
for (const seed of seeds.slice(0, 4)) {
  sb.__seed(seed);
  const CH = Math.ceil(R / 16) + 1;
  for (let cq = -CH; cq <= CH; cq++) for (let cr = -CH; cr <= CH; cr++) sb.__chunk(cq, cr);
  const hd = sb.__home();
  // Start on the first open water beside the dock.
  let start = null;
  for (const n of sb.__nbrs(hd.q, hd.r)) if (sb.__cell(n.q, n.r, 0)) { start = { q: n.q, r: n.r, d: 0 }; break; }
  if (!start) { console.log('  seed ' + seed + ': no open water beside the dock'); continue; }

  const seen = new Set([start.q + ',' + start.r + ',0']);
  let frontier = [start], steps = 0, best = 0, reached = {};
  const MARKS = [600, 1200, 2400, 4200, 6000];
  while (frontier.length && steps < 400) {
    const next = [];
    for (const c of frontier) {
      if (c.d > best) {
        best = c.d;
        for (const m of MARKS) if (c.d >= m && reached[m] === undefined) reached[m] = steps;
      }
      const cand = [];
      for (const n of sb.__nbrs(c.q, c.r)) cand.push({ q: n.q, r: n.r, d: c.d });
      cand.push({ q: c.q, r: c.r, d: c.d - GRID });
      cand.push({ q: c.q, r: c.r, d: c.d + GRID });
      for (const w of cand) {
        if (w.d < 0 || w.d > 12000) continue;
        if (sb.__dist({ q: w.q, r: w.r }, hd) > R) continue;   // stay in generated water
        const k = w.q + ',' + w.r + ',' + w.d;
        if (seen.has(k)) continue;
        if (!sb.__cell(w.q, w.r, w.d)) continue;
        seen.add(k); next.push(w);
      }
    }
    frontier = next; steps++;
  }
  const hit = MARKS.map(m => m + 'm:' + (reached[m] === undefined ? ' —' : ' ' + reached[m])).join('   ');
  console.log('  seed ' + String(seed).padEnd(6) + ' deepest ' + String(best).padStart(5) + ' m'
    + '   moves to   ' + hit);
}
console.log('  (a dash means unreached inside ' + R + ' hexes of the dock; the world continues past that)');

console.log('\n  If the door is far, the deep is a voyage and that is fine. If the door is');
console.log('  near and the bot still never went through, the bot cannot use it — and');
console.log('  every measurement of the deep half of this game is currently fiction.');
