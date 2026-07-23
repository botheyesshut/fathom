# FATHOM — START HERE (last updated 2026-07-20)

**Read this file first, then `memory/roadmap_vision.md` + `memory/project_fathom.md`. That is the whole handoff — no chat history required.**

**What Fathom is:** single-file HTML game (`fathom-chart.html`, ~4300 lines, no deps, no build step). Sub *Erebus* explores an infinite undersea cave world. Mobile-first (Sean tests on Android Chrome). Live at https://botheyesshut.github.io/fathom/fathom-chart.html — pushes auto-deploy in ~1-2 min. Deliver builds to Sean via SendUserFile.

**Setting:** post-apocalyptic × Lovecraft. Scarcity is the aesthetic; violence is usually the wrong answer; the best gear is often protective. Prose is spare and nautical.

**State (all shipped, verified, pushed):** infinite deterministic world (pure fn of seed) · voxel cell model (no columns) · save/resume (seed + overlay) · creatures (drifter/lurker/eel/rival, sound-driven) · economy (salvage→crates→bank→yard/outfitter, relics→vault) · 3-boat ladder · expeditions & cavern beaches · named crew with XP/roles · equipment (scrap + relic-work tiers, hazards, wounds) · synthesized audio · death ruling (lose the boat & all aboard, keep the campaign).

**BEFORE SHIPPING ANYTHING: `node tests/run-all.js` — ship only on ALL SUITES PASSED.** Doctrine + harness traps documented below.

**THE BOTTLENECK IS PLAYTESTING, NOT BUILDING.** ~25 tuning knobs are set to Fable's guesses and have never been felt by a human. Sean's verdicts gate the tuning pass. Do not invent scope to feel busy.

**Awaiting Sean's ruling:** (1) can expeditions KILL crew, not just wound? (2) NERVE/sanity as a third crew stat (Lovecraft pressure meter)? (3) weapons at boat scale — torpedoes/countermeasures?

**Biggest remaining builds:** cell-delta overlay → claim-a-beach bases (also the multiplayer sync mechanism) → on-foot dungeon mode via the resolution ladder.

**Git:** account pinned repo-locally (`credential.https://github.com.username=botheyesshut`) — undo with `git config --local --unset credential.https://github.com.username`. If a push ever hangs, it's the credential picker: `git config --global credential.guiPrompt false` turns the hang into an instant error.

---

# Standing orders (from the Fable sessions, 2026-07-19/20)
Design rulings + build queue. Successor models: execute, don't re-litigate. Sean arbitrates by playtest.

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
6. ~~Species #3~~ **DONE as the Eel** (cargo thief; flees to min-open-neighbor cells = first size-class behavior; sub not size-gated yet — that part still awaits playtest).

## EXPANSION ARC (final Fable stretch, commits 45df47b→HEAD — all battery-gated)
- **Outfitter**: SUBS erebus(t0)/charon(t1, 20cr, safe2400)/nyx(t2, 60cr, safe6000); port offers next affordable tier, second Surface-press within 45s buys; subKey saved. New knobs: prices, stats.
- **Ballast roar**: fast vertical (>diveStep) → noiseMade loudness 2. Silence is a speed.
- **Eel** (0.22/chunk): smells cargo ≤8 hexes, 2 moves/turn, steals adjacent, flees toward tight water 12 turns then gone with crate; corner it to recover; doesn't block the boat (dodges). Glyph '~' #c8b040.
- **Expeditions**: ruins (floor-gated) + signals → dive team 4-6 turns, events/turn (35% crate, 10-20% relic — signals richer, 15% hull scrape, 10% +8 air, else flavor); move off = recall w/ partial loot; site spent either way. Relics = new treasure (state.relics → relicsBanked at port vault). All saved.
NEW TUNING KNOBS for the playtest pass: sub prices/stats, eel rate + flee timer, expedition event table + turn count, relic chances.

