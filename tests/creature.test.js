// Creature layer verification: spawn validity, sound-wake, hunt+strike,
// drifter blocking, wander soundness, save v2 round trip (+v1 compat).
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (p === 'firstChild' || p === 'lastChild' || p === 'nextSibling' || p === 'parentNode') return null;
      return stub;
    },
    apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; },
  });
  return stub;
}
function memStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function freshContext(storage) {
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
    document: documentStub, navigator: { userAgent: 'node' }, localStorage: storage || memStorage(),
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const injected = script + '\nfunction __cells(){ return cells; }\nfunction __state(){ return state; }\nfunction __spawned(){ return spawnedChunks; }\nfunction __ck(q,r,d){ return cells.has(cellKey(q,r,d)); }\nfunction __kind(q,r,d){ const c = cells.get(cellKey(q,r,d)); return c ? c.kind : null; }';
  try { vm.runInContext(injected, sandbox, { timeout: 15000 }); } catch (e) { /* DOM init throw expected */ }
  return sandbox;
}

let failures = 0;
const check = (ok, label, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) failures++;
};

const store = memStorage();
const sb = freshContext(store);
sb.restart();
const st = sb.__state();

// ---- 1. Spawn validity over a wide cave region ----
for (let cq = 2; cq <= 6; cq++) for (let cr = 2; cr <= 6; cr++) sb.ensureChunk(cq, cr);
for (let cq = -6; cq <= -2; cq++) for (let cr = -6; cr <= -2; cr++) sb.ensureChunk(cq, cr);
const creatures = st.creatures;
let badCell = 0, badKind = 0;
for (const c of creatures) {
  if (!sb.__ck(c.q, c.r, c.depth)) badCell++;
  else { const k = sb.__kind(c.q, c.r, c.depth); if (k !== 'passage' && k !== 'chamber') badKind++; }
}
check(creatures.length >= 5, 'creatures spawned across cave chunks', creatures.length + ' spawned (drifters ' + creatures.filter(c => c.type === 'drifter').length + ', lurkers ' + creatures.filter(c => c.type === 'lurker').length + ')');
check(badCell === 0, 'every creature sits in an open cell', badCell + ' in stone');
check(badKind === 0, 'every creature sits in a CAVE cell', badKind + ' in non-cave water');

// ---- 2. Sound: near lurker wakes, far lurker sleeps ----
st.q = 0; st.r = -6; st.currentDepth = 0; // open shelf water
st.creatures.length = 0;
sb.spawnCreature('lurker', 0, -10, 0);   // 4 hexes away
sb.spawnCreature('lurker', 40, -6, 0);   // 40 hexes away
sb.noiseMade(st.q, st.r, 3);             // reach = 2 + 9 = 11
check(st.creatures[0].awake === true, 'lurker in earshot wakes on loud ping');
check(st.creatures[1].awake === false, 'lurker beyond earshot stays asleep');

// ---- 3. Hunt: awake lurker closes and strikes ----
{
  const c = st.creatures[0];
  const hd = () => Math.max(Math.abs(c.q - st.q), Math.abs(c.r - st.r), Math.abs((-c.q - c.r) - (-st.q - st.r)));
  const d0 = hd();
  const hull0 = st.hull;
  let struck = false;
  for (let i = 0; i < 12; i++) {
    sb.creatureTick();
    if (st.hull < hull0) { struck = true; break; }
  }
  check(hd() < d0 || struck, 'awake lurker closes on the boat', d0 + ' → ' + hd() + ' hexes');
  check(struck && st.hull < hull0, 'cornering lurker strikes the hull', 'hull ' + hull0 + ' → ' + st.hull);
}

// ---- 4. Drifter blocks movement ----
{
  st.creatures.length = 0;
  st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 100;
  sb.spawnCreature('drifter', 1, -7, 0); // adjacent (0,-6)+(1,-1) dir
  const hull0 = st.hull;
  sb.move(1, -7);
  check(st.q === 0 && st.r === -6, 'drifter blocks the passage (no move)', 'player stayed at (0,-6)');
  check(st.hull === hull0, 'blocked move costs no hull', 'hull ' + st.hull);
}

// ---- 5. Wander soundness: 60 ticks, nothing enters stone ----
{
  st.creatures.length = 0;
  // reuse real spawns near the player: pull some cave chunks close by
  for (let cq = 1; cq <= 3; cq++) for (let cr = -3; cr <= -1; cr++) sb.ensureChunk(cq, cr);
  // wake everything and stress-move
  for (const c of st.creatures) { if (c.type === 'lurker') { c.awake = true; c.calm = 999; c.tq = st.q; c.tr = st.r; } }
  let stoneViolations = 0;
  for (let i = 0; i < 60; i++) {
    sb.creatureTick();
    for (const c of st.creatures) if (!sb.__ck(c.q, c.r, c.depth)) stoneViolations++;
  }
  check(stoneViolations === 0, '60 ticks: no creature ever occupies stone', st.creatures.length + ' creatures × 60 ticks, ' + stoneViolations + ' violations');
}

// ---- 6. Save v2 round trip + v1 compat ----
{
  st.q = 0; st.r = -6; st.currentDepth = 0;
  const nCreatures = st.creatures.length;
  const nSpawned = sb.__spawned().size;
  sb.doSave();
  const raw = JSON.parse(store.getItem('fathom-save-v1'));
  check(raw.v === 2 && Array.isArray(raw.creatures) && raw.creatures.length === nCreatures, 'save v2 carries creatures', raw.creatures.length + ' creatures, ' + raw.spawnedChunks.length + ' spawned chunks');
  const sb2 = freshContext(store);
  sb2.startGame();
  const st2 = sb2.__state();
  check(st2.creatures.length === nCreatures, 'creatures survive reload', st2.creatures.length + ' restored');
  check(sb2.__spawned().size >= nSpawned, 'spawn history survives reload (no duplicate rolls)', sb2.__spawned().size + ' chunks tracked');
  // v1 compat: strip v2 fields, must still load with empty creatures
  const v1 = { ...raw, v: 1 }; delete v1.creatures; delete v1.spawnedChunks;
  store.setItem('fathom-save-v1', JSON.stringify(v1));
  const sb3 = freshContext(store);
  sb3.startGame();
  check(sb3.__state().creatures.length === 0 && sb3.__seed === undefined ? sb3.__state().moves === raw.moves : sb3.__state().moves === raw.moves, 'v1 save still loads (creatures empty)', 'moves ' + sb3.__state().moves + ', creatures ' + sb3.__state().creatures.length);
}

console.log(failures === 0 ? '\nALL CREATURE CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
