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
  try { vm.runInContext(script + '\nfunction __state(){ return state; }\nfunction __tile(q,r){ return world.get(hexKey(q,r)); }\nfunction __subKey(){ return activeSubKey; }\nfunction __setCell(q,r,d,k2){ cells.set(cellKey(q,r,d), {type:k2, kind:k2}); }\nfunction __portActs(){ return portRows().map(function(r){ return r.act; }).filter(Boolean); }', sandbox, { timeout: 15000 }); } catch (e) {}
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
// The column must be CONTINUOUS for the strict ruling to apply: the wreck is
// reachable by diving, so hovering above it is a choice, not a wall. (Where a
// hex's true floor is sealed off behind stone, atReachableBottom deliberately
// relaxes — the bot captain found 83% of wrecks were otherwise unreachable.)
for (let d = 0; d <= 360; d += 60) sb.__setCell(0, -8, d, 'passage');
const fakeTile = { type: 'salvage', q: 0, r: -8, poi: 'salvage', ceiling: 0, floor: 360 };
st.currentDepth = 240; // 120 m above the floor — out of reach
sb.handleTile(fakeTile);
check(st.cargo === 0, 'wreck out of reach when hovering above the floor', 'cargo=' + st.cargo);
st.currentDepth = 360; // at the floor
sb.handleTile(fakeTile);
// A worked wreck pays a real haul now (3-5, more with depth), not the single
// crate that left the whole economy above it unable to turn over.
const haul = st.cargo;
check(haul >= 3, 'a worked wreck pays a haul worth the trip', 'cargo=' + haul);
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
check(st.cargo === 0 && st.cargoBanked === haul, 'making port banks the cargo', 'banked=' + st.cargoBanked);

// 2b. THE PORT IS A SHOP NOW. Surfacing at the dock no longer spends anything:
// it opens a panel. Everything below buys through portBuy(), one tap, no timer,
// nothing gated behind anything else.
st.hull = 40; st.air = 350; st.cargoBanked = 4;
sb.surface();
check(st.hull === 40 && st.cargoBanked === 4,
  'making port SPENDS NOTHING — the yard no longer raids the bank unasked',
  'hull=' + st.hull + ' banked=' + st.cargoBanked);
sb.portBuy('repair');
check(st.hull === 100 && st.cargoBanked < 4, 'the yard patches the hull when you ask',
  'hull=' + st.hull + ' banked=' + st.cargoBanked);

// 2c. THE GATING BUG THE AUDIT FOUND: affording a boat used to suppress the
// hiring hall, the armoury and the arms dealer, so getting richer bought you
// LESS. Everything must be on offer at the same time.
st.hull = 100; st.air = 350; st.cargoBanked = 40; st.relicsBanked = 3;
st.crew = []; st.armament = null; st.portHire = null;
const acts = sb.__portActs();
check(acts.some(a => a && a.indexOf('boat:') === 0), 'the yard offers the next boat', acts.join(' '));
check(acts.indexOf('hire') >= 0, 'AND the hiring hall is open at the same time');
check(acts.indexOf('harpoon') >= 0, 'AND the armourer is open at the same time');

// The hand on the dock is a PERSON, not a slot machine — it used to re-roll
// name and role on every press, so you could spin for the role you wanted.
const h1 = JSON.stringify(st.portHire);
sb.__portActs(); sb.__portActs();
check(JSON.stringify(st.portHire) === h1, 'the hand waiting on the dock does not re-roll', h1);

sb.portBuy('hire');
check(st.crew.length === 1 && st.cargoBanked === 35, 'hiring signs them aboard for the stated price',
  st.crew[0] && (st.crew[0].name + ' the ' + st.crew[0].role) + ' bank=' + st.cargoBanked);

sb.portBuy('boat:charon');
check(sb.__subKey() === 'charon' && st.cargoBanked === 15 && st.hull === 130 && st.air === 450,
  'and the boat is still buyable afterwards', 'sub=' + sb.__subKey() + ' banked=' + st.cargoBanked);

sb.portBuy('harpoon');
check(st.armament === 'harpoon' && st.cargoBanked === 7, 'the dock bolts on a harpoon',
  'arm=' + st.armament + ' bank=' + st.cargoBanked);
