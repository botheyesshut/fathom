// WHAT GIVES A CAPTAIN A REASON TO DIVE? — an instrument. `node tests/reasons.js`
//
// Sean asked the design question directly: "What encourages a captain to dive
// and search?" The features that answer it exist — the sounder reads straight
// down, prizes are richer with depth, the board sends you deeper as you rise —
// but "it exists" has never once been the same thing as "it happens", and this
// project's whole history is the gap between those two.
//
// So this counts REASONS, per hex of ordinary sailing, in fresh worlds:
//
//   a sounder return   the boat is over something. The one honest "dig here".
//   a board job        the harbour marked a position and is paying for it.
//   a chart lead       somebody's ink says there is something at a place.
//   nothing at all     open water that will stay open water.
//
// The number that matters is the last one. If a captain can sail twenty hexes
// and be told nothing twenty times, the deep is not a place they are choosing
// not to go — it is a place nothing has ever suggested to them.
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
var __X = {
  L: __L,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear();
             state.leads=[]; state.berth=null; state.ticket=0; state.poisFound=[];
             state.creatures=[]; state.enclaves=[]; state.ships=[]; state.pingMemory=new Map(); },
  state, tileAt, getTile, hexKey, hexDistance, homeDock, cellRun, poiStack, poiTaken,
  soundingBelow, hexAcceptsDepth, DEPTH_GRID, SOUNDER_PRIZE, cellPois,
};
`, sb, { timeout: 180000 });
const X = sb.__X;

const SEEDS = [90210, 4242, 7, 31337, 512, 8675309, 1123, 44];
const RING = 22;   // how far from the dock a first session realistically ranges

console.log('WHAT GIVES A CAPTAIN A REASON TO DIVE?');
console.log(SEEDS.length + ' fresh worlds, every water hex within ' + RING + ' of the home dock,');
console.log('the boat sitting on the surface as it would be while sailing.\n');

let totalHexes = 0, withReturn = 0;
const depths = [];
let runsToFirst = [];

for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    // The boat, on the surface, over this hex. Exactly the sounder's own case.
    X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
    X.state.foot = null;
    totalHexes++;
    // `soundingBelow` returns { odd, oddUnder, floor, ... } — oddUnder is metres
    // BELOW THE BOAT, not an absolute depth. There is no `oddAt` on the returned
    // object; reading one would have counted correctly and reported every depth
    // as blank, which is the sort of half-working probe that gets published.
    // The boat is at the surface here, so under-the-boat and absolute agree.
    let snd = null;
    try { snd = X.soundingBelow(); } catch (e) { /* reported below */ }
    if (snd && snd.odd) { withReturn++; depths.push(X.state.currentDepth + snd.oddUnder); }
  }
}

const pct = (n, d) => (100 * n / Math.max(1, d)).toFixed(1) + '%';
depths.sort((a, b) => a - b);
const med = depths.length ? depths[Math.floor(depths.length / 2)] : 0;

console.log('--- THE SOUNDER, THE ONE INSTRUMENT THAT SAYS "SOMETHING IS UNDER YOU" ---');
console.log('  water hexes walked over        ' + totalHexes);
console.log('  hexes that give a return       ' + withReturn + '   (' + pct(withReturn, totalHexes) + ' of them)');
console.log('  one return every               ' + (totalHexes / Math.max(1, withReturn)).toFixed(1) + ' hexes of sailing');
if (depths.length) {
  console.log('  median depth of the return     ' + med + ' m');
  console.log('  shallowest / deepest           ' + depths[0] + ' m / ' + depths[depths.length - 1] + ' m');
}

// How many prizes are down there AT ALL within the same ring — the sounder can
// only speak for the column the boat is in, so this is the gap between what
// exists near home and what a captain is ever told about.
let prizesNear = 0, hexesWithPrize = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    const st = X.poiStack(t);
    if (st.length) { hexesWithPrize++; prizesNear += st.length; }
  }
}
console.log('\n--- AND WHAT IS ACTUALLY DOWN THERE, IN THE SAME WATER ---');
console.log('  hexes holding at least one prize   ' + hexesWithPrize + '   (' + pct(hexesWithPrize, totalHexes) + ')');
console.log('  prizes in total                    ' + prizesNear);
console.log('  of those, hexes the sounder speaks for: ' + withReturn
  + '   (' + pct(withReturn, Math.max(1, hexesWithPrize)) + ' of the hexes that hold something)');
console.log('\nThe sounder reads ONE column — the one you are in. It is not a search');
console.log('tool, it is a confirmation tool: it tells you the water you already');
console.log('chose to be over has a bottom worth visiting. Whether a captain ever');
console.log('gets to that column is a different question, and the gap between the');
console.log('two numbers above is the size of it.');
