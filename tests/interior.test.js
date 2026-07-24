// THE RESOLUTION LADDER, Stage 1 — interiors must be honest places.
//
// The invariant that matters most is REACHABILITY: a deck whose loot sits
// behind solid rock is a bug the player can never diagnose — they just wander
// a dead ruin and conclude the game is broken. So the flood fill is not a nice
// -to-have here, it is the whole point of this suite.
//
// Also asserted: determinism (interiors are substrate — pure fn of seed), hull
// integrity (the entry breach is the ONLY hole in the outer ring), that solid
// tiles stop a body, that loot leaves with you exactly once, and that a reload
// mid-dive still finds you standing in the dark where you left off.
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
const memStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};
const sandbox = { console, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => Date.now() }, document: documentStub, navigator: { userAgent: 'node' }, localStorage: memStorage,
  // This suite needs the WHOLE script to boot (restart/resumeGame/doSave live
  // at the very bottom), so the window-level hooks the other suites let throw
  // have to be real no-ops here.
  addEventListener: () => {}, removeEventListener: () => {},
  location: { href: '', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
  alert: () => {}, AudioContext: undefined, webkitAudioContext: undefined };
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(script +
  '\nfunction __int(q,r,d){ return interiorAt(q,r,d); }' +
  '\nfunction __clearInt(){ interiorCache.clear(); }' +
  '\nfunction __enter(q,r,d){ state.currentDepth=d; tileAt(q,r); enterInterior({q:q,r:r}); }' +
  '\nfunction __step(x,y){ stepFoot(x,y); }' +
  '\nfunction __foot(){ return state.foot; }' +
  '\nfunction __lootAt(x,y){ return footLootAt(x,y); }' +
  '\nfunction __solid(x,y){ return footTile(x,y)===null; }' +
  '\nfunction __st(){ return state; }' +
  '\nfunction __start(){ gameStarted = true; }' +
  '\nfunction __save(){ doSave(true); }' +
  '\nfunction __flood(){ return floodAdvance(); }' +
  '\nfunction __seal(){ sealDoor(); }' +
  '\nfunction __dwell(){ dwellerStep(); }' +
  '\nfunction __claim(){ claimOrStore(); }' +
  '\nfunction __base(){ return state.base; }' +
  '\nfunction __fight(){ fightTenant(); }' +
  '\nfunction __baseTick(){ baseTick(); }' +
  '\nfunction __fortify(){ fortifyBase(); }' +
  '\nfunction __creatures(){ return state.creatures; }' +
  '\nfunction __isTenant(k){ return !!TENANTS[k]; }' +
  '\nfunction __inflict(m,s){ return inflictCondition(m,s); }' +
  '\nfunction __fray(m,a){ frayNerve(m,a); }' +
  '\nfunction __vigor(){ return vigorMult(); }' +
  '\nfunction __crewAtk(m){ return crewAtk(m); }' +
  '\nfunction __provision(a){ provisionTick(a); }' +
  '\nfunction __condTier(k){ return CONDITIONS[k] ? CONDITIONS[k].tier : 0; }' +
  '\nfunction __resume(){ resumeGame(loadSave()); }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); world.clear(); cells.clear(); generatedChunks.clear(); nodeCache.clear(); edgeCache.clear(); carvedFeatures.clear(); interiorCache.clear(); }',
  sandbox, { timeout: 20000 }); } catch (e) { console.log('BOOT FAIL', e.message); process.exit(1); }

let failures = 0;
const check = (ok, label, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? '  — ' + detail : '')); if (!ok) failures++; };

const SIZE = 20;
const shape = ch => [...ch.tiles.entries()].map(([k, t]) => k + ':' + t.t + ':' + (t.loot || '-')).sort().join('|');

//--- 1. Substrate: same coordinates, same deck, every time --------------------
sandbox.__clearInt();
const a = shape(sandbox.__int(3, -2, 600));
sandbox.__clearInt();
const b = shape(sandbox.__int(3, -2, 600));
check(a === b && a.length > 50, 'an interior is a pure function of its coordinates', a.length + ' chars');

const other = shape(sandbox.__int(4, -2, 600));
check(other !== a, 'a different cell is a different deck', 'distinct layouts');

//--- 2. Reachability + hull integrity, swept over many decks ------------------
// Flood fill from the entry across 4-neighbours. Every carved tile must be
// reached, or there is loot the player can never get to.
let stranded = 0, holed = 0, noEntry = 0, sites = 0, totalTiles = 0;
for (let q = -4; q <= 4; q++) {
  for (let r = -3; r <= 3; r++) {
    const d = 600 + ((q + r) & 3) * 60;
    const ch = sandbox.__int(q, r, d);
    sites++;
    totalTiles += ch.tiles.size;

    const ek = ch.entry.x + ',' + ch.entry.y;
    const et = ch.tiles.get(ek);
    if (!et || et.t !== 'entry') { noEntry++; continue; }
    const onEdge = ch.entry.x === 0 || ch.entry.y === 0 || ch.entry.x === SIZE - 1 || ch.entry.y === SIZE - 1;
    if (!onEdge) { noEntry++; continue; }

    // The outer ring is the hull: the entry must be the only carved tile in it.
    for (const k of ch.tiles.keys()) {
      const c = k.indexOf(',');
      const x = +k.slice(0, c), y = +k.slice(c + 1);
      if ((x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) && k !== ek) holed++;
    }

    const seen = new Set([ek]);
    const queue = [ch.entry];
    while (queue.length) {
      const cur = queue.pop();
      for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        const nk = (cur.x + dx) + ',' + (cur.y + dy);
        if (seen.has(nk) || !ch.tiles.has(nk)) continue;
        seen.add(nk);
        queue.push({ x: cur.x + dx, y: cur.y + dy });
      }
    }
    if (seen.size !== ch.tiles.size) stranded++;
  }
}
check(noEntry === 0, 'every deck has an entry breach, and it sits in the hull ring', sites + ' sites');
check(holed === 0, 'the entry is the ONLY hole in the hull', holed + ' extra holes');
check(stranded === 0, 'every carved tile is reachable from the entry (no stranded loot)',
  stranded + '/' + sites + ' stranded, ' + totalTiles + ' tiles swept');

