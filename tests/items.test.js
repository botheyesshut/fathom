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
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }' +
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
  '\nfunction __buyMult(c,k){ return buyMult(c,k); }' +
  '\nfunction __sellTo(c,k){ return sellPriceTo(c,k); }' +
  '\nfunction __buyFrom(c,k){ return buyPriceFrom(c,k); }' +
  '\nfunction __spawnEnclave(c,q,r,d){ spawnEnclave(c,q,r,d); }' +
  '\nfunction __enclaveHere(){ return enclaveHere(); }' +
  '\nfunction __tradeSell(e,k){ tradeSell(e,k); }' +
  '\nfunction __tradeBuy(e,k){ tradeBuy(e,k); }' +
  '\nfunction __canBreathe(){ return canBreatheWater(); }' +
  '\nfunction __int(q,r,d){ return interiorAt(q,r,d); }' +
  '\nfunction __enter(q,r,d){ state.currentDepth=d; tileAt(q,r); enterInterior({q:q,r:r}); }' +
  '\nfunction __foot(){ return state.foot; }' +
  '\nfunction __step(x,y){ stepFoot(x,y); }' +
  '\nfunction __corpseVal(c){ return corpseValue(c); }' +
  '\nfunction __sellBody(e,i){ tradeSellBody(e,i); }' +
  '\nfunction __lose(m,how){ loseCrew(m,how); }' +
  '\nfunction __footTile(x,y){ return footTile(x,y); }' +
  '\nfunction __cur(q,r,d){ return currentAt(q,r,d); }' +
  '\nfunction __favour(a,b,c,e,f){ return currentFavour(a,b,c,e,f); }' +
  '\nfunction __applyMove(m,f){ applyMoveCosts(m,f); }' +
  '\nfunction __layer(q,r){ return layerAt(q,r); }' +
  '\nfunction __damp(a,b,q,r){ return layerDamp(a,b,q,r); }' +
  '\nfunction __crossed(a,b,q,r){ return crossedLayer(a,b,q,r); }' +
  '\nfunction __pcr(d,q,r){ return passiveContactR(d,q,r); }' +
  '\nfunction __setPos(q,r,d){ state.q=q; state.r=r; state.currentDepth=d; }' +
  '\nfunction __layerKnown(q,r,d){ return layerKnown(q,r,d); }' +
  '\nfunction __noteFelt(q,r){ noteLayerFelt(q,r); }' +
  '\nfunction __trace(q,r,d){ return traceAt(q,r,d); }' +
  '\nfunction __curName(q,r,d){ var c=currentAt(q,r,d); return c?c.name:null; }' +
  '\nfunction __mkLead(t,q,r,s,k){ makeLead(t,q,r,s,k); return state.leads[state.leads.length-1]; }' +
  '\nfunction __leads(){ return state.leads; }' +
  '\nfunction __clearLeads(){ state.leads = []; }' +
  '\nfunction __resolve(L){ resolveLead(L); }' +
  '\nfunction __poiAt(q,r){ var t=tileAt(q,r); return t?(t.poi||null):null; }' +
  '\nfunction __revealedCount(){ var n=0; for (var e of revealed) n+=e[1].size; return n; }' +
  '\nfunction __cargo(){ return state.cargo; }' +
  '\nfunction __creatureCount(){ return state.creatures.length; }' +
  '\nfunction __quarryCaches(){ return state.quarryCache || {}; }' +
  '\nfunction __kindOf(s,t){ return pickLeadKind(s,t); }' +
  '\nfunction __knacks(m){ return crewKnacks(m); }' +
  '\nfunction __knackOrder(m){ return knackOrder(m); }' +
  '\nfunction __crewCan(k){ var m = crewCan(k); return m ? m.name : null; }' +
  '\nfunction __setCrew(a){ state.crew = a.map(function(x){ return crewVitals(x); }); }' +
  '\nfunction __teamScore(){ return teamScore(); }' +
  '\nfunction __atk(m){ return crewAtk(m); }' +
  '\nfunction __knackKeys(){ return KNACK_KEYS; }' +
  '\nfunction __knackAt(){ return KNACK_AT; }' +
  '\nfunction __scenes(){ return VP_SCENES; }' +
  '\nfunction __vpDims(){ return [VP_W, VP_H]; }' +
  '\nfunction __sceneNow(){ return sceneForNow(); }' +
  '\nfunction __palette(){ return ANSI16; }' +
  '\nfunction __vpKey(){ return VP_KEY; }' +
  '\nfunction __pages(){ return PAGES; }' +
  '\nfunction __recover(){ return recoverPage(); }' +
  '\nfunction __pagesFound(){ return state.pagesFound || []; }' +
  '\nfunction __setPages(a){ state.pagesFound = a; }' +
  '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
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
// Force the kind. This block tests what a CACHE pays out, and 'test-trail'
// happens to hash to a cavern — which correctly pays no cargo at all, being a
// place rather than a payout. It only ever passed because nearestWayIn used to
// fail here and honestly downgrade it to a cache. A test that depends on a
// different feature failing is not testing the thing it claims to.
sandbox.__mkLead(1, 0, 0, 'test-trail', 'cache');
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
  const cults = sandbox.__cultures();
  check(!!cults.dagon && !!cults.confluence && !!cults.libertines, 'the three peoples now hold the registry', Object.keys(cults).join(', '));
  check(sandbox.__worth('idol') > 6, 'a Dagon relic is worth more than its face — its people prize it', 'worth=' + sandbox.__worth('idol'));
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

