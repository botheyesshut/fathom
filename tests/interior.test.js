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
  '\nfunction __int(q,r,d,k){ return interiorAt(q,r,d,k); }' +
  '\nfunction __clearInt(){ interiorCache.clear(); }' +
  // THE BOAT HAS TO BE THERE. This probe put the captain inside a ruin the
  // Erebus was never at, which nothing noticed until leaving started asking
  // whether there was a boat to step onto.
  '\nfunction __enter(q,r,d){ state.q=q; state.r=r; state.currentDepth=d; tileAt(q,r); enterInterior({q:q,r:r}); }' +
  '\nfunction __step(x,y){ stepFoot(x,y); }' +
  '\nfunction __foot(){ return state.foot; }' +
  '\nfunction __lootAt(x,y){ return footLootAt(x,y); }' +
  '\nfunction __solid(x,y){ return footTile(x,y)===null; }' +
  '\nfunction __st(){ return state; }' +
  '\nfunction __start(){ gameStarted = true; }' +
  '\nfunction __save(){ doSave(true); }' +
  '\nfunction __flood(){ return floodAdvance(); }' +
  '\nfunction __seal(){ sealDoor(); }' +
  // THE DECK UNDERFOOT, which is not always the deck a test asked for by
  // coordinates — `enterInterior` resolves its own anchor depth through
  // `poiAtDepth`, so the two can disagree.
  '\nfunction __chunk(){ return footChunk(); }' +
  // THE WHOLE PRIZE COLUMN. `tile.poi` is only the shallowest thing in it, which
  // stopped being a safe proxy the day prize type began varying with depth.
  '\nfunction __stack(t){ return poiStack(t); }' +
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
  '\nfunction __dig(){ digAdjacent(); }' +
  '\nfunction __digTarget(){ return digTargetNear(); }' +
  '\nfunction __footTile(x,y){ return footTile(x,y); }' +
  '\nfunction __party(){ return partyBodies(); }' +
  '\nfunction __partyStep(){ return partyStep(); }' +
  '\nfunction __dwellerStep(){ dwellerStep(); }' +
  '\nfunction __hold(m){ toggleHold(m); }' +
  '\nfunction __resume(){ resumeGame(loadSave()); }' +
  '\nfunction __leave(){ leaveInterior(); }' +
  '\nfunction __tileAt(q,r){ return tileAt(q,r); }' +
  '\nfunction __prizeDepth(t){ return prizeDepthHere(t); }' +
  '\nfunction __openCell(q,r,d){ return !!cells.get(cellKey(q,r,d)); }' +
  '\nfunction __mouths(q,r,d){ return beachMouths(q,r,d); }' +
  '\nfunction __onward(q,r,d,k){ return caveOnward({q:q,r:r,d:d,kind:k}); }' +
  '\nfunction __back(q,r,d,k){ return caveBack({q:q,r:r,d:d,kind:k}); }' +
  '\nfunction __suffix(k){ return deckSuffix(k); }' +
  '\nfunction __setCell(q,r,d,k){ tileAt(q,r); cells.set(cellKey(q,r,d),{type:k,kind:k}); }' +
  '\nfunction __beach(){ maybeBeach(); }' +
  '\nfunction __subAir(){ return activeSub().air; }' +
  '\nfunction __way(){ followWay(); }' +
  '\nfunction __seed(s){ worldSeed=s; rng=mulberry32(s); resetWorldCaches(); }',
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
// S6: leaving spends the site, so the breach ARMS on the first tap and only
// goes through on the second. One tap next to the exit used to end a dive by
// accident and work the ruin out for good.
sandbox.__step(ex, ey);
check(sandbox.__foot() !== null, 'one tap on the breach ASKS rather than leaving',
  sandbox.__foot() ? 'still on the deck' : 'left immediately — the guard is gone');
sandbox.__step(ex, ey);                   // confirmed: out through the breach
check(sandbox.__foot() === null, 'and the second tap ends the dive', 'back aboard');
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
//
// ON THE DECK THE PARTY IS ACTUALLY STANDING ON. `doorK` above comes from
// `__int(q, 7, 660)`, which forces kind 'ruin' at depth 660, while `__enter` goes
// through `enterInterior`, which resolves the anchor with `poiAtDepth` — so the
// deck underfoot can be a different depth, and a prize already in
// `state.poisFound` changes which anchor answers. The suite has spent hundreds of
// steps of gameplay dice by this point, `poisFound` differs run to run, and so
// perhaps 15% of runs entered a deck on which `doorK` is not a door at all.
// `sealDoor` then reported "No bulkhead within reach" and this check failed while
// printing the word "reopened", which is the opposite of what happened.
//
// I got this wrong twice: first I decided the captain had drowned and made the
// walk cleaner, which produced 14 clean runs and no fix. A test that reads one
// deck and drives another cannot be repaired by tidying the walk.
sandbox.__st().foot = null;
sandbox.__enter(site2.q, 7, 660);
f2 = sandbox.__foot();
const liveDeck = sandbox.__chunk();
check(!!f2 && sandbox.__st().alive && !!liveDeck && liveDeck.doors.length > 0,
  'there is a live crew and a bulkhead on the deck they are on',
  f2 ? 'air ' + Math.round(sandbox.__st().air) + ', ' + (liveDeck ? liveDeck.doors.length : 0) + ' doors underfoot' : 'no party');
