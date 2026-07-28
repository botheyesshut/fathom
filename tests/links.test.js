// A LINK IS A STEP, NOT A NEW EXPEDITION.
//
// `footInto` was written for a landing off the boat and then reused for walking
// through a hole in the rock. Four things a single step was getting away with,
// all found by the adversarial audit and all measured here:
//
//   air     — stepFoot `return`s before its own cost block when it hands off to
//             followWay, so 73 of 73 crossings cost 0.00 against 2.10 for
//             walking one ordinary tile
//   wounds  — the tenant was rebuilt from the substrate at hurt:0 back on its
//             spawn tile, so one hop out and back healed it completely, free
//   party   — deployParty stands the crew at the deck's ENTRY, while retreatWay
//             moved only the captain to the way tile: worst hand 14.0 tiles
//             away on average (29 worst), and only 34 of 129 parties reunited
//   dead    — f.dead was never stashed, so a body you were told you could come
//             back for vanished on the first crossing — in a place whose whole
//             selling point is that you CAN come back
const fs = require('fs'); const vm = require('vm');
const html = fs.readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
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
const documentStub = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p)) return () => makeStub();
  if (p === 'addEventListener') return () => {};
  return stub;
}});
const mem = {};
const sandbox = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
  addEventListener: () => {}, removeEventListener: () => {},
  location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
  alert: () => {}, AudioContext: undefined, webkitAudioContext: undefined };
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(script +
  '\nfunction __st(){ return state; }' +
  '\nfunction __foot(){ return state.foot; }' +
  '\nfunction __start(){ gameStarted = true; }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }' +
  '\nfunction __ensure(q,r){ return tileAt(q,r); }' +
  '\nfunction __cells(){ return cells; }' +
  '\nfunction __beach(){ maybeBeach(); }' +
  '\nfunction __step(x,y){ stepFoot(x,y); }' +
  '\nfunction __int(q,r,d,k){ return interiorAt(q,r,d,k); }' +
  '\nfunction __plan(q,r,d){ return grottoPlan(q,r,d); }' +
  '\nfunction __party(){ return partyBodies(); }' +
  '\nfunction __hire(n){ for(let i=0;i<n;i++) state.crew.push({name:"Hand"+i,role:"diver",xp:0,nerve:100,cond:null,ashore:false,fx:null,fy:null}); }',
  sandbox, { timeout: 20000 });

let bad = 0;
const must = (ok, l, d) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + l + (d ? '  — ' + d : '')); if (!ok) bad++; };
const say = (l, v) => console.log('  ' + l.padEnd(48) + v);

sandbox.__start();
const st = sandbox.__st();
sandbox.__hire(3);

// Find grottoes with at least two links, and stand at the mouth of each.
function grottoes(limit) {
  const out = [];
  for (const seed of [1, 77, 512, 9001, 20260728, 424242]) {
    sandbox.__seed(seed);
    for (let q = -14; q <= 14; q++) for (let r = -14; r <= 14; r++) {
      if (Math.abs(q + r) > 14) continue;
      sandbox.__ensure(q, r);
    }
    for (const [k, c] of sandbox.__cells()) {
      if (!c || c.kind !== 'beach') continue;
      const p = k.split(',').map(Number);
      if (sandbox.__plan(p[0], p[1], p[2]).segs < 2) continue;
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
// Walk onto the way tile for real — stand beside it, then step.
function stepOntoWay() {
  const f = sandbox.__foot();
  const ch = sandbox.__int(f.q, f.r, f.d, f.kind);
  if (!ch.way) return false;
  for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    if (ch.tiles.has((ch.way.x+dx) + ',' + (ch.way.y+dy))) {
      f.x = ch.way.x + dx; f.y = ch.way.y + dy;
      sandbox.__step(ch.way.x, ch.way.y);
      return true;
    }
  }
  return false;
}
function goAshore(site) {
  st.base = null; st.foot = null; st.expedition = null; st.alive = true;
  st.q = site[0]; st.r = site[1]; st.currentDepth = site[2]; st.air = 4000; st.cargo = 0;
  st.poisFound = st.poisFound.filter(x => typeof x === 'string' && !x.startsWith('beach:'));
  sandbox.__beach();
  return !!sandbox.__foot();
}

const sites = grottoes(40);
say('grottoes with a way on, found', sites.length);

//--- 1. A LINK COSTS AIR -----------------------------------------------------
console.log('\n--- 1. CROSSING A LINK IS A STEP ---');
{
  let crossings = 0, crossCost = 0, walks = 0, walkCost = 0;
  for (const site of sites) {
    if (!goAshore(site)) continue;
    // an ordinary step, for the control
    const f = sandbox.__foot();
    const ch = sandbox.__int(f.q, f.r, f.d, f.kind);
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      if (ch.tiles.has((f.x+dx) + ',' + (f.y+dy))) {
        const a0 = st.air; sandbox.__step(f.x+dx, f.y+dy);
        if (sandbox.__foot()) { walks++; walkCost += a0 - st.air; }
        break;
      }
    }
    if (!sandbox.__foot()) continue;
    const a1 = st.air;
    if (stepOntoWay() && sandbox.__foot()) { crossings++; crossCost += a1 - st.air; }
  }
  say('ordinary steps measured', walks + ', ' + (walkCost / Math.max(1, walks)).toFixed(2) + ' air each');
  say('link crossings measured', crossings + ', ' + (crossCost / Math.max(1, crossings)).toFixed(2) + ' air each');
  must(walks >= 10 && crossings >= 10, 'the probe is really walking and really crossing',
    walks + ' steps, ' + crossings + ' crossings');
  must(crossCost > 0, 'a link crossing is not free',
    (crossCost / Math.max(1, crossings)).toFixed(2) + ' air per crossing (was 0.00)');
}

//--- 2. WOUNDS KEEP ----------------------------------------------------------
console.log('\n--- 2. A STEP THROUGH THE ROCK DOES NOT HEAL IT ---');
{
  let tried = 0, healed = 0, kept = 0;
  for (const site of sites) {
    if (!goAshore(site)) continue;
    const f = sandbox.__foot();
    if (!f.dweller) continue;
    f.dweller.hurt = Math.max(1, (f.dweller.tough || 4) - 1);
    const before = f.dweller.hurt;
    tried++;
    if (!stepOntoWay() || !sandbox.__foot()) { tried--; continue; }
    // and straight back
    const f2 = sandbox.__foot();
    const ch2 = sandbox.__int(f2.q, f2.r, f2.d, f2.kind);
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      if (ch2.tiles.has((ch2.entry.x+dx) + ',' + (ch2.entry.y+dy))) {
        f2.x = ch2.entry.x + dx; f2.y = ch2.entry.y + dy;
        sandbox.__step(ch2.entry.x, ch2.entry.y);
        break;
      }
    }
    const f3 = sandbox.__foot();
    if (!f3 || !f3.dweller) continue;
    if (f3.dweller.hurt >= before) kept++; else healed++;
  }
  say('tenants wounded, left, and returned to', tried);
  must(tried >= 5, 'the probe actually found tenants to wound', tried + ' trials');
  must(healed === 0, 'a wounded tenant is still wounded when you come back',
    kept + ' kept their wounds, ' + healed + ' healed');
}

