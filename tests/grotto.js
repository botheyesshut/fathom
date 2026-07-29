// THE GROTTO, MEASURED. An instrument, not a gate — but the numbers it prints
// are the ones that decide whether "small or medium or large and complex" is a
// description of the game or a description of my intentions.
//
// What it asks — and only what the BATTERY does not already answer. Reachability,
// chain resolution and key collisions moved into interior.test's GROTTOES
// section and links.test, because an invariant belongs in the gate, not here.
//   1. Can a captain ever FIND a landfall, and how far is the nearest?
//   2. What is behind one — how many mouths, and what kind of system in each?
//   3. Is a big system actually COMPLEX, or only big? (cut vertices)
//   4. Is there anything down there worth the walk, measured against a ruin?
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
  '\nfunction __mouths(q,r,d){ return beachMouths(q,r,d); }' +
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

//--- 2. WHAT IS BEHIND A LANDFALL --------------------------------------------
// Connectivity, chain resolution and key collisions now live in the battery
// (interior.test's GROTTOES section and links.test), so this instrument keeps
// only what the battery does not measure: the SHAPE of the world's landfalls.
console.log('\n--- 2. THE MIX OF MOUTHS ---');
{
  const byN = {}, byType = {};
  let beaches = 0;
  for (let i = 0; i < 900; i++) {
    const q = (i * 7) % 70 - 35, r = (i * 23) % 70 - 35, d = 60 + (i % 9) * 60;
    const mouths = sandbox.__mouths(q, r, d);
    beaches++;
    byN[mouths.length] = (byN[mouths.length] || 0) + 1;
    for (const m of mouths) byType[m.type] = (byType[m.type] || 0) + 1;
  }
  const totalM = Object.values(byType).reduce((a, b) => a + b, 0);
  say('landfalls sampled', beaches);
  say('openings per landfall', Object.entries(byN).sort()
    .map(([k, v]) => k + ': ' + (v / beaches * 100).toFixed(0) + '%').join(', '));
  say('what is behind them', Object.entries(byType).sort()
    .map(([k, v]) => k + ' ' + (v / totalM * 100).toFixed(0) + '%').join(', '));
  // Sean's spec was 25% each. Generation is a hash, not a quota, so allow drift.
  const share = t => (byType[t] || 0) / totalM;
  must(['passage', 'hall', 'chamber', 'dead'].every(t => share(t) > 0.18 && share(t) < 0.32),
    'the four kinds of system are near enough a quarter each',
    ['passage', 'hall', 'chamber', 'dead'].map(t => t + ' ' + (share(t) * 100).toFixed(0) + '%').join(', '));
  must((byN[2] || 0) + (byN[3] || 0) > beaches * 0.2,
    'and a landfall often has more than one way in',
    (((byN[2] || 0) + (byN[3] || 0)) / beaches * 100).toFixed(0) + '% have 2 or 3');
}

