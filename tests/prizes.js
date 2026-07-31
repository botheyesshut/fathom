// PRIZES BY DEPTH — an instrument. `node tests/prizes.js [path-to-a-build]`
//
// It reports; it does not gate the commit. Kept because getting this measurement
// right took three attempts and two of them made it into a commit message.

// PRIZES, MEASURED ONCE AND PROPERLY.
//
// Two previous attempts disagreed by 25x and both were wrong:
//   - the first swept a 31x31 window far from the origin and found 0.006 per hex,
//     which I published in a commit message as "a trench has nothing in it";
//   - the second counted prizes across the WHOLE of `cellPois` — which chambers
//     write globally, far outside any window — and divided by trench hexes counted
//     inside a 69x69 box only. A wide numerator over a narrow denominator: 18.4%,
//     also meaningless.
//
// The rule this file exists to obey: the numerator and the denominator must cover
// the SAME hexes. Everything is confined to one window, and the window is stated.
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
function boot(html) {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
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
  vm.runInContext(script + ';var __X={ seedTo(v){worldSeed=v;interiorSalt=":"+v;resetWorldCaches();interiorCache.clear();world.clear();cells.clear()},'
    + ' world,cells,cellKey,cellRun,tileAt,getTile,cellPois,hexKey,homeShoreDist,'
    + ' trenchFloorAt:(typeof trenchFloorAt==="function"?trenchFloorAt:null),'
    + ' ABYSS_FLOOR:(typeof ABYSS_FLOOR!=="undefined"?ABYSS_FLOOR:4200), PRIZE_TYPES };', sb, { timeout: 180000 });
  return sb.__X;
}

const X = boot(fs.readFileSync(process.argv[2] || 'C:/Users/bothe/Documents/GitHub/personal/Fathom/fathom-chart.html', 'utf8'));
// SAMPLE SIZE IS SETTABLE, because the default is too small to say anything about
// trenches. A 61x61 window holds ~500 trenched hexes and about SIX prizes in them,
// and six is not a number you may compare against anything. `PRIZE_SEEDS=24` and
// `PRIZE_W=45` push it to a few hundred, which is. Defaults kept small so the
// instrument stays quick to glance at.
const NSEEDS = Math.max(1, parseInt(process.env.PRIZE_SEEDS || '3', 10));
const SEEDS = [90210, 4242, 7, 31337, 512, 8675309, 1123, 44, 90909, 2718, 1414, 6180,
               777, 20260730, 101, 55555, 8, 123456, 999, 31415, 271828, 60221, 66260, 29979]
  .slice(0, NSEEDS);
// One window, generated with a margin so every chamber that reaches into it has
// carved. (Verified: the count inside the window is stable once the margin is
// there — 9 prizes at every generation radius from 31 to 151 wide.)
const W = Math.max(5, parseInt(process.env.PRIZE_W || '30', 10)), MARGIN = 14;

const bands = [[0, 600], [600, 1200], [1200, 2400], [2400, 4200], [4200, 6000], [6000, 9000], [9000, 99999]];
const depthTally = bands.map(() => ({ n: 0, types: {} }));
let shelfHexes = 0, shelfPrizes = 0, shelfShallow = 0;
let trenchDeep = 0, plainDeep = 0;
let trenchHexes = 0, plainHexes = 0, trenchPrizes = 0, plainPrizes = 0, allPrizes = 0, allHexes = 0;
const trenchMix = {}, plainMix = {};

