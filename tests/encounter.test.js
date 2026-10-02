// THE ENCOUNTER, IN CARDS. `node tests/encounter.test.js`
//
// Sean, 2026-10-02: "We'll have pop-up cards like Pirates! used ... make the
// decisions 'approach the vessel' and 'slip away.' If user approaches, have a
// slightly different animation suitable to match the new information gained,
// which will include the apparent faction of the craft, its likely armaments,
// and the user's current relationship to that faction ... If the faction is
// angry at the user, the captain should be informed that the NPC ship is
// 'coming about, sir.' The user should get one more chance to evade, this one
// somewhat diminished, before combat ensues."
//
// The cards are a front end on rules that were already here — a sighting that
// does not name her, colours read by closing, a hunter that comes for you, an
// attack with return fire — so what this file holds is the FLOW, and the three
// numbers it added:
//
//   1. A sail sighted on the surface puts a card on the table, with the bare
//      hull on it and two choices. Under water it does not.
//   2. Slipping away always works on a hull that means no harm or has not seen
//      you; three times in four on one that has.
//   3. A hunter does not turn before the card is answered, and when she turns
//      the Mate says "coming about, sir".
//   4. Breaking away after that works two times in five — the thinner chance.
//   5. Approach is a chase on the chart, and ends in her colours: whose she is,
//      her guns, your standing, and the Mate's arithmetic.
//   6. The action is the old attack, a round at a time, and diving out of it
//      costs one salvo.
//   7. Every hull a fleet can sail has both pictures.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0; if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {}; return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'fathom-chart.html'), 'utf8');
const script = src.match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '3', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {}; return mk(); } });
// MONOTONIC, NOT FROZEN — see save.test.js for why a stopped clock is wrong here.
let clock = 1754265600000; const mem = {}; const L = [];
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (clock += 1000) : t[p]; } });
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; sb.__L = L; vm.createContext(sb);
vm.runInContext(script + [
  ';gameStarted = true; tipsOn = false;',
  'const __log0 = log; log = function (t, c, e) { __L.push({ t: String(t), c: c || "", e: e || "" }); return __log0.apply(this, arguments); };',
  // An ocean, and then a boat alone in the middle of a stretch of it: no harbours
  // to send traffic, nothing in the water, a named Mate, three fish in the racks.
  'function __world(s) { worldSeed = s; interiorSalt = ":" + s; interiorCache.clear(); rng = mulberry32(s); resetWorldCaches(); spawnedChunks.clear(); tileAt(0, 0); }',
  'function __openSea() { for (let k = 14; k < 60; k += 3) for (const [dq, dr] of [[-1,0],[0,-1],[1,-1],[-1,1]]) { const q = dq * k, r = dr * k; let ok = true;',
  '  for (let a = -12; a <= 12 && ok; a++) for (let b = Math.max(-12, -a - 12); b <= Math.min(12, -a + 12); b++) { const t = tileAt(q + a, r + b); if (!t || t.wall || !cells.has(cellKey(q + a, r + b, 0))) { ok = false; break; } }',
  '  if (ok) return { q, r }; } return null; }',
  'function __boat(q, r) {',
  '  revealed.clear(); visited.clear(); ports.clear(); state.creatures = []; state.threats = []; state.ships = []; state.enclaves = []; state.leads = [];',
  '  state.poisFound = []; state.items = {}; state.fits = {}; state.relics = 0; state.foot = null; state.hunt = null; state.travel = null; state.autoTarget = null; state.passage = null;',
  '  state.standing = {}; state.allies = []; state.commission = null; state.hailed = []; state.cargo = 0;',
  '  state.alive = true; state.moves = 100; activeSubKey = "erebus"; state.hull = SUBS.erebus.hull; state.air = SUBS.erebus.air; state.water = 100;',
  '  state.torpedoes = 3; state.armament = "harpoon";',
  '  state.crew = [{ name: "Osei", role: "ear", xp: 2, conditions: [], nerve: 70 }, { name: "Ito", role: "hand", xp: 0, conditions: [], nerve: 70 }];',
  '  state.q = q; state.r = r; state.currentDepth = 0; cardNow = null; cardHold = false; introduced.clear();',
  '  for (let a = -3; a <= 3; a++) for (let b = Math.max(-3, -a - 3); b <= Math.min(3, -a + 3); b++) revealAt(q + a, r + b, 0);',
  '}',
  // A hull put on the water by hand, off the boat\'s own quarter, bound away across her bows.
  'function __ship(hull, culture, dist, id, away) { const st = shipStats(culture, hull);',
  '  const sh = { id: id || ("t" + Math.random()), hull: hull, culture: culture, q: state.q + (away ? dist : -dist), r: state.r, toQ: state.q + 60, toR: state.r - 30,',
  '    fromName: "Somewhere", toName: "Elsewhere", hp: st.hull, prog: 0, seen: false, followed: false };',
  '  state.ships.push(sh); ports.clear(); return sh; }',
  'function __card() { return cardNow; }',
  'function __labels() { return cardNow ? cardNow.choices.map(c => c.label) : []; }',
  'function __pick(label) { const i = cardNow ? cardNow.choices.findIndex(c => c.label === label) : -1; if (i < 0) return false; cardPick(i); return true; }',
  'function __body() { return cardNow ? cardNow.body.join(" ").replace(/<[^>]+>/g, " ") : ""; }',
  'function __turn() { ports.clear(); state.moves++; shipsTick(); }',
  'function __chase() { let n = 0; while (state.travel && n++ < 60) { ports.clear(); travelStep(); } return n; }',
  'function __pairs() { const out = []; for (const cu in FLEETS) for (const h in FLEETS[cu].mix) out.push([cu, h]); return out; }',
  'var __X = { state, shipsTick, shipHunting, shipMeansHarm, shipStats, shipScenes, vpPaint, hexDistance, standingBand, nudgeStanding, attackFromButton, closeOnShip,',
  '  VP_SCENES, CULT_MARK, HULLS, CULTURES, SLIP_ODDS, BREAK_ODDS, WEAPONS, changeDepth, activeSub, gunsSeen };',
].join('\n'), sb, { timeout: 600000 });
const X = sb.__X, S = X.state;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};
const said = () => L.map(l => l.t);
const dist = (sh) => X.hexDistance(sh, { q: S.q, r: S.r });
const kind = () => (sb.__card() || {}).kind || null;

