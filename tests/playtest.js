// THE BOT CAPTAIN — an automated playtest harness.
//
// This is NOT a pass/fail suite. It boots the real game and PLAYS it, many
// times, with several different captains, and reports what actually happened.
// Its job is to answer the questions no unit test can:
//
//   * What kills players, and when?
//   * Can a captain ever actually afford the better boats?
//   * WHAT CONTENT IS NEVER REACHED? (the silent failure of a procedural game —
//     anything at 0% exists in the source and not in the game.)
//   * Are there softlocks — states with nothing legal to do?
//   * Which of the items are never worth using?
//
// Usage:  node tests/playtest.js [runs] [turnsPerRun]
//
// CAVEAT, STATED LOUDLY: the bot's playstyle is a GUESS at how a human plays.
// Read this output as "what is reachable and what is broken", never as "this is
// correctly tuned". Tuning needs a human who can feel it.
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const RUNS = parseInt(process.argv[2] || '120', 10);
const TURNS = parseInt(process.argv[3] || '400', 10);

function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, { get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'length') return 0;
    if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
    if (p === 'classList') return { add(){}, remove(){}, contains(){ return false; }, toggle(){ return false; } };
    if (p === 'style') return {};
    return stub;
  }, apply() { return stub; }, set() { return true; }, has() { return true; }, construct() { return stub; } });
  return stub;
}

function boot(seed) {
  const stub = makeStub();
  const pingEl = { value: '2', max: '3', addEventListener: () => {}, disabled: false, textContent: '' };
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'getElementById') return (id) => id === 'ping-power' ? pingEl : makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const mem = {};
  const sandbox = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => Date.now() },
    document: documentStub, navigator: { userAgent: 'node' },
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
  sandbox.__ping = pingEl;
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const probe =
    '\nfunction __state(){ return state; }' +
    '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; state.enclaves=[]; }' +
    '\nfunction __tile(q,r){ return tileAt(q,r); }' +
    '\nfunction __accepts(t,d){ return hexAcceptsDepth(t,d); }' +
    '\nfunction __sound(){ return soundingBelow(); }' +
    '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
    '\nfunction __sub(){ return activeSub(); }' +
    '\nfunction __footTile(x,y){ return footTile(x,y); }' +
    '\nfunction __footChunk(){ return footChunk(); }' +
    '\nfunction __enclaveHere(){ return enclaveHere(); }' +
    '\nfunction __items(){ return ITEMS; }' +
    '\nfunction __cultures(){ return CULTURES; }' +
    '\nfunction __sellTo(c,k){ return sellPriceTo(c,k); }' +
    '\nfunction __buyFrom(c,k){ return buyPriceFrom(c,k); }' +
    '\nfunction __dist(a,b){ return hexDistance(a,b); }' +
    '\nfunction __world(){ return world; }' +
    '\nfunction __openAt(q,r,d){ return !!cells.get(cellKey(q,r,d)); }' +
    '\nfunction __grid(){ return DEPTH_GRID; }' +
    '\nfunction __start(){ gameStarted = true; }';
  try { vm.runInContext(script + probe, sandbox, { timeout: 20000 }); }
  catch (e) { if (typeof sandbox.state === 'undefined') throw e; }
  sandbox.restart();
  sandbox.__start();
  sandbox.__seed(seed);
  sandbox.__tile(0, 0);
  return sandbox;
}

// ---- The captains. Each is a policy; none of them is a human. ----
const PERSONAS = {
  cautious:  { dive: 0.18, deepTarget: 900,  fleeAir: 0.45, ping: 0.15, fight: 0.25, enterRuin: 0.7, buy: true,  claim: true },
  reckless:  { dive: 0.42, deepTarget: 4200, fleeAir: 0.15, ping: 0.35, fight: 0.85, enterRuin: 1.0, buy: true,  claim: true },
  hoarder:   { dive: 0.25, deepTarget: 1800, fleeAir: 0.35, ping: 0.20, fight: 0.40, enterRuin: 0.9, buy: false, claim: true },
  pacifist:  { dive: 0.22, deepTarget: 1200, fleeAir: 0.50, ping: 0.10, fight: 0.05, enterRuin: 0.6, buy: true,  claim: true },
};