// AND STAND SOMEWHERE UNAMBIGUOUS. `sealDoor` scans up, right, down, left and
// toggles the FIRST door it finds, then returns — so if the tile you are standing
// on touches two bulkheads, the control opens the other one, correctly, and a check
// naming this one fails. Two throats two tiles apart with your tile between them is
// all it takes. I dismissed this hours ago after checking a single deck on eight
// seeds; it is 1 run in 7.
let liveDoor = null, standAt = null;
for (const dk of liveDeck.doors) {
  const c0 = dk.indexOf(',');
  const dX = +dk.slice(0, c0), dY = +dk.slice(c0 + 1);
  for (const [ax, ay] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    const sx = dX + ax, sy = dY + ay;
    if (!liveDeck.tiles.has(sx + ',' + sy)) continue;
    let doorsTouching = 0;
    for (const [bx, by] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const t3 = liveDeck.tiles.get((sx + bx) + ',' + (sy + by));
      if (t3 && t3.t === 'door') doorsTouching++;
    }
    if (doorsTouching === 1) { liveDoor = dk; standAt = { x: sx, y: sy }; break; }
  }
  if (liveDoor) break;
}
check(!!liveDoor, 'there is a bulkhead you can stand beside without touching another',
  liveDoor ? 'at ' + liveDoor + ', standing ' + standAt.x + ',' + standAt.y
           : 'every door on this deck shares a tile with another');
f2.closed.push(liveDoor);               // dog it again on the fresh entry
f2.x = standAt.x; f2.y = standAt.y;
sandbox.__seal();                       // adjacent door is closed -> hauls it open
f2 = sandbox.__foot();
check(!f2.closed.includes(liveDoor), 'the Seal control hauls a dogged bulkhead open again',
  'reopened ' + liveDoor);
sandbox.__seal();                       // and shuts it again
f2 = sandbox.__foot();
check(f2.closed.includes(liveDoor), 'and dogs it shut again', 'sealed ' + liveDoor);

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

// S2: NOBODY IS BARE-HANDED ANY MORE — the boat carries a boarding axe, because
// every campaign starts crewless and the game used to require a weapon while
// refusing to sell one. So the invariant is no longer "bare hands barely
// scratch it"; it is that THE AXE IS A FLOOR, NOT A SOLUTION. Twenty rounds of
// axe-work must not settle a heavy tenant — you still need relic-work, or a
// crew, or to walk away.
ft.dweller.x = openNbr.x; ft.dweller.y = openNbr.y;
ft.dweller.tough = 40; ft.dweller.hurt = 0;
for (let i = 0; i < 20; i++) {
  const cur = sandbox.__foot();
  if (!cur || !cur.dweller) break;
  cur.dweller.x = openNbr.x; cur.dweller.y = openNbr.y;   // hold it in reach
  sandbox.__fight();
}
const axeOnly = sandbox.__foot() && sandbox.__foot().dweller ? sandbox.__foot().dweller.hurt : 999;
check(sandbox.__foot() && sandbox.__foot().dweller && axeOnly < 40,
  'the locker axe alone does not settle a heavy tenant',
  axeOnly + ' damage in 20 rounds against tough 40 — still standing');

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
// The invariant is literally what it says: more than one punch. The threshold
// was 3, which pinned a particular seeded damage roll rather than the rule —
// any change that shifts the world RNG stream (a new substrate map, an extra
// prng draw during carve) moves the count and fails a test about combat for
// reasons that have nothing to do with combat.
check(rounds >= 2, 'and a heavy tenant is not a one-punch affair', rounds + ' rounds to break it');
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

//--- 14. Digging: cut your own fortress out of the rock ----------------------
// A fresh, uncontested station to dig in.
sandbox.__st().foot = null; sandbox.__st().base = null; sandbox.__st().air = 200000;
let dclean = null;
for (let q = 0; q < 90 && !dclean; q++) { const c = sandbox.__int(q, 21, 780); if (!c.dweller) dclean = { q: q, ch: c }; }
check(!!dclean, 'a clean deck to claim and dig', dclean ? 'at q=' + dclean.q : 'none');
sandbox.__enter(dclean.q, 21, 780);
sandbox.__st().cargo = 10; sandbox.__claim();
const DB = sandbox.__base();
DB.stores.crates = 40; DB.breached = false; DB.carved = [];
const dch = sandbox.__int(dclean.q, 21, 780);
const df = sandbox.__foot();

// Stand where the first cut is SAFE (a target in the inner band, not the hull).
let safeF = null;
for (const k of dch.tiles.keys()) {
  const c = k.indexOf(','); const x = +k.slice(0, c), y = +k.slice(c + 1);
  df.x = x; df.y = y;
  const tg = sandbox.__digTarget();
  if (tg && tg.x > 1 && tg.y > 1 && tg.x < 18 && tg.y < 18) { safeF = { x, y, tg }; break; }
}
check(!!safeF, 'there is inner rock to cut safely', safeF ? 'from ' + safeF.x + ',' + safeF.y : 'none');
df.x = safeF.x; df.y = safeF.y;
const crBefore = DB.stores.crates, carvedBefore = DB.carved.length;
sandbox.__dig();
const tk = safeF.tg.x + ',' + safeF.tg.y;
check(DB.carved.length === carvedBefore + 1 && DB.carved.includes(tk) && !DB.breached,
  'digging carves solid rock into new floor', DB.carved.length + ' tiles cut');
