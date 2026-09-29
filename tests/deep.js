// tests/deep.js — THE DEEP, WALKED.
//
//     node tests/deep.js [seeds] [radius]
//
// Nobody has ever played past 1,500 m. Not Sean, not the sea-going bot (its
// deepest run in the history of the harness is 1,500 m, the Erebus's rating),
// not any suite. The Charon, the Nyx, the pressure plate, the trenches, the
// cities of the Deep Ones, missions, commissions, alliances, households, the
// deep ruins, the pressure-wraith — all of it is wired at both ends and none of
// it has been walked. `playtest.js` cannot get there and `delve.js` walks decks,
// not water. So this goes down on purpose, three ways:
//
//   1. THE ARITHMETIC — what each hull can DO at each depth, read off the game's
//      own `applyMoveCosts` rather than a formula copied into a test (a copied
//      constant is how this project's instruments have lied before).
//   2. THE WAY DOWN — real routes from the home surface to every depth band, by
//      Dijkstra over the voxel graph with the game's costs: the surface is free
//      (the hatch is open), a 60 m step is one air, a hex at depth is what
//      `applyMoveCosts` charges there. Per hull: the cheapest one-way air to
//      reach each band, and how much of the band it can reach AND COME BACK
//      from on one tank.
//   3. DRIVEN, NOT ASSUMED — a boat put down in each band and made to sail,
//      ping, look, dive and wait through the real functions; and the city
//      chain — trade, mission, alliance, commission, household — pressed the
//      way a captain presses it.
//
// It is an instrument, not a gate. It reports what is true down there.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const SEEDS = parseInt(process.argv[2] || '3', 10);
const RADIUS = parseInt(process.argv[3] || '62', 10);   // the abyssal plain begins 53 hexes off the home shore

function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0; if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {}; return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }
const script = fs.readFileSync(process.env.FATHOM_HTML || path.join(__dirname, '..', 'fathom-chart.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '3', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
// The depth strip's four marks keep what is written to them, so the strip check
// reads what the game DREW rather than a copy of the formula it draws with.
const stripEls = {};
for (const id of ['depth-strip-marker', 'depth-strip-hex-range', 'depth-strip-safe-line', 'depth-strip-crush-line']) stripEls[id] = { style: {} };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : (stripEls[id] || mk());
  if (p === 'addEventListener') return () => {}; return mk(); } });
