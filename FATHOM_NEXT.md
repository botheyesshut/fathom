# FATHOM — START HERE (last updated 2026-07-20)

**Read this file first, then `memory/roadmap_vision.md` + `memory/project_fathom.md`. That is the whole handoff — no chat history required.**

**What Fathom is:** single-file HTML game (`fathom-chart.html`, ~4300 lines, no deps, no build step). Sub *Erebus* explores an infinite undersea cave world. Mobile-first (Sean tests on Android Chrome). Live at https://botheyesshut.github.io/fathom/fathom-chart.html — pushes auto-deploy in ~1-2 min. Deliver builds to Sean via SendUserFile.

**Setting:** post-apocalyptic × Lovecraft. Scarcity is the aesthetic; violence is usually the wrong answer; the best gear is often protective. Prose is spare and nautical.

**State (all shipped, verified, pushed):** infinite deterministic world (pure fn of seed) · voxel cell model (no columns) · save/resume (seed + overlay) · creatures (drifter/lurker/eel/rival, sound-driven) · economy (salvage→crates→bank→yard/outfitter, relics→vault) · 3-boat ladder · expeditions & cavern beaches · named crew with XP/roles · equipment (scrap + relic-work tiers, hazards, wounds) · synthesized audio · death ruling (lose the boat & all aboard, keep the campaign).

**BEFORE SHIPPING ANYTHING: `node tests/run-all.js` — ship only on ALL SUITES PASSED.** Doctrine + harness traps documented below.

**THE BOTTLENECK IS PLAYTESTING, NOT BUILDING.** ~25 tuning knobs are set to Fable's guesses and have never been felt by a human. Sean's verdicts gate the tuning pass. Do not invent scope to feel busy.

## THE WATER, DESCRIBED (2026-07-24) — Sean's "more English" ask, and the air fix
**Sean died of asphyxiation because nothing ever told him where air comes from.** That is a teaching failure, not a tuning one. Ruling taken: **no scripted tutorial yet** (it would go stale every stage); instead the game teaches diegetically, out of world state, which does not rot.
- `describeSpace(mode)` builds Infocom-style room prose from REAL voxel geometry — `spaceAround()` counts open neighbours at this depth, sounds the column up and down, and checks what the chart knows. `spaceClass()` names it: surface / shaft / tunnel / junction / expanse / deadend / nook / pocket.
- **Constitution holds at prose level**: what is known is stated, what is not is HEDGED (`HEDGE[]`, fired only when ≥2 open ways are uncharted, and only 35% of the time — said every time it stops meaning anything). Known-ness is counted over OPEN neighbours only; counting it over all six made the boat hedge about walls.
- `mode:'first'` is **hash-stable per place** so the world feels solid; `'again'` is loose so a second LOOK finds new words. Full description on first arrival, 40% on re-entry, 55% on depth change.
- **`#btn-look`** — free LOOK action. Ashore it calls `describeDeck()` instead (open sides, how close the water is, whether the tenant is near).
- **`airCounsel()`** — four rungs (50/30/15/7%), each fires once, each says what to DO ("the tanks refill three ways: at the surface, at trapped gas pockets, and on cavern beaches"), and the ladder re-arms after a refill. Verified firing in order and re-arming.
- **TRAP**: a "dead end" was being reported with open water above and below it — `spaceClass` must treat any vertical opening as a way on. That was a logic bug the prose exposed; read generated text as WRITING, not just as code that runs. `scratchpad/prose-sample.js` dumps a wide sample for exactly this.
- **Still wanted**: descriptions for walls when you strike them, weather/current, more depth-band moods, interior room prose per room type.

**Awaiting Sean's ruling:** (1) can expeditions KILL crew, not just wound? (2) NERVE/sanity as a third crew stat (Lovecraft pressure meter)? (3) weapons at boat scale — torpedoes/countermeasures?

**Biggest remaining builds:** the RESOLUTION LADDER — see the spec immediately below. Sean ratified its four forks on 2026-07-24; it supersedes the ordering in "CREW / DUNGEON / BASE" (on-foot now comes BEFORE base-building, because you must be able to walk a base before you can defend one).