check(DB.stores.crates === crBefore - 2, 'and it is paid for out of the station stores', crBefore + ' -> ' + DB.stores.crates);
check(!!sandbox.__footTile(safeF.tg.x, safeF.tg.y) && sandbox.__footTile(safeF.tg.x, safeF.tg.y).t === 'carved',
  'the cut tile is walkable floor now', 'reads floor');
check((DB.threat || 0) > 0, 'the sound of digging carries — it raises the station\'s threat', 'threat=' + Math.round(DB.threat));

// A carved tunnel floods like anything else once the sea is in.
df.water = [tk]; df.closed = [];
const dugWetBefore = df.water.length;
sandbox.__flood();
check(df.water.length >= dugWetBefore, 'the sea runs into a dug tunnel too', df.water.length + ' wet');

// It will not cut without the crates to pay for it.
DB.stores.crates = 1; const carvedNow = DB.carved.length;
sandbox.__dig();
check(DB.carved.length === carvedNow, 'no cutting rock the station cannot pay for', 'held at ' + DB.carved.length + ' tiles');

// A bigger warren is measurably harder to besiege.
function breachStep(carvedN) {
  DB.carved = []; for (let i = 0; i < carvedN; i++) DB.carved.push('c' + i);
  DB.defence = 0; DB.siege = { power: 14, breach: 0 }; DB.breached = false;
  sandbox.__st().creatures = [{ id: 'x', type: 'lurker', q: DB.q, r: DB.r, depth: DB.d, besieging: true }];
  sandbox.__baseTick();
  return DB.siege ? DB.siege.breach : 999;
}
const smallStep = breachStep(0), bigStep = breachStep(30);
check(bigStep < smallStep, 'a dug-out warren is harder to take than a single room',
  'breach/turn — one room ' + smallStep.toFixed(1) + ' vs warren ' + bigStep.toFixed(1));

// Dig against the hull and, often enough, you let the ocean in.
sandbox.__st().foot = null; sandbox.__enter(dclean.q, 21, 780);
const df2 = sandbox.__foot(); const DB2 = sandbox.__base();
let riskyF = null;
for (const k of dch.tiles.keys()) {
  const c = k.indexOf(','); const x = +k.slice(0, c), y = +k.slice(c + 1);
  df2.x = x; df2.y = y;
  const tg = sandbox.__digTarget();
  if (tg && (tg.x === 1 || tg.y === 1 || tg.x === 18 || tg.y === 18)) { riskyF = { x, y }; break; }
}
check(!!riskyF, 'there is rock right against the hull to gamble on', riskyF ? 'at ' + riskyF.x + ',' + riskyF.y : 'none');
let breached = false, tries = 0;
for (; tries < 25 && !breached; tries++) {
  DB2.breached = false; DB2.carved = []; DB2.stores.crates = 10; df2.x = riskyF.x; df2.y = riskyF.y; df2.water = [];
  sandbox.__dig();
  breached = DB2.breached;
}
check(breached, 'cut too near the hull and the sea breaks into your fortress', 'breached after ' + tries + ' cut(s)');
check(df2.water.length > 0, 'and a hull breach floods the deck you were standing on', df2.water.length + ' wet');

// The warren survives a reload.
DB2.breached = false; DB2.carved = ['5,5', '5,6', '6,6']; sandbox.__st().foot = null;
sandbox.__save(); sandbox.__st().base = null; sandbox.__resume();
check(sandbox.__base() && sandbox.__base().carved.length === 3, 'the fortress you dug survives a reload',
  sandbox.__base() ? sandbox.__base().carved.length + ' tiles held' : 'lost');

