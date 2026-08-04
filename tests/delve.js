// THE ON-FOOT LAYER, ACTUALLY EXERCISED.  `node tests/delve.js [sites] [steps]`
//
// WHY THIS EXISTS, MEASURED RATHER THAN ASSUMED. The sea-going bot in
// tests/playtest.js reaches an interior in 3% of its runs — one in thirty — and it is
// not for want of trying: every persona carries `enterRuin` between 0.6 and 1.0.
// It simply never finds one in the time it has. So the entire on-foot layer —
// tenants, wounds, nerve, conditions, bodies, the flood, the way out — is
// covered by three runs in a hundred, and effectively unwatched.
//
// That is not a hypothesis. On 2026-08-04 I planted a known bug back into a
// scratch build (the nerve-condition recursion) and ran the sea bot against
// both: not one invariant fired, `crew lost` read 0 on each, and the two builds
// were indistinguishable. The bug lived in code the bot does not walk.
//
// This instrument walks it. It does not sail — it finds interiors, steps into them,
// wanders, fights what is home, takes what is there, and leaves; thousands of
// times; asserting the whole way that nothing impossible has happened. It is
// not a model of how anyone plays. It is a way of being in the room.
'use strict';
const fs = require('fs');
const vm = require('vm');

const SITES = parseInt(process.argv[2] || '60', 10);
const STEPS = parseInt(process.argv[3] || '120', 10);

function mk() {
  const fn = function () { return s; };
  const s = new Proxy(fn, { get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (p === 'length') return 0;
      if (['firstChild', 'lastChild', 'nextSibling', 'parentNode'].includes(p)) return null;
      if (p === 'classList') return { add() {}, remove() {}, contains() { return false; }, toggle() { return false; } };
      if (p === 'style') return {};
      return s;
    }, apply() { return s }, set() { return true }, has() { return true }, construct() { return s } });
  return s;
}

// A clock that advances a fixed step per read — see the same note in the other
// harnesses. Reproducible across runs, still monotonic within one.
let _tick = 1754265600000;
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (_tick += 1000) : t[p]; } });

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = parseInt(process.env.FATHOM_SEED || '20260804', 10);

