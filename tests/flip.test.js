// Stage E flip verification: the infinite local generator must be
//   1. order-independent  — same chunks generated in different orders → identical cells
//   2. deterministic      — same seed, two fresh loads → identical cells
//   3. connected          — dock/surface BFS reaches sinkholes + a large cave network
//   4. infinite           — caves exist at far-field coordinates (300, 1500, 5000 hexes out)
//   5. fast enough        — per-chunk generation time acceptable for Android Chrome
//   6. internally sound   — verifyCells() reports 0 bad
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, {
    get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return function* () {}; if (p === 'length') return 0; return stub; },
    apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; },
  });
  return stub;
}
function freshContext() {
  const stub = makeStub();
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const sandbox = {
    console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => Date.now() },
    document: documentStub, navigator: { userAgent: 'node' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const injected = script +
    '\nfunction __reset(s){ worldSeed = s; world.clear(); cells.clear(); generatedChunks.clear(); revealed.clear(); visited.clear(); nodeCache.clear(); edgeCache.clear(); carvedFeatures.clear(); cellPois.clear(); }' +
    '\nfunction __cells(){ return cells; }\nfunction __world(){ return world; }';
  try { vm.runInContext(injected, sandbox, { timeout: 15000 }); } catch (e) { /* DOM init throw expected */ }
  return sandbox;
}

const SEED = 424242;
let failures = 0;
const check = (ok, label, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) failures++;
};

// ---------- 1+2. Order-independence & determinism ----------
const chunkList = [];
for (let cq = -3; cq <= 3; cq++) for (let cr = -3; cr <= 3; cr++) chunkList.push([cq, cr]);
// Order A: row-major. Order B: deterministically shuffled.
const orderA = chunkList.slice();
const orderB = chunkList.slice();
{ // fisher-yates with fixed LCG
  let s = 987654321;
  const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let i = orderB.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [orderB[i], orderB[j]] = [orderB[j], orderB[i]]; }
}
function snapshotCells(sb) {
  const out = new Map();
  for (const [k, c] of sb.__cells()) out.set(k, c.kind);
  return out;
}
function genRun(order) {
  const sb = freshContext();
  sb.__reset(SEED);
  const t0 = Date.now();
  for (const [cq, cr] of order) sb.ensureChunk(cq, cr);
  const ms = Date.now() - t0;
  return { sb, cells: snapshotCells(sb), ms };
}
const runA = genRun(orderA);
const runB = genRun(orderB);
let onlyA = 0, onlyB = 0, kindMM = 0;
for (const [k, kind] of runA.cells) {
  if (!runB.cells.has(k)) onlyA++;
  else if (runB.cells.get(k) !== kind) kindMM++;
}
for (const k of runB.cells.keys()) if (!runA.cells.has(k)) onlyB++;
check(onlyA === 0 && onlyB === 0 && kindMM === 0, 'order-independence (49 chunks, 2 orders)',
  runA.cells.size + ' cells; onlyA=' + onlyA + ' onlyB=' + onlyB + ' kindMM=' + kindMM);

const runA2 = genRun(orderA);
let detMM = 0;
if (runA2.cells.size !== runA.cells.size) detMM++;
for (const [k, kind] of runA.cells) if (runA2.cells.get(k) !== kind) { detMM++; break; }
check(detMM === 0, 'determinism (same seed, fresh loads)', runA.cells.size + ' cells identical');

// Tile-level agreement between orders (POI placement is chunk-RNG-over-open-list,
// known order-dependent; excluded — cells are the substrate truth).
{
  const wA = runA.sb.__world(), wB = runB.sb.__world();
  // POIs are now substrate (hash-rolled per feature/hex) — NO exclusions:
  // every tile including its poi must agree across generation orders.
  let extentMM = 0, typeMM = 0, poiMM = 0, poiCount = 0;
  for (const [k, tA] of wA) {
    const tB = wB.get(k);
    if (!tB) { extentMM++; continue; }
    if (tA.ceiling !== tB.ceiling || tA.floor !== tB.floor || !!tA.wall !== !!tB.wall) extentMM++;
    if (tA.type !== tB.type) typeMM++;
    if ((tA.poi || null) !== (tB.poi || null)) poiMM++;
    if (tA.poi) poiCount++;
  }
  check(extentMM === 0, 'tile extent/wall order-independence', extentMM + ' mismatches');
  check(typeMM === 0 && poiMM === 0, 'FULL substrate order-independence incl. POIs', typeMM + ' type / ' + poiMM + ' poi mismatches across ' + poiCount + ' POI tiles');
}