function newTally() {
  return {
    runs: 0, turns: 0, deaths: {}, survived: 0, softlocks: 0, traps: 0, botStuck: 0, errors: {},
    maxDepth: [], cratesBanked: [], relicsVaulted: [],
    reach: {}, itemsFound: {}, itemsUsed: {}, boats: {}, crewLost: 0, crewHired: 0,
    peakCargo: [], everCollected: 0, portVisits: 0, softlockWhere: [],
  };
}
function saw(T, key) { T.reach[key] = (T.reach[key] || 0) + 1; }

// ---- One game ----
function playOne(tallies, personaName, seed) {
  const T = tallies[0];   // primary tally; extras get the same events mirrored
  const mirror = tallies.slice(1);
  const P = PERSONAS[personaName];
  let sb;
  try { sb = boot(seed); } catch (e) { T.errors['boot: ' + e.message] = (T.errors['boot: ' + e.message] || 0) + 1; return; }
  const s = sb.__state();
  const run = { seen: {}, followedSounder: false };
  const sawOnce = (_T, _run, key) => {
    if (run.seen[key]) return;
    run.seen[key] = 1;
    saw(T, key); for (const m of mirror) saw(m, key);
  };
  let died = null, turns = 0, idle = 0, peakCargo = 0;

  const rnd = () => Math.random();
  const call = (fn, ...a) => { try { fn(...a); return true; } catch (e) {
    const k = (e && e.message ? e.message : String(e)).slice(0, 90);
    T.errors[k] = (T.errors[k] || 0) + 1; return false; } };

  for (turns = 0; turns < TURNS; turns++) {
    if (!s.alive) { died = died || 'unknown'; break; }

    // ---- ASHORE: walking an interior ----
    if (s.foot) {
      sawOnce(T, run, 'entered a ruin on foot');
      const f = s.foot, ch = sb.__footChunk();
      if (!ch) { call(sb.leaveInterior, 'out'); continue; }
      if (f.dweller) sawOnce(T, run, 'met a tenant on a deck');
      if (f.water && f.water.length > 4) sawOnce(T, run, 'was caught in a flooding deck');

      // Fight if the thing is adjacent and this captain fights.
      if (f.dweller && Math.abs(f.dweller.x - f.x) + Math.abs(f.dweller.y - f.y) <= 1) {
        if (rnd() < P.fight) { sawOnce(T, run, 'fought a tenant hand-to-hand'); call(sb.fightTenant); continue; }
        // else fall through and run
      }
      // Claim a cleared, tenantless deck when we can afford it.
      if (P.claim && !s.base && !f.dweller && s.cargo >= 6) {
        call(sb.claimOrStore);
        if (s.base) sawOnce(T, run, 'claimed a station');
        continue;
      }
      if (s.base && s.base.q === f.q && s.base.r === f.r) {
        sawOnce(T, run, 'stood in their own station');
        if (s.cargo > 0 || Object.keys(s.items || {}).length) { call(sb.claimOrStore); }
        if (s.base.stores && s.base.stores.crates >= 4 && rnd() < 0.3) { call(sb.digAdjacent); if ((s.base.carved || []).length) sawOnce(T, run, 'dug out their fortress'); }
      }
      // Leave if air is short or we have been in here too long.
      const sub = sb.__sub();
      if (s.air < sub.air * P.fleeAir || f.steps > 60) {
        const e = ch.entry;
        if (f.x === e.x && f.y === e.y) { call(sb.leaveInterior, 'out'); continue; }
        // walk toward the entry
        const step = bestStep(sb, f, e.x, e.y);
        if (step) { call(sb.stepFoot, step.x, step.y); continue; }
        call(sb.leaveInterior, 'out'); continue;
      }
      // Otherwise wander toward unlooted tiles.
      const opts = [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy]) => ({x:f.x+dx, y:f.y+dy}))
        .filter(p => { const t = sb.__footTile(p.x, p.y); return t && !(f.closed || []).includes(p.x+','+p.y); });
      if (!opts.length) { call(sb.leaveInterior, 'out'); continue; }
      // note drowned water encounters
      for (const p of opts) { const t = sb.__footTile(p.x, p.y); if (t && t.wet === 'drowned') sawOnce(T, run, 'found a drowned passage'); if (t && t.wet === 'shallow') sawOnce(T, run, 'waded through water'); }
      const pick = opts[Math.floor(rnd() * opts.length)];
      call(sb.stepFoot, pick.x, pick.y);
      continue;
    }

    // ---- ABOARD ----
    const sub = sb.__sub();
    if (s.cargo > peakCargo) peakCargo = s.cargo;
    if (sb.__dist({q: s.q, r: s.r}, {q: 1, r: 1}) <= 4) sawOnce(T, run, 'made it back to port');
    if (s.currentDepth >= 2400) sawOnce(T, run, 'reached the deep (2400m+)');
    if (s.currentDepth >= 4200) sawOnce(T, run, 'reached the abyss (4200m+)');
    if ((s.leads || []).length) sawOnce(T, run, 'was following a charted lead');
    if ((s.corpses || []).length) sawOnce(T, run, 'carried their dead');
    if (s.base) sawOnce(T, run, 'held a station');
    if (s.base && s.base.siege) sawOnce(T, run, 'had their station besieged');
    if (s.base && s.base.breached) sawOnce(T, run, 'had their station broken into');
    for (const c of s.creatures) {
      if (c.gone) continue;
      const d = sb.__dist({q:c.q,r:c.r},{q:s.q,r:s.r});
      if (d <= 3) sawOnce(T, run, 'came within reach of a ' + c.type);
    }

    // Trade if we are standing at an enclave.
    const enc = sb.__enclaveHere();
    if (enc) {
      sawOnce(T, run, 'met a people (' + enc.culture + ')');
      // sell anything they want
      let traded = false;
      for (const k of Object.keys(s.items || {})) {
        if (s.items[k] > 0 && sb.__sellTo(enc.culture, k) > 0) { call(sb.tradeSell, enc, k); traded = true; sawOnce(T, run, 'sold goods to a people'); }
      }
      if (s.relics > 0 && sb.__cultures()[enc.culture].buys.relics) { call(sb.tradeSellRelic, enc); traded = true; }
      if ((s.corpses || []).length && sb.__cultures()[enc.culture].buys.flesh) { call(sb.tradeSellBody, enc, 0); sawOnce(T, run, 'SOLD A BODY to the Deep Ones'); traded = true; }
      if (P.buy) {
        const stock = sb.__cultures()[enc.culture].sells;
        for (const k of stock) { if (s.cargo >= sb.__buyFrom(enc.culture, k) + 6) { call(sb.tradeBuy, enc, k); sawOnce(T, run, 'bought from a people'); break; } }
      }
      if (traded) { /* a turn well spent */ }
    }

    // Use what we carry when it would help.
    const items = s.items || {};
    if (s.air < sub.air * 0.4 && items.airflask) { call(sb.useItem, 'airflask'); sawOnce(T, run, 'used a consumable'); T.itemsUsed.airflask = (T.itemsUsed.airflask||0)+1; continue; }
    if (s.hull < sub.hull * 0.5 && items.patchkit) { call(sb.useItem, 'patchkit'); sawOnce(T, run, 'used a consumable'); T.itemsUsed.patchkit = (T.itemsUsed.patchkit||0)+1; continue; }
    if (s.stores != null && s.stores < 30 && items.rations) { call(sb.useItem, 'rations'); T.itemsUsed.rations = (T.itemsUsed.rations||0)+1; continue; }
    for (const k of ['sonararray','pressurehull','hydrophone','bafflegear','trimtanks']) {
      if (items[k]) { call(sb.useItem, k); sawOnce(T, run, 'fitted an upgrade to the boat'); T.itemsUsed[k] = (T.itemsUsed[k]||0)+1; break; }
    }
    if (items.seachart) { call(sb.useItem, 'seachart'); sawOnce(T, run, 'read a chart for a lead'); T.itemsUsed.seachart = (T.itemsUsed.seachart||0)+1; }
    if (items.logbook) { call(sb.useItem, 'logbook'); T.itemsUsed.logbook = (T.itemsUsed.logbook||0)+1; }

    // Fire on something if armed and it is close.
    if ((s.armament || s.torpedoes > 0) && rnd() < P.fight) {
      const before = s.torpedoes;
      call(sb.fireWeapon);
      if (s.torpedoes < before) sawOnce(T, run, 'fired a torpedo');
    }

    // Air management: run for the surface when low. Only if there IS water above
    // — driving the casing into rock is how a bot kills itself, not a captain.
    if (s.air < sub.air * P.fleeAir && s.currentDepth > 0) {
      if (canGo(sb, s, -1)) { call(sb.changeDepth, -sub.diveStep); continue; }
    }
    // At the surface with cargo: bank it (surface() handles port).
    if (s.currentDepth <= 0) {
      const banked0 = s.cargoBanked;
      call(sb.surface);
      if (s.cargoBanked > banked0) sawOnce(T, run, 'banked salvage at port');
      if (sb.__sub() !== sub) sawOnce(T, run, 'bought a better boat');
    }
    // Ping sometimes.
    if (rnd() < P.ping) { call(sb.ping); sawOnce(T, run, 'used active sonar'); }

    // Dive toward this captain's preferred depth — but only into real water.
    if (s.currentDepth < P.deepTarget && rnd() < P.dive && canGo(sb, s, 1)) {
      call(sb.changeDepth, sub.diveStep);
      continue;
    }
    // ---- Navigation. A human does not wander at random: they steer for
    // something. Pick a goal, then step toward it.
    if (!run.goal || run.goalTurns > 60 || (run.goal.q === s.q && run.goal.r === s.r)) {
      run.goal = pickGoal(sb, s, P); run.goalTurns = 0;
    }
    run.goalTurns++;

    // FOLLOW THE SOUNDER, the way a reading captain does.
    //
    // This used to dive toward `here.floor` — the seabed — which stopped being
    // where prizes are the moment they were anchored to their chambers. Worse,
    // it meant the harness could not see the signposting work at all: the
    // sounder is the game's answer to "prizes are present, reachable, and never
    // found", and a bot that ignores it under-reads every cargo number and then
    // gets quoted as evidence. It reads the same instrument now.
    const snd = sb.__sound();
    if (snd && snd.odd && snd.oddUnder > 0 && canGo(sb, s, 1)) {
      run.followedSounder = true;
      call(sb.changeDepth, sub.diveStep);
      continue;
    }
    // Legacy seabed prizes (shelf wrecks) still lie on the floor.
    const here = sb.__tile(s.q, s.r);
    if (here && here.poi && (here.poi === 'salvage' || here.poi === 'ruin') && here.floor != null
        && Math.abs(s.currentDepth - here.floor) > 60 && s.currentDepth < here.floor && canGo(sb, s, 1)) {
      call(sb.changeDepth, sub.diveStep);
      continue;
    }

    const nbrs = sb.__nbrs(s.q, s.r).filter(n => {
      const t = sb.__tile(n.q, n.r);
      return t && !t.wall && sb.__accepts(t, s.currentDepth);
    });
    if (!nbrs.length) {
      idle++;
      if (canGo(sb, s, 1)) call(sb.changeDepth, sub.diveStep);
      else if (canGo(sb, s, -1)) call(sb.changeDepth, -sub.diveStep);
      // TWO DIFFERENT THINGS, AND THEY WERE BEING REPORTED AS ONE.
      //
      // A TRAP is a cell with no lateral exit AND no vertical move — the world
      // has genuinely closed around you, and that is a generator bug.
      // Zero of those have ever been observed, and flip.test independently
      // guarantees it: BFS from the surface reaches 20,000+ cells, so the world
      // is connected by construction.
      //
      // The other kind is this BOT oscillating in a vertical shaft: it dives,
      // finds no neighbours, rises, finds none, and bobs until the counter
      // trips. That is a pathfinding failure in a policy that has no
      // pathfinding, not a hole in the world. Reporting them together made
      // every run look like it might have hit a generator bug.
      else { T.traps++; T.softlockWhere.push(`TRAP d=${s.currentDepth}m`); sawOnce(T, run, 'TRAP: world closed, no legal move'); break; }
      if (idle > 20) { T.botStuck++; sawOnce(T, run, 'bot oscillated in a shaft (not a world bug)'); break; }
      continue;
    }
    idle = 0;
    let n;
    if (run.goal) {
      let bd = sb.__dist({q: s.q, r: s.r}, run.goal), best = null;
      for (const c of nbrs) { const d = sb.__dist({q: c.q, r: c.r}, run.goal); if (d < bd) { bd = d; best = c; } }
      n = best || nbrs[Math.floor(rnd() * nbrs.length)];
    } else n = nbrs[Math.floor(rnd() * nbrs.length)];
    call(sb.move, n.q, n.r);
    if (s.crew.length) sawOnce(T, run, 'sailed with crew aboard');
  }

  // ---- tally (into every tally this run feeds) ----
  const cause = !s.alive ? (s.hull <= 0 ? 'hull failure' : s.air <= 0 ? 'air ran out' : 'unknown') : null;
  for (const t of tallies) {
    t.runs++; t.turns += turns;
    if (cause) t.deaths[cause] = (t.deaths[cause] || 0) + 1; else t.survived++;
    t.maxDepth.push(s.maxDepth || 0);
    t.cratesBanked.push(s.cargoBanked || 0);
    t.relicsVaulted.push(s.relicsBanked || 0);
    t.crewLost += (s.lostCrew || []).length;
    t.crewHired += (s.crew || []).length;
    t.peakCargo.push(peakCargo);
    if (peakCargo > 0) t.everCollected++;
    if (run.followedSounder) t.followedSounder = (t.followedSounder || 0) + 1;
    for (const k of Object.keys(s.items || {})) t.itemsFound[k] = (t.itemsFound[k] || 0) + 1;
  }
}

