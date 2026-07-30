// IS ANYTHING IN HERE DEAD? — an instrument.  node tests/reachable.js
//
// The most repeated mistake in this project by a wide margin is a function that is
// written, wired at both ends, and called by nothing. `deepruin` had its own kind, three
// porthole scenes, prose, a flood exemption and a battery check that ran every single
// time — and no code path ever named it, so no player had stood in one. In the single day
// after finding that I did it four more times: `cityHere`, `hailRival`, `rivalHostile`,
// `wireChartGestures`.
//
// So this is that check, mechanised and run over the whole file rather than over whatever
// I happen to remember writing. It reports three things:
//
//   DEAD          declared, and its name appears nowhere else at all.
//   ONLY-IN-TESTS reachable from the battery but from no line of the game. Sometimes
//                 correct (a pure helper a suite exercises); sometimes a feature only the
//                 tests can reach, which is the bug.
//   HANDLER-ONLY  referenced solely from an addEventListener or a data- attribute. Listed
//                 for the eye, not as a fault: that IS how a control is reached.
//
// It is an instrument, not a gate. Some entries will be deliberate. The point is that
// nobody has to remember to look.
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'fathom-chart.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Every top-level `function name(` declaration. Nested helpers and arrow consts are out
// of scope on purpose — a nested function that is unused is a local smell, not a shipped
// feature nobody can reach.
const declared = [];
const decl = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let m;
while ((m = decl.exec(script))) declared.push({ name: m[1], at: script.slice(0, m.index).split('\n').length });

// Count references outside the declaration itself.
function refsIn(text, name) {
  const re = new RegExp('(?<![\\w$.])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w$])', 'g');
  return (text.match(re) || []).length;
}

const testFiles = fs.readdirSync(path.join(ROOT, 'tests'))
  .filter(f => f.endsWith('.js') && f !== 'reachable.js')
  .map(f => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'));
const testText = testFiles.join('\n');

const dead = [], testOnly = [], handlerOnly = [];
for (const d of declared) {
  const inGame = refsIn(script, d.name) - 1;          // minus the declaration
  const inTests = refsIn(testText, d.name);
  if (inGame <= 0 && inTests <= 0) { dead.push(d); continue; }
  if (inGame <= 0) { testOnly.push({ ...d, inTests }); continue; }
  // Is every game reference a wiring line rather than a call?
  const lines = script.split('\n').filter(l => refsIn(l, d.name) > 0 && !/^function\s/.test(l));
  const allWiring = lines.length > 0 && lines.every(l =>
    /addEventListener|data-[\w-]+\s*=|onclick|\.onclick/.test(l));
  if (allWiring) handlerOnly.push({ ...d, lines: lines.length });
}

const show = (label, list, extra) => {
  console.log('\n' + label + ' — ' + list.length);
  for (const d of list.sort((a, b) => a.at - b.at)) {
    console.log('  ' + String(d.at).padStart(6) + '  ' + d.name + (extra ? extra(d) : ''));
  }
  if (!list.length) console.log('  (none)');
};

console.log('REACHABILITY — ' + declared.length + ' top-level functions in fathom-chart.html');
show('DEAD: declared and named nowhere else', dead);
show('ONLY THE TESTS CAN REACH IT', testOnly, d => '   (' + d.inTests + ' refs in tests)');
show('REACHED ONLY BY WIRING (a control — usually correct)', handlerOnly, d => '   (' + d.lines + ' wiring lines)');

console.log('\nDead functions are the bug. The other two lists are for the eye:');
console.log('a suite asking "does this draw correctly" is not asking "can anybody get here".');

// THE SAME QUESTION FROM THE OTHER END, and a genuine blind spot in the battery.
// A control is reached by `getElementById('btn-x').addEventListener(...)`. If that
// id is not in the markup, getElementById returns null and the dereference throws
// during boot — every line after it never runs, and the game is dead on the slip.
// The suites cannot catch this: they boot inside a Proxy DOM that answers EVERY id
// with a truthy stub, so a typo'd id is invisible to all ten of them and visible
// immediately to Sean. Checked here against the actual markup instead.
const head = html.slice(0, html.indexOf('<script>'));
const declaredIds = new Set([...head.matchAll(/id="([^"]+)"/g)].map(x => x[1]));
const asked = [...new Set([...script.matchAll(/getElementById\('([^']+)'\)/g)].map(x => x[1]))];
const missing = asked.filter(i => !declaredIds.has(i));
const unguarded = [...new Set([...script.matchAll(/document\.getElementById\('([^']+)'\)\.\w/g)]
  .map(x => x[1]))].filter(i => !declaredIds.has(i));

console.log('\nELEMENT IDS — ' + asked.length + ' asked for, ' + declaredIds.size + ' declared in the markup');
console.log('  asked for but absent:  ' + (missing.length ? missing.join(', ') : '(none)'));
console.log('  ...and dereferenced with no null guard, i.e. throws on boot:  '
  + (unguarded.length ? '*** ' + unguarded.join(', ') + ' ***' : '(none)'));
