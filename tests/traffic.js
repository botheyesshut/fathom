// WHERE ARE THE SHIPS? — an instrument. `node tests/traffic.js [build]`
//
// An earlier probe found a sail in reach 3.1% of turns AMONG the harbours and
// 13.2% out in open water, which is backwards and went unexplained for a week.
// The cause is in `shipsTick`: routes are drawn between two ports that are both
// within SHIP_RANGE of THE BOAT, so traffic is a fact about where the player is
// standing rather than about where the trade is. A captain midway between two
// distant clusters sits in the middle of everybody's shipping lane; a captain
// tied up at a harbour whose neighbours are far off sees an empty sea.
//
// This measures it at harbours and in open water, on the same seeds, so a fix
// can be checked rather than believed.
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
const script = fs.readFileSync(process.env.FATHOM_HTML || process.argv[2] || __dirname + '/../fathom-chart.html', 'utf8')
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
var __X = { L: __L, state,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear();
             state.ships=[]; state.creatures=[]; state.moves=0; },
  tileAt, getTile, hexDistance, homeDock, ports, shipsTick, SHIP_RANGE, SHIP_CAP };
`, sb, { timeout: 180000 });
const X = sb.__X;

const SEEDS = [90210, 4242, 7, 31337, 512, 8675309];
const TURNS = 300;
const SIGHT = 9;   // the range a sail is actually noticed at

// Sit somewhere for TURNS ticks and count how often a sail is within sighting.
function watch(q, r) {
  X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
  X.state.alive = true; X.state.foot = null; X.state.ships = [];
  let seen = 0;
  for (let t = 0; t < TURNS; t++) {
    X.state.moves = t;
    try { X.shipsTick(); } catch (e) { return { seen: 0, err: e.message }; }
    if ((X.state.ships || []).some(s => X.hexDistance(s, { q, r }) <= SIGHT)) seen++;
  }
  return { seen: seen };
}

let atPort = 0, atPortN = 0, openWater = 0, openWaterN = 0;
const portNeighbours = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -40; dq <= 40; dq += 4) for (let dr = -40; dr <= 40; dr += 4) X.tileAt(hd.q + dq, hd.r + dr);
  const all = [...X.ports.values()];
  if (all.length < 2) continue;

  // AT A HARBOUR — beside a real port, which is where trade should be thickest.
  for (const p of all.slice(0, 3)) {
    let w = null;
    for (const [dq, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]) {
      const t = X.getTile(p.q + dq, p.r + dr);
      if (t && !t.wall) { w = { q: p.q + dq, r: p.r + dr }; break; }
    }
    if (!w) continue;
    // how many OTHER harbours are within range of this one — the real trade it has
    const nb = all.filter(o => o !== p && X.hexDistance(o, p) <= X.SHIP_RANGE).length;
    portNeighbours.push(nb);
    const res = watch(w.q, w.r);
    atPort += res.seen; atPortN++;
  }

  // IN OPEN WATER — a long way from any harbour at all.
  let far = null, bestD = 0;
  for (let dq = -34; dq <= 34 && !far; dq += 6) for (let dr = -34; dr <= 34; dr += 6) {
    const q = hd.q + dq, r = hd.r + dr;
    const t = X.getTile(q, r);
    if (!t || t.wall) continue;
    let d = 999;
    for (const p of all) d = Math.min(d, X.hexDistance(p, { q, r }));
    if (d > bestD && d < 900) { bestD = d; far = { q, r }; }
  }
  if (far) { const res = watch(far.q, far.r); openWater += res.seen; openWaterN++; }
}

const pc = (n, d) => d ? (100 * n / (d * TURNS)).toFixed(1) + '%' : '-';
console.log('TRAFFIC — ' + SEEDS.length + ' worlds, ' + TURNS + ' turns per watch, a sail within '
  + SIGHT + ' hexes counts as seen\n');
console.log('  tied up beside a harbour   ' + pc(atPort, atPortN) + '   (' + atPortN + ' watches)');
console.log('  alone in open water        ' + pc(openWater, openWaterN) + '   (' + openWaterN + ' watches)');
console.log('\n  harbours within SHIP_RANGE of the harbour you are at:');
portNeighbours.sort((a, b) => a - b);
console.log('    fewest ' + (portNeighbours[0] || 0)
  + '   median ' + (portNeighbours[Math.floor(portNeighbours.length / 2)] || 0)
  + '   most ' + (portNeighbours[portNeighbours.length - 1] || 0));
console.log('\n  A harbour with neighbours should be busy and open water should not.');
console.log('  If open water is busier, routes are being drawn around the PLAYER');
console.log('  rather than between harbours that actually trade with each other.');