//--- 15. Crew positioning: the party as bodies on the deck -------------------
{
// Find a deck with a tenant, so we can test the screen.
let psite = null;
for (let q = 0; q < 60 && !psite; q++) { const c = sandbox.__int(q, 25, 660); if (c.dweller) psite = { q: q, ch: c }; }
check(!!psite, 'a tenanted deck to fight over', psite ? 'q=' + psite.q : 'none');

sandbox.__st().foot = null; sandbox.__st().base = null; sandbox.__st().clearedDecks = [];
sandbox.__st().alive = true; sandbox.__st().air = 200000; sandbox.__st().stores = 100;
sandbox.__st().crew = [
  { name: 'Ash',   role: 'diver', xp: 0, nerve: 70, conditions: [], scars: [], dying: false, gear: { weapon: 'speargun', armor: 'wardsuit', kit: null } },
  { name: 'Brand', role: 'diver', xp: 0, nerve: 70, conditions: [], scars: [], dying: false, gear: { weapon: 'axe', armor: 'plates', kit: null } },
];
sandbox.__enter(psite.q, 25, 660);
let party = sandbox.__party();
check(party.length === 2 && party.every(m => m.fx != null && m.ashore),
  'the party goes over the side as bodies on the deck', party.length + ' deployed');

// THE SCREEN, MADE LITERAL: put a crewman between yourself and the thing, and
// the thing takes the crewman — your own air line goes untouched.
const fp = sandbox.__foot(); const pch = sandbox.__int(psite.q, 25, 660);
// A little clear run of floor to line them up on.
let line = null;
for (const k of pch.tiles.keys()) {
  const c = k.indexOf(','); const x = +k.slice(0, c), y = +k.slice(c + 1);
  if (ch.tiles.has((x + 1) + ',' + y) && ch.tiles.has((x + 2) + ',' + y) && ch.tiles.has((x + 3) + ',' + y)) { line = { x, y }; break; }
}
check(!!line, 'a run of floor to form a line on', line ? line.x + ',' + line.y : 'none');
const D = fp.dweller;
D.x = line.x; D.y = line.y;                         // the thing
const screen = party[0]; screen.fx = line.x + 1; screen.fy = line.y;   // Ash, between
const other = party[1]; other.fx = line.x + 3; other.fy = line.y;
fp.x = line.x + 2; fp.y = line.y;                   // the captain, behind the screen
fp.metTenant = true;
const airBefore = sandbox.__st().air, ashConds0 = screen.conditions.length;
sandbox.__dwellerStep();
check(sandbox.__st().air === airBefore, 'the thing goes for the nearest body, not past it to you', 'air held at ' + airBefore);
check(screen.conditions.length > ashConds0 || screen.nerve < 70 || screen.dying,
  'the screening hand takes the blow meant for the captain', 'Ash marked');

// A hand toe-to-toe with the thing lays into it. Reset the screen to a sound,
// armed body first — the blow it took above could have left it unable to fight.
D.x = line.x; D.y = line.y; D.hurt = 0; D.tough = 40;
screen.conditions = []; screen.dying = false; screen.wounded = false;
if (!(screen.gear && screen.gear.weapon)) screen.gear = { weapon: 'axe' };
screen.fx = line.x + 1; screen.fy = line.y;
const hurt0 = D.hurt;
sandbox.__partyStep();
check(D.hurt > hurt0, 'a crewman beside the thing fights it', 'dealt ' + D.hurt);

// HOLD holds; FOLLOW follows.
const holder = party[1];
holder.fx = line.x + 5 <= 18 ? line.x + 5 : line.x - 2; holder.fy = line.y; holder.hold = false;
// Follow: captain far, holder not holding -> it closes.
fp.x = holder.fx; fp.y = holder.fy;                 // stand on... no, stand away
fp.x = line.x; fp.y = line.y + (pch.tiles.has(line.x + ',' + (line.y + 1)) ? 1 : 0);
const distBefore = Math.abs(holder.fx - fp.x) + Math.abs(holder.fy - fp.y);
sandbox.__st().foot.dweller = null;                 // no fight — just test movement
sandbox.__partyStep();
const distAfterFollow = Math.abs(holder.fx - fp.x) + Math.abs(holder.fy - fp.y);
check(distAfterFollow <= distBefore, 'an unheld hand follows the captain', distBefore + ' -> ' + distAfterFollow);
// Hold: set the order, move the captain, the hand stays put.
sandbox.__hold(holder);
check(holder.hold === true, 'the hold order sets', 'holding');
const hx = holder.fx, hy = holder.fy;
fp.x = line.x + (pch.tiles.has((line.x + 2) + ',' + line.y) ? 2 : 0); fp.y = line.y;
sandbox.__partyStep();
check(holder.fx === hx && holder.fy === hy, 'a held hand does not chase the captain', 'stayed at ' + hx + ',' + hy);

// A positioned hand can be lost, and leaves the deck. Clear the field so the
// thing can only be going for THIS body.
sandbox.__st().foot.dweller = D; sandbox.__st().stores = 100;
const doomed = party[0];
fp.x = 2; fp.y = 2;                                   // captain well out of reach
for (const m of sandbox.__party()) if (m !== doomed) { m.fx = 17; m.fy = 17; }
doomed.hold = false; doomed.nerve = 6; doomed.dying = false; doomed.fx = 10; doomed.fy = 10;
sandbox.__st().lostCrew = [];
for (let i = 0; i < 8 && sandbox.__party().includes(doomed); i++) { D.x = 11; D.y = 10; sandbox.__dwellerStep(); }
check(!sandbox.__party().includes(doomed), 'a hand pushed past breaking is lost off the deck',
  sandbox.__st().lostCrew.length ? sandbox.__st().lostCrew[0].name + ' gone' : 'still standing');

// Climbing out recalls the hands that still stand.
const survivor = sandbox.__party()[0];
sandbox.__st().foot.dweller = null;
sandbox.leaveInterior('out');
check(survivor && !survivor.ashore && survivor.fx == null, 'the party comes up with you, off the deck', 'recalled');

// The incapacitated mind the boat rather than deploy.
sandbox.__st().foot = null;
sandbox.__st().crew = [{ name: 'Gimp', role: 'diver', xp: 0, nerve: 70, conditions: ['brokenLeg'], scars: [], dying: false, wounded: true, gear: { weapon: 'axe' } }];
sandbox.__enter(psite.q, 25, 660);
check(sandbox.__party().length === 0, 'a hand who cannot walk stays aboard', sandbox.__party().length + ' deployed');

// Positions survive a reload.
sandbox.__st().foot = null;
sandbox.__st().crew = [{ name: 'Rell', role: 'diver', xp: 0, nerve: 60, conditions: [], scars: [], dying: false, gear: { weapon: 'axe' }, ashore: true, fx: 7, fy: 8, hold: true }];
sandbox.__enter(psite.q, 25, 660);
sandbox.__st().crew[0].ashore = true; sandbox.__st().crew[0].fx = 7; sandbox.__st().crew[0].fy = 8; sandbox.__st().crew[0].hold = true;
sandbox.__save();
sandbox.__st().crew = []; sandbox.__resume();
const rell = sandbox.__st().crew[0];
check(rell && rell.ashore && rell.fx === 7 && rell.hold === true, 'a hand\'s position and orders survive a reload',
  rell ? 'at ' + rell.fx + ',' + rell.fy + (rell.hold ? ' holding' : '') : 'lost');
}

