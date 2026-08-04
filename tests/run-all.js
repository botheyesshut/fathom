// Fathom verification battery — run before shipping ANY substrate, movement,
// creature, economy, or persistence change:  node tests/run-all.js
// Doctrine: ship only on ALL PASS (see FATHOM_NEXT.md).
//   flip.test     — substrate: chunk-order independence, determinism (incl.
//                   POIs), dock connectivity BFS, far-field caves, perf
//   save.test     — persistence: seed+overlay round trip, death/restart clears
//   creature.test — spawns in open cave cells, sound-wake, hunt+strike,
//                   blocking, 60-tick stone-violation sweep, save v2/v1
//   cargo.test    — dive-to-the-prize collection, port banking, the yard
//   ping.test     — soundColumn: sonar is not X-ray
//   interior.test — the resolution ladder: interior determinism, hull integrity,
//                   FULL reachability from the entry, loot taken once, reload
//                   mid-dive, and the helm locked out while ashore
//   station.test  — a station is a PLACE and a place has a KIND: the round trip
//                   out and back lands on the place you claimed, one anchor
//                   claims one place, and the boat has to be able to reach it
const { spawnSync } = require('child_process');
const path = require('path');
//   links.test    — a link between grotto chambers is a STEP: it costs air, it
//                   does not heal the tenant, the hands come with you, and the
//                   chamber keeps its own dead
//   migrate.test  — an older save is still somebody's campaign: interior records
//                   rekeyed by kind, and a station that predates knowing what
//                   kind of place it is
//   crew.test     — the roster: no trade is named for a sex and none of them
//                   took the bland way out; an old save's sonarman becomes the
//                   Ear and its engineer the Wrench without losing the dials
//                   they turn; a new captain sails with two hands and an empty
//                   berth, so the Hiring Hall is not dead on arrival
//   greed.test    — the exploits, and that they stay shut: an errand never pays
//                   more than buying the item costs, a wreck is salvaged once,
//                   and attacking a ship spends a turn. Every one of these was
//                   introduced by adding a feature without asking what it cost
//   mate.test     — the First Mate reports a change in your situation, in a
//                   named person's voice — and NEVER adds a line, because the
//                   log being unreadable is a thing Sean has already told me
//                   once. Checks the same event is one line with or without a
//                   mate, and that every call site is a decision (sail, hull
//                   strike, air) rather than ambient prose
//   orders.test   — the tutorial: ten dismissible cards, each fired the first
//                   time a captain is somewhere that asks a new question of
//                   them. Situation-triggered rather than sequenced, so doing
//                   things out of order never loses you the rest. Checks every
//                   card is REACHABLE, that none repeats, and that the switch
//                   in Options silences the lot
//   locks.test    — the first lock in the game: hatchkey and bonekey were
//                   `kind: 'key'` and nothing in the world had a keyhole. Checks
//                   they open something, that opening SPENDS them, and that a
//                   door stays open across surfacing — the interior regenerates
//                   deterministically, so only the overlay remembers
//   works.test    — a station holds because of what is BOLTED to it, never who
//                   is standing in it: two approaches (the lock and the workings
//                   behind), digging as a bargain rather than a bonus, and an
//                   old save's defence rung becoming the works it paid for
//   board.test    — the harbour board: there IS work at turn one, it can be
//                   taken, it marks the chart, reaching the mark finishes it,
//                   the quay pays, and the rating rises. Driven through
//                   portRows/portBuy rather than by calling the functions, so
//                   it proves a captain can reach all of that and not merely
//                   that the functions run. This is the early game now; if it
//                   breaks there is nothing to do in the first hour.
//   delve         — THE ON-FOOT LAYER, WHICH NOTHING ELSE HERE WALKS. The sea
//                   bot in playtest.js reaches an interior in 3% of its runs, so
//                   tenants, wounds, nerve and bodies were covered by three runs
//                   in a hundred. This walks 60 interiors directly and asserts, every
//                   step, that nothing impossible happened — including that
//                   `inflictCondition` and `frayNerve` never re-enter themselves,
//                   which is the one check that reliably catches the recursion
//                   that shipped on 2026-08-04. Verified both ways: silent on the
//                   sound build, red on a scratch build with the bug replanted.
const suites = ['flip', 'save', 'creature', 'cargo', 'ping', 'interior', 'station', 'links', 'migrate', 'items', 'board', 'works', 'locks', 'orders', 'mate', 'greed', 'crew', 'delve'];
// THE RUNNER MUST SAY WHICH ONE AND WHY. It used to count failures and print
// only the count, so "BATTERY: 1 SUITE(S) FAILED" meant a hunt through fourteen
// suites to find out what had gone wrong — and twice it was not a failing check
// at all but the spawn itself dying under load, which the count could not
// distinguish from a real bug. A gate that cannot tell you what it caught is
// most of the way to no gate.
// ...AND "EXIT 1" IS STILL TWO DIFFERENT THINGS.
//
// The paragraph above was written after the runner mistook a dying spawn for a
// failed check. It caught the two loud cases — no spawn, and a signal — and
// then called EVERY remaining nonzero exit "a check failed", which is exactly
// the old mistake in a quieter costume: a suite that runs out of memory or
// throws on the way up also exits 1, and on Windows it does it with a status
// and no signal. Three battery runs over one unchanged file failed `items`,
// then `cargo`, then nothing; all four of those suites passed 8/8 standalone.
// The runner was reporting a verdict it had no way to have reached, because
// `stdio: 'inherit'` meant it never saw a word the child said.
//
// So: capture the output, print it (same as before, from here instead of the
// child), and let the CHILD'S OWN FAIL LINE decide which of the two it was. A
// suite that exits nonzero without printing one did not fail a check — it died,
// and saying so is the difference between "you broke the game" and "re-run it".
// EITHER NAMING, AND SAY SO WHEN NEITHER EXISTS. This appended '.test.js'
// unconditionally, so adding `delve.js` to the list above spawned a path that
// has never existed — and the classifier below, which was written precisely to
// tell a failed check from a dying suite, called a MISSING FILE "it died on the
// way. Usually memory, seventeen VMs deep." A third thing wearing the same exit
// code, and a confidently wrong diagnosis of it. Resolve both conventions, and
// when neither is there, say that instead of guessing.
const fs = require('fs');
let failed = 0;
const bad = [];
for (const s of suites) {
  const cands = [path.join(__dirname, s + '.test.js'), path.join(__dirname, s + '.js')];
  const file = cands.find(f => fs.existsSync(f));
  process.stdout.write('\n========== ' + s + ' ==========\n');
  if (!file) {
    failed++;
    bad.push(s + ' (NO SUCH FILE — looked for ' + s + '.test.js and ' + s + '.js)');
    process.stdout.write('  no such suite: neither ' + s + '.test.js nor ' + s + '.js exists\n');
    continue;
  }
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out);
  if (r.status === 0) continue;
  failed++;
  const fails = out.split('\n').filter(l => /\bFAIL\b/.test(l));
  const why = r.error ? 'could not spawn: ' + r.error.message
            : r.signal ? 'killed by ' + r.signal + (r.signal === 'SIGTERM' ? ' — this is the 15-minute timeout, not a failed check' : '')
            : fails.length ? fails.length + ' check(s) failed — first: ' + fails[0].trim()
            : 'exit ' + r.status + ' WITHOUT REPORTING A VERDICT — it did not fail a check, it died on the'
              + ' way. Usually memory, seventeen VMs deep. Re-run this suite alone before believing it:'
              + ' node ' + path.relative(process.cwd(), file).replace(/\\/g, '/');
  bad.push(s + ' (' + why + ')');
}
if (failed === 0) console.log('\nBATTERY: ALL SUITES PASSED');
else {
  console.log('\nBATTERY: ' + failed + ' SUITE(S) FAILED');
  for (const b of bad) console.log('  - ' + b);
}
process.exit(failed === 0 ? 0 : 1);
