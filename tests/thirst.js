// tests/thirst.js — IS WATER A REAL PRESSURE, AND IS THE STILL REALLY DANGEROUS?
//
// Water costs SILENCE. That is the whole design: food already costs time (the
// drive), so a second resource is only worth having if it asks a different
// question. The still makes fresh water and goes through `noiseMade` while it
// does — the same door a ping goes through.
//
// Which is a claim, and claims of this shape are how this project has shipped
// dead content before: a thing wired at both ends that nobody ever felt. If
// running the still does not measurably raise the danger, the trade is
// decorative and the second meter is clutter, exactly as Sean feared.
//
// So this measures, on identical seeds and identical courses, the SAME voyage
// run twice — once dry and silent, once distilling:
//
//   1. does the tank actually empty, and how fast
//   2. does the still hold it up
//   3. do more things fix on you when it is running   <-- the load-bearing one
//   4. is there rain out there to find, and does a front pass
//
//     node tests/thirst.js [runs] [turns]
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

function boot() {
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
;var __L=[];(function(){var o=log;log=function(t,c,e){__L.push({t:String(t),c:String(c||''),e:String(e||'')})}})();
gameStarted = true;
function __st(){return state} function __L_(){return __L}
function __seed(s){worldSeed=s;interiorSalt=':'+s;interiorCache.clear();rng=mulberry32(s);
  resetWorldCaches();spawnedChunks.clear();state.creatures=[];state.enclaves=[];}
function __tile(q,r){return tileAt(q,r)}
function __tick(){ provisionTick(); weatherTick(); waterTick(); }
function __rainAt(q,r,m){return rainAt(q,r,m)}
function __K(){return{drain:WATER_DRAIN,make:STILL_MAKE,noise:STILL_NOISE,air:STILL_AIR,
  cell:STORM_CELL,chance:STORM_CHANCE}}
function __heat(){ // how much of the deep currently has a fix on you
  var sum=0,n=0; for (var i=0;i<state.creatures.length;i++){var c=state.creatures[i];
    if(c.gone) continue; sum += (c.alert||0) + (c.interest||0); n++; }
  return {sum:sum, n:n, base: state.base ? (state.base.threat||0) : 0};
}
// WITNESSES, PLACED ON PURPOSE. The first version of this probe cleared
// state.creatures and then asked how alarmed the creatures were, and reported
// 0.0 against 0.0 — it was measuring an empty ocean and would have called the
// whole feature proven if it had been written a little more confidently.
function __witnesses(){
  state.creatures = [];
  spawnCreature("lurker", state.q + 3, state.r, state.currentDepth);
  spawnCreature("rival",  state.q - 3, state.r, state.currentDepth);
  for (var i=0;i<state.creatures.length;i++){
    var c = state.creatures[i];
    c.awake = true; c.interest = 0; c.alert = 0; c.gone = false;
    if (c.type === "rival") { c.hostile = true; c.culture = "dagon"; }
  }
  return state.creatures.length;
}
`, sb, { timeout: 120000 });
  sb.render = function () {}; sb.updateHUD = function () {}; sb.scheduleSave = function () {};
  return sb;
}

const RUNS = parseInt(process.argv[2] || '10', 10);
const TURNS = parseInt(process.argv[3] || '260', 10);
const SEEDS = Array.from({ length: RUNS }, (_, i) => 1000 + i * 977);

// One voyage. Identical in every respect except whether the still is lit.
function voyage(sb, seed, still) {
  sb.restart();
  const st = sb.__st();
  sb.__seed(seed);
  st.q = 0; st.r = -8; st.currentDepth = 0; st.alive = true; st.foot = null;
  st.water = 100; st.stores = 100; st.still = !!still; st.air = 100000;
  st.moves = 0;
  sb.__tile(st.q, st.r);
  const witnesses = sb.__witnesses();
  if (!witnesses) throw new Error('no witnesses were placed — section 3 would be blind');
  let emptiedAt = null, rainTurns = 0, stillTurns = 0;
  for (let t = 0; t < TURNS; t++) {
    st.moves = t;
    // A fixed course, so both runs cross exactly the same water.
    st.q = Math.round(Math.sin(t / 17) * 6);
    st.r = -8 + Math.round(t / 6);
    sb.__tile(st.q, st.r);
    // They keep station on her, so the only variable is whether she is loud.
    for (const c of sb.__st().creatures) { c.q = st.q + (c.type === 'rival' ? -3 : 3); c.r = st.r; c.depth = st.currentDepth; }
    if (sb.rainHere()) rainTurns++;
    if (st.still) stillTurns++;
    sb.__tick();
    if (emptiedAt === null && sb.__st().water <= 0) emptiedAt = t;
  }
  const heat = sb.__heat();
  return { water: sb.__st().water, emptiedAt, rainTurns, stillTurns, heat: heat.sum, seen: heat.n };
}

const sb = boot();
const K = sb.__K();
console.log('THIRST — ' + RUNS + ' voyages x ' + TURNS + ' turns, the same course run twice\n');
console.log('  drain ' + K.drain + '/turn   still makes ' + K.make + '   noise ' + K.noise
  + '   storm cell ' + K.cell + ' @ ' + K.chance + '\n');

const dry = [], wet = [];
for (const sd of SEEDS) { dry.push(voyage(sb, sd, false)); wet.push(voyage(sb, sd, true)); }

const avg = (a, f) => (a.reduce((x, y) => x + f(y), 0) / a.length);
const med = (a, f) => { const v = a.map(f).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };

console.log('--- 1 & 2. DOES THE TANK EMPTY, AND DOES THE STILL HOLD IT UP ---');
console.log('  still OFF   water left ' + avg(dry, r => r.water).toFixed(0)
  + '%   ran dry in ' + dry.filter(r => r.emptiedAt !== null).length + '/' + RUNS + ' voyages'
  + (dry.some(r => r.emptiedAt !== null) ? '  (median turn ' + med(dry.filter(r => r.emptiedAt !== null), r => r.emptiedAt) + ')' : ''));
console.log('  still ON    water left ' + avg(wet, r => r.water).toFixed(0)
  + '%   ran dry in ' + wet.filter(r => r.emptiedAt !== null).length + '/' + RUNS + ' voyages');
console.log('  a full tank alone lasts ' + Math.round(100 / K.drain) + ' turns; the median run to a harbour is 26.');

console.log('\n--- 3. IS THE STILL ACTUALLY DANGEROUS? (the load-bearing claim) ---');
const hDry = avg(dry, r => r.heat), hWet = avg(wet, r => r.heat);
console.log('  fix on you, still OFF   ' + hDry.toFixed(1));
console.log('  fix on you, still ON    ' + hWet.toFixed(1));
if (hDry <= 0 && hWet <= 0) {
  console.log('  BOTH ZERO — this probe saw nothing at all and is proving nothing.');
  console.log('  (the sandbox course may never meet a creature; do not read a pass here)');
} else {
  if (hDry <= 0) {
    console.log('  the still is the ONLY thing making a sound on this course, so read this');
    console.log('  as isolation of the mechanism and not as a realistic baseline: a silent');
    console.log('  boat draws nothing, a distilling one saturates every ear beside her.');
  } else {
    const mult = hWet / hDry;
    console.log('  the still multiplies the attention on you by ' + mult.toFixed(2) + 'x');
    if (mult < 1.15) console.log('  <-- TOO LITTLE. The trade is decorative and the second meter is clutter.');
  }
  if (hWet <= 0) console.log('  <-- THE STILL DREW NOTHING. The trade does not exist.');
}

console.log('\n--- 4. IS THERE RAIN OUT THERE, AND DOES IT MOVE? ---');
console.log('  turns spent in rain on a surface course: ' + avg(dry, r => r.rainTurns).toFixed(0)
  + ' of ' + TURNS + '  (' + (100 * avg(dry, r => r.rainTurns) / TURNS).toFixed(0) + '%)');
{
  // Sky cover at one instant, and how long a front takes to pass one hex.
  let wetHex = 0, totalHex = 0;
  for (let q = -40; q <= 40; q += 2) for (let r = -40; r <= 40; r += 2) { totalHex++; if (sb.__rainAt(q, r, 0)) wetHex++; }
  console.log('  sky covered right now: ' + (100 * wetHex / totalHex).toFixed(0) + '% of a 80x80 patch');
  let runs = [], cur = 0;
  for (let t = 0; t < 4000; t++) { if (sb.__rainAt(0, 0, t)) cur++; else if (cur) { runs.push(cur); cur = 0; } }
  if (runs.length) {
    runs.sort((a, b) => a - b);
    console.log('  a front over one hex lasts ' + runs[Math.floor(runs.length / 2)] + ' turns (median of '
      + runs.length + ' in 4000), longest ' + runs[runs.length - 1]);
  } else {
    console.log('  NO RAIN EVER REACHED (0,0) IN 4000 TURNS — the wind or the cell size is wrong.');
  }
}
console.log('\n  Nothing here is a pass or a fail. The one number that decides whether');
console.log('  this feature deserves to exist is the multiplier in section 3.');
