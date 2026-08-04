// EARLY-GAME REACHABLE DECKS — an instrument.
//   node tests/decks.js [path-to-an-older-build]
//
// Answers the one question a change to prize placement can silently break: does a
// beginner have a building to walk into? Give it a second path and it A/Bs against
// any commit (`git show <sha>:fathom-chart.html > old.html`).
//
// SEARCH TO 11,000 m, not 5,000. Two earlier probes capped at 5,000 and both
// reported "no reachable ruin" on a seed whose four ruins sit at 5,340-9,960 m and
// are all reachable. That mistake nearly had me revert a good change.

// THE EARLY-GAME QUESTION, ASKED PROPERLY.
// Weighting prize type by depth pushed every ruin within 22 hexes of the dock on
// seed 90210 down to 5,340-9,960 m, where before three of four sat at 960-4,260.
// That is not a test artifact — it is the early game losing its explorable content.
// But a HULL generates a deck too, so the honest measure is: how many buildings of
// either kind can a starter boat actually reach?
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
function boot(html) {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const doc = new Proxy({}, { get(t, p) {
    if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
    if (p === 'addEventListener') return () => {};
    return stub();
  }});
  const sb = { console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite, setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0,
    performance: { now: () => Date.now() }, document: doc, navigator: { userAgent: 'node' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {}, location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
  sb.window = sb; sb.globalThis = sb; sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(script + ';var __X={ seedTo(v){worldSeed=v;if(typeof interiorSalt!=="undefined")interiorSalt="";resetWorldCaches();interiorCache.clear();world.clear();cells.clear()},'
    + ' world,cells,cellKey,tileAt,getTile,cellPois,hexKey,poiStack,state,poiAtDepth,DEPTH_GRID };', sb, { timeout: 180000 });
  return sb.__X;
}

const SEEDS = [90210, 4242, 7, 11, 12345, 777, 31337];
console.log('REACHABLE DECKS INSIDE 22 HEXES OF THE DOCK   (a ruin and a hull both make one)');
console.log('build    seed    ruins  hulls  |  reach:ruin  reach:hull  reach at or under 1500 m');
for (const [tag, f] of [['now', process.env.FATHOM_HTML || __dirname + '/../fathom-chart.html'],
                        ['before', process.argv[2]]]) {
  if (!f) continue;
  const X = boot(fs.readFileSync(f, 'utf8'));
  let tot = { r: 0, h: 0, rr: 0, rh: 0, sh: 0 };
  for (const seed of SEEDS) {
    X.seedTo(seed);
    for (let q = -36; q <= 36; q++) for (let r = -36; r <= 36; r++) X.tileAt(q, r);
    let ruins = 0, hulls = 0, rr = 0, rh = 0, shallow = 0;
    for (let q = -22; q <= 22; q++) for (let r = -22; r <= 22; r++) {
      const t = X.getTile(q, r);
      if (!t) continue;
      for (const p of (X.poiStack(t) || [])) {
        if (p.type !== 'ruin' && p.type !== 'hull') continue;
        if (p.type === 'ruin') ruins++; else hulls++;
        let reachAt = null;
        for (let d = 0; d < 11000; d += X.DEPTH_GRID) {
          if (!X.cells.has(X.cellKey(q, r, d))) continue;
          X.state.q = q; X.state.r = r; X.state.currentDepth = d;
          const a = X.poiAtDepth(t, d);
          if (a && a.d === p.d) { reachAt = d; break; }
        }
        if (reachAt === null) continue;
        if (p.type === 'ruin') rr++; else rh++;
        if (reachAt <= 1500) shallow++;
      }
    }
    tot.r += ruins; tot.h += hulls; tot.rr += rr; tot.rh += rh; tot.sh += shallow;
    console.log(tag.padEnd(9) + String(seed).padEnd(8) + String(ruins).padStart(5) + String(hulls).padStart(7)
      + '  |' + String(rr).padStart(12) + String(rh).padStart(12) + String(shallow).padStart(27));
  }
  console.log(('  ' + tag + ' TOTAL').padEnd(17) + String(tot.r).padStart(5) + String(tot.h).padStart(7)
    + '  |' + String(tot.rr).padStart(12) + String(tot.rh).padStart(12) + String(tot.sh).padStart(27) + '\n');
}