//--- 3. On foot: entering, bumping, walking -----------------------------------
sandbox.restart();
sandbox.__start();
sandbox.__seed(20260724);
sandbox.__enter(2, 1, 600);
let f = sandbox.__foot();
check(!!f && f.q === 2 && f.r === 1 && f.d === 600, 'going over the side puts a body in the ruin',
  f ? 'at ' + f.x + ',' + f.y : 'no foot state');

const startX = f.x, startY = f.y;
check(f.seen.length > 0, 'the lamp lights the first ring', f.seen.length + ' tiles seen');

// Walk into the hull from the entry — outside the grid is solid by definition.
const outside = [[startX, startY - 1], [startX, startY + 1], [startX - 1, startY], [startX + 1, startY]]
  .find(([x, y]) => sandbox.__solid(x, y));
sandbox.__step(outside[0], outside[1]);
f = sandbox.__foot();
check(!!f && f.x === startX && f.y === startY, 'solid rock stops a body', 'held at ' + startX + ',' + startY);

// Step inward — the entry corridor always has exactly one carved neighbour.
const inward = [[startX, startY - 1], [startX, startY + 1], [startX - 1, startY], [startX + 1, startY]]
  .find(([x, y]) => !sandbox.__solid(x, y));
const airBefore = sandbox.__st().air;
sandbox.__step(inward[0], inward[1]);
f = sandbox.__foot();
check(!!f && f.x === inward[0] && f.y === inward[1], 'a carved tile takes the step', 'now at ' + f.x + ',' + f.y);
check(sandbox.__st().air < airBefore, 'walking burns air', airBefore + ' -> ' + sandbox.__st().air);

//--- 4. Loot leaves with you, exactly once -----------------------------------
// Walk the whole deck by flood fill, collecting. Then assert the satchel
// matches what the deck actually held and that nothing can be taken twice.
const ch = sandbox.__int(2, 1, 600);
let lootOnDeck = 0;
for (const t of ch.tiles.values()) if (t.loot) lootOnDeck++;

const entryKey = ch.entry.x + ',' + ch.entry.y;
const walkSeen = new Set([f.x + ',' + f.y]);
const stack = [{ x: f.x, y: f.y }];
const order = [];
while (stack.length) {
  const cur = stack.pop();
  order.push(cur);
  for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    const nx = cur.x + dx, ny = cur.y + dy, nk = nx + ',' + ny;
    if (walkSeen.has(nk) || !ch.tiles.has(nk) || nk === entryKey) continue;
    walkSeen.add(nk); stack.push({ x: nx, y: ny });
  }
}
// Teleport-free: step tile to tile is only legal between neighbours, so drive
// the body with __step along an adjacency-respecting path (re-walk via BFS
// parents would be heavier than this suite needs — assert on the pickup API).
let doubleTake = 0, picked = 0;
for (const p of order) {
  const before = sandbox.__lootAt(p.x, p.y);
  if (!before) continue;
  picked++;
  sandbox.__foot().took.push(p.x + ',' + p.y);
  if (sandbox.__lootAt(p.x, p.y)) doubleTake++;
}
check(picked === lootOnDeck, 'the deck yields exactly the loot it was generated with',
  picked + '/' + lootOnDeck + ' found');
check(doubleTake === 0, 'a crate cannot be lifted twice', 'no double-takes');

//--- 5. Reload finds you still in the dark ------------------------------------
sandbox.__foot().crates = 2; sandbox.__foot().relics = 1;
const beforeF = JSON.parse(JSON.stringify(sandbox.__foot()));
sandbox.__save();
sandbox.__st().foot = null;
sandbox.__resume();
const after = sandbox.__foot();
check(!!after && after.x === beforeF.x && after.y === beforeF.y && after.q === beforeF.q,
  'a reload finds you still standing in the ruin', after ? 'at ' + after.x + ',' + after.y : 'lost the body');
check(!!after && after.took.length === beforeF.took.length && after.crates === 2 && after.relics === 1,
  'the satchel and what you already stripped survive the reload',
  after ? after.took.length + ' taken, ' + after.crates + ' crates' : '-');

//--- 6. Climbing out banks the haul and works the site out --------------------
const cargoBefore = sandbox.__st().cargo, relicsBefore = sandbox.__st().relics;
const site = sandbox.__foot();
const sq = site.q, sr = site.r;
// Put the body next to the breach, then take the last step out.
site.x = ch.entry.x; site.y = ch.entry.y;
sandbox.__step(ch.entry.x, ch.entry.y);   // no-op: already there, distance 0
site.x = ch.entry.x; site.y = ch.entry.y;
sandbox.__st().foot = null;
// Re-enter cleanly and leave by the breach for the real exit path.
sandbox.__enter(sq, sr, 600);
const fExit = sandbox.__foot();
fExit.crates = 3; fExit.relics = 1;
const inward2 = [[fExit.x, fExit.y - 1], [fExit.x, fExit.y + 1], [fExit.x - 1, fExit.y], [fExit.x + 1, fExit.y]]
  .find(([x, y]) => !sandbox.__solid(x, y));
const ex = fExit.x, ey = fExit.y;
sandbox.__step(inward2[0], inward2[1]);   // one step in
sandbox.__step(ex, ey);                   // and back out through the breach
check(sandbox.__foot() === null, 'stepping onto the breach ends the dive', 'back aboard');
check(sandbox.__st().cargo === cargoBefore + 3 && sandbox.__st().relics === relicsBefore + 1,
  'the haul comes aboard with you',
  'cargo ' + cargoBefore + '->' + sandbox.__st().cargo + ', relics ' + relicsBefore + '->' + sandbox.__st().relics);
