// THE HUNT — an instrument for the cat-and-mouse loop.
//
// The brief for submarine combat was explicit: stealthy and hair-raising, cat
// and mouse, Red October, not a slugfest. An audit measured what the code
// actually produced and it was none of those things:
//
//   267 creatures came within 6 hexes across 40 games. 253 never touched the
//   hull. The lurker — the whole sound-hunting system — came into earshot 26
//   times and did something once.
//
//   Launching a decoy at a hunter cost +53% MORE hull with the sonar on and
//   +116% with it off, and in 200 trials the hunter never once ended nearer
//   the buoy than the boat. The one hard counter to being hunted made being
//   hunted worse.
//
//   A silent boat above a HARD thermocline was found in 200 of 200 trials,
//   mean final range 0.00 hexes. The layer took the player's ears and gave
//   nothing back.
//
// This file re-measures those three, in real world cells, so the fixes can be
// checked against the numbers rather than against my confidence.
//
//   node tests/hunt.js [arenas] [trials]
//
// NOT wired into run-all.js. The battery answers "is it broken"; this answers
// "is it tense", and that has no pass line — it has a target. Read the numbers.
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync((process.env.FATHOM_HTML || __dirname + '/../fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const ARENAS = parseInt(process.argv[2] || '12', 10);
const TRIALS = parseInt(process.argv[3] || '40', 10);

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
  const stub = new Proxy(fn, { get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'length') return 0;
    if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
    if (p === 'classList') return { add(){}, remove(){}, contains(){ return false; }, toggle(){ return false; } };
    if (p === 'style') return {};
    return stub;
  }, apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; } });
  return stub;
}

function boot(seed, power) {
  const stub = makeStub();
  const pingEl = { value: String(power == null ? 2 : power), max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'getElementById') return (id) => id === 'ping-power' ? pingEl : makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const mem = {};
  const sandbox = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    // THE WALL CLOCK IS A TRAP HERE. CONTACT_LOG_MS throttles the passive
    // contact log by real milliseconds, and a headless run of 250 turns takes
    // about two seconds — so at most one contact is ever logged and every
    // bestiary number comes out wrong. The clock advances with the turns.
    performance: { now: () => sandbox.__clock },
    document: documentStub, navigator: { userAgent: 'node' },
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
  sandbox.__clock = 0;
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const probe =
    '\nvar __lines = [];' +
    '\n(function(){ var _l = log; log = function(t, cls, tag){ __lines.push({t:String(t), tag:tag||"", cls:cls||""}); return _l.apply(null, arguments); }; })();' +
    '\nfunction __lines_(){ return __lines; }  function __clear(){ __lines.length = 0; }' +
    '\nfunction __state(){ return state; }' +
    '\nfunction __seed(s){ worldSeed=s; interiorSalt=":"+s;interiorCache.clear();rng=mulberry32(s); resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; state.enclaves=[]; }' +
    '\nfunction __tile(q,r){ return tileAt(q,r); }' +
    '\nfunction __accepts(t,d){ return hexAcceptsDepth(t,d); }' +
    '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
    '\nfunction __open(q,r,d){ return !!cells.get(cellKey(q,r,d)); }' +
    '\nfunction __run(q,r,d){ return cellRun(q,r,d); }' +
    '\nfunction __grid(){ return DEPTH_GRID; }' +
    '\nfunction __thresh(){ return { stalk: LURK_STALK, hunt: LURK_HUNT, wary: LURK_WARY }; }' +
    '\nfunction __tick(){ creatureTick(); }' +
    '\nfunction __layerDamp(a,b,q,r){ return layerDamp(a,b,q,r); }' +
    '\nfunction __layerAt(q,r){ return layerAt(q,r); }' +
    '\nfunction __dist(a,b){ return hexDistance(a,b); }' +
    '\nfunction __start(){ gameStarted = true; }';
  try { vm.runInContext(script + probe, sandbox, { timeout: 20000 }); }
  catch (e) { if (typeof sandbox.state === 'undefined') throw e; }
  sandbox.restart();
  sandbox.__start();
  sandbox.__seed(seed);
  sandbox.__tile(0, 0);
  sandbox.__clear();
  return sandbox;
}