console.log('THE ENCOUNTER, IN CARDS — a front end on the sea that was already there\n');

sb.__world(20261002 + 9173);
const sea = sb.__openSea();
if (!sea) { console.log('  FAIL  no stretch of open sea in this world to stage it on'); process.exit(1); }
const fresh = () => { sb.__boat(sea.q, sea.r); L.length = 0; };

//--- 1. SAIL HO ---------------------------------------------------------------
console.log('--- 1. A SAIL SIGHTED PUTS A CARD ON THE TABLE ---');
fresh();
let sh = sb.__ship('merchant', 'mariners', 6);
X.shipsTick();
let c = sb.__card();
check(kind() === 'sail', 'a sail sighted on the surface opens a card', c ? c.title : 'no card');
check(!!c && c.scene === 'shipmerchant' && !c.flag, 'with the bare hull on it — her class by her lines, nobody’s colours', c ? c.scene + ', flag ' + c.flag : '');
check(sb.__labels().join(' | ') === 'Approach the vessel | Slip away', 'and the two decisions he asked for by name', sb.__labels().join(' | '));
check(/Sail ho, sir/.test(sb.__body()) && !/Mariner|carrying trade/i.test(sb.__body()), 'the Mate reports it, and the card does not say whose she is', sb.__body().slice(0, 80));
fresh();
X.changeDepth(X.activeSub().diveStep);
sh = sb.__ship('merchant', 'mariners', 3);
X.shipsTick();
check(S.currentDepth > 0 && !sb.__card(), 'under water a hull is screws on the sonar, and no card', said().filter(t => /Screws/.test(t))[0] || 'nothing heard');

