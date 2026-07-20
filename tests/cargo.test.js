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
  try { vm.runInContext(script + '\nfunction __state(){ return state; }\nfunction __tile(q,r){ return world.get(hexKey(q,r)); }\nfunction __subKey(){ return activeSubKey; }\nfunction __setCell(q,r,d,k2){ cells.set(cellKey(q,r,d), {type:k2, kind:k2}); }', sandbox, { timeout: 15000 }); } catch (e) {}
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
// 2c. The outfitter: enough banked → the port offers; a second press buys.
st.hull = 100; st.air = 350; st.cargoBanked = 25;
sb.surface(); // arms the offer
check(sb.__subKey() === 'erebus' && st.cargoBanked === 25, 'outfitter offer arms without spending', 'sub=' + sb.__subKey() + ' banked=' + st.cargoBanked);
sb.surface(); // accepts
check(sb.__subKey() === 'charon' && st.cargoBanked === 5 && st.hull === 130 && st.air === 450,
  'second press buys the Charon', 'sub=' + sb.__subKey() + ' banked=' + st.cargoBanked + ' hull=' + st.hull + ' air=' + st.air);

// 2c2. Crew: a hand waits on the dock; a second press signs them on
st.hull = 130; st.air = 450; // full — yard and air stay quiet
sb.surface(); // arms the hire offer (banked 5 = exactly one sign-on)
check(!!st._hireOffer && st.crew.length === 0, 'a hand waits on the dock', st._hireOffer && st._hireOffer.role);
sb.surface();
check(st.crew.length === 1 && st.cargoBanked === 0, 'second press signs them aboard', st.crew[0] && (st.crew[0].name + ' the ' + st.crew[0].role));

// 2d. Expeditions: hold station over a ruin, the crew works it out
st.q = 5; st.r = -9; st.currentDepth = 300; st.hull = 130; st.air = 400;
const ruinTile = { type: 'ruin', poi: 'ruin', q: 5, r: -9, ceiling: 0, floor: 300 };
sb.handleTile(ruinTile);
check(!!st.expedition, 'divers go over the side at the ruin');
let spins = 0;
while (st.expedition && spins++ < 12) sb.creatureTick();
check(!st.expedition && st.poisFound.includes('5,-9'), 'expedition completes; the site is worked out', 'haul aboard: ' + st.cargo + ' crates, ' + st.relics + ' relics');
st.q = 6; st.r = -9; st.currentDepth = 300;
const ruin2 = { type: 'ruin', poi: 'ruin', q: 6, r: -9, ceiling: 0, floor: 300 };
sb.handleTile(ruin2);
check(!!st.expedition, 'a second team goes down');
st.q = 0; st.r = -6; // the boat moves off
sb.creatureTick();
check(!st.expedition && st.poisFound.includes('6,-9'), 'moving off recalls the team; site spent');
// 2e. Cavern beach: landfall gives air + a crew expedition; returns refill
sb.__setCell(0, -8, 60, 'beach');
st.q = 0; st.r = -8; st.currentDepth = 60; st.air = 100; st.expedition = null;
if (st.crew[0]) { st.crew[0].role = 'diver'; st.crew[0].xp = 0; }
sb.maybeBeach();
check(st.air > 100 && !!st.expedition && st.expedition.type === 'beach', 'first landfall: air off the pocket + beach expedition', 'air=' + st.air);
let bspin = 0;
while (st.expedition && bspin++ < 12) sb.creatureTick();
check(st.crew[0] && st.crew[0].xp === 1, 'the dive seasons the diver', 'xp=' + (st.crew[0] && st.crew[0].xp));
st.air = 200;
sb.maybeBeach();
check(st.air > 200, 'the old beach refills the tanks on return', 'air=' + st.air);

// relics go ashore under guard
st.relics = 2; st.cargo = 0; st.q = 0; st.r = 0; st.currentDepth = 0; st.hull = 130; st.air = 450;
sb.surface();
check(st.relics === 0 && st.relicsBanked === 2, 'relics bank in the vault at port', 'vault=' + st.relicsBanked);

