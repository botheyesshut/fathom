// THE GROTTO, MEASURED. An instrument, not a gate — but the numbers it prints
// are the ones that decide whether "small or medium or large and complex" is a
// description of the game or a description of my intentions.
//
// What it asks:
//   1. Can a captain ever FIND a beach? (the old answer was 4 in 30,097 cells)
//   2. Is every tile of every cave reachable from its mouth?
//   3. Are the three sizes actually three different sizes?
//   4. Does the chain of segments resolve — no dead links, no loops, no orphans?
//   5. Is there anything in a cave worth the walk?
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
  '\nfunction __int(q,r,d,k){ return interiorAt(q,r,d,k); }' +
  '\nfunction __plan(q,r,d){ return grottoPlan(q,r,d); }' +
  '\nfunction __onward(q,r,d,k){ return caveOnward({q:q,r:r,d:d,kind:k}); }' +
  '\nfunction __back(q,r,d,k){ return caveBack({q:q,r:r,d:d,kind:k}); }' +
  '\nfunction __suffix(k){ return deckSuffix(k); }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }' +
  '\nfunction __ensure(q,r){ tileAt(q,r); }' +
  '\nfunction __cells(){ return cells; }',
  sandbox, { timeout: 20000 });

const say = (label, val) => console.log('  ' + label.padEnd(52) + val);
let bad = 0;
const must = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) bad++; };

//--- 1. IS THERE A LANDFALL IN THIS WORLD AT ALL -----------------------------
// The wrong question is "what fraction of cells are beach" — I asked that first
// and got a reassuring 0.04%, which told me nothing, because most of those cells
// are a hundred hexes from anywhere a captain will ever be.
//
// The right question is: from the origin, HOW FAR to the nearest landfall, and
// is there one at all? Measured across five seeds at radius 14 (631 hexes):
//
//     rate   nearest from origin        landfalls in range
//     0.12   12,  9,  8, 13,  none      1, 2, 1, 1, 0      <-- the old rate
//     0.20   12,  9,  8, 10, 13         1, 2, 2, 2, 1
//     0.34   12,  9,  7, 10, 11         1, 2, 3, 4, 4      <-- now
//
// So the rate change is not the economy buff it looked like. At 0.12 one world
// in five had NO grotto within reach at all, and a base site that does not
// exist in 20% of games is a broken feature, not a scarce one. What 0.34 buys
// is a guarantee, not a bigger pile: the nearest landfall is still 7-12 hexes
// out and there are still only a handful of them in the whole near world.
console.log('\n--- 1. IS THERE A LANDFALL IN REACH ---');
{
  const R = 14, hexTotal = 3 * R * R + 3 * R + 1;
  const reach = [], counts = [];
  for (const seed of [1, 77, 512, 9001, 20260728]) {
    sandbox.__seed(seed);
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) {
      if (Math.abs(q + r) > R) continue;
      sandbox.__ensure(q, r);
    }
    let best = Infinity; const hexes = new Set();
    for (const [k, c] of sandbox.__cells()) {
      if (!c || c.kind !== 'beach') continue;
      const pq = +k.split(',')[0], pr = +k.split(',')[1];
      const dd = (Math.abs(pq) + Math.abs(pr) + Math.abs(pq + pr)) / 2;
      if (dd > R) continue;
      hexes.add(pq + ',' + pr);
      best = Math.min(best, dd);
    }
    reach.push(best === Infinity ? 'none' : best); counts.push(hexes.size);
  }
  say('nearest landfall from origin, 5 seeds', reach.join(', ') + '  hexes');
  say('landfalls within ' + R + ' hexes', counts.join(', ') + '  of ' + hexTotal + ' hexes');
  must(reach.every(x => x !== 'none'),
    'every world has somewhere to put a station',
    reach.filter(x => x === 'none').length + ' of 5 seeds with no landfall in reach');
  must(counts.every(n => n <= 8),
    'and it is still a thing you have to go and find',
    'most in any seed: ' + Math.max.apply(null, counts));
}