//--- 2. SLIP AWAY ---------------------------------------------------------------
console.log('\n--- 2. SLIP AWAY: THE FIRST CHANCE, AND THE GOOD ONE ---');
fresh();
sh = sb.__ship('merchant', 'mariners', 6);
X.shipsTick();
sb.__pick('Slip away');
check(sh.evaded === true && !sb.__card(), 'a hull that means no harm is simply left behind', 'card closed');

const angry = () => { S.standing = { libertines: -80 }; };
// A Con-Fed warship that hunts you, sighted at nine (she steps in from ten as she is sighted): outside her lookouts (eight).
let got = 0;
for (let i = 0; i < 40; i++) { fresh(); angry(); sh = sb.__ship('naval', 'libertines', 10); X.shipsTick(); sb.__pick('Slip away'); if (sh.evaded && !sh.chasing) got++; }
check(got === 40, 'from a hunter who has not seen you yet, it cannot fail', got + ' of 40 at nine hexes, her lookouts reaching ' + X.shipStats('libertines', 'naval').ear);
// The same hull at five: she has you in her glass.
let slipped = 0, about = 0; const N = 400;
for (let i = 0; i < N; i++) { fresh(); angry(); sh = sb.__ship('naval', 'libertines', 5); X.shipsTick(); sb.__pick('Slip away'); if (sh.evaded) slipped++; else if (kind() === 'about' && sh.chasing) about++; }
check(Math.abs(slipped / N - X.SLIP_ODDS) < 0.07 && slipped + about === N, 'inside her lookouts it works three times in four, and the fourth time she turns',
  slipped + ' slipped, ' + about + ' came about, of ' + N + ' (' + Math.round(100 * slipped / N) + '% against ' + Math.round(100 * X.SLIP_ODDS) + '%)');

//--- 3. COMING ABOUT ------------------------------------------------------------
console.log('\n--- 3. "SHE IS COMING ABOUT, SIR" ---');
fresh(); angry();
sh = sb.__ship('naval', 'libertines', 5);
X.shipsTick();
check(kind() === 'sail' && !sh.chasing, 'a hunter does not turn on the tick she is sighted: the captain gets the card first', 'chasing: ' + !!sh.chasing);
// The card is never answered and a turn goes by: now she may.
sb.cardNow = null; L.length = 0;
sb.__turn();
check(sh.chasing === true && kind() === 'about', 'left alone, she comes about on the next turn', kind());
check(said().some(t => /coming about, sir/.test(t)), 'and the Mate says it in the words asked for', said().filter(t => /coming about/.test(t))[0]);
check(/No colours yet/.test(sb.__body()) && !/Con-Fed/i.test(sb.__body()), 'at five hexes there are no colours to read, and the card names nobody', sb.__body().slice(0, 100));
check(sb.__labels().join(' | ') === 'Stand and fight | Break away', 'two answers: stand, or one more chance', sb.__labels().join(' | '));
fresh(); angry(); S.torpedoes = 0; S.armament = null;
sh = sb.__ship('naval', 'libertines', 5); X.shipsTick(); sb.cardNow = null; sb.__turn();
check(sb.__labels().join(' | ') === 'Break away', 'a boat with nothing to shoot is not offered a fight', sb.__labels().join(' | '));

//--- 4. BREAK AWAY ----------------------------------------------------------------
console.log('\n--- 4. BREAK AWAY: THE SECOND CHANCE, AND THE THIN ONE ---');
let broke = 0, caught = 0, hurt = 0;
for (let i = 0; i < N; i++) {
  fresh(); angry();
  sh = sb.__ship('naval', 'libertines', 5); X.shipsTick(); sb.cardNow = null; sb.__turn();
  const hull0 = S.hull;
  sb.__pick('Break away');
  if (sh.evaded && kind() === 'result') broke++;
  else if (kind() === 'action') { caught++; if (S.hull < hull0 && dist(sh) <= 1) hurt++; }
}
check(Math.abs(broke / N - X.BREAK_ODDS) < 0.07 && broke + caught === N, 'it works two times in five — a thinner chance than the first',
  broke + ' broke away, ' + caught + ' caught, of ' + N + ' (' + Math.round(100 * broke / N) + '% against ' + Math.round(100 * X.BREAK_ODDS) + '%)');
