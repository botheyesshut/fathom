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
  const sandbox = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
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
    '\nfunction __seed(s){ worldSeed=s; interiorSalt=":"+s;interiorCache.clear();rng=mulberry32(s); resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; state.enclaves=[]; }' +
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
    // The harbour board, reached the way a captain reaches it: the rows the
    // window actually offers, and the button it actually presses.
    '\nfunction __portRows(){ return portRows(); }' +
    '\nfunction __portBuy(act){ return portBuy(act); }' +
    '\nfunction __boardPort(){ return boardPort(); }' +
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

// SEEDED, NOT Math.random. An instrument that rolls unseeded dice reports a
// SAMPLE and reads like a FACT — and two runs of it over identical code differ,
// which makes it impossible to diff a build against its predecessor and see
// what a change actually moved (see tests/moved.js). The bot's own dice are
// seeded PER RUN from that run's world seed, so every run still plays its own
// game and the whole report is reproducible. Set FATHOM_SEED to resample.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BOT_SEED = parseInt(process.env.FATHOM_SEED || '20260804', 10);

const wanderRand = mulberry32(BOT_SEED + 977);

function newTally() {
  return {
    runs: 0, turns: 0, deaths: {}, survived: 0, softlocks: 0, traps: 0, botStuck: 0, errors: {},
    maxDepth: [], cratesBanked: [], relicsVaulted: [],
    // WHERE THE TURNS WENT. A median max depth of 180 m against personas asking
    // for 4200 could mean the bot cannot descend, or that it is busy doing
    // something else for 800 turns. Those are opposite problems with opposite
    // fixes, and no number in this file distinguished them.
    budget: {},
    reach: {}, itemsFound: {}, itemsUsed: {}, boats: {}, crewLost: 0, crewHired: 0,
    peakCargo: [], everCollected: 0, portVisits: 0, softlockWhere: [],
    broken: {},   // invariants violated during play — see checkInvariants
  };
}
function saw(T, key) { T.reach[key] = (T.reach[key] || 0) + 1; }


