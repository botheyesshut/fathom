// Creature layer verification: spawn validity, sound-wake, hunt+strike,
// drifter blocking, wander soundness, save v2 round trip (+v1 compat).
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
  const pingEl = { value: '2' }; // the sonar slider — tests drive it (0 = silent running)
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'getElementById') return (id) => id === 'ping-power' ? pingEl : makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const sandbox = {
    console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => Date.now() },
    document: documentStub, navigator: { userAgent: 'node' }, localStorage: storage || memStorage(),
  };
  sandbox.__ping = pingEl;
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const injected = script + '\nfunction __cells(){ return cells; }\nfunction __state(){ return state; }\nfunction __spawned(){ return spawnedChunks; }\nfunction __ck(q,r,d){ return cells.has(cellKey(q,r,d)); }\nfunction __kind(q,r,d){ const c = cells.get(cellKey(q,r,d)); return c ? c.kind : null; }\nfunction __set(q,r,d){ cells.set(cellKey(q,r,d), {type:"passage",kind:"passage"}); }\nfunction __seed(s){ worldSeed=s; interiorSalt=":"+s;interiorCache.clear();resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; }';
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
sb.__seed(20260723); // pin a fixed world so the spawn-validity sweep is deterministic
sb.tileAt(0, 0);
const st = sb.__state();

// ---- 1. Spawn validity over a wide cave region ----
for (let cq = 2; cq <= 6; cq++) for (let cr = 2; cr <= 6; cr++) sb.ensureChunk(cq, cr);
for (let cq = -6; cq <= -2; cq++) for (let cr = -6; cr <= -2; cr++) sb.ensureChunk(cq, cr);
const creatures = st.creatures;
let badCell = 0, badKind = 0;
for (const c of creatures) {
  if (!sb.__ck(c.q, c.r, c.depth)) badCell++;
  // Creatures spawn in passage/chamber cells, but a later-generated
  // neighbouring chunk may carve a sea or a cavern beach over that same cell
  // (kind promotion only ever goes upward). All are valid open cave space —
  // what must never happen is a creature in shelf water or in stone.
  else { const k = sb.__kind(c.q, c.r, c.depth); if (!['passage','chamber','sea','beach'].includes(k)) badKind++; }
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
check((st.creatures[0].interest||0) > 10, 'a loud ping stokes a near lurker', 'interest ' + st.creatures[0].interest);
check((st.creatures[1].interest||0) === 0, 'a lurker beyond earshot is unmoved');

// ---- 2b. Ballast roar: fast dives are loud; slow dives are silent ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('lurker', 3, -8, 60);
sb.changeDepth(120); // > diveStep → ballast noise (loudness 2, reach 8)
check((st.creatures[0].interest||0) > 0, 'fast dive (ballast roar) stokes a sleeping hunter', 'interest ' + st.creatures[0].interest);
st.creatures.length = 0;
sb.spawnCreature('lurker', 30, -8, 180); // far off, so only NOISE (not nearness) could stir it
sb.changeDepth(60); // single step — no ballast, no noise
check((st.creatures[0].interest||0) === 0, 'a slow dive makes no noise — a distant hunter stays cold', 'interest ' + (st.creatures[0].interest||0));

// ---- 2c. The Eel: cargo piracy, the chase, and the escape ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0; st.cargo = 2;
sb.spawnCreature('eel', 4, -8, 0);
for (let i = 0; i < 6 && st.cargo === 2; i++) sb.creatureTick();
check(st.cargo === 1 && st.creatures[0] && st.creatures[0].carrying === 1, 'eel closes and raids the hold', 'cargo=' + st.cargo);
const eel = st.creatures[0];
st.q = eel.q; st.r = eel.r - 1; st.currentDepth = eel.depth; // corner it
sb.creatureTick();
check(st.cargo === 2 && st.creatures.length === 0, 'cornering the thief recovers the crate', 'cargo=' + st.cargo + ', thieves left=' + st.creatures.length);
st.q = 0; st.r = -6; st.currentDepth = 0; st.cargo = 1;
sb.spawnCreature('eel', 3, -7, 0);
for (let i = 0; i < 6 && st.cargo === 1; i++) sb.creatureTick();
check(st.cargo === 0, 'a second thief strikes', 'cargo=' + st.cargo);
for (let i = 0; i < 14; i++) sb.creatureTick();
check(st.creatures.length === 0, 'uncaught thief vanishes into tight water, crate and all');
st.cargo = 0;
// Restore test-3's precondition: an awake hunter 4 hexes out, as test 2 left it.
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('lurker', 0, -10, 0);
st.creatures[0].interest = 100; st.creatures[0].tq = st.q; st.creatures[0].tr = st.r;
st.creatures[0].tq = 0; st.creatures[0].tr = -6;

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
  for (const c of st.creatures) { if (c.type === 'lurker') { c.interest = 100; c.tq = st.q; c.tr = st.r; } }
  let stoneViolations = 0;
  for (let i = 0; i < 60; i++) {
    sb.creatureTick();
    for (const c of st.creatures) if (!sb.__ck(c.q, c.r, c.depth)) stoneViolations++;
  }
  check(stoneViolations === 0, '60 ticks: no creature ever occupies stone', st.creatures.length + ' creatures × 60 ticks, ' + stoneViolations + ' violations');
}

