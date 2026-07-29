// AN OLDER SAVE IS STILL SOMEBODY'S CAMPAIGN.
//
// Two key-schema changes shipped without moving SAVE_V:
//
//   1. Deck records were keyed on bare coordinates until `deckSuffix` landed.
//      The interior CACHE already carried ':h' for a hull before that, so a
//      hull's stripped loot and driven-off tenant went under a key nothing
//      reads any more. Measured on real bytes: 0 of 2 recorded takes survived,
//      and the tenant came back. Ruins were unaffected — the control that
//      proves it is the suffix and not the generator.
//
//   2. A station learned what KIND of place it is. A grotto station claimed
//      before that field existed has no kind, and back-filling it to 'ruin'
//      locked it away forever: the stores unreachable, no replacement claimable
//      because you "already hold a station", and sailing home built a phantom
//      ruin on top of it.
//
// This suite constructs saves in both old shapes and asserts the campaign
// survives. Every check is proved against the failure it guards.
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
function freshContext(store) {
  const stub = makeStub();
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const sandbox = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' }, localStorage: store,
    addEventListener: () => {}, removeEventListener: () => {},
    location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    alert: () => {}, AudioContext: undefined, webkitAudioContext: undefined };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script +
    '\nfunction __st(){ return state; }' +
    // THE PROBE WAS THE BUG, FIRST TIME ROUND. `state.seed` is not `worldSeed`
    // — worldSeed is a module-level `Date.now()` — so setting state.seed built
    // a DIFFERENT ocean in every fresh context, and the wreck found in one was
    // not in the next. Two sections disagreed about what the world contained
    // before I noticed.
    '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }' +
    '\nfunction __foot(){ return state.foot; }' +
    '\nfunction __base(){ return state.base; }' +
    '\nfunction __ensure(q,r){ return tileAt(q,r); }' +
    '\nfunction __cells(){ return cells; }' +
    '\nfunction __beach(){ maybeBeach(); }' +
    '\nfunction __handle(t){ handleTile(t); }' +
    '\nfunction __int(q,r,d,k){ return interiorAt(q,r,d,k); }' +
    '\nfunction __isBase(q,r,d,k){ return isBaseDeck(q,r,d,k); }' +
    '\nfunction __ownDeck(){ return onOwnDeck(); }' +
    '\nfunction __suffix(k){ return deckSuffix(k); }' +
    '\nfunction __poiAt(q,r,d){ const t=tileAt(q,r); const a=t?poiAtDepth(t,d):null; return a?a.type:(t?t.poi:null); }',
    sandbox, { timeout: 20000 });
  return sandbox;
}
const KEY = 'fathom-save-v1';
function makeStore(bytes) {
  const mem = bytes ? { [KEY]: bytes } : {};
  return { getItem: k => (k in mem ? mem[k] : null),
           setItem: (k, v) => { mem[k] = String(v); },
           removeItem: k => { delete mem[k]; }, _mem: mem };
}

let bad = 0;
const must = (ok, l, d) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + l + (d ? '  — ' + d : '')); if (!ok) bad++; };
const say = (l, v) => console.log('  ' + l.padEnd(48) + v);

//--- 1. A GROTTO STATION CLAIMED BEFORE THE FIELD EXISTED --------------------
console.log('\n--- 1. AN OLD STATION STILL OPENS ---');
{
  // Build a real one first, then strip the field the way the old build wrote it.
  const store = makeStore(null);
  const sb = freshContext(store);
  const st = sb.__st();
  sb.__seed(20260728); st.seed = 20260728;
  for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
    if (Math.abs(q + r) > 12) continue;
    sb.__ensure(q, r);
  }
  let site = null;
  for (const [k, c] of sb.__cells()) if (c && c.kind === 'beach') { site = k.split(',').map(Number); break; }
  must(!!site, 'the probe found a grotto to make a station of', site ? site.join(',') : 'NO BEACH IN RANGE');
  if (site) {
    const [q, r, d] = site;
    const realTiles = sb.__int(q, r, d, 'beach').tiles.size;
    // The old shape: coordinates, no kind.
    st.base = { q, r, d, stores: { crates: 14, relics: 5, items: {} },
                defence: 0, threat: 0, siege: null, breached: false, boarder: null, carved: [] };
    st.foot = null;
    say('the station, as an old save recorded it', JSON.stringify({ q, r, d, kind: st.base.kind }));

    // (a) It must still be recognised as yours from inside the cave.
    must(sb.__isBase(q, r, d, 'cave') === true,
      'a kindless station still answers to the deck it is actually on',
      'isBaseDeck(...,"cave") = ' + sb.__isBase(q, r, d, 'cave'));

    // (b) Sailing home must open the cave, not build a phantom ruin over it.
    st.q = q; st.r = r; st.currentDepth = d; st.air = 900; st.alive = true;
    const tile = sb.__ensure(q, r);
    sb.__handle(tile);
    const f = sb.__foot();
    say('sailed home, and arrived in', f ? f.kind + ' / ' + sb.__int(q, r, d, f.kind).tiles.size + ' tiles' : 'NOWHERE');
    must(!!f && f.kind === 'beach' && sb.__int(q, r, d, f.kind).tiles.size === realTiles,
      'sailing home opens the grotto, not a phantom ruin',
      f ? f.kind + '/' + sb.__int(q, r, d, f.kind).tiles.size + ' vs beach/' + realTiles : 'no body');

    // (c) And the save heals: the kind is settled and written back.
    must(sb.__base() && sb.__base().kind === 'beach',
      'and the save heals itself so it only ever guesses once',
      'base.kind = ' + (sb.__base() && sb.__base().kind));
  }
}