// WHAT MUST NEVER BE TRUE, ASSERTED EVERY TURN OF EVERY RUN.
//
// The rest of this file measures what the game DOES. This measures what it must
// never do, continuously, across every turn of every run — which is a different
// kind of question and catches a different kind of bug. A wound system that
// quietly empties the roster, a hold that goes negative, an air tank that fills
// past its own capacity: none of these fail a check written to test something
// else, and none of them look wrong in a log. They just sit there.
//
// Cheap comparisons only. This runs tens of thousands of times per report, so
// nothing here may allocate or scan a collection. The first violation of each
// kind is recorded WITH ITS CONTEXT — turn, seed, values — because a count with
// no example is a puzzle rather than a bug report.
function checkInvariants(T, s, sub, seed, turn) {
  const bad = (name, detail) => {
    if (T.broken[name]) { T.broken[name].n++; return; }
    T.broken[name] = { n: 1, first: 'seed ' + seed + ' turn ' + turn + ': ' + detail };
  };
  const num = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v);

  if (!num(s.currentDepth)) bad('depth is not a number', String(s.currentDepth));
  else if (s.currentDepth < 0) bad('depth above the surface', s.currentDepth + ' m');

  if (!num(s.air)) bad('air is not a number', String(s.air));
  else if (s.air < 0) bad('air below zero', String(s.air));
  else if (sub && num(sub.air) && s.air > sub.air) bad('air past the tank', s.air + ' of ' + sub.air);

  if (!num(s.hull)) bad('hull is not a number', String(s.hull));
  else if (s.hull < 0) bad('hull below zero', String(s.hull));

  if (num(s.cargo) && s.cargo < 0) bad('cargo below zero', String(s.cargo));
  if (num(s.cargoBanked) && s.cargoBanked < 0) bad('banked cargo below zero', String(s.cargoBanked));
  if (num(s.relics) && s.relics < 0) bad('relics below zero', String(s.relics));

  const crew = s.crew || [];
  // A hand marked lost is spliced out of the roster by `loseCrew`; one that is
  // both lost and aboard means something removed them halfway.
  for (let i = 0; i < crew.length; i++) {
    const m = crew[i];
    if (!m) { bad('a hole in the roster', 'crew[' + i + '] is ' + String(m)); continue; }
    if (m.lost) bad('a lost hand still aboard', (m.name || '?') + ' is lost and on the roster');
    if (!num(m.nerve)) bad('nerve is not a number', (m.name || '?') + ': ' + String(m.nerve));
    else if (m.nerve < 0 || m.nerve > 100) bad('nerve outside 0-100', (m.name || '?') + ': ' + m.nerve);

    // ONE BLOW, ONE WOUND — the invariant the nerve recursion actually breaks.
    //
    // I first wrote the lost-hand check above and claimed in this comment that
    // it would have caught that bug. It would not have, and I only know because
    // I planted the bug back in a scratch build and ran this against it: not one
    // invariant fired, and `crew lost` read 0 on both builds. The claim was the
    // same species of confident-and-unchecked statement the bug itself came from.
    //
    // THIS is the one that breaks. `inflictCondition` adds exactly one row per
    // blow. When it re-entered itself through `frayNerve`, a single turn stacked
    // several. A jump of more than two conditions between consecutive turns is
    // not a bad minute, it is a loop.
    const nc = (m.conditions || []).length;
    const key = m.name || ('#' + i);
    const prev = T._cond && T._cond[key];
    if (typeof prev === 'number' && nc - prev > 2) {
      bad('conditions inflicted in a burst — something is re-entering',
        key + ' went from ' + prev + ' to ' + nc + ' in one turn');
    }
    if (!T._cond) T._cond = {};
    T._cond[key] = nc;

    if (nc > 12) bad('conditions piling up without bound', key + ' carries ' + nc);
  }
  if (crew.length > 8) bad('more hands than any hull berths', String(crew.length));

  // Ashore, the party has to be somewhere real.
  if (s.foot) {
    if (!num(s.foot.x) || !num(s.foot.y)) bad('ashore at no coordinates', s.foot.x + ',' + s.foot.y);
    if (num(s.foot.crates) && s.foot.crates < 0) bad('carrying negative crates', String(s.foot.crates));
  }
}

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

  // This run's own dice, seeded from the world it is playing, so the same
  // seed always produces the same captain making the same decisions.
  const botRand = mulberry32((BOT_SEED ^ seed) >>> 0);
  const rnd = () => botRand();
  const call = (fn, ...a) => { try { fn(...a); return true; } catch (e) {
    const k = (e && e.message ? e.message : String(e)).slice(0, 90);
    T.errors[k] = (T.errors[k] || 0) + 1; return false; } };

  for (turns = 0; turns < TURNS; turns++) {
    checkInvariants(T, s, sb.__sub && sb.__sub(), seed, turns);
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
      if (canGo(sb, s, -1)) { spend(run,'ran for air'); call(sb.changeDepth, -sub.diveStep); continue; }
    }
    // At the surface with cargo: bank it (surface() handles port).
    if (s.currentDepth <= 0) { spend(run, '(marker) was at the surface'); }
    if (s.currentDepth <= 0) {
      const banked0 = s.cargoBanked;
      call(sb.surface);
      if (s.cargoBanked > banked0) sawOnce(T, run, 'banked salvage at port');
      if (sb.__sub() !== sub) sawOnce(T, run, 'bought a better boat');

      // THE HARBOUR BOARD. The bot did not know it existed, so playtest.js has
      // been reporting the world as it was BEFORE the early game had a job in
      // it — 17% of runs ever picking up cargo, median 0 banked — and there was
      // no AFTER to compare that to. Driven through portRows/portBuy, the same
      // window and the same buttons a captain uses, so this measures what a
      // player can actually reach rather than what the functions can do.
      let bp = null;
      try { bp = sb.__boardPort(); } catch (e) { bp = null; }
      if (bp) {
        let rows = [];
        try { rows = sb.__portRows() || []; } catch (e) { rows = []; }
        const pay = rows.filter(r => r.act === 'berthpay')[0];
        if (pay) {
          const t0 = s.ticket || 0;
          call(sb.__portBuy, 'berthpay');
          if ((s.ticket || 0) > t0) sawOnce(T, run, 'collected on a posting');
        } else if (!s.berth) {
          const offer = rows.filter(r => r.act && r.act.indexOf('berth:') === 0)[0];
          if (offer) {
            call(sb.__portBuy, offer.act);
            if (s.berth) sawOnce(T, run, 'took work off the board');
          }
        }
      }
    }
    // Ping sometimes.
    if (rnd() < P.ping) { call(sb.ping); sawOnce(T, run, 'used active sonar'); }

    // ON THE MARK, AND THE MARK HAS A DEPTH. A lead pays out only within two
    // grid steps of its recorded depth — E5.2 fixed a bug where a mark at
    // 2520 m paid while you sat on the surface above it — and the bot steered
    // to the lead's HEX and then ignored its depth entirely. So it sailed to
    // the right place and collected nothing, which is most of why only 13% of
    // runs ever picked up any cargo while 85 prizes sat inside 26 hexes.
    // The chart prints the depth on the mark; a captain reads it and goes down.
    {
      const mark = (s.leads || []).find(L => L.q === s.q && L.r === s.r && L.d != null);
      if (mark) {
        const dz = mark.d - s.currentDepth;
        if (Math.abs(dz) > sb.__grid() * 2) {
          const step = dz > 0 ? sub.diveStep : -sub.diveStep;
          if ((dz > 0 && canGo(sb, s, 1)) || (dz < 0 && canGo(sb, s, -1))) {
            spend(run, 'went down to the mark');
            call(sb.changeDepth, step);
            continue;
          }
        }
      }
    }

    // A CAPTAIN WHO HAS DECIDED TO GO DEEP, GOES DEEP.
    //
    // This used to be a per-turn coin flip — `rnd() < P.dive`, at 0.18 to 0.42 —
    // laid on top of horizontal travel, and the turn budget showed exactly what
    // that produces: 83% of all turns SAILED SUBMERGED, 4% dived, and 625 dives
    // against 537 flights for air. The bot oscillated, paying deep-water air
    // prices (a move costs 1 + depth/400) for shelf-water progress, and reached
    // a median 180 m while asking for as much as 4200.
    //
    // A person does not do that. A person decides to go down, goes down, and
    // turns back when the air says so. So descent is now a COMMITMENT gated on
    // air rather than a dice roll gated on nothing: while below your target and
    // holding a working margin over your own flee threshold, going down is what
    // you do. `P.dive` stops being a per-turn probability and `P.deepTarget`
    // and `P.fleeAir` — which are statements about the captain, not the turn —
    // carry the whole personality.
    //
    // KNOB: restore `rnd() < P.dive &&` in both branches below to put the old
    // wandering behaviour back.
    const airOk = s.air > sub.air * (P.fleeAir + 0.15);
    // AND NEVER PAST WHAT THE HULL IS RATED FOR. The game prints the safe and
    // crush band on the depth readout precisely so a captain can see this, and
    // the bot was the one captain ignoring it: giving the pilot its head sent
    // the hoarder (deepTarget 1800) through the Erebus safe depth of 1500 and
    // survival fell from 92% to 79%, three of them hull failures. That is not
    // the deep being dangerous, it is a bot driving into a wall it was told
    // about. Capping here also makes the harness measure the PROGRESSION: a
    // captain wanting 4200 m now has to go and buy a boat rated for it.
    // ...AND DESCENT SERVES THE VOYAGE, IT DOES NOT REPLACE IT. Committing to
    // the dive puts a `continue` in front of all navigation, so a bot that
    // always wants to be deeper never arrives anywhere: leads went unvisited
    // (the "went down to the mark" branch fired 10 times in 14,303 turns) and
    // salvage went unbanked. A captain descends when they are OVER the thing
    // they came for, or when nothing else is pressing — not while crossing.
    const nearGoal = !run.goal
      || sb.__dist({ q: s.q, r: s.r }, run.goal) <= 2;
    const rated = Math.min(P.deepTarget, sub.safeDepth || P.deepTarget);
    // ...AND A FULL HOLD BEATS A DEEP ONE. Committing to the descent above put a
    // `continue` in front of the navigation that steers home, so the bot dived
    // and never came back: over 12 runs of 2500 turns, salvage banked at port
    // went from 8% of runs to ZERO. Depth is not the goal, it is how you get to
    // the goal, and a captain with a full hold or a holed boat turns for home.
    // Same two conditions `pickGoal` already uses, so there is one idea of
    // "time to go in" and not two.
    const heavyHold = s.cargo >= 8, holed = s.hull < sub.hull * 0.45;
    const wantDeeper = s.currentDepth < rated && airOk && !heavyHold && !holed && nearGoal;
    if (wantDeeper && canGo(sb, s, 1)) {
      spend(run,'dived');
      call(sb.changeDepth, sub.diveStep);
      continue;
    }

    // SIDEWAYS, ONTO A COLUMN THAT GOES ON. This is the one move the bot never
    // had, and without it every number this harness has ever printed about the
    // deep half of the game was fiction.
    //
    // A water column is DISCONTINUOUS: `tests/descent.js` reads one as
    // "0-600 m, 840-1200 m, 2640-3120 m". You descend to the bottom of your own
    // run and then `canGo(down)` is false for ever, because the next run is a
    // gap away. The way on is a neighbouring hex whose column spans the gap —
    // which is precisely what the chart already tells a human, painting a
    // perimeter INDIGO for "descend one step, then move" and CYAN for the
    // reverse. The bot was the only captain in the world who could not read it.
    //
    // Measured before this went in: personas asking for 4200 m reached a median
    // max depth of 240 m across 24 runs of 800 turns, while a breadth-first
    // search over the same voxel graph reaches 2400 m in about 60 moves and
    // 6000 m in about 120. The world was never the obstacle.
    if (wantDeeper && !canGo(sb, s, 1)) {
      const step = descentStep(sb, s);
      if (step) {
        run.steppedForDepth = (run.steppedForDepth || 0) + 1;
        if (step.q === s.q && step.r === s.r) {
          spend(run, 'piloted: changed depth to get round');
          call(sb.changeDepth, step.d - s.currentDepth);
        } else {
          spend(run, 'piloted: moved to get round');
          call(sb.move, step.q, step.r);
        }
        continue;
      }
      run.noWayDown = (run.noWayDown || 0) + 1;
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
    spend(run, s.currentDepth <= 0 ? 'sailed on the surface' : 'sailed submerged');
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
    t.noWayDown = (t.noWayDown || 0) + (run.noWayDown || 0);
    for (const k of Object.keys(run.budget || {})) t.budget[k] = (t.budget[k] || 0) + run.budget[k];
    for (const k of Object.keys(s.items || {})) t.itemsFound[k] = (t.itemsFound[k] || 0) + 1;
  }
}