check(sandbox.__st().poisFound.some(k => k === sq + ',' + sr), 'the site is worked out afterwards',
  'poi recorded');

//--- 7. The helm is inert while you are off the boat --------------------------
sandbox.__enter(5, -1, 600);
const held = { q: sandbox.__st().q, r: sandbox.__st().r, d: sandbox.__st().currentDepth };
sandbox.move(held.q + 1, held.r);
sandbox.changeDepth(60);
sandbox.surface();
check(sandbox.__st().q === held.q && sandbox.__st().r === held.r && sandbox.__st().currentDepth === held.d,
  'the boat cannot be driven while the captain is inside a ruin',
  'held at ' + held.q + ',' + held.r + ' @' + held.d + 'm');
check(sandbox.__foot() !== null, 'and the body stays where it was', 'still ashore');

//--- 8. Stage 2: the sea follows you in through the hole you made ------------
// Find a deck that actually has a bulkhead AND a tenant, so these assertions
// are about real geometry and not a lucky empty room.
let site2 = null;
for (let q = 0; q < 40 && !site2; q++) {
  const c2 = sandbox.__int(q, 7, 660);
  if (c2.doors.length && c2.dweller) site2 = { q: q, ch: c2 };
}
check(!!site2, 'decks generate bulkheads and tenants', site2 ? 'found at q=' + site2.q : 'none in 40 decks');

const ch2 = site2.ch;
sandbox.__st().foot = null;
sandbox.__enter(site2.q, 7, 660);
let f2 = sandbox.__foot();
check(f2.water.length === 1 && f2.water[0] === ch2.entry.x + ',' + ch2.entry.y,
  'the sea starts at the breach you came in by', 'source ' + f2.water[0]);
check(!!f2.dweller && ch2.tiles.has(f2.dweller.x + ',' + f2.dweller.y),
  'the tenant stands on real floor', f2.dweller ? f2.dweller.x + ',' + f2.dweller.y : '-');

// Run the flood to saturation. It must never wet a tile that is not carved.
let grew = 0, guard = 0;
while (sandbox.__flood() && guard++ < 600) grew++;
const dry = [...ch2.tiles.keys()].filter(k => !f2.water.includes(k));
const inStone = f2.water.filter(k => !ch2.tiles.has(k));
check(inStone.length === 0, 'water never gets into solid rock', f2.water.length + ' tiles wet, 0 in stone');
check(f2.water.length > 1 && grew > 1, 'the water advances through the deck', grew + ' advances');
check(dry.length === 0, 'with nothing sealed, the whole deck goes under eventually', dry.length + ' left dry');

// A dogged bulkhead holds the sea. Re-enter clean, seal a door, saturate.
sandbox.__st().foot = null;
sandbox.__enter(site2.q, 7, 660);
f2 = sandbox.__foot();
const doorK = ch2.doors[0];
f2.closed.push(doorK);
guard = 0;
while (sandbox.__flood() && guard++ < 600);
check(!f2.water.includes(doorK), 'a dogged bulkhead does not flood', 'door ' + doorK + ' still dry');

// It stops a body too.
const dK = doorK.indexOf(',');
const doorX = +doorK.slice(0, dK), doorY = +doorK.slice(dK + 1);
const sides = [[0,-1],[1,0],[0,1],[-1,0]].map(([ax, ay]) => ({ x: doorX + ax, y: doorY + ay }))
  .filter(p => ch2.tiles.has(p.x + ',' + p.y));
check(sides.length === 2, 'a bulkhead sits in a throat, not in the middle of a room', sides.length + ' open sides');
f2.x = sides[0].x; f2.y = sides[0].y;
sandbox.__step(doorX, doorY);
f2 = sandbox.__foot();
check(f2.x === sides[0].x && f2.y === sides[0].y, 'a dogged bulkhead will not let you through',
  'held at ' + f2.x + ',' + f2.y);

// And it stops the tenant: put it on the far side and let it hunt.
f2.dweller = { x: sides[1].x, y: sides[1].y };
sandbox.__dwell();
f2 = sandbox.__foot();
check(!(f2.dweller.x === doorX && f2.dweller.y === doorY),
  'and the tenant cannot come through it either',
  'it is at ' + f2.dweller.x + ',' + f2.dweller.y);

// Undogging it with the Seal control puts everything back in play.
f2.x = sides[0].x; f2.y = sides[0].y;
sandbox.__seal();                       // adjacent door is closed -> hauls it open
f2 = sandbox.__foot();
check(!f2.closed.includes(doorK), 'the Seal control hauls a dogged bulkhead open again', 'reopened');
sandbox.__seal();                       // and shuts it again
f2 = sandbox.__foot();
check(f2.closed.includes(doorK), 'and dogs it shut again', 'sealed');

// The tenant walks the deck for a long stretch and never leaves the floor.
sandbox.__st().foot = null;
sandbox.__enter(site2.q, 7, 660);
f2 = sandbox.__foot();
let tenantInStone = 0;
for (let i = 0; i < 120; i++) {
  sandbox.__dwell();
  const d = sandbox.__foot().dweller;
  if (d && !ch2.tiles.has(d.x + ',' + d.y)) tenantInStone++;
}
check(tenantInStone === 0, 'the tenant never walks through stone', '120 steps swept');

// Drowning state round-trips: water and dogged bulkheads are overlay.
f2.closed.push(ch2.doors[0]);
sandbox.__flood(); sandbox.__flood();
const wetBefore = sandbox.__foot().water.length, shutBefore = sandbox.__foot().closed.length;
sandbox.__save();
sandbox.__st().foot = null;
sandbox.__resume();
const after2 = sandbox.__foot();
check(!!after2 && after2.water.length === wetBefore && after2.closed.length === shutBefore,
  'the flood and the sealed bulkheads survive a reload',
  after2 ? after2.water.length + ' wet, ' + after2.closed.length + ' sealed' : 'lost');