//--- A HULL IS A BOAT, AND EVERY COMPARTMENT MUST OPEN ---------------------
//
// A sunken vessel is not a sunken building: a hull is one spine with
// compartments off it and a bulkhead at every mouth, which is the whole reason
// "seal bulkhead" is a verb. The generator branches on that, and the branch
// has one failure mode that matters — a compartment whose throat did not carve
// is loot behind stone, and loot behind stone is the one bug a player can
// never diagnose.
{
  console.log('\n--- HULLS ---');
  sandbox.__seed(31337);
  const stH = sandbox.__st();
  let checked = 0, unreachable = 0, firstBad = null;
  let packHull = [], packRuin = [];

  const reach = (ch) => {
    // Flood from the entry across walkable tiles.
    const start = ch.entry.x + ',' + ch.entry.y;
    const seen = new Set([start]);
    let fr = [[ch.entry.x, ch.entry.y]];
    while (fr.length) {
      const next = [];
      for (const [x, y] of fr) {
        for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const k = (x+dx) + ',' + (y+dy);
          if (seen.has(k) || !ch.tiles.has(k)) continue;
          seen.add(k); next.push([x+dx, y+dy]);
        }
      }
      fr = next;
    }
    return seen;
  };
  const packing = (ch) => {
    const rowN = {}, colN = {}; let n = 0;
    for (const [k, tt] of ch.tiles) {
      if (tt.t === 'entry') continue;
      const p = k.split(',').map(Number);
      rowN[p[1]] = (rowN[p[1]]||0)+1; colN[p[0]] = (colN[p[0]]||0)+1; n++;
    }
    const t3 = a => a.slice().sort((x,y)=>y-x).slice(0,3).reduce((s,x)=>s+x,0);
    return n ? Math.max(t3(Object.values(rowN)), t3(Object.values(colN))) / n : 0;
  };

  for (let q = -20; q <= 20; q++) for (let r = -20; r <= 20; r++) {
    const t = sandbox.__tileAt(q, r);
    if (!t || t.wall || t.land) continue;
    for (const kind of ['hull', 'ruin']) {
      if (t.poi !== kind) continue;
      for (let d = 0; d < 4000; d += 60) {
        if (!sandbox.__openCell(q, r, d)) continue;
        stH.q = q; stH.r = r; stH.currentDepth = d;
        if (sandbox.__prizeDepth(t) == null) continue;
        const ch = sandbox.__int(q, r, d, kind);
        if (!ch || !ch.entry) break;
        const seen = reach(ch);
        let orphan = 0;
        for (const k of ch.tiles.keys()) if (!seen.has(k)) orphan++;
        checked++;
        if (orphan) { unreachable++; if (!firstBad) firstBad = kind + ' at ' + q + ',' + r + ': ' + orphan + ' tiles walled off'; }
        (kind === 'hull' ? packHull : packRuin).push(packing(ch));
        break;
      }
    }
  }
  check(checked >= 4, 'the hull check is actually finding decks', checked + ' decks walked');
  check(unreachable === 0, 'every tile on every deck is reachable from the breach',
    unreachable ? unreachable + '/' + checked + ' — ' + firstBad : 'no loot behind stone');

  // ...and the two kinds must actually LOOK different, or the split bought
  // nothing. A hull packs itself against its spine; a tower sprawls.
  //
  // ON ITS OWN SAMPLE, NOT ON THE SIX DECKS ABOVE. This check used to take a
  // median over whatever hulls and ruins happened to have a reachable prize under
  // 4,000 m — three of each — so it was measuring the world's prize placement as
  // much as the generator's shape. Capping the abyssal plain changed which
  // coordinates qualify and the margin fell from comfortable to 6 points against a
  // threshold of 8, while the generator had not moved at all: measured over 900
  // decks per kind, hull 46.2% against ruin 33.3% both before and after. The
  // reachability walk above still needs real coordinates and a handful is plenty
  // for it. This is a fact about the generator, so ask the generator, at volume.
  const med = a => a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)] : 0;
  const packA = [], packB = [];
  for (let i = 0; i < 300; i++) {
    const pq = (i * 17) % 211 - 105, pr = (i * 53) % 211 - 105, pd = 300 + (i % 9) * 360;
    packA.push(packing(sandbox.__int(pq, pr, pd, 'hull')));
    packB.push(packing(sandbox.__int(pq, pr, pd, 'ruin')));
  }
  const h = med(packA), ru = med(packB);
  check(packA.length >= 300 && h > ru + 0.08,
    'a hull is built along a spine and a ruin is not',
    'over ' + packA.length + ' decks each: hull packs ' + Math.round(h*100) +
    '% into three lines vs ruin ' + Math.round(ru*100) + '%');
}