//--- 9. THE CULTURES: who prizes what, and trading with them --------------------
{
  const s = sandbox.__state();
  s.foot = null; s.alive = true; s.items = {}; s.cargo = 0; s.relics = 0;

  // The same idol is a fortune to Dagon and worthless to the mariners.
  const toDagon = sandbox.__sellTo('dagon', 'idol');
  const toMariners = sandbox.__sellTo('confluence', 'idol');
  check(toDagon > 0 && toMariners === 0, 'a Dagon relic sells to the Deep Ones, not the mariners', 'dagon ' + toDagon + ' / confluence ' + toMariners);
  // Pre-Fall alloy is the mariners' meat, and nothing to Dagon.
  check(sandbox.__sellTo('confluence', 'ingot') > 0 && sandbox.__sellTo('dagon', 'ingot') === 0, 'pre-Fall salvage sells to the Confluence, not to Dagon', 'confluence ' + sandbox.__sellTo('confluence', 'ingot'));
  // Where you carry a thing decides what it is worth — the whole culture economy.
  check(toDagon > toMariners, 'the same object is worth wildly different things to different peoples', toDagon + ' vs ' + toMariners);

  // Each people sells its own specialty: the Libertines make weapons.
  check(sandbox.__buyFrom('libertines', 'torpedo') > 0 && sandbox.__buyMult('libertines', 'torpedo') >= 0, 'the free yards will sell you a torpedo', sandbox.__buyFrom('libertines', 'torpedo') + ' cr');

  // A real trade: sell an idol at a Dagon enclave, get crates.
  s.creatures = []; s.enclaves = []; s.q = 0; s.r = 0; s.currentDepth = 2400;
  sandbox.__spawnEnclave('dagon', 0, 0, 2400);
  const e = sandbox.__enclaveHere();
  check(!!e && e.culture === 'dagon', 'an enclave is a place you can stand and deal', e ? e.culture : 'none');
  s.items = { idol: 1 }; s.cargo = 0;
  sandbox.__tradeSell(e, 'idol');
  check(!s.items.idol && s.cargo === toDagon, 'selling a relic to its people pays out in crates', '+' + s.cargo + ' crates');
  // And buy their stock back with the proceeds.
  const price = sandbox.__buyFrom('dagon', 'saltiron');
  s.cargo = price + 3;
  sandbox.__tradeBuy(e, 'saltiron');
  check(sandbox.__count('saltiron') === 1 && s.cargo === 3, 'and you can buy their goods with the crates', 'bought, ' + s.cargo + ' left');

  // Enclaves survive a reload (overlay, like creatures).
  s.enclaves = [{ id: 'enclave:9,9,3000', culture: 'libertines', q: 9, r: 9, depth: 3000 }];
  sandbox.doSave(true);
  s.enclaves = [];
  sandbox.resumeGame(sandbox.loadSave());
  const rs = sandbox.__state();
  check(rs.enclaves.length === 1 && rs.enclaves[0].culture === 'libertines', 'the peoples you have found survive a reload', rs.enclaves.length + ' enclave');
}

//--- 10. DROWNED WATER: the Dagon trait made meaningful -------------------------
{
  const s = sandbox.__state();
  s.foot = null; s.alive = true; s.items = {}; s.crew = []; s.air = 200000; s.stores = 100;

  // Interiors generate water: shallow to wade, drowned to swim.
  let wetDeck = null, drownedKey = null;
  for (let q = 0; q < 80 && !wetDeck; q++) {
    const ch = sandbox.__int(q, 31, 900);
    for (const [k, t] of ch.tiles) if (t.wet === 'drowned') { wetDeck = { q: q, ch: ch }; drownedKey = k; break; }
  }
  check(!!wetDeck, 'the tunnels hold water — streams, pools, drowned passages', wetDeck ? 'found at q=' + wetDeck.q : 'none in 80 decks');
  let shallowCount = 0, drownCount = 0, fallCount = 0;
  for (let q = 0; q < 40; q++) {
    const ch = sandbox.__int(q, 33, 900);
    for (const t of ch.tiles.values()) { if (t.wet === 'shallow') shallowCount++; if (t.wet === 'drowned') drownCount++; if (t.fall) fallCount++; }
  }
  check(shallowCount > 0 && drownCount > 0, 'both wadeable and drowned water generate', shallowCount + ' shallow, ' + drownCount + ' drowned');
  check(fallCount > 0, 'and water falls through broken decks', fallCount + ' falls');

  // A human crew cannot breathe water. Dagon work is the only thing that changes it.
  s.items = {};
  check(sandbox.__canBreathe() === false, 'an air-breathing party cannot cross drowned water', 'no gills');
  s.items = { gillhood: 1 };
  check(sandbox.__canBreathe() === true, 'a Dagon gill-hood makes the drowned passage only a passage', 'gills');

  // Crossing drowned water WITHOUT gills is a warned, expensive decision.
  s.items = {}; s.foot = null;
  const dc = drownedKey.indexOf(','), dx = +drownedKey.slice(0, dc), dy = +drownedKey.slice(dc + 1);
  sandbox.__enter(wetDeck.q, 31, 900);
  const ff = sandbox.__foot();
  // stand beside the drowned tile
  ff.x = dx; ff.y = dy - 1;
  if (!sandbox.__footTile(ff.x, ff.y)) { ff.x = dx - 1; ff.y = dy; }
  if (!sandbox.__footTile(ff.x, ff.y)) { ff.x = dx + 1; ff.y = dy; }
  if (!sandbox.__footTile(ff.x, ff.y)) { ff.x = dx; ff.y = dy + 1; }
  const standX = ff.x, standY = ff.y;
  sandbox.__step(dx, dy);
  check(sandbox.__foot().x === standX && sandbox.__foot().y === standY, 'the first attempt at drowned water is a WARNING, not a drowning', 'held back');
  const airPre = s.air;
  sandbox.__step(dx, dy);   // second tap: commit
  check(sandbox.__foot().x === dx && sandbox.__foot().y === dy, 'the second is a decision — you go under', 'swam it');
  const drownCost = airPre - s.air;
  // With gills the same crossing is cheap.
  s.foot = null; s.items = { gillhood: 1 }; s.air = 200000;
  sandbox.__enter(wetDeck.q, 31, 900);
  const gf = sandbox.__foot(); gf.x = standX; gf.y = standY;
  const airPre2 = s.air;
  sandbox.__step(dx, dy);
  const gillCost = airPre2 - s.air;
  check(gillCost < drownCost, 'and with Dagon gills it costs a fraction of what it costs a human', drownCost + ' air -> ' + gillCost + ' air');
}