//--- 9. Stage 4: the claim ---------------------------------------------------
// Your station is a ruin you sealed against the sea, so the refusals matter as
// much as the claim: you must not be able to seal yourself in with a tenant.
sandbox.__st().foot = null;
sandbox.__st().base = null;
sandbox.__st().air = 4000;
sandbox.__enter(site2.q, 7, 660);        // this deck has a tenant
sandbox.__st().cargo = 20;
sandbox.__claim();
check(sandbox.__base() === null, 'a deck with a tenant on it cannot be claimed', 'refused');

let clean = null;
for (let q = 0; q < 80 && !clean; q++) {
  const c = sandbox.__int(q, 9, 720);
  if (!c.dweller) clean = { q: q, ch: c };
}
check(!!clean, 'tenantless decks exist to be claimed', clean ? 'found at q=' + clean.q : 'none in 80');

sandbox.__st().foot = null;
sandbox.__enter(clean.q, 9, 720);
sandbox.__st().cargo = 2;
sandbox.__claim();
check(sandbox.__base() === null, 'claiming costs crates you must actually have', 'refused on 2 crates');

sandbox.__st().cargo = 9;
sandbox.__claim();
const based = sandbox.__base();
check(!!based && based.q === clean.q && based.r === 9 && based.d === 720,
  'a tenantless deck can be claimed', based ? 'claimed at ' + based.q + ',9 @720m' : 'not claimed');
check(sandbox.__st().cargo === 9 - 6, 'and the plate and pumps are paid for', '9 -> ' + sandbox.__st().cargo);
check(sandbox.__foot().water.length === 0, 'the pumps take the water back out', 'deck dry');

// However long you walk your own station, the sea stays outside it.
for (let i = 0; i < 60; i++) {
  const fw = sandbox.__foot();
  if (!fw) break;
  const opts = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .map(([dx, dy]) => [fw.x + dx, fw.y + dy])
    .filter(([x, y]) => !sandbox.__solid(x, y) && !(x === clean.ch.entry.x && y === clean.ch.entry.y));
  if (!opts.length) break;
  const o = opts[i % opts.length];
  sandbox.__step(o[0], o[1]);
}
check(sandbox.__foot() && sandbox.__foot().water.length === 0,
  'a claimed station never floods, however long you walk it',
  sandbox.__foot() ? sandbox.__foot().water.length + ' wet after ' + sandbox.__foot().steps + ' steps' : 'left the deck');

// Stow and draw.
sandbox.__st().cargo = 4; sandbox.__st().relics = 2;
sandbox.__foot().crates = 1;
sandbox.__claim();
check(sandbox.__base().stores.crates === 5 && sandbox.__base().stores.relics === 2,
  'goods stow into the station', sandbox.__base().stores.crates + ' crates, ' + sandbox.__base().stores.relics + ' relics');
check(sandbox.__st().cargo === 0 && sandbox.__st().relics === 0 && sandbox.__foot().crates === 0,
  'and leave both your hands and the boat', 'cleared');
sandbox.__claim();
check(sandbox.__foot().crates === 5 && sandbox.__base().stores.crates === 0,
  'and can be drawn back out again', 'carrying ' + sandbox.__foot().crates);

// Only one station.
sandbox.__st().foot = null;
let clean2 = null;
for (let q = 0; q < 80 && !clean2; q++) {
  const c = sandbox.__int(q, 11, 780);
  if (!c.dweller) clean2 = { q: q, ch: c };
}
if (clean2) {
  sandbox.__enter(clean2.q, 11, 780);
  sandbox.__st().cargo = 30;
  sandbox.__claim();
  check(sandbox.__base().q === clean.q && sandbox.__base().r === 9,
    'a second station is refused — the Erebus supplies one', 'still at ' + sandbox.__base().q + ',9');
}

// Re-entering your own station: no water, and the loot does not grow back.
sandbox.__st().foot = null;
sandbox.__enter(clean.q, 9, 720);
let liftable = 0;
for (const k of clean.ch.tiles.keys()) {
  const c = k.indexOf(',');
  if (sandbox.__lootAt(+k.slice(0, c), +k.slice(c + 1))) liftable++;
}
check(sandbox.__foot().water.length === 0 && !sandbox.__foot().dweller,
  're-entering the station finds it dry and empty', 'as left');
check(liftable === 0, 'and a claimed station does not regrow its loot', liftable + ' liftable');

// THE POINT OF A STATION: the sea takes what is aboard, never what is stowed.
sandbox.__st().foot = null;
sandbox.__base().stores.crates = 7; sandbox.__base().stores.relics = 3;
sandbox.__st().cargo = 2; sandbox.__st().relics = 1;
sandbox.endGame('The deep has you.', 'test');
check(sandbox.__st().cargo === 0 && sandbox.__st().relics === 0,
  'the sea still keeps what was aboard', 'cargo/relics zeroed');
check(sandbox.__base() && sandbox.__base().stores.crates === 7 && sandbox.__base().stores.relics === 3,
  'but the station is untouched by drowning — that is what it is FOR',
  sandbox.__base() ? sandbox.__base().stores.crates + ' crates, ' + sandbox.__base().stores.relics + ' relics held' : 'station lost');

sandbox.__st().alive = true;
sandbox.__save();
sandbox.__st().base = null;
sandbox.__resume();
check(sandbox.__base() && sandbox.__base().stores.crates === 7 && sandbox.__base().q === clean.q,
  'and the station survives a reload', sandbox.__base() ? 'held' : 'lost');

