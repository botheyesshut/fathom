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
const { spawnSync } = require('child_process');
const path = require('path');
const suites = ['flip', 'save', 'creature', 'cargo', 'ping', 'interior', 'items'];
let failed = 0;
for (const s of suites) {
  const file = path.join(__dirname, s + '.test.js');
  process.stdout.write('\n========== ' + s + ' ==========\n');
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit', timeout: 600000 });
  if (r.status !== 0) failed++;
}
console.log('\n' + (failed === 0 ? 'BATTERY: ALL SUITES PASSED' : 'BATTERY: ' + failed + ' SUITE(S) FAILED'));
process.exit(failed === 0 ? 0 : 1);
