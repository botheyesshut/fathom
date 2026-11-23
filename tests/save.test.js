// Persistence round-trip: play in one context, save, boot a second context on
// the same localStorage → identical seed, state, charts, and (by determinism)
// the identical world regenerated beneath the boat. Then death/New World must
// clear the save.
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

// ---- D6: A15 sound, A11 coming back, A10 pressure in numbers ----
{
  const rd = (c, e) => vm.runInContext(e, c);
  const cA = freshContext(memStorage());
  check(rd(cA, 'audioMuted') === true, 'A15: no stored preference on a hosted origin starts muted', 'audioMuted ' + rd(cA, 'audioMuted'));
  const stOn = memStorage(); stOn.setItem('fathom-audio', '1');
  check(rd(freshContext(stOn), 'audioMuted') === false, 'A15: a stored "on" still wins', '');
  const stOff = memStorage(); stOff.setItem('fathom-audio', '0');
  check(rd(freshContext(stOff), 'audioMuted') === true, 'A15: a stored "off" still wins', '');
  cA.restart();
  check((cA.__state().tipsSeen || []).indexOf('sound') >= 0, 'A15: the cast-off tells a first launch how to hear the sea', JSON.stringify(cA.__state().tipsSeen));
  const cB = freshContext(stOn); cB.restart();
  check((cB.__state().tipsSeen || []).indexOf('sound') < 0, 'A15: and says nothing to a player who has chosen', '');

  // A11: two hands, a lead, a mission -> named on resume; the button follows the save.
  const stC = memStorage();
  const c3 = freshContext(stC);
  c3.restart();
  const s3 = c3.__state();
  s3.crew = [{ name: 'Osei', role: 'helmsman' }, { name: 'Marit', role: 'ear' }];
  s3.leads = [{ q: 3, r: 3 }];
  c3.doSave();
  const c4 = freshContext(stC);
  c4.startGame();
  const line = rd(c4, 'resumeAboardSaid()');
  check(/Aboard: Osei, [^;]+; Marit, [^.]+\./.test(line) && /1 lead on the chart/.test(line), 'A11: resume names who is aboard and what is open', line);
  const c5 = freshContext(memStorage()); c5.restart();
  check(rd(c5, 'resumeAboardSaid()').indexOf('No hands aboard but you.') === 0 || /^Aboard:/.test(rd(c5, 'resumeAboardSaid()')), 'A11: a fresh boat says her hands, or none', rd(c5, 'resumeAboardSaid()'));
  // The label: the title button's text. The stub document swallows writes, so
  // read the source for the rule instead of a DOM that is not there.
  check(/localStorage\.getItem\(SAVE_KEY\)\) diveBtn\.textContent = 'Continue'/.test(script), 'A11: the title button reads Continue when a save is stored', '');

  // A10: 20 m over gives a line with the number; the heavy band says Take her up.
  const c6 = freshContext(memStorage()); c6.restart();
  const s6 = c6.__state();
  const lines = [];
  c6.log = (t) => { lines.push(String(t)); };
  const safe = rd(c6, 'safeDepthNow()');
  s6.currentDepth = safe + 20; s6.hull = 100; s6.air = 400;
  c6.applyMoveCosts(1, 0);
  check(lines.some(l => /\d+ off her on that move/.test(l)), 'A10: 20 m over past her rating speaks, with the number', lines.join(' | ') || 'silence');
  lines.length = 0;
  s6.currentDepth = safe + 400; s6.hull = 100;
  c6.applyMoveCosts(1, 0);
  check(lines.some(l => /\d{2,} off her on that move\. Take her up\./.test(l)), 'A10: the heavy band names the number and says to go up', lines.join(' | ') || 'silence');
}

console.log(failures === 0 ? '\nALL PERSISTENCE CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