let clock = 0; const mem = {}; const logLines = [];
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; sb.__logLines = logLines; vm.createContext(sb);
vm.runInContext(script + `
;gameStarted = true;
const __log0 = log; log = function (t, c, e) { __logLines.push({ t: String(t), c: c || '', e: e || '' }); return __log0.apply(this, arguments); };
function __seed(s) {
  worldSeed = s; interiorSalt = ':' + s; interiorCache.clear(); rng = mulberry32(s); resetWorldCaches(); spawnedChunks.clear();
  revealed.clear(); visited.clear(); state.creatures = []; state.enclaves = []; state.ships = []; state.leads = []; state.base = null;
  state.foot = null; state.hunt = null; state.berth = null; state.standing = {}; state.allies = []; state.mission = null; state.commission = null;
  state.poisFound = []; state.items = {}; state.fits = {}; state.crew = []; state.corpses = []; state.threats = []; state.buoys = [];
  state.alive = true; state.moves = 0; state.cargo = 0; state.cargoBanked = 0; state.relics = 0; state.relicsBanked = 0;
  activeSubKey = 'erebus'; tileAt(0, 0);
}
function __subs() { const o = {}; for (const k in SUBS) o[k] = { name: SUBS[k].name, air: SUBS[k].air, hull: SUBS[k].hull, safe: SUBS[k].safeDepth, crush: SUBS[k].crushDepth,
  dive: SUBS[k].diveAirCost, fast: SUBS[k].diveAirCostFast, step: SUBS[k].diveStep, fastStep: SUBS[k].diveStepFast, price: SUBS[k].price }; Object.defineProperty(o, '__drain', { value: WATER_DRAIN }); return o; }
// What ONE horizontal move costs, measured by running the game's own function.
function __moveCost(subKey, d) {
  const keep = { k: activeSubKey, d: state.currentDepth, air: state.air, hull: state.hull, fits: state.fits, items: state.items, crew: state.crew, max: state.maxDepth };
  activeSubKey = subKey; state.fits = {}; state.items = {}; state.crew = [];
  state.currentDepth = d; state.air = 100000; state.hull = 100000;
  applyMoveCosts(1, 0);
  const out = { air: 100000 - state.air, hull: 100000 - state.hull };
  activeSubKey = keep.k; state.currentDepth = keep.d; state.air = keep.air; state.hull = keep.hull; state.fits = keep.fits; state.items = keep.items; state.crew = keep.crew;
  state.maxDepth = keep.max;   // applyMoveCosts records a max depth, and this is a measurement, not a voyage
  return out;
}
// THE CITY CHAIN, pressed the way a captain presses it.
function __cityChain(q, r, d, forced) {
  const out = { steps: [] };
  const say = (ok, what, detail) => out.steps.push({ ok: !!ok, what, detail: detail == null ? '' : String(detail) });
  let e = (state.enclaves || []).find(x => x.city && x.q === q && x.r === r && x.depth === d);
  if (!e) { spawnEnclave('dagon', q, r, d); e = state.enclaves[state.enclaves.length - 1]; e.city = true; e.name = cityName(q, r); }
  out.name = e.name;
  activeSubKey = 'nyx'; state.hull = SUBS.nyx.hull; state.air = SUBS.nyx.air;
  tileAt(q, r); state.q = q; state.r = r; state.currentDepth = d; state._atEnclave = null;
  __logLines.length = 0;
  checkEnclave();
  say(tradeAt && tradeAt.id === e.id, 'arriving opens the trade window', tradeAt ? tradeAt.id : 'nothing opened');
  say(__logLines.some(l => l.e === 'CITY'), 'and the city announces itself', (__logLines.find(l => l.e === 'CITY') || {}).t);
  let threw = null; try { renderTrade(e); } catch (err) { threw = err.message; }
  say(!threw, 'the diplomacy panel renders', threw || 'ok');
  const off = missionOffer(e);
  say(!!off && !!ITEMS[off.item], 'a mission is offered', off ? off.n + ' x ' + off.item + ' for ' + off.pay : 'none');
  if (off) {
    takeMission(e);
    say(state.mission && state.mission.item === off.item, 'taking it records it', state.mission && state.mission.item);
    const s0 = standingOf('dagon'), c0 = state.cargo;
    giveItem(off.item, off.n);
    for (let i = 0; i < off.n; i++) tradeSell(e, off.item);
    say(!state.mission, 'handing the goods over completes it', state.mission ? 'still open: ' + (state.mission.done || 0) + '/' + state.mission.n : 'done');
    say(state.cargo - c0 >= off.pay, 'and it pays what it promised', (state.cargo - c0) + ' crates against ' + off.pay + ' promised');
    say(standingOf('dagon') > s0, 'and they remember it', s0 + ' -> ' + standingOf('dagon'));
  }
  state.standing.dagon = 60;
  say(canAlly('dagon'), 'at trusted they will treat', standingBand('dagon').key);
  makeAlliance(e);
  say(alliedWith('dagon'), 'the treaty is written', (state.allies || []).join(','));
  // A commission needs a war. Walk the terms until the Deep Ones are in one.
  let term = -1;
  for (let t = 0; t < 40; t++) { state.moves = t * WAR_TERM; if (commissionFrom('dagon')) { term = t; break; } }
  say(term >= 0, 'in some term they are at war and will give a commission', term >= 0 ? 'term ' + term + ', against ' + commissionFrom('dagon') : 'no war in 40 terms');
  if (term >= 0) {
    const against = commissionFrom('dagon');
    takeCommission(e);
    say(state.commission && state.commission.against === against, 'the commission is issued', state.commission && state.commission.against);
    // A boat of the enemy, sunk under it, is a prize and not a crime.
    spawnCreature('rival', q, r, d);
    const rv = state.creatures[state.creatures.length - 1];
    rv.culture = against; rv.boat = 'Test'; rv.hull = 5;
    const sE = standingOf(against), sD = standingOf('dagon');
    hitRival(rv, 40);
    say(rv.gone, 'the enemy boat goes down', rv.gone);
    say(state.commission && state.commission.prizes === 1, 'and it is counted as a prize', state.commission && state.commission.prizes);
    say(standingOf('dagon') >= sD, 'the Deep Ones are glad of it (or already at the ceiling)', sD + ' -> ' + standingOf('dagon'));
    say(standingOf(against) < sE, 'and the enemy is not', sE + ' -> ' + standingOf(against));
  }
  return out;
}
// A HOUSEHOLD. A ruin near a city is somebody's; take from it and it is theft.
function __household(cityQ, cityR, cityD) {
  const out = { steps: [] };
  const say = (ok, what, detail) => out.steps.push({ ok: !!ok, what, detail: detail == null ? '' : String(detail) });
  let found = null;
  for (const [hk, stack] of cellPois) {
    const c = hk.indexOf(','); const q = +hk.slice(0, c), r = +hk.slice(c + 1);
    for (const p of stack) {
      if (p.type !== 'ruin') continue;
      const t = getTile(q, r); if (!t) continue;
      const at = settledDepth(t, p);
      if (inhabitedBy(q, r, p.d, 'ruin')) { found = { q, r, p, at }; break; }
    }
    if (found) break;
  }
  if (!found) { say(true, 'no ruin within a city\\'s hinterland in this world — household not exercised', ''); return out; }
  const t = tileAt(found.q, found.r);
  state.q = found.q; state.r = found.r; state.currentDepth = found.at; state.foot = null;
  state.standing.dagon = 30;   // welcome, not hostile: they stand aside
  enterInterior(t);
  say(state.foot && state.foot.household, 'the ruin is somebody\\'s house', state.foot && state.foot.household);
  say(state.foot && !state.foot.dweller, 'and they stand aside rather than fight', state.foot && state.foot.dweller ? state.foot.dweller.kind : 'nobody in the way');
  // Walk to the nearest loot and take it.
  const ch = footChunk(); let loot = null;
  for (const [k, tt] of ch.tiles) if (tt.loot) { loot = k; break; }
  if (!loot) { say(true, 'this house has nothing loose in it', ''); leaveInterior('out'); return out; }
  const [lx, ly] = loot.split(',').map(Number);
  const s0 = standingOf('dagon');
  state.foot.x = lx; state.foot.y = ly - 1;
  if (!footTile(lx, ly - 1)) { state.foot.x = lx - 1; state.foot.y = ly; }
  stepFoot(lx, ly);
  say(state.foot && state.foot.stole, 'taking from it is theft', state.foot && state.foot.stole);
  say(standingOf('dagon') < s0, 'and the Deep Ones know', s0 + ' -> ' + standingOf('dagon'));
  if (state.foot) leaveInterior('out');
  return out;
}
function __gen(R) { const C = Math.ceil(R / CHUNK) + 1; for (let cq = -C; cq <= C; cq++) for (let cr = -C; cr <= C; cr++) ensureChunk(cq, cr); }
function __homeShore(q, r) { return homeShoreDist(q, r); }
// THE WAY DOWN, as a captain would have to pay for it. Dijkstra over the cells,
// from every surface hex within R (the hatch is open up there: moving costs
// nothing and fills the tanks), with the per-depth move cost passed in.
function __reach(R, cost, diveCost) {
  const G = DEPTH_GRID;
  const dist = new Map();
  const heap = [];
  const push = (k, c) => { heap.push([c, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; };
  for (const [k, c] of cells) {
    const p1 = k.indexOf(','), p2 = k.indexOf(',', p1 + 1);
    const d = +k.slice(p2 + 1); if (d !== 0) continue;
    const q = +k.slice(0, p1), r = +k.slice(p1 + 1, p2);
    if (hexDistance({ q, r }, { q: 0, r: 0 }) > R) continue;
    dist.set(k, 0); push(k, 0);
  }
  while (heap.length) {
    const [c, k] = pop();
    if (c > (dist.get(k) ?? Infinity)) continue;
    const p1 = k.indexOf(','), p2 = k.indexOf(',', p1 + 1);
    const q = +k.slice(0, p1), r = +k.slice(p1 + 1, p2), d = +k.slice(p2 + 1);
    const step = (nk, add) => { const nc = c + add; if (nc < (dist.get(nk) ?? Infinity)) { dist.set(nk, nc); push(nk, nc); } };
    for (const n of hexNeighbors(q, r)) {
      if (hexDistance(n, { q: 0, r: 0 }) > R) continue;
      const nk = n.q + ',' + n.r + ',' + d;
      if (!cells.has(nk)) continue;
      step(nk, d === 0 ? 0 : cost[d / G] || cost[cost.length - 1]);
    }
    for (const nd of [d - G, d + G]) {
      if (nd < 0) continue;
      const nk = q + ',' + r + ',' + nd;
      if (!cells.has(nk)) continue;
      step(nk, nd === 0 ? 0 : diveCost);
    }
  }
  // Summarise by band: the cheapest cell at depth >= D, and how many cells of
  // each band are within a round trip of a given tank.
  const out = [];
  for (const [k, c] of dist) {
    const p2 = k.lastIndexOf(','); const d = +k.slice(p2 + 1);
    out.push([d, c, k]);
  }
  return out;
}
function __bandContents(R) {
  // Prizes, air, beaches and settlements, by depth, inside R of the origin.
  const rows = [];
  for (const [hk, stack] of cellPois) {
    const c = hk.indexOf(','); const q = +hk.slice(0, c), r = +hk.slice(c + 1);
    if (hexDistance({ q, r }, { q: 0, r: 0 }) > R) continue;
    const t = getTile(q, r); if (!t) continue;
    for (const p of poiStack(t)) rows.push({ kind: 'prize', type: p.type, d: p.at });
  }
  for (const [k, c] of cells) {
    if (c.kind !== 'beach') continue;
    const p1 = k.indexOf(','), p2 = k.indexOf(',', p1 + 1);
    const q = +k.slice(0, p1), r = +k.slice(p1 + 1, p2), d = +k.slice(p2 + 1);
    if (hexDistance({ q, r }, { q: 0, r: 0 }) > R) continue;
    rows.push({ kind: 'beach', d });
  }
  for (const e of (state.enclaves || [])) {
    if (hexDistance({ q: e.q, r: e.r }, { q: 0, r: 0 }) > R) continue;
    rows.push({ kind: e.city ? 'city' : 'enclave', culture: e.culture, d: e.depth, q: e.q, r: e.r, name: e.name || null });
  }
  return rows;
}
function __openAt(q, r, d) { return cells.has(cellKey(q, r, d)); }
function __st() { return state; }
function __sub() { return activeSub(); }
function __setSub(k) { activeSubKey = k; state.hull = SUBS[k].hull; state.air = SUBS[k].air; }
function __put(q, r, d) { tileAt(q, r); state.q = q; state.r = r; state.currentDepth = d; visited.add(hexKey(q, r)); revealAt(q, r, d); }
function __scene() { return sceneForNow(); }
function __track() { return trackForNow(); }
function __describe() { return describeSpace('ask'); }
function __sound() { return soundingBelow(); }
function __nbrOpen(q, r, d) { return hexNeighbors(q, r).filter(n => { const t = tileAt(n.q, n.r); return t && !t.wall && hexAcceptsDepth(t, d); }); }
function __sceneKeys() { return Object.keys(VP_SCENES); }
// OFF AN ISLAND'S FLANK, straight out into the deep. The floor drops kilometres
// here too — and there is no trench. Does the boat claim one, and is it left
// believing it is over one (which would silence the next real trench)?
function __surfaceFloor(q, r) { if (!cells.has(cellKey(q, r, 0))) return null; let d = 0; while (cells.has(cellKey(q, r, d + DEPTH_GRID))) d += DEPTH_GRID; return d; }
function __flankWalks(R, max) {
  const out = [];
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (let q = -R; q <= R && out.length < max; q += 2) for (let r = -R; r <= R && out.length < max; r += 2) {
    const f0 = __surfaceFloor(q, r);
    if (f0 == null || f0 > 600 || homeShoreDist(q, r) < TRENCH_KEEP_OUT) continue;
    for (const [dq, dr] of DIRS) {
      const path = [[q, r]]; let ok = true;
      for (let k = 1; k <= 8; k++) { const pq = q + dq * k, pr = r + dr * k; tileAt(pq, pr); if (__surfaceFloor(pq, pr) == null) { ok = false; break; } path.push([pq, pr]); }
      if (!ok || __surfaceFloor(path[8][0], path[8][1]) < 2400) continue;
      if (path.some(([a, b]) => trenchFloorAt(a, b) != null)) continue;   // a trench on the way is the other walk's business
      state.q = q; state.r = r; state.currentDepth = 0; state.alive = true; state.hull = activeSub().hull; state.air = activeSub().air;
      state._lastFloor = null; state._inTrench = false; state.foot = null;
      __logLines.length = 0;
      for (let i = 1; i < path.length && state.alive; i++) move(path[i][0], path[i][1]);
      const said = __logLines.filter(l => l.e === 'TRENCH' && /goes out/.test(l.t));
      out.push({ at: q + ',' + r, claimed: said.length > 0, stuck: !!state._inTrench,
                 moved: state.q === path[8][0] && state.r === path[8][1] });
      break;
    }
  }
  return out;
}
// TRENCHES, SAILED ACROSS. Straight across on the surface, plain to plain, the
// way a captain crosses one: does the boat say the bottom went out, does it say
// the plain came back, and is the boat left believing it is still over a trench
// once it is not (the latch that decides whether the NEXT trench is announced)?
function __trenchCrossings(R, max) {
  const out = [];
  const open = (q, r) => cells.has(cellKey(q, r, 0));
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (let q = -R; q <= R && out.length < max; q += 3) for (let r = -R; r <= R && out.length < max; r += 3) {
    if (trenchFloorAt(q, r) != null || !open(q, r)) continue;
    for (const [dq, dr] of DIRS) {
      if (trenchFloorAt(q + dq, r + dr) == null) continue;
      // The whole line, from one hex back on the plain to one hex out on the far side.
      const path = [[q - dq, r - dr], [q, r]];
      let k = 1, ok = open(q - dq, r - dr) && trenchFloorAt(q - dq, r - dr) == null;
      while (ok && k <= 14) {
        const pq = q + dq * k, pr = r + dr * k;
        if (!open(pq, pr)) { ok = false; break; }
        path.push([pq, pr]);
        if (trenchFloorAt(pq, pr) == null) break;
        k++;
      }
      if (!ok || k > 14) continue;
      for (const [pq, pr] of path) tileAt(pq, pr);
      state.q = path[0][0]; state.r = path[0][1]; state.currentDepth = 0; state.alive = true; state.hull = activeSub().hull; state.air = activeSub().air;
      state._lastFloor = null; state._inTrench = false; state.foot = null;
      __logLines.length = 0;
      const floors = [];
      for (let i = 1; i < path.length && state.alive; i++) { move(path[i][0], path[i][1]); floors.push(state._lastFloor); }
      const said = __logLines.filter(l => l.e === 'TRENCH').map(l => l.t);
      const deepest = Math.max(...path.map(([a, b]) => trenchFloorAt(a, b) || 0));
      const steps = floors.slice(1).map((f, i) => f - floors[i]);
      out.push({ at: q + ',' + r, deepest, plain: floors[0], floors, bigStep: Math.max(...steps), down: said.some(t => /goes out/.test(t)),
                 up: said.some(t => /comes back up/.test(t)), stuck: !!state._inTrench, moved: state.q === path[path.length - 1][0] && state.r === path[path.length - 1][1] });
      break;
    }
  }
  return out;
}
// The strip drawn for a boat sitting at 1,000 m, which is what lets the reader
// turn the marker's percentage back into the strip's scale.
// The deepest safe depth in the yards: every hull, all the plate her frames take,
// read off the game's own safeDepthNow() rather than added up here.
function __deepestSafe() {
  const keep = { k: activeSubKey, fits: state.fits };
  let best = 0;
  for (const k in SUBS) { activeSubKey = k; state.fits = { depth: FIT_CAP.depth }; best = Math.max(best, safeDepthNow()); }
  activeSubKey = keep.k; state.fits = keep.fits;
  return best;
}
function __strip() { state.currentDepth = 1000; state.maxDepth = 0; updateDepthStrip(); return { crushNow: crushDepthNow(), safeNow: safeDepthNow() }; }
`, sb, { timeout: 600000 });