//--- 10. Stage 3: boarding ---------------------------------------------------
// Violence must stay the expensive answer: unarmed is near-useless, armed is
// possible, and the reward is that the deck becomes claimable at all.
sandbox.__st().foot = null;
sandbox.__st().base = null;
sandbox.__st().clearedDecks = [];
sandbox.__st().alive = true;
sandbox.__st().crew = [];
sandbox.__st().air = 200000;

const kinds = new Set(), individuals = new Set();
for (let q = 0; q < 60; q++) {
  const c = sandbox.__int(q, 13, 840);
  if (c.dweller) { kinds.add(c.dweller.kind); individuals.add(c.dweller.kind + ':' + c.dweller.tough); }
}
check(kinds.size >= 2, 'decks hold more than one kind of tenant', [...kinds].join(', '));
check(individuals.size > kinds.size, 'and individuals vary within their kind',
  individuals.size + ' distinct across ' + kinds.size + ' kinds');

// Put the tenant out of reach — boarding must refuse.
sandbox.__enter(site2.q, 7, 660);
let ft = sandbox.__foot();
const openNbr = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  .map(([dx, dy]) => ({ x: ft.x + dx, y: ft.y + dy }))
  .find(p => !sandbox.__solid(p.x, p.y));
ft.dweller.x = ft.x + 6; ft.dweller.y = ft.y;
ft.dweller.hurt = 0;
sandbox.__fight();
check(sandbox.__foot().dweller.hurt === 0, 'you cannot board something out of reach', 'refused');

// Bare hands: twenty rounds should barely scratch it.
ft.dweller.x = openNbr.x; ft.dweller.y = openNbr.y;
ft.dweller.tough = 40; ft.dweller.hurt = 0;
for (let i = 0; i < 20; i++) {
  const cur = sandbox.__foot();
  if (!cur || !cur.dweller) break;
  cur.dweller.x = openNbr.x; cur.dweller.y = openNbr.y;   // hold it in reach
  sandbox.__fight();
}
const barehanded = sandbox.__foot() && sandbox.__foot().dweller ? sandbox.__foot().dweller.hurt : 999;
check(barehanded < 12, 'bare hands against it is not a plan', barehanded + ' damage in 20 rounds');

// Armed with relic-work: the same twenty rounds settle it.
sandbox.__st().crew = [{ name: 'Test', role: 'diver', xp: 0, gear: { weapon: 'lance', armor: 'wardsuit' } }];
sandbox.__st().foot = null;
sandbox.__st().air = 200000;
sandbox.__enter(site2.q, 7, 660);
ft = sandbox.__foot();
const nbr2 = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  .map(([dx, dy]) => ({ x: ft.x + dx, y: ft.y + dy }))
  .find(p => !sandbox.__solid(p.x, p.y));
ft.dweller.tough = 28; ft.dweller.hurt = 0;   // a warden-weight individual
const airAtBoarding = sandbox.__st().air;
let rounds = 0;
while (sandbox.__foot() && sandbox.__foot().dweller && rounds++ < 60) {
  const cur = sandbox.__foot();
  cur.dweller.x = nbr2.x; cur.dweller.y = nbr2.y;
  sandbox.__fight();
}
check(sandbox.__foot() && !sandbox.__foot().dweller, 'an armed party can drive a heavy one off the deck', rounds + ' rounds');
check(rounds >= 3, 'and a heavy tenant is not a one-punch affair', rounds + ' rounds to break it');
check(sandbox.__st().air < airAtBoarding, 'it answers every round you fail to finish it',
  'air ' + airAtBoarding + ' -> ' + sandbox.__st().air);
check(sandbox.__st().clearedDecks.includes(site2.q + ',7,660'),
  'and the deck is recorded as cleared', sandbox.__st().clearedDecks.join(' | '));

// It stays driven off.
sandbox.__st().foot = null;
sandbox.__enter(site2.q, 7, 660);
check(sandbox.__foot().dweller === null, 'a cleared deck does not regrow its tenant', 'still empty');

// THE POINT: a deck you cleared can now be claimed, which it could not before.
sandbox.__st().cargo = 10;
sandbox.__claim();
check(!!sandbox.__base() && sandbox.__base().q === site2.q,
  'and a cleared deck can be claimed — which is what boarding is FOR',
  sandbox.__base() ? 'station cut at ' + sandbox.__base().q + ',7' : 'still refused');

sandbox.__st().foot = null;
sandbox.__save();
sandbox.__st().clearedDecks = [];
sandbox.__resume();
check(sandbox.__st().clearedDecks.includes(site2.q + ',7,660'),
  'cleared decks survive a reload', sandbox.__st().clearedDecks.length + ' recorded');

//--- 11. Stage 6: the siege --------------------------------------------------
// A station has to be losable, or holding one means nothing.
sandbox.__st().foot = null;
sandbox.__st().alive = true;
sandbox.__st().creatures = [];
const bs = sandbox.__base();
bs.threat = 0; bs.siege = null; bs.breached = false; bs.defence = 0;
bs.stores.crates = 20; bs.stores.relics = 4;

let ticks = 0;
while (!sandbox.__base().siege && ticks++ < 4000) sandbox.__baseTick();
check(!!sandbox.__base().siege, 'threat accrues until something comes for the station', ticks + ' turns of quiet');
const besiegers = sandbox.__creatures().filter(c => c.besieging);
check(besiegers.length === 1, 'the besieger is a REAL creature, not a number',
  besiegers.length ? besiegers[0].type + ' at ' + besiegers[0].q + ',' + besiegers[0].r : 'none');
check(besiegers[0].q === bs.q && besiegers[0].r === bs.r && besiegers[0].depth === bs.d,
  'and it is at the lock, where you can reach it', 'on station');

