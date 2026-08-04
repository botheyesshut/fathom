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
  '\nfunction __worth(c,k){ return sellPriceTo(c,k); }' +
  '\nfunction __lampR(){ return effLampR(); }' +
  '\nfunction __cultures(){ return CULTURES; }' +
  '\nfunction __hold(){ holdTick(); }' +
  '\nfunction __noise(q,r,l){ noiseMade(q,r,l); }' +
  '\nfunction __see(){ seeAround(); }' +
  '\nfunction __itemsAll(){ return Object.keys(ITEMS); }' +
  '\nfunction __itemFit(k){ return ITEMS[k] && ITEMS[k].fit; }' +
  '\nfunction __hireCost(){ return CREW_HIRE_COST; }' +
  '\nfunction __itemFind(k){ return ITEMS[k] && ITEMS[k].find; }' +
  '\nfunction __itemKind(k){ return ITEMS[k] && ITEMS[k].kind; }' +
  '\nfunction __buyMult(c,k){ return buyMult(c,k); }' +
  '\nfunction __sellTo(c,k){ return sellPriceTo(c,k); }' +
  '\nfunction __buyFrom(c,k){ return buyPriceFrom(c,k); }' +
  '\nfunction __fitcap(){ return FIT_CAP; }' +
  '\nfunction __cv(f){ return corpseValue({ fresh: f }); }' +
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
  // ONE definition of what a way in is, and the game holds it. See the cavern-mark
  // check below for what happened when this file kept a second copy.
  '\nfunction __isWayIn(q,r){ tileAt(q,r); return isWayIn(q,r); }' +
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
  '\nfunction __describe(m){ return describeSpace(m); }' +
  '\nfunction __describeDeck(){ return describeDeck(); }' +
  '\nfunction __scene(){ return sceneForNow(); }' +
  '\nfunction __unfoot(){ state.foot = null; }' +
  '\nfunction __cap(k){ return VP_SCENES[k] ? VP_SCENES[k].cap : null; }' +
  '\nfunction __standIn(q,r,d,k){ const ch=interiorAt(q,r,d,k); if(!ch||!ch.entry) return false; state.alive=true; state.air=9000; state.foot={kind:k,q:q,r:r,d:d,x:ch.entry.x,y:ch.entry.y,crates:0,relics:0,steps:0,tick:0,seen:[],took:[],water:[],closed:[],dweller:null,dead:[]}; return true; }' +
  '\nfunction __wander(){ const f=state.foot; if(!f) return false; const ch=footChunk(); if(!ch) return false; for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){ const k=(f.x+dx)+\',\'+(f.y+dy); if(ch.tiles.has(k) && !(f.seen||[]).includes(k)){ f.seen.push(k); f.x+=dx; f.y+=dy; return true; } } const all=[...ch.tiles.keys()]; const pick=all[(f.steps++*7)%all.length].split(\',\'); f.x=+pick[0]; f.y=+pick[1]; return f.steps<40; }' +
  '\nfunction __spaceClassAt(q,r,d){ return spaceClass(spaceAround(q,r,d)); }' +
  '\nfunction __openCell(q,r,d){ return !!cells.get(cellKey(q,r,d)); }' +
  '\nfunction __runAt(q,r,d){ var c = cellRun(q,r,d); return c ? { ceiling: c.ceiling, floor: c.floor } : null; }' +
  '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
  '\nfunction __clearContacts(){ state.creatures = []; state._contactScene = null; }' +
  '\nfunction __tileAt(q,r){ return tileAt(q,r); }' +
  '\nfunction __put(q,r,d){ state.q=q; state.r=r; state.currentDepth=d;' +
  '\n  state._lastSetKey=null; state._lastSndKey=null; state._lastSpaceClass=null; }' +
  '\nfunction __palette(){ return ANSI16; }' +
  '\nfunction __vpKey(){ return VP_KEY; }' +
  '\nfunction __vpSafe(){ return VP_SAFE; }' +
  '\nfunction __bestiary(){ return BESTIARY; }' +
  '\nfunction __noteCreature(t){ noteCreature(t); }' +
  '\nfunction __rung(t){ return bestiaryRung(t); }' +
  '\nfunction __bestState(){ return state.bestiary || {}; }' +
  '\nfunction __setBest(o){ state.bestiary = o; }' +
  '\nfunction __creatureTough(){ return CREATURE_TOUGH; }' +
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
  // THIS CHECK USED TO ASK THE WRONG FUNCTION. It read `itemWorth`, which the
  // game had stopped calling — face value times the item's own culture's
  // multiplier, with nobody on the other side of the counter. So it passed every
  // run while proving nothing about any price a player can actually be offered.
  // It now asks `sellPriceTo`, which is what the trade window pays out of, and it
  // asks the fuller question: prized ABOVE face, worth LESS to a people who do
  // not care, and worth NOTHING to the people who stock it themselves.
  const idolDagon = sandbox.__worth('dagon', 'idol');
  const idolMariners = sandbox.__worth('mariners', 'idol');
  check(idolDagon > 6, 'a Dagon relic is worth more than its face — its people prize it', 'dagon pays ' + idolDagon);
  check(idolDagon > idolMariners, 'and the mariners, who want no part of it, pay less', 'dagon ' + idolDagon + ' vs mariners ' + idolMariners);
  check(sandbox.__worth('dagon', 'ambergris') === 0, 'nobody buys back their own stock — Dagon sells ambergris and will not take it', 'dagon pays ' + sandbox.__worth('dagon', 'ambergris') + ' for ambergris');
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
  // This hand fell ON the breach, so the S6 leave-guard arms on the first tap.
  // The confirming tap still takes the body up before it hauls you out — the
  // guard delays LEAVING, it never blocks recovering your dead.
  if (s.foot) sandbox.__step(body.x, body.y);
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
    // THE SIX HEX DIRECTIONS ARE THREE AXES: east/west, northeast/southwest,
    // northwest/southeast. This map used to carry north/south instead of
    // northwest/southeast, because CURRENT_NAMES did — and those two names were
    // geometrically wrong: the axial steps [0,-1] and [0,1] come out at -120°
    // and +60°, which `bearing()`, the game's compass of record, calls northwest
    // and southeast. With the names corrected, six of thirty-five bearings
    // looked up `undefined` here and the check failed. The names were the bug.
    const opposite = { east: 'west', west: 'east',
                       northeast: 'southwest', southwest: 'northeast',
                       northwest: 'southeast', southeast: 'northwest' };
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
    // ASK THE GAME WHAT A WAY IN IS. This used to carry its own list — ruin, hull,
    // opening, salvage — and the day a BEACH became a way in (which it plainly is:
    // a mouth in the rock with rooms behind it) this check went to 38 of 58 and
    // accused the chart of lying about something true. A test holding a second copy
    // of a definition will eventually disagree with the first copy, and be wrong.
    if (sandbox.__isWayIn(L.q, L.r)) honest++;
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
  // A scene is either one drawing (`art`) or a loop of them (`frames`). Every
  // frame of every scene must be square, or a single ragged row in frame three
  // shows up once a second and nowhere else.
  const framesOf = (s) => s.frames && s.frames.length ? s.frames : [s.art];
  let bad = [];
  for (const [k, s] of Object.entries(S)) {
    if (!s.art && !(s.frames && s.frames.length)) { bad.push(k + ' has neither art nor frames'); continue; }
    framesOf(s).forEach((f, fi) => {
      if (!f || f.length !== H) { bad.push(k + ' f' + fi + ' rows=' + ((f || []).length)); return; }
      f.forEach((r, y) => { if (r.length !== W) bad.push(k + ' f' + fi + ' y' + y + '=' + r.length); });
    });
    if (s.col) bad.push(k + ' still carries a parallel colour grid');
  }
  check(bad.length === 0, 'every scene is exactly ' + W + 'x' + H, bad.slice(0, 6).join(' · ') || 'clean');

  const pal = sandbox.__palette(), baseKey = sandbox.__vpKey();
  let unkeyed = new Set(), drawn = 0;
  for (const s of Object.values(S)) {
    const key = Object.assign({}, baseKey, s.key || {});
    for (const row of [].concat(...framesOf(s))) for (const g of row) {
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
    const used = new Set([].concat(...framesOf(s)).map(r => r.split('').map(g => key[g])).reduce((x,y)=>x.concat(y),[]));
    for (const pk of (s.pulse || [])) if (!used.has(pk)) deadPulse.push(k + ':' + pk);
  }
  check(deadPulse.length === 0, 'every pulse key names a colour the scene uses',
    deadPulse.join(', ') || 'all live');

  // ANIMATION: a scene that declares frames must actually CHANGE between them,
  // or it is paying the cost of animation and showing a still.
  const still = names.filter(k => {
    const f = S[k].frames;
    if (!f || f.length < 2) return false;
    return f.every(x => x.join('|') === f[0].join('|'));
  });
  check(still.length === 0, 'every animated scene actually moves', still.join(', ') || 'all move');

  // THE GRID ONLY HOLDS IF EVERY GLYPH ADVANCES THE SAME WIDTH, and several
  // obvious-looking block characters do not — they are absent from the
  // monospace face and the browser substitutes a proportional one, silently.
  // Sean caught this as a visibly broken porthole frame on his phone: the
  // quadrant corners measured 28% wide and the silt ridge measured 67% wide.
  // Code review cannot see it. This can.
  const safe = new Set(sandbox.__vpSafe().split(''));
  const strays = new Set();
  for (const s of Object.values(S)) {
    for (const row of [].concat(...framesOf(s))) {
      for (const g of row) if (!safe.has(g)) strays.add(g);
    }
  }
  check(strays.size === 0, 'every drawn glyph is on the measured-uniform whitelist',
    strays.size ? [...strays].join(' ') + '  <- these break the grid' : 'all uniform');
  const animated = names.filter(k => S[k].frames && S[k].frames.length > 1);
  check(animated.length >= 8, 'and there are real animations, not one showpiece', animated.length + ' animated');

  // No scene may be declared twice. The later wins silently and the earlier
  // becomes dead art nobody knows is dead — which is how a caption fix landed
  // on a copy the game never draws.
  {
    const src2 = html;
    const i0 = src2.indexOf('const VP_SCENES');
    const blk = src2.slice(i0, src2.indexOf('\nfunction ', i0));
    const counts = {};
    let mm; const rex = /^\s{2}(\w+):\s*\{/gm;
    while ((mm = rex.exec(blk))) counts[mm[1]] = (counts[mm[1]] || 0) + 1;
    const dup = Object.keys(counts).filter(k => counts[k] > 1);
    check(dup.length === 0, 'no scene is declared twice (the later one silently wins)',
      dup.length ? dup.join(', ') : Object.keys(counts).length + ' scenes, all unique');
  }

  // A CAPTION IS A TITLE, NOT A SENTENCE. This used to demand eight characters, which
  // was a fair proxy for "says what it is" while captions were prose — and rejects a
  // perfectly good title. Measured before the change: 12 of 48 overflowed the 24-column
  // frame and 40 of 48 ran past three words, which is why Sean only ever saw part of one.
  const noCap = names.filter(k => !S[k].cap || !S[k].cap.trim());
  check(noCap.length === 0, 'every scene is captioned', noCap.join(', ') || 'all captioned');
  const tooWide = names.filter(k => (S[k].cap || '').length > 24);
  check(tooWide.length === 0, 'and no caption is wider than the frame',
    tooWide.length ? tooWide.map(k => k + ' (' + S[k].cap.length + ')').join(', ') : 'all inside 24 columns');
  const tooMany = names.filter(k => (S[k].cap || '').trim().split(/\s+/).length > 4);
  check(tooMany.length === 0, 'and none of them is a sentence',
    tooMany.length ? tooMany.map(k => '"' + S[k].cap + '"').join(', ') : 'all four words or fewer');

  // ...IN ONE LINE. These were written as prose by someone who knew nobody
  // would read them, so they grew into clauses with commas. The moment they
  // were rendered — under a picture 24 characters wide — they became two and
  // three lines of cramped type wider than the art itself. A caption under a
  // small picture is a LABEL; 29 characters is what fits on one line at the
  // tile's width, and the picture does the rest.
  const tooLong = names.filter(k => S[k].cap && S[k].cap.length > 29)
    .map(k => k + ' (' + S[k].cap.length + ')');
  check(tooLong.length === 0, 'and says it in one line under the picture',
    tooLong.length ? tooLong.join(', ')
      : 'longest is ' + Math.max(...names.map(k => (S[k].cap || '').length)) + ' chars');

  // ...AND SOMETHING ACTUALLY SHOWS IT. The check above passed for months
  // while `.cap` was read by NOTHING — twenty hand-written captions and the
  // player never saw one. Sean, looking at the wreck illustration: "I still
  // don't know what it is. I think it's a monster?" That is what a check on
  // data nobody consumes buys you: a green tick over a dead feature.
  //
  // Asserting the field exists is not the same as asserting it reaches the
  // player, and this suite has now shipped that mistake in three different
  // forms. The source must READ it.
  // ...AND THE RULING CHANGED, so this check changed with it.
  //
  // It used to demand that something RENDER the caption, because for months
  // `.cap` was read by nothing — twenty hand-written captions the player never
  // saw, with a green tick over them. That was the right check for that bug.
  //
  // Sean has since looked at it on the phone and ruled the other way: "The
  // porthole ... I think the captions should just go away. They're too small to
  // be legible." He is right — 0.62rem inside a tile 24 characters wide. So the
  // caption is deliberately not drawn, and `cap` is DOCUMENTATION now: it is
  // what each drawing is meant to be, it is how the checks above can tell a
  // cave scene from a hull scene, and it must stay short and accurate for that
  // reason alone. What must NOT come back is a caption rendered too small to
  // read, so that is what this asserts.
  const src = html;
  const capRendered = /vp-cap/.test(src);
  check(!capRendered, 'the caption is not drawn — it was illegible on a phone and was cut',
    capRendered ? 'IT IS BACK: #vp-cap is in the source again' : 'no #vp-cap anywhere');
  check(Object.keys(sandbox.__scenes()).every(k => typeof sandbox.__scenes()[k].cap === 'string'),
    '...but every scene still carries one, because the suite reads them to tell the drawings apart',
    Object.keys(sandbox.__scenes()).length + ' scenes described');

  // And the selector must always land on a scene that exists, whatever the
  // state — an unknown key would leave the panel frozen on the last picture.
  const picked = sandbox.__sceneNow();
  check(!!S[picked], 'the scene chosen for the current state is one that exists', picked);
}

//--- 19. (was THE ACCOUNT) ------------------------------------------------
// The account — verbatim excerpts from Sean's 2016 gamebook THE DARK WAY
// DOWN, awarded a page at a time by word leads — has been removed from the
// game. He hit the button expecting the story so far and got a passage about
// plywood: it is a different game's prose, in a different voice and a
// different stance, and it read as one. His call: "Let's strip all that out
// for now." The text is his and it is safe in the gamebook; nothing of it is
// lost by not being here.

//--- 20. THE BESTIARY: knowledge earned by surviving -------------------------
{
  console.log('\n--- 20. THE BESTIARY ---');
  const B = sandbox.__bestiary();

  // Every creature the game can actually put in the water needs an entry, or
  // the player meets something the bestiary cannot name.
  const inWater = Object.keys(sandbox.__creatureTough());
  const missing = inWater.filter(k => !B[k]);
  check(missing.length === 0, 'every creature in the game has an entry', missing.join(', ') || 'all covered');
  check(!!B.rival, 'and so does a rival boat, which is a creature by every mechanic that matters');

  // Each entry must carry all three rungs, and the last one must be USEFUL —
  // the whole point is teaching the sound grammar nothing else teaches.
  const thin = Object.keys(B).filter(k => !B[k].heard || !B[k].seen || !B[k].known || B[k].known.length < 40);
  check(thin.length === 0, 'every entry has all three rungs and a real lesson at the end',
    thin.join(', ') || 'all complete');

  // It fills in by CONTACT, and only crosses a rung when it is earned.
  sandbox.__setBest({});
  check(sandbox.__rung('lurker') === 0, 'an unmet creature is unknown');
  sandbox.__noteCreature('lurker');
  check(sandbox.__rung('lurker') === 1, 'one contact records that you heard it');
  sandbox.__noteCreature('lurker'); sandbox.__noteCreature('lurker');
  check(sandbox.__rung('lurker') === 2, 'three contacts earn what it looks like');
  for (let i = 0; i < 3; i++) sandbox.__noteCreature('lurker');
  check(sandbox.__rung('lurker') === 3, 'six contacts earn the thing that saves you');

  // It never runs away with itself, and unknown types are ignored rather than
  // creating phantom entries.
  for (let i = 0; i < 50; i++) sandbox.__noteCreature('lurker');
  check(sandbox.__rung('lurker') === 3, 'and it tops out there — no fourth rung to grind for');
  sandbox.__noteCreature('not-a-creature');
  check(!sandbox.__bestState()['not-a-creature'], 'an unknown type records nothing');

  // Knowledge is campaign-level: it survives the boat, like the bank.
  sandbox.doSave(true);
  const raw = JSON.parse(sandbox.localStorage.getItem('fathom-save-v1') || '{}');
  check(raw.bestiary && raw.bestiary.lurker > 0, 'the bestiary is in the save',
    JSON.stringify(raw.bestiary || {}).slice(0, 60));
}

//--- 21. CROSS-TABLE ARBITRAGE: trade routes, not money printers -------------
{
  console.log('\n--- 21. CROSS-CULTURE TRADE ---');
  const C = sandbox.__cultures();
  const keys = Object.keys(C);
  const items = sandbox.__itemsAll();

  // THE PRINTER GUARD, which this suite has never had. The existing checks only
  // ever looked at ONE table at a time — no buyback, no same-table profit — and
  // both of those passed on the day cultures were printing money across tables.
  // The rule: nobody may PAY more for a thing than anyone else SELLS it for.
  // Only where the seller ACTUALLY STOCKS the item — buyPriceFrom() will quote
  // a notional price for anything you ask about, so asking it about goods a
  // people does not carry invents trades that cannot happen.
  const printers = [];
  for (const seller of keys) {
    for (const it of (C[seller].sells || [])) {
      const sp = sandbox.__buyFrom(seller, it);        // what it costs you to buy
      if (!sp || sp <= 0) continue;
      for (const buyer of keys) {
        const bp = sandbox.__sellTo(buyer, it);        // what you are paid for it
        if (!bp || bp <= 0) continue;
        if (bp >= sp) printers.push(it + ': buy from ' + seller + ' @' + sp + ', sell to ' + buyer + ' @' + bp
          + (bp > sp ? ' = +' + (bp - sp) : ' = BREAK-EVEN'));
      }
    }
  }
  check(printers.length === 0, 'no item can be bought from one people and sold back to another at a profit OR AT COST',
    printers.slice(0, 4).join(' | ') || 'no printers, no break-evens');

  // A DECLARED APPETITE THAT CAN NEVER BE HONOURED. `buyMult` returns 0 for
  // anything a people also sells — the guard that killed the idol faucet — so
  // naming an item in `buys.keys` that also appears in `sells` is a want the
  // code silently voids. Harmless today because the trade panel filters on the
  // real price; a printer the day someone edits that `sells` line. The check is
  // on named keys only: `kinds` is a broad category and a people may reasonably
  // buy a class of thing while selling three specific members of it.
  const liars = [];
  for (const c of keys) {
    const sells = new Set(C[c].sells || []);
    for (const k of ((C[c].buys || {}).keys || [])) if (sells.has(k)) liars.push(c + ' declares it wants ' + k + ' and also sells it');
  }
  check(liars.length === 0, 'no people declares an appetite the code voids', liars.join(' | ') || 'every named want is real');

  // A FITTING CANNOT BE UN-FITTED OR SOLD. A slot missing from FIT_CAP falls
  // through to a cap of 2, so a one-of-a-kind instrument could be bolted on
  // twice and the second one was a whole find thrown into the sea.
  const caps = sandbox.__fitcap();
  const slots = [...new Set(items.map(k => sandbox.__itemFit(k)).filter(Boolean))];
  check(slots.length >= 4, 'the fitting slots are actually being read', slots.length + ' slots: ' + slots.join(', '));
  const uncapped = slots.filter(f => caps[f] === undefined);
  check(uncapped.length === 0, 'every fitting slot declares its own ceiling',
    uncapped.length ? 'falls through to 2: ' + uncapped.join(', ')
                    : slots.map(f => f + '=' + caps[f]).join(', '));

  // A HAND MUST NOT BE WORTH MORE DEAD THAN HIRED. Sign-on was 5 crates and a
  // fresh body fetched 14: hire, kill, sell, repeat, +9 a head, and the only
  // cost was being the kind of captain who does that.
  const freshBody = sandbox.__cv(60), signOn = sandbox.__hireCost();
  check(freshBody > 0 && signOn > 0, 'the corpse trade and the hiring hall are both real numbers',
    'body ' + freshBody + ', sign-on ' + signOn);
  check(freshBody < signOn, 'a crewman is worth less dead than the price of hiring one',
    'fresh body ' + freshBody + ' cr vs ' + signOn + ' cr sign-on');

  // AND THE OPPOSITE FAILURE. Three peoples with differential valuation are
  // pointless if a hold of salvage is worth the same everywhere — the handoff
  // recorded that cross-culture arbitrage did not exist AT ALL, which made the
  // cultures flavour rather than economy.
  let differentiated = 0, unsellable = [];
  for (const it of items) {
    const prices = keys.map(k => sandbox.__sellTo(k, it) || 0);
    const hi = Math.max(...prices), lo = Math.min(...prices.filter(x => x > 0).concat([Infinity]));
    if (hi <= 0) { unsellable.push(it); continue; }
    if (lo !== Infinity && hi >= lo * 1.5) differentiated++;
  }
  // Proportional, not a magic number. I first wrote `>= 8` before knowing how
  // many saleable finds there even are — there are twelve, so eight was a
  // threshold picked in ignorance. What matters is that MOST of what you can
  // sell is worth carrying to a particular table.
  const saleable = items.filter(k => sandbox.__itemFind(k)
    && ['valuable', 'key', 'chart'].indexOf(sandbox.__itemKind(k)) >= 0).length;
  check(differentiated >= Math.ceil(saleable / 2),
    'most saleable finds are worth markedly more at one table than another',
    differentiated + ' of ' + saleable + ' pay 50%+ more at the best table than the worst');

  // Every findable thing should have SOMEBODY who wants it, or it is drop-table
  // dilution — the audit flagged hatchkey and bonekey as exactly this.
  // Only goods whose PURPOSE is to be sold. A patchkit or a flask of air is
  // meant to be used up, and wanting a buyer for one is a category error — but
  // a valuable or a key with no market anywhere is pure drop-table dilution,
  // which is exactly what the audit flagged for hatchkey and bonekey.
  const forSale = items.filter(k => sandbox.__itemFind(k)
    && ['valuable', 'key', 'chart'].indexOf(sandbox.__itemKind(k)) >= 0);
  const orphans = forSale.filter(k => keys.every(c => !(sandbox.__sellTo(c, k) > 0)));
  check(orphans.length === 0, 'every findable VALUABLE, key and chart has a buyer somewhere',
    orphans.join(', ') || forSale.length + ' saleable finds, all with a market');
}

//--- 23. A DRILL CORE IS NOT A ROOM ----------------------------------------
//
// Sean: "it's terrifying to me that you're still thinking in terms of
// 'columns'. that's been a source of endless grief for this project."
//
// He is right, and it is a habit rather than a bug — which is why a comment
// was not going to hold it. Measuring the habit split it in two:
//
//   WHERE A THING RESTS is genuinely a column question. Gravity is vertical, a
//   hull falls until it meets rock, and walking one hex straight down answers
//   "what is directly under this" exactly. That code is fine.
//
//   WHAT KIND OF PLACE THIS IS is NOT. The space is a branching network — a
//   flood fill from a prize reaches 400-900 hexes whose floors spread over
//   1,500 m — so a hex's own vertical extent is a fact about a drill core, and
//   reading one to describe a room is how "the shaft climbs out of sight
//   above" got said in open water, and how the porthole drew a lid over a
//   cathedral 20 times in 576.
//
// So: anything that DESCRIBES the space must agree with the space. If the
// water opens far above one hex away, the boat may not call it a roof.
{
  console.log('\n--- 23. A DRILL CORE IS NOT A ROOM ---');
  let roofs = 0, wrong = 0, firstBad = null, sampled = 0;
  const seen = new Set();
  for (const seed of [4242, 1337]) {
    sandbox.__seed(seed);
    sandbox.__tileAt(0, 0);
    for (let q = -13; q <= 13; q++) for (let r = -13; r <= 13; r++) {
      const t = sandbox.__tileAt(q, r);
      if (!t || t.wall || t.land) continue;
      for (let d = 120; d < 2400; d += 120) {
        if (!sandbox.__openCell(q, r, d)) continue;
        sandbox.__put(q, r, d);
        sandbox.__clearContacts();
        const sc = sandbox.__sceneNow();
        seen.add(sc);
        sampled++;
        if (sc !== 'roof') continue;
        roofs++;
        // How high does the water go ONE HEX AWAY at this depth? If it opens
        // hundreds of metres up next door, this is an overhang in a large
        // space, not a lid.
        let maxUp = 0;
        for (const n of sandbox.__nbrs(q, r)) {
          const run = sandbox.__runAt(n.q, n.r, d);
          if (run) maxUp = Math.max(maxUp, d - run.ceiling);
        }
        if (maxUp >= 240) {
          wrong++;
          if (!firstBad) firstBad = 'roof at ' + q + ',' + r + ' @' + d + 'm while water rises ' + maxUp + ' m one hex away';
        }
      }
    }
  }
  // No vacuous pass: this check is worthless if it never sampled a roof.
  check(roofs >= 100, 'the roof check is actually finding roofs',
    roofs + ' roof scenes out of ' + sampled + ' sampled; scene kinds seen: ' + [...seen].sort().join('/'));
  check(wrong === 0, 'the porthole never calls a cathedral a lid',
    wrong ? wrong + '/' + roofs + ' — ' + firstBad : 'clean across ' + roofs + ' roof scenes');

  // AND IT NEVER CALLS THE SKY A ROOF.
  //
  // Sean dove one step into the starting sinkhole. The sounding said "Open
  // water 60 m above, 780 m below" and the picture said "rock overhead" —
  // because the run reached the SURFACE, so `above` was 60 and passed a test
  // written for rock. The game already draws this distinction for cavern lakes
  // ("a surface needs air over the water, not merely rock over your head");
  // the scene picker simply was not asking.
  //
  // This is the third time the picture has contradicted the sounding, so the
  // rule is stated as the invariant rather than the instance: if the water you
  // are in reaches the surface, there is nothing overhead but weather.
  let skyRoofs = 0, firstSky = null, skySamples = 0;
  for (const seed of [4242, 1337]) {
    sandbox.__seed(seed);
    sandbox.__tileAt(0, 0);
    for (let q = -13; q <= 13; q++) for (let r = -13; r <= 13; r++) {
      const t = sandbox.__tileAt(q, r);
      if (!t || t.wall || t.land) continue;
      for (let d = 60; d < 1200; d += 60) {
        if (!sandbox.__openCell(q, r, d)) continue;
        const run = sandbox.__runAt(q, r, d);
        if (!run || run.ceiling > 0) continue;      // only water open to the sky
        skySamples++;
        sandbox.__put(q, r, d);
        sandbox.__clearContacts();
        if (sandbox.__sceneNow() === 'roof') {
          skyRoofs++;
          if (!firstSky) firstSky = q + ',' + r + ' @' + d + 'm, water reaches the surface';
        }
      }
    }
  }
  check(skySamples >= 100, 'the sky check is actually finding water open to the surface',
    skySamples + ' depths sampled in surface-connected water');
  check(skyRoofs === 0, 'and it never calls the sky a roof',
    skyRoofs ? skyRoofs + '/' + skySamples + ' — ' + firstSky : 'clean across ' + skySamples + ' samples');
}

//--- 22. THE BOAT DOES NOT DESCRIBE A CAVE IT IS NOT IN ---------------------
//
// Sean found this three times, in three different clauses, and the third time
// he wrote: "i feel like I'm never going to be rid of this problem." He was
// right, and the reason is that I kept fixing the sentences he quoted instead
// of the class they came from.
//
// A room description assembles from several pools, and every one of them was
// written with a cave in mind and then used everywhere. So in open water, with
// no wall inside a hundred metres, the boat said "passages run off in four
// directions", and when that was fixed, "the shaft climbs out of sight above",
// and under that, "no wall on any side of you" — which is accurate and STILL
// puts a wall in the reader's head.
//
// So the rule is absolute, because an absolute rule is the only kind that
// cannot be broken by accident: IN OPEN WATER, NO ROCK NOUNS AT ALL, not even
// to deny them. Measured before the fix: 22 distinct offending sentences,
// 2,149 offences across 4,508 samples.
//
// AND THIS CHECK HAD A HOLE THE SIZE OF THE FIRST IMPRESSION.
//
// `describeSpace('ask')` opens with `if (asked) mode = 'again'`. This section
// only ever called `__describe('ask')`, so for its whole life it read
// SPACE_AGAIN and nothing else — while SPACE_FIRST, the paragraph printed on
// FIRST entry to every hex, the first sentence a player reads anywhere new,
// was never measured once. 2,857 offences across 5,112 samples were sitting
// behind that one line.
//
// The regex was short too. `room`, `cavern`, `ceiling`, `vault` and
// `underground` all put architecture in the reader's head and none were
// listed. `room` needs care — "room to move" and "room to spread out" are
// quantity, not architecture — so it is matched only as a noun phrase.
{
  console.log('\n--- 22. OPEN WATER IS NOT A CAVE ---');
  const ROCK = /\b(shaft|passage|passages|throat|throats|rock|stone|wall|walls|roof|tunnel|corridor|cave|cavern|chamber|vault|hollow|seam|blind|ceiling|underground)\b/i;
  // "a great flooded room", "the big room" — architecture. "room to move",
  // "room for other things" — quantity. Only the first kind is a lie.
  const ROOM = /\b(?:the|a|an|another|great|big|wide|vast|enormous|flooded|same)\s+(?:\w+\s+){0,2}rooms?\b/i;
  const offends = (line) => ROCK.test(line) || ROOM.test(line);
  const offences = new Map();
  let samples = 0;
  const modesSeen = new Set();
  const classesSeen = new Set();
  for (const seed of [4242, 90210, 1337]) {
    sandbox.__seed(seed);
    sandbox.__tileAt(0, 0);
    for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
      const t = sandbox.__tileAt(q, r);
      if (!t || t.wall || t.land) continue;
      for (let d = 0; d < 1200; d += 60) {
        if (!sandbox.__openCell(q, r, d)) continue;
        const cls = sandbox.__spaceClassAt(q, r, d);
        classesSeen.add(cls);
        if (cls !== 'expanse' && cls !== 'surface') continue;
        sandbox.__put(q, r, d);
        // BOTH MODES. 'first' is the paragraph on arrival; 'ask' is the LOOK
        // button, which internally becomes 'again'. Reading only one of them
        // is how half this pool went unmeasured for its entire life.
        for (const mode of ['first', 'ask']) {
          samples++;
          modesSeen.add(mode);
          for (const sentence of sandbox.__describe(mode).split(/(?<=\.)\s+/)) {
            if (offends(sentence)) offences.set(sentence, (offences.get(sentence) || 0) + 1);
          }
        }
      }
    }
  }
  // NO VACUOUS PASS. This suite has already shipped two assertions that were
  // green because they measured nothing. A rock-noun check that sampled zero
  // open-water hexes would be the third, and it would be the most convincing
  // of the three.
  check(samples >= 300 && modesSeen.size === 2,
    'the open-water check is actually reading open water, in BOTH modes',
    samples + ' descriptions across 3 seeds; modes: ' + [...modesSeen].sort().join('+')
      + '; space kinds seen: ' + [...classesSeen].sort().join('/'));
  const ranked = [...offences.entries()].sort((a, b) => b[1] - a[1]);
  check(ranked.length === 0, 'no rock noun appears in a description of open water',
    ranked.length
      ? ranked.length + ' distinct: ' + ranked.slice(0, 20).map(x => x[1] + 'x "' + x[0].slice(0, 60) + '"').join(' | ')
      : 'clean across ' + samples + ' descriptions');
}