//--- 2. A HULL STRIPPED BEFORE deckSuffix EXISTED ---------------------------
console.log('\n--- 2. A WRECK YOU ALREADY STRIPPED STAYS STRIPPED ---');
{
  const probe = freshContext(makeStore(null));
  const pst = probe.__st();
  probe.__seed(20260728); pst.seed = 20260728;
  // Find a real hull in this world.
  let hull = null;
  for (let q = -14; q <= 14 && !hull; q++) for (let r = -14; r <= 14; r++) {
    if (Math.abs(q + r) > 14) continue;
    const t = probe.__ensure(q, r);
    if (!t) continue;
    for (let d = 60; d <= 2400; d += 60) {
      if (probe.__poiAt(q, r, d) === 'hull') { hull = [q, r, d]; break; }
    }
    if (hull) break;
  }
  must(!!hull, 'the probe found a real wreck in the world', hull ? hull.join(',') : 'NONE FOUND');
  if (hull) {
    const [q, r, d] = hull;
    const ch = probe.__int(q, r, d, 'hull');
    const loot = [...ch.tiles.entries()].filter(e => e[1].loot).map(e => e[0]);
    say('loot squares on that wreck', loot.length);
    must(loot.length > 0, 'and it has loot on it to strip', loot.length + ' squares');

    // The OLD shape: a hull's record filed under a bare key, because
    // deckSuffix did not exist when it was written.
    const bytes = JSON.stringify({
      v: 2, seed: 20260728, q: 0, r: 0, currentDepth: 0, hull: 130, air: 400,
      alive: true, crew: [], visited: [], revealed: [], poisFound: [],
      deckTook: { [q + ',' + r + ',' + d]: loot },
      clearedDecks: [q + ',' + r + ',' + d],
    });
    const sb2 = freshContext(makeStore(bytes));
    sb2.startGame();
    const st2 = sb2.__st();
    const suffixed = q + ',' + r + ',' + d + ':h';
    say('after loading, the record lives under', Object.keys(st2.deckTook).join(', '));
    const kept = (st2.deckTook[suffixed] || []).length;
    must(kept === loot.length,
      'the wreck\'s stripped squares are re-filed under its own key',
      kept + '/' + loot.length + ' survived');
    must((st2.clearedDecks || []).indexOf(suffixed) >= 0,
      'and the tenant you drove off stays driven off',
      st2.clearedDecks.join(', ') || 'EMPTY');
  }
}

//--- 3. A RUIN'S RECORD IS LEFT ALONE ---------------------------------------
// The control. If the migration moved everything it would be trading one silent
// loss for another — a ruin's key was always bare and still is.
console.log('\n--- 3. AND A RUIN IS NOT TOUCHED ---');
{
  const probe = freshContext(makeStore(null));
  probe.__seed(20260728); probe.__st().seed = 20260728;
  let ruin = null;
  for (let q = -14; q <= 14 && !ruin; q++) for (let r = -14; r <= 14; r++) {
    if (Math.abs(q + r) > 14) continue;
    if (!probe.__ensure(q, r)) continue;
    for (let d = 60; d <= 2400; d += 60) {
      if (probe.__poiAt(q, r, d) === 'ruin') { ruin = [q, r, d]; break; }
    }
    if (ruin) break;
  }
  must(!!ruin, 'the probe found a real ruin for the control', ruin ? ruin.join(',') : 'NONE');
  if (ruin) {
    const key = ruin.join(',');
    const bytes = JSON.stringify({
      v: 2, seed: 20260728, q: 0, r: 0, currentDepth: 0, hull: 130, air: 400,
      alive: true, crew: [], visited: [], revealed: [], poisFound: [],
      deckTook: { [key]: ['5,5', '6,6'] }, clearedDecks: [key],
    });
    const sb3 = freshContext(makeStore(bytes));
    sb3.startGame();
    const st3 = sb3.__st();
    must((st3.deckTook[key] || []).length === 2 && (st3.clearedDecks || []).indexOf(key) >= 0,
      'a ruin\'s record stays exactly where it was',
      'deckTook keys: ' + Object.keys(st3.deckTook).join(', '));
  }
}

//--- 4. A MIGRATION THAT THROWS MUST NOT COST THE CAMPAIGN ------------------
console.log('\n--- 4. GARBAGE IN THE LEDGER DOES NOT DESTROY THE SAVE ---');
{
  const bytes = JSON.stringify({
    v: 2, seed: 20260728, q: 0, r: 0, currentDepth: 0, hull: 130, air: 400,
    alive: true, crew: [], visited: [], revealed: [], poisFound: [], cargo: 7,
    deckTook: { 'not,a,key': ['x'], '': [], 'a,b,c': ['y'], '1,2': ['z'] },
    clearedDecks: ['nonsense', '', '9'],
  });
  let booted = false, cargo = null;
  try {
    const sb4 = freshContext(makeStore(bytes));
    sb4.startGame();
    booted = true; cargo = sb4.__st().cargo;
  } catch (e) { booted = false; }
  must(booted && cargo === 7,
    'a ledger full of nonsense still boots the campaign it belongs to',
    booted ? 'booted, cargo ' + cargo : 'THREW ON BOOT');
}

console.log(bad ? '\n' + bad + ' MIGRATION CHECK(S) FAILED' : '\nALL MIGRATION CHECKS PASSED');
process.exit(bad ? 1 : 0);