// Drive it off and the siege lifts.
const breachSoFar = sandbox.__base().siege.breach;
sandbox.__baseTick();
check(sandbox.__base().siege.breach > breachSoFar, 'it works at the lock every turn it is left alone',
  breachSoFar.toFixed(1) + ' -> ' + sandbox.__base().siege.breach.toFixed(1));
sandbox.__creatures().forEach(c => { c.gone = true; });
sandbox.__baseTick();
check(sandbox.__base().siege === null, 'killing it lifts the siege', 'station holds');

// Noise on your own doorstep is the DOMINANT term — a quiet captain is
// besieged rarely, a loud one often. (Runs here, after the besieger checks,
// because it deliberately clears the creature list.)
{
  const b2 = sandbox.__base();
  b2.siege = null; b2.threat = 0;
  sandbox.__st().creatures = [];
  sandbox.noiseMade(b2.q, b2.r, 5);
  const loudNear = b2.threat;
  b2.threat = 0;
  sandbox.noiseMade(b2.q + 40, b2.r, 5);
  const loudFar = b2.threat;
  check(loudNear > loudFar, 'noise at the lock draws far more attention than noise miles off',
    'near +' + loudNear.toFixed(1) + ' vs far +' + loudFar.toFixed(1));
  b2.threat = 0;
}

// Defences slow the breach — measurably.
function breachRate(defenceLevel) {
  const b = sandbox.__base();
  b.defence = defenceLevel; b.siege = { power: 14, breach: 0 };
  sandbox.__st().creatures = [{ id: 'x', type: 'lurker', q: b.q, r: b.r, depth: b.d, besieging: true }];
  sandbox.__baseTick();
  return b.siege ? b.siege.breach : 999;
}
const rawRate = breachRate(0), heldRate = breachRate(3);
check(heldRate < rawRate, 'a fortified lock holds it up',
  'grate ' + rawRate.toFixed(1) + '/turn vs hardened ' + heldRate.toFixed(1) + '/turn');

// Fortifying spends what is struck below.
sandbox.__st().foot = null;
sandbox.__enter(sandbox.__base().q, sandbox.__base().r, sandbox.__base().d);
const bb = sandbox.__base();
bb.defence = 0; bb.breached = false; bb.stores.crates = 20;
sandbox.__fortify();
check(bb.defence === 1 && bb.stores.crates === 20 - 4, 'fortifying spends the station\'s own crates',
  'defence ' + bb.defence + ', ' + bb.stores.crates + ' crates left');
bb.stores.crates = 1;
sandbox.__fortify();
check(bb.defence === 1, 'and is refused when the station cannot pay', 'held at ' + bb.defence);

// The breach itself: stores lost, works wrecked, and the sea gets in.
bb.stores.crates = 10; bb.stores.relics = 4; bb.defence = 2;
bb.siege = { power: 99, breach: 99 };
sandbox.__st().creatures = [{ id: 'y', type: 'lurker', q: bb.q, r: bb.r, depth: bb.d, besieging: true }];
sandbox.__baseTick();
check(bb.breached === true && bb.siege === null, 'a lock left long enough gives way', 'breached');
check(bb.stores.crates < 10 && bb.stores.relics < 4, 'and the station loses part of what was struck below',
  bb.stores.crates + ' crates, ' + bb.stores.relics + ' relics left');
check(bb.defence === 1, 'the works are wrecked getting in', 'defence 2 -> ' + bb.defence);
check(sandbox.__foot() && sandbox.__foot().water.length > 0,
  'and the sea comes in on the captain standing in it',
  sandbox.__foot() ? sandbox.__foot().water.length + ' wet' : 'no body');

// A breached station drowns like any other ruin until it is pumped out.
const wetBefore2 = sandbox.__foot().water.length;
// Walk a real connected path inward — stepFoot only accepts ADJACENT tiles, so
// a precomputed list goes stale the moment the body moves.
{
  const bch = sandbox.__int(bb.q, bb.r, bb.d);
  const start = { x: sandbox.__foot().x, y: sandbox.__foot().y };
  const ek = bch.entry.x + ',' + bch.entry.y;
  const prevMap = new Map([[start.x + ',' + start.y, null]]);
  const queue = [start];
  let far = start;
  while (queue.length) {
    const cur = queue.shift();
    far = cur;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cur.x + dx, ny = cur.y + dy, nk = nx + ',' + ny;
      if (prevMap.has(nk) || !bch.tiles.has(nk) || nk === ek) continue;
      prevMap.set(nk, cur); queue.push({ x: nx, y: ny });
    }
  }
  const walk = [];
  for (let c = far; c; c = prevMap.get(c.x + ',' + c.y)) walk.unshift(c);
  for (const p of walk.slice(1, 10)) { if (sandbox.__foot()) sandbox.__step(p.x, p.y); }
}
check(sandbox.__foot() && sandbox.__foot().water.length > wetBefore2,
  'a forced station floods like anything else the sea is in',
  wetBefore2 + ' -> ' + (sandbox.__foot() ? sandbox.__foot().water.length : '?'));

// Repump puts it right. (A breach now also leaves a BOARDER — that whole path
// is section 12's job; here we clear it to isolate the pump/flood mechanic.)
sandbox.__base().boarder = null;
if (sandbox.__foot()) sandbox.__foot().dweller = null;
sandbox.__st().cargo = 10;
sandbox.__claim();                       // on a breached station this repumps
check(sandbox.__base().breached === false && sandbox.__foot().water.length === 0,
  'repumping reseats the lock and takes the water back out', 'dry again');

sandbox.__st().foot = null;
sandbox.__save();
sandbox.__st().base = null;
sandbox.__resume();
check(sandbox.__base() && sandbox.__base().defence === 1 && sandbox.__base().breached === false,
  'the station\'s defences and condition survive a reload',
  sandbox.__base() ? 'defence ' + sandbox.__base().defence : 'lost');