//--- 11. THE CORPSE TRADE: what the Children of Dagon want most -----------------
{
  const s = sandbox.__state();
  s.foot = null; s.items = {}; s.cargo = 0; s.corpses = []; s.lostCrew = []; s.alive = true; s.air = 200000;

  // A hand lost ON A DECK leaves a body where they fell.
  let site = null;
  for (let q = 0; q < 40 && !site; q++) { const c = sandbox.__int(q, 35, 900); if (c.rooms && c.rooms.length) site = q; }
  s.crew = [{ name: 'Halloran', role: 'diver', nerve: 70, conditions: [], scars: [], dying: false, gear: {} }];
  sandbox.__enter(site, 35, 900);
  const fd = sandbox.__foot();
  const dead = s.crew[0];
  dead.ashore = true; dead.fx = fd.x; dead.fy = fd.y;
  sandbox.__lose(dead, 'taken');
  check(fd.dead && fd.dead.length === 1 && fd.dead[0].name === 'Halloran', 'a hand lost on a deck leaves a body where they fell', 'body on deck');
  // A mind that BREAKS walks off and leaves nothing to carry.
  s.crew = [{ name: 'Vane', role: 'diver', nerve: 70, conditions: [], scars: [], dying: false, gear: {}, ashore: true, fx: fd.x, fy: fd.y }];
  const before = fd.dead.length;
  sandbox.__lose(s.crew[0], 'broke');
  check(fd.dead.length === before, 'but a broken mind walks into the dark and leaves nothing behind', 'no body');

  // Walking over the body takes it up — and the crew feel it.
  s.crew = [{ name: 'Ash', role: 'diver', nerve: 80, conditions: [], scars: [], dying: false, gear: {} }];
  const body = fd.dead[0];
  const adj = [[0,-1],[1,0],[0,1],[-1,0]].map(([ax,ay]) => ({x: body.x+ax, y: body.y+ay})).find(p => sandbox.__footTile(p.x, p.y));
  fd.x = adj.x; fd.y = adj.y;
  const nerve0 = s.crew[0].nerve;
  sandbox.__step(body.x, body.y);
  check((s.corpses || []).length === 1, 'you can go back for your dead and take them up', s.corpses.length + ' aboard');
  check(s.crew[0].nerve < nerve0, 'and the living watch you do it', nerve0 + ' -> ' + s.crew[0].nerve);

  // Freshness decays, and it is worth less the longer you carry it.
  const freshVal = sandbox.__corpseVal(s.corpses[0]);
  s.corpses[0].fresh = 5;
  const staleVal = sandbox.__corpseVal(s.corpses[0]);
  check(staleVal < freshVal, 'the dead do not keep — Dagon pay for FRESH', freshVal + ' cr -> ' + staleVal + ' cr');

  // Selling one to the Children of Dagon pays, and costs the crew dearly.
  s.foot = null; s.corpses[0].fresh = 60; s.cargo = 0; s.enclaves = [];
  s.crew = [{ name: 'Bell', role: 'diver', nerve: 90, conditions: [], scars: [], dying: false, gear: {} }];
  s.q = 0; s.r = 0; s.currentDepth = 2400;
  sandbox.__spawnEnclave('dagon', 0, 0, 2400);
  const de = sandbox.__enclaveHere();
  const pay = sandbox.__corpseVal(s.corpses[0]);
  const bellNerve = s.crew[0].nerve;
  sandbox.__sellBody(de, 0);
  check(s.corpses.length === 0 && s.cargo === pay, 'the Children of Dagon buy the body, and pay well', '+' + s.cargo + ' crates');
  check(s.crew[0].nerve < bellNerve - 5, 'and every hand aboard is the worse for having watched', bellNerve + ' -> ' + s.crew[0].nerve);

  // It all survives a reload.
  s.corpses = [{ name: 'Reed', fresh: 33 }];
  sandbox.doSave(true);
  s.corpses = [];
  sandbox.resumeGame(sandbox.loadSave());
  check(sandbox.__state().corpses.length === 1, 'the dead you carry survive a reload', 'still aboard');
}