// What is this captain steering for? Port when heavy or hurt; a charted lead;
// an enclave; otherwise the nearest unworked prize on the chart. This is the
// difference between a tourist and a captain, and it is what a human does.
// Is there actually water one step up (-1) or down (+1)? A captain reads the
// depth strip before blowing ballast; a bot that does not simply drives itself
// into rock over and over until the hull fails.
function canGo(sb, s, dir) {
  const g = sb.__grid();
  const target = s.currentDepth + dir * g;
  if (target < 0) return false;
  if (target === 0) return true;             // the surface is always reachable
  return sb.__openAt(s.q, s.r, target);
}

function pickGoal(sb, s, P) {
  const sub = sb.__sub();
  const heavy = s.cargo >= 8, hurt = s.hull < sub.hull * 0.45;
  if (heavy || hurt) return { q: 1, r: 1 };                       // the dock
  if ((s.leads || []).length) return { q: s.leads[0].q, r: s.leads[0].r };
  for (const e of (s.enclaves || [])) {
    if (sb.__dist({q: e.q, r: e.r}, {q: s.q, r: s.r}) <= 20) return { q: e.q, r: e.r };
  }
  // Everything worth steering for. A SINKHOLE is the way down off the shelf —
  // without seeking those, a captain never reaches the game at all.
  let best = null, bd = 40, bestScore = -1;
  const W = sb.__world();
  const wantDown = s.currentDepth < P.deepTarget * 0.6;
  if (W && W.forEach) {
    W.forEach((t, k) => {
      if (!t || !t.poi) return;
      if (t.poi === 'deadend' || t.poi === 'surface') return;
      if ((s.poisFound || []).includes(k)) return;
      const d = sb.__dist({q: t.q, r: t.r}, {q: s.q, r: s.r});
      if (d <= 0 || d > 40) return;
      // Score: prizes always, openings heavily when we want to get deeper.
      let score = t.poi === 'opening' ? (wantDown ? 60 : 5) : 30;
      score -= d;
      if (score > bestScore) { bestScore = score; bd = d; best = { q: t.q, r: t.r }; }
    });
  }
  if (best) return best;
  // Nothing known: strike out in a consistent direction so we actually explore.
  const ang = Math.random() * Math.PI * 2;
  return { q: s.q + Math.round(Math.cos(ang) * 14), r: s.r + Math.round(Math.sin(ang) * 14) };
}