//--- 3. THE HANDS COME WITH YOU ---------------------------------------------
console.log('\n--- 3. "the hands come up behind you" IS TRUE ---');
{
  const far = [];
  let trips = 0;
  for (const site of sites) {
    if (!goAshore(site)) continue;
    if (!stepOntoWay() || !sandbox.__foot()) continue;
    // and back out through the mouth of the deeper chamber
    const f2 = sandbox.__foot();
    const ch2 = sandbox.__int(f2.q, f2.r, f2.d, f2.kind);
    let ok = false;
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      if (ch2.tiles.has((ch2.entry.x+dx) + ',' + (ch2.entry.y+dy))) {
        f2.x = ch2.entry.x + dx; f2.y = ch2.entry.y + dy;
        sandbox.__step(ch2.entry.x, ch2.entry.y); ok = true; break;
      }
    }
    const f3 = sandbox.__foot();
    if (!ok || !f3) continue;
    const bodies = sandbox.__party();
    if (!bodies.length) continue;
    trips++;
    far.push(Math.max.apply(null, bodies.map(m => Math.abs(m.fx - f3.x) + Math.abs(m.fy - f3.y))));
  }
  const avgFar = far.length ? (far.reduce((a, b) => a + b, 0) / far.length) : 0;
  say('retreats measured, with a party ashore', trips);
  say('worst hand, distance from the captain', avgFar.toFixed(1) + ' tiles avg, ' + (far.length ? Math.max.apply(null, far) : 0) + ' worst');
  must(trips >= 5, 'the probe had a party ashore to strand', trips + ' retreats');
  must(avgFar <= 6, 'the party lands beside the captain, not across the chamber',
    avgFar.toFixed(1) + ' tiles (was 14.0, worst 29)');
}

//--- 4. YOUR DEAD STAY WHERE THEY FELL --------------------------------------
console.log('\n--- 4. A DECK REMEMBERS ITS OWN DEAD ---');
{
  let tried = 0, kept = 0;
  for (const site of sites.slice(0, 12)) {
    if (!goAshore(site)) continue;
    const f = sandbox.__foot();
    f.dead = [{ name: 'Hollis', x: f.x, y: f.y }];
    tried++;
    if (!stepOntoWay() || !sandbox.__foot()) { tried--; continue; }
    const f2 = sandbox.__foot();
    const ch2 = sandbox.__int(f2.q, f2.r, f2.d, f2.kind);
    for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      if (ch2.tiles.has((ch2.entry.x+dx) + ',' + (ch2.entry.y+dy))) {
        f2.x = ch2.entry.x + dx; f2.y = ch2.entry.y + dy;
        sandbox.__step(ch2.entry.x, ch2.entry.y); break;
      }
    }
    const f3 = sandbox.__foot();
    if (f3 && (f3.dead || []).some(b => b.name === 'Hollis')) kept++;
  }
  say('bodies left, walked away from, returned to', tried);
  must(tried >= 5, 'the probe actually left bodies behind', tried + ' trials');
  must(kept === tried, 'a body you were told to come back for is still there',
    kept + '/' + tried);
}

console.log(bad ? '\n' + bad + ' LINK CHECK(S) FAILED' : '\nALL LINK CHECKS PASSED');
process.exit(bad ? 1 : 0);