//--- 12. NO MONEY PRINTERS. The invariants the persona audit asked for ----------
// A playtester broke the economy in about forty taps. These are the standing
// guards so it cannot come back — an economy with a free crate faucet in it
// cannot be tuned, so these run before any balance question is even asked.
{
  const s = sandbox.__state();
  s.foot = null; s.alive = true; s.items = {}; s.cargo = 0; s.relics = 0; s.fits = {};

  // (a) NOBODY BUYS BACK THEIR OWN STOCK, at any price, in any culture.
  let faucets = [];
  const cults = sandbox.__cultures();
  for (const ck of Object.keys(cults)) {
    for (const k of (cults[ck].sells || [])) {
      const pay = sandbox.__buyFrom(ck, k), get = sandbox.__sellTo(ck, k);
      if (get > 0) faucets.push(`${ck} sells ${k} for ${pay} and buys it for ${get}`);
    }
  }
  check(faucets.length === 0, 'no culture buys back its own stock (the 20-crates-to-140 exploit)',
    faucets.length ? faucets.slice(0, 3).join(' | ') : 'all three peoples clean');

  // The general form: never pay out more than you charge, for anything.
  let inverted = [];
  for (const ck of Object.keys(cults)) {
    for (const k of sandbox.__itemsAll()) {
      const get = sandbox.__sellTo(ck, k);
      if (get > 0 && get > sandbox.__buyFrom(ck, k) && (cults[ck].sells || []).indexOf(k) >= 0) inverted.push(ck + '/' + k);
    }
  }
  check(inverted.length === 0, 'and no item pays out more than it costs at the same table', inverted.join(', ') || 'clean');

  // (b) Fittings are capped — plating cannot outrun the boat ladder.
  s.items = {}; s.fits = {};
  for (let i = 0; i < 30; i++) { sandbox.__give('pressurehull', 1); sandbox.__use('pressurehull'); }
  check((s.fits.depth || 0) <= 2, 'pressure-hull plating is capped', 'depth fit = ' + (s.fits.depth || 0));
  const cappedSafe = sandbox.__safe();
  check(cappedSafe < 4000, 'so safe depth cannot be bought to absurdity', 'safe depth = ' + cappedSafe + 'm');

  // (c) Crush depth still means something with every plate fitted.
  s.currentDepth = 20000; s.hull = 500; s.q = 0; s.r = 0;
  const h0 = s.hull;
  sandbox.applyMoveCosts(1);
  check(s.hull < h0, 'the sea still wins past crush depth, whatever you have bolted on',
    'took ' + (h0 - s.hull) + ' hull at 20,000m with 2 plates');

  // (d) A trail must be able to end.
  s.leads = []; s.foot = null; s.currentDepth = 600;
  let maxTier = 0, chainLen = 0;
  sandbox.__makeLead(1, 0, 0, 'cap-test');
  for (let i = 0; i < 60 && s.leads.length; i++) {
    const L = s.leads[0];
    maxTier = Math.max(maxTier, L.tier);
    s.q = L.q; s.r = L.r; s.currentDepth = L.d;
    sandbox.__checkLeads();
    chainLen++;
  }
  check(s.leads.length === 0, 'a lead chain terminates — it is not perpetual motion', chainLen + ' links, then it ended');
  check(maxTier <= 6, 'and tiers are capped so payouts cannot run away', 'max tier ' + maxTier);
}

//--- 13. CURRENTS: the water has a grain, and it is the same grain every time ---
{
  const s = sandbox.__state();
  s.foot = null; s.alive = true; s.items = {}; s.fits = {};

  // Substrate: the same water must set the same way every time you return, or
  // the chart is a liar and no route can ever be planned.
  const a = sandbox.__cur(14, -6, 600), b = sandbox.__cur(14, -6, 600);
  check(JSON.stringify(a) === JSON.stringify(b), 'a current is deterministic — the sea does not reshuffle', JSON.stringify(a));

  // The sea is not uniformly flowing, and not uniformly slack.
  let set = 0, slack = 0, strong = 0;
  for (let q = -40; q <= 40; q += 3) for (let r = -40; r <= 40; r += 3) {
    const c = sandbox.__cur(q, r, 600);
    if (c) { set++; if (c.strong) strong++; } else slack++;
  }
  check(set > 0 && slack > 0, 'some water runs and some is slack', set + ' setting, ' + slack + ' slack');
  check(strong > 0, 'and some of it runs hard', strong + ' strong');

  // Broad gyres, not per-hex noise: neighbours mostly agree, so a captain can
  // LEARN the water instead of being surprised by every single hex.
  let same = 0, tot = 0;
  for (let q = -30; q <= 30; q += 2) for (let r = -30; r <= 30; r += 2) {
    const c = sandbox.__cur(q, r, 600); if (!c) continue;
    for (const n of sandbox.__nbrs(q, r)) {
      const c2 = sandbox.__cur(n.q, n.r, 600); if (!c2) continue;
      tot++; if (c2.dir === c.dir) same++;
    }
  }
  check(tot > 0 && same / tot > 0.6, 'currents form broad gyres you can read, not per-hex chop',
    Math.round(same / tot * 100) + '% of neighbours share a set');

  // Favour is symmetric: what helps you out must hinder you home.
  let checkedPair = false, symmetric = true;
  for (let q = -20; q <= 20 && !checkedPair; q++) for (let r = -20; r <= 20 && !checkedPair; r++) {
    const c = sandbox.__cur(q, r, 600); if (!c) continue;
    const fwd = { q: q + [1,1,0,-1,-1,0][c.dir], r: r + [0,-1,-1,0,1,1][c.dir] };
    const out = sandbox.__favour(q, r, fwd.q, fwd.r, 600);
    const back = sandbox.__favour(fwd.q, fwd.r, q, r, 600);
    if (out > 0) { checkedPair = true; symmetric = back < 0; }
  }
  check(checkedPair && symmetric, 'riding it out means fighting it home', 'the return leg is a real problem');

  // And it must actually cost differently, or it is only prose.
  s.currentDepth = 900; s.q = 0; s.r = 0; s.fits = {}; s.items = {};
  s.air = 1000; sandbox.__applyMove(1, 2);   const withIt = 1000 - s.air;
  s.air = 1000; sandbox.__applyMove(1, 0);   const across = 1000 - s.air;
  s.air = 1000; sandbox.__applyMove(1, -2);  const against = 1000 - s.air;
  check(withIt < across && across < against, 'the set changes what a hex costs to cross',
    `with ${withIt} · across ${across} · against ${against} air`);
}

