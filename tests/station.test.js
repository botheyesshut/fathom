// A STATION IS A PLACE, AND A PLACE HAS A KIND.
//
// `state.base` recorded {q,r,d} and nothing else. `isBaseDeck` therefore matched
// EVERY kind of deck at those coordinates, and the on-foot layer had by then
// grown four of them. The failure was total and silent: you claimed a grotto,
// sailed one hex out, sailed back, and arrived in a PHANTOM RUIN standing where
// your station used to be — different layout, different entry, and its loot
// marked taken on the way out because the game thought the ruin was yours.
//
// Measured before the fix: 94 of 94 returns, across 6 seeds.
//
// This instrument sails the round trip for real — move(), not a teleport — and
// asserts the station you come back to is the station you left.
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, { get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'length') return 0;
    if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
    return stub;
  }, apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; } });
  return stub;
}
const stub = makeStub();
const documentStub = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
  if (p === 'addEventListener') return () => {};
  return stub;
}});
const mem = {};
const sandbox = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
  addEventListener: () => {}, removeEventListener: () => {},
  location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
  alert: () => {}, AudioContext: undefined, webkitAudioContext: undefined };
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(script +
  '\nfunction __st(){ return state; }' +
  '\nfunction __foot(){ return state.foot; }' +
  '\nfunction __base(){ return state.base; }' +
  '\nfunction __start(){ gameStarted = true; }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }' +
  '\nfunction __ensure(q,r){ return tileAt(q,r); }' +
  '\nfunction __cells(){ return cells; }' +
  '\nfunction __beach(){ maybeBeach(); }' +
  '\nfunction __leave(){ leaveInterior(); }' +
  '\nfunction __claim(){ claimOrStore(); }' +
  '\nfunction __handle(t){ handleTile(t); }' +
  '\nfunction __int(q,r,d,k){ return interiorAt(q,r,d,k); }' +
  '\nfunction __isBase(q,r,d,k){ return isBaseDeck(q,r,d,k); }' +
  '\nfunction __secure(q,r,d,k){ return stationSecure(q,r,d,k); }' +
  '\nfunction __suffix(k){ return deckSuffix(k); }',
  sandbox, { timeout: 20000 });

let bad = 0;
const must = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) bad++; };
const say = (l, v) => console.log('  ' + l.padEnd(50) + v);

sandbox.__start();
const st = sandbox.__st();

//--- 1. THE ROUND TRIP -------------------------------------------------------
console.log('\n--- 1. YOU CLAIM A GROTTO, YOU SAIL AWAY, YOU COME BACK ---');
let trips = 0, sameDeck = 0, wrongKind = [];
for (const seed of [1, 77, 512, 9001, 20260728, 424242]) {
  sandbox.__seed(seed);
  for (let q = -14; q <= 14; q++) for (let r = -14; r <= 14; r++) {
    if (Math.abs(q + r) > 14) continue;
    sandbox.__ensure(q, r);
  }
  const beaches = [];
  for (const [k, c] of sandbox.__cells()) if (c && c.kind === 'beach') beaches.push(k.split(',').map(Number));
  for (const b of beaches.slice(0, 3)) {
    const [q, r, d] = b;
    // Claim it.
    st.base = null; st.foot = null; st.expedition = null; st.alive = true;
    st.q = q; st.r = r; st.currentDepth = d; st.air = 900; st.cargo = 40;
    st.poisFound = st.poisFound.filter(x => typeof x === 'string' && !x.startsWith('beach:'));
    sandbox.__beach();
    const f1 = sandbox.__foot();
    if (!f1 || f1.kind !== 'beach') continue;
    const before = { kind: f1.kind, tiles: sandbox.__int(q, r, d, f1.kind).tiles.size,
                     entry: f1.x + ',' + f1.y };
    f1.dweller = null;
    sandbox.__claim();
    if (!sandbox.__base()) continue;
    sandbox.__leave();

    // Sail away, and sail back — through handleTile, the way an arrival really
    // happens. This is the exact path that used to build the phantom ruin.
    trips++;
    st.foot = null;
    const tile = sandbox.__ensure(q, r);
    sandbox.__handle(tile);
    const f2 = sandbox.__foot();
    const after = f2 ? { kind: f2.kind, tiles: sandbox.__int(q, r, d, f2.kind).tiles.size,
                         entry: f2.x + ',' + f2.y } : null;
    if (after && after.kind === before.kind && after.tiles === before.tiles && after.entry === before.entry) sameDeck++;
    else wrongKind.push(before.kind + '/' + before.tiles + ' -> ' + (after ? after.kind + '/' + after.tiles : 'NOWHERE'));
    if (f2) sandbox.__leave();
  }
}
say('round trips sailed', trips);
must(trips >= 6, 'the probe actually claimed and returned to grottoes', trips + ' round trips over 6 seeds');
must(sameDeck === trips, 'you come back to the station you left',
  sameDeck + '/' + trips + (wrongKind.length ? '  first faults: ' + wrongKind.slice(0, 3).join(' | ') : ''));

//--- 2. A STATION DOES NOT SPREAD ALONG THE CHAIN ---------------------------
console.log('\n--- 2. CLAIMING THE MOUTH CLAIMS THE MOUTH ---');
{
  const b = sandbox.__base();
  if (b) {
    const kinds = ['beach', 'cave', 'cave1', 'caveB', 'deepruin', 'ruin', 'hull'];
    const owned = kinds.filter(k => sandbox.__isBase(b.q, b.r, b.d, k));
    const secure = kinds.filter(k => sandbox.__secure(b.q, b.r, b.d, k));
    say('station claimed as', b.kind);
    say('kinds that now report as yours', owned.join(', ') || 'none');
    must(owned.length === 1 && owned[0] === b.kind,
      'only the deck you actually claimed is your station', owned.join(', '));
    must(secure.length === 1,
      'and only that deck gets the station\'s suppressed clock', secure.join(', '));
    // The hex-level question must still answer yes, or arrival breaks.
    must(sandbox.__isBase(b.q, b.r, b.d) === true,
      'while the hex still knows a station is here', 'arrival routing depends on it');
  } else {
    must(false, 'a station existed to test', 'NO BASE — the probe never claimed one');
  }
}

//--- 3. YOU CANNOT ANCHOR WHERE THE BOAT CANNOT REACH ------------------------
console.log('\n--- 3. ONLY THE MOUTH CAN BE A STATION ---');
{
  let refused = 0, tried = 0;
  for (const k of ['cave1', 'caveB1', 'deepruin']) {
    const b0 = sandbox.__base();
    st.base = null;
    st.foot = { kind: k, q: 3, r: -4, d: 300, x: 5, y: 5, crates: 0, relics: 0,
                steps: 0, tick: 0, seen: [], took: [], water: [], closed: [], dweller: null };
    st.cargo = 40;
    tried++;
    sandbox.__claim();
    if (!sandbox.__base()) refused++;
    st.base = b0; st.foot = null;
  }
  must(tried === 3 && refused === 3,
    'a chamber three links in cannot be a station', refused + '/' + tried + ' refused');
}

console.log(bad ? '\n' + bad + ' STATION CHECK(S) FAILED' : '\nALL STATION CHECKS PASSED');
process.exit(bad ? 1 : 0);
