// tests/quarry.js — DOES THE AMBUSH ACTUALLY WORK, AND IS IT GRADED?
//
// This instrument exists because the first hunt build shipped a mechanic that
// could not be won by anybody, and no suite in the battery would ever have said
// so: every function was defined, every function was called, the syntax was
// clean, and a captain would simply have watched every fish in the sea swim
// away. Reachability is not playability.
//
// It drives the REAL engine — placements are tested by snapshot-and-restore
// against huntSpook() itself, so nothing here re-implements a rule it is
// checking. The player it simulates is COMPETENT, NOT OPTIMAL: it lays a net
// beside the forecast landing hex and commits when a drive would win. Treat the
// numbers as a floor.
//
// What to look for:
//   - the ladder must be MONOTONIC in speed. Sean's rule is that value buys
//     difficulty; if a marlin is as easy as a cod, the rule is not implemented.
//   - nothing at 0/12. A quarry that cannot be taken is a tease, not a challenge.
//   - nothing at 12/12 above move 0. Free food is not a minigame.
//
//     node tests/quarry.js          (FATHOM_HTML overrides the file, as everywhere)
//
// NOT tests/hunt.js — that name was already taken by the instrument for the
// CREATURE cat-and-mouse loop (decoys, the thermocline, the lurker), and this
// file briefly overwrote it. Two different meanings of "hunt" in one game: what
// hunts you, and what you eat.
const fs = require('fs'), vm = require('vm');
function mk() { const fn = function () { return s }; const s = new Proxy(fn, {
  get(t, p) {
    if (p === Symbol.toPrimitive) return () => 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === 'length') return 0;
    if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
    if (p === 'classList') return { add() {}, remove() {}, contains() { return false }, toggle() { return false } };
    if (p === 'style') return {};
    return s;
  }, apply() { return s }, set() { return true }, has() { return true }, construct() { return s } }); return s; }
const script = fs.readFileSync(process.env.FATHOM_HTML || 'fathom-chart.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS', 'createElement', 'querySelector', 'querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {};
  return mk(); } });