//--- 14. THE LAYER: depth as a hiding place, not merely an expense ------------
{
  console.log('\n--- 14. THE LAYER (thermocline) ---');

  // Deterministic, like every other piece of substrate.
  const a = sandbox.__layer(4, 4), b = sandbox.__layer(4, 4);
  check(JSON.stringify(a) === JSON.stringify(b), 'the layer is the same layer every time you come back');

  // Some water has one, some does not — otherwise it is wallpaper, not terrain.
  let has = 0, hard = 0; const depths = new Set();
  for (let q = -220; q < 220; q += 11) for (let r = -220; r < 220; r += 11) {
    const L = sandbox.__layer(q, r);
    if (L) { has++; if (L.strong) hard++; depths.add(L.depth); }
  }
  const tot = 40 * 40;
  check(has > tot * 0.5 && has < tot * 0.85, 'most water has a layer, but not all of it',
    has + '/' + tot + ' with a layer, ' + hard + ' of them hard');
  check(depths.size > 8, 'layers sit at many different depths', depths.size + ' distinct');
  let offGrid = 0;
  for (const d of depths) if (d % 60 !== 0) offGrid++;
  check(offGrid === 0, 'every layer snaps to the cell grid', offGrid + ' off-grid');

  // Find a hard layer and prove the trick works — and works BOTH ways.
  let hq = null, hr = null, HL = null;
  for (let q = 0; q < 400 && !HL; q += 11) for (let r = 0; r < 400 && !HL; r += 11) {
    const L = sandbox.__layer(q, r);
    if (L && L.strong && L.depth >= 600) { HL = L; hq = q; hr = r; }
  }
  check(!!HL, 'a hard layer exists somewhere to test against',
    HL ? HL.depth + ' m at ' + hq + ',' + hr : 'none found');
  if (HL) {
    const above = HL.depth - 120, below = HL.depth + 120;
    const dAcross = sandbox.__damp(above, below, hq, hr);
    check(dAcross < 0.25, 'a hard layer nearly stops sound crossing it', 'damp ' + dAcross);
    check(dAcross === sandbox.__damp(below, above, hq, hr),
      'the layer hides you from it exactly as much as it hides it from you');
    check(sandbox.__damp(below, below + 300, hq, hr) === 1, 'same side of the layer, sound travels normally');
    check(sandbox.__damp(above, above - 180, hq, hr) === 1, 'same side above it too');

    // Crossing is announced, and knows which way you went.
    const down = sandbox.__crossed(above, below, hq, hr);
    const up = sandbox.__crossed(below, above, hq, hr);
    check(!!down && down.below === true, 'diving through the layer reports that you went under it');
    check(!!up && up.below === false, 'rising through it reports that you came out from under');
    check(sandbox.__crossed(below, below + 60, hq, hr) === null, 'moving within one side reports no crossing');

    // The payoff: the contact envelope actually collapses across the layer.
    sandbox.__setPos(hq, hr, below);
    const flat = sandbox.__pcr();
    const acrossR = sandbox.__pcr(above, hq, hr);
    const sameR = sandbox.__pcr(below + 60, hq, hr);
    check(sameR === flat, 'a boat on your own side of the layer is heard at the usual range',
      sameR + ' vs ' + flat);
    check(acrossR < flat / 2, 'a boat on the far side of the layer is very nearly inaudible',
      acrossR + ' hexes across vs ' + flat + ' normally');

    // The epistemic law holds here too: a hull thermometer reads its own water.
    check(sandbox.__layerKnown(hq, hr, 0) === false,
      'you cannot read a layer a kilometre under the keel from the surface');
    check(sandbox.__layerKnown(hq, hr, HL.depth - 120) === true,
      'but you feel the gradient once you are near it');
    check(sandbox.__layerKnown(hq, hr, below) === true, 'and you know it once you are under it');
    sandbox.__noteFelt(hq, hr);
    check(sandbox.__layerKnown(hq, hr, 0) === true,
      'a layer you have crossed is remembered from anywhere in that water');
  }
}

