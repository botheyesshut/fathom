// Cargo loop: salvage → crate aboard → make port → banked → survives reload.
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
      if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
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
    document: documentStub, navigator: { userAgent: 'node' }, localStorage: storage,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  try { vm.runInContext(script + '\nfunction __state(){ return state; }\nfunction __tile(q,r){ return world.get(hexKey(q,r)); }', sandbox, { timeout: 15000 }); } catch (e) {}
  return sandbox;
}
let failures = 0;
const check = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) failures++; };

const store = memStorage();
const sb = freshContext(store);
sb.restart();
const st = sb.__state();

// 1. Salvage pickup — dive-to-the-prize ruling: wreckage rests on the floor;
// hovering high above it yields nothing, working it at the floor yields a crate.
st.hull = 50;
const fakeTile = { type: 'salvage', q: 0, r: -8, poi: 'salvage', ceiling: 0, floor: 360 };
st.currentDepth = 240; // 120 m above the floor — out of reach
sb.handleTile(fakeTile);
check(st.cargo === 0, 'wreck out of reach when hovering above the floor', 'cargo=' + st.cargo);
st.currentDepth = 360; // at the floor
sb.handleTile(fakeTile);
check(st.cargo === 1, 'salvage yields a crate at the floor', 'cargo=' + st.cargo);
check(st.hull > 50, 'salvage still patches hull', 'hull=' + st.hull);
check(st.poisFound.includes('0,-8'), 'pickup recorded in poisFound (render-gate + no re-pickup)');

// 1b. Air pocket — gas pools at the ceiling; you rise to vent.
st.air = 100;
const airTile = { type: 'air', q: 2, r: -9, poi: 'air', ceiling: 480, floor: 600 };
st.currentDepth = 600; // 120 m below the ceiling — out of reach
sb.handleTile(airTile);
check(st.air === 100, 'gas pocket out of reach below the ceiling', 'air=' + st.air);
st.currentDepth = 480; // at the ceiling
sb.handleTile(airTile);
check(st.air > 100, 'venting at the ceiling refills air', 'air=' + st.air);

// 2. Make port → banked (hull full so the yard stays quiet for this check)
st.q = 0; st.r = 0; st.currentDepth = 0; st.air = 100; st.hull = 100;
sb.surface();
check(st.cargo === 0 && st.cargoBanked === 1, 'making port banks the cargo', 'banked=' + st.cargoBanked);

// 2b. The yard: damaged hull + banked crate → repair bought at DOCK_PRICES
st.hull = 40; st.air = 350;
sb.surface();
check(st.hull === 65 && st.cargoBanked === 0, 'yard spends a crate for +25 hull', 'hull=' + st.hull + ' banked=' + st.cargoBanked);

// 3. Round trip
st.cargo = 3; // three more crates aboard
st.cargoBanked = 1; // restock the ledger after the yard test
sb.doSave();
const raw = JSON.parse(store.getItem('fathom-save-v1'));
check(raw.cargo === 3 && raw.cargoBanked === 1, 'save carries cargo + bank', JSON.stringify({c: raw.cargo, b: raw.cargoBanked}));
const sb2 = freshContext(store);
sb2.startGame();
const st2 = sb2.__state();
check(st2.cargo === 3 && st2.cargoBanked === 1, 'cargo + bank survive reload', 'cargo=' + st2.cargo + ' banked=' + st2.cargoBanked);

console.log(failures === 0 ? '\nALL CARGO CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