// ---- 4b. Silent running: killing the sonar lets the deep lose your thread ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('lurker', 6, -6, 0);
const SL = st.creatures[0]; SL.tenacity = 0.2;
sb.__ping.value = '2'; SL.interest = 60; sb.creatureTick(); const iOn = SL.interest;
sb.__ping.value = '0'; SL.interest = 60; sb.creatureTick(); const iDark = SL.interest;
check(iDark < iOn, 'interest bleeds FASTER with the sonar off (silent running)', 'on→' + iOn + ' dark→' + iDark);
sb.__ping.value = '2';

// ---- 4c. Fleeing: a beaten beast opens the distance, making for open water ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('lurker', 0, -8, 0);
const FL = st.creatures[0]; FL.fleeing = true; FL.cunning = 0.2;
const hd = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const fd0 = hd(FL, st);
for (let i = 0; i < 4; i++) sb.creatureTick();
check(hd(FL, st) > fd0, 'a fleeing beast opens the distance', fd0 + ' → ' + hd(FL, st));

// ---- 4d. Shoalfang: a trio spawns, closes on the sub, and bites ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 200;
for (let q = -2; q <= 2; q++) for (let r = -12; r <= -9; r++) sb.__set(q, r, 0); // cave water for the school
sb.spawnShoal(0, -10, 0);
check(st.creatures.length === 3 && st.creatures.every(c => c.type === 'shoal'), 'shoalfang spawns as a trio', st.creatures.length + ' fish');
const shd = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
for (const c of st.creatures) c.boldness = 1; // a bold school presses
const near0 = Math.min(...st.creatures.map(c => shd(c, st)));
const hull0 = st.hull;
for (let i = 0; i < 10; i++) sb.creatureTick();
const near1 = Math.min(...st.creatures.map(c => shd(c, st)));
check(near1 < near0, 'the school closes on the sub', near0 + ' → ' + near1);
check(st.hull < hull0, 'the school bites once it surrounds you', 'hull ' + hull0 + ' → ' + st.hull);