sb.portBuy('torps');
check(st.torpedoes === 3 && st.relicsBanked === 1, 'and the armourer trades torpedoes for relic-work',
  'torps=' + st.torpedoes + ' vault=' + st.relicsBanked);

// You cannot buy what you cannot pay for, and it fails quietly rather than
// going negative.
const bankPre = st.cargoBanked, hullPre = st.hull;
st.cargoBanked = 0;
sb.portBuy('harpoon'); sb.portBuy('boat:nyx');
check(st.cargoBanked === 0 && sb.__subKey() === 'charon', 'an empty bank buys nothing and goes nowhere near negative',
  'bank=' + st.cargoBanked + ' sub=' + sb.__subKey());
// Leave the ledger as the later checks expect to find it — a test that leaks
// state into the next test is measuring the previous test.
st.cargoBanked = bankPre; st.relicsBanked = 0; st.torpedoes = 0; st.armament = null;

// 2d. The resolution ladder: a ruin no longer rolls dice for divers — the
// captain goes down there in person. Full on-foot mechanics are interior.test's
// business; here we only prove the ECONOMY seam, that the ruin hands off to a
// body and that the haul that body carries lands aboard.
st.q = 5; st.r = -9; st.currentDepth = 300; st.hull = 130; st.air = 400;
sb.tileAt(5, -9);   // handleTile is only ever reached on a real world tile
const ruinTile = { type: 'ruin', poi: 'ruin', q: 5, r: -9, ceiling: 0, floor: 300 };
sb.handleTile(ruinTile);
check(!!st.foot && !st.expedition, 'the ruin puts the captain over the side, not dice',
  st.foot ? 'ashore at ' + st.foot.x + ',' + st.foot.y : 'no body');
check(sb.ashore() === true, 'and the helm is locked out while he is inside');
st.foot.crates = 2; st.foot.relics = 1;   // a haul stowed on the way round
const cargoPre = st.cargo, relicPre = st.relics;
sb.leaveInterior('The team climbs back out');
check(!st.foot && st.cargo === cargoPre + 2 && st.relics === relicPre + 1,
  'climbing out brings the haul aboard', 'cargo=' + st.cargo + ' relics=' + st.relics);
check(st.poisFound.includes('5,-9'), 'the ruin is worked out afterwards');
// 2e. THE GROTTO. A cavern beach used to give air and then roll dice at you.
// It now gives air and puts you on the sand — the same handoff a ruin makes.
// The economy seam is what this suite cares about: the haul lands aboard, the
// dive is worth xp, and the beach is NOT a prize that gets worked out.
sb.__setCell(0, -8, 60, 'beach');
st.q = 0; st.r = -8; st.currentDepth = 60; st.air = 100; st.expedition = null;
if (st.crew[0]) { st.crew[0].role = 'diver'; st.crew[0].xp = 0; }
sb.maybeBeach();
check(st.air > 100, 'first landfall: air off the pocket', 'air=' + st.air);
check(!!st.foot && st.foot.kind === 'beach' && !st.expedition,
  'the beach puts the captain on the sand, not dice',
  st.foot ? 'ashore in a ' + st.foot.kind : 'no body');
st.foot.crates = 1;
const poisPre = st.poisFound.slice().sort().join('|');
sb.leaveInterior('You wade out');
check(!st.foot && st.crew[0] && st.crew[0].xp >= 1, 'the walk ashore seasons the diver', 'xp=' + (st.crew[0] && st.crew[0].xp));
// A ruin is a prize and gets worked out. A beach is a place, and coming back
// aboard must not mark it spent or repaint it on the chart as ordinary water.
check(st.poisFound.slice().sort().join('|') === poisPre,
  'a beach is not a prize and never gets worked out',
  'was ' + st.poisFound.length + ' entries');
// A POCKET IS NOT A PUMP. Stepping off the sand and straight back on used to
// pay +88 air a time, forever — 5.1 taps per 100 air against the surface's
// 12.5, which made a known beach the cheapest air in the game by 2.4x AND
// infinite. This check used to encode the faucet: it drove maybeBeach twice
// with no moves between and asserted the second one paid.
st.air = 200; st.expedition = null; st.foot = null;
sb.maybeBeach();
check(st.air === 200, 'a beach you just drew from has nothing left to give',
  'air=' + st.air + ' (was +88, unlimited)');