const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
const subs = sb.__subs();
const HULLS = Object.keys(subs);
const G = 60;

// ---- 1. THE ARITHMETIC ------------------------------------------------------
console.log('THE DEEP, WALKED — ' + SEEDS + ' seed(s), routes within ' + RADIUS + ' hexes of home\n');
console.log('1. WHAT EACH HULL CAN DO AT ITS OWN RATED DEPTH — read off applyMoveCosts, not copied from it\n');
console.log('   hull      tank  rated  crush   air/move at 25% / 50% / 100% of rating   dive rnd-trip   moves of work at rating   turns   water');
const costTable = {};
for (const k of HULLS) {
  const s = subs[k];
  const table = [];
  for (let d = 0; d <= 12000; d += G) table.push(sb.__moveCost(k, d).air);
  costTable[k] = table;
  const at = (f) => table[Math.round(s.safe * f / G)];
  const rt = 2 * (s.safe / s.step) * s.dive;
  const work = Math.floor((s.air - rt) / at(1));
  const turns = 2 * s.safe / s.step;
  console.log('   ' + s.name.padEnd(8) + String(s.air).padStart(5) + String(s.safe).padStart(7) + String(s.crush).padStart(7)
    + '        ' + String(at(0.25)).padStart(3) + ' / ' + String(at(0.5)).padStart(3) + ' / ' + String(at(1)).padStart(3)
    + '              ' + String(rt).padStart(4) + '              ' + String(work).padStart(4)
    + '            ' + String(turns).padStart(4) + '   ' + String(Math.round(turns * subs.__drain)).padStart(4));
}
console.log('\n   (work = horizontal moves left on one tank at the rated depth after the slow dive down and back;');
console.log('    turns and water are for that dive alone, at ' + subs.__drain + ' water a turn against a tank of 100)');