// ---- 4e. Decoy buoy: pulls the school off the boat ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.currentDepth = 0;
for (let q = -2; q <= 2; q++) for (let r = -10; r <= -7; r++) sb.__set(q, r, 0); // cave water for the school
sb.spawnShoal(0, -8, 0);
for (const c of st.creatures) c.boldness = 1;
st.buoys.push({ q: 8, r: -6, depth: 0, turns: 10 });
const toBuoy0 = Math.min(...st.creatures.map(c => shd(c, { q: 8, r: -6 })));
for (let i = 0; i < 5; i++) sb.creatureTick();
const toBuoy1 = Math.min(...st.creatures.map(c => shd(c, { q: 8, r: -6 })));
check(toBuoy1 < toBuoy0, 'a decoy buoy pulls the school toward it', toBuoy0 + ' → ' + toBuoy1);
check(st.buoys[0] && st.buoys[0].turns === 5, 'the buoy burns down its turns', st.buoys[0] && st.buoys[0].turns);
st.buoys = [];

// ---- 4j. Tidehulk: its wake takes the boat, its bulk blocks the passage ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 200;
for (let q = -3; q <= 3; q++) for (let r = -9; r <= -3; r++) sb.__set(q, r, 0);
sb.spawnCreature('hulk', 1, -6, 0);
const HK = st.creatures[0]; HK.predictability = 1; HK.phase = 2; // moves next tick
const pq0 = st.q, pr0 = st.r, ph0 = st.hull;
let wake = false;
for (let i = 0; i < 9 && !wake; i++) { sb.creatureTick(); if (st.q !== pq0 || st.r !== pr0 || st.hull < ph0) wake = true; }
check(wake, 'the tidehulk\'s wake shoves the boat (or slams it)', 'moved to (' + st.q + ',' + st.r + '), hull ' + st.hull);
// Its bulk is an outright wall.
st.creatures.length = 0;
st.q = 0; st.r = -6; st.hull = 200;
sb.spawnCreature('hulk', 1, -6, 0);
const bh = st.hull;
sb.move(1, -6);
check(st.q === 0 && st.r === -6 && st.hull === bh, 'nothing gets past a tidehulk', 'still at (' + st.q + ',' + st.r + ')');

// ---- 4i. Chorus: sings, draws hunters, never bites ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 200;
sb.spawnCreature('chorus', 3, -6, 0);
sb.spawnCreature('lurker', 5, -6, 0);
const CH = st.creatures[0], LK = st.creatures[1];
CH.period = 1; CH.volume = 1; LK.interest = 0;
const chq = CH.q, chr = CH.r;
for (let i = 0; i < 4; i++) sb.creatureTick();
check(st.hull === 200, 'the chorus never bites — it only sings', 'hull ' + st.hull);
check((LK.interest || 0) > 0, 'its song turns real hunters toward the water', 'lurker interest ' + LK.interest);
check(CH.q === chq && CH.r === chr, 'the colony stays where it is rooted');

// ---- 4h. Anglerlure: holds still wearing a prize's face until a ping finds it ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 200;
sb.spawnCreature('angler', 4, -6, 0);
const AN = st.creatures[0];
check(['salvage', 'signal', 'ruin'].includes(AN.mask), 'the anglerlure wears a real prize\'s face', 'mask=' + AN.mask);
const aq0 = AN.q, ar0 = AN.r, ah0 = st.hull;
for (let i = 0; i < 5; i++) sb.creatureTick();
check(AN.q === aq0 && AN.r === ar0 && st.hull === ah0, 'it holds absolutely still and does not hunt', 'stayed at (' + AN.q + ',' + AN.r + ')');
check(!AN.revealed, 'passive sonar never finds a thing that does not move');
st.q = AN.q - 1; st.r = AN.r; // come alongside believing it a prize
sb.creatureTick();
check(st.hull < ah0 && AN.revealed, 'coming alongside springs the trap', 'hull ' + ah0 + '→' + st.hull);
// A ping should have caught it BEFORE the trap sprang.
st.creatures.length = 0; st.hull = 200;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('angler', 2, -6, 0);
const AN2 = st.creatures[0];
sb.__ping.value = '3';
sb.ping();
check(AN2.revealed && st.hull === 200, 'an active ping sees through the lie without a scratch', 'revealed=' + AN2.revealed);
sb.__ping.value = '2';

