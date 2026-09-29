// IS EVERY NAME THE GAME BRANCHES ON WRITTEN BY SOMETHING? — an instrument.
//
//     node tests/wired.js
//
// `reachable.js` asks whether a FUNCTION is ever called. This asks the same
// question of everything else that can be wired at both ends with nothing in
// the middle — which is this project's signature bug, and it has worn a
// different coat every time:
//
//   - `deepruin` had a kind, three scenes, prose and a battery check, and no
//     code path ever named it.
//   - `c.awake` was read by five gates and written by two spawners and by no
//     creature's own tick, so the autopilot stopped for nothing an ordinary
//     hunter could do.
//   - `weatherTick` had one call site, and it was `wait`.
//   - `FLAVOR.openWater` was seven sentences nothing read for a month.
//
// So this walks the tables and the fields and reports, in both directions:
//
//   NAMED BUT NOT IN THE TABLE   a `tip('x')`, `sfx('x')`, `showScene('x')`,
//                                `giveItem('x')` etc. whose key does not exist.
//                                showScene IGNORES an unknown key silently, so a
//                                typo here is a scene that never shows. These
//                                FAIL — they are typos, not decisions.
//   IN THE TABLE BUT NEVER NAMED a key nothing refers to: a tip that cannot
//                                fire, a scene nothing can pick, a log class
//                                with no CSS. Listed for the eye.
//   READ BUT NEVER WRITTEN       a state or creature field some gate tests
//                                that nothing outside its initialiser ever
//                                sets — the `awake` shape exactly.
//   WRITTEN BUT NEVER READ       bookkeeping nobody consults.
//
// It is an instrument first and a gate second: only the first category exits
// non-zero. Everything else is a list to read with a cup of tea, and some of
// it will be deliberate — the point is that nobody has to remember to look.
// It runs in the battery (`run-all.js`) for the gate half; read it by hand for
// the rest.
//
// Its first run found: `state._lastSpaceClass`, `_outfitOffer`, `_hireOffer`,
// `_armoryOffer`, `_armsOffer` nulled in three places each and read nowhere
// (the old offer chain's ghosts); `c.calm` set on every creature at spawn and
// read by nothing, ever; and it settled a question the ledger had left open —
// all ten (people, hull) pairs a fleet can sail have a drawing of their own,
// so the four generic `ship*` scenes are unreachable, and are KEPT as the
// documented fallback for a fifth people rather than deleted.
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(process.env.FATHOM_HTML || path.join(ROOT, 'fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
const lines = script.split('\n');
const lineOf = (idx) => script.slice(0, idx).split('\n').length;

let failures = 0;
const section = (t) => console.log('\n' + t);
const list = (arr, fmt) => { if (!arr.length) console.log('  (none)'); for (const a of arr) console.log('  ' + fmt(a)); };

// ---- The tables, as the running game sees them ----------------------------
// Evaluate the script for real (the same Proxy-DOM sandbox every instrument
// uses) so table KEYS come from the objects and not from a regex over source.
const vm = require('vm');
function mk() { const fn = function () { return s }; const s = new Proxy(fn, { get(t, p) {
  if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return function* () {};
  if (p === 'length') return 0; if (['firstChild','lastChild','nextSibling','parentNode'].includes(p)) return null;
  if (p === 'classList') return { add(){}, remove(){}, contains(){return false}, toggle(){return false} };
  if (p === 'style') return {}; return s; }, apply(){return s}, set(){return true}, has(){return true}, construct(){return s} }); return s; }
const pingEl = { value: '2', max: '5', addEventListener: () => {}, disabled: false, textContent: '' };
const doc = new Proxy({}, { get(t, p) {
  if (['createElementNS','createElement','querySelector','querySelectorAll'].includes(p)) return () => mk();
  if (p === 'getElementById') return id => id === 'ping-power' ? pingEl : mk();
  if (p === 'addEventListener') return () => {}; return mk(); } });
let clock = 0; const mem = {};
const sb = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Date, Array, Object, Map, Set, String, Number, Boolean, Symbol, parseInt, parseFloat, isNaN, isFinite,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => (clock += 1000) }, document: doc, navigator: { userAgent: 'node' },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: k => { delete mem[k] } },
  addEventListener: () => {}, removeEventListener: () => {}, location: { href: '', protocol: 'http:', hostname: 'node', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }), alert: () => {} };
