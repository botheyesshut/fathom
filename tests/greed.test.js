// THE EXPLOITS, AND THAT THEY STAY SHUT. `node tests/greed.test.js`
//
// An economy audit found four ways to make crates for nothing. Two were serious
// enough to break the game's whole cost structure, and both are fixed — this
// file is what stops them coming back, because every one of them was introduced
// by somebody (me, mostly) adding a feature and not asking what it cost.
//
// The standing ruling behind all of it: "do not buff the economy until progress
// is reliable." An exploit is the largest possible buff and nobody chose it.
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
;var __L=[]; log=function(t,c,e){ __L.push(String(t)) };
gameStarted = true;
var __X = { L: __L, state, ITEMS, CULTURES, BOARD_RANKS,
  boardOffer, buyPriceFrom, sellPriceTo, resolveBerth, boardRank,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             state.items={}; state.poisFound=[]; state.berth=null; state.ticket=0;
             state.cargo=0; state.cargoBanked=0; state.alive=true; } };
`, sb, { timeout: 180000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => {
  if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); }
};

console.log('GREED — the four ways to make crates for nothing\n');

//--- 1. AN ERRAND MUST NOT PAY MORE THAN THE ITEM COSTS -----------------------
// The fee used to be a function of your RATING: at the top rank a val-1 errand
// paid 13 while the item sat on a shelf at 2. 44% of slates carried one, and
// every settlement also bought a TICKET — five in a row was unrated to top
// rating without leaving the quay.
console.log('--- 1. BUYING AN ERRAND IN IS ALWAYS A LOSS ---');
const port = { q: 1, r: 0, holder: 'mariners', home: true };
let checked = 0, profitable = 0; const worst = [];
for (const ticket of [0, 1, 2, 3, 4, 6, 9, 14, 25]) {
  for (const seed of [90210, 4242, 7, 31337, 512, 8675309]) {
    X.seedTo(seed);
    X.state.ticket = ticket;
    for (let slot = 0; slot < 2; slot++) {
      const o = X.boardOffer(port, slot);
      if (!o || o.kind !== 'errand') continue;
      // The cheapest anybody in the world will sell it to you for.
      let cheapest = Infinity;
      for (const c of Object.keys(X.CULTURES)) {
        const cu = X.CULTURES[c];
        if (!cu.sells || cu.sells.indexOf(o.item) < 0) continue;
        cheapest = Math.min(cheapest, X.buyPriceFrom(c, o.item) * o.n);
      }
      if (!isFinite(cheapest)) continue;   // nobody stocks it; cannot be bought in
      checked++;
      if (o.pay > cheapest) { profitable++; worst.push(o.item + ' pays ' + o.pay + ' costs ' + cheapest); }
    }
  }
}
console.log('    errands whose item is on somebody\'s shelf: ' + checked);
check(checked > 0, 'there are buyable errands to test at all', checked + ' offers');
check(profitable === 0, 'not one of them pays more than buying the thing costs',
  profitable ? worst.slice(0, 4).join('; ') : 'every fee below the cheapest shelf price');

//--- 2. AND THE FEE IS STILL WORTH HAVING IF YOU FOUND IT --------------------
console.log('\n--- 2. ...BUT FINDING IT STILL PAYS ---');
let fees = [];
for (const ticket of [0, 3, 6]) {
  for (const seed of [90210, 4242, 7, 31337]) {
    X.seedTo(seed); X.state.ticket = ticket;
    for (let slot = 0; slot < 2; slot++) {
      const o = X.boardOffer(port, slot);
      if (o && o.kind === 'errand') fees.push(o.pay);
    }
  }
}
fees.sort((a, b) => a - b);
check(fees.length > 0 && fees[0] >= 1, 'an errand is never worth nothing',
  'fees ' + fees[0] + '-' + fees[fees.length - 1] + ' crates');

//--- 3. A WRECK IS SALVAGED ONCE --------------------------------------------
// `dropBerth` deletes the berth; `boardOffer` is deterministic; so retaking the
// same posting handed back the same position with `found` cleared. Five of five
// re-harvests on eight seeds took ~15 crates and 5 items out of one hex.
console.log('\n--- 3. THE SAME WRECK CANNOT BE STRIPPED TWICE ---');
X.seedTo(90210);
X.state.q = 5; X.state.r = 5; X.state.currentDepth = 600;
const mk = () => ({ kind: 'salvage', q: 5, r: 5, d: 600, found: false, pay: 5 });
X.state.berth = mk();
X.state.cargo = 0;
X.resolveBerth({});
const firstHaul = X.state.cargo;
// hand it back and take it again — the exploit, exactly as it was performed
X.state.berth = mk();
X.state.cargo = 0;
X.resolveBerth({});
const secondHaul = X.state.cargo;
check(firstHaul > 0, 'the first captain to reach a wreck gets what is in it', firstHaul + ' crates');
check(secondHaul === 0, 'and the second visit finds it already stripped',
  secondHaul + ' crates on the re-harvest');
check(X.state.berth.found === true, 'the job still completes, so the fee is not lost either',
  'found: ' + X.state.berth.found);

//--- 4. PIRACY COSTS A TURN --------------------------------------------------
// Measured before the fix: 6.8 presses, 9 crates, ZERO turns, zero air, against
// a merchant fleet with guns: 0 that can never fight back or flee. 1.40 crates
// a turn against the harbour board's ceiling of 0.17-0.21.
console.log('\n--- 4. AN ACTION COSTS A TURN ---');
const src = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
const atk = src.slice(src.indexOf('function attackShip()'), src.indexOf('function attackShip()') + 2200);
check(/state\.moves\+\+/.test(atk), 'attacking a ship spends a turn like everything else does',
  /state\.moves\+\+/.test(atk) ? 'the clock runs' : 'STILL FREE');
// and the merchants really are defenceless, which is why the turn is the fix
check(X.CULTURES.mariners && (src.match(/mariners:\s*\{[^}]*guns:\s*0/) || /guns:\s*0/.test(src)),
  'the carrying trade is unarmed, so the cost has to be the clock and not the risk',
  'mariner hulls carry no guns');

console.log('\n' + (fail === 0 ? 'GREED HELD OFF — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