## BESTIARY DESIGN (Sean 2026-07-20: each monster must force a DIFFERENT strategy; each individual varies within a species RANGE, like people). Existing: drifter(block), lurker(sound-hunt/interest AI), eel(cargo thief), rival(boat). New designs:
**STATUS: BESTIARY COMPLETE ✅** — all ten built & battery-verified: drifter, lurker (interest AI), eel, rival, shoalfang (trio/ring/pin), silt-lurcher (floor ambush, never leaves its slice), barotaur (deep-only, hard ceilingLimit), anglerlure (POI disguise; passive-sonar-immune; active ping reveals), chorus (rooted; false contacts + masks real ones within 8; draws hunters), tidehulk (slow heading, blocks passages, wake shoves the boat or slams it). Plus decoy buoy + Launch button. Pattern for any future creature: spawnCreature trait branch → tickX() → creatureTick dispatch → render colour+glyph(+font-size) → contact-line `what` → creature.test.js block → `node tests/run-all.js` → commit.
**NOTE for future creature work:** creature cells can be kind-promoted upward by later-generated neighbouring chunks (passage→chamber→sea→beach), so spawn-validity must accept all non-water open kinds; and any spawn helper must check cell KIND, not just existence (this bug put shoalfang schools in open shelf ocean).
1. **Shoalfang** (✅ BUILT): trio swarm, smallest (1-3 dmg each), moves as a wall to SURROUND the sub (claim its ring); full ring = PIN (extra dmg/held). Counter: keep moving so the ring never closes, depth-shift (they follow slowly), or DECOY BUOY (they mob it). Temperament: boldness (press vs hang back; timid ones SCATTER on loud noise).
2. **Anglerlure/Gloamlight**: disguises as a POI glyph (fake salvage/signal) until you're adjacent → hard strike. Counter: SONAR LITERACY — an active ping reveals the lure's "heartbeat" vs a real POI; verify before approaching. Temperament: patience holding the disguise.
3. **Barotaur/Pressure-wraith**: only in the deep bands; drawn to hull GROANS (past safe depth). The deeper/longer you linger, the harder it hunts — punishes greed. Counter: ascend to shake it (won't follow above a depth); don't dawdle deep. Temperament: how far up it chases.
4. **Silt-lurcher**: floor-bound ambusher; strikes when you linger near the floor (working salvage/ruins) — makes expeditions dangerous. Counter: don't loiter on the bottom; it can't leave the floor slice. Temperament: ambush trigger range.
5. **Chorus/Siren-polyp**: doesn't attack — EMITS false sonar contacts + phantom pings that draw OTHER predators and mask real ones (info warfare). Counter: distrust your sonar in its area; avoid or silence the source. Temperament: how loud/often.
6. **Tidehulk/Leviathan-calf**: rare, huge, near-unkillable; doesn't chase but its passing sweeps currents that shove the sub and its bulk blocks regions. Counter: read the water, avoid its path, ride its wake. Temperament: path predictability.
Per-individual variance pattern = lurker's traits (hash-seeded point within species range). DECOY BUOY + generic LAUNCH button (also future torpedoes/countermeasures) — Sean asked for the button.

## PREDATOR AI + COMBAT (2026-07-20, commit 39dc3e2 = interest AI DONE)
Lurkers: interest meter 0-100 (LURK_WARY 12 / STALK 38 / HUNT 68), per-beast traits cunning/tenacity/aggression (hash-seeded). noiseMade→interest spike (loudness×dist×aggression); proximity+live-sonar feed it; silence+distance bleed it. Behaviors: wary(circle/drift)→stalking(⅓ close/hold/drift)→hunting(depth-align,beeline,strike)→fleeing(lurkerFlee: cunning→egress=most-onward-routes cell, dumb→straight bolt; clears at dPlayer>14). SILENT RUNNING: pingPower()===0 → passiveRange()=0 (deaf+blind) but dec+=8 (lose the thread); sonar ON feeds interest. `state._huntAdvised` one-shot unarmed advisory. Old saves migrate awake→interest. tickLurker(c,dPlayer,silent); helpers lurkerStep/Drift/Wander/Flee/Strike.
**COMBAT (NEXT — designed, NOT built; triggers the fleeing state):** man-scale, uses GEAR atk/def already on crew. When a hunter is adjacent+same-slice and the boat is ARMED, offer a fight (reuse Surface-style one-button, or a new control): resolve atk vs beast toughness (hash-seeded HP/ferocity) with real random swing; outcomes: drive-off→c.fleeing=true (non-lethal, the intended trigger), kill (rare, relics/trophy?), or the strike lands on you (hull, crew wound via resolveHazard-style). Depth grenades = panic tool (AoE scare→flee). Wardsuit/armor cut incoming. Beast traits: aggression=harder to drive off, cunning=flees smarter. Keep the "violence is usually wrong" ethos — fighting is desperate, costly, sometimes wakes MORE. NERVE stat still a candidate (fear from being hunted/striking). V2 flourishes banked: beast species-flavor in contacts; multiple hunters coordinating; interest "memory" of where it last had you; lures/decoys (drop a noise-maker to mislead).

## LIVING OCEAN ARC (after the expansion arc — battery-gated)
- **Bearing off the sun**: surface() away from port logs direction + km to dock.
- **Band biomes**: creature type rolled from spawn DEPTH (<1200m eel/drifter-heavy; ≥2400m lurker 55%). Spawn refactor: 1-2 rolls × 55% per cave chunk.
- **Rival salvagers** ('rival' in state.creatures, 6%/chunk, glyph ⊘ #7090b8): seeks nearest unworked POI ≤15 hexes (world-scan every 6th turn), 3-turn work → site pushed to poisFound ("they got there first" within earshot), stands off if player ≤2, blocks like a big body, reads as "engine noise" on passive. NO combat, NO cargo of their own yet, and they don't emit into noiseMade (player-centric depth gate) — all three are deliberate v1 cuts.
- ~~audio~~ **DONE**: WebAudio synth module (tone/noiseBurst + SFX table, master 0.22, guarded no-op without AudioContext — battery doubles as the guard proof). 13 hooks: ping/impacts/ballast/groan/strike/theft/recover-bell/port-bells/relic-chimes/contact-pip. ♪ mute button top-right of chart (own localStorage key 'fathom-audio').
- ~~cavern beaches~~ **DONE**: 12% of chambers (r≥2.5) get kind 'beach' (5th priority tier) at the chamber-top center cell; sand fill #8a7448 at its slice; maybeBeach() on move/dive arrival: first landfall +50% air + 'beach' expedition (15% relics), revisits +25% air when tanks down ('beach:'+hexKey in poisFound). Proto-bases; the dungeon dream's first landfall.
- REMAINING CANDIDATES: rival boats that CARRY + bank cargo; torpedo/countermeasure design (Sean input REQUIRED); currents in tunnels; beach → on-foot dungeon zoom (the resolution ladder, design-heavy).

## CREW / DUNGEON / BASE — Sean's X-COM+D&D vision, compatibility verdict (2026-07-19)
All COMPATIBLE — the architecture anticipated each:
1. **Crew (names/XP/skills)** = pure overlay (state.crew, saved additively). Skills wire into EXISTING dials: diver→expedition yields/risk, sonarman→passiveContactR, engineer→yard effectiveness, helmsman→air costs. Expeditions are already crew-shaped ("two divers go over the side"). Sub tiers give crewCap naturally. XP from expeditions/events. V1 BUILT this session (see below).
2. **On-foot D&D dungeon on disembark** = the resolution ladder (60→12→6→2→1m integer nesting, in memory since design week). Same voxel model at finer scale, anchored under beaches/cave mouths (beaches just landed as entries), deterministic sub-seed per site = hash(siteKey), lazy fine-cell gen, SAME epistemic constitution on foot (lamplight radius), same test-battery pattern. Biggest single build remaining; expeditions are its abstract placeholder.
3. **Home base from rooms, upgrade/maintain/defend vs players + NPCs** = the substrate/overlay split's destiny: player construction = cell-DELTA overlay on the substrate (the exact mechanism multiplayer sync needs anyway — building bases FORCES the delta layer, which is on the critical path regardless). Async raids fit the turn-based model (TW2002 citadels). NPC raids = creature system extension. Maintenance = the crates/relics sink.
**ONE REAL TENSION Sean must ratify**: death currently wipes the ENTIRE save (roguelike) vs persistent crew/base investment. X-COM/TW answer: boat loss ≠ campaign loss — lose the boat + everything ABOARD (crew included), keep base/banked/vault, new Erebus at the dock. Recommended, NOT yet implemented.
**Build order**: crew v1 ✓ → boat-loss ruling ✓ (RATIFIED + BUILT: sea keeps aboard, port keeps bank, same sea, "Take another boat") → equipment v1 (below) → cell-delta overlay + claim-a-beach base v1 → resolution-ladder on-foot mode.

## EQUIPMENT & COMBAT DESIGN (Sean's setting ruling: post-apocalyptic × Lovecraft)
**Setting law**: scarcity is the aesthetic. Weapons are salvage-era improvisation (pneumatic spearguns, boarding axes, wax-sealed flechette pistols) or half-understood pre-Fall relic-work. Violence is usually the WRONG answer to the deep's things — the best gear is often protective/utility (lamps, salt-iron, wards). Combat should feel desperate, not empowering; this extends the existing grammar (silence is armor, sonar is a decision).
**Architecture**:
- Gear = overlay items in crew slots: member.gear = {weapon, armor, kit}. One GEAR data table (like SUBS/TILES). Stats ABSTRACT (attack/protect/utility numbers) so the same items work at expedition auto-resolve NOW and per-tile D&D combat LATER (on-foot mode reads the same sheet).
- Two currencies two tiers: scrap gear costs crates; RELIC-WORK gear costs relics (relics finally spend — the collectors trade, not just pay). Strange relic gear = Lovecraft flavor channel.
- Scale separation (the meter discipline): crew gear acts at MAN scale (expeditions, later dungeons) — never soaks boat-scale hits (lurker strikes stay hull business).
- Where it acts v1: a new expedition HAZARD event ("something in the dark below") resolved by team attack+protect score: armed teams drive it off (+xp, sometimes loot); unarmed teams take WOUNDS (member.wounded — skips xp/effects until healed at port). Crew DEATH in expeditions = a lethality ruling for Sean later (X-COM says yes eventually).
- Consumables in the kit slot with charges: first-aid (clear a wound mid-dive), grenade (auto-win one hazard, consumed). Table-driven so "other fun things emerge" = add rows (lamps: +crate find; salt-iron ward: hazard chance down; sounding charge: reveal on foot...).
- Armory at the dock: one-button offer flow (precedence: outfit > hire > armory). Maintenance/degradation = later crates sink.
- CANDIDATE (not ruled): NERVE/sanity as a third crew stat — Lovecraft pressure meter fed by hazards/relics/the deep bands; spent by wards/leave at port. Flag for Sean.

## PUSH STATUS (end of second Fable marathon): check `git log origin/main..HEAD` — network flaked repeatedly; retry loops were running. Everything is committed locally; Sean holds the definitive build via SendUserFile.

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