sb.window = sb; sb.globalThis = sb; sb.self = sb; vm.createContext(sb);
vm.runInContext(script + `
;function __tables(){ return {
  TIPS: Object.keys(TIPS), TIP_TITLES: Object.keys(TIP_TITLES), SFX: Object.keys(SFX),
  VP_SCENES: Object.keys(VP_SCENES), ITEMS: Object.keys(ITEMS), GEAR: Object.keys(GEAR),
  TENANTS: Object.keys(TENANTS), BESTIARY: Object.keys(BESTIARY), CREATURE_TOUGH: Object.keys(CREATURE_TOUGH),
  TILES: Object.keys(TILES), CULTURES: Object.keys(CULTURES), WORKS: WORKS.map(w => w.key),
  HULLS: Object.keys(HULLS), QUARRY: Object.keys(QUARRY), STRIKE: Object.keys(STRIKE),
  CONDITIONS: Object.keys(CONDITIONS), KNACKS: Object.keys(KNACKS), ROLES: Object.keys(ROLES),
  LEAD_KINDS: Object.keys(LEAD_KINDS), BRIEFS: BRIEFS.map(b => b.id),
  stateKeys: Object.keys(state), BOARDER_AS: Object.values(BOARDER_AS),
  FLEET_MIX: Object.fromEntries(Object.keys(FLEETS).map(k => [k, Object.keys(FLEETS[k].mix)])),
  cultureItems: [].concat(...Object.values(CULTURES).map(c => [].concat(c.sells || [], (c.buys && c.buys.keys) || [], c.fromSurface || []))),
  cacheStock: CACHE_STOCK,
}; }`, sb, { timeout: 120000 });
const T = sb.__tables();

// ---- 1. NAMES THE CODE UTTERS vs THE TABLES ---------------------------------
// A literal argument to a function that indexes a table. `tip('x')`,
// `sfx('x')`, `showScene('x')`, `giveItem('x', ...)`, `itemCount('x')` ...
function calls(fn) {
  const out = [];
  const re = new RegExp('(?<![\\w$.])' + fn + '\\(\\s*[\'"]([^\'"]+)[\'"]', 'g');
  let m; while ((m = re.exec(script))) out.push({ key: m[1], line: lineOf(m.index) });
  return out;
}
function bracket(table) {   // TABLE['x'] and TABLE.x
  const out = [];
  const re = new RegExp('(?<![\\w$])' + table + '(?:\\[\\s*[\'"]([^\'"]+)[\'"]\\s*\\]|\\.([A-Za-z_$][\\w$]*))', 'g');
  let m; while ((m = re.exec(script))) { const k = m[1] || m[2]; if (k) out.push({ key: k, line: lineOf(m.index) }); }
  return out;
}
const utter = [
  { what: 'tip()',         refs: calls('tip'),                                     table: T.TIPS,     name: 'TIPS' },
  { what: 'sfx()',         refs: calls('sfx'),                                     table: T.SFX,      name: 'SFX' },
  { what: 'showScene()',   refs: calls('showScene'),                               table: T.VP_SCENES, name: 'VP_SCENES' },
  { what: 'giveItem/takeItem/itemCount/hasProp()',
    refs: [].concat(calls('giveItem'), calls('takeItem'), calls('itemCount'), calls('hasProp')),
    table: T.ITEMS, name: 'ITEMS' },
  { what: 'ITEMS[...]',    refs: bracket('ITEMS').filter(r => !/^(?:[a-z]+Key|k|key|it|item|loot|got|need|b\.item|m\.item)$/.test(r.key)), table: T.ITEMS, name: 'ITEMS' },
  { what: 'CULTURES[*].sells/buys.keys/fromSurface', refs: T.cultureItems.map(k => ({ key: k, line: 0 })), table: T.ITEMS, name: 'ITEMS' },
  { what: 'CACHE_STOCK',   refs: T.cacheStock.map(k => ({ key: k, line: 0 })),    table: T.ITEMS,    name: 'ITEMS' },
  { what: 'BOARDER_AS values', refs: T.BOARDER_AS.map(k => ({ key: k, line: 0 })), table: T.TENANTS, name: 'TENANTS' },
  { what: 'spawnCreature()', refs: calls('spawnCreature'),                          table: T.CREATURE_TOUGH.concat(['rival']), name: 'CREATURE_TOUGH' },
  { what: 'GEAR[...]',     refs: bracket('GEAR').filter(r => /^[a-z]+$/.test(r.key) && !/^(?:k|key)$/.test(r.key)), table: T.GEAR, name: 'GEAR' },
  { what: 'crewLvl()/crewCan()', refs: calls('crewLvl').concat(calls('crewCan')), table: T.ROLES.concat(T.KNACKS), name: 'ROLES+KNACKS' },
];
// `ITEMS.x` in prose-free code is rare; `ITEMS[k]` with a variable is the norm,
// and `bracket` only catches literal keys and dotted names. Dotted names that
// are METHODS of the object rather than items are not keys either.
const notKeys = new Set(['length', 'push', 'map', 'filter', 'some', 'find', 'indexOf', 'includes', 'keys', 'values', 'forEach', 'sort', 'slice', 'concat', 'reduce', 'join', 'get', 'set', 'has']);