// Find a real cell with room to manoeuvre, and put the boat in it.
function arena(s, seed) {
  const st = s.__state();
  for (let i = 0; i < 300; i++) {
    const q = 2 + (i * 7) % 40, r = -20 + (i * 13) % 40;
    const t = s.__tile(q, r);
    if (!t || t.wall || t.land) continue;
    const run = s.__run(q, r, 600);
    if (!run || run.floor - run.ceiling < 240) continue;
    st.q = q; st.r = r; st.currentDepth = Math.round((run.ceiling + 120) / 60) * 60;
    if (!s.__open(q, r, st.currentDepth)) continue;
    return true;
  }
  return false;
}

function makeLurker(s, dist, interest) {
  const st = s.__state();
  // Put it `dist` hexes off along a real open path.
  let q = st.q, r = st.r;
  for (let i = 0; i < dist; i++) {
    const ns = s.__nbrs(q, r).filter(n => { const t = s.__tile(n.q, n.r); return t && !t.wall && !t.land && s.__open(n.q, n.r, st.currentDepth); });
    if (!ns.length) return null;
    q = ns[0].q; r = ns[0].r;
  }
  const c = { type: 'lurker', q, r, depth: st.currentDepth, interest, gone: false,
              tenacity: 0.5, aggression: 0.5, tq: q, tr: r, hp: 10 };
  st.creatures = [c];
  return c;
}

function step(s, silent) {
  const st = s.__state();
  s.__clock += 3000;   // a human takes seconds per action; the contact throttle is real ms
  // Run: move to an open neighbour away from the creature.
  const c = st.creatures[0];
  const away = s.__nbrs(st.q, st.r)
    .filter(n => { const t = s.__tile(n.q, n.r); return t && !t.wall && !t.land && s.__open(n.q, n.r, st.currentDepth); })
    .sort((a, b) => s.__dist({q:b.q,r:b.r}, c) - s.__dist({q:a.q,r:a.r}, c))[0];
  if (away) { st.q = away.q; st.r = away.r; }
  s.__tick();
}

// ---------------------------------------------------------------- THE DECOY
function decoyTrial(seed, useDecoy, silent) {
  const s = sandboxFor(seed, silent ? 0 : 2);
  if (!arena(s, seed)) return null;
  const st = s.__state();
  const c = makeLurker(s, 3, 70);
  if (!c) return null;
  st.hull = 100; st.air = 9999; st.decoys = 3; st.buoys = [];
  s.__clear();
  if (useDecoy) { try { s.launchDecoy(); } catch (e) { return null; } }
  let escaped = 0, turns = 0, nearerBuoy = 0;
  for (let t = 0; t < 30; t++) {
    step(s, silent);
    turns = t + 1;
    const cc = st.creatures[0];
    if (!cc || cc.gone) { escaped = 1; break; }
    for (const b of (st.buoys || [])) {
      if (s.__dist({q:cc.q,r:cc.r}, b) < s.__dist({q:cc.q,r:cc.r}, {q:st.q,r:st.r})) { nearerBuoy = 1; break; }
    }
    if ((cc.interest || 0) < 20 && s.__dist({q:cc.q,r:cc.r}, {q:st.q,r:st.r}) > 6) { escaped = 1; break; }
    if (st.hull <= 0) break;
  }
  return { escaped, hullLost: 100 - st.hull, turns, nearerBuoy };
}

// ------------------------------------------------------------- THE ENGAGEMENT
function engagementTrial(seed, power) {
  const s = sandboxFor(seed, power);
  if (!arena(s, seed)) return null;
  const st = s.__state();
  const c = makeLurker(s, 4, 0);
  if (!c) return null;
  st.hull = 100; st.air = 9999; st.buoys = [];
  const th = s.__thresh();
  let peak = 0;
  for (let t = 0; t < 12; t++) { step(s, power === 0); const cc = st.creatures[0]; if (!cc) break; peak = Math.max(peak, cc.interest || 0); }
  return { stalked: peak >= th.stalk ? 1 : 0, hunted: peak >= th.hunt ? 1 : 0, peak };
}

