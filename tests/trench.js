// TRENCHES — THE SIX GATES, AS AN INSTRUMENT, WRITTEN BEFORE THE GENERATOR.
//
// Sean: "we can put some valleys and trenches down there which intersect and give
// access to and egress from the caves beneath."
//
// This file exists because of the specific way I would get this wrong: change the
// generator, then take a "baseline" from the already-changed world and declare
// every gate passed. So it runs against ANY build — pass FATHOM_HTML to point it
// at `git show <sha>:fathom-chart.html` — and prints the same six numbers either
// way. Run it on HEAD first, write those numbers down, then build.
//
//   node tests/trench.js                      # this working tree
//   FATHOM_HTML=/tmp/old.html node tests/trench.js
//
// It is an INSTRUMENT, not a battery suite: it reports and it does not gate the
// commit. The gates it reports on are in FATHOM_NEXT.md and are load-bearing:
//
//   1. nothing sealed      trenches only ADD water. If reachability falls, the
//                          change is subtracting cave, which means I have misread
//                          addVolume's priority rules.
//   2. more ways under     a trench that reaches the cave band IS a new door.
//                          No improvement means they are not intersecting caves
//                          and "access and egress" is unbuilt.
//   3. the shelf survives  the opening must stay a gentle shelf to learn on.
//                          Canyon country two hexes off the pier is the failure.
//   4. chunk time          there is no headroom. 60 ms ceiling, Android 3-4x.
//   5. do they intersect    Sean asked for trenches that INTERSECT. Unmeasured,
//                          that word is decoration.
//   6. coverage            too little and nobody meets one; too much and the
//                          seafloor is corrugated everywhere and stops meaning
//                          anything.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const HTML = process.env.FATHOM_HTML ||
  path.join(__dirname, '..', 'fathom-chart.html');
const src = fs.readFileSync(HTML, 'utf8');
const script = src.match(/<script>([\s\S]*?)<\/script>/)[1];