section('NAMED BUT NOT IN THE TABLE — a typo is a feature that never fires. These fail the run.');
let bad = [];
for (const u of utter) {
  const tbl = new Set(u.table);
  for (const r of u.refs) {
    if (notKeys.has(r.key)) continue;
    if (!tbl.has(r.key)) bad.push({ what: u.what, key: r.key, line: r.line, name: u.name });
  }
}
list(bad, b => `${String(b.line || '').padStart(6)}  ${b.what}: '${b.key}' is not in ${b.name}`);
failures += bad.length;

// Scene names that sceneForNow RETURNS, and the computed families it builds.
section('SCENES sceneForNow can return that VP_SCENES does not hold — showScene() would ignore them SILENTLY. These fail the run.');
const sfnStart = script.indexOf('function sceneForNow(');
const sfnEnd = script.indexOf('\nfunction ', sfnStart + 10);
const sfn = script.slice(sfnStart, sfnEnd);
const sceneLits = new Set();
let m;
// A bare `return 'x'` — NOT `return 'ship' + near.hull`, where the literal is a
// prefix of a computed name and the family is checked below.
const retRe = /return\s+'([a-z]+)'(?!\s*\+)/g;        while ((m = retRe.exec(sfn))) sceneLits.add(m[1]);
const arrRe = /\[\s*'([a-z]+)'(?:\s*,\s*'([a-z]+)')*\s*\]/g;   // ['hullbreak', 'hullup', 'hullside']
while ((m = arrRe.exec(sfn))) for (const s of m[0].match(/'([a-z]+)'/g)) sceneLits.add(s.replace(/'/g, ''));
const ternRe = /\?\s*'([a-z]+)'\s*:/g;                while ((m = ternRe.exec(sfn))) sceneLits.add(m[1]);
const ternRe2 = /:\s*'([a-z]+)'\s*[;\n]/g;            while ((m = ternRe2.exec(sfn))) sceneLits.add(m[1]);
// The computed families: yard + Hull for every (people, hull) pair a fleet can
// actually put to sea — read off FLEETS, so a Mariner destroyer (which does not
// exist) is not reported missing — and 'ship' + hull, the generic fallback,
// which is reachable only if some real pair has no drawing of its own.
const yards = { confluence: 'line', libertines: 'cf', mariners: 'mar' };
const computed = new Set();
const pairs = [];
for (const cu of Object.keys(T.FLEET_MIX)) for (const h of T.FLEET_MIX[cu]) {
  const own = (yards[cu] || '') + h.charAt(0).toUpperCase() + h.slice(1);
  pairs.push({ cu, h, own });
  computed.add(own);
}
const scenes = new Set(T.VP_SCENES);
const missingScenes = [...sceneLits].filter(s => !scenes.has(s));
list(missingScenes, s => `sceneForNow names '${s}' and VP_SCENES has no such scene`);
failures += missingScenes.length;
const noOwn = pairs.filter(p => !scenes.has(p.own));
const genericReachable = new Set(noOwn.map(p => 'ship' + p.h));
for (const g of genericReachable) computed.add(g);
console.log('  (people, hull) pairs a fleet can sail: ' + pairs.length + '; with a drawing of their own: ' + (pairs.length - noOwn.length)
  + (noOwn.length ? '; falling back to the generic hull scene: ' + noOwn.map(p => p.cu + '/' + p.h).join(', ') : ''));
for (const h of T.HULLS) if (!genericReachable.has('ship' + h) && scenes.has('ship' + h))
  console.log(`  generic scene 'ship${h}' can never show — every people that sails ${h} has its own drawing`);

// ---- 2. IN THE TABLE BUT NEVER NAMED ----------------------------------------
section('IN THE TABLE BUT NEVER NAMED — for the eye. A tip nothing can fire, a scene nothing can pick.');
const literalRefs = (key, excludeDefIdx) => {
  const re = new RegExp('[\'"]' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]', 'g');
  let n = 0, mm; while ((mm = re.exec(script))) { if (Math.abs(mm.index - excludeDefIdx) > 2) n++; }
  return n;
};
const unnamed = [];
// TIPS: the key must appear as a quoted literal somewhere in the code. Both
// tables declare their keys UNQUOTED, so any quoted `'key'` is a call site —
// including one buried in a ternary inside `tip(...)`, which a literal-argument
// match would miss (and did: it reported the three claim tips as unfireable).
for (const k of T.TIPS) if (literalRefs(k, -10) === 0) unnamed.push({ table: 'TIPS', key: k, note: 'no code names \'' + k + '\' — it can never fire' });
for (const k of T.TIP_TITLES) if (!T.TIPS.includes(k)) unnamed.push({ table: 'TIP_TITLES', key: k, note: 'a title for a tip that does not exist' });
for (const k of T.TIPS) if (!T.TIP_TITLES.includes(k)) unnamed.push({ table: 'TIPS', key: k, note: 'no TIP_TITLES entry — the card is headed "A word from the boat"' });
// SFX: must be named in an sfx() call.
const sfxCalls = new Set(calls('sfx').map(r => r.key));
for (const k of T.SFX) if (!sfxCalls.has(k)) unnamed.push({ table: 'SFX', key: k, note: 'no sfx(\'' + k + '\') call' });
// VP_SCENES: named as a literal somewhere outside its own definition, or computed, or a creature type with a scene.
const creatureTypes = new Set(T.CREATURE_TOUGH.concat(['rival']));
for (const k of T.VP_SCENES) {
  const defIdx = script.search(new RegExp('^\\s*' + k + ':\\s*\\{\\s*cap:', 'm'));
  const refs = literalRefs(k, defIdx);
  if (refs === 0 && !computed.has(k) && !creatureTypes.has(k)) unnamed.push({ table: 'VP_SCENES', key: k, note: 'no literal names it and no computed family produces it' });
}
// BRIEFS: each must be findable; they fire by predicate so only check ids are unique.
const dupBriefs = T.BRIEFS.filter((b, i) => T.BRIEFS.indexOf(b) !== i);
for (const b of dupBriefs) unnamed.push({ table: 'BRIEFS', key: b, note: 'duplicate id — the second can never be marked said' });
// Log classes: every `log(..., 'cls', ...)` class should have CSS.
const clsRe = /\blog\((?:[^()]|\([^()]*\))*?,\s*'([a-z]*)'\s*(?:,|\))/g;
const clsSeen = new Set();
while ((m = clsRe.exec(script))) if (m[1]) clsSeen.add(m[1]);
for (const c of clsSeen) {
  if (!new RegExp('\\.log-entry\\.' + c + '\\b|\\.' + c + '\\s*[{,]').test(css)) unnamed.push({ table: 'log class', key: c, note: 'used in a log() call, no CSS rule styles it' });
}
list(unnamed, u => `${u.table.padEnd(11)} '${u.key}' — ${u.note}`);

// ---- 3. FIELDS: READ BUT NEVER WRITTEN / WRITTEN BUT NEVER READ -----------
// `state.foo`. A write is an assignment or a mutation of the field itself;
// everything else is a read. The `state` literal is excluded from the count so
// "initialised and never touched again" shows up as what it is.
section('STATE FIELDS read but never written outside the literal — the `awake` shape.');
// COMMENTS ARE NOT CODE. "loaded into state.sub when a run begins" is a
// sentence in a comment from before `activeSub()` existed, and it read as a
// field with one reader and no writer. Whole-line comments go, and trailing
// ones in the house style (two spaces, then `//`).
const uncommented = script.split('\n')
  .filter(l => !/^\s*\/\//.test(l))
  .map(l => l.replace(/\s{2,}\/\/(?![^'"]*['"][^'"]*$).*$/, ''))
  .join('\n');
const stateStart = uncommented.indexOf('const state = {');
const stateEnd = uncommented.indexOf('\n};', stateStart) + 3;
const body = uncommented.slice(0, stateStart) + uncommented.slice(stateEnd);
function fieldUses(text, prefixRe, field) {
  const w = new RegExp(prefixRe + '\\.' + field + '\\s*(?:=[^=]|\\+=|-=|\\*=|/=|\\+\\+|--|\\.(?:push|splice|set|delete|clear|unshift|shift|pop|add)\\(|\\.length\\s*=[^=])', 'g');
  const a = new RegExp(prefixRe + '\\.' + field + '(?![\\w$])', 'g');
  const writes = (text.match(w) || []).length;
  const all = (text.match(a) || []).length;
  // A `delete state.foo` is a write too.
  const del = (text.match(new RegExp('delete\\s+' + prefixRe + '\\.' + field + '(?![\\w$])', 'g')) || []).length;
  return { writes: writes + del, reads: Math.max(0, all - writes - del) };
}
const allStateFields = new Set(T.stateKeys);
const dyn = /(?<![\w$])state\.([A-Za-z_$][\w$]*)/g;
while ((m = dyn.exec(body))) allStateFields.add(m[1]);
const readOnly = [], writeOnly = [];
for (const f of allStateFields) {
  if (['q', 'r', 'currentDepth', 'entities'].includes(f)) continue;   // accessors onto entities[0]
  const u = fieldUses(body, '(?<![\\w$])state', f);
  const inLiteral = T.stateKeys.includes(f);
  if (u.reads > 0 && u.writes === 0) readOnly.push({ f, reads: u.reads, inLiteral });
  if (u.writes > 0 && u.reads === 0) writeOnly.push({ f, writes: u.writes, inLiteral });
}
list(readOnly, r => `state.${r.f.padEnd(18)} read ${String(r.reads).padStart(3)}x, written 0x${r.inLiteral ? '' : '  (not even in the literal)'}`);
section('STATE FIELDS written but never read — bookkeeping nobody consults.');
list(writeOnly, r => `state.${r.f.padEnd(18)} written ${String(r.writes).padStart(3)}x, read 0x`);

// Creature fields: the set spawnCreature and spawnShoal put on an animal.
section('CREATURE FIELDS (from spawnCreature/spawnShoal) — read but never written past spawn, or written but never read.');
const spawnStart = uncommented.indexOf('function spawnCreature(');
const spawnEnd = uncommented.indexOf('\nfunction creatureCanEnter(', spawnStart);
const spawnText = uncommented.slice(spawnStart, spawnEnd);
const cfields = new Set();
const cfRe = /\bc\.([A-Za-z_$][\w$]*)\s*=[^=]/g;      while ((m = cfRe.exec(spawnText))) cfields.add(m[1]);
// The two object literals. Keys only at the start of the literal or after a
// comma — `'shoal:' + sq` inside an id STRING is not a key, and read as one.
const litRe = /\{\s*id:[^}]*\}/g;
while ((m = litRe.exec(spawnText))) for (const km of m[0].matchAll(/(?:^\{|,)\s*([A-Za-z_$][\w$]*)\s*:/g)) cfields.add(km[1]);
const outsideSpawn = uncommented.slice(0, spawnStart) + uncommented.slice(spawnEnd);
const cTemper = [], cWriteOnly = [];
for (const f of cfields) {
  if (['id', 'type', 'q', 'r', 'depth'].includes(f)) continue;
  // Any `.field` on any receiver — creature code addresses the animal as c, cr, o, x, att...
  const u = fieldUses(outsideSpawn, '(?<![\\w$])[A-Za-z_$][\\w$]*', f);
  if (u.reads > 0 && u.writes === 0) cTemper.push({ f, reads: u.reads });
  if (u.writes === 0 && u.reads === 0) cWriteOnly.push({ f, note: 'set at spawn, never touched again' });
  else if (u.writes > 0 && u.reads === 0) cWriteOnly.push({ f, note: 'written ' + u.writes + 'x, read 0x' });
}
console.log('  set once at spawn and only ever read — fine for a TEMPERAMENT, the bug for a FLAG a gate expects to change:');
list(cTemper, r => `c.${r.f.padEnd(14)} read ${String(r.reads).padStart(3)}x`);
console.log('  never read at all:');
list(cWriteOnly, r => `c.${r.f.padEnd(14)} ${r.note}`);

// ---- verdict ----------------------------------------------------------------
console.log('');
if (failures) { console.log('WIRED: ' + failures + ' name(s) the code utters that no table holds. FAIL.'); process.exit(1); }
console.log('WIRED: every name the code utters is in its table. The lists above are for reading, not for fixing blind.');