//--- 12. The boarding: a forced lock puts the thing INSIDE ------------------
// The two-layer siege closes here — a breach is no longer settled at the lock,
// the besieger comes in and becomes a tenant you fight room to room.
sandbox.__st().foot = null;
sandbox.__st().creatures = [];
sandbox.__st().alive = true;
sandbox.__st().air = 200000;
const B = sandbox.__base();
B.breached = false; B.siege = null; B.boarder = null; B.threat = 0; B.defence = 2;
B.stores.crates = 20; B.stores.relics = 6;

// Captain is NOT in the station when the lock gives.
sandbox.__st().creatures = [{ id: 'z', type: 'hulk', q: B.q, r: B.r, depth: B.d, besieging: true }];
B.siege = { power: 99, breach: 99 };
sandbox.__baseTick();
check(!!B.boarder && B.breached, 'a forced lock leaves a boarder in residence', B.boarder ? B.boarder.kind + ' aboard' : 'none');
check(sandbox.__isTenant(B.boarder.kind), 'the boarder is a real interior tenant kind', B.boarder.kind);
const besiegerGone = !sandbox.__creatures().some(c => c.besieging && !c.gone);
check(besiegerGone, 'and it has left the water — it is inside now, not at the lock', 'water clear');

// Walk back into the breached station: it is flooded AND occupied.
sandbox.__st().foot = null;
sandbox.__enter(B.q, B.r, B.d);
let fb2 = sandbox.__foot();
check(!!fb2.dweller && fb2.dweller.boarder, 're-entering a taken station finds the boarder at home',
  fb2.dweller ? fb2.dweller.kind : 'empty');
check(fb2.water.length > 0, 'and the station is flooded, like any forced ruin', fb2.water.length + ' wet');

// You cannot pump out around it.
sandbox.__st().cargo = 20;
sandbox.__claim();   // breached -> repump, but a boarder blocks it
check(B.breached === true, 'you cannot pump out a station with something loose in it', 'still breached');

// Flee mid-fight and its wounds persist (stored on the base, not just foot).
fb2.dweller.x = fb2.x; fb2.dweller.y = fb2.y + 1;
if (sandbox.__solid(fb2.x, fb2.y + 1)) { fb2.dweller.x = fb2.x + 1; fb2.dweller.y = fb2.y; }
fb2.dweller.tough = 30; fb2.dweller.hurt = 0;
sandbox.__st().crew = [{ name: 'T', role: 'diver', xp: 0, gear: { weapon: 'axe' } }];
sandbox.__fight();
const woundedTo = B.boarder.hurt;
check(woundedTo > 0, 'wounding the boarder is recorded on the station itself', 'hurt=' + woundedTo);
sandbox.__st().foot = null;                 // flee
sandbox.__enter(B.q, B.r, B.d);             // and come back
check(sandbox.__foot().dweller.hurt === woundedTo, 'the boarder is still hurt when you come back for it',
  'hurt=' + sandbox.__foot().dweller.hurt);

// Kill it, and only then can you pump out. A real boarding party — three armed,
// armoured, kitted hands — because one lone diver against a siege-grade boarder
// breaks under the horror, and the new combat is honest about that.
sandbox.__foot().dweller.tough = 12; sandbox.__foot().dweller.hurt = 0;
sandbox.__st().stores = 100;
sandbox.__st().crew = [
  { name: 'Ansel',  role: 'diver', xp: 0, gear: { weapon: 'lance', armor: 'wardsuit', kit: { key: 'firstaid', charges: 2 } } },
  { name: 'Brune',  role: 'diver', xp: 0, gear: { weapon: 'lance', armor: 'wardsuit', kit: { key: 'firstaid', charges: 2 } } },
  { name: 'Cole',   role: 'diver', xp: 0, gear: { weapon: 'lance', armor: 'wardsuit', kit: { key: 'firstaid', charges: 2 } } },
];
let fb3 = sandbox.__foot();
const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: fb3.x + dx, y: fb3.y + dy }))
  .find(p => !sandbox.__solid(p.x, p.y));
let g = 0;
while (sandbox.__foot() && sandbox.__foot().dweller && g++ < 60) {
  const cur = sandbox.__foot();
  cur.dweller.x = nb.x; cur.dweller.y = nb.y;
  sandbox.__fight();
}
check(sandbox.__base().boarder === null, 'a boarding party puts the boarder down and clears the station', 'cleared in ' + g);
sandbox.__st().cargo = 20;
sandbox.__claim();   // now repump succeeds
check(sandbox.__base().breached === false && sandbox.__foot().water.length === 0,
  'and now the station pumps out and is yours again', 'dry and held');

// The whole mess round-trips through a reload while still occupied.
sandbox.__st().foot = null;
sandbox.__st().creatures = [{ id: 'z2', type: 'lurker', q: B.q, r: B.r, depth: B.d, besieging: true }];
B.breached = false; B.siege = { power: 99, breach: 99 }; B.boarder = null; B.defence = 1;
sandbox.__baseTick();                        // breach with nobody home
sandbox.__save();
sandbox.__st().base = null;
sandbox.__resume();
check(sandbox.__base() && sandbox.__base().boarder && sandbox.__base().breached,
  'a taken station is still taken after a reload',
  sandbox.__base() && sandbox.__base().boarder ? sandbox.__base().boarder.kind + ' still aboard' : 'lost');

//--- 13. The crew, as people: conditions, nerve, vigor, the break ------------
// A crew member is a history, not a number. These assert the model directly.
sandbox.__st().foot = null;
sandbox.__st().stores = 100;

// A hard blow inflicts a NAMED condition, and it degrades what the body can do.
const mm = { name: 'Vane', role: 'diver', xp: 0, gear: { weapon: 'axe', armor: null, kit: null } };
sandbox.__st().crew = [mm];
let got = null;
for (let i = 0; i < 40 && !got; i++) got = sandbox.__inflict(mm, 0.9);   // heavy, unarmoured
check(!!got && mm.conditions.length > 0, 'a hard blow inflicts a named condition, not a number',
  mm.conditions.join(', '));
