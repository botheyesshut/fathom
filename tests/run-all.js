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
//   interior.test — the resolution ladder: deck determinism, hull integrity,
//                   FULL reachability from the entry, loot taken once, reload
//                   mid-dive, and the helm locked out while ashore
//   station.test  — a station is a PLACE and a place has a KIND: the round trip
//                   out and back lands on the deck you claimed, one anchor
//                   claims one deck, and the boat has to be able to reach it
const { spawnSync } = require('child_process');
const path = require('path');
//   links.test    — a link between grotto chambers is a STEP: it costs air, it
//                   does not heal the tenant, the hands come with you, and the
//                   deck keeps its own dead
//   migrate.test  — an older save is still somebody's campaign: deck records
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
//   orders.test   — the tutorial thread: seven lines in order, the next only
//                   when the last is actually DONE, never repeated, never stale
//                   for a captain who wandered off and did it early, and the
//                   switch in Options silences the lot
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
const suites = ['flip', 'save', 'creature', 'cargo', 'ping', 'interior', 'station', 'links', 'migrate', 'items', 'board', 'works', 'locks', 'orders', 'mate', 'greed', 'crew'];
// THE RUNNER MUST SAY WHICH ONE AND WHY. It used to count failures and print
// only the count, so "BATTERY: 1 SUITE(S) FAILED" meant a hunt through fourteen
// suites to find out what had gone wrong — and twice it was not a failing check
// at all but the spawn itself dying under load, which the count could not
// distinguish from a real bug. A gate that cannot tell you what it caught is
// most of the way to no gate.
let failed = 0;
const bad = [];
for (const s of suites) {
  const file = path.join(__dirname, s + '.test.js');
  process.stdout.write('\n========== ' + s + ' ==========\n');
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit', timeout: 900000 });
  if (r.status === 0) continue;
  failed++;
  // Three different things wear the same exit code. Name them apart.
  const why = r.error ? 'could not spawn: ' + r.error.message
            : r.signal ? 'killed by ' + r.signal + (r.signal === 'SIGTERM' ? ' — this is the 15-minute timeout, not a failed check' : '')
            : 'exit status ' + r.status + ' — a check failed; scroll up to the FAIL line in this suite';
  bad.push(s + ' (' + why + ')');
}
if (failed === 0) console.log('\nBATTERY: ALL SUITES PASSED');
else {
  console.log('\nBATTERY: ' + failed + ' SUITE(S) FAILED');
  for (const b of bad) console.log('  - ' + b);
}
process.exit(failed === 0 ? 0 : 1);
