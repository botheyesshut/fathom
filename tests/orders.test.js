// THE BRIEFINGS. `node tests/orders.test.js`
//
// Sean, on what the tutorial has to do: "it does need to tell me what I should
// be trying to do the first time I find myself at each stage of playing the
// game... These should be pop up windows I can dismiss without much trouble."
//
// This replaced the suite that tested the old seven-line log thread. The
// property that matters most is the one this project gets wrong most often:
// EVERY BRIEFING MUST BE REACHABLE. A card that exists in the source and never
// fires in a game is not a tutorial, it is a document nobody is handed — so each
// one is driven to its own trigger below and has to actually appear.
'use strict';
const fs = require('fs'), vm = require('vm');

function stub() {
  const fn = function () { return s };
  const s = new Proxy(fn, { get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
      if (p === 'classList') return { add() {}, remove() {}, contains() { return false; }, toggle() { return false; } };
      if (p === 'style') return {};
      return s;
    }, apply() { return s }, set() { return true }, has() { return true } });
  return s;
}
const script = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
  if (p === 'addEventListener') return () => {};
  return stub();
}});

let _tick = 1754265600000;
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (_tick += 1000) : t[p]; } });
const sb = { console, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
  parseInt, parseFloat, isNaN, isFinite, setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {}, location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb;
vm.createContext(sb);
vm.runInContext(script + `
;var __L=[]; log=function(t,c,e){ __L.push({t:String(t), e:String(e||'')}) };
gameStarted = true;
// The card is a DOM stub here, so what it SHOWS cannot be read back off the
// element. Capture it at the door instead — the same information the player
// gets, taken one function earlier.
var __shown = [];
var __origShow = showBrief;
showBrief = function (b) { __shown.push(b.id); __origShow(b); };
var __X = {
  L: __L, shown: __shown, state, BRIEFS, closeBrief, homeDock: homeDock,
  tileAt: tileAt, reveal(q,r){ revealed.set(hexKey(q,r), new Set([0])); },   // Map<hexKey, Set<depth>>
  setTips(v){ tipsOn = v; },
  tick(){ ordersTick(); },
  reset(){
    state.ordersSaid = []; state.ordersAt = null; state.moves = 0;
    state.berth = null; state.ticket = 0; state.cargo = 0; state.base = null;
    state.foot = null; state.creatures = []; state.currentDepth = 0;
    state.armament = STARTING_ARMAMENT;
    state.crew = startingCrew();
    for (const m of state.crew) { m.conditions = []; m.wounded = false; }
    __shown.length = 0; __L.length = 0; closeBrief();
  },
  // A turn: the tick, then the captain dismisses whatever came up.
  turn(){ state.moves++; ordersTick(); closeBrief(); },
};
`, sb, { timeout: 120000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};

console.log('THE BRIEFINGS — ' + X.BRIEFS.length + ' cards\n');

//--- 1. SHAPE ----------------------------------------------------------------
console.log('--- 1. EVERY CARD IS A CARD ---');
const ids = X.BRIEFS.map(b => b.id);
check(new Set(ids).size === ids.length, 'every briefing has its own id', ids.join(' -> '));
check(X.BRIEFS.every(b => b.title && b.title.length > 2 && b.title.length < 30),
  'and a short title to head the card', X.BRIEFS.map(b => b.title).join(' | '));
check(X.BRIEFS.every(b => typeof b.when === 'function'),
  'and a situation it fires on', 'all ' + X.BRIEFS.length + ' have when()');
const text = (b) => String(b.body).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const longest = Math.max(...X.BRIEFS.map(b => text(b).length));
check(longest <= 640, 'and none of them is a wall of text', 'longest ' + longest + ' chars');
// Sean's actual requirement: say what to TRY, not only what a thing is.
const noVerb = X.BRIEFS.filter(b => !/\b(tap|take|steer|go|walk|claim|check|come|drop|open|put)\b/i.test(text(b)));
check(noVerb.length === 0, 'and every one names something to actually do',
  noVerb.length ? noVerb.map(b => b.id).join(', ') : 'all ' + X.BRIEFS.length + ' name an action');

//--- 2. TURN ONE -------------------------------------------------------------
console.log('\n--- 2. THE FIRST THING A NEW CAPTAIN SEES ---');
X.setTips(true); X.reset();
X.turn();
check(X.shown.length === 1, 'one card on the first turn, not a stack', X.shown.length + ' shown');
check(X.shown[0] === 'helm', 'and it is the one about the boat', X.shown[0] || '(none)');
X.turn(); X.turn(); X.turn();
check(X.shown.length <= 4, 'and never more than one per turn after that',
  X.shown.length + ' cards over 4 turns: ' + X.shown.join(', '));

//--- 3. THE DOCK, WHICH SEAN ASKED FOR BY NAME ------------------------------
console.log('\n--- 3. ALONGSIDE THE DOCK ---');
X.setTips(true); X.reset();
const hd = X.homeDock();
X.state.q = hd.q; X.state.r = hd.r; X.state.currentDepth = 0;
for (let i = 0; i < 6 && X.shown.indexOf('harbour') < 0; i++) X.turn();
check(X.shown.indexOf('harbour') >= 0, 'tying up at the dock explains the dock',
  X.shown.join(', ') || '(nothing fired)');
const harbour = X.BRIEFS.find(b => b.id === 'harbour');
const ht = harbour ? text(harbour) : '';
check(/DOCK/.test(ht), 'and names the control that opens it',
  /DOCK/.test(ht) ? 'names the DOCK button' : 'NEVER NAMES THE BUTTON');
check(/ledger|bank/i.test(ht), 'and says what a dock is FOR', 'the ledger');
check(/yet|for now|grows|later/i.test(ht),
  'and that there is little in it now but more later', 'sets the expectation Sean asked for');

//--- 4. EVERY CARD CAN ACTUALLY BE REACHED ----------------------------------
// This project's signature bug is content wired at both ends with nothing in
// the middle. A briefing nobody can trigger is exactly that.
console.log('\n--- 4. NO CARD IS UNREACHABLE ---');
const ashoreAt = () => ({ kind: 'ruin', q: X.state.q, r: X.state.r, d: 300, x: 4, y: 4,
  crates: 0, relics: 0, steps: 0, tick: 0, seen: [], took: [], water: [], closed: [],
  dweller: null, dead: [] });
const scenarios = {
  helm:     () => {},
  harbour:  () => { const d = X.homeDock(); X.state.q = d.q; X.state.r = d.r; X.state.currentDepth = 0; },
  posting:  () => { X.state.berth = { q: 3, r: 3, d: 300, found: false }; },
  air:      () => { X.state.currentDepth = 240; },
  collect:  () => { X.state.cargo = 2; },
  ashore:   () => { X.state.foot = ashoreAt(); },
  keep:     () => { X.state.foot = ashoreAt(); X.state.base = null; },
  contact:  () => { X.state.creatures = [{ type: 'lurker', q: X.state.q + 1, r: X.state.r,
                                           depth: X.state.currentDepth, awake: true, gone: false }]; },
  // The Erebus sails with a harpoon now, so the card that explains it needs
  // something ALONGSIDE — one hex, awake, in the same water.
  teeth:    () => { X.state.armament = 'harpoon';
                    X.state.creatures = [{ type: 'shoal', q: X.state.q + 1, r: X.state.r,
                                           depth: X.state.currentDepth, awake: true, gone: false }]; },
  hurt:     () => { X.state.crew[0].conditions = ['bruised']; X.state.crew[0].wounded = true; },
  // `floor` needs a real sinkhole on the chart, so it is driven against the
  // world below rather than by faking a flag.
  floor:    null,
};
const unreachable = [];
for (const b of X.BRIEFS) {
  if (!(b.id in scenarios)) { unreachable.push(b.id + ' (no scenario written)'); continue; }
  if (scenarios[b.id] === null) continue;
  X.setTips(true); X.reset();
  scenarios[b.id]();
  let fired = false;
  for (let i = 0; i < 8 && !fired; i++) { X.turn(); fired = X.shown.indexOf(b.id) >= 0; }
  if (!fired) unreachable.push(b.id);
}
check(unreachable.length === 0, 'every scripted briefing fires in its own situation',
  unreachable.length ? 'UNREACHABLE: ' + unreachable.join(', ') : (X.BRIEFS.length - 1) + ' reached');

// The sinkhole card, driven against the actual world rather than a faked flag.
X.setTips(true); X.reset();
let stoodOnOne = false;
outer:
for (let q = -14; q <= 14; q++) for (let r = -14; r <= 14; r++) {
  const t = X.tileAt(q, r);
  if (!t || t.poi !== 'opening') continue;
  X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
  X.reveal(q, r);
  for (let i = 0; i < 6; i++) { X.turn(); if (X.shown.indexOf('floor') >= 0) { stoodOnOne = true; break outer; } }
}
check(stoodOnOne, 'and the sinkhole card fires over a real sinkhole in a real world',
  stoodOnOne ? 'found one and it fired' : 'NEVER FIRED — no opening in range, or the trigger is wrong');

//--- 5. ONCE, EVER -----------------------------------------------------------
console.log('\n--- 5. SAID ONCE AND NEVER AGAIN ---');
X.setTips(true); X.reset();
X.state.cargo = 3; X.state.berth = { q: 2, r: 2, d: 300, found: false }; X.state.currentDepth = 300;
for (let i = 0; i < 40; i++) X.turn();
const counts = {};
for (const id of X.shown) counts[id] = (counts[id] || 0) + 1;
const repeated = Object.keys(counts).filter(k => counts[k] > 1);
check(repeated.length === 0, 'forty turns and nothing repeats',
  repeated.length ? 'REPEATED: ' + repeated.join(', ') : X.shown.length + ' distinct cards');

//--- 6. THE SWITCH -----------------------------------------------------------
console.log('\n--- 6. THE SWITCH IN OPTIONS ---');
X.setTips(false); X.reset();
for (let i = 0; i < 12; i++) X.turn();
check(X.shown.length === 0, 'off means not one card', X.shown.length + ' shown with it off');
X.setTips(true); X.reset();
X.turn();
check(X.shown.length === 1, 'and on means it speaks again', X.shown.length + ' card');

//--- 7. IT DOES NOT TALK OVER ITSELF ----------------------------------------
console.log('\n--- 7. ONE THING ON SCREEN AT A TIME ---');
X.setTips(true); X.reset();
X.state.moves++; X.tick();          // a card is up and NOT dismissed
const upNow = X.shown.length;
X.state.moves++; X.tick();          // another turn while it is still up
check(X.shown.length === upNow, 'a second card never opens over the first',
  upNow + ' up, still ' + X.shown.length + ' after another turn');
X.closeBrief();

console.log('\n' + (fail === 0 ? 'THE BRIEFINGS HOLD — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
