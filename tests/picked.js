// tests/picked.js — IS A SHELF WRECK ACTUALLY POORER THAN A DEEP ONE?
//
// The sunlit shelf is thick with hulls because that is where the war was seen
// from; they are meant to be POORER than anything you have to dive for, being
// the water everyone with a better boat already worked. That intent lived in a
// comment for a week before it lived in code.
//
// This instrument exists because when the yield change finally landed, moved.js
// reported that NOTHING MOVED across nine instruments and 136 numbers — not
// because the change was dead, but because not one of them ever opens a wreck
// in shelf water. A suite that cannot see a change cannot tell you the change
// works, and "nothing moved" reads exactly like "nothing happened".
//
// Wanted: picked wrecks around half the value of unpicked hulls at the same
// depths. If that ratio drifts to 1.0 the flag has come unwired again.
//
//     node tests/picked.js
const fs = require('fs'), vm = require('vm');
function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0;
  if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0;
  if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
  if (p === 'classList') return { add() {}, remove() {}, contains() { return false }, toggle() { return false } };
  if (p === 'style') return {};
  return s; }, apply() { return s }, set() { return true }, has() { return true } }); return s; }
const script = fs.readFileSync(process.env.FATHOM_HTML || 'fathom-chart.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'getElementById', 'querySelector', 'querySelectorAll'].includes(p)) return () => mk();
  if (p === 'addEventListener') return () => {};
  return mk(); } });
let clock = 0;
const sb = { console: { log() {}, warn() {}, error() {} }, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
  parseInt, parseFloat, isNaN, isFinite, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {}, location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; vm.createContext(sb);
vm.runInContext(script + `
;function __seed(s){worldSeed=s;interiorSalt=':'+s;interiorCache.clear();rng=mulberry32(s);resetWorldCaches();spawnedChunks.clear();}
function __chunk(cq,cr){ensureChunk(cq,cr)}
function __pois(){const o=[];for(const [k,st] of cellPois){const [q,r]=k.split(',').map(Number);
  for(const pp of st) o.push({q:q,r:r,d:pp.d,type:pp.type,picked:!!pp.picked});} return o;}
function __loot(q,r,d,kind){const I=interiorAt(q,r,d,kind);let n=0,v=0;
  for(const [,t] of I.tiles){ if(!t.loot) continue; n++; const it=ITEMS[t.loot]; v += (it&&it.val)||1; }
  return {n:n,v:v};}
`, sb, { timeout: 120000 });

const rows = { picked: [], plain: [] };
for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
  sb.__seed(seed);
  for (let cq = -3; cq <= 3; cq++) for (let cr = -3; cr <= 3; cr++) sb.__chunk(cq, cr);
  for (const p of sb.__pois()) {
    if (p.type !== 'hull') continue;
    if (p.d > 900) continue;                       // compare only in shelf water
    const L = sb.__loot(p.q, p.r, p.d, 'hull');
    rows[p.picked ? 'picked' : 'plain'].push(L);
  }
}
const sum = a => a.reduce((x, y) => x + y, 0);
function say(name, a) {
  if (!a.length) { console.log('  ' + name.padEnd(9) + '  NONE FOUND — this probe is blind here'); return; }
  console.log('  ' + name.padEnd(9) + String(a.length).padStart(5) + ' wrecks   '
    + (sum(a.map(x => x.n)) / a.length).toFixed(2).padStart(6) + ' items each   '
    + (sum(a.map(x => x.v)) / a.length).toFixed(2).padStart(6) + ' value each');
}
console.log('SHELF WRECKS vs EVERY OTHER HULL IN THE SAME WATER (<=900 m, 8 seeds)');
say('picked', rows.picked);
say('plain', rows.plain);
if (rows.picked.length && rows.plain.length) {
  const rv = (sum(rows.picked.map(x => x.v)) / rows.picked.length) / (sum(rows.plain.map(x => x.v)) / rows.plain.length);
  console.log('\n  a picked wreck is ' + rv.toFixed(2) + 'x the value of an unpicked one at the same depths');
}
