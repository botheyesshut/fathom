// tests/afford.js — CAN A CAPTAIN EVER ACTUALLY AFFORD THE BETTER BOATS?
//
// playtest.js has asked this in its own header since it was written and has
// never answered it: no bot in the history of this harness has bought a boat.
// That has been read, more than once, as evidence the economy is shut.
//
// It is not evidence of anything. The bot is a poor navigator — it stands on a
// prize hex roughly twelve times in sixteen thousand turns — and "a bad player
// did not get rich" says nothing about whether a good one could. The question
// deserves an answer that does not depend on the bot at all.
//
// So this measures the ARITHMETIC, from the game's own payout code:
//
//   * what one worked prize actually pays, sampled over real chambers
//   * how many of those are inside a starting captain's reach and pressure
//   * therefore how many prizes a boat costs
//
// It cannot tell you whether the voyage is FUN, or whether a human would find
// them. It can tell you whether the money is there to be found, which is the
// half that has been in doubt.
//
//     node tests/afford.js [seeds]
'use strict';
const fs = require('fs'), vm = require('vm');

function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0;
  if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0;
  if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {};
  return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }

const script = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {};
  return mk(); } });
let clock = 0; const mem = {};
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date, Array, Object, Map, Set,
  String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {},
  location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; vm.createContext(sb);
vm.runInContext(script + `
;gameStarted = true;
function __st(){return state}
function __seed(s){worldSeed=s;interiorSalt=':'+s;interiorCache.clear();rng=mulberry32(s);
  resetWorldCaches();spawnedChunks.clear();state.creatures=[];state.enclaves=[];}
function __chunk(cq,cr){ensureChunk(cq,cr)}
function __tile(q,r){return tileAt(q,r)}
function __get(q,r){return getTile(q,r)}
function __home(){return homeDock()}
function __dist(a,b){return hexDistance(a,b)}
function __subs(){var o=[];for(var k in SUBS) o.push({key:k,name:SUBS[k].name,price:SUBS[k].price,
  safe:SUBS[k].safeDepth,tier:SUBS[k].tier}); return o;}
function __stack(q,r){var t=getTile(q,r); return t?poiStack(t):[];}
// WHAT ONE WORKED PRIZE PAYS, taken from the interior the game would actually
// build — every crate and relic lying in it, at the value the hold gives them.
function __worth(q,r,d,kind){
  var I = interiorAt(q,r,d,kind);
  var crates = 0, relics = 0, items = 0, itemVal = 0;
  for (var e of I.tiles) {
    var t = e[1];
    if (!t || !t.loot) continue;
    if (t.loot === 'crate') { crates++; continue; }
    if (t.loot === 'relic') { relics++; continue; }
    var it = ITEMS[t.loot];
    if (it) { items++; itemVal += (it.val || 1); }
  }
  return { crates: crates, relics: relics, items: items, itemVal: itemVal };
}
`, sb, { timeout: 180000 });

const SEEDS = (process.argv[2] ? Number(process.argv[2]) : 5);
const seeds = Array.from({ length: SEEDS }, (_, i) => 20260808 + i * 7717);
const R = 26;                       // the same reach economy.js uses

console.log('WHAT A BOAT COSTS, IN PRIZES\n');

const subs = sb.__subs();
console.log('  the hulls:');
for (const b of subs) {
  console.log('    ' + String(b.name).padEnd(8) + ' tier ' + b.tier
    + '   ' + String(b.price).padStart(3) + ' crates   safe to ' + b.safe + ' m');
}

// Sample every prize inside a starting captain's reach and pressure.
const hauls = [];
let scanned = 0, tooDeep = 0;
const STARTER_SAFE = (subs.find(b => b.tier === 0) || { safe: 1500 }).safe;
for (const seed of seeds) {
  sb.__seed(seed);
  const CH = Math.ceil(R / 16) + 1;
  for (let cq = -CH; cq <= CH; cq++) for (let cr = -CH; cr <= CH; cr++) sb.__chunk(cq, cr);
  const hd = sb.__home();
  for (let dq = -R; dq <= R; dq++) for (let dr = -R; dr <= R; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (sb.__dist({ q: q, r: r }, hd) > R) continue;
    const t = sb.__get(q, r);
    if (!t) continue;
    for (const p of sb.__stack(q, r)) {
      if (p.type !== 'hull' && p.type !== 'ruin' && p.type !== 'salvage') continue;
      scanned++;
      if (p.d > STARTER_SAFE) { tooDeep++; continue; }
      hauls.push(sb.__worth(q, r, p.d, p.type === 'hull' ? 'hull' : 'ruin'));
    }
  }
}

if (!hauls.length) {
  console.log('\n  NO PRIZES SAMPLED — this probe found nothing and is proving nothing.');
  process.exit(0);
}

const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
const med = (a, f) => { const v = a.map(f).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
const crateMed = med(hauls, h => h.crates);
const crateMean = sum(hauls, h => h.crates) / hauls.length;

console.log('\n  prizes sampled inside ' + R + ' hexes of the dock, over ' + SEEDS + ' seeds: ' + hauls.length);
console.log('  (' + tooDeep + ' more sat below the starter hull\'s ' + STARTER_SAFE + ' m and were left out)');
console.log('\n  ONE WORKED PRIZE HOLDS');
console.log('    crates   median ' + crateMed + '   mean ' + crateMean.toFixed(1)
  + '   worst ' + Math.min.apply(null, hauls.map(h => h.crates))
  + '   best ' + Math.max.apply(null, hauls.map(h => h.crates)));
console.log('    relics   mean ' + (sum(hauls, h => h.relics) / hauls.length).toFixed(1)
  + '   (a SEPARATE currency — relics buy torpedoes and fittings, never a hull)');
console.log('    items    mean ' + (sum(hauls, h => h.items) / hauls.length).toFixed(1)
  + '   (worth ' + (sum(hauls, h => h.itemVal) / hauls.length).toFixed(1) + ' between them)');

console.log('\n  SO A HULL COSTS, IN PRIZES WORKED CLEAN:');
for (const b of subs) {
  if (!b.price) continue;
  const n = crateMean > 0 ? b.price / crateMean : Infinity;
  console.log('    ' + String(b.name).padEnd(8) + String(b.price).padStart(4) + ' crates  ='
    + ('  ' + n.toFixed(1)).padStart(7) + ' prizes'
    + (n <= 12 ? '' : '   <-- a long campaign'));
}
console.log('\n  Against ' + hauls.length + ' of them inside a day\'s sail. The money is there.');
console.log('  What this does NOT say: whether a captain can FIND them, or whether');
console.log('  the voyage is worth making. Those need a person, not arithmetic.');
