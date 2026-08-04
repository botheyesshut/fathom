// WHAT ELSE MOVED.  `node tests/moved.js`
//
// Every other instrument in this directory answers "did the thing I built
// work?". This one answers the question that has actually cost this project
// time: WHAT ELSE CHANGED WHILE I WASN'T LOOKING.
//
// The failure it exists for, stated plainly, from 2026-08-04. I wired nerve
// conditions into `frayNerve` and verified it with a probe that counted which
// condition rows fired. The probe said REACHABLE. It was, in those same 400
// iterations, killing the entire crew — `inflictCondition` calls `frayNerve`
// back, so the hook I added was a mutual recursion. The probe never looked at
// `state.crew.length`, because I wrote the probe from the same mental model as
// the change, and that model had no reason to suspect the crew.
//
// A probe written by the author of a change inherits the change's blind spots.
// This tool has none, because it does not know what the change was. It runs the
// instruments against the code BEFORE and AFTER and diffs every number both of
// them print.
//
// WHAT IT WILL AND WILL NOT TELL YOU, measured rather than asserted. I first
// wrote here that it "would have caught the recursion in one line — crew lost
// would have gone through the roof". That was a guess and it was wrong. Planting
// the bug back into a scratch build and running this against it: `crew lost`
// read 0 on BOTH sides, because the sea-going bot reaches a deck in 3% of runs
// and the recursion lives in code it does not walk. What moved instead was a
// diffuse scatter of encounter rates — the shifted RNG stream — which says
// SOMETHING changed and does not say what.
//
// So: this tool is a tripwire, not a diagnosis. A scatter of small unexplained
// deltas is the signal; work out the cause yourself. And its reach is exactly
// the reach of the instruments underneath it, which is why tests/delve.js now
// exists to walk the layer the sea bot never gets to.
//
//   node tests/moved.js                    working tree vs HEAD, the fast set
//   node tests/moved.js --full             ...including playtest and firsthour
//   node tests/moved.js --against HEAD~3   ...vs some other commit
//   node tests/moved.js --runs 5           ...more runs, tighter noise floor
//   node tests/moved.js --only prizes,traffic
//
// THIS IS AN INSTRUMENT, NOT A GATE. It reports; it does not decide. Numbers
// SHOULD move when you change something — the point is that you see which ones
// and get to say "yes, that one, on purpose" about each. It exits non-zero for
// exactly one thing: an instrument that ran on one side and died on the other,
// which is never anything but bad news.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// EVERY INSTRUMENT IN BOTH LISTS IS DETERMINISTIC, which is what makes this
// tool worth running at all. They were not, on 2026-08-04: four of them rolled
// unseeded `Math.random`, and all fourteen sandbox `__seed` helpers reset
// `worldSeed` and `rng` but not `interiorSalt` — so every interior in every
// test in this project was generated from a wall-clock salt and "the same seed"
// never once meant the same building. Fixed at the source rather than papered
// over here with more runs. If you add an instrument to either list, run it
// twice and diff it byte-for-byte before you trust a word it says.
//
// Measured cost of one pass, both sides (2026-08-04, this machine):
//   fast ≈ 2 min      full ≈ 25 min (playtest alone is 8.5 min a side)
const FAST = ['prizes', 'traffic', 'holes', 'economy', 'banking', 'decks', 'grotto', 'hold', 'seeing'];
const SLOW = ['playtest', 'firsthour', 'reasons', 'hunt', 'corpus'];

//--- ARGUMENTS ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.indexOf('--' + name) >= 0;

const AGAINST = flag('against', 'HEAD');
// ONE RUN A SIDE IS ENOUGH, because every instrument here is deterministic —
// see the note on FAST. Raise it only if you have added something that wobbles,
// and if you have, prefer fixing the wobble.
const RUNS = Math.max(1, parseInt(flag('runs', '1'), 10));
const ONLY = flag('only', null);
const SUITES = ONLY ? ONLY.split(',').map(s => s.trim())
                    : (has('full') ? FAST.concat(SLOW) : FAST);