check(caught > 0 && hurt === caught, 'and caught means she is alongside with her first salvo already in the hull', hurt + ' of ' + caught);
check(X.BREAK_ODDS < X.SLIP_ODDS, 'the second chance is the smaller one', X.BREAK_ODDS + ' against ' + X.SLIP_ODDS);

//--- 5. APPROACH, AND HER COLOURS ---------------------------------------------------
console.log('\n--- 5. APPROACH: A CHASE ON THE CHART, AND THEN HER COLOURS ---');
fresh();
sh = sb.__ship('merchant', 'confluence', 6, 'liner1');
X.shipsTick();
const moves0 = S.moves, at0 = S.q + ',' + S.r;
sb.__pick('Approach the vessel');
check(!sb.__card() && S.travel && S.travel.chase === 'liner1', 'approaching puts the card away and the helm on her', 'course is a chase: ' + !!(S.travel && S.travel.chase));
sb.__chase();
c = sb.__card();
check(kind() === 'colours' && dist(sh) <= 2 && S.moves > moves0 && (S.q + ',' + S.r) !== at0, 'she is run down a hex and a turn at a time, and the card comes up in reach',
  'at ' + dist(sh) + ' hexes after ' + (S.moves - moves0) + ' turns');
check(!!c && c.scene === 'lineMerchant' && c.flag === 'confluence', 'and now it is HER picture: the same hull in her owner’s paint', c ? c.scene + ', flying ' + c.flag : '');
const body = sb.__body();
check(/Long Line/.test(body), 'the apparent faction', (body.match(/Her colours\s+([^.]*\.?)/) || [])[0]);
check(body.indexOf(X.gunsSeen(X.shipStats('confluence', 'merchant'))) >= 0, 'her likely armament, as a lookout would say it', X.gunsSeen(X.shipStats('confluence', 'merchant')));
check(/Standing\s+Nobody to them/.test(body), 'and how you stand with her people', (body.match(/Standing\s+[^.]*\./) || [])[0]);
check(/fish would sink her; we carry 3/.test(body) && /of our hull a salvo/.test(body), 'with the Mate’s arithmetic, for a captain who has never fought one', (body.match(/Osei:[^”]*”/) || [])[0]);
check(sb.__labels().join(' | ') === 'Hail her | Attack her | Leave her be', 'three things to do about a hull that means no harm', sb.__labels().join(' | '));
const st0 = X.standingBand('confluence').key;
sb.__pick('Hail her');
check(kind() === 'result' && (S.hailed || []).includes('liner1') && sb.__labels().join() === 'Carry on', 'hailing her gives the news on a card, once', sb.__card().title);
sb.__pick('Carry on');
X.closeOnShip();
check(kind() === 'colours' && sb.__labels().indexOf('Hail her') < 0, 'and the Close button is the same door: her colours again, with nothing left to ask her', sb.__labels().join(' | '));
// A courier cannot be caught.
fresh();
sh = sb.__ship('courier', 'mariners', 5, 'fast', true);            // already past, and going away
X.shipsTick(); L.length = 0;
sb.__pick('Approach the vessel'); sb.__chase();
check(!sb.__card() && !S.travel && said().some(t => /legs of you|out of sight/.test(t)), 'a faster hull is not run down: the chase ends and says why', said().filter(t => /legs|sight/.test(t))[0]);