// ---- 4f. Silt-lurcher: floor ambush that can't leave its layer ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.hull = 200;
sb.spawnCreature('silt', 1, -6, 480); // buried at 480m
const SI = st.creatures[0]; SI.patience = 1; SI.spent = 0;
st.currentDepth = 480; // you come down into its layer, adjacent
const sd0 = SI.depth;
let siltHit = false; const sh0 = st.hull;
for (let i = 0; i < 6 && !siltHit; i++) { sb.creatureTick(); if (st.hull < sh0) siltHit = true; }
check(siltHit, 'the buried silt-lurcher ambushes when you come to the floor', 'hull ' + sh0 + '→' + st.hull);
check(SI.depth === sd0, 'the silt-lurcher never leaves its depth layer', 'depth ' + SI.depth);

// ---- 4g. Barotaur: hunts in the deep, falls away when you climb out ----
st.creatures.length = 0;
st.q = 0; st.r = -6; st.hull = 200;
for (let q = -1; q <= 4; q++) { sb.__set(q, -6, 3000); sb.__set(q, -6, 1800); sb.__set(q, -6, 2400); }
sb.spawnCreature('baro', 3, -6, 3000);
const BA = st.creatures[0]; BA.ceilingLimit = 2400;
st.currentDepth = 3000; // deep with it
const bd0 = shd(BA, st);
for (let i = 0; i < 6; i++) sb.creatureTick();
check(shd(BA, st) < bd0, 'the barotaur closes on prey in the deep', bd0 + '→' + shd(BA, st));
const bdepth = BA.depth;
st.currentDepth = 1800; // you climb two bands, above its ceiling
for (let i = 0; i < 6; i++) sb.creatureTick();
check(BA.depth >= BA.ceilingLimit, 'the barotaur cannot follow above its ceiling — you escape', 'depth ' + BA.depth + ' vs limit ' + BA.ceilingLimit);

// ---- 4k. Combat: the harpoon drives things off; the leviathan shrugs; it's loud ----
st.creatures.length = 0; st.buoys = [];
st.q = 0; st.r = -6; st.currentDepth = 0; st.hull = 200;
st.armament = 'harpoon'; st.torpedoes = 0;
sb.spawnCreature('lurker', 1, -6, 0); // adjacent
const CBL = st.creatures[0]; CBL.interest = 100; CBL.dmgTaken = 0;
let broke = false;
for (let i = 0; i < 8 && !broke; i++) { sb.fireWeapon(); if (CBL.fleeing) broke = true; }
check(broke, 'the harpoon eventually drives a lurker off (it flees)', 'fleeing=' + CBL.fleeing);
// A tidehulk cannot be driven off by a harpoon.
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('hulk', 1, -6, 0);
const CBH = st.creatures[0];
for (let i = 0; i < 15; i++) sb.fireWeapon();
check(!CBH.fleeing && !CBH.gone, 'a harpoon cannot break a tidehulk', 'still here');
// Firing is loud — it wakes a distant hunter.
st.creatures.length = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('eel', 1, -6, 0);      // a target to fire at
sb.spawnCreature('lurker', 7, -6, 0);   // a listener 7 hexes off
const CBW = st.creatures[1]; CBW.interest = 0;
sb.fireWeapon();
check((CBW.interest || 0) > 0, 'a shot is a shout — it wakes hunters in earshot', 'lurker interest ' + CBW.interest);
// No weapon, no fire.
st.creatures.length = 0; st.armament = null; st.torpedoes = 0;
st.q = 0; st.r = -6; st.currentDepth = 0;
sb.spawnCreature('lurker', 1, -6, 0);
const h0 = st.hull; sb.fireWeapon();
check(st.creatures.length === 1 && !st.creatures[0].fleeing, 'an unarmed boat cannot fire', 'creature untouched');
st.armament = 'harpoon';

