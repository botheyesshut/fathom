// THE HARBOUR BOARD, DRIVEN THE WAY A CAPTAIN DRIVES IT. `node tests/board.js`
//
// The rule this file exists to obey: DRIVE THE REAL PATH. Calling takeBerth()
// and payBerth() directly would prove the functions work and nothing about
// whether a player can reach them — that exact mistake let a broken `surface()`
// pass its own test while the button that called it had been deleted. So every
// action here goes through `portRows()` (what the window actually offers) and
// `portBuy()` (what the button actually does), and the only things read are
// crates on the ledger and the captain's rating.
//
// It answers, per seed: is there work on the slate at turn one; can it be taken;
// does it put a mark on the chart; does reaching the mark complete it; does the
// harbour pay; and does the rating rise and put better work up.
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
function boot(path) {
  const script = fs.readFileSync(path, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const doc = new Proxy({}, { get(t, p) {
    if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => stub();
    if (p === 'addEventListener') return () => {};
    return stub();
  }});
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
;var __LOG=[]; log=function(t,c,e){ __LOG.push(String(t)) };
gameStarted = true;
var __X = {
  L: __LOG,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear();
             state.leads=[]; state.berth=null; state.ticket=0;
             state.cargo=0; state.cargoBanked=0; state.items={};
             state.creatures=[]; state.enclaves=[]; state.ships=[]; state.pingMemory=new Map(); },
  state, tileAt, getTile, hexKey, hexDistance, homeDock,
  portNear, boardPort, portRows, portBuy, checkLeads, boardRank, BOARD_RANKS,
  hexAcceptsDepth, giveItem, itemCount, ITEMS, DEPTH_GRID,
};
`, sb, { timeout: 180000 });
  return sb.__X;
}

const X = boot(process.argv[2] || __dirname + '/../fathom-chart.html');
const SEEDS = [90210, 4242, 7, 31337, 512, 8675309, 1123, 44, 90909, 2718, 1414, 6180];

let ok = 0, fail = 0;
const check = (cond, what, detail) => {
  if (cond) { ok++; console.log('  PASS  ' + what + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  FAIL  ' + what + (detail ? '  — ' + detail : '')); }
};

// Put the boat alongside the home dock, on the surface, the way a new game does.
function atHomePort() {
  const d = X.homeDock();
  if (!d) return null;
  for (let rad = 0; rad <= 4; rad++) {
    for (let dq = -rad; dq <= rad; dq++) for (let dr = -rad; dr <= rad; dr++) {
      const q = d.q + dq, r = d.r + dr;
      const t = X.tileAt(q, r);
      if (!t || t.wall) continue;
      X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
      if (X.boardPort()) return X.boardPort();
    }
  }
  return null;
}
// What the window is actually offering, as {act: row}.
const acts = () => {
  const out = {};
  for (const row of X.portRows()) if (row.act) out[row.act] = row;
  return out;
};

console.log('THE HARBOUR BOARD — driven through portRows/portBuy, ' + SEEDS.length + ' seeds\n');

// ---- 1. IS THERE WORK, AT TURN ONE, WHERE THE GAME STARTS YOU? -------------
let withWork = 0, kinds = {}, pays = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const port = atHomePort();
  if (!port) continue;
  const a = acts();
  const offers = Object.keys(a).filter(k => k.indexOf('berth:') === 0);
  if (offers.length) withWork++;
  for (const o of offers) { const t = a[o].name; kinds[t.split(' ')[0]] = (kinds[t.split(' ')[0]] || 0) + 1; }
  for (const o of offers) pays.push(parseInt((a[o].desc.match(/(\d+) crate/) || [0, 0])[1], 10));
}
console.log('--- 1. THE SLATE AT TURN ONE ---');
check(withWork === SEEDS.length, 'every seed has work on the board the moment you can dock',
  withWork + '/' + SEEDS.length + ' seeds');
check(pays.length >= SEEDS.length, 'and more than one posting to choose between',
  pays.length + ' postings across ' + SEEDS.length + ' seeds');
check(pays.length > 0 && pays.every(p => p >= 3), 'nothing on the slate pays less than a hand costs to feed',
  'pays: ' + [...new Set(pays)].sort((a, b) => a - b).join(', ') + ' crates');

// ---- 2. TAKE ONE. DOES IT MARK THE CHART? ----------------------------------
console.log('\n--- 2. TAKING A POSTING ---');
let marked = 0, took = 0, errands = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const port = atHomePort(); if (!port) continue;
  const a = acts();
  const first = Object.keys(a).filter(k => k.indexOf('berth:') === 0)[0];
  if (!first) continue;
  X.portBuy(first);
  if (X.state.berth) took++;
  if (X.state.berth && X.state.berth.kind === 'errand') errands++;
  else if ((X.state.leads || []).some(L => L.kind === 'berth')) marked++;
}
check(took === SEEDS.length, 'the posting can be taken from the window', took + '/' + SEEDS.length);
check(took > 0 && marked + errands === took, 'and every job that has a POSITION puts a mark on the chart',
  marked + ' marked, ' + errands + ' errands (which have no position by design)');

// ---- 3. GO THERE. DOES IT COMPLETE? ----------------------------------------
// Sail to the mark and descend to it — no teleport, the same arrival test the
// game runs every move (checkLeads), reached by actually being there.
console.log('\n--- 3. SAILING TO THE MARK ---');
let reached = 0, positional = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const port = atHomePort(); if (!port) continue;
  const a = acts();
  const first = Object.keys(a).filter(k => k.indexOf('berth:') === 0)[0];
  if (!first) continue;
  X.portBuy(first);
  const b = X.state.berth;
  if (!b || b.q == null) continue;
  positional++;
  X.state.q = b.q; X.state.r = b.r; X.state.currentDepth = b.d;
  X.checkLeads();
  if (X.state.berth && X.state.berth.found) reached++;
}
check(positional > 0, 'there are positional jobs to test at all', positional + ' of ' + SEEDS.length + ' seeds');
check(positional > 0 && reached === positional, 'standing at the marked position completes the job',
  reached + '/' + positional);

// ---- 4. COME HOME. DOES THE HARBOUR PAY? -----------------------------------
console.log('\n--- 4. COLLECTING ---');
let paid = 0, ticked = 0, gained = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const port = atHomePort(); if (!port) continue;
  let a = acts();
  const first = Object.keys(a).filter(k => k.indexOf('berth:') === 0)[0];
  if (!first) continue;
  X.portBuy(first);
  const b = X.state.berth; if (!b) continue;
  // complete it the way the world would
  if (b.kind === 'errand') X.giveItem(b.item, b.n);
  else { X.state.q = b.q; X.state.r = b.r; X.state.currentDepth = b.d; X.checkLeads(); }
  atHomePort();
  const before = X.state.cargoBanked;
  a = acts();
  if (!a['berthpay']) continue;
  X.portBuy('berthpay');
  if (X.state.cargoBanked > before) { paid++; gained.push(X.state.cargoBanked - before); }
  if (X.state.ticket === 1) ticked++;
  if ((X.state.leads || []).some(L => L.kind === 'berth')) console.log('    (a mark was left behind on ' + seed + ')');
}
check(paid === SEEDS.length, 'the harbour pays for finished work', paid + '/' + SEEDS.length + ' seeds');
check(ticked === SEEDS.length, 'and the captain\'s rating rises for it', ticked + '/' + SEEDS.length);
check(gained.length > 0 && gained.every(g => g >= 3), 'the fee actually lands on the ledger',
  'crates gained: ' + [...new Set(gained)].sort((a, b) => a - b).join(', '));

// ---- 5. THE LADDER. DOES BETTER WORK APPEAR? -------------------------------
console.log('\n--- 5. MOVING UP ---');
X.seedTo(90210);
atHomePort();
const ladder = [];
for (const t of [0, 1, 3, 6]) {
  X.state.ticket = t;
  const r = X.boardRank();
  X.state.berth = null; X.state.leads = [];
  const a = acts();
  const first = Object.keys(a).filter(k => k.indexOf('berth:') === 0)[0];
  const pay = first ? parseInt((a[first].desc.match(/(\d+) crate/) || [0, 0])[1], 10) : 0;
  ladder.push({ t, word: r.word, maxD: r.maxD, reach: r.reach.join('-'), pay });
}
for (const L of ladder) console.log('    ' + String(L.t).padStart(2) + ' jobs done -> "' + L.word + '"'
  + '   reach ' + L.reach + ' hexes, to ' + L.maxD + ' m, offering ' + L.pay + ' crates');
check(new Set(ladder.map(l => l.word)).size === 4, 'four distinct ratings, and they are reached by working',
  ladder.map(l => l.word).join(' -> '));
check(ladder[3].maxD > ladder[0].maxD && ladder[3].reach !== ladder[0].reach,
  'and the work itself goes further out and deeper down', ladder[0].maxD + ' m -> ' + ladder[3].maxD + ' m');

// ---- 6. NO REROLL ON THE QUAY ----------------------------------------------
console.log('\n--- 6. THE SLATE CANNOT BE ROLLED ---');
X.seedTo(4242);
atHomePort();
// The signature has to include the DESCRIPTION, not just the title. Titles
// repeat by design — "A sounding wanted" is every sounding — so comparing names
// alone let this check pass or fail on whether two unrelated slates happened to
// draw the same two job kinds. The bearing, the range and the depth are what
// actually identify a posting, and they all live in the desc.
const sig = () => X.portRows().filter(r => r.act && r.act.indexOf('berth:') === 0)
  .map(r => r.name + '/' + r.desc).join('|');
const s1 = sig();
const s2 = sig();
X.portBuy('berth:0'); X.portBuy('berthdrop');
const s3 = sig();
check(s1 === s2 && s2 === s3, 'looking again, and taking a job then handing it back, does not change the slate',
  s1 === s3 ? 'stable' : 'CHANGED: ' + s1 + '  -->  ' + s3);
X.state.ticket = 1;
const s4 = sig();
check(s4 !== s3, 'but finishing one does',
  'was "' + s3.split('|')[0].split('·')[0].trim() + '"\n            now "'
    + s4.split('|')[0].split('·')[0].trim() + '"');


// ---- 7. THE RATE — reported, not gated ------------------------------------
// "Enough progress in a 40-minute session should not be virtually guaranteed."
// So the question is not "does it pay" but "how fast", and the honest unit is
// turns: a job is a round trip out and back, plus down and up, one step a turn.
// This ignores everything that goes wrong on the way, so it is the CEILING —
// the best a captain could possibly do, not what they will do.
console.log('\n--- 7. WHAT IT PAYS, PER TURN (a ceiling: nothing goes wrong here) ---');
console.log('  rating                  job     out   down    turns   crates   per 100 turns');
for (const t of [0, 1, 3, 6]) {
  let dist = 0, dep = 0, pay = 0, n = 0, trips = 0;
  for (const seed of SEEDS) {
    X.seedTo(seed);
    const port = atHomePort(); if (!port) continue;
    X.state.ticket = t; X.state.berth = null; X.state.leads = [];
    const a = acts();
    const first = Object.keys(a).filter(k => k.indexOf('berth:') === 0)[0];
    if (!first) continue;
    X.portBuy(first);
    const b = X.state.berth; if (!b) continue;
    // ERRANDS ARE AVERAGED SEPARATELY. Folding a job with no trip into the mean
    // distance made rank 6 report 11.1 hexes against a stated reach of 14-26,
    // which read as the game placing jobs too close when it was the measurement
    // mixing two different things together.
    if (b.q != null) { dist += X.hexDistance({ q: port.q, r: port.r }, { q: b.q, r: b.r }); dep += b.d; trips++; }
    pay += b.pay; n++;
  }
  if (!n) continue;
  const mDist = trips ? dist / trips : 0, mDep = trips ? dep / trips : 0, mPay = pay / n;
  const turns = mDist * 2 + (mDep / X.DEPTH_GRID) * 2;
  console.log('  ' + X.boardRank().word.padEnd(22)
    + String(t).padStart(3) + '   ' + mDist.toFixed(1).padStart(6) + ' ' + Math.round(mDep).toString().padStart(6)
    + '   ' + turns.toFixed(0).padStart(6) + '   ' + mPay.toFixed(1).padStart(6)
    + '   ' + (mPay / Math.max(1, turns) * 100).toFixed(1).padStart(8)
    + '    (' + trips + ' of ' + n + ' are a trip)');
}
console.log('  (a hand costs 5 crates; the brass first mate costs 60)');


console.log('\n' + (fail === 0 ? 'THE BOARD HOLDS — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