// What is this captain steering for? Port when heavy or hurt; a charted lead;
// an enclave; otherwise the nearest unworked prize on the chart. This is the
// difference between a tourist and a captain, and it is what a human does.
// Is there actually water one step up (-1) or down (+1)? A captain reads the
// depth strip before blowing ballast; a bot that does not simply drives itself
// into rock over and over until the hull fails.
// THE DESCENT PILOT.
//
// A one-hex look for a ledge was not enough and the numbers said so: 53 sideways
// steps in 14,000 turns, because the bot stands at the bottom of a basin where
// no NEIGHBOUR goes deeper either. The way on can be ten hexes off and two
// levels up — over a lip, along a gallery, down a shaft — and `tests/descent.js`
// measures real routes to 2400 m at about sixty moves. A human reads that off
// the chart, which paints every perimeter cyan for "up one, then across" and
// indigo for "down one, then across". This is the bot finally reading it.
//
// Breadth-first over the sub's own two moves — across to a neighbour open at
// your depth, or one 60 m step inside your own column — and it stops at the
// first cell deeper than where it started. Bounded hard, because this runs
// inside a turn loop: RADIUS hexes, LIFT steps of vertical slack, CAP nodes.
// Returns the FIRST step of the route, or null if there is no way down nearby.
const PILOT_RADIUS = 10, PILOT_LIFT = 6, PILOT_CAP = 4000;
function descentStep(sb, s) {
  const g = sb.__grid();
  const start = { q: s.q, r: s.r, d: s.currentDepth };
  const key = (c) => c.q + ',' + c.r + ',' + c.d;
  const seen = new Set([key(start)]);
  let frontier = [{ c: start, first: null }];
  let nodes = 0;
  while (frontier.length && nodes < PILOT_CAP) {
    const next = [];
    for (const item of frontier) {
      const c = item.c;
      const moves = [];
      for (const n of sb.__nbrs(c.q, c.r)) moves.push({ q: n.q, r: n.r, d: c.d });
      moves.push({ q: c.q, r: c.r, d: c.d - g });
      moves.push({ q: c.q, r: c.r, d: c.d + g });
      for (const w of moves) {
        nodes++;
        if (w.d < 0) continue;
        // Never climb more than PILOT_LIFT above where we started — a route that
        // goes to the surface and back is a different decision (see pickGoal).
        if (w.d < s.currentDepth - PILOT_LIFT * g) continue;
        if (sb.__dist({ q: w.q, r: w.r }, start) > PILOT_RADIUS) continue;
        const k = key(w);
        if (seen.has(k)) continue;
        if (!sb.__openAt(w.q, w.r, w.d)) continue;
        seen.add(k);
        const first = item.first || w;
        if (w.d > s.currentDepth) return first;    // found water deeper than here
        next.push({ c: w, first: first });
      }
    }
    frontier = next;
  }
  return null;
}