let clock = 0; const mem = {};
const sb = { console: { log() {}, warn() {}, error() {} }, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol,
  parseInt, parseFloat, isNaN, isFinite, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, performance: { now: () => (clock += 3000) }, document: doc,
  navigator: { userAgent: 'node' }, localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; vm.createContext(sb);
const probe = [
  'var __L=[];(function(){var o=log;log=function(t){__L.push(String(t))}})();',
  'function __state(){return state}function __start(){gameStarted=true}function __L_(){return __L}',
  'function __seed(s){worldSeed=s;interiorSalt=":"+s;interiorCache.clear();rng=mulberry32(s);resetWorldCaches();spawnedChunks.clear();state.creatures=[];state.enclaves=[]}',
  'function __tile(q,r){return tileAt(q,r)}function __hunt(){return state.hunt}',
  'function __huntStart(){huntStart()}function __tap(q,r){return huntTap(q,r)}function __spook(){huntSpook()}',
  'function __nbrs(q,r){return hexNeighbors(q,r)}function __dist(a,b){return hexDistance(a,b)}',
  'function __crewLvl(r){return crewLvl(r)}function __roles(){return state.crew.map(function(m){return m.role})}',
  'function __QUARRY(){return QUARRY}function __K(){return{ARENA:HUNT_ARENA,NOTICE:HUNT_NOTICE,TURNS:HUNT_TURNS,HANDS:HUNT_HANDS}}',
].join('\n');
try { vm.runInContext(script + '\n' + probe, sb, { timeout: 30000 }) } catch (e) { if (typeof sb.state === 'undefined') throw e }
sb.render = function () {}; sb.updateHUD = function () {}; sb.scheduleSave = function () {};
sb.restart(); sb.__start();
const st = sb.__state(), Q = sb.__QUARRY(), K = sb.__K(), L = sb.__L_();
const D = (a, b) => sb.__dist(a, b);

function open_(q, r) { const t = sb.__tile(q, r); return !!t && !t.wall && !t.land; }

function setup(key, seed) {
  sb.__seed(seed);
  st.q = 0; st.r = -6; st.currentDepth = 0; st.alive = true; st.foot = null; st.hunt = null; st.stores = 40;
  st.fished = {};
  // A REAL SPREAD OF ROLES, not three identical hands: the point of the drive is
  // that sending them empties their stations, and three hands can only ever show
  // one station going empty.
  st.crew = [['A','hand'],['B','gun'],['C','ear']].map(([n, role]) =>
    ({ name: n, role: role, xp: 0, lost: false, wounded: false, conditions: [], nerve: 100, scars: [], gear: {} }));
  sb.__tile(0, -6);
  L.length = 0;
  sb.__huntStart();
  const H = sb.__hunt();
  if (H && key) H.key = key;
  return H;
}

// Ask the REAL engine what a drive would do, then put everything back.
function wouldWin() {
  const snap = JSON.parse(JSON.stringify(st.hunt)); const stores = st.stores; const n = L.length;
  sb.__spook();
  const said = L.slice(n).join(' | ');
  const won = /comes aboard/.test(said);
  st.hunt = snap; st.stores = stores; L.length = n;
  return won;
}

// Where will it end up if driven now? (Same trick, reading the position.)
function forecast() {
  const snap = JSON.parse(JSON.stringify(st.hunt)); const stores = st.stores; const n = L.length;
  sb.__spook();
  const h = sb.__hunt();
  const out = h ? { q: h.q, r: h.r, gone: false } : { gone: true, won: /comes aboard/.test(L.slice(n).join(' ')) };
  st.hunt = snap; st.stores = stores; L.length = n;
  return out;
}

function play(key, seed, verbose) {
  let H = setup(key, seed);
  if (!H) return 'no hunt';
  const boat = { q: st.q, r: st.r };
  for (let turn = 0; turn < K.TURNS - 1; turn++) {
    H = sb.__hunt(); if (!H) break;
    if (wouldWin()) { sb.__spook(); break; }
    // Aim: a hex ALONGSIDE where it would end its run — the net goes in the path.
    const f = forecast();
    const aim = f.gone ? { q: H.q, r: H.r } : f;
    let target = null, bs = 1e9;
    for (const n of sb.__nbrs(aim.q, aim.r)) {
      if (!open_(n.q, n.r)) continue;
      if (n.q === boat.q && n.r === boat.r) continue;
      if (D(n, boat) > K.ARENA) continue;
      if (H.hands.some(h => h.q === n.q && h.r === n.r)) continue;
      const sc = D(n, boat);                         // reachable soonest
      if (sc < bs) { bs = sc; target = n; }
    }
    if (!target) break;
    // Never walk inside its notice on the way — that springs the trap early.
    const before = H.hands.map(h => h.q == null ? null : { q: h.q, r: h.r });
    sb.__tap(target.q, target.r);
    H = sb.__hunt();
    if (!H) break;
    const stuck = H.hands.every((h, i) => (h.q == null) === (before[i] == null)
      && (h.q == null || (before[i] && h.q === before[i].q && h.r === before[i].r)));
    if (stuck) break;
  }
  const done = !sb.__hunt();
  const said = L.slice(-4).join(' | ');
  const res = done ? (/comes aboard/.test(said) ? 'CAUGHT' : (/open water/.test(said) ? 'escaped' : 'cold')) : 'unresolved';
  if (verbose) console.log(L.join('\n'));
  return res;
}

// -- WHAT IT COSTS TO SEND THEM ------------------------------------------------
// Sean asked for the hunt with a condition: "more crew is better but leaves the
// sub less protected." A hand only goes over the side when you tap one into the
// water, so the choice was always the player's; this measures whether it has
// ever cost anything. If the boat is exactly as capable with three hands in the
// sea as with none, the second half of his sentence is not implemented.
console.log('WHAT THE BOAT LOSES WHILE THEY ARE IN THE WATER');
{
  setup(null, 90210);
  const H = sb.__hunt();
  if (!H) { console.log('  no hunt started — cannot measure'); }
  else {
    const roles = [...new Set(sb.__roles())];
    const before = {};
    for (const r of roles) before[r] = sb.__crewLvl(r);
    const line = (n) => roles.map(r => r + ' ' + sb.__crewLvl(r)).join('   ');
    console.log('  hands in the water: 0   ' + line());
    let put = 0;
    for (const h of H.hands) {
      const spot = sb.__nbrs(st.q, st.r).find(n => open_(n.q, n.r) && !H.hands.some(x => x.q === n.q && x.r === n.r));
      if (!spot) break;
      h.q = spot.q; h.r = spot.r; put++;
      console.log('  hands in the water: ' + put + '   ' + line());
    }
    const after = {};
    for (const r of roles) after[r] = sb.__crewLvl(r);
    const lost = roles.filter(r => after[r] < before[r]);
    console.log('  ');
    if (!lost.length) console.log('  NOTHING CHANGED — the sub is not less protected and his rule is not built.');
    else console.log('  stations left empty: ' + lost.join(', ') + '  (of ' + roles.join(', ') + ')');
  }
}
console.log();

const keys = ['mackerel', 'herring', 'cod', 'tuna', 'swordfish', 'marlin', 'shark'];
const seeds = [90210, 4242, 77, 1234, 5150, 8888, 31337, 606, 1111, 2718, 3141, 1618];
console.log('A CAPTAIN WHO UNDERSTANDS THE AMBUSH  (' + seeds.length + ' grounds each)');
console.log('  species     move  worth   caught   escaped   cold');
let tot = { c: 0, e: 0, x: 0 };
for (const k of keys) {
  const tally = { CAUGHT: 0, escaped: 0, cold: 0, unresolved: 0 };
  for (const sd of seeds) tally[play(k, sd)]++;
  tot.c += tally.CAUGHT; tot.e += tally.escaped; tot.x += tally.cold + tally.unresolved;
  console.log('  ' + k.padEnd(11) + String(Q[k].move).padStart(3) + String(Q[k].stores).padStart(7)
    + String(tally.CAUGHT).padStart(9) + String(tally.escaped).padStart(10) + String(tally.cold + tally.unresolved).padStart(7));
}
const n = keys.length * seeds.length;
console.log('  ' + '-'.repeat(56));
console.log('  overall           ' + (100 * tot.c / n).toFixed(0) + '% caught, ' + (100 * tot.e / n).toFixed(0) + '% escaped, ' + (100 * tot.x / n).toFixed(0) + '% cold');
if (process.env.VERBOSE) { console.log('\n--- one marlin, in full ---'); play('marlin', 90210, true); }
