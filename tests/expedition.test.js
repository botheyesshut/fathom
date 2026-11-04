const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

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
function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      // DOM tree probes must be falsy or loops like `while (svg.firstChild)` spin forever
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
    console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: (fn) => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => Date.now() },
    document: documentStub, navigator: { userAgent: 'node' }, localStorage: storage,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const injected = script + '\nfunction __cells(){ return cells; }\nfunction __seed(){ return worldSeed; }\nfunction __state(){ return state; }\nfunction __rev(){ return revealed; }\nfunction __vis(){ return visited; }\nfunction __chunks(){ return [...generatedChunks]; }';
  try { vm.runInContext(injected, sandbox, { timeout: 15000 }); } catch (e) { /* DOM init throw expected */ }
  return sandbox;
}



let failures = 0;
const check = (ok, label, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : ''));
  if (!ok) failures++;
};

// D4: a signal is the only dive team left. startExpedition takes a tile and
// nothing else, the expedition carries no `type`, and the dice bands of
// expeditionTick are the ones the old relicChance arithmetic gave.
const g = freshContext(memStorage()); g.restart();
const st = g.__state();
const tile = { q: st.q, r: st.r };
st.foot = null; st.expedition = null;
g.startExpedition(tile, 'beach');
check(!!st.expedition && st.expedition.key === g.hexKey(tile.q, tile.r), 'a dive team goes over the side at the tile');
check(!('type' in st.expedition), 'the expedition carries no type (nothing reads one)', Object.keys(st.expedition).join(','));
check(g.startExpedition.length === 1, 'startExpedition takes one argument, the tile', 'length ' + g.startExpedition.length);

// bands with no diver on the crew: relic <.20, crate <.55, snag <.70, pocket <.80, hazard <.92, else nothing
st.crew = [];
function roll(x) {
  g.rand = () => x;
  st.expedition = { key: g.hexKey(st.q, st.r), type: 'x', turns: 5, crates: 0, relics: 0 };
  st.hull = 100; st.air = 10; let hazard = false;
  const rh = g.resolveHazard; g.resolveHazard = () => { hazard = true; };
  g.expeditionTick();
  g.resolveHazard = rh;
  const e = st.expedition;
  return { relic: e.relics, crate: e.crates, hull: st.hull, air: st.air, hazard };
}
const A = [
  [0.19, 'relic', r => r.relic === 1], [0.21, 'crate', r => r.crate === 1], [0.54, 'crate', r => r.crate === 1],
  [0.56, 'snag', r => r.hull < 100], [0.69, 'snag', r => r.hull < 100],
  [0.71, 'pocket', r => r.air === 18], [0.79, 'pocket', r => r.air === 18],
  [0.81, 'hazard', r => r.hazard], [0.91, 'hazard', r => r.hazard],
  [0.93, 'nothing', r => !r.relic && !r.crate && r.hull === 100 && r.air === 10 && !r.hazard],
];
for (const [x, name, f] of A) { const r = roll(x); check(f(r), `roll ${x} is ${name}`, JSON.stringify(r)); }

console.log(failures ? `\n${failures} FAILED` : '\nexpedition.test: all held');
process.exit(failures ? 1 : 0);