st.cargo = 3; // three more crates aboard
st.cargoBanked = 1; // restock the ledger after the yard/outfitter tests
sb.doSave();
const raw = JSON.parse(store.getItem('fathom-save-v1'));
check(raw.cargo === 3 && raw.cargoBanked === 1, 'save carries cargo + bank', JSON.stringify({c: raw.cargo, b: raw.cargoBanked}));
const sb2 = freshContext(store);
sb2.startGame();
const st2 = sb2.__state();
check(st2.cargo === 3 && st2.cargoBanked === 1, 'cargo + bank survive reload', 'cargo=' + st2.cargo + ' banked=' + st2.cargoBanked);
check(sb2.__subKey() === 'charon', 'the bought boat survives reload', 'sub=' + sb2.__subKey());
check(st2.crew.length === 1, 'the crew survives reload', st2.crew[0] && (st2.crew[0].name + ', xp ' + st2.crew[0].xp));

// 5. Gear & hazards: the armed, the unarmed, and the grenade
{
  st.crew.length = 0;
  st.crew.push({ name: 'A', role: 'diver', xp: 0, wounded: false, gear: { weapon: 'lance', armor: 'wardsuit', kit: null } });
  st.crew.push({ name: 'B', role: 'diver', xp: 0, wounded: false, gear: { weapon: null, armor: null, kit: null } });
  const expF = { crates: 0, relics: 0 };
  check(sb.resolveHazard(expF) === 'repelled' && !st.crew.some(m => m.wounded), 'an armed team drives the dark off (7 vs threat<=5)', 'hero xp=' + st.crew[0].xp);
  st.crew[0].gear = { weapon: null, armor: null, kit: null };
  check(sb.resolveHazard(expF) === 'wound' && st.crew.some(m => m.wounded), 'an unarmed team takes a wound');
  for (const m of st.crew) m.wounded = false;
  st.crew[0].gear.kit = { key: 'grenades', charges: 1 };
  check(sb.resolveHazard(expF) === 'grenade' && st.crew[0].gear.kit.charges === 0 && expF.crates >= 1, 'a grenade buys the win when the line breaks');
  st.crew[1].wounded = true;
  st.q = 0; st.r = 0; st.currentDepth = 0; st.hull = 130; st.air = 450;
  st.cargo = 0; st.relics = 0; st.cargoBanked = 0; st.relicsBanked = 0;
  st._outfitOffer = null; st._hireOffer = null; st._armoryOffer = null;
  sb.surface();
  check(!st.crew.some(m => m.wounded), 'the port surgeon makes the crew whole');
  st.crew.push({ name: 'C', role: 'engineer', xp: 0, wounded: false, gear: { weapon: null, armor: null, kit: null } });
  st.cargoBanked = 10; st.relicsBanked = 0; st.air = 450; st.hull = 130;
  sb.surface();
  check(!!st._armoryOffer, 'the armory lays out a piece', st._armoryOffer && st._armoryOffer.key);
  sb.surface();
  const armed = st.crew.some(m => m.gear && (m.gear.weapon || m.gear.armor || (m.gear.kit && m.gear.kit.charges > 0)));
  check(armed && st.cargoBanked < 10, 'a second press arms a hand', 'bank=' + st.cargoBanked);
}

// 4. The death ruling: the sea keeps what was aboard; the port keeps the bank
{
  const st3 = sb2.__state();
  st3.cargo = 2; st3.relics = 1; st3.cargoBanked = 7; st3.relicsBanked = 3;
  sb2.endGame('The deep has you.', 'test');
  check(st3.cargo === 0 && st3.relics === 0 && st3.crew.length === 0 && sb2.__subKey() === 'erebus',
    'the sea keeps what was aboard', 'cargo/relics/crew zeroed, boat back to erebus');
  check(st3.cargoBanked === 7 && st3.relicsBanked === 3, 'the port keeps what was banked',
    'bank=' + st3.cargoBanked + ' vault=' + st3.relicsBanked);
  const raw3 = JSON.parse(store.getItem('fathom-save-v1'));
  check(!!raw3 && raw3.cargoBanked === 7 && raw3.subKey === 'erebus',
    'the campaign save survives death (no resurrection by reload)', 'saved bank=' + raw3.cargoBanked);
}

console.log(failures === 0 ? '\nALL CARGO CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