//--- 24. A CAVE IS NOT A SUBMARINE -------------------------------------------
// The same disease as SS22 and SS23, one layer in. Those two guard the water and
// the porthole; nothing guarded the prose ASHORE, and the on-foot layer now has
// three kinds of place that were all being described by one set of sentences
// written for a rusted metal interior.
//
// Measured before the fix: `describeDeck()` was byte-identical across ruin,
// hull, cave and deepruin over 259,215 samples. "Plate underfoot" in a natural
// cave. "A corner of the structure" in something nobody built. And a flat lie —
// "No water yet, though you can hear it working somewhere behind you" — in the
// one kind of place where nothing is coming, by design.
//
// The rule, stated so it cannot be broken by accident: a description of a CAVE
// may not use a shipwright's noun or an architect's, and a description of a
// BOAT may not call her a building.
{
  console.log('\n--- 24. A CAVE IS NOT A SUBMARINE ---');
  // Nouns that mean somebody built this out of metal, or out of stone.
  const BUILT = /\b(plate|plating|deck|deckhead|bulkhead|coaming|rivets?|hull|compartments?|corridors?|masonry|dressed stone|laid stone|structure|building|tower|doorway|stairs?)\b/i;
  const CARVED = /\b(sand|rock|stone|cavern|grotto)\b/i;
  const lines = { cave: new Map(), hull: new Map(), ruin: new Map() };
  let walks = 0;
  const seeds = [4242, 90210];
  for (const seed of seeds) {
    sandbox.__seed(seed);
    for (const kind of ['cave', 'hull', 'ruin']) {
      for (let i = 0; i < 40; i++) {
        const q = (i * 7) % 30 - 15, r = (i * 13) % 30 - 15, d = 60 + (i % 8) * 60;
        if (!sandbox.__standIn(q, r, d, kind)) continue;
        walks++;
        // Walk the deck and collect every LOOK it will give.
        for (let step = 0; step < 12; step++) {
          const txt = sandbox.__describeDeck();
          if (txt) for (const sentence of txt.split(/(?<=\.)\s+/)) {
            lines[kind].set(sentence, (lines[kind].get(sentence) || 0) + 1);
          }
          if (!sandbox.__wander()) break;
        }
      }
    }
  }
  const n = k => lines[k].size;
  check(walks >= 60 && n('cave') > 3 && n('hull') > 3 && n('ruin') > 3,
    'the ashore-prose check is really walking all three kinds',
    walks + ' decks walked; distinct lines — cave ' + n('cave') + ', hull ' + n('hull') + ', ruin ' + n('ruin'));

  // A cave described as though somebody built it.
  const caveBuilt = [...lines.cave.keys()].filter(l => BUILT.test(l));
  check(caveBuilt.length === 0,
    'nothing describes a cave as though somebody built it',
    caveBuilt.length ? caveBuilt.length + ' distinct: ' + caveBuilt.slice(0, 4).map(x => '"' + x.slice(0, 58) + '"').join(' | ')
                     : 'clean across ' + n('cave') + ' distinct lines');

  // A boat described as a building — and the three kinds must not be identical,
  // which is the check that would have caught the original.
  const sameAsCave = [...lines.hull.keys()].filter(l => lines.cave.has(l));
  check(n('hull') > 0 && sameAsCave.length < n('hull'),
    'a wrecked boat and a cave do not read as the same place',
    sameAsCave.length + ' of ' + n('hull') + ' hull lines also appear in a cave');
  const ruinSameAsCave = [...lines.ruin.keys()].filter(l => lines.cave.has(l));
  check(n('ruin') > 0 && ruinSameAsCave.length < n('ruin'),
    'and neither do a sunken building and a cave',
    ruinSameAsCave.length + ' of ' + n('ruin') + ' ruin lines also appear in a cave');

  // The specific lie, named, because it is the one a player can catch the game in.
  const promisesWater = [...lines.cave.keys()].filter(l => /hear it working|no water yet|rising|the sea has found/i.test(l));
  check(promisesWater.length === 0,
    'and a cave never promises water that is not coming',
    promisesWater.length ? promisesWater.map(x => '"' + x.slice(0, 60) + '"').join(' | ') : 'clean');
}