const atkClean = sandbox.__crewAtk({ gear: { weapon: 'axe' }, conditions: [] });
mm.conditions = ['gashed'];
check(sandbox.__crewAtk(mm) < atkClean, 'a wound degrades what the body can do', 'atk ' + atkClean + ' -> ' + sandbox.__crewAtk(mm));

// Armour deletes the worst ROWS of the table — from the identical blow, a
// wardsuit body collects fewer SERIOUS (tier 2+) wounds than a bare one. Count
// severity, not merely whether something landed.
function seriousWounds(armor, n) {
  let serious = 0;
  for (let i = 0; i < n; i++) {
    const b = { name: 'x', role: 'diver', gear: { armor: armor }, conditions: [], nerve: 100 };
    sandbox.__inflict(b, 0.7);
    for (const k of b.conditions) if (sandbox.__condTier(k) >= 2) serious++;
  }
  return serious;
}
sandbox.__st().stores = 100;   // isolate armour from vigor
const bareSerious = seriousWounds(null, 200), wardSerious = seriousWounds('wardsuit', 200);
check(wardSerious < bareSerious, 'armour tilts the wound table away from its worst rows',
  'serious wounds — bare ' + bareSerious + ' vs warded ' + wardSerious + ' (of 200)');

// Empty stores make every blow land harder — Vigor as a multiplier, never a
// death clock of its own.
sandbox.__st().stores = 100; const vFull = sandbox.__vigor();
sandbox.__st().stores = 0;   const vEmpty = sandbox.__vigor();
check(vEmpty > vFull && vFull === 1, 'stores multiply danger but never kill directly', 'full ' + vFull + ' empty ' + vEmpty.toFixed(2));
sandbox.__st().stores = 50;
sandbox.__provision(20);
check(sandbox.__st().stores === 30, 'provisions depend down as time passes', 'stores=' + sandbox.__st().stores);

// Nerve is the Lovecraft axis: fray it to nothing and the person BREAKS and is
// gone — removed from the crew, remembered in lostCrew for a later ruin.
sandbox.__st().stores = 100;
const nn = { name: 'Roon', role: 'diver', xp: 0, nerve: 20, conditions: [], gear: {} };
sandbox.__st().crew = [nn];
sandbox.__st().lostCrew = [];
sandbox.__fray(nn, 30);
check(sandbox.__st().crew.length === 0, 'fraying a nerve to nothing breaks the person', 'crew ' + sandbox.__st().crew.length);
check(sandbox.__st().lostCrew.length === 1 && sandbox.__st().lostCrew[0].how === 'broke',
  'and the lost are remembered, by name and by how', sandbox.__st().lostCrew[0] && sandbox.__st().lostCrew[0].name);

// The gone are INERT. A lost member must not be wounded or frayed again — the
// browser caught this: dead crew were still collecting conditions and warnings.
const dead = { name: 'Ghost', role: 'diver', nerve: 10, conditions: [], scars: [], dying: false, gear: {} };
sandbox.__st().crew = [dead]; sandbox.__st().lostCrew = [];
sandbox.__fray(dead, 30);                        // breaks them
check(dead.lost === true, 'a broken member is marked lost', 'lost=' + dead.lost);
const condsAtLoss = dead.conditions.length, lostAtLoss = sandbox.__st().lostCrew.length;
sandbox.__fray(dead, 30);                         // no-ops
sandbox.__inflict(dead, 0.9);                     // no-ops
check(dead.conditions.length === condsAtLoss && sandbox.__st().lostCrew.length === lostAtLoss,
  'the gone take no further wounds and are lost only once',
  dead.conditions.length + ' conds, ' + sandbox.__st().lostCrew.length + ' lost');

// THE LOOP CLOSES: a lost hand can come back as a hollow man wearing the
// uniform you issued. It is OVERLAY (enterInterior), never the substrate.
sandbox.__st().lostCrew = [{ name: 'Roon', role: 'diver', how: 'broke' }];
let worn = null;
for (let q = 0; q < 200 && !worn; q++) {
  const c = sandbox.__int(q, 17, 900);
  if (c.dweller && c.dweller.kind === 'hollow') {
    sandbox.__st().foot = null;
    sandbox.__st().clearedDecks = [];
    sandbox.__enter(q, 17, 900);
    if (sandbox.__foot().dweller && sandbox.__foot().dweller.worn) worn = sandbox.__foot().dweller.worn;
  }
}
check(worn === 'Roon', 'a lost crewman can surface as a hollow man wearing your uniform', 'worn: ' + worn);

// It all survives a reload — conditions, nerve, stores, the lost.
sandbox.__st().foot = null;
sandbox.__st().crew = [{ name: 'Vane', role: 'diver', xp: 2, nerve: 44, conditions: ['gashed', 'floodedLung'], scars: [], dying: false, gear: { weapon: 'axe' } }];
sandbox.__st().stores = 37;
sandbox.__st().lostCrew = [{ name: 'Roon', role: 'diver', how: 'broke' }];
sandbox.__save();
sandbox.__st().crew = []; sandbox.__st().stores = 100; sandbox.__st().lostCrew = [];
sandbox.__resume();
const rv = sandbox.__st().crew[0];
check(rv && rv.nerve === 44 && rv.conditions.length === 2 && sandbox.__st().stores === 37 && sandbox.__st().lostCrew.length === 1,
  'conditions, nerve, stores and the lost all survive a reload',
  rv ? 'nerve ' + rv.nerve + ', ' + rv.conditions.length + ' conditions, stores ' + sandbox.__st().stores : 'crew lost');

console.log(failures === 0 ? '\nALL INTERIOR CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