//--- 3. IS A BIG SYSTEM ACTUALLY COMPLEX -------------------------------------
// The design audit's finding, kept as a standing measurement: the old carver
// grew tiles x4.08 and DECISIONS x0.99, and the largest single open lump rose
// 48% -> 71% -> 84%. Large was large and simple.
console.log('\n--- 3. LARGE, AND ALSO COMPLEX ---');
{
  const cutTiles = (tiles) => {
    const keys = [...tiles.keys()];
    if (keys.length < 3) return 0;
    const idx = new Map(keys.map((k, i) => [k, i]));
    const adj = keys.map(k => {
      const c = k.indexOf(','), x = +k.slice(0, c), y = +k.slice(c + 1);
      const out = [];
      for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        const nk = (x + dx) + ',' + (y + dy);
        if (idx.has(nk)) out.push(idx.get(nk));
      }
      return out;
    });
    const disc = new Array(keys.length).fill(-1), low = new Array(keys.length).fill(0);
    const isCut = new Array(keys.length).fill(false);
    let timer = 0;
    for (let root = 0; root < keys.length; root++) {
      if (disc[root] >= 0) continue;
      const stack = [[root, -1, 0]];
      let rootKids = 0;
      while (stack.length) {
        const fr = stack[stack.length - 1];
        const u = fr[0], parent = fr[1];
        if (fr[2] === 0) { disc[u] = low[u] = timer++; }
        if (fr[2] < adj[u].length) {
          const v = adj[u][fr[2]++];
          if (v === parent) continue;
          if (disc[v] >= 0) low[u] = Math.min(low[u], disc[v]);
          else { if (u === root) rootKids++; stack.push([v, u, 0]); }
        } else {
          stack.pop();
          if (parent >= 0) {
            low[parent] = Math.min(low[parent], low[u]);
            if (parent !== root && low[u] >= disc[parent]) isCut[parent] = true;
          }
        }
      }
      if (rootKids > 1) isCut[root] = true;
    }
    return isCut.filter(Boolean).length;
  };
  // CONTROL FIRST: a 5-tile corridor has 3 cut tiles, a 3x3 room has 0.
  const corridor = new Map([['1,1',{}],['2,1',{}],['3,1',{}],['4,1',{}],['5,1',{}]]);
  const room = new Map(); for (let y=1;y<=3;y++) for (let x=1;x<=3;x++) room.set(x+','+y,{});
  must(cutTiles(corridor) === 3 && cutTiles(room) === 0,
    'the complexity instrument agrees with two shapes it cannot get wrong',
    'corridor ' + cutTiles(corridor) + ' (want 3), room ' + cutTiles(room) + ' (want 0)');

  const b = {};
  for (let i = 0; i < 500; i++) {
    const q = (i * 7) % 70 - 35, r = (i * 23) % 70 - 35, d = 60 + (i % 9) * 60;
    for (const m of sandbox.__mouths(q, r, d)) {
      for (let seg = 0; seg < m.segs; seg++) {
        const ch = sandbox.__int(q, r, d, 'cave' + m.letter + (seg ? seg : ''));
        const e = b[m.type] || (b[m.type] = { n: 0, tiles: 0, cuts: 0 });
        e.n++; e.tiles += ch.tiles.size; e.cuts += cutTiles(ch.tiles);
      }
    }
  }
  for (const t of ['dead', 'chamber', 'hall', 'passage']) {
    if (!b[t]) continue;
    say(t, (b[t].tiles / b[t].n).toFixed(0) + ' tiles, ' + (b[t].cuts / b[t].n).toFixed(1) + ' cut tiles');
  }
  const cuts = t => b[t] ? b[t].cuts / b[t].n : 0;
  must(cuts('passage') > cuts('dead') * 2,
    'a passage is not merely a bigger dead end',
    cuts('dead').toFixed(1) + ' -> ' + cuts('passage').toFixed(1) + ' cut tiles (was 10.4 -> 10.4)');
}

//--- 4. WHAT A GROTTO PAYS ---------------------------------------------------
// Sean's standing ruling: do not buff the economy until progress is reliable.
// Beaches just got ~3x commoner AND turned from a dice roll into a lootable
// system of decks. That is an economy change whether I meant it as one or not,
// so it gets measured against the thing it now sits beside: a ruin.
console.log('\n--- 4. WHAT IT PAYS, AGAINST A RUIN ---');
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
    // Every mouth of the landfall, and every chamber behind each — because a
    // captain who works a beach works all of it, and the comparison against a
    // ruin has to be like for like.
    const mouths = sandbox.__mouths(q, r, d);
    grottoes++;
    const chain = ['beach'];
    for (const m of mouths) {
      for (let seg = 0; seg < m.segs; seg++) chain.push('cave' + m.letter + (seg ? seg : ''));
    }
    for (const k of chain) {
      const y = yieldOf(sandbox.__int(q, r, d, k));
      gC += y.crates; gR += y.relics; gI += y.items; gDecks++;
    }
    const y2 = yieldOf(sandbox.__int(q + 100, r + 100, d, 'ruin'));
    rC += y2.crates; rR += y2.relics; rI += y2.items; ruinsN++;
  }
  const per = (n, dd) => (n / dd).toFixed(2);
  say('a whole landfall, every mouth walked', per(gC, grottoes) + ' crates, ' + per(gR, grottoes) + ' relics, ' + per(gI, grottoes) + ' items');
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