**Git:** account pinned repo-locally (`credential.https://github.com.username=botheyesshut`) — undo with `git config --local --unset credential.https://github.com.username`. If a push ever hangs, it's the credential picker: `git config --global credential.guiPrompt false` turns the hang into an instant error.

---

# THE RESOLUTION LADDER — on-foot mode & bases (SPEC, ratified by Sean 2026-07-24)

**Why it comes before base-building:** Sean wants to walk his base room to room, because invasions happen *inside* it. You cannot defend a place you cannot stand in. So on-foot is the prerequisite, not the sequel.

## The four ratified forks (do not re-litigate)
1. **Interior grid = SQUARE.** Hex outside (open water, free movement), square inside (built space: corridors, bulkheads, doors). Hexes do not nest cleanly; built space is rectilinear; and the grid change itself tells the player which mode they are in.
2. **First on-foot content = the ruin expedition.** `startExpedition()` is already an abstraction of exactly this ("two divers go over the side"). Stage 1 makes it literal — the divers stop being dice and become you. Beach/signal expeditions keep the abstract path for now.
3. **Flooding is the keystone, from Stage 2.** Not a late polish layer — interiors must be designed around it from day one.
4. **Architecture set here, content stages handoff-friendly.** Stage 1 fixes coordinates, view switch, and save schema; later stages inherit them.

## Architecture
- **Two grids, one world.** Coarse: hex `q,r` + depth `d`, 60m cells, `absent = stone`. Fine: a coarse cell may hold an **interior chunk** — a local square grid, **3m tiles, 20×20 per deck**. `60/3 = 20`, so this obeys the standing law *"grids nest in integer divisors of 60"*.
- **Same law, one level down.** `interiors: Map<"q,r,d", chunk>`, `chunk.tiles: Map<"x,y", tile>`, **absent = solid rock/hull**. Sparse; exists only where something is carved or built. This is deliberately the same idiom as `cells` so the mental model transfers.
- **Substrate/overlay split preserved.** Generated interiors (wrecks, ruins) are pure fn(seed) — regenerated, NEVER saved. Player carving, furniture, and what they looted are overlay — saved. The multiplayer seam survives intact for free.
- **Epistemic law extends downward.** On foot you see by **lamplight radius** plus what you have already walked. The chart still shows only what the body could know.

## The threshold (the lock)
You cannot step out at 3,000m. Transition happens at a **lock**: a wreck's air pocket, a ruin's sealed chamber, a cavern beach, or a base's moon pool. Two ways through, and they are the whole game in miniature:
- **The door** — open it. Needs a key, a cutter, or a charge. It is *loud* (feeds `noiseMade`).
- **The breach** — make a hole. Now it floods.

## Flooding (Stage 2 keystone)
An interior is dry space held against the sea; every wall is a dam. Breach a tile and water spreads along connected floor, falling deck to deck. **Bulkhead doors** seal sections — closing one saves the base and dooms whoever is on the wrong side. Defenders may deliberately flood a corridor; attackers may breach to flush defenders out. Air is the clock (reuse `state.air`); water is the pressure. One mechanic buys dungeon tension, fortress engineering, and the siege system at once — and it is the truest image in the setting: *the sea getting in.*

## The two-layer siege (Sean's amphibious assault, mapped)
| Layer | Grid | System |
|---|---|---|
| **Water assault** — approach through caves, beat nets/mines/baffles/turrets | Hex (coarse) | **Already shipped.** Defenses are new features + entities, not a new system. |
| **The threshold** — force the lock | — | New, small |
| **Boarding action** — room to room, cover, crew, floods | Square (fine) | New, the big lift |

## Discovery reuses the predator AI wholesale
A base has a **noise signature** (machinery, pumps, light). It is not on anyone's chart until found; your own pings and engines leak. Monsters find your base exactly as they already find your boat: `noiseMade()` → interest → beeline. No new AI. This yields the intended tension: **depth is both moat and magnet** — deep means few players can reach you, and it means the things down there can.

## Defense ladder (TW2002 shape)
Start with a **rusted grate** (lock rating 1) and a crew of one. Then: sonar baffles → nets → mines → hardened lock → turrets → bulkheads → pumps → traps → garrison.