//--- 2. REACHABILITY, the one failure a player cannot diagnose ---------------
console.log('\n--- 2. IS EVERY CAVE ONE CONNECTED SPACE ---');
const sizes = { small: [], medium: [], large: [] };
let checked = 0, stranded = 0, doorsInRock = 0, lootTotal = 0, wayless = 0;
for (let i = 0; i < 400; i++) {
  const q = (i * 7) % 40 - 20, r = (i * 13) % 40 - 20, d = 60 + (i % 8) * 60;
  const plan = sandbox.__plan(q, r, d);
  for (let seg = 0; seg < plan.segs; seg++) {
    const kind = seg === 0 ? 'cave' : 'cave' + seg;
    const ch = sandbox.__int(q, r, d, kind);
    checked++;
    // Flood fill from the mouth.
    const seen = new Set([ch.entry.x + ',' + ch.entry.y]);
    const stack = [[ch.entry.x, ch.entry.y]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        const nk = (x + dx) + ',' + (y + dy);
        if (seen.has(nk) || !ch.tiles.has(nk)) continue;
        seen.add(nk); stack.push([x + dx, y + dy]);
      }
    }
    if (seen.size !== ch.tiles.size) stranded++;
    if (ch.size) sizes[ch.size].push(ch.tiles.size);
    for (const t of ch.tiles.values()) {
      if (t.t === 'door') doorsInRock++;
      if (t.loot) lootTotal++;
    }
    const wantsWay = seg < plan.segs - 1 || plan.ruin;
    if (wantsWay && !ch.way) wayless++;
  }
}
const avg = a => a.length ? Math.round(a.reduce((s, n) => s + n, 0) / a.length) : 0;
say('cave decks generated', checked);
say('small  caves', sizes.small.length + ', avg ' + avg(sizes.small) + ' tiles');
say('medium caves', sizes.medium.length + ', avg ' + avg(sizes.medium) + ' tiles');
say('large  caves', sizes.large.length + ', avg ' + avg(sizes.large) + ' tiles');
say('loot lying in them', lootTotal + '  (' + (lootTotal / checked).toFixed(1) + ' per deck)');
must(stranded === 0, 'no cave strands a tile behind solid rock', stranded + ' of ' + checked + ' decks');
must(doorsInRock === 0, 'nobody hung a bulkhead in a cave', doorsInRock + ' doors found');
must(wayless === 0, 'every deck that should have a way on has one', wayless + ' missing');
must(avg(sizes.large) > avg(sizes.small) * 1.5,
  'the three sizes are three different sizes',
  avg(sizes.small) + ' / ' + avg(sizes.medium) + ' / ' + avg(sizes.large) + ' tiles');

//--- 3. DOES THE CHAIN RESOLVE ----------------------------------------------
console.log('\n--- 3. THE CHAIN ---');
let chains = 0, walked = 0, ruins = 0, broken = 0, maxLen = 0;
for (let i = 0; i < 300; i++) {
  const q = (i * 11) % 50 - 25, r = (i * 5) % 50 - 25, d = 120 + (i % 6) * 60;
  chains++;
  let kind = 'cave', len = 0, guard = 0;
  const path = ['cave'];
  while (guard++ < 12) {
    const on = sandbox.__onward(q, r, d, kind);
    if (!on) break;
    if (path.includes(on)) { broken++; break; }   // a loop is a bug
    path.push(on); kind = on; len++;
    // and the way back from here must be exactly where we came from
    const back = sandbox.__back(q, r, d, kind);
    if (back !== path[path.length - 2]) broken++;
  }
  if (sandbox.__back(q, r, d, 'cave') !== null) broken++;   // the mouth is the water
  if (kind === 'deepruin') ruins++;
  walked += len;
  maxLen = Math.max(maxLen, path.length);
}
say('grottoes walked end to end', chains);
say('average links past the mouth', (walked / chains).toFixed(2));
say('longest system', maxLen + ' decks');
say('systems that open into worked stone', ruins + '  (' + (ruins / chains * 100).toFixed(0) + '%)');
must(broken === 0, 'no loop, no dead link, and the mouth is always the water', broken + ' faults');
must(maxLen >= 4, 'a large system is genuinely a system', maxLen + ' decks deep');