if (st.foot) sb.leaveInterior('You wade out');
// ...but it seeps back out of the rock, so it is still a refuge on a route.
st.moves += 60; st.air = 200; st.expedition = null; st.foot = null;
sb.maybeBeach();
check(st.air > 200, 'and it is worth coming back to once it has recovered', 'air=' + st.air);
check(!!st.foot && st.foot.kind === 'beach', 'and it is still a place you can walk back into');
sb.leaveInterior('You wade out');

// relics go ashore under guard
st.relics = 2; st.cargo = 0; st.q = 0; st.r = 0; st.currentDepth = 0; st.hull = 130; st.air = 450;
sb.surface();
check(st.relics === 0 && st.relicsBanked === 2, 'relics bank in the vault at port', 'vault=' + st.relicsBanked);

st.cargo = 3; // three more crates aboard
st.cargoBanked = 1; // restock the ledger after the yard/outfitter tests
st.armament = 'harpoon'; st.torpedoes = 2; // and armed, to prove arms round-trip
sb.doSave();
const raw = JSON.parse(store.getItem('fathom-save-v1'));
check(raw.cargo === 3 && raw.cargoBanked === 1, 'save carries cargo + bank', JSON.stringify({c: raw.cargo, b: raw.cargoBanked}));
const sb2 = freshContext(store);
sb2.startGame();
const st2 = sb2.__state();
check(st2.cargo === 3 && st2.cargoBanked === 1, 'cargo + bank survive reload', 'cargo=' + st2.cargo + ' banked=' + st2.cargoBanked);
check(st2.armament === st.armament && st2.torpedoes === st.torpedoes, 'armaments survive reload', 'arm=' + st2.armament + ' torps=' + st2.torpedoes);
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
  const gearActs = sb.__portActs().filter(a2 => a2.indexOf('gear:') === 0);
  check(gearActs.length > 0, 'the outfitter lays out gear for an empty slot', gearActs.slice(0, 3).join(' '));
  sb.portBuy(gearActs[0]);
  const armed = st.crew.some(m => m.gear && (m.gear.weapon || m.gear.armor || (m.gear.kit && m.gear.kit.charges > 0)));
  check(armed && st.cargoBanked < 10, 'and buying it arms that hand', 'bank=' + st.cargoBanked);

  // Boat armaments. No isolation needed any more — that whole ritual of
  // emptying the bank and filling every crew slot existed only to stop the
  // OTHER offers in the chain from stealing the press. Nothing is chained now,
  // so you simply buy the thing you want.
  st.crew = [];
  st.armament = null; st.torpedoes = 0; st.hull = 9999; st.air = 450;
  st.cargo = 0; st.relics = 0;
  st.cargoBanked = 20; st.relicsBanked = 5;
  sb.surface();
  sb.portBuy('harpoon');
  check(st.armament === 'harpoon' && st.cargoBanked === 12, 'the dock bolts on a harpoon for crates', 'arm=' + st.armament + ' bank=' + st.cargoBanked);
  sb.portBuy('torps');
  check(st.torpedoes === 3 && st.relicsBanked === 3, 'the armourer trades torpedoes for relic-work', 'torps=' + st.torpedoes + ' vault=' + st.relicsBanked);
}

// 6. Unnatural growth: a living, varied hazard that bites every pass (not once)
{
  st.hull = 200; st.air = 600; st.currentDepth = 500; st.expedition = null;
  let bh = -1;
  for (let i = 0; i < 12; i++) {
    const h0 = st.hull, a0 = st.air;
    sb.handleTile({ type: 'growth', poi: 'growth', q: i, r: 700, ceiling: 480, floor: 540 });
    if (st.hull < h0 || st.air < a0) { bh = i; break; }
  }
  check(bh >= 0, 'unnatural growth harms the boat, and varies by hex', 'biting hex q=' + bh);
  if (bh >= 0) {
    const h1 = st.hull, a1 = st.air;
    sb.handleTile({ type: 'growth', poi: 'growth', q: bh, r: 700, ceiling: 480, floor: 540 });
    check(st.hull < h1 || st.air < a1, 'growth bites AGAIN on the next pass (was one-shot — the bug)', 'persistent');
  }
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