//--- 15. TRACES: the current turned into a navigational instrument -----------
{
  console.log('\n--- 15. TRACES (evidence with a direction in it) ---');

  // Sweep for traces and prove the geometry: the source must lie UPSTREAM.
  let found = 0, sane = 0, bent = 0;
  const kinds = new Set();
  for (let q = -60; q < 60; q += 3) for (let r = -60; r < 60; r += 3) {
    const tr = sandbox.__trace(q, r, 600);
    if (!tr) continue;
    found++; kinds.add(tr.poi);
    if (tr.dist >= 1 && tr.dist <= 3) sane++;
    // The named bearing must be the reverse of the set that carried it here.
    const opposite = { east: 'west', west: 'east', north: 'south', south: 'north',
                       northeast: 'southwest', southwest: 'northeast' };
    if (opposite[tr.setName] === tr.toward) bent++;
  }
  check(found > 0, 'the sea carries traces of what is in it', found + ' plumes in the sample');
  check(sane === found, 'every trace comes from within the reach the sea will carry it');
  check(bent === found, 'the source always lies against the set — the inference is never wrong',
    bent + '/' + found + ' bearings correct');
  check(kinds.size >= 2, 'different things shed differently', [...kinds].join(', '));

  // Slack water is genuinely dead water. That is what makes running water mean something.
  let slackTraces = 0, slackHexes = 0;
  for (let q = -60; q < 60; q += 3) for (let r = -60; r < 60; r += 3) {
    if (sandbox.__curName(q, r, 600)) continue;
    slackHexes++;
    if (sandbox.__trace(q, r, 600)) slackTraces++;
  }
  check(slackHexes > 0 && slackTraces === 0, 'slack water carries nothing — no set, no evidence',
    slackHexes + ' slack hexes, ' + slackTraces + ' traces');

  // Deterministic, like everything else the substrate hands you.
  const a = sandbox.__trace(6, 6, 600), b = sandbox.__trace(6, 6, 600);
  check(JSON.stringify(a) === JSON.stringify(b), 'a trace reads the same way twice');
}

//--- 16. TYPED LEADS: a session has more than one correct shape --------------
{
  console.log('\n--- 16. TYPED LEADS (quarry / cavern / word / cache) ---');

  // All four kinds must actually occur, or the typing is decoration.
  const seen = {};
  for (let i = 0; i < 400; i++) { const k = sandbox.__kindOf('t' + i, 1); seen[k] = (seen[k] || 0) + 1; }
  const kinds = Object.keys(seen).sort();
  check(kinds.length === 4, 'all four kinds of mark get drawn', kinds.join(', '));
  check(Object.values(seen).every(n => n > 40), 'and none of them is vanishingly rare',
    kinds.map(k => k + ' ' + seen[k]).join(' · '));
  check(sandbox.__kindOf('same', 1) === sandbox.__kindOf('same', 1), 'a mark is the kind it is, every time');

  // THE ONE THAT MATTERS: a cavern mark must point at a real way in. A clue
  // that lies is worse than no clue, and this is the only kind that can lie.
  sandbox.__clearLeads();
  let cavs = 0, honest = 0;
  for (let i = 0; i < 60; i++) {
    const L = sandbox.__mkLead(1, i * 7, -i * 5, 'cav-probe-' + i, 'cavern');
    if (!L || L.kind !== 'cavern') continue;
    cavs++;
    const poi = sandbox.__poiAt(L.q, L.r);
    if (poi === 'ruin' || poi === 'opening' || poi === 'salvage') honest++;
  }
  // Soft quality bar, not an invariant — the exact hold rate moves whenever
  // world generation does. The INVARIANT is the next check: of the ones that
  // hold, every single one points at something really there.
  check(cavs > 36, 'a cavern mark usually finds a real place to point at',
    cavs + '/60 held (the rest honestly downgraded to a cache)');
  check(honest === cavs, 'every cavern mark points at a real way in — the chart never lies',
    honest + '/' + cavs);

  // WORD pays in knowledge, not cargo. That is the whole ruling: a session
  // spent charting is a session played properly, not a session wasted.
  sandbox.__clearLeads();
  const cargo0 = sandbox.__cargo(), rev0 = sandbox.__revealedCount();
  const W = sandbox.__mkLead(2, 0, 0, 'word-probe', 'word');
  sandbox.__resolve(W);
  const cargo1 = sandbox.__cargo(), rev1 = sandbox.__revealedCount();
  check(cargo1 === cargo0, 'word pays no cargo at all', cargo0 + ' -> ' + cargo1);
  check(rev1 > rev0, 'word pays in chart — water you have never been to, known',
    (rev1 - rev0) + ' new soundings');

  // QUARRY is an OFFER. The thing is there, the cache is there, and arriving
  // does not take it — you decide. Combat you were ambushed into is a mugging.
  sandbox.__clearLeads();
  const crt0 = sandbox.__creatureCount(), cg0 = sandbox.__cargo();
  const Q = sandbox.__mkLead(2, 40, 40, 'quarry-probe', 'quarry');
  sandbox.__resolve(Q);
  check(sandbox.__creatureCount() > crt0, 'a quarry mark puts something real in the water',
    crt0 + ' -> ' + sandbox.__creatureCount());
  check(sandbox.__cargo() === cg0, 'and arriving does NOT hand you the cache — you have to decide',
    cg0 + ' -> ' + sandbox.__cargo());
  const qcs = sandbox.__quarryCaches();
  const anyUntaken = Object.values(qcs).some(v => v && v.taken === false && v.crates > 0);
  check(anyUntaken, 'the cache waits where you left it, so you can come back braver');

  // The termination guard still holds with kinds in play — no perpetual motion.
  sandbox.__clearLeads();
  let chain = 0;
  for (let i = 0; i < 40 && sandbox.__leads().length < 200; i++) {
    const ls = sandbox.__leads();
    if (!ls.length) { sandbox.__mkLead(1, 0, 0, 'chain-seed-' + i); continue; }
    sandbox.__resolve(ls[0]); sandbox.__clearLeads(); chain++;
  }
  check(sandbox.__leads().length < 200, 'typed chains still terminate — the tier cap holds',
    chain + ' resolutions, ' + sandbox.__leads().length + ' marks outstanding');
}

