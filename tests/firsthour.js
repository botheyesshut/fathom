// THE FIRST HOUR — an instrument, not a suite.
//
// A fourth agent played Fathom cold, headlessly, across many seeds, and came
// back with the most damning number in the project's history: a new captain
// who does everything right sees nothing, is told "the sounder has nothing
// more to say" twelve times in twenty turns, and closes the tab. The failure
// mode of hour one is not death — 0 deaths in 40 seeds — it is boredom that
// looks exactly like a broken game.
//
// This file re-measures that audit's specific claims so the fixes can be
// checked against the numbers rather than against my confidence. Each block
// prints BEFORE (what the audit measured) next to NOW.
//
//   node tests/firsthour.js [runs] [turns]
//
// This is deliberately NOT wired into run-all.js. The battery answers "is it
// broken"; this answers "is it worth playing", and that second question has no
// pass line — it has a trend. Read the numbers, not a verdict.
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync((process.env.FATHOM_HTML || __dirname + '/../fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const RUNS = parseInt(process.argv[2] || '40', 10);
const TURNS = parseInt(process.argv[3] || '25', 10);

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
  const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
  const documentStub = new Proxy({}, { get(t, p) {
    if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
    if (p === 'getElementById') return (id) => id === 'ping-power' ? pingEl : makeStub();
    if (p === 'addEventListener') return () => {};
    return stub;
  }});
  const mem = {};
  const sandbox = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date: FrozenDate, Array, Object, Map, Set, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite,
    setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => Date.now() },
    document: documentStub, navigator: { userAgent: 'node' },
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  // THE LOG IS THE INSTRUMENT. Everything this file measures is a question
  // about what the player is TOLD, so the probe captures log() at the source
  // rather than inferring from state.
  const probe =
    '\nvar __lines = [];' +
    '\n(function(){ var _log = log; log = function(t, cls, tag){ __lines.push({t:String(t), cls:cls||"", tag:tag||"", turn: state.moves}); return _log.apply(null, arguments); }; })();' +
    '\nfunction __lines_(){ return __lines; }' +
    '\nfunction __clear(){ __lines.length = 0; }' +
    '\nfunction __state(){ return state; }' +
    '\nfunction __seed(s){ worldSeed=s; interiorSalt=":"+s;interiorCache.clear();rng=mulberry32(s); resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; state.enclaves=[]; }' +
    '\nfunction __tile(q,r){ return tileAt(q,r); }' +
    '\nfunction __accepts(t,d){ return hexAcceptsDepth(t,d); }' +
    '\nfunction __nbrs(q,r){ return hexNeighbors(q,r); }' +
    '\nfunction __start(){ gameStarted = true; }' +
    '\nfunction __look(){ lookAround(); }' +
    '\nfunction __tips(){ return TIPS; }' +
    // A TIP IS A CARD NOW, NOT A LOG LINE, and this file could not see one.
    // The tutorial was rebuilt as dismissible pop-ups at Sean's request and the
    // tips came with it — `maybeShowTip` calls `showBrief`. So the old scorer,
    // which counted log entries tagged TIP and matched their text against
    // TIPTEXT, reported every one of thirteen tips as "never fires in hour one"
    // and a median of 0 tips per run. That reads as a dead tutorial and is an
    // instrument looking in a room the furniture left.
    //
    // Captured at the door, the same trick orders.test uses: whatever the card
    // was handed, taken one function earlier than the DOM.
    '\nvar __cards = [];' +
    '\n(function(){ var o = showBrief; showBrief = function(b){ __cards.push(String(b.id)); o(b); }; })();' +
    '\nfunction __cards_(){ return __cards; }';
  try { vm.runInContext(script + probe, sandbox, { timeout: 20000 }); }
  catch (e) { if (typeof sandbox.state === 'undefined') throw e; }
  sandbox.restart();
  sandbox.__start();
  sandbox.__seed(seed);
  sandbox.__tile(0, 0);
  sandbox.__clear();
  return sandbox;
}

// A NEW CAPTAIN, not a bot optimiser. Taps Look, taps Ping, dives when there is
// water under, and otherwise wanders — which is what the audit's trace shows a
// real first session looks like.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const coldRand = mulberry32(parseInt(process.env.FATHOM_SEED || '20260804', 10));