function stub() {
  const fn = function () { return s };
  const s = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
      return s;
    },
    apply() { return s }, set() { return true }, has() { return true },
  });
  return s;
}
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
function boot(seed) {
  const doc = new Proxy({}, {
    get(t, p) {
      if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
      if (p === 'addEventListener') return () => {};
      return stub();
    },
  });
  const sb = {
    console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    performance: { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 },
    document: doc, navigator: { userAgent: 'node' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {}, removeEventListener: () => {},
    location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    alert: () => {},
  };
  sb.window = sb; sb.globalThis = sb; sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(script + '\n;var __X={'
    + ' seedTo(v){ worldSeed = v; if (typeof interiorSalt !== "undefined") interiorSalt = ":" + v;'
    + '            resetWorldCaches(); interiorCache.clear(); world.clear(); cells.clear(); },'
    + ' world, cells, cellKey, cellRun, tileAt, getTile, hexKey, hexDistance, DEPTH_GRID,'
    + ' CAVE_BANDS, ensureChunk, hexToChunk, generatedChunks,'
    + ' trenchAt: (typeof trenchAt === "function" ? trenchAt : null),'
    + ' trenchFloorAt: (typeof trenchFloorAt === "function" ? trenchFloorAt : null),'
    + ' ABYSS_FLOOR: (typeof ABYSS_FLOOR !== "undefined" ? ABYSS_FLOOR : null),'
    + ' homeShoreDist: (typeof homeShoreDist === "function" ? homeShoreDist : null),'
    + ' baseSeafloorDepth: (typeof baseSeafloorDepth === "function" ? baseSeafloorDepth : null),'
    + ' shelfSeafloorDepth: (typeof shelfSeafloorDepth === "function" ? shelfSeafloorDepth : null),'
    + '};', sb, { timeout: 120000 });
  sb.__X.seedTo(seed);
  return sb.__X;
}

const SEEDS = [90210, 4242, 7];
const out = [];
function say(s) { out.push(s); console.log(s); }

say('TRENCHES — SIX GATES   (' + path.basename(HTML) + ')');
say('seeds ' + SEEDS.join(', ') + '\n');

// ---------------------------------------------------------------- GATE 4 first
// Timed before the maps are warm, because that is the only honest moment.
{
  const X = boot(SEEDS[0]);
  // WARM UP FIRST, AND SAY SO. The first version of this timed chunks from the
  // origin outward with nothing compiled and reported a 330.9 ms worst case,
  // which is chunk (0,0) building the home island's radial shelf and the cave
  // lattice for the first time in a cold VM. A player pays that once, behind the
  // splash screen. What a player FEELS is steady-state generation while sailing,
  // and that is what the 60 ms frame budget is about. Both are reported.
  const cold = [];
  for (let cq = -2; cq <= 2; cq++) for (let cr = -2; cr <= 2; cr++) {
    const t0 = process.hrtime.bigint();
    X.ensureChunk(cq, cr);
    cold.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  // CLEAR THE MAPS BEFORE THE WARM PASS. A first attempt timed 90 further chunks
  // on top of these 25 and blew `cells` past its 16.7M ceiling mid-measurement —
  // the third time a probe in this project has done exactly that. Warm JIT,
  // empty world, modest batch.
  X.seedTo(SEEDS[0]);
  const warm = [];
  for (let i = 0; i < 25; i++) {
    const cq = 40 + (i % 5), cr = 40 + Math.floor(i / 5);
    const t0 = process.hrtime.bigint();
    X.ensureChunk(cq, cr);
    warm.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  const stat = (a) => { const b = a.slice().sort((x, y) => x - y);
    return { med: b[Math.floor(b.length / 2)], p90: b[Math.floor(b.length * 0.9)], max: b[b.length - 1] }; };
  const c = stat(cold), w = stat(warm);
  say('4. CHUNK TIME        cold, from the origin (paid once, behind the splash):');
  say('                       median ' + c.med.toFixed(1) + '  p90 ' + c.p90.toFixed(1) + '  worst ' + c.max.toFixed(1) + ' ms');
  say('                     warm, out in open water (what sailing costs):');
  say('                       median ' + w.med.toFixed(1) + '  p90 ' + w.p90.toFixed(1) + '  worst ' + w.max.toFixed(1) +
      ' ms   (gate: p90 < 55, and Android is 3-4x)');
}

// --------------------------------------------------------- GATES 1, 2, 3, 5, 6
const agg = { cells: [], hexes: [], maxDepth: [], sinks: [], nearest: [],
              d3: [], d20: [], cross: [], cover: [], rim: [],
              band: [], deepest: [], meets: [] };
for (const seed of SEEDS) {
  const X = boot(seed);
  const R = 30;
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) X.tileAt(q, r);

  // 1. NOTHING SEALED — flood fill from every surface cell.
  const seen = new Set(); const stack = [];
  for (const [k, c] of X.cells) {
    const p = k.split(',');
    if (+p[2] === 0) { seen.add(k); stack.push([+p[0], +p[1], 0]); }
  }
  let maxD = 0;
  const hexes = new Set();
  while (stack.length) {
    const [q, r, d] = stack.pop();
    if (d > maxD) maxD = d;
    hexes.add(q + ',' + r);
    const nb = [[q + 1, r, d], [q - 1, r, d], [q, r + 1, d], [q, r - 1, d],
                [q + 1, r - 1, d], [q - 1, r + 1, d], [q, r, d + X.DEPTH_GRID], [q, r, d - X.DEPTH_GRID]];
    for (const [nq, nr, nd] of nb) {
      if (nd < 0) continue;
      const nk = X.cellKey(nq, nr, nd);
      if (seen.has(nk) || !X.cells.has(nk)) continue;
      seen.add(nk); stack.push([nq, nr, nd]);
    }
  }
  agg.cells.push(seen.size); agg.hexes.push(hexes.size); agg.maxDepth.push(maxD);

  // 2. MORE WAYS UNDER — sinkholes reachable from the dock.
  let sinks = 0, nearest = Infinity;
  for (const t of X.world.values()) {
    if (t.poi !== 'opening') continue;
    const dist = X.hexDistance({ q: t.q, r: t.r }, { q: 0, r: 0 });
    if (dist > 30) continue;
    sinks++; if (dist < nearest) nearest = dist;
  }
  agg.sinks.push(sinks); agg.nearest.push(nearest === Infinity ? -1 : nearest);

  // 3. THE SHELF SURVIVES — the depth profile off the pier, east.
  const floorAt = (q, r) => {
    const run = X.cellRun(q, r, 0);
    return run ? run.floor : null;
  };
  agg.d3.push(floorAt(3, 0)); agg.d20.push(floorAt(20, 0));

  // 5 & 6. INTERSECTIONS AND COVERAGE. Both need the generator to exist; report
  // honestly that they are unbuilt rather than printing a zero that reads as a
  // measurement.
  if (X.trenchAt) {
    // OVER WATER WHERE A TRENCH IS ALLOWED, which is not the same as all water.
    // `trenchAt` answers geometrically and knows nothing about the keep-out;
    // `trenchFloorAt` refuses to cut inside 23 hexes of the home shore, and most
    // of a 61x61 box round the origin IS inside that. Dividing hits by all water
    // mixed the two populations and made coverage look a quarter of what it is.
    // AND OVER A REAL AREA, not the thin annulus left when the keep-out is
    // subtracted from a 61x61 box. `trenchAt` and `trenchFloorAt` are pure
    // functions of position — they generate nothing — so this can sweep four times
    // wider for free. At R=30 seed 7 reported ZERO crossings and the gate read as
    // failed, when what had actually happened is that its crossings were outside
    // the sampled ring.
    const TR = 120;
    let real = 0, rim = 0, eligible = 0, crossings = 0;
    for (let q = -TR; q <= TR; q++) for (let r = -TR; r <= TR; r++) {
      if (X.homeShoreDist && X.homeShoreDist(q, r) < 23) continue;   // the learner's shelf
      eligible++;
      const hit = X.trenchAt(q, r);
      if (!hit || !hit.length) continue;
      rim++;
      const axes = new Set(hit.map(h => h.id));
      if (axes.size > 1) crossings++;
      // IN a trench means the seabed dropped. 300 m below the plain is in one;
      // 30 m below it is beside one, and counting those was the over-count.
      const f = X.trenchFloorAt ? X.trenchFloorAt(q, r) : null;
      if (f != null && f >= (X.ABYSS_FLOOR || 4200) + 300) real++;
    }
    agg.cross.push(crossings);
    agg.cover.push(eligible ? real / eligible : 0);
    agg.rim.push(eligible ? rim / eligible : 0);
  } else {
    agg.cross.push(null); agg.cover.push(null); agg.rim.push(null);
  }

  // 2b. THE THING SEAN ACTUALLY ASKED FOR: "access and egress from the caves
  // beneath". The sinkhole count above is the wrong proxy for it — trenches keep
  // out of the learner's shelf on purpose, so they can never move a number
  // measured within 30 hexes of the dock. What matters is whether a trench cuts
  // down INTO the cave bands, because that is the door.
  if (X.trenchFloorAt) {
    let intoBand = 0, deepest = 0, meets = 0;
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) {
      const f = X.trenchFloorAt(q, r);
      if (f == null) continue;
      if (f > deepest) deepest = f;
      for (const b of X.CAVE_BANDS) {
        if (f >= b.minDepth && b.minDepth >= (X.ABYSS_FLOOR || 4200)) { intoBand++; break; }
      }
      // and does the column actually open into worked cave down there?
      const run = X.cellRun(q, r, 0);
      if (!run) continue;
      for (let d = (X.ABYSS_FLOOR || 4200); d <= run.floor; d += X.DEPTH_GRID) {
        const c = X.cells.get(X.cellKey(q, r, d));
        if (c && (c.kind === 'passage' || c.kind === 'chamber')) { meets++; break; }
      }
    }
    agg.band.push(intoBand); agg.deepest.push(deepest); agg.meets.push(meets);
  } else {
    agg.band.push(null); agg.deepest.push(null); agg.meets.push(null);
  }
}

const avg = a => a.filter(v => v != null).reduce((s, v) => s + v, 0) / Math.max(1, a.filter(v => v != null).length);
const fmt = a => a.map(v => v == null ? '—' : (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(3) : v)).join(' / ');

say('1. NOTHING SEALED    cells ' + fmt(agg.cells) + '   hexes ' + fmt(agg.hexes));
say('                     deepest reachable ' + fmt(agg.maxDepth) + ' m');
say('2. WAYS UNDER        sinkholes within 30 of the dock ' + fmt(agg.sinks) +
    '   nearest ' + fmt(agg.nearest));
say('3. THE SHELF         floor at 3 hexes east ' + fmt(agg.d3) +
    ' m   at 20 hexes ' + fmt(agg.d20) + ' m');
if (agg.cross[0] == null) {
  say('5. INTERSECTIONS     NOT BUILT — no trenchAt() in this build. Not zero: absent.');
  say('6. COVERAGE          NOT BUILT — same.');
} else {
  say('2b. INTO THE CAVES   hexes cut into a band at 4,200 m or deeper ' + fmt(agg.band));
  say('                     hexes whose column meets worked cave below the plain ' + fmt(agg.meets));
  say('                     deepest trench floor ' + fmt(agg.deepest) + ' m');
  say('5. INTERSECTIONS     hexes on two or more axes ' + fmt(agg.cross) +
      '   (gate: > 0)');
  say('6. COVERAGE          floor 300 m+ below the plain ' + agg.cover.map(v => (v * 100).toFixed(1) + '%').join(' / ') +
      '   (gate: 8-20%)');
  say('                     anywhere inside a rim ' + agg.rim.map(v => (v * 100).toFixed(1) + '%').join(' / ') +
      '   (gate: 8-20%)');
}
say('\nmeans: cells ' + Math.round(avg(agg.cells)) + '  hexes ' + Math.round(avg(agg.hexes)) +
    '  maxDepth ' + Math.round(avg(agg.maxDepth)) + '  sinks ' + avg(agg.sinks).toFixed(1) +
    '  nearest ' + avg(agg.nearest).toFixed(1) +
    '  shelf@3 ' + Math.round(avg(agg.d3)) + '  shelf@20 ' + Math.round(avg(agg.d20)));