//--- 17. KNACKS: crew specialise, they never get STRONGER ---------------------
{
  console.log('\n--- 17. KNACKS (options, never multipliers) ---');

  const mk = (name, xp) => ({ name: name, role: 'diver', xp: xp, wounded: false,
                              gear: { weapon: null, armor: null, kit: null } });

  // Tenure, not kills. A green hand knows nothing; an old hand knows three things.
  sandbox.__setCrew([mk('Green', 0)]);
  check(sandbox.__knacks(sandbox.__setCrew && { name: 'Green', role: 'diver', xp: 0 }).length === 0,
    'a hand fresh aboard has learned nothing yet');
  const steps = sandbox.__knackAt().map(t => sandbox.__knacks({ name: 'Ito', role: 'diver', xp: t }).length);
  check(JSON.stringify(steps) === '[1,2,3]', 'knacks arrive at the tenure marks, one at a time',
    'at ' + sandbox.__knackAt().join('/') + ' voyages -> ' + steps.join(','));
  check(sandbox.__knacks({ name: 'Ito', role: 'diver', xp: 9999 }).length <= sandbox.__knackKeys().length,
    'and they run out — nobody learns everything');

  // Who somebody becomes is fixed from the day they sign on.
  const o1 = sandbox.__knackOrder({ name: 'Reyes', role: 'diver' });
  const o2 = sandbox.__knackOrder({ name: 'Reyes', role: 'diver' });
  check(JSON.stringify(o1) === JSON.stringify(o2), 'who a hand was going to become never changes');
  // Different people must become different things — and checking two names is
  // not enough, because two names can honestly roll the same first knack. What
  // matters is that the FIRST knack varies across the crew you might actually
  // hire, or everyone converges on the same person.
  const firsts = {};
  for (const nm of ['Okafor','Reyes','Halvorsen','Ito','Marchetti','Osei','Lindqvist','Baptiste','Ferro','Ngata','Sorokin','Adeyemi']) {
    const f = sandbox.__knackOrder({ name: nm, role: 'diver' })[0];
    firsts[f] = (firsts[f] || 0) + 1;
  }
  check(Object.keys(firsts).length >= 3, 'different people become different things',
    Object.keys(firsts).map(k => k + '×' + firsts[k]).join(' · '));

  // THE RULING, ENFORCED: a knack must never move a combat number. If this
  // check ever fails, the scale problem Sean specifically forbade has started.
  // NOTE: both hands are GEARED identically on purpose — teamScore skips the
  // gearless, so comparing two empty-handed crew would pass 0 === 0 and prove
  // nothing at all. A test that cannot fail is worse than no test.
  const arm = () => ({ weapon: 'speargun', armor: 'plates', kit: null });
  const plain = mk('Plain', 0); plain.gear = arm();
  const vet = mk('Vet', 40); vet.gear = arm();
  sandbox.__setCrew([plain]);
  const scoreGreen = sandbox.__teamScore();
  sandbox.__setCrew([vet]);
  const scoreVet = sandbox.__teamScore();
  check(scoreGreen.atk > 0, 'the comparison is live — a geared hand actually scores',
    'green atk ' + scoreGreen.atk + ', def ' + scoreGreen.def);
  check(scoreVet.atk === scoreGreen.atk && scoreVet.def === scoreGreen.def,
    'FORTY voyages of tenure buys ZERO attack and ZERO defence — knacks are not stats',
    'green ' + scoreGreen.atk + '/' + scoreGreen.def + ' vs veteran ' + scoreVet.atk + '/' + scoreVet.def);

  // A knack in a broken hand is not a knack you have.
  const carrier = mk('Carrier', 40);
  const key = sandbox.__knackOrder(carrier)[0];
  sandbox.__setCrew([carrier]);
  check(sandbox.__crewCan(key) === 'Carrier', 'an able veteran can do the thing they are good at');
  carrier.wounded = true;
  sandbox.__setCrew([carrier]);
  check(sandbox.__crewCan(key) === null, 'a knack in a hand who cannot work is a knack you do not have');

  // And it is a CREW capability, never a captain one — lose the person, lose it.
  sandbox.__setCrew([]);
  check(sandbox.__crewCan(key) === null, 'with nobody aboard, nobody can do anything');
}