// One line per turn, so the budget always sums to the turns actually taken.
function spend(run, what) { run.budget = run.budget || {}; run.budget[what] = (run.budget[what] || 0) + 1; }

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
  // A POSTING IS THE STRONGEST REASON TO BE ANYWHERE. Out to the mark while it
  // is unfinished, home to the quay the moment it is done — which is the whole
  // shape of the loop the board was built to create.
  if (s.berth) {
    if (s.berth.q != null && !s.berth.found) return { q: s.berth.q, r: s.berth.r };
    return { q: 1, r: 1 };
  }
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
  const ang = wanderRand() * Math.PI * 2;
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

console.log('\n=== WHERE THE TURNS WENT ===');
{
  const tot = Object.values(T.budget).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(T.budget).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of rows) {
    console.log('  ' + k.padEnd(30) + String(v).padStart(7) + '  ' + (100 * v / tot).toFixed(1) + '%');
  }
  console.log('  ' + '-'.repeat(48));
  console.log('  ' + tot + ' entries over ' + T.turns + ' turns — the (marker) row is not');
  console.log('  a turn of its own, so the rest sum to the turns actually taken.');
}
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

// THE INVARIANTS, WHICH ARE THE ONLY PART OF THIS REPORT THAT IS A VERDICT.
// Everything else here is "what happened"; this is "what must never happen",
// and a line under it is a bug rather than a reading.
console.log('');
console.log('=== INVARIANTS — what must never be true, checked every turn ===');
const brokenKeys = Object.keys(T.broken);
if (!brokenKeys.length) {
  console.log('  none violated across ' + T.turns + ' turns of ' + T.runs + ' runs');
} else {
  for (const k of brokenKeys.sort((a, b) => T.broken[b].n - T.broken[a].n)) {
    console.log('  ' + String(T.broken[k].n).padStart(6) + 'x  ' + k);
    console.log('          first: ' + T.broken[k].first);
  }
}

if (Object.keys(T.errors).length) {
  console.log('\n=== ERRORS THROWN DURING PLAY ===');
  for (const k of Object.keys(T.errors).sort((a, b) => T.errors[b] - T.errors[a])) console.log(`  ${T.errors[k]}x  ${k}`);
} else {
  console.log('\n=== ERRORS: none thrown during play ===');
}

console.log('\nNOTE: the bot is a guess at how a human plays. Read this as "what is');
console.log('reachable and what is broken", not "this is correctly tuned".');