//--- THE TWO BUILDS ----------------------------------------------------------
// The baseline comes out of git rather than out of a stored snapshot file. A
// snapshot goes stale the moment somebody forgets to refresh it, and then the
// tool reports a fortnight of drift as if it were today's change — which is
// worse than no tool, because it is a tool you stop reading.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fathom-moved-'));
const BEFORE = path.join(tmp, 'before.html');
// `--file` points the AFTER side at any build you like instead of the working
// tree. Its first use was proving this tool works: plant a known regression in
// a scratch copy, point --file at it, and check the tool actually finds it —
// without disturbing the tree. A differ that has only ever been run on an
// unchanged file has demonstrated nothing except that it can print zero.
const AFTER = flag('file', null) || path.join(ROOT, 'fathom-chart.html');
if (!fs.existsSync(AFTER)) { console.error('No such build: ' + AFTER); process.exit(2); }

const show = spawnSync('git', ['show', AGAINST + ':fathom-chart.html'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (show.status !== 0) {
  console.error('Could not read fathom-chart.html at ' + AGAINST + ':');
  console.error('  ' + (show.stderr || '').trim());
  process.exit(2);
}
fs.writeFileSync(BEFORE, show.stdout);

const identical = fs.readFileSync(BEFORE, 'utf8') === fs.readFileSync(AFTER, 'utf8');

console.log('WHAT ELSE MOVED — working tree vs ' + AGAINST);
console.log('  ' + SUITES.length + ' instrument(s), ' + RUNS + ' run(s) per side.');
if (RUNS < 2) {
  console.log('  These instruments are deterministic, so one run a side is a clean compare:');
  console.log('  anything that differs, differs because the code differs.');
} else {
  console.log('  A number is listed only if it moved further than its own run-to-run spread.');
}
if (identical) {
  console.log('\n  NOTE: the working tree is byte-identical to ' + AGAINST + '. Anything that');
  console.log('  shows as MOVED below is noise this tool failed to account for, which is');
  console.log('  worth knowing about the tool. Nothing here can be about your change.');
}
console.log('');

//--- READING WHAT AN INSTRUMENT SAYS ----------------------------------------
// No instrument is modified to support this and none needs to be. Every one of
// them prints prose with numbers in it, so a metric is just "this sentence,
// with the numbers taken out" and its value is the numbers. If somebody
// rewords a line, its key changes and it shows up as gone-and-arrived rather
// than being silently compared against the wrong thing — which is the honest
// failure and the one that does not mislead.
const NUM = /-?\d[\d,]*\.?\d*/g;

function metrics(text) {
  const out = new Map();
  const seen = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const nums = line.match(NUM);
    if (!nums || !line.trim()) continue;
    let key = line.replace(NUM, '#').trim();
    if (!key.replace(/[#\s.,:|()\-]/g, '')) continue;   // a rule of dashes, not a metric
    // Two different lines can mask to the same sentence. Number them so they
    // stay distinct instead of one quietly overwriting the other.
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    if (n > 1) key += '  [' + n + ']';
    out.set(key, nums.map(s => parseFloat(s.replace(/,/g, ''))));
  }
  return out;
}

function run(suite, htmlPath) {
  const file = path.join(__dirname, suite + '.js');
  if (!fs.existsSync(file)) return { missing: true };
  const r = spawnSync(process.execPath, [file], {
    cwd: ROOT, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, { FATHOM_HTML: htmlPath }),
  });
  return {
    ok: r.status === 0 && !r.error,
    status: r.status, signal: r.signal, error: r.error,
    text: (r.stdout || '') + (r.stderr || ''),
  };
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const spread = (a) => (a.length < 2 ? 0 : Math.max(...a) - Math.min(...a));
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

//--- THE COMPARISON ----------------------------------------------------------
let totalMoved = 0, totalSteady = 0, broke = 0;

for (const suite of SUITES) {
  process.stdout.write('=== ' + suite + ' ===\n');

  const sides = { before: [], after: [] };
  let died = null;
  for (const side of ['before', 'after']) {
    for (let i = 0; i < RUNS; i++) {
      const r = run(suite, side === 'before' ? BEFORE : AFTER);
      if (r.missing) { died = 'no such instrument: tests/' + suite + '.js'; break; }
      if (!r.ok) {
        died = side.toUpperCase() + ' — ' + (r.error ? 'could not spawn: ' + r.error.message
             : r.signal ? 'killed by ' + r.signal
             : 'exit ' + r.status);
        // The instrument's own last words are worth more than my summary.
        const tail = r.text.trim().split('\n').slice(-6).join('\n      ');
        died += '\n      ' + tail;
        break;
      }
      sides[side].push(metrics(r.text));
    }
    if (died) break;
  }

  if (died) {
    broke++;
    console.log('  THE INSTRUMENT DID NOT SURVIVE THIS RUN.');
    console.log('  ' + died);
    console.log('  An instrument that ran on one side and died on the other is the loudest');
    console.log('  result this tool produces. Nothing below it is trustworthy.\n');
    continue;
  }

  // Fold the runs on each side into mean and spread per metric.
  const fold = (runsArr) => {
    const keys = new Set();
    runsArr.forEach(m => m.forEach((_, k) => keys.add(k)));
    const out = new Map();
    for (const k of keys) {
      // A metric missing from SOME runs of one side is unstable by nature —
      // record how often it appeared so a partial is not read as a solid zero.
      const present = runsArr.filter(m => m.has(k));
      const width = Math.max(...present.map(m => m.get(k).length));
      const cols = [];
      for (let i = 0; i < width; i++) {
        const vals = present.map(m => m.get(k)[i]).filter(v => typeof v === 'number' && !isNaN(v));
        cols.push({ mean: vals.length ? mean(vals) : NaN, spread: spread(vals) });
      }
      out.set(k, { cols, seen: present.length, of: runsArr.length });
    }
    return out;
  };

  const B = fold(sides.before), A = fold(sides.after);
  const moved = [], gone = [], arrived = [];

  for (const [k, b] of B) {
    if (!A.has(k)) { gone.push(k); continue; }
    const a = A.get(k);
    const lines = [];
    for (let i = 0; i < Math.min(b.cols.length, a.cols.length); i++) {
      const bc = b.cols[i], ac = a.cols[i];
      if (isNaN(bc.mean) || isNaN(ac.mean)) continue;
      const delta = ac.mean - bc.mean;
      // The bar a change has to clear: the run-to-run wobble of BOTH sides. With
      // one run per side that wobble is unknown and the bar is zero, which is
      // why the header says so out loud rather than pretending to significance.
      const noise = bc.spread + ac.spread;
      if (Math.abs(delta) <= noise) continue;
      lines.push('    ' + ('#' + (i + 1)).padEnd(4)
        + 'before ' + fmt(bc.mean).padStart(9) + (bc.spread ? ' ±' + fmt(bc.spread) : '')
        + '   after ' + fmt(ac.mean).padStart(9) + (ac.spread ? ' ±' + fmt(ac.spread) : '')
        + '   delta ' + (delta > 0 ? '+' : '') + fmt(delta));
    }
    if (lines.length) moved.push({ k, lines, b, a }); else totalSteady++;
  }
  for (const k of A.keys()) if (!B.has(k)) arrived.push(k);

  totalMoved += moved.length;

  if (!moved.length && !gone.length && !arrived.length) {
    console.log('  nothing moved (' + B.size + ' numbers compared)\n');
    continue;
  }
  for (const m of moved) {
    console.log('  MOVED  ' + m.k);
    m.lines.forEach(l => console.log(l));
  }
  // A line that stopped being printed, or started, is a real difference the
  // number-diff cannot see — it usually means a branch is now taken that was
  // not, which is exactly the kind of thing worth being told about.
  if (gone.length) {
    console.log('  NO LONGER PRINTED (' + gone.length + '):');
    gone.slice(0, 8).forEach(k => console.log('    - ' + k));
    if (gone.length > 8) console.log('    ...and ' + (gone.length - 8) + ' more');
  }
  if (arrived.length) {
    console.log('  NEWLY PRINTED (' + arrived.length + '):');
    arrived.slice(0, 8).forEach(k => console.log('    + ' + k));
    if (arrived.length > 8) console.log('    ...and ' + (arrived.length - 8) + ' more');
  }
  console.log('');
}

//--- THE VERDICT, WHICH IS NOT A VERDICT ------------------------------------
console.log('---');
console.log(totalMoved + ' number(s) moved beyond their noise; ' + totalSteady + ' held still.');
if (broke) console.log(broke + ' INSTRUMENT(S) DIED ON ONE SIDE — read those first.');
console.log('Nothing here is a pass or a fail. Read each moved line and say, out loud,');
console.log('whether you meant it. The ones you did not mean are the reason this exists.');
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
process.exit(broke ? 1 : 0);