// Past the rating: what the pressure takes per move, at each quarter of the way
// from the safe depth to the crush depth, and how many moves a full hull lasts.
console.log('\n   PAST THE RATING — hull lost per move at 25% / 50% / 75% of the way from safe to crush, and moves a full hull lasts at 50%');
for (const k of HULLS) {
  const s = subs[k];
  const gap = s.crush - s.safe;
  const hl = (f) => sb.__moveCost(k, Math.round((s.safe + gap * f) / G) * G).hull;
  console.log('   ' + s.name.padEnd(8) + '  gap ' + String(gap).padStart(5) + ' m      ' + String(hl(0.25)).padStart(3) + ' / ' + String(hl(0.5)).padStart(3) + ' / ' + String(hl(0.75)).padStart(3)
    + '        lasts ' + String(Math.floor(s.hull / Math.max(1, hl(0.5)))).padStart(3) + ' moves at halfway (hull ' + s.hull + ')');
}

// ---- 2. THE WAY DOWN, and 3. WHAT IS DOWN THERE ------------------------------
const BANDS = [600, 1500, 2400, 3600, 4200, 6000, 8000];
const perSeed = [];
for (let si = 0; si < SEEDS; si++) {
  const seed = 20260929 + si * 7717;
  sb.__seed(seed);
  sb.__gen(RADIUS + 8);
  const reach = {};
  for (const k of HULLS) {
    const s = subs[k];
    const all = sb.__reach(RADIUS, costTable[k], s.dive);
    const byBand = {};
    for (const D of BANDS) {
      let cheapest = Infinity, cells = 0, back = 0, backSafe = 0;
      for (const [d, c] of all) {
        if (d < D) continue;
        cells++;
        if (c < cheapest) cheapest = c;
        if (2 * c <= s.air) { back++; if (d <= s.crush) backSafe++; }
      }
      byBand[D] = { cheapest, cells, back, backSafe };
    }
    reach[k] = byBand;
  }
  const contents = sb.__bandContents(RADIUS);
  perSeed.push({ seed, reach, contents });
}

