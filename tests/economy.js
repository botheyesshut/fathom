// THE ECONOMY, MEASURED — a diagnostic, not a pass/fail suite.
//
// Three personas measured POI reachability during the audit and got 76%, 62%
// and 14%. Sean's own ruling gates every economy change behind settling that
// number, and it could not be settled because nobody wrote the definition down.
//
// So here is the definition, once, in code:
//
//   A prize is CLAIMABLE if a boat that starts at the surface can reach a cell
//   from which the game would let it take the prize.
//
// That means a real flood fill through the 3D water graph — down a column, and
// SIDEWAYS between columns at equal depth — because the game lets you swim
// sideways and any measurement that only dives straight down is measuring a
// game nobody plays. Then, at each reachable cell in the prize's own column,
// the actual `atReachableBottom` rule is applied. No approximation.
//
// It also separates the three things that get confused with each other:
//   DENSITY      how much treasure exists per unit of water
//   REACHABILITY how much of it a boat can physically get to
//   LEGIBILITY   how much of THAT the player is ever told about
// A fix aimed at the wrong one of those does nothing, which is most likely why
// the yield buff moved the needle so little.

const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8');
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
  Audio: function () { return { play: () => ({ catch: () => {} }), pause: () => {}, addEventListener: () => {} }; },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(script +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); world.clear(); cells.clear(); generatedChunks.clear(); nodeCache.clear(); edgeCache.clear(); carvedFeatures.clear(); interiorCache.clear(); }' +
  '\nfunction __tile(q,r){ return tileAt(q,r); }' +
  '\nfunction __cellsSize(){ return cells.size; }' +
  '\nfunction __isWater(q,r,d){ return cells.has(cellKey(q,r,d)); }' +
  '\nfunction __run(q,r,d){ return cellRun(q,r,d); }' +
  '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
  '\nfunction __setDepth(d){ state.currentDepth = d; }' +
  '\nfunction __reachBottom(t){ return atReachableBottom(t); }' +
  '\nfunction __grid(){ return DEPTH_GRID; }' +
  '\nfunction __world(){ return world; }' +
  '\nfunction __start(){ gameStarted = true; }' +
  '\nfunction __sound(q,r,d){ state.q=q; state.r=r; state.currentDepth=d; state.foot=null; return soundingBelow(); }',
  sandbox, { timeout: 30000 }); } catch (e) { if (typeof sandbox.state === 'undefined') { console.log('BOOT FAIL', e.message); process.exit(1); } }

const D = sandbox.__grid();
// The prizes. `kelp` and `deadend`/`surface`/`opening` are scenery or exits,
// not payouts — counting them would flatter every number in this report.
const PRIZE = ['salvage', 'ruin', 'signal', 'growth', 'air'];

const SEEDS = [20260725, 771, 4242, 99001, 31337];
const RADIUS = 26;          // hexes around the dock — about a long session's reach
const MAXD = 11400;         // the whole column — capping this was what broke the first measurement

// The three hulls, and what each survives. A prize deeper than your crush
// depth is not part of your economy no matter how reachable the geometry is.
const BOATS = [
  { name: 'Erebus (starter)', safe: 1500, crush: 2200 },
  { name: 'Charon (mid)',     safe: 2400, crush: 3200 },
  { name: 'Nyx (deep)',       safe: 6000, crush: 8000 },
];
let totals = { water: 0, prize: 0, reach: 0, claim: 0, byKind: {}, unreachByKind: {},
               depths: [], safeFor: {}, crushFor: {}, waterBand: {}, prizeBand: {} };
const BANDS = [[0,1500,'0-1500 starter safe'], [1500,2200,'1500-2200 starter risk'],
               [2200,3200,'2200-3200 mid'], [3200,6000,'3200-6000 deep'], [6000,99999,'6000+ abyss']];
const bandOf = d => (BANDS.find(b => d >= b[0] && d < b[1]) || BANDS[BANDS.length-1])[2];
for (const b of BOATS) { totals.safeFor[b.name] = 0; totals.crushFor[b.name] = 0; }