function bestStep(sb, f, tx, ty) {
  let best = null, bd = Math.abs(f.x - tx) + Math.abs(f.y - ty);
  for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    const nx = f.x + dx, ny = f.y + dy;
    const t = sb.__footTile(nx, ny);
    if (!t) continue;
    if ((f.closed || []).includes(nx + ',' + ny)) continue;
    const d = Math.abs(nx - tx) + Math.abs(ny - ty);
    if (d < bd) { bd = d; best = { x: nx, y: ny }; }
  }
  return best;
}

// ---- run ----
const median = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (n, d) => d ? Math.round(n / d * 100) : 0;

const ITEM_KEYS = Object.keys(boot(1).__items());
console.log(`THE BOT CAPTAIN — ${RUNS} runs x ${TURNS} turns, across ${Object.keys(PERSONAS).length} playstyles\n`);
const perPersona = {};
const T = newTally();
const names = Object.keys(PERSONAS);
for (let i = 0; i < RUNS; i++) {
  const p = names[i % names.length];
  if (!perPersona[p]) perPersona[p] = newTally();
  const seed = 1000 + i * 7717;
  playOne([T, perPersona[p]], p, seed);   // one run, tallied globally and per captain
}

console.log('=== SURVIVAL ===');
console.log(`  survived all ${TURNS} turns: ${T.survived}/${T.runs} (${pct(T.survived, T.runs)}%)`);
for (const k of Object.keys(T.deaths).sort((a, b) => T.deaths[b] - T.deaths[a])) {
  console.log(`  died — ${k}: ${T.deaths[k]} (${pct(T.deaths[k], T.runs)}%)`);
}
console.log(`  TRAPS (world closed — a generator bug): ${T.traps}${T.softlockWhere.length ? '  ' + T.softlockWhere.join(', ') : ''}`);
console.log(`  bot oscillated in a shaft (harness limitation, not a world bug): ${T.botStuck}`);

