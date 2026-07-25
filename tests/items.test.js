// THE HOLD — items, fittings, and the trail. Exploration has to REWARD, and
// the rewards have to matter: a thing you find must change what the boat can
// do, and it must be losable. These assert that palpable value directly.
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
const pingEl = { value: '2', max: '3', addEventListener: () => {}, disabled: false, textContent: '' };
const documentStub = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
  if (p === 'getElementById') return (id) => id === 'ping-power' ? pingEl : makeStub();
  if (p === 'addEventListener') return () => {};
  return stub;
}});
const mem = {};
const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const sandbox = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' }, localStorage: storage,
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sandbox.__ping = pingEl;
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(script +
  '\nfunction __state(){ return state; }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); world.clear(); cells.clear(); generatedChunks.clear(); nodeCache.clear(); edgeCache.clear(); carvedFeatures.clear(); interiorCache.clear(); }' +
  '\nfunction __roll(d){ return rollItem(d); }' +
  '\nfunction __give(k,n){ giveItem(k,n); }' +
  '\nfunction __use(k){ useItem(k); }' +
  '\nfunction __count(k){ return itemCount(k); }' +
  '\nfunction __passive(){ return passiveRange(); }' +
  '\nfunction __safe(){ return safeDepthNow(); }' +
  '\nfunction __makeLead(tier,q,r,s){ makeLead(tier,q,r,s); }' +
  '\nfunction __checkLeads(){ checkLeads(); }' +
  '\nfunction __itemKinds(){ return Object.keys(ITEMS).map(k=>ITEMS[k].kind); }' +
  '\nfunction __stress(t,i){ stressHold(t,i); }' +
  '\nfunction __haunt(){ hauntTick(); }' +
  '\nfunction __jettison(k){ jettisonItem(k); }' +
  '\nfunction __worth(k){ return itemWorth(k); }' +
  '\nfunction __lampR(){ return effLampR(); }' +
  '\nfunction __cultures(){ return CULTURES; }' +
  '\nfunction __hold(){ holdTick(); }' +
  '\nfunction __noise(q,r,l){ noiseMade(q,r,l); }' +
  '\nfunction __see(){ seeAround(); }' +
  '\nfunction __itemsAll(){ return Object.keys(ITEMS); }' +
  '\nfunction __start(){ gameStarted = true; }',
  sandbox, { timeout: 20000 }); } catch (e) { if (typeof sandbox.state === 'undefined') { console.log('BOOT FAIL', e.message); process.exit(1); } }

let failures = 0;
const check = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) failures++; };

sandbox.restart();
sandbox.__start();
sandbox.__seed(20260725);
const st = sandbox.__state();

//--- 1. The table and rolls ---------------------------------------------------
check(sandbox.__itemKinds().filter((v, i, a) => a.indexOf(v) === i).length >= 4, 'the item table spans several kinds', sandbox.__itemKinds().filter((v,i,a)=>a.indexOf(v)===i).join(','));
// Roll many at shallow vs deep; deep-only items must not surface shallow.
let shallow = {}, deep = {};
for (let i = 0; i < 400; i++) { const s = sandbox.__roll(0); if (s) shallow[s] = 1; const dp = sandbox.__roll(4000); if (dp) deep[dp] = 1; }
check(Object.keys(shallow).length > 0, 'shallow water yields items', Object.keys(shallow).join(','));
check(!shallow.pressurehull && !shallow.idol, 'the rare deep things do NOT surface in shallow water', 'gated');
check(!!deep.pressurehull || !!deep.sonararray || !!deep.idol, 'the deep gives up the better things', Object.keys(deep).length + ' kinds deep');

//--- 2. Consumables change what the boat can do -------------------------------
st.items = {}; st.fits = {}; st.foot = null;
st.hull = 40; st.air = 100; st.stores = 30;
const sub = sandbox.activeSub();
sandbox.__give('patchkit', 1); sandbox.__use('patchkit');
check(st.hull > 40 && st.hull <= sub.hull && !st.items.patchkit, 'a patch kit mends the hull and is spent', 'hull=' + st.hull);
sandbox.__give('airflask', 1); const airBefore = st.air; sandbox.__use('airflask');
check(st.air > airBefore, 'an air flask fills the tanks', airBefore + ' -> ' + st.air);
sandbox.__give('rations', 1); sandbox.__use('rations');
check(st.stores > 30, 'rations feed the crew (Vigor up)', 'stores=' + Math.round(st.stores));

