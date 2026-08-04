// THE FIRST LOCK IN THE GAME. `node tests/locks.test.js`
//
// Both keys in the roster — hatchkey and bonekey — were `kind: 'key'`, worth 2
// crates, bought by three of the four peoples, and NOTHING anywhere in the world
// had a lock. Vendor trash wearing a keyhole. This checks that they now open
// something, that opening spends them, and — the part I would otherwise have
// shipped broken — that a door you have opened stays open after you surface,
// because the interior regenerates deterministically and only the overlay
// remembers anything.
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
  if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => stub();
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
var __X = { L: __L, state, interiorAt, tileAt, ITEMS, giveItem, itemCount, takeItem,
  stepFoot, lockOpened, noteLockOpened, deckKey, deckSuffix, LOCK_CHANCE,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             state.items={}; state.deckTook={}; state.foot=null; } };
`, sb, { timeout: 180000 });
const X = sb.__X;

let ok = 0, fail = 0;
const check = (c, what, d) => { if (c) { ok++; console.log('  PASS  ' + what + (d ? '  — ' + d : '')); }
  else { fail++; console.log('  FAIL  ' + what + (d ? '  — ' + d : '')); } };

console.log('LOCKS — the keys open something now\n');

// Sweep real decks of each kind and find the locks.
const found = { hull: 0, ruin: 0, deepruin: 0, cave: 0, beach: 0 };
const decks = { hull: 0, ruin: 0, deepruin: 0, cave: 0, beach: 0 };
const wrongKey = [];
let sample = null;
for (const seed of [90210, 4242, 7, 31337, 512]) {
  X.seedTo(seed);
  for (let i = 0; i < 120; i++) {
    for (const kind of ['hull', 'ruin', 'deepruin', 'cave', 'beach']) {
      const ch = X.interiorAt(i % 40, Math.floor(i / 3), 600 + (i % 9) * 300, kind);
      if (!ch || !ch.tiles) continue;
      decks[kind]++;
      for (const [k, t] of ch.tiles) {
        if (!t.locked) continue;
        found[kind]++;
        const want = kind === 'hull' ? 'hatchkey' : 'bonekey';
        if (t.locked !== want) wrongKey.push(kind + ' wanted ' + t.locked);
        if (!sample && kind === 'hull') sample = { q: i % 40, r: Math.floor(i / 3), d: 600 + (i % 9) * 300, kind, k, need: t.locked };
        break;
      }
    }
  }
}
console.log('--- 1. WHERE THE LOCKS ARE ---');
console.log('  decks walked: ' + Object.entries(decks).map(([k,v]) => k + ' ' + v).join(', '));
console.log('  locks found:  ' + Object.entries(found).map(([k,v]) => k + ' ' + v).join(', '));
check(found.hull > 0 && found.ruin > 0, 'hull wrecks and drowned buildings both hold locked doors',
  'hull ' + found.hull + ', ruin ' + found.ruin);
check(found.cave === 0 && found.beach === 0, 'nobody locks a cave — there is no door to hang it on',
  'cave ' + found.cave + ', beach ' + found.beach);
check(wrongKey.length === 0, 'a hull takes the hatch key and a building takes the bone one',
  wrongKey.length ? wrongKey.slice(0,3).join('; ') : 'every lock matched its kind');
const rate = 100 * found.hull / Math.max(1, decks.hull);
check(rate > 3 && rate < 45, 'a lock is something you come across, not a tax on every deck',
  rate.toFixed(0) + '% of hull decks');

console.log('\n--- 2. THE KEY IS SPENT TURNING IT ---');
check(!!sample, 'there is a locked door to try', sample ? sample.kind + ' at ' + sample.k : 'none found');
if (sample) {
  const [lx, ly] = sample.k.split(',').map(Number);
  X.seedTo(90210);
  const ch = X.interiorAt(sample.q, sample.r, sample.d, sample.kind);
  // stand beside the lock
  X.state.foot = { q: sample.q, r: sample.r, d: sample.d, kind: sample.kind,
    x: lx, y: ly - 1, closed: [], water: [], seen: [], took: [], opened: [], crates: 0, relics: 0, steps: 0, tick: 0, dweller: null };
  X.state.alive = true;
  X.state.items = {};
  X.L.length = 0;
  X.stepFoot(lx, ly);
  const refused = X.L.some(l => /locked, and not stuck/.test(l));
  check(refused && X.state.foot.x === lx && X.state.foot.y === ly - 1,
    'with no key it will not turn, and you do not walk through it', refused ? 'refused' : 'LET THROUGH');

  X.giveItem(sample.need, 1);
  X.L.length = 0;
  X.stepFoot(lx, ly);
  check(X.itemCount(sample.need) === 0, 'and turning it spends the key',
    'held after: ' + X.itemCount(sample.need));
  check(X.L.some(l => /turns most of the way/.test(l)), 'and it says so', X.L[0] ? X.L[0].slice(0, 46) + '...' : '(silent)');

  console.log('\n--- 3. A DOOR YOU OPENED STAYS OPEN ---');
  const wasOpen = X.lockOpened(X.state.foot, sample.k);
  check(wasOpen, 'the deck remembers the lock was turned', 'recorded in deckTook');
  // surface and come back: a whole new foot, the interior regenerated
  const keep = JSON.parse(JSON.stringify(X.state.deckTook));
  X.state.foot = null;
  X.interiorCache && X.interiorCache.clear && X.interiorCache.clear();
  X.state.deckTook = keep;
  X.state.foot = { q: sample.q, r: sample.r, d: sample.d, kind: sample.kind,
    x: lx, y: ly - 1, closed: [], water: [], seen: [], took: [], opened: [], crates: 0, relics: 0, steps: 0, tick: 0, dweller: null };
  X.state.items = {};
  X.L.length = 0;
  X.stepFoot(lx, ly);
  const askedAgain = X.L.some(l => /locked, and not stuck/.test(l));
  check(!askedAgain, 'and it does not ask for a second key when you come back',
    askedAgain ? 'RE-LOCKED ITSELF' : 'still open with no key held');
}

console.log('\n' + (fail === 0 ? 'THE LOCKS HOLD — ' + ok + ' checks' : fail + ' FAILED of ' + (ok + fail)));
process.exit(fail === 0 ? 0 : 1);