// ---------- 6. verifyCells ----------
const vc = runA.sb.verifyCells();
check(vc.bad === 0, 'verifyCells internal soundness', vc.bad + ' bad tiles, ' + vc.cells + ' cells');

// ---------- 3. Connectivity BFS from the surface at the dock ----------
{
  const sb = runA.sb;
  const cellsMap = sb.__cells();
  const worldMap = sb.__world();
  const DG = 60;
  const start = '0,0,0';
  check(cellsMap.has(start), 'origin surface cell exists', start);
  const seen = new Set([start]);
  const queue = [start];
  const dirs = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  let maxDepth = 0; const hexes = new Set();
  while (queue.length) {
    const cur = queue.pop();
    const [q, r, d] = cur.split(',').map(Number);
    hexes.add(q + ',' + r);
    if (d > maxDepth) maxDepth = d;
    for (const [dq, dr] of dirs) {
      const nk = (q + dq) + ',' + (r + dr) + ',' + d;
      if (!seen.has(nk) && cellsMap.has(nk)) { seen.add(nk); queue.push(nk); }
    }
    for (const nd of [d - DG, d + DG]) {
      if (nd < 0) continue;
      const nk = q + ',' + r + ',' + nd;
      if (!seen.has(nk) && cellsMap.has(nk)) { seen.add(nk); queue.push(nk); }
    }
  }
  let openings = 0;
  for (const [k, t] of worldMap) if (t.poi === 'opening' && hexes.has(k)) openings++;
  const pierTile = worldMap.get('3,-1');
  check(!!pierTile && pierTile.type === 'opening', 'guaranteed pier entrance at (3,-1)', pierTile ? 'type=' + pierTile.type : 'missing');
  check(seen.size > 20000, 'BFS network size from surface', seen.size + ' cells / ' + hexes.size + ' hexes reachable');
  check(maxDepth >= 480, 'caves reachable from surface (b0+)', 'max depth reached ' + maxDepth + ' m; ' + openings + ' sinkhole openings reachable');
  console.log('      (info) reachable band depths: max ' + maxDepth + ' m — deeper bands need z-tunnels beyond the 7x7 chunk window');
}

// ---------- 4. Far-field: the world does not end ----------
{
  const sb = freshContext();
  sb.__reset(SEED);
  const spots = [[300, 300], [-1500, 800], [5000, -5000]];
  for (const [q, r] of spots) {
    sb.tileAt(q, r);
    const cellsMap = sb.__cells();
    // count cave-kind cells within 40 hexes of the spot
    let cave = 0;
    for (const [k, c] of cellsMap) {
      if (c.kind !== 'passage' && c.kind !== 'chamber') continue;
      const [cq2, cr2] = k.split(',').map(Number);
      if (Math.abs(cq2 - q) <= 40 && Math.abs(cr2 - r) <= 40) { cave++; }
    }
    check(cave > 200, 'far-field caves near (' + q + ',' + r + ')', cave + ' passage/chamber cells within 40 hexes');
  }
}

// ---------- 5. Performance ----------
{
  const sb = freshContext();
  sb.__reset(SEED);
  const t0 = Date.now();
  sb.tileAt(0, 0); // origin burst: 9 chunks
  const originMs = Date.now() - t0;
  const t1 = Date.now();
  let n = 0;
  for (let cq = 4; cq <= 8; cq++) for (let cr = 4; cr <= 8; cr++) { sb.ensureChunk(cq, cr); n++; }
  const perChunk = (Date.now() - t1) / n;
  check(originMs < 2500, 'origin 9-chunk burst time', originMs + ' ms (Android ~3-4x)');
  check(perChunk < 60, 'steady-state per-chunk time', perChunk.toFixed(1) + ' ms/chunk over ' + n);
  console.log('      (info) run A total: ' + runA.ms + ' ms for 49 chunks (' + (runA.ms / 49).toFixed(1) + ' ms/chunk)');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
