// Persistence round-trip: play in one context, save, boot a second context on
// the same localStorage → identical seed, state, charts, and (by determinism)
// the identical world regenerated beneath the boat. Then death/New World must
// clear the save.
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
    console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
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

const store = memStorage();

// ---- Context 1: start a run, sail somewhere, save ----
const c1 = freshContext(store);
c1.restart();
const seed1 = c1.__seed();
const s1 = c1.__state();
// sail: move the boat, spend resources, chart some water
s1.q = 7; s1.r = -4; s1.currentDepth = 120; s1.air = 291; s1.hull = 88;
s1.moves = 41; s1.maxDepth = 480; s1.poisFound = ['ruin'];
c1.tileAt(7, -4);
c1.revealAt(7, -4, 120); c1.revealAt(8, -4, 120); c1.revealAt(7, -3, 120);
c1.__vis().add('7,-4');
c1.doSave();
check(store._m.has('fathom-save-v1'), 'save written to localStorage', (store.getItem('fathom-save-v1') || '').length + ' bytes');

// ---- Context 2: fresh boot on the same storage → must resume ----
const c2 = freshContext(store);
c2.startGame();
check(c2.__seed() === seed1, 'seed survives the round trip', seed1 + ' → ' + c2.__seed());
const s2 = c2.__state();
check(s2.q === 7 && s2.r === -4 && s2.currentDepth === 120, 'position + depth restored', `(${s2.q},${s2.r}) @ ${s2.currentDepth} m`);
check(s2.air === 291 && s2.hull === 88 && s2.moves === 41 && s2.maxDepth === 480, 'resources + records restored', `air ${s2.air}, hull ${s2.hull}, moves ${s2.moves}, maxDepth ${s2.maxDepth}`);
check(s2.poisFound.length === 1 && s2.poisFound[0] === 'ruin', 'discoveries restored', JSON.stringify(s2.poisFound));
check(c2.__vis().has('7,-4') && c2.__vis().has('0,0'), 'visited hexes restored', c2.__vis().size + ' visited');
const rev2 = c2.__rev();
check(rev2.has('7,-4') && rev2.get('7,-4').has(120), 'revealed depth-charts restored', rev2.size + ' hexes charted');

// ---- Same substrate: cells must match exactly wherever generation is
// COMPLETE in both contexts. A cell's kind is only final once its chunk's
// full 3x3 neighborhood is generated (a later neighbor can carve an
// overlapping feature into it) — the game guarantees exactly that for
// anything visible, so mutually-interior chunks are the honest comparison.
{
  const CH = 14;
  const setA = new Set(c1.__chunks()), setB = new Set(c2.__chunks());
  const interior = new Set();
  for (const ck of setB) {
    if (!setA.has(ck)) continue;
    const [cq, cr] = ck.split('|').map(Number);
    let ok = true;
    for (let dq = -1; dq <= 1 && ok; dq++) for (let dr = -1; dr <= 1; dr++) {
      const nk = (cq + dq) + '|' + (cr + dr);
      if (!setA.has(nk) || !setB.has(nk)) { ok = false; break; }
    }
    if (ok) interior.add(ck);
  }
  const inInterior = (q, r) => interior.has(Math.floor(q / CH) + '|' + Math.floor(r / CH));
  const a = c1.__cells(), b = c2.__cells();
  let mm = 0, compared = 0;
  for (const [k, cell] of b) {
    const [q, r] = k.split(',').map(Number);
    if (!inInterior(q, r)) continue;
    compared++;
    const other = a.get(k);
    if (!other || other.kind !== cell.kind) mm++;
  }
  for (const [k, cell] of a) {
    const [q, r] = k.split(',').map(Number);
    if (!inInterior(q, r)) continue;
    if (!b.has(k)) mm++;
  }
  check(mm === 0 && compared > 1000, 'regenerated world identical beneath the boat',
    compared + ' cells in ' + interior.size + ' mutually-interior chunks, ' + mm + ' mismatches');
}

// ---- Death keeps the campaign: same sea, everything aboard lost ----
c2.endGame('The deep has you.', 'test');
const postDeath = JSON.parse(store.getItem('fathom-save-v1'));
check(!!postDeath && postDeath.seed === seed1 && postDeath.subKey === 'erebus' && postDeath.q === 0,
  'death keeps the campaign (same sea, stock Erebus at the dock)', 'seed kept, boat reset');

// ---- New World (restart) also clears any save ----
c1.doSave();
check(store._m.has('fathom-save-v1'), 'save re-written for restart test');
c1.restart();
check(!store._m.has('fathom-save-v1'), 'restart/New World clears the save');
check(c1.__seed() !== seed1, 'restart rolls a fresh seed', seed1 + ' → ' + c1.__seed());

console.log(failures === 0 ? '\nALL PERSISTENCE CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