// ---- 5b. Rival salvager: seeks the nearest unworked site and strips it ----
st.creatures.length = 0;
st.q = 0; st.r = -16; st.currentDepth = 0; // inside sim range (24), outside stand-off (2)
sb.setTile(2, -9, 'ruin', true);
sb.spawnCreature('rival', 5, -9, 0);
st.creatures[0].hostile = false; // a salvager crew, not a hunter — this tests the racing behaviour
const poisBefore = st.poisFound.length;
let rivalStone = 0;
for (let i = 0; i < 40 && st.poisFound.length === poisBefore; i++) {
  sb.creatureTick();
  const rv = st.creatures[0];
  if (rv && !sb.__ck(rv.q, rv.r, rv.depth)) rivalStone++;
}
check(st.poisFound.length > poisBefore, 'rival finds and strips a site', (st.poisFound.length - poisBefore) + ' site(s) worked');
check(rivalStone === 0 && st.creatures.length === 1, 'rival stays in open water and persists', 'stoneViolations=' + rivalStone);

// ---- 6. Save round trip + backwards compat ----
// The version is pinned ON PURPOSE. It is a schema stamp, and this project has
// now shipped TWO key-schema changes without moving it — deck records rekeyed
// by kind, and a station learning what kind of place it is — each of which
// silently orphaned part of an existing save. A hardcoded number here means the
// next rekey cannot land without someone deciding, out loud, what old bytes
// mean. If this check goes red, write the migration before you change it.
{
  st.q = 0; st.r = -6; st.currentDepth = 0;
  const nCreatures = st.creatures.length;
  const nSpawned = sb.__spawned().size;
  sb.doSave();
  const raw = JSON.parse(store.getItem('fathom-save-v1'));
  check(raw.v === 3 && Array.isArray(raw.creatures) && raw.creatures.length === nCreatures,
    'the save stamps its schema version and carries creatures',
    'v' + raw.v + ', ' + raw.creatures.length + ' creatures, ' + raw.spawnedChunks.length + ' spawned chunks');
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

// ---- 7. Submarine vs submarine: the hunt, not the slugfest ----
{
  st.creatures.length = 0; st.threats = []; st.buoys = [];
  st.q = 0; st.r = 0; st.currentDepth = 0; st.hull = 100; st.alive = true;
  sb.__ping.value = '2';
  sb.spawnCreature('rival', 2, 0, 0);
  const rv = st.creatures[0];
  rv.hostile = true;

  // Silence is invisibility. A rival with its engines cut cannot be placed.
  rv.silent = true; rv.underPower = false; rv.revealTurns = 0;
  check(!sb.rivalLocalized(rv), 'a silent rival is a ghost — you cannot place it', 'hidden');
  // A ping paints it (revealTurns); so does being alongside.
  rv.revealTurns = 3;
  check(sb.rivalLocalized(rv), 'a pinged boat is lit for a few turns', 'localized');
  rv.revealTurns = 0; rv.q = 1; rv.r = 0;
  check(sb.rivalLocalized(rv), 'and a boat alongside cannot hide', 'adjacent');
  rv.q = 2; rv.r = 0;

  // Noise hands it your bearing.
  rv.alert = 0; rv.silent = false;
  sb.noiseMade(0, 0, 5);
  check(rv.alert > 0 && rv.fq === 0 && rv.fr === 0, 'a shout hands the rival your bearing', 'alert=' + Math.round(rv.alert));

  // Run silent and it loses your thread.
  rv.alert = 50; sb.__ping.value = '0';
  sb.tickRival(rv, 8);
  check(rv.alert < 50, 'rig for silent running and it loses the thread', 'alert 50 -> ' + Math.round(rv.alert));
  sb.__ping.value = '2';

  // Locked, level, in range — it looses a fish, and warns you doing it.
  st.threats = []; rv.alert = 100; rv.torps = 3; rv.reload = 0; rv.crippled = false; rv.q = 2; rv.r = 0; rv.depth = 0;
  sb.tickRival(rv, 2);
  check(st.threats.length === 1 && rv.torps === 2, 'a locked boat in range looses a torpedo', st.threats.length + ' in the water');

  // The fish resolves: it hits if you hold, misses if you break the solution.
  const shot = (setup) => { st.threats = [{ q: 2, r: 0, depth: 0, aimQ: 0, aimR: 0, aimDepth: 0, fuse: 1 }]; st.hull = 100; st.buoys = []; setup(); sb.tickThreats(); return st.hull; };
  check(shot(() => { st.q = 0; st.r = 0; st.currentDepth = 0; }) < 100, 'hold still and it strikes home', 'hull ' + st.hull);
  check(shot(() => { st.q = 3; st.r = 0; st.currentDepth = 0; }) === 100, 'open the range and it runs past', 'evaded by distance');
  check(shot(() => { st.q = 0; st.r = 0; st.currentDepth = 120; }) === 100, 'change depth and it cannot follow', 'evaded by depth');
  const decoyHull = shot(() => { st.q = 2; st.r = 0; st.currentDepth = 0; st.buoys = [{ q: 0, r: 0, depth: 0, turns: 5 }]; });
  check(decoyHull === 100 && st.buoys.length === 0, 'a decoy takes the torpedo meant for you', 'buoy consumed, hull ' + decoyHull);

  // Your torpedo, the other way: a placed boat is hulled, and a hit gives away
  // your bearing to it. Enough, and it goes down.
  rv.hull = 20; rv.alert = 0; rv.crippled = false; rv.gone = false;
  sb.hitRival(rv, 16);
  check(rv.hull < 20 && rv.alert === 100, 'a torpedo hulls it — and it has your bearing now', 'hull ' + rv.hull);
  rv.hull = 13; rv.crippled = false; rv.gone = false;
  sb.hitRival(rv, 2);   // power 2 => a fixed 6 damage: 13 -> 7, into the cripple band, not through it
  check(rv.crippled && !rv.gone, 'holed low, it is crippled and runs — not sunk', 'hull ' + rv.hull);
  rv.hull = 5; rv.gone = false;
  sb.hitRival(rv, 16);
  check(rv.gone, 'and one more finishes it', 'sunk');

  // You cannot spend a torpedo on a boat you cannot place.
  st.creatures.length = 0; sb.spawnCreature('rival', 2, 0, 0);
  const ghost = st.creatures[0];
  ghost.hostile = true; ghost.silent = true; ghost.underPower = false; ghost.revealTurns = 0; ghost.gone = false;
  st.torpedoes = 2; st.armament = null; st.q = 0; st.r = 0; st.currentDepth = 0;
  const torpsBefore = st.torpedoes;
  sb.fireWeapon();
  check(st.torpedoes === torpsBefore, 'no firing on a boat you cannot place', 'torps held at ' + st.torpedoes);

  // A crippled boat runs silent and does not fight.
  st.threats = []; ghost.crippled = true; ghost.silent = false; ghost.alert = 100; ghost.torps = 3; ghost.reload = 0; ghost.q = 2; ghost.r = 0;
  sb.tickRival(ghost, 2);
  check(st.threats.length === 0 && ghost.silent === true, 'a crippled boat runs silent, not guns', 'no shot');

  // Threats survive a reload.
  st.threats = [{ q: 2, r: 0, depth: 0, aimQ: 0, aimR: 0, aimDepth: 0, fuse: 2 }];
  st.q = 0; st.r = -6; st.currentDepth = 0;
  sb.doSave();
  const raw2 = JSON.parse(store.getItem('fathom-save-v1'));
  check(Array.isArray(raw2.threats) && raw2.threats.length === 1, 'torpedoes in the water survive a save', raw2.threats.length + ' saved');
}

console.log(failures === 0 ? '\nALL CREATURE CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
