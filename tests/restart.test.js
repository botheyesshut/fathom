// WHAT restart() CLEARS (D3). A new world must not inherit the old campaign.
// Method: boot A and call restart() = the reference. Boot B, restart(), then
// DIRTY every top-level state field with a sentinel of its own type, restart()
// again. Any field that differs from the reference leaked through restart(),
// unless it is in KEEPS with a reason. A field that is new and leaks fails here
// without anyone having to remember to write a check for it.
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

// Fields that deliberately survive a new world, each with the reason.
const KEEPS = {
  tipsSeen: 'cross-world on purpose (a captain is told a tip once, ever)',
  bestiary: 'what the captain has learned about the sea survives a new ocean',
  pingTimer: 'an animation timestamp; nothing reads it across worlds',
  lastMoveTime: 'an animation timestamp (performance.now); nothing reads it across worlds',
  lastFailTime: 'an animation timestamp (performance.now); nothing reads it across worlds',
  lore: 'OPEN QUESTION (DAILY.md 2026-11-03): does what a captain learned of a species follow them to a new ocean, as the bestiary does? Held as-is until Sean answers',
  creatures: 'rebuilt from the new seed by chunk generation, not by restart()',
  threats: 'rebuilt from the new seed by chunk generation, not by restart()',
};

function dirty(v) {
  if (typeof v === 'number') return v + 7;
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'string') return 'zz-dirty';
  if (Array.isArray(v)) return ['zz-dirty'];
  if (v instanceof Map) return new Map([['zz', 1]]);
  if (v instanceof Set) return new Set(['zz-dirty']);
  if (v && typeof v === 'object') return { zz: 1 };
  return 'zz-dirty';   // null / undefined: any value at all is a leak if it persists
}
const shape = v => {
  try {
    if (v instanceof Map) return 'Map' + JSON.stringify([...v]);
    if (v instanceof Set) return 'Set' + JSON.stringify([...v]);
    return JSON.stringify(v) + '';
  } catch (e) { return 'unserialisable'; }
};

function leaks(mutate) {
  const a = freshContext(memStorage()); a.restart();
  const ref = {}; const sa = a.__state();
  for (const k of Object.keys(sa)) ref[k] = shape(sa[k]);

  const b = freshContext(memStorage()); b.restart();
  const sb = b.__state();
  const keys = Object.keys(sb);
  mutate(sb, keys);
  b.restart();
  const out = [];
  for (const k of Object.keys(sb)) {
    if (KEEPS[k] || SPECIAL.has(k)) continue;
    // the world seed (and what hangs off it) comes from the clock: not comparable
    if (!(k in ref)) { out.push(k + ' (appeared)'); continue; }
    if (shape(sb[k]) !== ref[k]) out.push(k);
  }
  return out;
}

const fields = Object.keys(freshContext(memStorage()).__state()).length;
console.log('restart() — ' + fields + ' top-level state fields\n');

// `entities` is the backing store of q, r, currentDepth, cameraX, cameraY (they
// are accessors over it), so dirtying it dirties those through it, and `crew`
// is rolled from the clock (names differ by design): the position is checked
// below by value, the crew by size and trades, and `enclaves` alone.
const SPECIAL = new Set(['entities', 'q', 'r', 'currentDepth', 'cameraX', 'cameraY', 'crew', 'enclaves']);
const dirtyAll = (s, keys) => { for (const k of keys) { if (SPECIAL.has(k)) continue; try { s[k] = dirty(s[k]); } catch (e) {} } };
const found = leaks(dirtyAll);
// Fields that are deliberately recomputed from the clock or the new seed are
// listed by the run itself; print them so a new one is a conscious edit.
console.log('  fields that differ after dirty+restart: ' + (found.join(', ') || '(none)'));
check(found.length === 0, 'every state field is back to a fresh-world value after restart()',
  found.length ? 'LEAKED: ' + found.join(', ') : fields + ' fields compared, ' + Object.keys(KEEPS).length + ' deliberately kept');

// The specials, each by value.
{
  const c = freshContext(memStorage()); c.restart();
  const s = c.__state();
  s.q = 9; s.r = -3; s.currentDepth = 700; s.cameraX = 40; s.cameraY = 40;
  s.enclaves = [{ id: 'enclave:zz' }]; s.crew = [{ name: 'Ghost', role: 'wrench' }];
  c.restart();
  check(s.q === 0 && s.r === 0 && s.currentDepth === 0, 'a new world starts at the pier, on the surface', s.q + ',' + s.r + ' @ ' + s.currentDepth);
  check(!s.enclaves.some(e => e.id === 'enclave:zz'), 'no enclave from the old sea is on the new chart', JSON.stringify(s.enclaves).slice(0,120));
  check(s.crew.length === 2 && !s.crew.some(m => m.name === 'Ghost'), 'the crew is the starting crew, not last campaign\'s',
    s.crew.map(m => m.role).join('+'));
}

// The one that bit: the Standing Orders must be sayable again in a new world.
{
  const c = freshContext(memStorage()); c.restart();
  const s = c.__state();
  s.ordersSaid = ['x', 'y']; s.ordersAt = 5;
  c.restart();
  check(Array.isArray(c.__state().ordersSaid) && c.__state().ordersSaid.length === 0 && c.__state().ordersAt == null,
    'a new world gets the Standing Orders back (ordersSaid, ordersAt)', JSON.stringify(c.__state().ordersSaid));
}

console.log('\n' + (failures ? failures + ' FAILED' : 'RESTART CLEARS WHAT IT SHOULD — ' + fields + ' fields'));
process.exit(failures ? 1 : 0);