function playCold(s, turns) {
  const st = s.__state();
  for (let t = 0; t < turns && st.alive; t++) {
    // The fallback used to be Math.random, so on any boot where the game's own
    // `rand` was not exported this instrument silently became unreproducible
    // and nobody could have told from the output. Seeded either way now.
    // A CAPTAIN DISMISSES THE CARD. Without this exactly one briefing ever
    // fires in a run — 'helm', during boot — because `briefOpen` stays true
    // for ever and `ordersTick` refuses to stack a second card on the first.
    // That is correct game behaviour and a broken harness: it made the whole
    // tutorial read as dead in this file. orders.test.js has always modelled
    // the dismissal; this one never did.
    if (s.closeBrief) s.closeBrief();
    const roll = s.rand ? s.rand() : coldRand();
    if (t === 1) { s.lookAround(); continue; }
    if (t === 2) { s.ping(); continue; }
    const snd = s.soundingBelow && s.soundingBelow();
    if (roll < 0.30 && snd && snd.under > 0) { s.changeDepth(s.activeSub().diveStep); continue; }
    const ns = s.__nbrs(st.q, st.r).filter(n => {
      const tl = s.__tile(n.q, n.r);
      return tl && !tl.wall && s.__accepts(tl, st.currentDepth);
    });
    if (ns.length) { const n = ns[Math.floor(roll * 997) % ns.length]; s.move(n.q, n.r); }
    else s.wait();
  }
  return s.__lines_();
}

const all = [];
// Cards captured per run, sliced to the cold play only so it lines up with `all`
// — the pier nudge above happens first and is not part of the hour.
const cardRuns = [];
let dockHull = [], dockTaught = 0, deaths = 0;
// The tip table, read from the game rather than duplicated here — a copy would
// drift and then quietly report the wrong tip as never firing.
const TIPTEXT = boot(1).__tips();
for (let i = 0; i < RUNS; i++) {
  const s = boot(1000 + i);
  // THE PIER. The opening paragraph says "bring it back to this dock" and the
  // dock is adjacent to spawn. The audit measured 4-8 hull for taking the game
  // at its word, with an IMPACT line that reads like a random rock strike.
  const st = s.__state();
  const before = st.hull;
  const dockN = s.__nbrs(st.q, st.r).map(n => s.__tile(n.q, n.r)).filter(t => t && t.land);
  if (dockN.length) {
    s.move(dockN[0].q, dockN[0].r);
    dockHull.push(before - st.hull);
    if (s.__lines_().some(l => l.tag === 'DOCK' || l.tag === 'SHORE')) dockTaught++;
  }
  s.__clear();
  const c0 = s.__cards_().length;
  all.push(playCold(s, TURNS));
  cardRuns.push(s.__cards_().slice(c0));
  if (!st.alive) deaths++;
}

const lines = all.flat();
const N = lines.length;
const count = (sub) => lines.filter(l => l.t.includes(sub)).length;
const tips = lines.filter(l => l.tag === 'TIP');

function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }

console.log(`\n=== THE FIRST HOUR — ${RUNS} cold boots x ${TURNS} taps, ${N} lines ===\n`);

console.log('--- THE PIER (the game points at it; it used to be a rock) ---');
const worst = dockHull.length ? Math.max(...dockHull) : 0;
console.log(`  hull lost sailing into land   BEFORE 4-8      NOW ${worst === 0 ? '0' : worst}`);
console.log(`  told why, not just hurt       BEFORE 0/${RUNS}    NOW ${dockTaught}/${dockHull.length}`);

console.log('\n--- WALLPAPER (a line restated is a line stopped being read) ---');
const silt = count('sounder has nothing more to say');
const set = count('slow and steady') + count('strong set runs');
console.log(`  "silt, nothing more to say"   BEFORE 221/1200  NOW ${silt}/${N}   (${pct(silt, N)} of all lines)`);
console.log(`  the set, restated             BEFORE 103/1200  NOW ${set}/${N}   (${pct(set, N)} of all lines)`);

console.log('\n--- THE TIPS (they are cards now, and are counted as cards) ---');
const seen = {};
for (const t of tips) {
  const k = Object.keys(TIPTEXT).find(k => TIPTEXT[k] === t.t) || '?';
  seen[k] = (seen[k] || 0) + 1;
}
// ...plus every tip that arrived as a card, which since the tutorial rebuild is
// all of them. Card ids for tips are 'tip:<key>'; briefings have bare ids.
for (const run of cardRuns) {
  for (const id of run) {
    if (id.indexOf('tip:') !== 0) continue;
    const k = id.slice(4);
    seen[k] = (seen[k] || 0) + 1;
  }
}
const order = ['log', 'shelf', 'impact', 'current', 'silent', 'layer', 'sounder', 'depth', 'crush', 'port', 'pages', 'chart', 'jettison'];
for (const k of order) {
  const n = seen[k] || 0;
  console.log(`  ${(k + '            ').slice(0, 12)} fires in ${String(n).padStart(3)} / ${RUNS} runs   ${n === 0 ? '  <-- never fires in hour one' : ''}`);
}
console.log(`  tips per run, median: ${median(cardRuns.map(r => r.filter(id => id.indexOf('tip:') === 0).length))}`);
{
  const briefs = {};
  for (const run of cardRuns) for (const id of run) if (id.indexOf('tip:') !== 0) briefs[id] = (briefs[id] || 0) + 1;
  const rows = Object.entries(briefs).sort((a, b) => b[1] - a[1]);
  console.log('  briefing cards in hour one: ' + (rows.length ? rows.map(([k, v]) => k + ' ×' + v).join(', ') : 'NONE — the tutorial never speaks'));
}