// A dressing mends the worst-hurt crewman by one wound.
st.crew = [{ name: 'Vale', role: 'diver', xp: 0, nerve: 60, conditions: ['gashed', 'crushedHand'], scars: [], dying: false, wounded: true, gear: {} }];
sandbox.__give('dressing', 1); sandbox.__use('dressing');
check(st.crew[0].conditions.length === 1, 'a field dressing clears a wound', st.crew[0].conditions.join(','));
// Salts pull a fraying nerve back.
st.crew[0].nerve = 15;
sandbox.__give('salts', 1); sandbox.__use('salts');
check(st.crew[0].nerve > 15, 'waking salts steady a nerve', 'nerve=' + st.crew[0].nerve);

//--- 3. Fittings are PERMANENT boat upgrades ----------------------------------
sandbox.__ping.value = '2';
const passive0 = sandbox.__passive();
sandbox.__give('sonararray', 1); sandbox.__use('sonararray');
check(sandbox.__passive() > passive0 && (st.fits.sonar || 0) === 1, 'a sonar array widens the passive envelope for good', passive0 + ' -> ' + sandbox.__passive());
const safe0 = sandbox.__safe();
sandbox.__give('pressurehull', 1); sandbox.__use('pressurehull');
check(sandbox.__safe() > safe0 && (st.fits.depth || 0) === 1, 'pressure-hull plating buys real depth', safe0 + ' -> ' + sandbox.__safe());

//--- 4. Death takes the hold and the fittings; a station keeps its stores -----
st.items = { idol: 2, patchkit: 1 }; st.fits = { sonar: 1 };
st.cargoBanked = 5;
sandbox.endGame('The deep has you.', 'test');
check(Object.keys(st.items).length === 0 && Object.keys(st.fits).length === 0, 'a lost boat takes the hold and every fitting down with it', 'emptied');

//--- 5. The trail: a mark, a cache, and the next mark -------------------------
sandbox.restart(); sandbox.__start(); sandbox.__seed(20260725);
const st2 = sandbox.__state();
st2.q = 0; st2.r = 0; st2.currentDepth = 600; st2.alive = true; st2.leads = []; st2.items = {}; st2.cargo = 0;
sandbox.__makeLead(1, 0, 0, 'test-trail');
check(st2.leads.length === 1, 'reading a chart lays a mark on your own', st2.leads.length + ' lead');
const L = st2.leads[0];
check(Math.abs(L.q) + Math.abs(L.r) >= 6, 'the mark is a real trip away, not underfoot', 'dist ' + (Math.abs(L.q) + Math.abs(L.r)));

// Sail onto the mark: it must pay off.
const cargo0 = st2.cargo;
st2.q = L.q; st2.r = L.r; st2.currentDepth = L.d;
sandbox.__checkLeads();
check(!st2.leads.includes(L), 'reaching a mark resolves it', st2.leads.length + ' leads left');
check(st2.cargo > cargo0, 'a cache pays out real salvage', cargo0 + ' -> ' + st2.cargo + ' crates');

// A trail can chain — force enough resolutions to see a next mark appear.
let chained = false;
for (let i = 0; i < 30 && !chained; i++) {
  st2.leads = []; sandbox.__makeLead(3, i, 0, 'chain:' + i);
  const LL = st2.leads[0]; st2.q = LL.q; st2.r = LL.r; st2.currentDepth = LL.d;
  sandbox.__checkLeads();
  if (st2.leads.length > 0) chained = true;   // the cache dropped the next mark
}
check(chained, 'a rich cache hides the next mark — the trail continues', 'chained');