console.log('\n=== THE CAPTAINS ===');
for (const p of names) {
  const t = perPersona[p];
  console.log(`  ${p.padEnd(9)} survived ${pct(t.survived, t.runs)}%  ·  median depth ${median(t.maxDepth)}m  ·  median banked ${median(t.cratesBanked)} crates`);
}

console.log('\n=== ECONOMY ===');
console.log(`  runs that ever picked up ANY cargo: ${T.everCollected}/${T.runs} (${pct(T.everCollected, T.runs)}%)`);
console.log(`  runs that followed the sounder down: ${T.followedSounder||0}/${T.runs} (${pct(T.followedSounder||0, T.runs)}%)`);
console.log(`  median peak cargo held: ${median(T.peakCargo)}   (best ${Math.max(...T.peakCargo)})`);
console.log(`  median crates banked: ${median(T.cratesBanked)}   (max ${Math.max(...T.cratesBanked)})`);
console.log(`  median relics vaulted: ${median(T.relicsVaulted)}  (max ${Math.max(...T.relicsVaulted)})`);
console.log(`  median max depth: ${median(T.maxDepth)}m   (deepest ${Math.max(...T.maxDepth)}m)`);
console.log(`  crew lost across all runs: ${T.crewLost}`);

console.log('\n=== CONTENT REACH — what fraction of runs ever saw this? ===');
console.log('  (0% means it exists in the source and not in the game)');
const reachKeys = Object.keys(T.reach).sort((a, b) => T.reach[b] - T.reach[a]);
for (const k of reachKeys) console.log(`  ${String(pct(T.reach[k], T.runs) + '%').padStart(5)}  ${k}`);