//--- 4. KEYS DO NOT COLLIDE --------------------------------------------------
console.log('\n--- 4. NOTHING SHARES A KEY WITH ANYTHING ELSE ---');
const kinds = ['ruin', 'hull', 'cave', 'cave1', 'cave2', 'deepruin'];
const sufs = kinds.map(k => sandbox.__suffix(k));
say('suffixes', kinds.map((k, i) => k + '→"' + sufs[i] + '"').join('  '));
must(new Set(sufs).size === sufs.length, 'every kind of place has its own record',
  sufs.join(',') );
const shapes = kinds.map(k => [...sandbox.__int(4, -6, 300, k).tiles.keys()].sort().join('|'));
must(new Set(shapes).size === shapes.length,
  'and a different layout to go with it', new Set(shapes).size + ' distinct of ' + shapes.length);

//--- 5. WHAT A GROTTO PAYS ---------------------------------------------------
// Sean's standing ruling: do not buff the economy until progress is reliable.
// Beaches just got ~3x commoner AND turned from a dice roll into a lootable
// system of decks. That is an economy change whether I meant it as one or not,
// so it gets measured against the thing it now sits beside: a ruin.
console.log('\n--- 5. WHAT IT PAYS, AGAINST A RUIN ---');
{
  const yieldOf = ch => {
    let crates = 0, relics = 0, items = 0;
    for (const t of ch.tiles.values()) {
      if (!t.loot) continue;
      if (t.loot === 'crate') crates++;
      else if (t.loot === 'relic') relics++;
      else items++;
    }
    return { crates, relics, items };
  };
  let gC = 0, gR = 0, gI = 0, grottoes = 0, gDecks = 0;
  let rC = 0, rR = 0, rI = 0, ruinsN = 0;
  for (let i = 0; i < 300; i++) {
    const q = (i * 3) % 60 - 30, r = (i * 17) % 60 - 30, d = 60 + (i % 10) * 60;
    const plan = sandbox.__plan(q, r, d);
    grottoes++;
    const chain = [];
    for (let seg = 0; seg < plan.segs; seg++) chain.push(seg === 0 ? 'cave' : 'cave' + seg);
    if (plan.ruin) chain.push('deepruin');
    for (const k of chain) {
      const y = yieldOf(sandbox.__int(q, r, d, k));
      gC += y.crates; gR += y.relics; gI += y.items; gDecks++;
    }
    const y2 = yieldOf(sandbox.__int(q + 100, r + 100, d, 'ruin'));
    rC += y2.crates; rR += y2.relics; rI += y2.items; ruinsN++;
  }
  const per = (n, dd) => (n / dd).toFixed(2);
  say('a whole grotto, walked to the end', per(gC, grottoes) + ' crates, ' + per(gR, grottoes) + ' relics, ' + per(gI, grottoes) + ' items');
  say('  ...across', per(gDecks, grottoes) + ' decks');
  say('one ruin', per(rC, ruinsN) + ' crates, ' + per(rR, ruinsN) + ' relics, ' + per(rI, ruinsN) + ' items');
  const gTotal = (gC + gR * 3 + gI * 2) / grottoes;      // rough weighting; relics pay most
  const rTotal = (rC + rR * 3 + rI * 2) / ruinsN;
  say('rough value, grotto vs ruin', gTotal.toFixed(2) + '  vs  ' + rTotal.toFixed(2)
      + '   (' + (gTotal / rTotal).toFixed(2) + 'x)');
  must(gTotal / rTotal < 3.5,
    'a grotto does not pay wildly more than a ruin for the walking',
    (gTotal / rTotal).toFixed(2) + 'x a ruin, over ' + per(gDecks, grottoes) + ' decks');
}

console.log(bad ? '\n' + bad + ' GROTTO CHECK(S) FAILED' : '\nALL GROTTO CHECKS PASSED');
process.exit(bad ? 1 : 0);