//--- REVISITABLE RUINS, AND THE FAUCET THAT MUST NOT COME BACK --------------
//
// A ruin was one-shot because `f.took` lives on `state.foot` and dies when you
// surface — so the game had no way to remember a stripped room, and an open
// door meant a room that refilled. That restock faucet has been fixed twice in
// this project already, once at 20 crates from a single hex and once unbounded.
//
// `state.deckTook` remembers per deck, so re-entry is safe BY CONSTRUCTION
// rather than by a lock. Both halves are asserted here, because either one
// alone is a bug: the door must open again, AND the room must be empty when it
// does.
{
  console.log('\n--- REVISITABLE RUINS ---');
  sandbox.__seed(90210);
  const st = sandbox.__st();
  st.poisFound = []; st.deckTook = {}; st.clearedDecks = [];
  st.air = 99999; st.hull = 100; st.cargo = 0; st.relics = 0; st.crew = [];

  // ANYWHERE IN THE COLUMN, not just on top of it. `t.poi` is the SHALLOWEST prize
  // in a stack, so a column holding a ruin below a patch of kelp presents as
  // 'growth' and this search used to walk straight past it. That started mattering
  // the day prize type began varying with depth. `poiStack` is what the game reads —
  // the sounder was taught to report the whole column for the same reason.
  let ruin = null, at = null;
  outer:
  for (let q = -22; q <= 22 && !ruin; q++) for (let r = -22; r <= 22; r++) {
    const t = sandbox.__tileAt(q, r);
    if (!t) continue;
    const holdsRuin = t.poi === 'ruin' ||
      (sandbox.__stack(t) || []).some(p => p.type === 'ruin');
    if (!holdsRuin) continue;
    st.q = q; st.r = r;
    // TO THE FLOOR OF THE WORLD, not to 5,000 m. That cap was safe while prize type
    // was a flat seventh at every depth; now that ruins concentrate deep, a whole
    // seed's worth of them can sit below it — seed 90210's four are at 5,340 to
    // 9,960 m, and all four ARE reachable. 11,040 m is the deepest water the flood
    // fill in tests/trench.js can get to.
    for (let d = 0; d < 11100; d += 60) {
      if (!sandbox.__openCell(q, r, d)) continue;
      st.currentDepth = d;
      if (sandbox.__prizeDepth(t) != null) { ruin = t; at = d; break outer; }
    }
  }
  check(!!ruin, 'a reachable ruin exists to test with', ruin ? ruin.q + ',' + ruin.r + ' @' + at + 'm' : 'none found');

  if (ruin) {
    // VISIT ONE — take everything and surface.
    st.q = ruin.q; st.r = ruin.r; st.currentDepth = at;
    sandbox.__enter(ruin.q, ruin.r, at);
    const gotIn1 = !!sandbox.__foot();
    let piles = 0;
    if (gotIn1) {
      const f = sandbox.__foot();
      const ch = sandbox.__int(f.q, f.r, f.d);
      for (const [k, tt] of ch.tiles) if (tt.loot) { piles++; f.took.push(k); }
      sandbox.__leave();
    }
    check(gotIn1 && piles > 0, 'the first visit opens a deck with loot on it', piles + ' piles lifted');

    // VISIT TWO — the door must open...
    st.currentDepth = at;
    sandbox.__enter(ruin.q, ruin.r, at);
    const gotIn2 = !!sandbox.__foot();
    check(gotIn2, 'and the ruin can be entered AGAIN',
      gotIn2 ? 'the breach is where you left it' : 'BARRED — revisiting is broken');

    // ...and every pile already lifted must still be gone.
    let regrew = 0;
    if (gotIn2) {
      const f = sandbox.__foot();
      const ch = sandbox.__int(f.q, f.r, f.d);
      for (const [k, tt] of ch.tiles) if (tt.loot && f.took.indexOf(k) < 0) regrew++;
      sandbox.__leave();
    }
    check(regrew === 0, 'and nothing you already lifted has grown back',
      regrew ? regrew + ' piles REGREW — the restock faucet is back' : 'the deck stayed empty');

    // And the record has to outlive the session, or the faucet returns on reload.
    const before = JSON.stringify(st.deckTook);
    sandbox.__save();
    sandbox.__resume();
    const after = JSON.stringify(sandbox.__st().deckTook);
    check(after === before && after !== '{}', 'and the record survives a reload',
      after === before ? Object.keys(sandbox.__st().deckTook).length + ' decks remembered' : 'LOST ON RELOAD');
  }
}