//--- 6. Everything survives a reload ------------------------------------------
sandbox.restart(); sandbox.__start(); sandbox.__seed(20260725);
const st3 = sandbox.__state();
st3.items = { idol: 1, sonararray: 2, patchkit: 3 };
st3.fits = { sonar: 1, depth: 2 };
st3.leads = [{ q: 9, r: -4, d: 1200, tier: 2 }];
sandbox.doSave(true);
st3.items = {}; st3.fits = {}; st3.leads = [];
sandbox.resumeGame(sandbox.loadSave());
const r = sandbox.__state();
check(r.items.patchkit === 3 && r.items.idol === 1, 'the hold survives a reload', JSON.stringify(r.items));
check(r.fits.depth === 2 && r.fits.sonar === 1, 'the fittings survive a reload', JSON.stringify(r.fits));
check(r.leads.length === 1 && r.leads[0].tier === 2, 'the trail you were following survives a reload', r.leads.length + ' lead');

//--- 7. ITEM PROPERTIES: things that behave, not just sit -----------------------
{
  const s = sandbox.__state();
  s.foot = null; s.crew = []; s.alive = true;

  // VOLATILE: a stress event can detonate it — hull damage, and it is gone.
  let blew = false, tries = 0;
  for (; tries < 40 && !blew; tries++) {
    s.items = { warhead: 1 }; s.hull = 100;
    sandbox.__stress('a test', 1);
    if (!s.items.warhead) { blew = true; }
  }
  check(blew, 'a volatile find can detonate under stress', 'blew after ' + tries + ' shocks');
  check(s.hull < 100, 'and it wounds the boat when it does', 'hull=' + s.hull);
  // A non-volatile thing rides through the same shock untouched.
  s.items = { patchkit: 1 }; s.hull = 100;
  for (let i = 0; i < 20; i++) sandbox.__stress('a test', 1);
  check(s.items.patchkit === 1 && s.hull === 100, 'a stable thing is unbothered by the same shock', 'patchkit safe');

  // CURSED: it bleeds a crew nerve while it rides in the hold.
  s.items = { idol: 1 }; s.crew = [{ name: 'Poe', role: 'diver', nerve: 90, conditions: [], scars: [], dying: false, gear: {} }];
  s.stores = 100;
  const n0 = s.crew[0].nerve;
  for (let i = 0; i < 30; i++) sandbox.__haunt();
  check(s.crew[0].nerve < n0, 'a cursed thing in the hold bleeds the crew\'s nerve', n0 + ' -> ' + s.crew[0].nerve);
  // Stored below (out of the hold) it goes quiet.
  s.items = {}; const nQuiet = s.crew[0].nerve;
  for (let i = 0; i < 30; i++) sandbox.__haunt();
  check(s.crew[0].nerve === nQuiet, 'out of the hold, the curse falls silent', 'held at ' + s.crew[0].nerve);
  // And casting it back cures it outright.
  s.items = { idol: 2 };
  sandbox.__jettison('idol');
  check(!s.items.idol, 'casting a cursed thing back into the sea is the cure', 'gone');

  // HEAVY: dead weight costs air per move.
  s.items = {}; s.currentDepth = 600; s.q = 0; s.r = 0; s.air = 1000;
  sandbox.applyMoveCosts(1); const lightCost = 1000 - s.air;
  s.items = { ingot: 2 }; s.air = 1000;
  sandbox.applyMoveCosts(1); const heavyCost = 1000 - s.air;
  check(heavyCost > lightCost, 'heavy cargo costs extra air to haul', lightCost + ' -> ' + heavyCost + ' air/move');

  // LUMINOUS: a cold-light bead widens the lamp on foot.
  s.items = {}; const dark = sandbox.__lampR();
  s.items = { lumen: 2 };
  check(sandbox.__lampR() > dark, 'a luminous thing widens the lamp', dark + ' -> ' + sandbox.__lampR());

  // SIGNIFICANT: the WORTH hook works, and Cultures is left EMPTY for Sean.
  check(Object.keys(sandbox.__cultures()).length === 0, 'the cultures registry is left empty on purpose', 'yours to fill');
  check(sandbox.__worth('idol') > 0, 'a significant item has a base worth (x1 until a people prizes it)', 'worth=' + sandbox.__worth('idol'));
}

