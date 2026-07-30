// WHAT PUTS A HEX ON THE SCREEN — an instrument.  node tests/seeing.js
//
// Sean asked twice why he was seeing hexes he should not, the second time at 240 m with
// the sonar at medium-high — which was the clue, because the sonar had nothing to do with
// it. It was the sunlight flood: `sunlitHere` lights any hex the flood reaches at FULL
// brightness whether or not it has ever been revealed, and the flood ran ten rings in a
// band reaching 300 m down.
//
// This measures it with NO ping and NOTHING explored, so anything on screen has to be
// coming from sunlight. Keep it: "the player can see something they have not earned" is
// the one class of bug that quietly destroys the epistemic rule the whole game runs on,
// and it is invisible to every other check in the repo.
//
// It reads SUN_BAND and SUN_REACH out of the build, so it tracks the game rather than my
// memory of it, and reimplements the flood from render() verbatim because `sunlitHere` is
// a const inside that function and cannot be exported.

// WHAT PUTS A HEX ON THE SCREEN? Sean, twice now: "I'm still seeing hexes I shouldn't
// see. I was using sonar at medium-high power."
//
// The rule the code claims to follow is stated in its own comment: a face renders only if
// the lights touch it, the sonar returned it, or it borders water the player knows. This
// asks whether that is what actually happens — in a FRESH world, with one ping and no
// prior exploration, so anything on screen has to have come from that ping.
const fs = require('fs'), vm = require('vm');
function mk() {
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
const script = fs.readFileSync('C:/Users/bothe/Documents/GitHub/personal/Fathom/fathom-chart.html', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => mk();
  if (p === 'addEventListener') return () => {};
  return mk();
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
;var __L=[]; log=function(t,c,e){__L.push({t:String(t)})};
gameStarted = true;
var __X = {
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear();
             state.creatures=[]; state.enclaves=[]; state.ships=[]; state.pingMemory=new Map(); },
  state, tileAt, getTile, hexKey, hexDistance, hexNeighbors, revealed, visited,
  revealFade, hexAcceptsDepth, hexNearDepth, PING_LEVELS, DEPTH_GRID,
  doPing: (typeof doPing === 'function' ? doPing : null),
  activePing: (typeof activePing === 'function' ? activePing : null),
  ping: (typeof ping === 'function' ? ping : null),
};
`, sb, { timeout: 120000 });
const X = sb.__X;
X.seedTo(90210);
const R = 26;
for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) X.tileAt(q, r);

// A boat sat in open water at 240 m, having explored NOTHING.
let spot = null;
for (let q = 4; q < 24 && !spot; q++) for (let r = -10; r <= 10; r++) {
  const t = X.getTile(q, r);
  if (t && !t.wall && X.hexAcceptsDepth(t, 240)) { spot = { q, r }; break; }
}
if (!spot) { console.log('no open water at 240 m to sit in'); process.exit(0); }
X.state.q = spot.q; X.state.r = spot.r; X.state.currentDepth = 240;
X.state.alive = true; X.state.foot = null; X.state.air = 350;
console.log('boat at ' + spot.q + ',' + spot.r + ' at 240 m, nothing explored');
console.log('ping levels: ' + X.PING_LEVELS.map((l, i) => i + ':' + l.activeRange + 'hex/' + l.depthRange + 'm').join('  '));

// SUNLIGHT, reimplemented from render() line for line, because `sunlitHere` is a const
// inside that function and cannot be exported. The flood, the band, and both depth
// tests are copied verbatim.
function litSet(rings, bandSteps) {
  const cd0 = X.state.currentDepth;
  const lit = new Set();
  if (cd0 > bandSteps * X.DEPTH_GRID) return lit;
  const startK = X.hexKey(X.state.q, X.state.r);
  lit.add(startK);
  const seenL = new Set([startK]);
  let frontier = [{ q: X.state.q, r: X.state.r }];
  for (let ring = 0; ring < rings && frontier.length; ring++) {
    const next = [];
    for (const cell of frontier) {
      for (const n of X.hexNeighbors(cell.q, cell.r)) {
        const nk = X.hexKey(n.q, n.r);
        if (seenL.has(nk)) continue;
        const nt = X.tileAt(n.q, n.r);
        if (!nt || nt.wall) continue;
        if (!X.hexAcceptsDepth(nt, cd0) && !(cd0 <= bandSteps * X.DEPTH_GRID && X.hexNearDepth(nt, 0) && X.hexNearDepth(nt, cd0))) continue;
        seenL.add(nk); lit.add(nk); next.push(n);
      }
    }
    frontier = next;
  }
  return lit;
}
let LIT = new Set(), RINGS = 10, BAND = 5;
const sunlitHere = (q, r, nt, cd) =>
  cd <= BAND * X.DEPTH_GRID && X.hexNearDepth(nt, 0) && LIT.has(X.hexKey(q, r));

// The render's own test for "does this hex go on the screen", copied out of render()
// verbatim so the probe cannot disagree with the game about the rule.
function wouldRender(q, r) {
  const cd = X.state.currentDepth;
  const tile = X.getTile(q, r);
  if (!tile) return false;
  const dFromPlayer = X.hexDistance({ q, r }, { q: X.state.q, r: X.state.r });
  if (!X.hexAcceptsDepth(tile, cd)) {
    return dFromPlayer <= 1 || X.revealFade(q, r, cd) > 0
      || X.hexNeighbors(q, r).some(n => {
        const nt = X.tileAt(n.q, n.r);
        if (nt.wall || !X.hexAcceptsDepth(nt, cd)) return false;
        if (sunlitHere(n.q, n.r, nt, cd)) return true;
        return X.revealFade(n.q, n.r, cd) > 0;
      });
  }
  let fade = X.revealFade(q, r, cd);
  if (sunlitHere(q, r, tile, cd)) fade = 1;
  const bubbleR = cd <= 2 * 60 ? 3 : cd <= 5 * 60 ? 2 : -1;
  if (dFromPlayer <= (X.hexNearDepth(tile, 0) ? bubbleR : 1)) fade = 1;
  return fade > 0;
}
function survey(label) {
  let n = 0, far = 0, worst = 0;
  const byDist = {};
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) {
    if (!wouldRender(q, r)) continue;
    n++;
    const d = X.hexDistance({ q, r }, { q: X.state.q, r: X.state.r });
    byDist[d] = (byDist[d] || 0) + 1;
    if (d > worst) worst = d;
    if (d > 5) far++;
  }
  const ring = Object.keys(byDist).map(Number).sort((a, b) => a - b)
    .map(d => d + ':' + byDist[d]).join(' ');
  console.log('\n' + label);
  console.log('  hexes that would render: ' + n + '   furthest from the boat: ' + worst + ' hexes');
  console.log('  beyond 5 hexes (a 300 m ping): ' + far);
  console.log('  by distance ->  ' + ring);
}

console.log('');
console.log('WHAT SUNLIGHT ALONE LIGHTS UP  (no ping, nothing explored, nothing revealed)');
console.log('depth   rings  band     hexes rendered   furthest');
const src = fs.readFileSync('C:/Users/bothe/Documents/GitHub/personal/Fathom/fathom-chart.html','utf8');
const bandM = (src.match(/SUN_BAND = (\d+) \* DEPTH_GRID/) || [,'5'])[1] * 1;
const reachM = (src.match(/SUN_REACH = (\d+)/) || [,'10'])[1] * 1;
console.log('the build says SUN_BAND ' + (bandM*60) + ' m, SUN_REACH ' + reachM + ' hexes');
for (const depth of [60, 120, 240, 300, 360]) {
  X.state.currentDepth = depth;
  for (const [rings, band] of [[10,5],[reachM,bandM]]) {
    RINGS = rings; BAND = band;
    LIT = litSet(rings, band);
    let n=0, worst=0;
    for (let q=-R;q<=R;q++) for (let r=-R;r<=R;r++) {
      if (!wouldRender(q,r)) continue;
      n++;
      const d = X.hexDistance({q,r},{q:X.state.q,r:X.state.r});
      if (d>worst) worst=d;
    }
    console.log(String(depth).padStart(5) + 'm' + String(rings).padStart(7) + String(band*60).padStart(6) + 'm'
      + String(n).padStart(17) + String(worst).padStart(11));
  }
}