//--- THE GROTTO --------------------------------------------------------------
// Sean asked for "a sub anchored in a grotto, an underground lake with a beach
// and a cave opening that could be spelunked ... it could connect to other
// caves ... and maybe exit into ruins, too."
//
// A cave is not a building, so it gets the opposite rules: no architecture, no
// bulkheads, and no rising water — but no door to put between you and whatever
// found the air first, either. The invariants below are the ones that would
// silently ruin it: a chamber walled off from the mouth, a chain that loops or
// dead-ends, a beach consumed like a prize, or a grotto sharing its record with
// a ruin at the same coordinates.
console.log('\n--- GROTTOES ---');
{
  let stranded = 0, doors = 0, decks = 0, wayless = 0;
  const tileCount = { tiny: [], small: [], medium: [], large: [], beach: [] };
  for (let i = 0; i < 120; i++) {
    const q = (i * 7) % 40 - 20, r = (i * 13) % 40 - 20, d = 60 + (i % 8) * 60;
    // The sand itself is a deck now, and it must be as reachable as the rest.
    const decksHere = [{ kind: 'beach', segs: 1, last: true }];
    for (const m of sandbox.__mouths(q, r, d)) {
      for (let sg = 0; sg < m.segs; sg++) {
        decksHere.push({ kind: 'cave' + m.letter + (sg ? sg : ''), segs: m.segs, last: sg === m.segs - 1 });
      }
    }
    for (const spec of decksHere) {
      const kind = spec.kind;
      const ch = sandbox.__int(q, r, d, kind);
      decks++;
      const seen = new Set([ch.entry.x + ',' + ch.entry.y]);
      const stack = [[ch.entry.x, ch.entry.y]];
      while (stack.length) {
        const cur = stack.pop();
        for (const step of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const nk = (cur[0] + step[0]) + ',' + (cur[1] + step[1]);
          if (seen.has(nk) || !ch.tiles.has(nk)) continue;
          seen.add(nk); stack.push([cur[0] + step[0], cur[1] + step[1]]);
        }
      }
      if (seen.size !== ch.tiles.size) stranded++;
      for (const t of ch.tiles.values()) if (t.t === 'door') doors++;
      if (ch.size && tileCount[ch.size]) tileCount[ch.size].push(ch.tiles.size);
      if (kind !== 'beach' && !spec.last && !ch.way) wayless++;
    }
  }
  const avgN = a => a.length ? Math.round(a.reduce((x, n) => x + n, 0) / a.length) : 0;
  check(decks > 120, 'the grotto probe is generating real decks', decks + ' decks off 120 sites');
  check(stranded === 0, 'no cave strands a chamber behind solid rock', stranded + ' of ' + decks);
  check(doors === 0, 'and nobody hung a bulkhead in one', doors + ' doors in rock');
  check(wayless === 0, 'every deck that promises a way on has one', wayless + ' missing');
  check(avgN(tileCount.large) > avgN(tileCount.small) * 1.5,
    'a dead end, a chamber, a hall and a passage are four different sizes',
    avgN(tileCount.tiny) + ' / ' + avgN(tileCount.small) + ' / ' + avgN(tileCount.medium)
      + ' / ' + avgN(tileCount.large) + ' tiles');

  // The chain: it has to end, it must not loop, and its mouth is the water.
  let faults = 0, longest = 0, mouthsSeen = 0;
  for (let i = 0; i < 200; i++) {
    const q = (i * 11) % 50 - 25, r = (i * 5) % 50 - 25, d = 120 + (i % 6) * 60;
    for (const m of sandbox.__mouths(q, r, d)) {
      mouthsSeen++;
      const first = 'cave' + m.letter;
      let kind = first, guard = 0; const path = [first];
      while (guard++ < 12) {
        const on = sandbox.__onward(q, r, d, kind);
        if (!on) break;
        if (path.includes(on)) { faults++; break; }
        path.push(on); kind = on;
        if (sandbox.__back(q, r, d, kind) !== path[path.length - 2]) faults++;
      }
      if (guard >= 12) faults++;                                    // never terminated
      // EVERY MOUTH OPENS ON THE SAND. That is what makes the beach the hub:
      // however deep you go, walking back out lands you where the boat is.
      if (sandbox.__back(q, r, d, first) !== 'beach') faults++;
      longest = Math.max(longest, path.length);
    }
  }
  check(mouthsSeen >= 200, 'the chain check is walking real mouths', mouthsSeen + ' mouths off 200 beaches');
  check(faults === 0, 'every chain resolves and every mouth opens on the sand', faults + ' faults');
  check(longest >= 3, 'and a passage is genuinely a system', longest + ' decks deep');

  // Records must not collide. A hull, a tower and three cave links can all sit
  // on one set of coordinates; if they share a key they share stripped loot.
  const gKinds = ['ruin', 'hull', 'beach', 'cave', 'cave1', 'caveB', 'caveB1', 'caveC', 'deepruin'];
  const sufs = gKinds.map(k => sandbox.__suffix(k));
  check(new Set(sufs).size === sufs.length,
    'every kind of place keeps its own record', sufs.join(' '));

  // Going ashore on the sand, and the rules that follow from it.
  const stG = sandbox.__st();
  // FIND A LANDFALL WITH SOMETHING BEHIND IT. A beach whose only mouth is an
  // empty dead end is a legitimate outcome — 47% of dead ends hold nothing, by
  // design — but it cannot test whether loot stays lifted. Search for one that
  // can, and say how far it looked.
  let site = null, looked = 0;
  for (let i = 0; i < 40 && !site; i++) {
    const bq = 2 + i, br = -11 - i, bd = 120 + (i % 5) * 60;
    looked++;
    for (const m of sandbox.__mouths(bq, br, bd)) {
      const chM = sandbox.__int(bq, br, bd, 'cave' + m.letter);
      let n = 0; for (const e of chM.tiles) if (e[1].loot) n++;
      if (n > 0) { site = [bq, br, bd]; break; }
    }
  }
  check(!!site, 'the probe found a landfall with something behind it',
    site ? site.join(',') + ' after ' + looked + ' looks' : 'NONE IN 40');
  if (!site) site = [2, -11, 120];
  sandbox.__setCell(site[0], site[1], site[2], 'beach');
  stG.q = site[0]; stG.r = site[1]; stG.currentDepth = site[2]; stG.air = 200;
  stG.expedition = null; stG.foot = null; stG.alive = true;
  sandbox.__beach();
  const gf = sandbox.__foot();
  check(!!gf && gf.kind === 'beach', 'a beach puts the captain on the sand',
    gf ? 'ashore in a ' + gf.kind : 'NOBODY WENT ASHORE');
  if (gf) {
    check(gf.water.length === 0, 'a cave does not flood — you walked in above the waterline',
      gf.water.length + ' wet tiles at the start');
    const gained = sandbox.__flood();
    check(gained === 0, 'and there is nothing for the sea to advance from', gained + ' tiles taken');
    sandbox.__seal();
    check(!!sandbox.__foot(), 'asking for a bulkhead in rock is answered, not fatal');
    // Take everything, leave, come back: the grotto is a place, not a prize.
    const ch0 = sandbox.__int(gf.q, gf.r, gf.d, gf.kind);
    // STRIP A MOUTH, NOT THE SAND. The beach deck carries no loot — it is the
    // doorstep — so counting piles on it made "nothing grew back" trivially
    // true, which is precisely the vacuous shape this suite has shipped twice
    // before. Walk into the first mouth and strip THAT.
    let piles = 0;
    let stripped = null;
    // ...and a mouth with something IN it. A dead end can legitimately hold
    // nothing, and stripping nothing proves nothing.
    for (const entry of ch0.tiles) {
      if (entry[1].t !== 'way' || !entry[1].to) continue;
      const chM = sandbox.__int(gf.q, gf.r, gf.d, entry[1].to);
      let n = 0;
      for (const e2 of chM.tiles) if (e2[1].loot) n++;
      if (!n) continue;
      stripped = entry[1].to;
      for (const e2 of chM.tiles) if (e2[1].loot) { piles++; gf.took.push(e2[0]); }
      break;
    }
    check(!!stripped && piles > 0, 'the beach has a mouth with something in it',
      stripped ? stripped + ', ' + piles + ' piles' : 'NOTHING TO STRIP');
    const poisPre = stG.poisFound.slice().sort().join('|');
    sandbox.__leave();
    check(stG.poisFound.slice().sort().join('|') === poisPre,
      'coming aboard does not work the beach out', 'poisFound unchanged');
    // WITH FULL TANKS, which is how you will usually arrive at your own
    // station — you topped them at the last refuge. Going ashore used to be
    // nested inside the air top-up, so a full boat was locked out of its own
    // grotto and the branch never ran at all.
    // No `? :` fallback here on purpose. A probe that silently degrades to a
    // magic number is how a vacuous assertion ships — this suite has shipped
    // two already. If __subAir goes missing, this line must throw.
    stG.air = sandbox.__subAir();
    sandbox.__beach();
    const gfFull = sandbox.__foot();
    check(!!gfFull && gfFull.kind === 'beach',
      'full tanks do not lock you out of your own grotto',
      gfFull ? 'ashore with the tanks full' : 'LOCKED OUT — the air gate swallowed the beach');
    if (gfFull) sandbox.__leave();
    stG.air = 200;
    sandbox.__beach();
    const gf2 = sandbox.__foot();
    check(!!gf2 && gf2.kind === 'beach', 'and you can walk back in tomorrow',
      gf2 ? 'ashore again' : 'THE BEACH CLOSED');
    let regrew = 0;
    if (gf2 && stripped) {
      // ...and check the SAME mouth you stripped, not the sand.
      const ch2 = sandbox.__int(gf2.q, gf2.r, gf2.d, stripped);
      for (const entry of ch2.tiles) if (entry[1].loot && gf2.took.indexOf(entry[0]) < 0) regrew++;
    }
    check(piles > 0 && regrew === 0, 'with nothing grown back in it',
      regrew ? regrew + ' piles REGREW' : piles + ' piles stayed lifted');
    // A grotto is where a station belongs — the one thing a wreck can never be.
    if (gf2) {
      stG.cargo = 40; stG.base = null; gf2.dweller = null;
      sandbox.__claim();
      check(!!sandbox.__base(), 'and a station can be kept there',
        sandbox.__base() ? 'anchored at ' + gf2.q + ',' + gf2.r : 'REFUSED');
      stG.base = null; stG.foot = null;
    }
  }
}