console.log('\n=== NEVER REACHED ===');
const EXPECTED = [
  'entered a ruin on foot', 'met a tenant on a deck', 'fought a tenant hand-to-hand', 'claimed a station',
  'held a station', 'had their station besieged', 'dug out their fortress', 'stood in their own station',
  'met a people (dagon)', 'met a people (confluence)', 'met a people (libertines)',
  'sold goods to a people', 'bought from a people', 'SOLD A BODY to the Deep Ones',
  'found a drowned passage', 'waded through water', 'carried their dead',
  'fired a torpedo', 'reached the deep (2400m+)', 'reached the abyss (4200m+)',
  'was following a charted lead', 'read a chart for a lead', 'fitted an upgrade to the boat',
  'bought a better boat', 'banked salvage at port', 'used active sonar', 'sailed with crew aboard',
  'was caught in a flooding deck', 'had their station broken into',
];
const never = EXPECTED.filter(k => !T.reach[k]);
if (never.length) for (const k of never) console.log(`   0%  ${k}`);
else console.log('  (nothing — every tracked system was reached at least once)');

console.log('\n=== ITEMS ===');
const allItems = ITEM_KEYS;
const foundKeys = Object.keys(T.itemsFound);
const neverFound = allItems.filter(k => !foundKeys.includes(k));
console.log(`  distinct items ever held: ${foundKeys.length}/${allItems.length}`);
if (neverFound.length) console.log(`  NEVER FOUND: ${neverFound.join(', ')}`);
const used = Object.keys(T.itemsUsed);
console.log(`  items the bot actually used: ${used.length ? used.map(k => k + '×' + T.itemsUsed[k]).join(', ') : 'none'}`);

if (Object.keys(T.errors).length) {
  console.log('\n=== ERRORS THROWN DURING PLAY ===');
  for (const k of Object.keys(T.errors).sort((a, b) => T.errors[b] - T.errors[a])) console.log(`  ${T.errors[k]}x  ${k}`);
} else {
  console.log('\n=== ERRORS: none thrown during play ===');
}

console.log('\nNOTE: the bot is a guess at how a human plays. Read this as "what is');
console.log('reachable and what is broken", not "this is correctly tuned".');