//--- 18. THE VIEWPORT: ANSI art that cannot be quietly malformed -------------
{
  console.log('\n--- 18. THE VIEWPORT (ANSI illustration) ---');
  const S = sandbox.__scenes();
  const [W, H] = sandbox.__vpDims();
  const names = Object.keys(S);
  check(names.length >= 5, 'there are scenes to show', names.join(', '));

  // Hand-counted ANSI art is exactly as reliable as it sounds — the first cut
  // of every one of these was ragged. Colour now comes from a CHARACTER KEY
  // rather than a parallel grid, which removes the ragged-row failure mode
  // entirely; what is left to check is that the art is square and that every
  // glyph drawn actually has a colour somewhere.
  let bad = [];
  for (const [k, s] of Object.entries(S)) {
    if (!s.art || s.art.length !== H) bad.push(k + ' rows=' + (s.art || []).length);
    (s.art || []).forEach((r, y) => { if (r.length !== W) bad.push(k + ' y' + y + '=' + r.length); });
    if (s.col) bad.push(k + ' still carries a parallel colour grid');
  }
  check(bad.length === 0, 'every scene is exactly ' + W + 'x' + H, bad.slice(0, 6).join(' · ') || 'clean');

  const pal = sandbox.__palette(), baseKey = sandbox.__vpKey();
  let unkeyed = new Set(), drawn = 0;
  for (const s of Object.values(S)) {
    const key = Object.assign({}, baseKey, s.key || {});
    for (const row of s.art) for (const g of row) {
      if (g === ' ') continue;
      drawn++;
      const c = key[g];
      if (!c || !/[0-9a-f]/.test(c) || parseInt(c, 16) >= pal.length) unkeyed.add(g);
    }
  }
  check(unkeyed.size === 0, 'every glyph drawn has a colour in the key',
    [...unkeyed].join(' ') || 'all keyed');
  check(drawn > 300, 'and there is actually something drawn', drawn + ' glyphs');

  // A pulse key must name a colour the scene actually puts on screen.
  let deadPulse = [];
  for (const [k, s] of Object.entries(S)) {
    const key = Object.assign({}, baseKey, s.key || {});
    const used = new Set([].concat(...s.art.map(r => r.split('').map(g => key[g]))));
    for (const pk of (s.pulse || [])) if (!used.has(pk)) deadPulse.push(k + ':' + pk);
  }
  check(deadPulse.length === 0, 'every pulse key names a colour the scene uses',
    deadPulse.join(', ') || 'all live');

  const noCap = names.filter(k => !S[k].cap || S[k].cap.length < 8);
  check(noCap.length === 0, 'every scene says what it is', noCap.join(', ') || 'all captioned');

  // And the selector must always land on a scene that exists, whatever the
  // state — an unknown key would leave the panel frozen on the last picture.
  const picked = sandbox.__sceneNow();
  check(!!S[picked], 'the scene chosen for the current state is one that exists', picked);
}

//--- 19. THE ACCOUNT: Sean's own pages, recovered in order ---------------------
{
  console.log('\n--- 19. THE ACCOUNT (found text) ---');
  const P = sandbox.__pages();

  // The document is real and each page is a page, not a stub or a wall.
  check(P.length >= 12, 'the account has a real length', P.length + ' pages');
  const words = P.map(x => x.split(/\s+/).length);
  check(words.every(w => w >= 25 && w <= 160), 'every page is page-sized',
    'range ' + Math.min(...words) + '-' + Math.max(...words) + ' words');

  // No CYOA machinery may survive into the found text — a choice button or a
  // programmer note inside a drowned man's page breaks the whole illusion.
  const residue = P.filter(x => /\\|\/\/\/|\[|\]|GetObject|CheckObject|#X\d|\*[a-z]/i.test(x));
  check(residue.length === 0, 'no gamebook machinery survives in the pages',
    residue.length ? residue[0].slice(0, 60) : 'clean');

  // Recovery is SEQUENTIAL — the account is one document, reassembled in the
  // order it was written, for every captain.
  sandbox.__setPages([]);
  const a = sandbox.__recover(), b = sandbox.__recover(), c = sandbox.__recover();
  check(a === 0 && b === 1 && c === 2, 'pages come back in order', a + ',' + b + ',' + c);
  check(sandbox.__pagesFound().length === 3, 'and the finding is recorded');

  // The account ENDS. Recovery past the last page refuses politely rather than
  // wrapping, duplicating, or inventing a page fifteen.
  sandbox.__setPages(P.map((_, i) => i));
  check(sandbox.__recover() === -1, 'the account ends — there is no page after the last');
  check(sandbox.__pagesFound().length === P.length, 'and completion does not overshoot');

  // A resolved word lead recovers a page alongside the survey.
  sandbox.__setPages([]);
  sandbox.__clearLeads();
  const W = sandbox.__mkLead(1, 0, 0, 'account-probe', 'word');
  sandbox.__resolve(W);
  check(sandbox.__pagesFound().length === 1, 'a word lead recovers the next page',
    sandbox.__pagesFound().length + ' found');

  // The pages survive in the save payload — what you have read outlives the boat.
  sandbox.doSave(true);
  const raw = JSON.parse(sandbox.localStorage.getItem('fathom-save-v1') || '{}');
  check(Array.isArray(raw.pagesFound) && raw.pagesFound.length === 1,
    'the account is in the save', JSON.stringify(raw.pagesFound));
}

console.log(failures === 0 ? '\nALL ITEM CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