//--- 8. The big roster, and the new properties it introduced -------------------
{
  const s = sandbox.__state();
  s.foot = null; s.alive = true;
  check(sandbox.__itemsAll().length >= 30, 'the item table is a great big diverse thing now', sandbox.__itemsAll().length + ' items');

  // WARD: the deep stokes slower when you carry salt-iron. Same shout, less alert.
  s.items = {}; s.fits = {}; s.currentDepth = 1500; s.q = 0; s.r = 0;
  s.creatures = [{ type: 'lurker', q: 2, r: 0, depth: 1500, interest: 0, aggression: 0.5, fleeing: false }];
  sandbox.__noise(0, 0, 5); const loudInterest = s.creatures[0].interest;
  s.creatures[0].interest = 0; s.items = { saltiron: 1 };
  sandbox.__noise(0, 0, 5); const wardedInterest = s.creatures[0].interest;
  check(wardedInterest < loudInterest, 'a ward makes the deep stoke slower to the same noise', loudInterest + ' -> ' + wardedInterest);

  // QUIETING fit: same idea, bolted to the boat, against a rival's alert.
  s.items = {};
  s.creatures = [{ type: 'rival', hostile: true, gone: false, crippled: false, q: 2, r: 0, depth: 1500, alert: 0 }];
  sandbox.__noise(0, 0, 5); const loudAlert = s.creatures[0].alert;
  s.creatures[0].alert = 0; s.fits = { quiet: 2 };
  sandbox.__noise(0, 0, 5); const quietAlert = s.creatures[0].alert;
  check(quietAlert < loudAlert, 'a quieting fit hands a rival less of your bearing', loudAlert + ' -> ' + quietAlert);
  s.fits = {};

  // TRIM fit: the boat slips through deep water for less air per hex.
  s.items = {}; s.currentDepth = 3000; s.fits = {}; s.air = 1000;
  sandbox.applyMoveCosts(1); const plainMove = 1000 - s.air;
  s.currentDepth = 3000; s.air = 1000; s.fits = { trim: 3 };
  sandbox.applyMoveCosts(1); const trimMove = 1000 - s.air;
  check(trimMove < plainMove, 'fine trim tanks make deep travel cost less air', plainMove + ' -> ' + trimMove + ' air/hex');
  s.fits = {};

  // SOOTHING: a chime steadies a fraying nerve over time.
  s.items = { chime: 1 }; s.crew = [{ name: 'Rue', role: 'diver', nerve: 40, conditions: [], scars: [], dying: false, gear: {} }];
  s.stores = 100; const soothed0 = s.crew[0].nerve;
  for (let i = 0; i < 40; i++) sandbox.__hold();
  check(s.crew[0].nerve > soothed0, 'a soothing relic steadies a nerve while it rides with you', soothed0 + ' -> ' + s.crew[0].nerve);

  // LIVING: a sealed jar stirs — over many turns it nibbles nerve or grows.
  s.items = { specimenjar: 1 }; s.crew = [{ name: 'Cur', role: 'diver', nerve: 100, conditions: [], scars: [], dying: false, gear: {} }];
  let stirred = false;
  for (let i = 0; i < 120 && !stirred; i++) { sandbox.__hold(); if (s.crew[0].nerve < 100 || (s.items.specimenjar || 0) > 1) stirred = true; }
  check(stirred, 'a living thing in the hold does not sit still', s.crew[0].nerve < 100 ? 'it stirred the crew' : 'it grew');

  // SEEING: the lens unmasks an angler wearing a false face.
  s.items = {}; s.currentDepth = 1800; s.q = 0; s.r = 0;
  s.creatures = [{ type: 'angler', revealed: false, q: 2, r: 0, depth: 1800, mask: 'salvage' }];
  sandbox.__see();
  check(s.creatures[0].revealed === true, 'a scrying lens strips a false face off an angler', 'unmasked');

  // A live torpedo, used, joins the magazine.
  s.items = { torpedo: 1 }; s.torpedoes = 0; s.foot = null;
  sandbox.__use('torpedo');
  check(s.torpedoes === 1 && !s.items.torpedo, 'a live torpedo, cradled into the tube, arms the boat', 'torps=' + s.torpedoes);
}

console.log(failures === 0 ? '\nALL ITEM CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