console.log('\n2. THE WAY DOWN — the cheapest one-way air from the home surface to anything at or below each depth,');
console.log('   and how many cells there a hull can reach AND COME BACK from on one tank, without being past its crush depth\n');
for (const D of BANDS) {
  const line = ['   ' + (D + ' m').padStart(7)];
  for (const k of HULLS) {
    const s = subs[k];
    const cheap = perSeed.map(p => p.reach[k][D].cheapest);
    const bs = perSeed.map(p => p.reach[k][D].backSafe);
    const cellsN = perSeed.map(p => p.reach[k][D].cells);
    const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
    const c = med(cheap);
    line.push(s.name.padEnd(7) + ' ' + (isFinite(c) ? String(c).padStart(4) + ' air' : '  none  ') + '  ' + String(med(bs)).padStart(6) + '/' + String(med(cellsN)).padEnd(7) + ' there-and-back');
  }
  console.log(line.join('   '));
}
console.log('\n   (medians over seeds; "there-and-back" counts cells whose round trip fits the tank AND lie above that hull\'s crush depth)');

const findings = [];
console.log('\n3. WHAT IS DOWN THERE — within ' + RADIUS + ' hexes of home, summed over ' + SEEDS + ' seed(s)\n');
const BAND_EDGES = [0, 300, 900, 1500, 2400, 3600, 4800, 6000, 12000];
const bandOf = (d) => { for (let i = BAND_EDGES.length - 1; i >= 0; i--) if (d >= BAND_EDGES[i]) return BAND_EDGES[i]; return 0; };
const tab = {};
for (const p of perSeed) for (const row of p.contents) {
  const b = bandOf(row.d);
  tab[b] = tab[b] || { prize: 0, air: 0, ruin: 0, hull: 0, signal: 0, beach: 0, enclave: 0, city: 0 };
  if (row.kind === 'prize') { tab[b].prize++; if (tab[b][row.type] != null) tab[b][row.type]++; }
  else tab[b][row.kind]++;
}
console.log('   band        prizes   (air  ruin  hull  signal)   beaches   enclaves   cities');
for (const b of BAND_EDGES.slice(0, -1)) {
  const t = tab[b] || { prize: 0, air: 0, ruin: 0, hull: 0, signal: 0, beach: 0, enclave: 0, city: 0 };
  console.log('   ' + (b + ' m+').padEnd(10) + String(t.prize).padStart(7) + '   (' + String(t.air).padStart(4) + String(t.ruin).padStart(6) + String(t.hull).padStart(6) + String(t.signal).padStart(8) + ')'
    + String(t.beach).padStart(10) + String(t.enclave).padStart(11) + String(t.city).padStart(9));
}
const cities = [].concat(...perSeed.map(p => p.contents.filter(r => r.kind === 'city')));
console.log('\n   cities within ' + RADIUS + ' hexes: ' + perSeed.map(p => p.contents.filter(r => r.kind === 'city').length).join(', ') + ' (per seed)');
const deepestSafe = sb.__deepestSafe();
const beyond = [].concat(...perSeed.map(p => p.contents.filter(r => (r.kind === 'city' || r.kind === 'enclave') && r.d > deepestSafe)));
console.log('   the deepest any boat is rated for, with all the plate she will take: ' + deepestSafe + ' m; settlements below it: ' + beyond.length
  + (beyond.length ? '  (' + beyond.map(r => r.kind + ' ' + r.d + ' m').join(', ') + ')' : ''));