const html = fs.readFileSync(process.env.FATHOM_HTML || (__dirname + '/../fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function boot() {
  const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
  const doc = new Proxy({}, { get(t, p) {
    if (['createElementNS', 'createElement', 'querySelector', 'querySelectorAll'].includes(p)) return () => mk();
    if (p === 'getElementById') return id => (id === 'ping-power' ? pingEl : mk());
    if (p === 'addEventListener') return () => {};
    return mk();
  }});
  const mem = {}; let clock = 0;
  const sb = { console: { log() {}, warn() {}, error() {} }, Math, JSON, Date: FrozenDate, Array, Object,
    Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    performance: { now: () => (clock += 3000) }, document: doc, navigator: { userAgent: 'node' },
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    addEventListener: () => {}, removeEventListener: () => {},
    location: { href: '', reload: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
  sb.window = sb; sb.globalThis = sb; sb.self = sb;
  vm.createContext(sb);
  const probe =
    '\nfunction __state(){ return state; }' +
    '\nfunction __seed(s){ worldSeed=s; interiorSalt=":"+s; interiorCache.clear(); rng=mulberry32(s);' +
    ' resetWorldCaches(); spawnedChunks.clear(); state.creatures=[]; state.enclaves=[]; }' +
    '\nfunction __tile(q,r){ return tileAt(q,r); }' +
    '\nfunction __stack(t){ return poiStack(t); }' +
    '\nfunction __openCell(q,r,d){ return !!cells.get(cellKey(q,r,d)); }' +
    '\nfunction __enter(q,r,d){ state.q=q; state.r=r; state.currentDepth=d; tileAt(q,r); enterInterior({q:q,r:r}); }' +
    '\nfunction __chunk(){ return footChunk(); }' +
    '\nfunction __step(x,y){ stepFoot(x,y); }' +
    '\nfunction __fight(){ fightTenant(); }' +
    '\nfunction __leave(){ leaveInterior(); }' +
    '\nfunction __sub(){ return activeSub(); }' +
    // NON-REENTRANCY, ASSERTED IN THE GAME'S OWN SCOPE.
    //
    // This is the check that actually catches the bug this instrument was built
    // after, and it took three tries to arrive at. The invariants below do NOT
    // catch it: with the recursion in place, hands break and leave the roster
    // before they can pile up conditions, so the BROKEN build reports FEWER
    // violations than the sound one. The differ does not catch it either — only
    // a scatter of shifted encounter rates. What caught it originally was a
    // hand-written check in items.test that happened to read `crew[0]` after a
    // nerve bleed and crashed when the roster emptied. Luck, essentially.
    //
    // So assert the property directly. `inflictCondition` and `frayNerve` call
    // one another; neither may ever be inside itself. True of the sound build by
    // construction, false of the broken one on the first threshold crossing,
    // whatever else the run happens to do.
    '\nvar __reentry = {};' +
    '\n(function(){' +
    '\n  var depth = { inflictCondition: 0, frayNerve: 0 };' +
    '\n  var origIC = inflictCondition, origFN = frayNerve;' +
    '\n  inflictCondition = function () {' +
    '\n    if (depth.inflictCondition > 0) __reentry.inflictCondition = (__reentry.inflictCondition||0)+1;' +
    '\n    depth.inflictCondition++;' +
    '\n    try { return origIC.apply(this, arguments); } finally { depth.inflictCondition--; }' +
    '\n  };' +
    '\n  frayNerve = function () {' +
    '\n    if (depth.frayNerve > 0) __reentry.frayNerve = (__reentry.frayNerve||0)+1;' +
    '\n    depth.frayNerve++;' +
    '\n    try { return origFN.apply(this, arguments); } finally { depth.frayNerve--; }' +
    '\n  };' +
    '\n})();' +
    '\nfunction __reentries(){ return __reentry; }' +
    '\nfunction __start(){ gameStarted = true; }';
  try { vm.runInContext(script + probe, sb, { timeout: 30000 }); }
  catch (e) { if (typeof sb.state === 'undefined') throw e; }
  sb.log = function () {};
  sb.render = function () {}; sb.updateHUD = function () {}; sb.scheduleSave = function () {};
  sb.restart(); sb.__start();
  return sb;
}

//--- WHAT MUST NEVER BE TRUE ASHORE -----------------------------------------
// Deliberately the same shape as `checkInvariants` in playtest.js, and
// deliberately not shared with it: these files boot the game independently and
// a common module between them would be the only cross-file dependency in this
// directory. The duplication is four lines and it keeps each instrument a thing
// you can read start to finish.
const broken = {};      // things that must never be true — these fail the run
const noticed = {};     // things worth seeing that are not, on inspection, wrong
let checks = 0;
function bad(name, detail, where) {
  checks++;
  if (broken[name]) { broken[name].n++; return; }
  broken[name] = { n: 1, first: where + ': ' + detail };
}
function note(name, detail, where) {
  if (noticed[name]) { noticed[name].n++; return; }
  noticed[name] = { n: 1, first: where + ': ' + detail };
}
const num = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v);
// KEYED BY IDENTITY, NOT BY NAME — and the reason is a bug this instrument
// reported against the game before it reported it against itself.
//
// The first cut keyed this by `m.name` and topped the roster up with names
// derived from its length ('Hand' + crew.length), so a hand lost and replaced
// produced a SECOND crewman with the same name. Two objects, one key: each
// assertion overwrote the other's baseline and the delta came out as a burst of
// eleven conditions in a single step. It fired 1,486 times and every one was a
// phantom. A direct probe of one fight showed the game doing exactly the right
// thing — one condition per blow, capped — which is the only reason I did not
// report a wound-system bug that does not exist.
//
// A WeakMap cannot be fooled by two things sharing a name.
const lastCond = new WeakMap();

function assertSane(s, where) {
  checks++;
  const crew = s.crew || [];
  for (let i = 0; i < crew.length; i++) {
    const m = crew[i];
    if (!m) { bad('a hole in the roster', 'crew[' + i + '] is ' + String(m), where); continue; }
    const key = m.name || ('#' + i);
    if (m.lost) bad('a lost hand still aboard', key + ' is lost and on the roster', where);
    if (!num(m.nerve)) bad('nerve is not a number', key + ': ' + String(m.nerve), where);
    else if (m.nerve < 0 || m.nerve > 100) bad('nerve outside 0-100', key + ': ' + m.nerve, where);
    // ONE BLOW, ONE WOUND. `inflictCondition` adds exactly one row per blow, so
    // a jump of more than two between consecutive observations is not a bad
    // minute — it is something re-entering itself. This is the check the nerve
    // recursion breaks, and the reason this whole instrument exists.
    const nc = (m.conditions || []).length;
    const prev = lastCond.get(m);
    if (typeof prev === 'number' && nc - prev > 2) {
      bad('conditions inflicted in a burst — something is re-entering',
        key + ' went ' + prev + ' -> ' + nc + ' between steps', where);
    }
    lastCond.set(m, nc);
    // NO WOUND TWICE. A repeat is not a second injury, it is the same one
    // written down again — it reads as nonsense on the muster list, does nothing
    // past the clamp, and made standing beside a tenant free after the second
    // copy. `inflictCondition` now escalates instead of repeating; this is the
    // rule that says so, so it cannot quietly come back.
    if (nc > 1) {
      const seen = new Set();
      for (const c of m.conditions) {
        if (seen.has(c)) { bad('the same wound inflicted twice', key + ' carries two ' + c, where); break; }
        seen.add(c);
      }
    }
    // A NOTICE, NOT A VIOLATION, and the difference was worth checking rather
    // than assuming. Conditions stack without a cap and duplicates are allowed,
    // so a hand parked beside a tenant for a hundred rounds — which this
    // instrument does and no player would — collects a dozen. That LOOKS like
    // the unwinnable spiral the game refuses by name, and it is not: `crewAtk`
    // and `crewDef` both clamp at `Math.max(0, ...)`, and `bestWeaponAtk` is
    // deliberately decoupled from condition churn. The floor holds. Reported so
    // it is visible, not failed, because the threshold is mine and arbitrary.
    if (nc > 12) note('conditions stacking past ' + 12 + ' on one hand (uncapped, duplicates allowed)',
      key + ' carries ' + nc, where);
    for (const c of (m.conditions || [])) {
      if (!s.CONDITIONS && false) break;   // conditions table is not exported; name check below
      if (typeof c !== 'string') bad('a condition that is not a name', String(c), where);
    }
  }
  const f = s.foot;
  if (f) {
    if (!num(f.x) || !num(f.y)) bad('ashore at no coordinates', f.x + ',' + f.y, where);
    if (num(f.crates) && f.crates < 0) bad('carrying negative crates', String(f.crates), where);
    if (f.dweller && num(f.dweller.hurt) && f.dweller.hurt < 0)
      bad('a tenant wounded below zero', String(f.dweller.hurt), where);
    if (Array.isArray(f.dead)) {
      for (const b of f.dead) if (!b || !num(b.x) || !num(b.y)) bad('a body at no coordinates', JSON.stringify(b), where);
    }
  }
  if (num(s.air) && s.air < 0) bad('air below zero', String(s.air), where);
  if (num(s.hull) && s.hull < 0) bad('hull below zero', String(s.hull), where);
}

//--- THE WALK ----------------------------------------------------------------
const sb = boot();
const s = sb.__state();
const rnd = mulberry32(SEED);

let hired = 0;
let entered = 0, stepsTaken = 0, fights = 0, tenantsMet = 0, bodiesSeen = 0, wounds = 0, nerveLost = 0;
const seeds = [];
for (let i = 0; i < 24; i++) seeds.push(90210 + i * 7919);

outer:
for (const seed of seeds) {
  sb.__seed(seed);
  for (let q = -20; q <= 20; q++) {
    for (let r = -20; r <= 20; r++) {
      if (entered >= SITES) break outer;
      const t = sb.__tile(q, r);
      if (!t) continue;
      let stack = [];
      try { stack = sb.__stack(t) || []; } catch (e) { continue; }
      const prize = stack.find(p => p.type === 'ruin' || p.type === 'hull');
      if (!prize) continue;
      if (!sb.__openCell(q, r, prize.at)) continue;

      // Put a full, green crew aboard for every delve, so a bad run does not
      // silently reduce the sample to a captain walking alone.
      s.alive = true; s.air = 400000; s.hull = 100;
      s.crew = (s.crew || []).filter(m => m && !m.lost);
      while (s.crew.length < 3) {
        s.crew.push({ name: 'Hand' + (++hired), role: 'hand', xp: 0, conditions: [],
                      nerve: 100, scars: [], gear: { weapon: null, armor: null, kit: null },
                      lost: false, wounded: false, dying: false });
      }

      s.foot = null;
      try { sb.__enter(q, r, prize.at); } catch (e) { continue; }
      const f = s.foot;
      if (!f) continue;
      entered++;
      if (f.dweller) tenantsMet++;
      assertSane(s, 'seed ' + seed + ' site ' + q + ',' + r + ' on entry');

      const ch = sb.__chunk();
      const tiles = ch ? [...ch.tiles.keys()] : [];
      const nerve0 = (s.crew[0] || {}).nerve;

      // CLOSE WITH IT, OR NONE OF THIS MEASURES ANYTHING.
      //
      // `fightTenant` refuses unless the captain or a hand is within one square
      // of the tenant — "Nothing of yours is toe-to-toe with it." The first cut
      // of this instrument wandered at random and called it anyway: 1,673 rounds
      // "fought", 0 wounds, 0 nerve spent, 7,106 assertions made over a code
      // path it never once entered, and a confident "none violated" at the end.
      // A probe that measures nothing passes everything.
      //
      // Setting the coordinates directly is a liberty a harness may take and a
      // player may not. It is the shortest honest route to standing next to the
      // thing; the alternative is teaching this file to path-find, which would
      // put a second, wronger movement model in the repo.
      const closeUp = () => {
        const t2 = s.foot && s.foot.dweller;
        if (!t2 || !ch) return;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const x = t2.x + dx, y = t2.y + dy;
          if (!ch.tiles.has(x + ',' + y)) continue;
          s.foot.x = x; s.foot.y = y;
          // The hands come too, or `partyBodies()` finds nobody in reach and the
          // tenant has only the captain to answer.
          let placed = 0;
          for (const m of s.crew) {
            if (m.lost) continue;
            m.ashore = true;
            m.fx = t2.x + (placed % 2 ? 1 : -1); m.fy = t2.y + (placed < 2 ? 0 : 1);
            placed++;
          }
          return;
        }
      };
      closeUp();

      for (let step = 0; step < STEPS && s.foot; step++) {
        const roll = rnd();
        if (s.foot.dweller && roll < 0.45) {
          // Stand and fight — this is the path that inflicts wounds and frays
          // nerve, and it is the one the sea bot almost never reaches.
          closeUp();
          try { sb.__fight(); fights++; } catch (e) { bad('fightTenant threw', String(e && e.message).slice(0, 70), 'seed ' + seed); }
        } else if (tiles.length) {
          const pick = tiles[Math.floor(rnd() * tiles.length)].split(',');
          try { sb.__step(+pick[0], +pick[1]); stepsTaken++; } catch (e) {
            bad('stepFoot threw', String(e && e.message).slice(0, 70), 'seed ' + seed);
          }
        }
        assertSane(s, 'seed ' + seed + ' site ' + q + ',' + r + ' step ' + step);
      }

      const ff = s.foot;
      if (ff && Array.isArray(ff.dead)) bodiesSeen += ff.dead.length;
      const nerve1 = (s.crew[0] || {}).nerve;
      if (num(nerve0) && num(nerve1) && nerve1 < nerve0) nerveLost += nerve0 - nerve1;
      wounds += (s.crew || []).reduce((n, m) => n + ((m.conditions || []).length), 0);

      try { sb.__leave(); } catch (e) {}
      assertSane(s, 'seed ' + seed + ' site ' + q + ',' + r + ' after leaving');
    }
  }
}

//--- WHAT IT SAW -------------------------------------------------------------
console.log('THE ON-FOOT LAYER — ' + entered + ' interiors walked, ' + stepsTaken + ' steps, ' + fights + ' rounds fought');
console.log('  with somebody home        ' + tenantsMet + '/' + entered);
console.log('  wounds carried at the end  ' + wounds);
console.log('  nerve spent                ' + nerveLost);
console.log('  bodies left behind         ' + bodiesSeen);
console.log('  assertions made            ' + checks);
if (entered === 0) {
  console.log('\n  NOTHING WAS ENTERED AT ALL. That is a finding, not a quiet pass —');
  console.log('  this instrument proved nothing about anything. Do not read the zero');
  console.log('  below as good news.');
}
// The re-entrancy tally, read back out of the game's own scope.
let re = {};
try { re = (sb.__reentries && sb.__reentries()) || {}; } catch (e) {}
for (const fn of Object.keys(re)) {
  bad('a function re-entered itself: ' + fn, re[fn] + ' nested calls', 'across the whole walk');
}

console.log('');
console.log('=== INVARIANTS — what must never be true ashore ===');
const keys = Object.keys(broken);
if (!keys.length && entered > 0) console.log('  none violated');
else if (!keys.length) console.log('  none violated, because nothing was tried');
else {
  for (const k of keys.sort((a, b) => broken[b].n - broken[a].n)) {
    console.log('  ' + String(broken[k].n).padStart(6) + 'x  ' + k);
    console.log('          first: ' + broken[k].first);
  }
}
const nkeys = Object.keys(noticed);
if (nkeys.length) {
  console.log('');
  console.log('=== NOTICED — true, and on inspection not wrong ===');
  for (const k of nkeys.sort((a, b) => noticed[b].n - noticed[a].n)) {
    console.log('  ' + String(noticed[k].n).padStart(6) + 'x  ' + k);
    console.log('          first: ' + noticed[k].first);
  }
}
// An instrument reports. It fails only when it violated something it asserted,
// or when it could not run at all — a zero from a walk that never happened is
// the failure this project has been bitten by most often.
process.exit(keys.length || entered === 0 ? 1 : 0);