//--- 25. AND THE PICTURE AGREES WITH THE PROSE -------------------------------
// render() carries the law: "the picture can never disagree with the prose — a
// wrong illustration is worse than none." The on-foot branch of `sceneForNow`
// had exactly two cases, hull and everything-else, so a captain standing on
// sand in a random-walk rock cavern was shown squared masonry captioned "a
// tower, still standing" — two lines after the log said there was not a door in
// the whole of it. Found independently by two audits, which is usually the sign
// a player would have found it first.
{
  console.log('\n--- 25. THE PORTHOLE DRAWS THE PLACE YOU ARE IN ---');
  const BUILT_SCENE = /^(ruin|ruintower|ruinwall|hullbreak|hullup|hullside)$/;
  const byKind = {};
  for (const kind of ['cave', 'cave1', 'cave2', 'hull', 'ruin', 'deepruin']) {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      sandbox.__standIn(i * 3 - 20, -i, 300, kind);
      const sc = sandbox.__scene();
      if (sc) seen.add(sc);
    }
    byKind[kind] = [...seen].sort();
  }
  sandbox.__unfoot();
  const caveScenes = [...new Set([].concat(byKind.cave, byKind.cave1, byKind.cave2))];
  check(caveScenes.length >= 2 && byKind.hull.length >= 2 && byKind.ruin.length >= 2,
    'the scene check is really getting scenes for every kind',
    Object.keys(byKind).map(k => k + ':' + byKind[k].length).join(' '));
  const wrong = caveScenes.filter(sc => BUILT_SCENE.test(sc));
  check(wrong.length === 0,
    'a cave is never drawn as something somebody built',
    wrong.length ? 'drew ' + wrong.join(', ') + ' in a cave' : 'cave faces: ' + caveScenes.join(', '));
  check(byKind.hull.every(sc => /^hull/.test(sc)),
    'and a wrecked boat is always drawn as a boat', byKind.hull.join(', '));
  // The sand is only behind you at the MOUTH. Three chambers in there is no
  // beach and no boat to draw.
  check(byKind.cave1.indexOf('cavebeach') < 0 && byKind.cave2.indexOf('cavebeach') < 0,
    'and the boat is only in the picture where the boat actually is',
    'cave1: ' + byKind.cave1.join(', '));
  // Every caption must still fit the porthole on a 360px phone.
  // A GUARD ON A FIELD NOTHING RENDERS. `cap` is read by no line in the game —
  // the caption renderer came out when Sean said they were too small to read.
  // The check is kept because the strings are kept and a caption may return
  // somewhere legible, but it is not protecting anything a player can see
  // today, and it should not be read as evidence that captions work.
  const long = caveScenes.map(sc => [sc, sandbox.__cap(sc)]).filter(x => (x[1] || '').length > 29);
  check(long.length === 0, 'and every new caption fits the frame',
    long.length ? long.map(x => x[0] + ' ' + x[1].length).join(', ')
                : caveScenes.map(sc => (sandbox.__cap(sc) || '').length).join('/') + ' chars');
}

console.log(failures === 0 ? '\nALL ITEM CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