console.log('\n--- ORDER (the explanation must never arrive before the thing) ---');
// A tip is BACKWARDS if the very next line is the event it explains.
const PAIRS = { silent: 'CONTACT', layer: 'LAYER', sounder: 'SOUNDER', port: 'SALVAGE', crush: 'PRESSURE' };
let backwards = 0, forwards = 0;
for (const run of all) {
  for (let i = 0; i < run.length; i++) {
    if (run[i].tag !== 'TIP') continue;
    const k = Object.keys(TIPTEXT).find(k => TIPTEXT[k] === run[i].t);
    const want = PAIRS[k];
    if (!want) continue;
    if (run[i + 1] && run[i + 1].tag === want) backwards++;
    else if (run[i - 1] && run[i - 1].tag === want) forwards++;
  }
}
console.log(`  tip AFTER its event (right)   BEFORE 0        NOW ${forwards}`);
console.log(`  tip BEFORE its event (wrong)  BEFORE all      NOW ${backwards}`);

console.log('\n--- THE FIRST PING (7 of 10 said nothing useful, and cost 3 air) ---');
const fade = lines.filter(l => l.tag === 'ECHO' && l.t.includes('fades out at')).length;
const oldFade = lines.filter(l => l.tag === 'ECHO' && l.t === 'The ping fades into open water.').length;
console.log(`  bare "fades into open water"  BEFORE 7/10     NOW ${oldFade}`);
console.log(`  names its reach and the dial  BEFORE 0        NOW ${fade}`);

console.log('\n--- WHAT KILLS A FIRST SESSION ---');
console.log(`  deaths                        BEFORE 0/40     NOW ${deaths}/${RUNS}   (the failure is boredom, not drowning)`);
const distinctLines = new Set(lines.map(l => l.t)).size;
console.log(`  distinct lines / total        ${distinctLines}/${N} = ${pct(distinctLines, N)} — higher is less wallpaper`);
console.log('');

function median(a) { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; }

// ---- THE COLLISION TIP, forced. The cold-play bot only ever picks legal
// moves, so it never rams anything and reports `impact` as never firing. That
// is a fact about the bot, not the game. This drives a wall on purpose.
{
  // Walk out until a wall is adjacent — one seed's spawn may be all water.
  const s = boot(7);
  const st = s.__state();
  let wall = null;
  for (let step = 0; step < 40 && !wall; step++) {
    // Either kind of stone counts: a wall hex, or a hex whose water is at
    // another depth. Both fall into the collision path and both cost hull.
    wall = s.__nbrs(st.q, st.r).map(n => s.__tile(n.q, n.r))
            .find(t => t && !t.land && (t.wall || !s.__accepts(t, st.currentDepth)));
    if (wall) break;
    const ns = s.__nbrs(st.q, st.r).map(n => s.__tile(n.q, n.r))
                .filter(t => t && !t.wall && s.__accepts(t, st.currentDepth));
    if (!ns.length) { s.changeDepth(s.activeSub().diveStep); continue; }
    s.move(ns[step % ns.length].q, ns[step % ns.length].r);
    if (step % 3 === 2) s.changeDepth(s.activeSub().diveStep);
  }
  s.__clear();
  if (wall) {
    const h0 = st.hull;
    s.move(wall.q, wall.r);
    const ls = s.__lines_();
    const hurt = h0 - st.hull;
    const taught = ls.some(l => l.tag === 'TIP' && l.t === TIPTEXT.impact);
    const order = ls.findIndex(l => l.tag === 'IMPACT') < ls.findIndex(l => l.tag === 'TIP');
    console.log('--- THE FIRST COLLISION (forced; the bot never rams) ---');
    console.log(`  hull cost kept                BEFORE 4-8      NOW ${hurt}`);
    console.log(`  and now explained             BEFORE never    NOW ${taught ? 'yes' : 'NO'}`);
    console.log(`  in the right order            —               ${order ? 'yes' : 'NO'}\n`);
  } else {
    console.log('--- THE FIRST COLLISION: no wall adjacent to spawn in seed 7\n');
  }
}