for (const seed of SEEDS) {
  X.seedTo(seed);
  for (let q = -W - MARGIN; q <= W + MARGIN; q++)
    for (let r = -W - MARGIN; r <= W + MARGIN; r++) X.tileAt(q, r);

  for (let q = -W; q <= W; q++) for (let r = -W; r <= W; r++) {
    const t = X.getTile(q, r);
    if (!t || t.wall) continue;
    allHexes++;
    const stack = X.cellPois.get(X.hexKey(q, r)) || [];
    allPrizes += stack.length;
    for (const p of stack) {
      for (let i = 0; i < bands.length; i++) {
        if (p.d >= bands[i][0] && p.d < bands[i][1]) {
          depthTally[i].n++; depthTally[i].types[p.type] = (depthTally[i].types[p.type] || 0) + 1; break;
        }
      }
    }
    // THE HOME SHELF, COUNTED ON ITS OWN — because this is the water Sean's
    // ruling is actually about. Any change that raises the deep by taking from
    // the shallow lands HERE, on the first hours, where income is already the
    // open problem. Counting the world total and calling it neutral is not
    // enough: neutral overall can still be a cut to the only water a new
    // captain can reach. Reported at the depths a starting boat can survive.
    if (X.homeShoreDist(q, r) < 23) {
      shelfHexes++;
      for (const p of stack) { shelfPrizes++; if (p.d <= 1200) shelfShallow++; }
      continue;
    }
    const tf = X.trenchFloorAt ? X.trenchFloorAt(q, r) : null;
    const inTrench = tf != null && tf >= X.ABYSS_FLOOR + 300;
    // AND THE SAME SPLIT FOR DEEP PRIZES ONLY. The whole-column figure cannot
    // answer the question that matters, because a trenched hex's column contains
    // every shallow prize above it too — so a change that moves prizes downward
    // inside the same column shows up as no change at all. What a captain
    // actually experiences is the density AT the depth they are at. Below 4,400 m
    // is past the abyssal floor: water you can only be in because the ground
    // opened up.
    for (const p of stack) if (p.d >= 4400) { if (inTrench) trenchDeep++; else plainDeep++; }
    if (inTrench) { trenchHexes++; trenchPrizes += stack.length; for (const p of stack) trenchMix[p.type] = (trenchMix[p.type] || 0) + 1; }
    else { plainHexes++; plainPrizes += stack.length; for (const p of stack) plainMix[p.type] = (plainMix[p.type] || 0) + 1; }
  }
}

const pct = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => k + ' ' + (v / Math.max(1, n) * 100).toFixed(0) + '%').join(' ');

console.log('PRIZES  —  one window, ' + (W * 2 + 1) + 'x' + (W * 2 + 1) + ' hexes, ' + SEEDS.length + ' seeds,'
  + ' generated with a ' + MARGIN + '-hex margin');
console.log(allPrizes + ' prizes over ' + allHexes + ' water hexes  ('
  + (allPrizes / Math.max(1, allHexes) * 100).toFixed(1) + '% of hexes hold one)\n');
console.log('depth band       count   share   mix');
for (let i = 0; i < bands.length; i++) {
  const t = depthTally[i];
  console.log((bands[i][0] + '-' + (bands[i][1] > 90000 ? 'inf' : bands[i][1])).padEnd(16)
    + String(t.n).padStart(6) + (t.n / Math.max(1, allPrizes) * 100).toFixed(1).padStart(8) + '%   ' + pct(t.types, t.n));
}
console.log('\nTHE HOME SHELF (homeShoreDist < 23) — the water the first hours happen in:');
console.log('  ' + shelfHexes + ' hexes   ' + shelfPrizes + ' prizes   '
  + (shelfPrizes / Math.max(1, shelfHexes)).toFixed(4) + ' per hex   '
  + 'of which at 1200 m or shallower: ' + shelfShallow
  + ' (' + (100 * shelfShallow / Math.max(1, shelfPrizes)).toFixed(0) + '%)');

console.log('\nSAME WINDOW, eligible water split by whether the floor is trenched:');
console.log('  in a trench   ' + String(trenchHexes).padStart(5) + ' hexes  ' + String(trenchPrizes).padStart(4) +
  ' prizes  ' + (trenchPrizes / Math.max(1, trenchHexes)).toFixed(3) + ' per hex   ' + pct(trenchMix, trenchPrizes));
console.log('  on the plain  ' + String(plainHexes).padStart(5) + ' hexes  ' + String(plainPrizes).padStart(4) +
  ' prizes  ' + (plainPrizes / Math.max(1, plainHexes)).toFixed(3) + ' per hex   ' + pct(plainMix, plainPrizes));

// BELOW 4,400 m — past the abyssal floor, so this is water that exists only
// where the ground opened. If trenches are the door to the deep bands, nearly
// all of these sit in trenched hexes; if they do not, then "dive a trench" is
// not the reason the deep got richer and I should not say that it is.
console.log('\nPRIZES DEEPER THAN 4,400 m — past the abyssal floor:');
console.log('  in trenched hexes ' + String(trenchDeep).padStart(4)
  + '   (' + (trenchDeep / Math.max(1, trenchHexes)).toFixed(4) + ' per trenched hex)');
console.log('  on the plain      ' + String(plainDeep).padStart(4)
  + '   (' + (plainDeep / Math.max(1, plainHexes)).toFixed(4) + ' per plain hex)');
const ratio = (plainDeep / Math.max(1, plainHexes));
console.log('  a trenched hex is ' + ((trenchDeep / Math.max(1, trenchHexes)) / Math.max(1e-9, ratio)).toFixed(1)
  + 'x as likely to hold one');