// ------------------------------------------------------------------ THE LAYER
function layerTrial(seed) {
  const s = sandboxFor(seed, 0);   // SILENT — the layer is only a tactic if silence is
  if (!arena(s, seed)) return null;
  const st = s.__state();
  const L = s.__layerAt(st.q, st.r);
  if (!L || !L.strong) return null;
  // Put the boat above the hard layer and the hunter below it.
  const above = Math.max(0, Math.round((L.depth - 120) / 60) * 60);
  const below = Math.round((L.depth + 120) / 60) * 60;
  if (!s.__open(st.q, st.r, above)) return null;
  st.currentDepth = above;
  const c = makeLurker(s, 3, 90);
  if (!c) return null;
  c.depth = below;
  if (s.__layerDamp(st.currentDepth, c.depth, st.q, st.r) > 0.5) return null;  // not actually across it
  st.hull = 100; st.air = 9999; st.buoys = [];
  for (let t = 0; t < 8; t++) { c.interest = Math.max(c.interest, 90); step(s, true); if (!st.creatures[0]) break; }
  const cc = st.creatures[0];
  return { finalRange: cc ? s.__dist({q:cc.q,r:cc.r}, {q:st.q,r:st.r}) : 99,
           foundYou: cc && s.__dist({q:cc.q,r:cc.r}, {q:st.q,r:st.r}) <= 1 ? 1 : 0 };
}

const BOOTS = new Map();
function sandboxFor(seed, power) {
  const key = seed + '@' + power;
  if (!BOOTS.has(key)) BOOTS.set(key, boot(seed, power));
  const s = BOOTS.get(key);
  // Reset only what a trial dirties. The world itself is a pure function of
  // the seed, so it does not need rebuilding — which is the whole reason this
  // is affordable.
  const st = s.__state();
  st.creatures = []; st.buoys = []; st.hull = 100; st.air = 9999; st.decoys = 3;
  st.alive = true; st._huntAdvised = false; st._lastContactLog = 0;
  s.__clear();
  return s;
}
function run(fn) {
  const out = [];
  for (let a = 0; a < ARENAS; a++) for (let t = 0; t < TRIALS; t++) {
    const r = fn(4000 + a * 97, t);
    if (r) out.push(r);
  }
  return out;
}
const mean = (a, k) => a.length ? +(a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(2) : 0;
const pct = (a, k) => a.length ? (100 * a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(0) + '%' : '—';

console.log('\n=== THE HUNT ===\n');

console.log('--- THE DECOY (it used to make things worse) ---');
for (const [label, useDecoy, silent] of [
  ['run, sonar on          ', false, false],
  ['run + decoy, sonar on  ', true,  false],
  ['run silent             ', false, true],
  ['run silent + decoy     ', true,  true],
]) {
  const rs = run(seed => decoyTrial(seed, useDecoy, silent));
  console.log(`  ${label}  escaped ${pct(rs, 'escaped').padStart(4)}   hull lost ${String(mean(rs, 'hullLost')).padStart(5)}   drew it off ${pct(rs, 'nearerBuoy').padStart(4)}   (n=${rs.length})`);
}
console.log('  BEFORE: decoy cost +53% hull with sonar on, +116% silent, and drew it off 0% of 200 trials.');

console.log('\n--- THE ENGAGEMENT (4% of lurkers within 6 hexes ever stalked) ---');
for (const p of [0, 2, 5]) {
  const rs = run(seed => engagementTrial(seed, p));
  console.log(`  sonar p=${p}   reached STALK ${pct(rs, 'stalked').padStart(4)}   reached HUNT ${pct(rs, 'hunted').padStart(4)}   mean peak interest ${mean(rs, 'peak')}   (n=${rs.length})`);
}
console.log('  BEFORE: 0% / 1% / 4% stalked at p=0 / p=2 / p=5. Target is roughly 1 in 3 close passes, not 1 in 25.');

console.log('\n--- THE THERMOCLINE (a silent boat above a hard layer was found 200/200) ---');
const ls = run(seed => layerTrial(seed));
console.log(`  found you (range <= 1)  ${pct(ls, 'foundYou')}   mean final range ${mean(ls, 'finalRange')} hexes   (n=${ls.length})`);
console.log('  BEFORE: 100% found, mean final range 0.00.\n');