//--- 6. THE ACTION ------------------------------------------------------------------
console.log('\n--- 6. THE ACTION: THE OLD ATTACK, A ROUND AT A TIME ---');
fresh();
sh = sb.__ship('merchant', 'confluence', 2, 'prize');
X.shipsTick(); sb.__pick('Approach the vessel');
check(kind() === 'colours', 'in reach already, approaching is just reading her colours');
const hp0 = sh.hp, stand0 = (S.standing.confluence || 0);
sb.__pick('Attack her');
check(kind() === 'action' && sh.hp === hp0 && (S.standing.confluence || 0) === stand0, 'choosing to attack opens the action and fires nothing yet', 'her hull ' + sh.hp + ', standing ' + (S.standing.confluence || 0));
check(sb.__labels()[0] === 'Fire a torpedo' && sb.__labels()[1] === 'Dive out from under her', 'fire, or leave', sb.__labels().join(' | '));
const fish0 = S.torpedoes, hull0 = S.hull;
sb.__pick('Fire a torpedo');
check(sh.hp < hp0 && S.torpedoes === fish0 - 1 && (S.standing.confluence || 0) === stand0 - 35, 'one round: the fish goes, it hurts her, and her people are told', 'her hull ' + hp0 + ' -> ' + sh.hp + ', standing ' + (S.standing.confluence || 0));
check(S.hull < hull0 && kind() === 'action', 'she is armed and still afloat, so she answers', 'our hull ' + hull0 + ' -> ' + S.hull);
const hull1 = S.hull, depth0 = S.currentDepth;
sb.__pick('Dive out from under her');
check(kind() === 'result' && sh.evaded && S.hull < hull1, 'diving out of it costs one salvo', 'hull ' + hull1 + ' -> ' + S.hull);
check(S.currentDepth > depth0 && !X.shipHunting(sh), 'and then the boat is under, and she has lost it', S.currentDepth + ' m');
// To the end.
fresh(); S.torpedoes = 9;
sh = sb.__ship('merchant', 'mariners', 2, 'fat');
X.shipsTick(); sb.__pick('Approach the vessel'); sb.__pick('Attack her');
let rounds = 0;
while (kind() === 'action' && rounds++ < 12) sb.__pick('Fire a torpedo');
check(kind() === 'result' && sb.__card().title === 'She is gone' && S.cargo > 0 && !S.ships.includes(sh), 'fired on until she sinks, her hold comes aboard and the card says she is gone',
  rounds + ' fish, ' + S.cargo + ' crates');
// The Attack button is the same door.
fresh();
sh = sb.__ship('merchant', 'mariners', 2, 'btn'); sh.known = true; sh.seen = true;
const hpB = sh.hp;
X.attackFromButton();
check(kind() === 'action' && sh.hp === hpB, 'the Attack button opens the action; it no longer fires the first shot by itself', 'her hull still ' + sh.hp);
// Stand and fight: she comes to you, and the first shot is yours.
fresh(); angry();
sh = sb.__ship('destroyer', 'libertines', 6, 'dd'); X.shipsTick(); sb.cardNow = null; sb.__turn();
const m0 = S.moves;
sb.__pick('Stand and fight');
check(kind() === 'action' && dist(sh) <= 2 && S.moves > m0, 'standing to fight, the sea is wound on until she is in reach', 'at ' + dist(sh) + ' after ' + (S.moves - m0) + ' turns');
// An evaded hull stays evaded.
fresh(); angry();
sh = sb.__ship('naval', 'libertines', 4); sh.evaded = true; X.shipsTick(); sb.cardNow = null;
let turned = false;
for (let i = 0; i < 25; i++) { sb.__turn(); if (sh.chasing) turned = true; }
check(!turned, 'a hull that has lost you has lost you: twenty-five turns in her water and she never turns');

//--- 7. THE PICTURES ----------------------------------------------------------------
console.log('\n--- 7. EVERY HULL A FLEET CAN SAIL HAS BOTH PICTURES ---');
const pairs = sb.__pairs();
const missing = pairs.filter(([cu, h]) => { const sc = X.shipScenes({ culture: cu, hull: h }); return !X.VP_SCENES[sc.far] || !X.VP_SCENES[sc.near]; });
check(pairs.length >= 8 && missing.length === 0, 'the bare hull at a distance and the owner’s own up close, for all ' + pairs.length, missing.map(p => p.join(' ')).join(', ') || 'none missing');
const sc = X.shipScenes({ culture: 'libertines', hull: 'destroyer' });
const far = X.vpPaint(sc.far, null), near = X.vpPaint(sc.near, 'libertines');
check(far !== near && near.indexOf(X.CULT_MARK.libertines) >= 0, 'and they are different pictures: up close she flies her people’s device',
  'the Con-Fed’s ' + X.CULT_MARK.libertines + ' at the masthead');

console.log('\n' + (fail === 0 ? 'THE ENCOUNTER HOLDS — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