if (beyond.length) findings.push(beyond.length + ' settlement(s) deeper than any fitted boat is rated for: ' + beyond.map(r => r.kind + ' ' + r.d + ' m').join(', '));

// Keep the last seed's world for part 4.
module.exports = { sb, subs, perSeed, costTable };
if (require.main === module && process.argv.includes('--part1')) process.exit(0);

// ---- 4. DRIVEN, NOT ASSUMED --------------------------------------------------
console.log('\n4. DRIVEN, NOT ASSUMED — a boat put down in each band and made to sail, ping, look and dive\n');
const sceneKeys = new Set(sb.__sceneKeys());
const last = perSeed[perSeed.length - 1];
sb.__seed(last.seed); sb.__gen(RADIUS + 8);
for (const k of HULLS) {
  const s = subs[k];
  // One real open cell in each band this hull is rated for, taken from its own route table.
  const all = sb.__reach(RADIUS, costTable[k], s.dive);
  for (const D of BANDS) {
    if (D > s.crush) continue;
    const cand = all.filter(([d, c]) => d >= D && d < D + 600 && isFinite(c)).sort((a, b) => a[1] - b[1])[0];
    if (!cand) continue;
    const [d, c, key] = cand;
    const [q, r] = key.split(',').map(Number);
    sb.__seed(last.seed); sb.__gen(RADIUS + 8);
    sb.__setSub(k); sb.__put(q, r, d);
    const st = sb.__st();
    const air0 = st.air, hull0 = st.hull;
    logLines.length = 0;
    const errs = [];
    const tryIt = (what, fn) => { try { fn(); } catch (e) { errs.push(what + ': ' + e.message); } };
    tryIt('wait', () => sb.wait());
    tryIt('ping', () => sb.ping());
    tryIt('look', () => sb.lookAround());
    for (let i = 0; i < 3; i++) {
      const nb = sb.__nbrOpen(st.q, st.r, st.currentDepth);
      if (!nb.length) break;
      tryIt('move', () => sb.move(nb[0].q, nb[0].r));
    }
    tryIt('dive', () => sb.changeDepth(s.step));
    tryIt('rise', () => sb.changeDepth(-s.step));
    let scene = null, track = null, desc = '', snd = null;
    tryIt('scene', () => { scene = sb.__scene(); });
    tryIt('track', () => { track = sb.__track(); });
    tryIt('describe', () => { desc = sb.__describe(); });
    tryIt('sound', () => { snd = sb.__sound(); });
    const note = [];
    if (errs.length) note.push('THREW: ' + errs.join('; '));
    if (scene && !sceneKeys.has(scene)) note.push('scene "' + scene + '" is not a scene');
    if (!st.alive) note.push('the boat did not survive seven actions here');
    else if (d >= 1200 && track !== 'deep' && track !== 'hunted') note.push('music "' + track + '" at ' + d + ' m');
    if (!desc) note.push('the water described itself as nothing');
    const lies = logLines.filter(l => /no floor returns|nothing breaks the seafloor/i.test(l.t) && snd && snd.floor != null);
    if (lies.length) note.push('said "' + lies[0].t.slice(0, 60) + '" over a floor the sounder reads');
    console.log('   ' + s.name.padEnd(7) + (D + ' m').padStart(7) + '  at ' + (q + ',' + r + ' ' + d + ' m').padEnd(18)
      + ' air ' + String(air0).padStart(3) + '->' + String(Math.round(st.air)).padStart(3) + '  hull ' + String(hull0).padStart(3) + '->' + String(Math.round(st.hull)).padStart(3)
      + '  scene ' + String(scene).padEnd(11) + (note.length ? '  ! ' + note.join(' | ') : '  ok'));
    if (note.length) findings.push(s.name + ' at ' + d + ' m: ' + note.join(' | '));
  }
}