for (const seed of SEEDS) {
  sandbox.__seed(seed);
  sandbox.__start();

  // 1. Generate the region.
  const hexes = [];
  for (let dq = -RADIUS; dq <= RADIUS; dq++) {
    for (let dr = -RADIUS; dr <= RADIUS; dr++) {
      const q = 1 + dq, r = 1 + dr;
      if ((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2 > RADIUS) continue;
      const t = sandbox.__tile(q, r);
      if (t && !t.wall) hexes.push(t);
    }
  }
  const inRegion = new Set(hexes.map(t => t.q + ',' + t.r));

  // 2. Flood fill the water. Start from every surface cell — that is where a
  //    boat can always be — and spread down, up, and sideways at equal depth.
  const seen = new Set();
  const queue = [];
  for (const t of hexes) {
    if (sandbox.__isWater(t.q, t.r, 0)) { const k = t.q + ',' + t.r + ',0'; if (!seen.has(k)) { seen.add(k); queue.push([t.q, t.r, 0]); } }
  }
  const startCells = queue.length;
  while (queue.length) {
    const [q, r, d] = queue.pop();
    const push = (nq, nr, nd) => {
      if (nd < 0 || nd > MAXD) return;
      if (!inRegion.has(nq + ',' + nr)) return;
      const k = nq + ',' + nr + ',' + nd;
      if (seen.has(k)) return;
      if (!sandbox.__isWater(nq, nr, nd)) return;
      seen.add(k); queue.push([nq, nr, nd]);
    };
    push(q, r, d - D); push(q, r, d + D);
    for (const n of sandbox.__nbrs(q, r)) push(n.q, n.r, d);
  }

  // 3. Score every prize hex.
  let water = 0;
  for (const t of hexes) {
    for (let d = 0; d <= MAXD; d += D) if (sandbox.__isWater(t.q, t.r, d)) { water++; const b = bandOf(d); totals.waterBand[b] = (totals.waterBand[b]||0)+1; }
  }
  totals.water += water;

  for (const t of hexes) {
    if (!t.poi || PRIZE.indexOf(t.poi) < 0) continue;
    totals.prize++;
    totals.byKind[t.poi] = (totals.byKind[t.poi] || 0) + 1;

    // Any cell of this column the boat can get to at all?
    let anyReach = false, canClaim = false, claimDepth = null;
    for (let d = 0; d <= MAXD; d += D) {
      if (!seen.has(t.q + ',' + t.r + ',' + d)) continue;
      anyReach = true;
      sandbox.__setDepth(d);
      // The SHALLOWEST depth that works is the one that matters — that is the
      // depth the player must actually survive to take the prize. Using the
      // hex's seabed instead was wrong: atReachableBottom deliberately relaxes
      // where the true floor is sealed off behind stone.
      if (sandbox.__reachBottom(t)) { canClaim = true; claimDepth = d; break; }
    }
    if (anyReach) totals.reach++;
    if (canClaim) totals.claim++;
    else totals.unreachByKind[t.poi] = (totals.unreachByKind[t.poi] || 0) + 1;

    // AFFORDABILITY BY PRESSURE. Reaching a prize is geometry; SURVIVING the
    // depth is the boat. A prize under a starter captain's crush depth is not
    // treasure, it is a way to die — so it should not be counted as economy.
    if (canClaim) {
      const f = claimDepth == null ? 0 : claimDepth;
      totals.depths.push(f);
      const bb = bandOf(f); totals.prizeBand[bb] = (totals.prizeBand[bb]||0)+1;
      for (const b of BOATS) if (f <= b.safe) totals.safeFor[b.name]++;
      for (const b of BOATS) if (f <= b.crush) totals.crushFor[b.name]++;
    }
  }
}

// THE SOUNDER, SCORED. Its whole job is to convert an invisible prize into a
// decision, so the questions are precision (does it ever cry wolf?) and recall
// (does it stay silent over something a captain could have taken?).
let sTrue = 0, sFalse = 0, sMissed = 0, sHexes = 0;
{
  sandbox.__seed(SEEDS[0]); sandbox.__start();
  for (let dq = -RADIUS; dq <= RADIUS; dq++) for (let dr = -RADIUS; dr <= RADIUS; dr++) {
    const q = 1 + dq, r = 1 + dr;
    if ((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2 > RADIUS) continue;
    const t = sandbox.__tile(q, r);
    if (!t || t.wall) continue;
    sHexes++;
    // sound from the shallowest water in the column — where a captain arrives
    let top = null;
    for (let d = 0; d <= MAXD; d += D) if (sandbox.__isWater(q, r, d)) { top = d; break; }
    if (top === null) continue;
    const rd = sandbox.__sound(q, r, top);
    const chirped = !!(rd && rd.odd);
    const isPrize = !!(t.poi && PRIZE.indexOf(t.poi) >= 0);
    // is it genuinely claimable from this column?
    let claimable = false;
    if (isPrize) for (let d = 0; d <= MAXD; d += D) {
      if (!sandbox.__isWater(q, r, d)) continue;
      sandbox.__setDepth(d);
      if (sandbox.__reachBottom(t)) { claimable = true; break; }
    }
    if (chirped && claimable) sTrue++;
    else if (chirped && !claimable) sFalse++;
    else if (!chirped && claimable) sMissed++;
  }
}

const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : 'n/a';
console.log('THE ECONOMY, MEASURED — ' + SEEDS.length + ' seeds, radius ' + RADIUS + ' around the dock\n');
console.log('=== DENSITY ===');
console.log('  open water cells        ' + totals.water);
console.log('  prizes                  ' + totals.prize);
console.log('  prizes per 1000 cells   ' + (totals.prize / totals.water * 1000).toFixed(2));
console.log('  by kind                 ' + Object.entries(totals.byKind).map(([k, v]) => k + ' ' + v).join(' · '));
console.log('\n=== REACHABILITY (the contested number) ===');
console.log('  boat can enter the column     ' + totals.reach + '/' + totals.prize + '  ' + pct(totals.reach, totals.prize));
console.log('  AND the game lets it claim    ' + totals.claim + '/' + totals.prize + '  ' + pct(totals.claim, totals.prize));
console.log('  unclaimable by kind           ' + (Object.entries(totals.unreachByKind).map(([k, v]) => k + ' ' + v).join(' · ') || 'none'));
console.log('\n=== AFFORDABLE BY PRESSURE (of the ' + totals.claim + ' claimable) ===');
for (const b of BOATS) {
  console.log('  ' + b.name.padEnd(18) +
    ' safe ' + String(totals.safeFor[b.name]).padStart(3) + ' (' + pct(totals.safeFor[b.name], totals.claim) + ')' +
    '   survivable ' + String(totals.crushFor[b.name]).padStart(3) + ' (' + pct(totals.crushFor[b.name], totals.claim) + ')');
}
// WHERE IS THE WATER? If the playable band has no water in it, no prize-rate
// tuning can put prizes there. This separates "not enough treasure" from
// "not enough world" — they need opposite fixes.
console.log('\n=== WATER BY DEPTH BAND (where the world actually is) ===');
const bands = [[0,1500,'0-1500 starter safe'], [1500,2200,'1500-2200 starter risk'],
               [2200,3200,'2200-3200 mid'], [3200,6000,'3200-6000 deep'], [6000,99999,'6000+ abyss']];
for (const [lo, hi, label] of bands) {
  const w = totals.waterBand[label] || 0, p = totals.prizeBand[label] || 0;
  console.log('  ' + label.padEnd(24) + ' water ' + String(w).padStart(6) +
    ' (' + pct(w, totals.water) + ')   prizes ' + String(p).padStart(3) +
    '   per 1000 cells ' + (w ? (p / w * 1000).toFixed(2) : 'n/a'));
}
const ds = totals.depths.slice().sort((a, b) => a - b);
const qd = f => ds.length ? ds[Math.floor((ds.length - 1) * f)] : 0;
console.log('  depth you must SURVIVE to claim   min ' + qd(0) + '  p25 ' + qd(0.25) + '  median ' + qd(0.5) + '  p75 ' + qd(0.75) + '  max ' + qd(1));
console.log('\n=== THE SOUNDER (signposting, seed ' + SEEDS[0] + ') ===');
console.log('  hexes surveyed                ' + sHexes);
console.log('  correct alerts                ' + sTrue);
console.log('  FALSE alerts (cried wolf)     ' + sFalse);
console.log('  MISSED (claimable, silent)    ' + sMissed);
console.log('  precision                     ' + pct(sTrue, sTrue + sFalse));
console.log('  recall                        ' + pct(sTrue, sTrue + sMissed));
console.log('  alerts per 100 hexes          ' + (sHexes ? (sTrue / sHexes * 100).toFixed(1) : 'n/a'));

console.log('\nDefinition: reachable = 3D flood fill from the surface through connected');
console.log('water (down, up, and sideways at equal depth), then the real');
console.log('atReachableBottom() rule applied at each reachable depth in the column.');
