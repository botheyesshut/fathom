# FATHOM — standing orders from the Fable session (2026-07-19)
Fable's design rulings + build queue. Successor models: execute, don't re-litigate. Sean arbitrates by playtest.

## RULINGS on the audit's open questions (enact these)
1. **Seafloor POIs from the sunlit surface**: kelp stays visible at any depth (it climbs the water column). Salvage/wreckage glyphs are HIDDEN in the sunlit regime unless the hex is revealed at a depth within 180m of the POI's resting depth (tile.floor) or ping-revealed — the bottom keeps its secrets; sonar and diving earn them.
2. **Collection depth**: salvage/air pickup requires currentDepth within 60m of the hex floor (salvage) — replaces the accidental "any depth ≥200m" rule. Air pockets: within 60m of the pocket's cell depth. You dive TO the prize.
3. **Sound envelopes**: name them — `PASSIVE_CONTACT_R = passiveRange()+2`, `WAKE_NOTICE_R = passiveRange()+6` — one comment block explaining coarseness-scales-with-range. Delete identifyPoi's dead depthHint branch.

## BUILD QUEUE (updated end of Fable session — 2,3,4 DONE)
1. **Tuning pass from Sean's playtest verdicts** — knobs: CAVE_BANDS.density, Z_TUNNEL_CHANCE 0.15, SINKHOLE_CHANCE 0.35, creature rates 0.30/0.35, lurker dmg 5-10, glyphs ⊙/⊗ (fallback ASCII 'O'/'X' if Android fails), CAVE_POI_CHANCE 0.40 + SHELF_KELP/SALVAGE_ROLL (new POI density ~4.5/chunk, was ~2.5 — may want trimming), DOCK_PRICES.hullPerCrate 25.
2. ~~Player → entities[0]~~ **DONE** (accessor seam; state.q/r/currentDepth alias entities[0]; zero call-site + zero save churn; full battery proof).
3. ~~Economy: first spend~~ **DONE** (the yard — banked crates buy hull at DOCK_PRICES; exact-change spending).
4. ~~Deterministic POIs~~ **DONE** (chamber POIs hash-rolled in carveChamber core with hex-hashed TYPE; shelf features hash-of-hex gated on cells at depth 0; flip harness now asserts FULL substrate order-independence incl. POIs — 0 mismatches. Tunnels intentionally empty: chambers are destinations).
5. **Chunk eviction/compaction** — only when long-session memory becomes real.
6. **Species #3** — a thin thing that slips through 1-hex squeezes the sub can't enter (first size-class gameplay).

## VERIFICATION DOCTRINE (non-negotiable, it caught every bug this session)
**The battery lives in the repo: `node tests/run-all.js` — run it before shipping ANY substrate/movement/creature/economy/persistence change; ship only on ALL SUITES PASSED.** Pattern notes for extending it:
- Extract <script>, run in vm context with Proxy DOM stubs. **Stub firstChild/lastChild/nextSibling/parentNode as null** or render()'s while-loop hangs forever.
- Inject `__reset(seed)` clearing: world, cells, generatedChunks, revealed, visited, nodeCache, edgeCache, carvedFeatures, spawnedChunks.
- Substrate changes: prove order-independence (same chunks, 2 orders, byte-equal cells) + determinism (fresh loads). Compare only mutually-interior chunks (3x3 complete in both) — frontier cells legitimately differ.
- Overlay changes: save→reload round trip in two contexts sharing a memStorage.
- Ship only on ALL PASS. Syntax-check alone suffices only for strict gate-narrowings.

## LAWS (violate none)
- The chart shows only what the boat could know (lights ≤1 / revealed / ping rays incl. struck faces / passive / sunlit surface-connected ≤300m).
- The meter is the invariant; grids nest in integer divisors of 60 down to 1m.
- Substrate = pure fn(seed); overlay = everything players change. Never store the world.
- Never sell power (when monetization comes). Seasons, cosmetics, access.
- Single file, no deps, ASCII-safe-ish glyphs, Android Chrome first.
- Push hangs? http.postBuffer 524288000 + http.version HTTP/1.1 (already set in this repo).