// A trench, sailed into from the plain on the surface.
sb.__seed(last.seed); sb.__gen(RADIUS + 8);
sb.__setSub('nyx');
const xs = sb.__trenchCrossings(RADIUS, 40).filter(x => x.moved);
if (!xs.length) console.log('\n   no trench within ' + RADIUS + ' hexes to sail across on this seed');
else {
  const silent = xs.filter(x => !x.down), stuck = xs.filter(x => x.stuck);
  console.log('\n   ' + xs.length + ' trenches sailed straight across on the surface: the bottom going out was said on '
    + (xs.length - silent.length) + ', the plain coming back on ' + xs.filter(x => x.up).length
    + '; the boat still thought it was over a trench afterwards on ' + stuck.length);
  for (const x of xs.slice(0, 8)) console.log('     ' + x.at.padEnd(9) + ' floors ' + x.floors.join(' ') + '   biggest step ' + x.bigStep
    + (x.down ? '' : '   SILENT') + (x.stuck ? '   LATCH LEFT SET' : ''));
  if (silent.length) console.log('     (' + silent.length + ' said nothing: the deepest of them ' + Math.max(...silent.map(x => Math.max(...x.floors) - x.plain))
    + ' m under the plain, every step under 900 m — country, not a cliff)');
  if (stuck.length) findings.push(stuck.length + ' of ' + xs.length + ' crossings left the boat believing it was still over a trench, which silences the next one');
}
const fl = sb.__flankWalks(RADIUS, 40).filter(x => x.moved);
if (fl.length) {
  const claimed = fl.filter(x => x.claimed), stuckF = fl.filter(x => x.stuck);
  console.log('   ' + fl.length + ' walks off an island’s shallows straight into deep water, no trench anywhere on them: a trench was claimed on '
    + claimed.length + ', and the boat was left believing it was over one on ' + stuckF.length);
  if (claimed.length) findings.push('a trench is announced on ' + claimed.length + ' of ' + fl.length + ' walks off an island flank, where there is none');
  if (stuckF.length) findings.push(stuckF.length + ' of ' + fl.length + ' island-flank walks left the trench latch set, which silences the next real trench');
}