## Digging (high-level unlock)
Carving a fine tile costs time, tools, and power, and **displaces water**. You dig into stone; breach into a flooded cell without a bulkhead behind you and you drown your own fortress. Multi-cell fortresses are chunks stitched at cell edges — the ceiling is unbounded, but **start single-cell** (400 tiles/deck is already a serious fortress).

## Build ladder — every stage ships playable
1. ~~**The Threshold**~~ **DONE 2026-07-24** — walk into a ruin. See "STAGE 1 AS BUILT" below.
2. ~~**Dark and Wet**~~ **DONE 2026-07-24** — flooding from the breach, bulkheads, a tenant. See "STAGE 2 AS BUILT".
3. ~~**Boarders**~~ **DONE 2026-07-24** — on-foot combat off the existing GEAR sheet. See "STAGE 3 AS BUILT". (Crew as bodies that can be LOST is still outstanding.)
4. ~~**The Claim**~~ **DONE 2026-07-24** — a station is a ruin you sealed. See "STAGE 4 AS BUILT". (Level-1 DEFENCES still outstanding — that is Stage 6's business.)
5. **Digging & Fitting** — carve, furnish, bulkheads, pumps, decks.
6. ~~**Siege**~~ **DONE 2026-07-24** — MOB invasion of a station. See "STAGE 6 AS BUILT". (PLAYER raids are Stage 7 / multiplayer.)
7. **Rivals** — player raids (multiplayer).

## STAGE 1 AS BUILT (all battery-gated; `interior.test.js` is the sixth suite)
- **Constants**: `INT_SIZE=20`, `INT_TILE_M=3`, `INT_PX=22` (draw size), `LAMP_R=4`, `FOOT_AIR=2`.
- **`interiorAt(q,r,d)`** — substrate, cached in `interiorCache` (cleared in restart AND resumeGame; it belongs to the seed). 4-6 rooms rejection-sampled, chained by L-corridors, entry breach hung off room 0. Rubble is PASSABLE by design (+1 air) — an impassable scatter could seal a corridor and strand loot.
- **`state.foot`** = `{q,r,d,x,y,crates,relics,steps,seen[],took[]}` or null. Overlay, saved, restored by resumeGame — a reload finds you still inside.
- **Loot never mutates the substrate.** `footLootAt()` consults `foot.took`, so a reload cannot resurrect a crate you already carried off. Copy this pattern for Stage 5 carving.
- **`render()` branches at the top** to `renderInterior()`, which re-declares its own `<defs>` (render() wipes the tree every frame — the vignette gradient must be re-created on this side of the ladder or it silently vanishes).
- **`ashore()`** guards move/changeDepth/ping/wait/fireWeapon/launchDecoy/surface. **TRAP FOUND THE HARD WAY:** leaving `state.foot` set at the end of a test cascades 10 failures through every port/economy check downstream, because `surface()` is guarded. Any test that enters an interior MUST leave it.
- **Ruins no longer call `startExpedition`** — its 'ruin' branch was deleted as dead. Beach/signal expeditions still use the abstract dice path.
- **Harness note**: interior.test needs the WHOLE script to boot (restart/resumeGame/doSave are at the very bottom), so its sandbox must supply real no-op `addEventListener`/`location`/`matchMedia`. The other suites let that throw and get away with it because they only need early functions.
- **Verified in a real browser** (not just stubs): 22-tile lamp pool, `@`, breach glyph, vignette, a real tap walking a step, loot picked up once, and the mode switch back to the hex chart.
- **KNOBS SEAN HAS NOT FELT YET** (do not pre-tune): `LAMP_R`, `FOOT_AIR`, rubble rate 0.07, loot density, relic odds 0.22, room count/size. Deck legibility at the memory-dim end is the most likely first complaint.

## STAGE 2 AS BUILT — Dark and Wet (2026-07-24)
**The central idea: the sea comes in the way YOU did.** `foot.water` is seeded with the entry breach, so the flood source is always between the captain and the way out. Go deeper for better loot, and the water is behind you the whole time.
- `FLOOD_EVERY=2` steps per advance; `floodAdvance()` spreads orthogonally through carved tiles only. A full deck goes under in ~25 advances (~50 steps) — that is the clock.
- Wading costs `FOOT_AIR*3`. Rubble still +1.
- **Bulkheads**: generated only in *throats* (a corridor tile open on two opposite sides, walled on the others) — a door in the middle of a room seals nothing. Max 3 per deck. `foot.closed` is overlay. A dogged bulkhead stops the flood, stops the body, and stops the tenant, and cuts off everything beyond it — including, if you are careless, your own exit.
- **`sealDoor()`** on `#btn-seal` (shown only while ashore, via `syncFootControls()` called from `render()`): toggles the adjacent door. Refuses to seat a bulkhead that is already under water.
- **The tenant** (`chunk.dweller`, 55% of decks, spawns in the room farthest from the breach): hunts by proximity inside `DWELLER_EAR=9`, walks the same floor you do, blocked by dogged bulkheads. On contact it takes your air line (-40..70 air). **You cannot kill it at this stage — the answer is a door, not a weapon**, which is the setting's law made mechanical. Stage 3 adds the desperate option.
- Drawn under the same constitution: the tenant is visible only inside `LAMP_R`.
- Old saves are backfilled in `resumeGame()` (water/closed/tick/dweller) so a Stage 1 save still loads.
- **interior.test.js is now 33 checks.** The Stage 2 invariants: water never enters stone, a saturated deck leaves nothing dry, a dogged bulkhead never floods and passes neither body nor tenant, doors sit in throats, the tenant never walks through stone (120-step sweep), flood + seals round-trip through a reload.
- **KNOBS NOT YET FELT**: `FLOOD_EVERY`, wading multiplier ×3, `DWELLER_EAR`, dweller damage 40-70, dweller spawn rate 0.55, max 3 doors.

## STAGE 4 AS BUILT — The Claim (2026-07-24)
**Your station is a ruin you sealed against the sea.** Flooding is what made this design available: claiming converts the breach you came in by into a **lock**, the pumps put the water out, and the deck stays dry and yours.
- `state.base = {q, r, d, stores:{crates, relics}}` — **one only** for now. Overlay, saved, cleared by `restart()` (a new seed is a new ocean).
- `CLAIM_COST = 6` crates aboard. **Refused if the deck still has a tenant** — which is exactly what gives Stage 3's on-foot combat a job. Refused if you already hold a station.
- `isBaseDeck(q,r,d)` gates everything: `enterInterior` seeds no water and no dweller, `stepFoot` skips both `floodAdvance()` and `dwellerStep()`, `leaveInterior` sets the hex to the new `TILES.base` (`⌂`, poi colour `#6ecfae`) instead of consuming it to 'passage'.
- **Loot does not grow back**: entering a claimed deck prefills `foot.took` with every loot key in the chunk. Substrate still remembers where the crates were; the overlay says you already have them. Copy this for Stage 5 carving.
- `handleTile` opens the station **before** the first-visit gate, so you can come back forever. The depth must match — the hatch is where you cut it.
- **One button, three jobs** (`#btn-claim` via `claimOrStore()`, label set in `syncFootControls`): *Claim Deck* off-station, *Stow Goods* when carrying, *Draw Goods* when empty-handed. A phone has no room for three buttons.
- **THE ECONOMIC POINT**: stores are NOT aboard, so `endGame()` cannot take them. A station is the only place besides the far-off dock where a relic is safe. That is the whole reason to want one, and it is asserted in the battery.
- **interior.test.js is now 55 checks.** Stage 4 invariants: tenant blocks the claim, cost enforced, pumps clear the water, a station never floods across 60 steps, stow/draw round-trips, second station refused, re-entry dry with no loot regrowth, **stores survive `endGame()`**, and the station survives a reload.
- **UX fix found only in a live browser**: standing ON the lock there is no neighbour to tap to leave, so the tile underfoot becomes its own exit target. Headless tests could never have caught that.
- **KNOBS NOT YET FELT**: `CLAIM_COST`, one-station limit, whether stations should also refill air (they probably should — that is a strong candidate for the next pass).

## STAGE 3 AS BUILT — Boarders (2026-07-24)
Built on the EXISTING `GEAR`/`teamScore()` sheet — the comment at the top of GEAR said the stats were abstract so they could "resolve expedition hazards now and per-tile dungeon combat later". That was this. No parallel combat system was invented.
- **`TENANTS`** — four kinds, each with glyph, colour, toughness, damage range and three prose lines (`look` on first sight, `hurt` on breaking, `near` when it is close but unseen): **hollow** (Ω, 7), **whisper** (ʬ, 4, dims the lamp), **clutch** (ॐ, 14), **warden** (Ψ, 22). `tenantTough()` hash-varies each INDIVIDUAL ±25% — the bestiary's law, indoors.
- **`fightTenant()`** on `#btn-fight`, shown ONLY when the thing is within reach. Swing = `1 + randInt(atk*2)`; unarmed is `rand()<0.3 ? 1 : 0` and says so plainly ("the armoury at the dock sells boarding axes"). Armour (`teamScore().def`) soaks up to 60% of its answer — crew gear at MAN scale, per the standing law.
- **It answers every round you fail to finish it.** A clutch on an axe took 5 rounds and ~100 air in live play. Violence stays the expensive answer; a door is still cheaper.
- **`state.clearedDecks`** (overlay, saved) records driven-off tenants by `deckKey`. The substrate keeps generating the thing forever; this is the record that says you dealt with it. `enterInterior` consults it.
- **TRAP THE BATTERY CAUGHT**: `claimOrStore()` was checking `ch.dweller` (substrate) not `f.dweller` (live), so a deck you had just cleared still refused to be claimed — breaking the entire point of the stage. **Always ask the overlay, never the generator, about things the player has changed.**
- **TWO FAULTS ONLY A BROWSER FOUND**: `spec.name.replace(/^a /, 'It')` produced "**Itwhisper** has you in the dark" (now `theTenant()` → "The whisper"); and Ping/Fire/Launch Decoy sat in the control row while ashore doing nothing but scolding — now hidden by `syncFootControls`. **Read the rendered log, not just the test output.**
- **interior.test.js is now 66 checks.**
- **KNOBS NOT YET FELT**: tenant toughnesses, damage ranges, swing formula, armour cap 60%, spawn rate 0.55, whether a driven-off tenant should ever come BACK.

## STAGE 6 AS BUILT — The Siege (2026-07-24)
**Depth is a moat and a magnet both.** A station is discovered the same way the boat is — by NOISE — and deeper stations draw worse besiegers.
- `state.base` gains `defence` (index into `DEFENCES`), `threat` (0→100 accrual), `siege` ({power, breach} or null), `breached` (bool). All overlay, saved, backfilled in `resumeGame` for pre-siege saves.
- **`DEFENCES`** ladder (TW2002 shape): rusted grate(hold 1, free) → sonar baffles(3,4cr) → net barrage(6,8) → hardened lock(10,14) → shot-turret(16,22). `fortifyBase()` on `#btn-fortify` spends the STATION'S OWN stored crates, not aboard cargo.
- **Discovery is noise-driven**: `noiseMade()` adds to `base.threat` scaled by loudness and nearness to the lock — the DOMINANT term. A quiet captain is besieged rarely; pinging/fighting/ballasting near home invites it. Idle accrual (`baseTick`, +0.2 +depth/5000 per turn) is the slow floor. `baseTick()` is called from `move`/`changeDepth`/`wait`.
- **THE BESIEGER IS A REAL `state.creatures` ENTITY** (`spawnCreature` at the lock, `besieging:true`), depth-pooled (≥2400m → lurker/baro/hulk; shallower → lurker/silt/eel). So it can be seen, blocked, harpooned, decoyed — the siege only advances while something is actually AT the lock (`baseTick` finds `c.besieging && !c.gone`). **Kill it and the siege lifts. This is the player's whole agency here** — verified both branches in-browser.
- **Breach** (`breach≥100`): lose 60% stored crates / 50% relics, defence drops one (works wrecked), `breached=true`. `stationSecure()` (not `isBaseDeck`) now gates enterInterior/stepFoot flood-skip — **a forced station floods like any other ruin** until `repumpStation()` (4cr) reseats the lock. If the captain is standing in it when it goes, the sea comes down on them.
- **The four-way claim button**: Claim Deck / Stow Goods / Draw Goods / Repump Station, by context.
- **interior.test.js is now 82 checks.** Siege invariants: threat accrues to a siege, besieger is real and at the lock, breach advances only while it is there, killing it lifts the siege, defences measurably slow the breach, fortify spends station crates and is refused when it cannot pay, breach costs stores + a defence level + floods the deck, a breached station floods when walked, repump fixes it, all of it survives a reload.
- **KNOBS NOT YET FELT**: threat accrual rates, `noiseMade` base-term weight ×5, siege power `5+d/900`, breach rate `(power-hold)*0.8`, breach losses 60%/50%, `REPUMP_COST`, `DEFENCES` costs/holds.
- **NOT YET BUILT**: the besieger does not yet actually enter the interior and fight you room-to-room — a breach is resolved at the lock, abstractly. Making the besieger walk in and become an on-foot tenant is the natural next deepening (all the pieces exist: it is already a creature, the interior already hosts tenants).

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
**COMBAT — BUILDING NOW (Opus, 2026-07-23). Boat-scale armaments (creatures strike the HULL, so you fight them with sub weapons, NOT crew man-scale gear — crew gear stays for expeditions/dungeons).** Design:
- `state.armament` (null|'harpoon', PURCHASED at dock — keep early-game unarmed tension) + `state.torpedoes` (consumable count). Saved.
- New **Fire** button (controls row, enabled only when armed). fireWeapon(): harpoon at an ADJACENT same-slice hostile (reusable, free); else a torpedo at a hostile within 3 hexes / ±1 slice (consumed, heavy). Auto-picks nearest threat + appropriate weapon. Hostiles = all creature types EXCEPT rival (PvP later).
- Resolution: each creature gets hash-seeded `toughness`; a hit does weapon power ± random swing, accumulates on `c.dmgTaken`; when >= toughness → DRIVEN OFF (`c.fleeing=true`, the pre-wired state) or rarely killed. Per-creature reaction table (the soul — combat is different per monster): lurker→flees (cunning ones smart-egress), shoalfang→whole school SCATTERS (spooked), eel→bolts with loot, silt→recedes/digs in, baro→very tough, only torpedoes shift it, angler(revealed)→driven off, chorus→can be SILENCED/killed (cleans poisoned water), tidehulk→near-unkillable, shrugs (teaches: don't bother), drifter→driven off.
- **Firing is LOUD** (noiseMade ~4) — draws every hunter in earshot; torpedoes scarce. Violence stays desperate, not empowering ("usually the wrong answer" ethos).
- Provisional rulings (Sean can revisit): NO separate crew-death from creature combat (boat death via hull=0 is the stakes; crew still lost with the boat). Firing a harpoon is free but loud; torpedoes cost relics or crates at dock.
- Tests: fire drives off a lurker→fleeing; tidehulk shrugs; firing wakes nearby hunters (loud); purchase+save round trip. **DONE + battery-green.** Also pinned the creature suite to a FIXED seed (`__seed(20260723)`) so spawn-validity is deterministic — was Date.now-flaky. FUTURE: a multi-seed fuzz test would catch rare spawn edge cases the single pinned seed can't.
- (Original design notes below, for reference.)
**COMBAT (original notes — triggers the fleeing state):** man-scale, uses GEAR atk/def already on crew. When a hunter is adjacent+same-slice and the boat is ARMED, offer a fight (reuse Surface-style one-button, or a new control): resolve atk vs beast toughness (hash-seeded HP/ferocity) with real random swing; outcomes: drive-off→c.fleeing=true (non-lethal, the intended trigger), kill (rare, relics/trophy?), or the strike lands on you (hull, crew wound via resolveHazard-style). Depth grenades = panic tool (AoE scare→flee). Wardsuit/armor cut incoming. Beast traits: aggression=harder to drive off, cunning=flees smarter. Keep the "violence is usually wrong" ethos — fighting is desperate, costly, sometimes wakes MORE. NERVE stat still a candidate (fear from being hunted/striking). V2 flourishes banked: beast species-flavor in contacts; multiple hunters coordinating; interest "memory" of where it last had you; lures/decoys (drop a noise-maker to mislead).

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