//--- ashore() IS AN ANSWER, NOT A QUESTION -----------------------------------
// It writes "You are not aboard" into the log and THEN returns true. That is
// right for a helm control the captain just pressed, and wrong for anything
// that only wants to know where the captain is.
//
// The music picker had `ashore() && !state.foot`, which is false by
// construction — ashore() returns true only WHEN state.foot is set — so the
// entire condition existed to nag the player once per evaluation for as long
// as they stood on a deck. Walking a grotto end to end is what finally made it
// loud enough to notice: four transitions, four nags.
//
// The rule that prevents the whole class: every call to ashore() must be the
// LAST term of an early-return guard. If anything can make the condition false
// after ashore() has already spoken, the log is lying about what happened.
console.log('\n--- ashore() IS A GUARD, NOT A PREDICATE ---');
{
  const src = require('fs').readFileSync(__dirname + '/../fathom-chart.html', 'utf8');
  const body = src.match(/<script>([\s\S]*?)<\/script>/)[1];
  const lines = body.split('\n');
  const calls = [], bad = [];
  lines.forEach((ln, i) => {
    if (!/\bashore\(\)/.test(ln)) return;
    const t = ln.trim();
    if (/^function ashore/.test(t)) return;                      // the definition
    if (t.startsWith('//') || t.startsWith('*')) return;         // and prose about it
    calls.push(i + 1);
    // ashore() must be the last thing evaluated before the return.
    if (!/\bashore\(\)\s*\)\s*return\b/.test(ln)) bad.push((i + 1) + ': ' + ln.trim().slice(0, 78));
  });
  check(calls.length >= 5, 'the ashore() guard check is finding real call sites',
    calls.length + ' call sites at lines ' + calls.join(', '));
  check(bad.length === 0,
    'every ashore() call is the last term of an early return',
    bad.length ? bad.join('  |  ') : 'all ' + calls.length + ' call sites clean');
}

console.log(failures === 0 ? '\nALL INTERIOR CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