// The depth strip, where a fitted boat reads its own ratings off the side of the chart.
sb.__seed(last.seed); sb.__gen(8);
sb.__setSub('erebus');
const st0 = sb.__st();
st0.fits = { depth: 2 };
const strip = sb.__strip();
// marker.top is `calc(P% - 2px)` for the boat at 1,000 m, so the strip's full height is 1000 / P%.
const markPct = parseFloat(String(stripEls['depth-strip-marker'].style.top).replace('calc(', ''));
const scale = 1000 * 100 / markPct;
const drawn = (id) => Math.round(parseFloat(stripEls[id].style.top) / 100 * scale);
strip.crushDrawn = drawn('depth-strip-crush-line'); strip.safeDrawn = drawn('depth-strip-safe-line');
const stripWrong = Math.abs(strip.crushDrawn - strip.crushNow) > 5 || Math.abs(strip.safeDrawn - strip.safeNow) > 5;
console.log('\n   depth strip on a twice-plated Erebus, as drawn: safe line ' + strip.safeDrawn + ' m (rating ' + strip.safeNow + '), crush line '
  + strip.crushDrawn + ' m (rating ' + strip.crushNow + '); the strip ends at ' + Math.round(scale) + ' m' + (stripWrong ? '   <-- disagrees with the fitted rating' : ''));
if (stripWrong) findings.push('the depth strip draws a line away from the fitted rating');
st0.fits = {};

// ---- 5. THE CITY CHAIN --------------------------------------------------------
console.log('\n5. THE CITY CHAIN — arrive, trade, a mission, a treaty, a commission, a prize taken under it\n');
sb.__seed(last.seed); sb.__gen(RADIUS + 8);
let city = last.contents.find(r => r.kind === 'city');
let forced = false;
if (!city) {
  // No city within reach on this seed: put one on a real deep cell and say so.
  const nyx = sb.__reach(RADIUS, costTable.nyx, subs.nyx.dive).filter(([d]) => d >= 3600 && d < 4800).sort((a, b) => a[1] - b[1])[0];
  const [q, r] = nyx[2].split(',').map(Number);
  city = { q, r, d: nyx[0] }; forced = true;
}
const chain = sb.__cityChain(city.q, city.r, city.d, forced);
console.log('   ' + (forced ? '(no city in reach on this seed — one was placed on a real cell at ' : '(a real city at ') + city.q + ',' + city.r + ' ' + city.d + ' m: ' + chain.name + ')');
for (const s of chain.steps) {
  console.log('   ' + (s.ok ? 'ok   ' : 'FAIL ') + s.what + (s.detail ? '  — ' + s.detail.slice(0, 110) : ''));
  if (!s.ok) findings.push('city chain: ' + s.what + ' (' + s.detail + ')');
}
const house = sb.__household(city.q, city.r, city.d);
for (const s of house.steps) {
  console.log('   ' + (s.ok ? 'ok   ' : 'FAIL ') + s.what + (s.detail ? '  — ' + s.detail.slice(0, 110) : ''));
  if (!s.ok) findings.push('household: ' + s.what + ' (' + s.detail + ')');
}

console.log('\nFINDINGS FROM PARTS 3-5: ' + (findings.length ? '\n  - ' + findings.join('\n  - ') : 'none'));
