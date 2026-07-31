// WHAT GIVES A CAPTAIN A REASON TO DIVE? — an instrument. `node tests/reasons.js`
//
// Sean asked the design question directly: "What encourages a captain to dive
// and search?" The features that answer it exist — the sounder reads straight
// down, prizes are richer with depth, the board sends you deeper as you rise —
// but "it exists" has never once been the same thing as "it happens", and this
// project's whole history is the gap between those two.
//
// So this counts REASONS, per hex of ordinary sailing, in fresh worlds:
//
//   a sounder return   the boat is over something. The one honest "dig here".
//   a board job        the harbour marked a position and is paying for it.
//   a chart lead       somebody's ink says there is something at a place.
//   nothing at all     open water that will stay open water.
//
// The number that matters is the last one. If a captain can sail twenty hexes
// and be told nothing twenty times, the deep is not a place they are choosing
// not to go — it is a place nothing has ever suggested to them.
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
;var __L=[]; log=function(t,c,e){ __L.push(String(t)) };
gameStarted = true;
var __X = {
  L: __L,
  seedTo(v){ worldSeed=v; interiorSalt=':'+v; resetWorldCaches(); interiorCache.clear();
             spawnedChunks.clear(); revealed.clear(); visited.clear();
             state.leads=[]; state.berth=null; state.ticket=0; state.poisFound=[];
             state.creatures=[]; state.enclaves=[]; state.ships=[]; state.pingMemory=new Map(); },
  state, tileAt, getTile, hexKey, hexDistance, homeDock, cellRun, poiStack, poiTaken,
  soundingBelow, hexAcceptsDepth, DEPTH_GRID, SOUNDER_PRIZE, cellPois,
  ping, PING_LEVELS, setPower(p){ pingPower = function(){ return p; }; },
  pingWayTo, nearestOpeningKnown, revealFade, settledDepth, revealAt, lookAround, crewLvl,
};
`, sb, { timeout: 180000 });
const X = sb.__X;

const SEEDS = [90210, 4242, 7, 31337, 512, 8675309, 1123, 44];
const RING = 22;   // how far from the dock a first session realistically ranges

console.log('WHAT GIVES A CAPTAIN A REASON TO DIVE?');
console.log(SEEDS.length + ' fresh worlds, every water hex within ' + RING + ' of the home dock,');
console.log('the boat sitting on the surface as it would be while sailing.\n');

let totalHexes = 0, withReturn = 0;
const depths = [];
let runsToFirst = [];

for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    // The boat, on the surface, over this hex. Exactly the sounder's own case.
    X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
    X.state.foot = null;
    totalHexes++;
    // `soundingBelow` returns { odd, oddUnder, floor, ... } — oddUnder is metres
    // BELOW THE BOAT, not an absolute depth. There is no `oddAt` on the returned
    // object; reading one would have counted correctly and reported every depth
    // as blank, which is the sort of half-working probe that gets published.
    // The boat is at the surface here, so under-the-boat and absolute agree.
    let snd = null;
    try { snd = X.soundingBelow(); } catch (e) { /* reported below */ }
    if (snd && snd.odd) { withReturn++; depths.push(X.state.currentDepth + snd.oddUnder); }
  }
}

const pct = (n, d) => (100 * n / Math.max(1, d)).toFixed(1) + '%';
depths.sort((a, b) => a - b);
const med = depths.length ? depths[Math.floor(depths.length / 2)] : 0;

console.log('--- THE SOUNDER, THE ONE INSTRUMENT THAT SAYS "SOMETHING IS UNDER YOU" ---');
console.log('  water hexes walked over        ' + totalHexes);
console.log('  hexes that give a return       ' + withReturn + '   (' + pct(withReturn, totalHexes) + ' of them)');
console.log('  one return every               ' + (totalHexes / Math.max(1, withReturn)).toFixed(1) + ' hexes of sailing');
if (depths.length) {
  console.log('  median depth of the return     ' + med + ' m');
  console.log('  shallowest / deepest           ' + depths[0] + ' m / ' + depths[depths.length - 1] + ' m');
}

// How many prizes are down there AT ALL within the same ring — the sounder can
// only speak for the column the boat is in, so this is the gap between what
// exists near home and what a captain is ever told about.
let prizesNear = 0, hexesWithPrize = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    const st = X.poiStack(t);
    if (st.length) { hexesWithPrize++; prizesNear += st.length; }
  }
}
console.log('\n--- AND WHAT IS ACTUALLY DOWN THERE, IN THE SAME WATER ---');
console.log('  hexes holding at least one prize   ' + hexesWithPrize + '   (' + pct(hexesWithPrize, totalHexes) + ')');
console.log('  prizes in total                    ' + prizesNear);
console.log('  of those, hexes the sounder speaks for: ' + withReturn
  + '   (' + pct(withReturn, Math.max(1, hexesWithPrize)) + ' of the hexes that hold something)');
console.log('\nThe sounder reads ONE column — the one you are in. It is not a search');
console.log('tool, it is a confirmation tool: it tells you the water you already');
console.log('chose to be over has a bottom worth visiting. Whether a captain ever');
console.log('gets to that column is a different question, and the gap between the');
console.log('two numbers above is the size of it.');

// ---- DOES THE PING'S PRIZE SEARCH EVEN HAVE ANYTHING TO READ? --------------
// `ping()` looks for prizes with `if (tile.poi && ...)` — the field ON THE WORLD
// TILE. But `cellPois` is the durable record precisely because anything hung off
// a `world` tile is destroyed when chunk generation rebuilds it; that bug was
// measured once before at 213 of 232 prize tiles losing their `poiDepth`. If
// `tile.poi` is missing wherever a prize actually is, the ping is searching a
// field that is not there and the sonar has been blind to prizes all along.
console.log('\n--- WHAT THE PING READS vs WHAT IS ACTUALLY THERE ---');
let stacked = 0, tilePoiSet = 0, agree = 0, mismatch = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    const st = X.poiStack(t);
    if (!st.length) continue;
    stacked++;
    if (t.poi) {
      tilePoiSet++;
      if (t.poi === st[0].type) agree++;
      else if (mismatch.length < 5) mismatch.push(t.poi + ' on the tile vs ' + st[0].type + ' in the stack');
    }
  }
}
console.log('  hexes with a prize in cellPois (the durable record)  ' + stacked);
console.log('  ...of those, hexes where tile.poi is also set        ' + tilePoiSet
  + '   (' + (100 * tilePoiSet / Math.max(1, stacked)).toFixed(1) + '%)');
console.log('  ...and where it names the same thing                 ' + agree);
if (mismatch.length) console.log('  disagreements: ' + mismatch.join('; '));
console.log('  => the ping can see ' + (100 * tilePoiSet / Math.max(1, stacked)).toFixed(0)
  + '% of the prizes that exist. Anything below 100 is sonar that is blind by accident.');

// ---- DRIVE THE REAL PING ---------------------------------------------------
// Not a re-implementation of its disc: the actual `ping()`, with the power dial
// overridden, reading what it puts in the log. Line-of-sight, air cost, the
// consumed-prize rule and the d > 1 skip all apply because they are its own.
console.log('\n--- WHAT A REAL PING SAYS, FROM OPEN WATER AT THE SURFACE ---');
console.log('  power  reach  air   pings   found a prize   named a bearing to one');
for (let power = 1; power <= 5; power++) {
  X.setPower(power);
  let pings = 0, found = 0;
  for (const seed of SEEDS) {
    X.seedTo(seed);
    const hd = X.homeDock();
    // Sample open water on a coarse lattice so the pings do not all overlap.
    for (let dq = -RING; dq <= RING; dq += 5) for (let dr = -RING; dr <= RING; dr += 5) {
      const q = hd.q + dq, r = hd.r + dr;
      if (X.hexDistance({ q, r }, hd) > RING) continue;
      const t = X.tileAt(q, r);
      if (!t || t.wall || !X.hexAcceptsDepth(t, 0)) continue;
      X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
      X.state.foot = null; X.state.air = 400; X.state.alive = true;
      X.L.length = 0;
      try { X.ping(); } catch (e) { continue; }
      pings++;
      // The ping's own words for "there is something out there".
      if (X.L.some(l => /return|hard|contact|wreck|shape|something/i.test(l)
                     && /north|south|east|west/i.test(l))) found++;
    }
  }
  const lv = X.PING_LEVELS[power];
  console.log('  ' + String(power).padStart(5) + String(lv.activeRange).padStart(7)
    + String(lv.activeCost).padStart(5) + String(pings).padStart(8)
    + String(found).padStart(16) + '   ' + (100 * found / Math.max(1, pings)).toFixed(0) + '%');
}

// ---- THE GAP: NAMED, versus ACTUALLY GETTABLE ------------------------------
// The ping finds prizes. So the failure is downstream of finding, and the next
// question is whether a captain who sails to the bearing can take the thing.
// Claiming means BEING at the prize's depth in that hex, so a prize is gettable
// only if the open run holding it reaches water the boat can swim down through,
// and only if that depth is inside the starter boat's tolerance. Erebus: safe
// 1500 m, crush 2200 m.
console.log('\n--- OF THE PRIZES NEAR HOME, HOW MANY CAN A NEW BOAT ACTUALLY TAKE? ---');
const SAFE = 1500, CRUSH = 2200;
let total = 0, openToSky = 0, withinSafe = 0, withinCrush = 0, sealed = 0;
const sealedDepths = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    for (const p of X.poiStack(t)) {
      total++;
      const run = X.cellRun(q, r, p.at);
      // Does the water holding it reach the surface without going through rock?
      const sky = !!run && run.ceiling <= 0;
      if (sky) {
        openToSky++;
        if (p.at <= SAFE) withinSafe++;
        else if (p.at <= CRUSH) withinCrush++;
      } else { sealed++; sealedDepths.push(p.at); }
    }
  }
}
const P = (n) => (100 * n / Math.max(1, total)).toFixed(1) + '%';
console.log('  prizes near home                                  ' + total);
console.log('  in water open to the surface (swim straight down) ' + openToSky + '   ' + P(openToSky));
console.log('     ...and inside the starter safe depth (1500 m)  ' + withinSafe + '   ' + P(withinSafe));
console.log('     ...past safe but inside crush (1500-2200 m)    ' + withinCrush + '   ' + P(withinCrush));
console.log('  SEALED — no path down through water at all        ' + sealed + '   ' + P(sealed));
if (sealedDepths.length) {
  sealedDepths.sort((a, b) => a - b);
  console.log('     sealed prizes sit at a median of ' + sealedDepths[Math.floor(sealedDepths.length / 2)] + ' m');
}
console.log('\n  A sealed prize is not unfair — caves and sinkholes are how you reach');
console.log('  those, and that is the on-foot layer doing its job. But a ping names');
console.log('  a bearing to them exactly as confidently as to the ones you can swim');
console.log('  to, and says nothing about which kind it is.');

// ---- AND HOW FAR IS THE NEAREST WAY IN? ------------------------------------
// If 96% of prizes are behind rock, the way in is the whole game, and its
// density is the number that decides whether the deep is enterable at all.
console.log('\n--- WAYS IN (a sinkhole, a beach, a mouth) NEAR HOME ---');
let ways = 0, waysHexes = 0, nearestAll = [];
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  let nearest = 999;
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    const dd = X.hexDistance({ q, r }, hd);
    if (dd > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall) continue;
    waysHexes++;
    // 'surface' is NOT a way in — it is the marker on the water above the dock,
    // which sits one hex from the dock in every world and made this read
    // "nearest way in: 1 hex" eight times out of eight. A sinkhole is `opening`.
    const isWay = t.poi === 'opening' || X.poiStack(t).some(p => p.type === 'opening');
    if (isWay) { ways++; if (dd < nearest) nearest = dd; }
  }
  nearestAll.push(nearest);
}
nearestAll.sort((a, b) => a - b);
console.log('  ways in within ' + RING + ' of the dock, across ' + SEEDS.length + ' worlds   ' + ways
  + '   (' + (ways / SEEDS.length).toFixed(1) + ' per world)');
console.log('  distance to the NEAREST one, per world              ' + nearestAll.join(', '));
console.log('  median                                              ' + nearestAll[Math.floor(nearestAll.length / 2)] + ' hexes');

// ---- AFTER: DOES THE PING NOW SAY WHICH KIND OF RETURN IT GOT? -------------
console.log('\n--- THE PING\'S NEW SECOND LINE ---');
X.setPower(4);
let named = 0, saidOpen = 0, saidSealed = 0, gaveAWayIn = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq += 3) for (let dr = -RING; dr <= RING; dr += 3) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall || !X.hexAcceptsDepth(t, 0)) continue;
    X.state.q = q; X.state.r = r; X.state.currentDepth = 0;
    X.state.foot = null; X.state.air = 400; X.state.alive = true;
    X.L.length = 0;
    try { X.ping(); } catch (e) { continue; }
    const joined = X.L.join(' || ');
    if (!/m out/.test(joined)) continue;
    named++;
    if (/water is open above it/.test(joined)) saidOpen++;
    if (/rock between you and it/.test(joined)) saidSealed++;
    if (/nearest break in the floor/.test(joined)) gaveAWayIn++;
  }
}
const pc = (n) => (100 * n / Math.max(1, named)).toFixed(0) + '%';
console.log('  pings that named a prize                  ' + named);
console.log('  ...that then said you can swim to it      ' + saidOpen + '   ' + pc(saidOpen));
console.log('  ...that said there is rock in the way     ' + saidSealed + '   ' + pc(saidSealed));
console.log('  ...and of those, named a way down         ' + gaveAWayIn
  + '   (' + (100 * gaveAWayIn / Math.max(1, saidSealed)).toFixed(0) + '% of the sealed ones)');
console.log('  every named prize accounted for:          '
  + (saidOpen + saidSealed === named ? 'yes' : 'NO — ' + (named - saidOpen - saidSealed) + ' said nothing'));

// ---- AND HAS HIDING THE FLOOR'S SECRETS BLANKED THE WORLD? -----------------
// The glyph rule now covers every prize that RESTS somewhere, not just salvage.
// That is a real tightening, and the thing to check is that a captain who has
// actually sounded the depth still sees it — otherwise this is not a secret, it
// is a deletion.
console.log('\n--- THE GLYPH RULE, BEFORE AND AFTER SOUNDING THE RIGHT DEPTH ---');
let hidden = 0, shownAfter = 0, tested = 0;
for (const seed of SEEDS) {
  X.seedTo(seed);
  const hd = X.homeDock();
  for (let dq = -RING; dq <= RING; dq++) for (let dr = -RING; dr <= RING; dr++) {
    const q = hd.q + dq, r = hd.r + dr;
    if (X.hexDistance({ q, r }, hd) > RING) continue;
    const t = X.tileAt(q, r);
    if (!t || t.wall || !t.poi) continue;
    const st = X.poiStack(t); if (!st.length) continue;
    const at = X.settledDepth(t, st[0]);
    if (at <= 0) continue;
    tested++;
    X.state.currentDepth = 0;
    if (X.revealFade(q, r, at) <= 0) hidden++;         // unseen from the surface
    X.revealAt(q, r, at);                              // now chart that depth
    if (X.revealFade(q, r, at) > 0) shownAfter++;      // and it is yours
  }
}
console.log('  prizes resting below the surface        ' + tested);
console.log('  hidden from a boat that has not sounded ' + hidden + '   ('
  + (100 * hidden / Math.max(1, tested)).toFixed(0) + '%)');
console.log('  visible once the depth IS charted       ' + shownAfter + '   ('
  + (100 * shownAfter / Math.max(1, tested)).toFixed(0) + '%)');
console.log('  => a secret, not a deletion, if the second number is 100%.');
