// THE STANDING ORDERS — the tutorial thread, played the way a new captain plays.
//
// Sean, planning his own first real test: "I will not know how to do many of
// these things." So this checks the thread does its job and — just as important
// — that it CANNOT nag. A tutorial that repeats itself is worse than none, and
// he has already told me once that the log was unreadable.
'use strict';
const fs = require('fs'), vm = require('vm');
function stub() {
  const fn = function () { return s };
  const s = new Proxy(fn, { get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
      return s;
    }, apply() { return s }, set() { return true }, has() { return true } });
  return s;
}
const script = fs.readFileSync(process.argv[2] || __dirname + '/../fathom-chart.html', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
  if (p === 'addEventListener') return () => {};
  return stub();
}});
const sb = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
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
var __X = { L: __L, state, ORDERS, ordersTick, TIPS,
  setTips(v){ tipsOn = v; },
  reset(){ state.ordersSaid=[]; state.ordersAt=null; state.moves=0; state.berth=null; state.ticket=0;
           state.maxDepth=0; state.foot=null; state.base=null; state.deckTook={};
           state.alive=true; __L.length=0; } };
`, sb, { timeout: 120000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};
const orders = () => X.L.filter(l => l.e === 'ORDERS').map(l => l.t);

console.log('THE STANDING ORDERS — ' + X.ORDERS.length + ' lines, in order\n');

//--- 1. ONE LINE AT A TIME, AND ONLY THE CURRENT ONE -------------------------
console.log('--- 1. ONE AT A TIME ---');
X.reset();
for (let i = 0; i < 50; i++) X.ordersTick();
check(orders().length === 1, 'fifty ticks with nothing achieved says exactly one thing',
  orders().length + ' lines');
check(/arrows around the boat/.test(orders()[0] || ''), 'and it is the first order, about the helm',
  (orders()[0] || '').slice(0, 44) + '...');

//--- 2. THE THREAD ADVANCES ON DEEDS, NOT ON TIME ----------------------------
console.log('\n--- 2. THE THREAD ADVANCES ON DEEDS ---');
X.reset();
const seen = [];
const step = (label, mutate) => {
  X.L.length = 0;
  if (mutate) mutate();
  X.state.moves = (X.state.moves || 0) + 1;   // a step is a turn
  for (let i = 0; i < 8; i++) X.ordersTick();
  const said = orders();
  seen.push({ label: label, said: said.length, first: (said[0] || '').slice(0, 40) });
};
step('cold start', null);
// A CAPTAIN WHO DOCKS BEFORE WANDERING. The opener used to gate on four moves,
// so this player was stuck on it for ever and never heard another word. Nothing
// is mutated here: the next order must arrive on the very next tick regardless.
step('the next turn', null);
step('took a posting', () => { X.state.berth = { kind: 'sounding', found: false, q: 5, r: 5, d: 300 };
                               X.state.q = 0; X.state.r = 0; });
step('sailed over it', () => { X.state.q = 5; X.state.r = 5; });
step('dived to it', () => { X.state.berth.found = true; X.state.maxDepth = 300; });
step('got paid', () => { X.state.ticket = 1; X.state.berth = null; });
step('went ashore', () => { X.state.foot = { q: 1, r: 1, d: 300, kind: 'beach' }; });
step('claimed a station', () => { X.state.base = { q: 1, r: 1, d: 300, kind: 'beach' }; });
for (const s of seen) console.log('    ' + s.label.padEnd(20) + s.said + ' new   ' + (s.first || '—'));
check(seen.every(s => s.said <= 1), 'never more than one new line for one step of progress',
  'most in a step: ' + Math.max.apply(null, seen.map(s => s.said)));
check(X.state.ordersSaid.length === X.ORDERS.length, 'and EVERY order in the thread gets told',
  X.state.ordersSaid.length + ' of ' + X.ORDERS.length + ' orders given');

//--- 3. IT CANNOT NAG --------------------------------------------------------
console.log('\n--- 3. IT CANNOT NAG ---');
X.reset();
// Four hundred TURNS stuck on the same order — the nag test has to move, or it
// is only testing the one-per-turn gate it already passed above.
for (let i = 0; i < 400; i++) { X.state.moves = 99 + i; X.ordersTick(); }
// The opener, then the objective they are stuck on, and then silence for ever.
const nag = orders();
const uniqueNag = new Set(nag).size;
check(nag.length === 2 && uniqueNag === 2,
  'four hundred turns stuck on one order says the opener, then it, then nothing',
  nag.length + ' lines, ' + uniqueNag + ' distinct');
check(nag.filter(l => /slate of work/.test(l)).length === 1,
  'and the order they are stuck on is said exactly once across all four hundred',
  nag.filter(l => /slate of work/.test(l)).length + ' times');

//--- 4. OUT OF ORDER IS STILL IN ORDER ---------------------------------------
console.log('\n--- 4. A CAPTAIN WHO WANDERS OFF IS NOT CORRECTED ---');
X.reset();
// Someone who goes exploring and claims a grotto before ever taking work.
X.state.moves = 40;
X.state.base = { q: 1, r: 1, d: 300, kind: 'beach' };
X.state.foot = { q: 1, r: 1, d: 300, kind: 'beach' };
X.state.maxDepth = 600;
// One order per TURN now, so this has to sail rather than stand still.
for (let i = 0; i < 20; i++) { X.state.moves = 40 + i; X.ordersTick(); }
const out = orders();
check(!out.some(l => /put the crew ashore/.test(l)) && !out.some(l => /can be kept/.test(l)),
  'is never told to do a thing they have already done',
  out.length + ' lines, none of them stale');
check(out.some(l => /slate of work/.test(l)),
  '...but is still told about the work they have not done',
  out.length ? out[0].slice(0, 42) + '...' : 'silent');

//--- 5. THE SWITCH -----------------------------------------------------------
console.log('\n--- 5. THE SWITCH IN OPTIONS ---');
X.reset();
X.setTips(false);
for (let i = 0; i < 60; i++) X.ordersTick();
check(orders().length === 0, 'off means silent', orders().length + ' lines with the tutorial off');
X.setTips(true);
X.reset();
for (let i = 0; i < 5; i++) X.ordersTick();
check(orders().length === 1, 'and on means it speaks again', orders().length + ' line');

//--- 6. THE LINES THEMSELVES -------------------------------------------------
console.log('\n--- 6. THE LINES THEMSELVES ---');
const ids = X.ORDERS.map(o => o.id);
check(new Set(ids).size === ids.length, 'every order has its own id', ids.join(' -> '));
const longest = Math.max.apply(null, X.ORDERS.map(o => o.say.length));
check(longest <= 360, 'and none of them is a wall of text', 'longest ' + longest + ' chars');
const noVerb = X.ORDERS.filter(o => !/(DOCK|LOOK|PING|arrow|Steer|Take|Claim|down)/.test(o.say));
check(noVerb.length === 0, 'and every one names something to actually do',
  noVerb.length ? noVerb.map(o => o.id).join(', ') : 'all ' + X.ORDERS.length + ' point at a control or a course');

console.log('\n' + (fail === 0 ? 'THE ORDERS HOLD — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
