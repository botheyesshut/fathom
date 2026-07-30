# FATHOM — START HERE (last updated 2026-07-30)

## IT IS ALREADY HOSTED. READ THIS BEFORE ANSWERING A QUESTION ABOUT DELIVERY.

**`https://botheyesshut.github.io/fathom/fathom-chart.html`** — live, and every push to
`main` deploys there in a minute or two. Sean asked on 2026-07-30 whether it "may make
more sense to host it online", having installed a file on his phone. It has been hosted
since 2026-07-07; what he installed was the copy delivered by `SendUserFile`, which is a
snapshot and does not update.

**So the delivery advice is: send him the URL, not the file.** A file sent at 3am is a
fossil by breakfast. The URL is always the current build, Chrome on Android will "Add to
Home screen" it as an app, and it keeps its own `localStorage` save either way. The only
thing a downloaded copy buys is working with no signal.

**And a caution learned the hard way the same morning:** the local preview server served
a THREE-COMMIT-STALE build through three separate browser checks, including one where I
read a measurement off it. `?v=` did not bust it. Before trusting anything read out of
the Browser pane, check a symbol that only exists in the current build — e.g.
`typeof spaceSpoken === 'function'` — or verify headlessly against the file on disk.

## FIRST PHONE TEST, AND WHAT IT FOUND (2026-07-30)

Sean played the real thing on an Android phone for the first time since the surface arc
landed. Three findings, all of them right, and two of them one bug.

| what he said | what it was |
|---|---|
| *"there was a sail southwest, but all that was southwest was the starting island"* | Ships spawned ON the harbour tile, which is a `dock`, which is LAND. Fixed: she casts off into the water beside her port before you ever see her. |
| *"the boat doesn't seem to actually be moving from one port to another. it's just kinda sitting there"* | The same bug's other half — see the steering entry below. **4 voyages completed in 1,200 ship-turns; now 70.** |
| *"there's too much text going past the text window... impossible to know the chronology"* | See THE BOAT TALKS TOO MUCH below. His proposed design was better than what was there and is what got built. |

## THE OVERNIGHT CLEANUP (2026-07-29, `0aea1b3`..`HEAD`)

Sean: *"take your potions, make your plans, then commence to clean all of this
up. If I can go to sleep and have it all done tomorrow morning, great."* — with
every remaining C-section call delegated: *"I submit to your recommendations,
just make sure they make rational sense to the gamer."*

Battery green at every commit. What follows is the honest ledger.

### Closed, with the measurement that closed it

| what | the number |
|---|---|
| **The chandler** — the port buys what you find | 20 of 36 items had no buyer outside an enclave you had to find first. He pays 0.8×, and across all 28 (culture, item-for-sale) pairs there is no purchase anywhere you can resell to him at a profit **or at cost**; he is the best price for 0 of 31 items that have a buyer. A floor under the market, not a faucet. |
| **Three still lifes learn to move** | `deep` and `open` are what open water looks like — most of an ocean — and neither moved. `ruin` was one of the three "ruin animations" Sean asked for and was a photograph. `hullside` had 4 frames of which 1≡3 and 2≡4. Now across all 48 scenes: no stills, no padded cycles, no grid faults, no glyph off `VP_SAFE`, every glyph coloured. Nine scenes repeat a frame and all nine are ping-pongs (ABCB), which is the idiom. |
| **Interiors forgot which ocean they were in** | `interiorAt` and `beachMouths` hashed only (q,r,d): **1,400 of 1,400** decks and beaches byte-identical between two worlds. Salted via a saved `isalt` field. Proven three ways — HEAD vs salt-empty: 0 differences (an existing save keeps its buildings); two seeds: 1,388 of 1,400 now differ; same seed twice: 1,400 of 1,400 identical. |
| **World identity now comes first in the load** | `worldSeed = save.seed` sat 77 lines in, after the caches were emptied. Nothing in those lines asks the world anything *today* — that is luck, not a rule, and the last time I trusted an ordering like this it cost a migration that re-filed 0 of 5 wrecks. |
| **She gives chase** | Standing off was free. Forced every gate: armed + hostile + on the surface chases, closes to 0, fires, takes 18 off the hull, and does **not** vanish on contact (which is how a ship is normally retired). Unarmed never; submerged never; neutral never; beyond sighting never. A slow naval hull chases and cannot close — 6 hexes and no nearer, which is the destroyer earning her speed. |
| **The sounder learns to hear a shore** | A beach is a CELL, not a poi, so the instrument this game is *named after* was structurally blind to the one thing the on-foot layer hangs off. It only looked down, too — right for a wreck, wrong for a shore. 148 beach cells, 3,187 standing depths, reported every time, including from underneath. |
| **A dry room with something in it** | `chamber` was the one mouth of four with nothing to distinguish it. 294 chamber decks: 100% survival stock, **0 crates and 0 relics** — breath is range, crates are income, and the no-buff ruling stands. |
| **Depth pays** | It did not: 4,500 decks measured a ruin at 6.45 at 300 m and 5.91 at 4,800 m. Flat, on the axis the whole game is built on. Now ≤300 m is byte-identical to before (verified at 4,000 decks per cell: **+0.0%**) and 3,000 m is +25%. Pile *count* untouched, so a deep deck is the same walk, better paid. |
| **A wreck is full of boat** | And my first attempt at it doubled deep-wreck yield — 7.9 below 900 m against 15.9 above — which I shipped while quoting the no-buff ruling in the same commit message. Found by measuring the thing I had just built. The fix was the right *slot*: a fitting (3.8) sits where a relic (4.0) would have, so yield does not move, and each prize type gets an identity — ruins give up relics, wrecks give up boat parts. |
| **The room nobody had ever stood in** | `deepruin` had its own kind, three porthole scenes, its own suffix, its own prose, its own flood exemption, and a line about dressed stone laid in courses that the battery checked every run — and **nothing in the game ever named it**. `caveOnward` returns the next segment or null; the only `to` written anywhere was on the beach's mouth tiles. Now 46% of hall mouths open into it, and `caveBack` learned the way out (without which the entry tile would have set you on the boat from four chambers down, skipping the walk back — and the walk back *is* the price). |
| **Ten refusals that would not say who was refusing** | See section C: the audit's "37% untagged" was true of the runtime stream and wrong as a conclusion. |

### Not done, and why

- **Trenches** (next section). The plan and the baseline are captured; the code
  is not written. This is the biggest generator change outstanding and it lands
  in the one place with no performance headroom (42–47 ms against a 60 ms
  ceiling). Rushing it overnight and leaving it subtly wrong would have been
  worse than leaving it undone with the gates written first.
- **Populated caves, deep cities, underwater diplomacy** — new systems, not
  cleanup. Ships seeing each other; cargo drawing pursuit; charting earning
  leads. All still open in the backlog below.
- **Hours 2–10 audit** — needs agents and a long run.
- **Income** — untouched, per his ruling.

## TRENCHES — BUILT (2026-07-29). The plan below is kept as written; here is what happened.

**Run `node tests/trench.js` before and after any change to world generation.** It
takes `FATHOM_HTML` so it can be pointed at `git show <sha>:fathom-chart.html`.

### The thing the baseline found, which mattered more than trenches

**The ocean got deeper forever.** `baseSeafloorRaw`'s last branch was
`2325 + (off - HOME_SHELF) * 80` with no bound on it — 80 m per hex, without end.
Measured mean seafloor: 5,171 m at the origin, 11,609 m at 224 hexes out,
**30,229 m at 896**. Six times deeper than any ocean on Earth. That would be merely
silly except `addVolume` writes one cell per 60 m from the surface to the floor, so
chunk cost was linear in it:

| hexes out | mean floor | cells/chunk | ms/chunk |
|---|---|---|---|
| 0 | 5,171 m | 108k | 54.2 |
| 112 | 6,670 m | 456k | 83.7 |
| 448 | 15,218 m | 1.57M | 197.3 |
| 896 | 30,229 m | 3.35M | 368.1 |

**The game got permanently and unboundedly slower the further you sailed**, and the
battery's own performance gate only ever sampled chunks 4–8 (56–112 hexes), where it
read 51.6 against its own limit of 60. Nobody had ever looked further out.

The fix and the feature turned out to be the same thing. Real oceans have an
abyssal **plain** at three to six kilometres and reserve the deeper water for
trenches — which is exactly the job Sean gave trenches. `ABYSS_AT = 53`,
`ABYSS_FLOOR = 4200`, with two slow sines for swells so the plain is not a table.
The 80-m-a-hex rise runs unchanged onto it, so there is no step at the join
(verified hex by hex: 4,024 m at off 51, 4,290 at 55, then undulating).

Warm chunk time went **215.5 ms median → 17.4**, p90 **367.8 → 57.0**, and it is now
flat from the origin to 896 hexes out instead of climbing forever. The battery's own
gate went 51.6 → 37.7 ms. Gates 1–3 came out bit-identical, which is the proof that
nothing was subtracted.

### The six gates, after

| | result |
|---|---|
| 1. nothing sealed | hexes **bit-identical** (22,276 / 22,214 / 24,249), deepest reachable **unchanged** at 11,160 / 11,040 / 11,040 m. Cells +13%, all of it new water. |
| 2. ways under | sinkholes near the dock unchanged, **by design** — trenches keep out inside 23 hexes of the home shore so the learner's shelf stays gentle, and that gate could therefore never move. Replaced by 2b. |
| 2b. into the caves | 71–249 hexes cut into a cave band at 4,200 m or deeper; 8–26 hexes per world whose column **meets worked cave** below the plain; deepest trench floor 6,780–8,940 m. This is "access and egress from the caves beneath", measured. |
| 3. the shelf survives | **bit-identical**: 120 m at 3 hexes east, 220 m at 20. The keep-out holds. |
| 4. chunk time | warm median 19 ms, p90 ~57. The p90 outliers are chunks heavy with cave lattice or an island and **predate all of this** — pre-trench p90 was 57.0 too. Trenches cost a few ms; the cap bought two orders of magnitude. |
| 5. do they intersect | **889 / 1,477 / 889** hexes on two or more axes. Sean's word is honoured and not decoration. |
| 6. coverage | **15.9% / 18.7% / 16.4%** of eligible water with a floor 300 m+ below the plain — inside the 8–20% band on all three seeds. Tuned by measurement from a first cut at 42–53%. |

### WHAT IS DOWN A TRENCH — and a number I published wrong

**Correction to `e81eba5`'s commit message.** It says "0.006 prizes per hex in a
trench against 0.010 on the plain". The 0.006 came from a 31×31 window far off the
origin; a second attempt then said 18.4%, by counting prizes across the whole of
`cellPois` — which chambers write globally, far outside any window — and dividing by
trench hexes counted inside a 61×61 box. A wide numerator over a narrow denominator.
Both were wrong, in opposite directions, and they disagreed by 25×.

Measured properly, with the numerator and denominator covering the **same hexes**:
**0.012 per hex in a trench against 0.010 on the plain**, over 3,425 hexes of eligible
water in three worlds. So the substance of what I said holds — a trench is no richer
than the plain — but the figure was wrong and the second one badly so. *Whenever a
ratio is reported here, check that both halves cover the same ground.*

**The real finding in that data was worse than a missing gradient.** The prize type
was `types[hash % 7]` — a flat seventh each, at every depth in the ocean — so
`growth` (kelp and colonies, which need light) appeared at 8% **below nine
kilometres**, and trapped gas at 29% between six and nine. Shelf phenomena in the
abyss, because nothing had ever said otherwise.

`prizeTypeAt(q, r, d)` now interpolates a weight per type on `t = min(1, d/6000)`.
Measured at 40,000 draws per band, and confirmed live in a generated world:

| | 0 m | 3,000 m | 9,000 m |
|---|---|---|---|
| salvage | 22% | 14% | 5% |
| growth | 21% | 12% | **2%** |
| air | 17% | 11% | 5% |
| hull | 15% | 18% | 21% |
| ruin | 13% | 20% | **29%** |
| signal | 3% | 15% | **28%** |
| chasm | 8% | 10% | 11% |

The shelf keeps ruin at 13% and hull at 15% against the flat 14% each they had, so
the first hour loses nothing explorable. **Density is untouched** — a trench is still
no richer, and making it richer is an economy change with no mandate. What changed is
free and the fiction demanded it: the shelf is salvage and kelp, the abyss is worked
stone and something transmitting in the dark.

Still open: a trench's *density*. It gives the shortest road to cave bands b5
(6,480–8,520 m) and b6 (9,480–10,800 m), 8–26 hexes per world where the column meets
worked cave, and `rollItem`'s depth gate makes what you find better. Whether that is
reason enough to take a boat down one is a play question, not a measurement.

**And the early game got BETTER, which I twice measured as worse.** The battery
failed on "a reachable ruin exists to test with", I probed it, found four ruins on
seed 90210 at 5,340–9,960 m all reading unreachable, and concluded the shelf had lost
its explorable content. Both that probe and the test searched only to **5,000 m**.
Searching to the world's real floor reverses it, across seven seeds:

| | ruins in range | reachable | decks reachable at or under 1,500 m |
|---|---|---|---|
| before | 30 | 30 | 22 |
| after | **41** | **39** | **25** |

Ruins went up, not down. What actually happened on seed 90210 is that its ruins
concentrated deep — the feature working — and its shallow decks are now hulls, which
generate a deck just the same. `tests/decks.js` is that probe, kept, because a change
to prize placement can silently break the one thing a beginner needs. A 5,000 m cap
was safe while type was a flat seventh at every depth. It is not safe now.

### And it announces itself

A generator change the prose never mentions is a change the player experiences as a
number moving. Crossing a rim measured a **2,520 m drop in one hex**, so the sounder
now says so — once per trench, latched, clearing when the floor comes back up.

### Four instrument corrections it took to get here

Every one of them would have produced a confident wrong answer:

1. Gate 4 first measured cold chunks from the origin and reported a 330 ms worst
   case — that is the home shelf being built once, behind the splash screen.
2. The second attempt timed 90 further chunks on top and **blew `cells` past its
   16.7M ceiling mid-measurement**, the third time a probe here has done that.
3. Coverage counted a hex as trenched whenever `trenchAt` returned any hit,
   including out at the rim where the taper deepens the seabed by 30 m.
4. Coverage then divided by **all** water while `trenchFloorAt` refuses to cut
   inside the keep-out — two different populations, which made coverage read a
   quarter of its real value. Gate 5 read a false zero for the same reason.

## The plan as written BEFORE the code (2026-07-28), kept for the record

Sean asked for the thinking to be done up front, so it is here and the baseline
numbers are captured NOW — the specific way I would get this wrong is to change
the generator and then take a "baseline" from the already-changed world.

**What a trench is.** A linear depression in the seafloor on the same infinite
lattice as the cave nodes and the islands: segments between neighbouring lattice
points, hash-derived, local, a pure function of the seed. Where a trench passes,
the floor deepens, tapering from the axis so it has walls rather than being a slot.

**Why it connects to the caves for nothing.** `addVolume(q,r,'water','water',0,
seafloor)` writes cells from 0 down to the floor, and chambers write into the
same map. A trench deep enough to reach the cave band IS already connected. No
breaching step, so there is nothing subtle to get wrong.

### The gates, with today's numbers as the baseline

| | must show | why it is load-bearing |
|---|---|---|
| 1. nothing sealed | surface BFS >= **458,305 cells / 19,030 hexes**, max depth >= **11,040 m** | trenches only ADD water; if this falls I have misread `addVolume`'s priority rules and am subtracting cave |
| 2. more ways under | sinkholes within 30 hexes of the dock >= **5**, nearest <= **21** | a trench reaching the cave band is a NEW door. No improvement means they are not intersecting caves and "access and egress" is unbuilt |
| 3. the shelf survives | off the pier: <= **250 m at 3 hexes**, <= **400 m at 20** (today **173** and **303**) | canyon-country risk. The opening must stay a gentle shelf to learn on |
| 4. chunk time | < **55 ms** (today **42-47**, ceiling 60, Android 3-4x) | no headroom exists. The memo on `baseSeafloorDepth` should absorb it; if not, the maths is in the wrong place |
| 5. do they intersect | hexes where two distinct axes cross > 0 | Sean asked for trenches that INTERSECT. Unmeasured, that word is decoration |
| 6. coverage | 8-20% of open-water hexes touched | too little and nobody meets one; too much and the seafloor is corrugated everywhere and stops meaning anything. Tune by measuring 3-4 settings, as island density was tuned |

### Pre-mortem

- **HIGHEST: a trench cuts through an island's shoal or the home shelf** and puts
  a canyon where a harbour goes. Mitigation: a trench yields to land — deepen
  only where `baseSeafloorDepth` already returns water, and never inside any
  island's shoal radius.
- **A trench axis test that scans** instead of being O(few) per hex like
  `islandLift`. Gate 4 catches it.
- **Breaking the shelf without noticing**, because the battery has never measured
  a depth profile. Gate 3 is new and must be WRITTEN FIRST — otherwise it checks
  my work against a baseline taken after the change.

## THE BACKLOG — everything said and not yet done (audited 2026-07-28, refreshed)

Sean asked for this list explicitly. It is an honest inventory, not a wishlist:
every item here is something *stated* — by him or by a measurement — and not
built. Ticked items elsewhere in this file are not repeated.

### A. From Sean's own specs — ALL BUILT except the two he deferred himself

Everything that was in this table is done. What follows is the record; the only
entries left are the two he set aside.

| | how it landed |
|---|---|
| **Ships see one another** | `FLEET_RIVALS` — a fact about the setting, not a standing model: the Long Line and the Con-Fed are at each other and the carrying trade is nobody's enemy. Two rivals within two hexes fight, damage each other every turn, and one of them sinks; measured 78/54 hp → 42/42 over six turns. **And "interject" needed no control of its own** — firing on one of two ships already fighting IS taking a side, so ATTACK carries it. Measured: fire on the Line hull and confluence goes 0 → −35 while libertines goes 0 → **+18**, and the Con-Fed say so out loud. |
| **Cargo draws pursuit** | `cargoWanted(culture)` + a `greed` latch in `shipHunting`. Relics are the universal want; a named item counts only where that people pays a premium (measured: an idol draws Dagon and the Con-Fed, nobody else). **Crates deliberately do not count** — salvage is anonymous, and a world where a full hold makes you prey would make trading impossible. Measured over 260 turns at spotless standing: empty hold 0 chases, three relics aboard 1 chase, and it says "it is not personal". |
| **Charting earns leads** | `SURVEY_PER_LEAD = 400` new (hex, depth) pairs — measured, not guessed, at ~3.5 a move. Pays in **knowledge only**: `word` or `cavern`, never `cache` or `quarry`, because those are cargo and the no-buff ruling stands. Water you have already been over pays nothing (measured: 200 further sweeps of known water moved the counter by 0). One catch found in testing — `makeLead` degrades an unhonourable `cavern` to a `cache`, so the fallback is chosen at the call site and is `word`. |
| **Populated caves and deep cities** | See THE DEEP IS INHABITED below. |
| **Diplomacy underwater** | Same. |
| **Wartime** | BUILT — see below. He deferred it; then: *"I don't want deferrals."* |
| **PCs** | BUILT as far as it honestly goes — see below, including what it is **not**. |

## THE BOAT TALKS TOO MUCH (2026-07-30)

Sean, on the phone: *"we should only be getting a single description of our situation per
hex and depth and egress information if we ask for it somehow. if the boat has a first
mate, we could have him tell us. if we don't, we need to check ourselves. it might be
possible to buy an artificial intelligence first mate that would to do the job, too."*

That is the whole design and it is better than what was there. Built as stated:

| | |
|---|---|
| **One description per hex AND depth** | `move()` described the water on arrival *and again at `rand() < 0.4`*, and a depth change described it again at `rand() < 0.55`. Four hexes of one passage could produce four paragraphs about that passage. Now a `(hex, depth)` memo, session-scoped, capped at 4,000, **and no dice anywhere in the decision**. Measured on a 24-arrival round trip — twelve hexes out and the same twelve back — **13 descriptions**: the return leg over known water is silent. |
| **Egress on request** | `describeSpace` bolted exits, current, layer, trace and sounder onto *every* arrival — a paragraph where a sentence would do, which on a two-line log window is the entire problem. Arrival now gets the sentence; Look gets the paragraph. **1,104 characters against 3,187** over the same trip. |
| **A first mate** | Your **longest-serving able hand** — no new role, no new system, and it makes keeping a crew alive worth something, which is what the crew system was for. With one aboard you get the full account unasked, so a captain with crew loses nothing. A wounded man is not a mate. |
| **A calculating engine** | 60 crates at the Yard, for a boat with no crew or one that has just buried its. Deliberately **worse than a person**: a hand grows knacks by staying alive, this thing does one job for ever and will never learn another. It is also the only large sink in the economy, which the economy audit said there was nothing to save for. |

**Still open, and it is a taste call I did not want to make for him:** the log window on
his phone shows about two lines of a fairly large serif. Fewer messages helps; so would a
smaller face or a taller box, and both cost something. Ask before changing it.

## SHIPS THAT COULD NOT STEER (2026-07-30)

Three attempts, and the first two each fixed half of it. Kept because the *shape* of the
mistake recurs: each fix was locally correct and globally wrong.

1. The original shoulder-round list included the **reverse heading**, so a hull pressed
   against a headland stepped back the way she came and then forward again, for ever —
   measured `-12,22 → -12,23 → -12,22 → -12,23`, four hexes short of a port she never
   reached, with **0 of 7 hulls moving in 60 turns**.
2. Forward-only detours stopped the reversing and left a **two-hex ping-pong**.
3. Committing to a detour for four hexes stopped the ping-pong and walked her **round
   the island the long way** — distance to port 4, then 5, then 6.
4. What works is the standard rule: **try the direct hex every step**, and follow the
   coast only while the direct hex is shut. `skirtSense` remembers which way round she
   turned so she does not flip-flop alongside, chosen by which side leaves her nearer
   her port, and dropped the moment open water lets her resume.

**4 voyages ended in 1,200 ship-turns before; 70 after.** The hull count trebles because
the sea now turns over instead of clogging with ships milling against a coast.

## WARTIME, AND ANOTHER BOAT IS SOMEBODY (2026-07-29)

### The war

The Pirates! system is not "there is a war". It is that the powers are at war or at
peace in **shifting combinations**, and that the combination changes what the sea is
like. `FLEET_RIVALS` was a constant — the Long Line against the Con-Fed, for ever.

`atWar(a, b)` is a **pure function of (seed, term)**, so it costs no state, needs no
saving, survives a reload exactly, and still moves while you play. `WAR_TERM` is 900
moves: a war is a season you sail through, not weather that changes hourly. Measured
over eight seasons on one seed — two wars, then three, then one, then **a full
peace**, then two again. The two human powers are at war in the opening season because
that is the setting. **The carrying trade is never in it** — 0 wars across 40 seasons —
which is their whole character and the reason they hold most of the small islands.

| | |
|---|---|
| **A duel needs a war** | `shipDuel` required only that two hulls be rivals, so they fought in peacetime too, which made "at war" a thing the world could not be without. Measured: two rivals two hexes apart fight at war, and do not at peace. |
| **A commission** | The piece that makes a war matter *to you* rather than around you. A people you are **allied** to, while at war, gives you leave to take their enemy's shipping. Measured: fire on the enemy under commission and their standing falls **−35 exactly as before** — the paper never makes them like it — while your ally's **rises +20**. That difference is the whole of privateer versus pirate. |
| **The paper expires** | Measured: a commission taken in season 0 was waste paper by season 3, when that war ended, and it says so. |
| **The war news** | Only a city will tell you who is shooting at whom. Nowhere else in the game carries it, which is another reason to make the trip. |

### Another boat is somebody — and what this is NOT

**It is not networked multiplayer, and this file will not grow that overnight.** What
*"PCs once we have them"* needs first is that the game stop assuming exactly one boat
with a captain in it — and it did assume that.

A `rival` has existed down here since before the peoples did, and it was an anonymous
thing: "another boat", no flag, no name, and **shooting at it was the entire
relationship available**. Sean's Mariners are *"the neutral name given to all NPC boats
and subs that do not belong to a faction, as well as to the PCs once we have them"*.

| | |
|---|---|
| **A flag and a name** | Measured over 4,000 boats: 62% Mariner (matching the surface — somebody has to be carrying while the powers shoot), then Liners 17%, Con-Fed 14%, Deep Ones 6%. Fifteen boat names, and identity is a pure function of place. |
| **Standing governs her** | `c.hostile` was a coin flip at spawn that knew nothing about whose boat she was. Now: neutral people → she is working, not stalking; her people hunt you → she comes; **a treaty → she does not**, the same promise the surface makes; you shot first → she comes regardless, always. |
| **You can signal her** | The only verb another captain had was the torpedo. The sail button already means "close, then hail" on the surface; one deck down it hid itself. Same control, now reading "Signal". Costs a courtesy, pays +2 and the same news door a hull opens, once per boat. |
| **Sinking her is done to a people** | It cost **nothing at all** before tonight — the one act in the game with a crew on the other end and no consequence. −40 now, −30 and a prize under commission, and she is named as she goes: *"That was the Thole Pin, and everybody aboard her."* |

**Where PCs go from here** (not built, and not pretending to be): the entity model.
`state.entities[0]` was built as the step toward this and its own comment says so —
*"so every existing call site keeps working while new systems (enemy subs, remote
captains someday) address entities uniformly."* A rival is still a `creature`, not an
entity. Merging those two lists is the next real piece of multiplayer-readiness, and it
is a refactor of the same weight as the CELL/voxel one, not an evening's work.

## THE DEEP IS INHABITED (2026-07-29)

Sean: *"the fish people can populate a few ruins and have cities when one goes deep
enough"*, and *"treaties and missions and alliances are all made at the major cities
underwater"* — with the line he drew himself about the surface: *"we would not get to
handle diplomatic business there ... the towns at the surface are only for basic
trade."* So the town window is untouched and the CITY window carries all of this.

**None of it was possible before the abyssal plain got a floor.** While the seafloor
sank 80 m a hex forever, 4,000 m was a depth you drifted into by sailing far enough.
Now it is somewhere you go, down a trench, on purpose.

| | |
|---|---|
| **A city** | Dagon's alone, below 3,600 m — there is nothing any human yard can float that deep, so there is nobody else to build one. 35% of deep Dagon enclaves. Measured 5 cities across 4 seeds. It has a **name** (a pure function of place), it draws bigger and in their own colour on the chart with the name under it, and arriving at one reads nothing like arriving at a trading post. |
| **A mission** | They name something they are short of; bringing it there is completing it, because trade is already this game's verb for handing somebody a thing. Stable per city per standing band, so you cannot reroll the offer by leaving the room. Measured end to end: agreed, wrong item ignored, right item ×2 → 16 crates and +12 standing, arrangement closed. |
| **A treaty** | At `trusted` they put it in writing, and it buys the one thing worth buying: **their hulls stop hunting you**, greed and all. One clause in `shipHunting`. Measured: refused at nobody-to-them, offered at trusted, and an allied hull declines to hunt even at −80 standing, because a treaty holds until you break it. |
| **Their read on everyone else** | What they will tell you about the other peoples and where you stand with them — intelligence available nowhere else, and the reason to make the trip even with an empty hold. |
| **A populated ruin** | A ruin in a city's hinterland is somebody's house. Hostile to Dagon and **they resist with their own** (the existing tenant, with their name on it); otherwise **nobody bars the way**, which is worse — everything in there belongs to somebody who is watching you look at it. Carrying it out is theft: −22 standing, once per house, not once per armful. |
| **A beach is a way in** | `nearestWayIn` was blind to beaches because a beach is a CELL, not a poi — the same blindness the sounder had. Measured: 0 of 25 before, 25 of 25 after. And every beach you have stood on is now drawn on the sea chart, which matters because 55% of them have no lateral neighbour at their depth and can only be approached straight down. |

**Two bugs found while proving it, both mine:**
- **`cityHere()` was defined and never called** — the `deepruin` bug, one commit after
  I swept the file for it and left a note telling the next session to look. It now
  carries the arrival, which was reading "you come upon the Children of Dagon", exactly
  like a hole in a rock with four people in it.
- **"Glundefined".** `hashStr` returns unsigned 32-bit and `>>` is the **signed**
  shift, so half of all hashes went negative, `% 10` gave a negative index, and the
  first city generated was named after array slot −3. Swept the file: it was the only
  signed shift in it.

**And the household was tuned by measurement after firing on 0 of 12 real ruins** at
reach 12 — a feature that never fires, which is the `deepruin` mistake wearing a
different hat. Swept reach against a depth window over 81 real ruins: reach 20 gave
1%, reach 30 gave 4%, reach 40 gives **5%**, which is "a few ruins" — about one in
twenty. The depth window matters more than the plan distance: a city at 5,280 m with
a household four kilometres above it is not a suburb.

**The probe that found the tuning was itself broken first**, and in the way the
battery has a named guard for: `resetWorldCaches()` does not clear `spawnedChunks`
(`restart()` and the loader do it separately), so after the first seed nothing
re-spawned and every row read 0 cities.


**Closed since this list was written:** ATTACK in the encounter (`7a7d310`) —
which also found that ships were made of paper, a Con-Fed destroyer having 13
hull against a 16-damage torpedo. The test sinkhole is retired (`ca40c06`), which
found that the sounder was deaf to `opening`, the one thing a downward-looking
instrument should hear best. **Give chase** and **caches in single chambers**
closed overnight — see the ledger at the top of this file.

### B. From the five audits, measured and not fixed

Most of this section closed overnight; what remains is here, and what closed is
in the ledger at the top with the number that closed it.

| | |
|---|---|
| **~~Hours 2–10 never audited~~** | **MEASURED 2026-07-29** — see below. |
| **Ruins are not placed deeper with depth** | *Yield* now scales with depth (see the ledger) but the PRIZE TYPE is still a uniform hash over 7 types with no depth term, so a hull and a ruin have identical depth distributions. Fixing placement is a generator change and belongs beside trenches, not in a cleanup pass. |


### B2. HOURS 2–10, MEASURED AT LAST (2026-07-29)

`node tests/playtest.js 24 2500` — 24 bot captains, 2,500 turns each, four
playstyles. The one beat nobody had ever looked at.

**Read the caveat in that file before reading the numbers.** It says, in its own
header: *"the bot's playstyle is a GUESS at how a human plays. Read this output as
'what is reachable and what is broken', never as 'this is correctly tuned'."*

```
survived all 2500 turns   11/24 (46%)      hull failure 42%   air 13%
TRAPS (world closed)      0                <- the generator does not seal anybody in
median max depth          840 m            deepest across all 24 runs: 2,280 m
runs that ever took cargo 3/24 (13%)       best held 6
crates banked             median 0, MAX 0
entered a ruin on foot    4%
```

**Two findings, and only one of them is about the game.**

**1. The bot cannot dive, so most of the game is unproven rather than unreachable.**
Median max depth 840 m; the deepest of 24 runs got to 2,280 m. Everything below that
— grottos, deep ruins, the cities, the trenches, the whole on-foot layer — reads 0%
in the content table because the bot never arrives, not because it is sealed:
`tests/trench.js` gate 1 flood-fills to **11,040 m** every run. The 0% list is a
statement about the harness. It is still worth reading as a list of what a *timid*
captain never sees, which may be most captains.

**2. `crates banked: median 0, MAX 0` across 24 runs of 2,500 turns.** Three runs
picked cargo up, all 24 "made it back to port", and nothing was ever banked. That
looked like a candidate P0, so it was checked rather than reasoned about: put a boat
with 7 crates in the water beside the dock and surface it, on five seeds. **Banks 7 of
7, every time.** So the zero is the bot never surfacing beside the dock while holding
anything — a playstyle artifact, not a broken ledger.

**But the check found something anyway.** `surface()` decided "am I at port" against a
hardcoded `{q: 1, r: 1}` — a constant from before the home island had an outline. The
generator places the harbour now and it lands at **(1,0)**. One hex inside the 4-hex
tolerance, so nothing was broken and nobody would have noticed until the island's
shape moved and the ledger went silently out of reach. It asks `homeDock()` now, which
reads the tile the generator actually wrote.

`cautious` survives 0% of the time, against `hoarder` and `pacifist` at 67%. Timidity
kills, which is either a good design fact or a bot artifact, and it cannot be told
apart from here.

### C. Open questions for Sean — decisions, not work

- **The income question.** Bots bank ~0–4 crates in 300–400 turns; a hand costs 5. His ruling stands ("do not buff the economy until progress is reliable") and total income has NOT been raised — depth pays more only where it costs more, and the shelf is byte-identical to before. What is wanted is one honest 40-minute session and the answer to: did you bank anything, and did it feel earned?
- **The deep room is 70% richer than a floor ruin, and I decided that on his behalf.** 13.5 against 7–8. Reachable only through a sinkhole, a beach, the right mouth of three, and 2–4 chambers of walking with the air draining, then all of it again on the way out. My reasoning: the hardest place to reach should be the best place to reach, or the cave layer has no economic purpose. If it reads as too generous in play, the one number to move is the `'relic'` in the `kind === 'deepruin'` branch of `interiorAt`.
- **Engagement rate: measured, and NOT changed.** The audit wanted ship encounters raised from 13% to 33%. Measured instead: **92%** of open water has two harbours in reach, which is the condition for a hull to be despatched at all, and sitting in busy water gave 555 turn-sightings inside nine hexes over 300 turns. The sea is not empty and Sean's worry ran the other way. Left alone. (Creature STALK aggression is a separate 13% and also left alone — aggression should be felt, not computed.)
- **"37% of log output carries no tag" — true of the runtime stream, wrong as a conclusion.** The call-site figure is 6% (20 of 325), and **11 of those 20 are `pickFlavor`** — ambient prose, which is the *room* talking and correctly wears no instrument label. Both numbers are true at once because flavour fires every single turn. The ten that were genuinely wrong were refusals, and a refusal with no label reads as the narrator sulking; they are tagged now (ARMS, SONAR, DECOY, HELM, BALLAST, AIR). Ambient prose stays untagged deliberately.
- **The socialists' final name.** "The Long Line" is in and working; he said he would think on it.
- **Mariner and Dagon mottos** are mine and marked as proposals in the file.
- **Traffic density.** Earlier probe: a sail in reach 3.1% of turns among the harbours and 13.2% out in open water, which is backwards and was unexplained. The overnight measurement suggests why — despatch depends on two harbours being within `SHIP_RANGE` of **the boat**, not on the boat being near trade, so open water between clusters can see more traffic than a harbour on the edge of the world. Worth one honest look; the fix, if it is one, is to weight despatch by the harbours' business rather than by the player's position.

### D. Two corrections worth keeping

**Content can be wired at both ends with nothing in the middle, and the battery
will not notice.** `deepruin` had a kind, a suffix, three porthole scenes, its own
prose, its own flood exemption, and a check in the item suite that verified all
three of its faces every single run — and no code path in the game ever named it,
so no player had ever stood in one. The porthole test asked "does this kind draw
correctly", which was true, and not "can anybody get here", which was false.
**Nobody has ever swept the file for the general case.** A worthwhile hour: for
every `kind`, `poi`, `type` and `act` string the game branches on, ask what
*writes* it, and whether that writer is reachable.

**"Nothing interrupts" was never Sean's ruling.** It appears twice in the repo:
in a blurb describing the TIPS panel ("Each fires once, ever. Nothing interrupts
and nothing repeats") and in a comment I wrote citing it as a law of the game.
It is nowhere in this file and he never said it. I generalised a sentence about
tooltips into a design principle and attributed it to him. The offered-button
pattern is still right — a button can be ignored, a modal cannot — but not for
the reason I gave.

## THE SURFACE ARC (2026-07-28, in progress) — READ BEFORE TOUCHING GEOGRAPHY

Sean opened a new front: *"why not have stuff at the surface, too? we have this
one dock in a valley and then basically an eternal underwater world. why not
have the dock be just one side of a small island? why not have other islands
with docks and towns there? ... a whole water world full of islands at war."*

He was describing the generator exactly. Past the bay walls
`shelfSeafloorDepth` returned open water in every direction forever, and there
was **one piece of land in the world**.

### His two structural corrections, both of which fix more than they look like

**1. Factions must not be banded by depth.** *"I'm not sure the factions should
be decided by depth. that would mean very little interaction, logically, right?
... they should all be at the surface and with diminishing resources as one
goes deeper."*

This fixes the ECONOMY, not just the fiction. The old
`depth >= 2400 ? dagon : depth >= 900 ? libertines : confluence` meant **two
buyers were never in reach at once**, so they could never bid against each
other. That is why the economy audit found the Libertines top payer for
nothing. A market needs competition and depth bands make competition
impossible by construction. **Not yet built** — this is the next structural
piece.

**2. The world does NOT run out, and I said it did.** I conflated two things
across two messages and he pushed until it was straight. Measured, 3 seeds,
rings out from the dock:

```
ring      0-10   10-20   20-30   30-40   60-70   120-130
prizes/100 hex    1.1     1.5     1.2     1.1     1.2      1.1
```

Flat to 7.8 km. **What runs out is REASONS, not world.** A bot sweeping radius
14 finds ~3 reachable sites, works them, and then has no basis for preferring
any direction over any other. An infinite world with no signposts is
*experienced* as a small one.

### THE SINGLE DOOR — still the biggest open thing in this file

`makeLead()` has six call sites. Five are a lead spawning the next lead in its
own chain. **There is exactly one entrance: `readChart()`**, which needs a
`kind:'chart'` item, and those turn up ~0.05 times per session. One session in
twenty. Behind that shut door sit `word` leads (the mechanic that makes
charting pay — Sean's own ruling), `cavern` leads, `quarry` leads, and all
fourteen pages of THE ACCOUNT.

Sean's answer: **"yes, charting should earn leads."** Not built yet. The
intended shape is a second entrance that costs something other than luck —
reveal enough new water and the survey itself suggests somewhere.

### Built so far

- **Islands** (`cd0d40c`). Seamounts that broke the surface, on the same
  infinite-lattice idiom as the cave nodes. Density tuned by measurement: 4–8
  within 60 hexes, average gap 14, and **no seed left empty** (sparser settings
  had one world in six with no land at all — the beach-rate failure again).
- **Island shape** (`c13025f`). Three harmonics of the bearing, and **one
  function draws both the coastline and the shoal contour**, so the mountain
  underwater is the same shape as the land above. 1.32× the coastline of a disc,
  measured against the same generator with harmonics switched off. 131 islands,
  0 fragmented.
- **The Mariners** (`c79cdad`). The fourth people, and the neutral name for
  every boat that belongs to no faction — NPC and, later, PC. `floor: 0.9` makes
  them the buyer of last resort: **items with no buyer anywhere went 21/36 →
  5/36**. The Confluence's short name moved off "the federated mariners" to
  avoid the collision. The Libertines now want worked boat-parts, which their
  creed always implied, and are top payer for something at last.

### Sean's spec for what remains, in his words

- **Valleys and trenches**: *"we can put some valleys and trenches down there
  which intersect and give access to and egress from the caves beneath."* This
  is the biggest generator change in the arc — it touches how the seafloor is
  built everywhere, so it needs its own battery section proving the caves stay
  reachable and nothing gets sealed.
- **Towns are just a dock**: adjacent to it (and not being fired on by that
  faction's guns) a **DOCK** button appears; DOCK opens a town window *"basically
  stolen from Pirates! but must be made our own"*. Surface towns are **basic
  trade only** — for getting started, learning, and building a chart.
- **NO diplomacy at the surface.** *"treaties and missions and alliances are all
  made at the major cities underwater."* This is a good structure: the surface
  is the shallow end, and the deep is where the politics are.
- **Ships**: traders running port to port, some hunting subs like destroyers.
  Wartime later, *"like in Sid Meier's Pirates!"*. And: *"in TW2002 FOLLOWING
  ships was fruitful"* — following a trader should be a lead, diegetic and
  needing no chart item.
- **Populated caves and cities**: Dagon holding ruins, cities deep down.

### THE HOME ISLAND — DONE (`9defaac`)

Built. The warning list below was written before it and is kept because it is
still the map of what that code touches.

**The shelf is RADIAL now** — that is the whole change. `1.5 - r`, the distance
north of a line, became the distance out from the island's own shore on this
bearing. The depth profile is preserved (102 m at one hex off the pier, 303 at
twenty, 2,376 by thirty). The bay walls are deleted; Sean released the cove.
The dock stays at (1,1) because half the game names that hex.

Measured: finite in all six directions (9–14 hexes), 1,581 water hexes in one
connected ring so you can sail around it, ~370 land hexes, battery green,
firsthour unchanged (0 hull lost to land in 40 cold boots, 0 deaths).

**And the first finiteness check was VACUOUS** — it walked outward from (0,0)
looking for water, and (0,0) is the spawn, which is water. It passed while
proving nothing. The rewrite starts at the island's centre and asserts the
centre is land before it walks.

### The warning list, as written before the change



Sean: *"when we started much was made about that opening cove and it facing
north and having a continental shelf that drops off and all... that's all fine,
but let's draw the rest of the island behind it, too, with the same randomness
as everything else. The dock was never intended to be at the bottom of an
endless map anyhow."*

Right, and it makes the world coherent. **But read this before starting:**

- `baseSeafloorDepth` returns null for ALL `r >= 1.5`. The southern landmass is
  infinite. Making it finite is one function's logic, but it is the function
  every other piece of geography is built on.
- The home shore is **hardcoded**: a literal list of hexes at r=1..5, q=-5..3,
  set to `'shore'` with force. The dock is at (1,1). Every one of those must
  still land inside the new island's outline.
- `isMountainHex` runs the bay walls **32 hexes north**. On a finite island
  those become two absurd peninsulas. The cove almost certainly has to shorten,
  and that changes the opening's feel — which Sean said he liked.
- `flip.test` asserts dock connectivity by BFS. `tests/firsthour.js` measures
  the opening. Both will move.

Do it as its own stage, with the measurements decided before the code.

## FIVE TESTERS ON THE ON-FOOT LAYER (2026-07-28) — read this first

Five agents audited the finished three-kinds-of-place feature: adversarial
bugs, prose/epistemology, save integrity, economy, and design coherence. They
found **eleven real defects, nine of them mine from the same day**, and two of
them would have destroyed a campaign silently. Everything below is fixed and
battery-gated unless it says otherwise.

**The pattern held, and it is the same one this file has been recording for
three sessions: code that looks right, is believed to work, and has never been
measured.** Two new variants of it showed up:

1. **A GUARD CAN HAVE A HOLE THE SIZE OF THE THING IT GUARDS.**
   `items.test` §22 exists solely to kill rock-nouns-in-open-water — Sean's
   longest-running grievance. `describeSpace('ask')` opens with
   `if (asked) mode = 'again'`, and §22 only ever called `'ask'`. So for its
   entire life it read `SPACE_AGAIN` and never once read `SPACE_FIRST` — the
   paragraph printed on FIRST entry to every hex, the first sentence a player
   reads anywhere new. **2,857 offences across 5,112 samples** were sitting
   behind that one line, including the exact construction §22's own comment
   names as the subtle case. A check that samples one mode of two can go green
   on half a lie. §22 now asserts it read both.

2. **A FIX CAN ORPHAN THE SAVES IT WAS WRITTEN TO PROTECT.** Giving the station
   a `kind` locked away every grotto station claimed before the field existed,
   an hour after I shipped it. `SAVE_V` had not moved across *two* key-schema
   changes. There is a `migrate.test.js` now, and `creature.test` pins the
   version on purpose: **if that check goes red, write the migration before you
   change the number.**

### What was broken, and how badly

| | found by | measured |
|---|---|---|
| a claimed grotto could never be re-entered — you arrived in a **phantom ruin** whose loot was then marked taken | adversarial | 94/94 returns, 6 seeds |
| claiming the mouth **froze every tenant** deeper in the chain | adversarial | 101/101 |
| `hull` was in **no detection channel at all** — not the sounder, the chart, leads, or the noun table | design | sounder 0/24 on a hull vs 17/17 on a ruin |
| the arrival line asked `grottoPlan` how big the cave was while the deck rolled its own size | design | wrong 64.5% of the time |
| crossing a link was **free**, healed the tenant, stranded the party, and lost your dead | adversarial | 0.00 air vs 2.10; party 14.0 tiles away, 34/129 ever reunited |
| the LOOK button described a rusted metal interior **wherever you stood** | prose | byte-identical across 4 kinds, 259,215 samples |
| the porthole drew **a masonry tower** while you stood in a bare cave | prose + UI, independently | all cave segments drew ruin faces |
| the tenant stood on the **only way onward**, and was drawn over it | UI | 38/38 |
| `Claim Deck` could never succeed in a hull or a deepruin; `AUTO` was silently mute ashore | UI | proved by clearing every other refusal path |
| a **warden** — a thing built to guard a deck — spawned in natural caves | prose + design | 15 sub-only lines firing in rock |
| full tanks **locked you out of your own grotto** | self, before the agents | before/after A–B |

### Still open, with the evidence — NOT fixed

- **A large cave is large, not complex.** Measured with Hopcroft–Tarjan cut
  vertices: tiles ×4.08 from small to large, decisions ×0.99. Cut tiles
  10.49 / 10.41 / 10.38; largest open lump 48% → 71% → **84%**. A "small" cave
  is the most maze-like thing the generator makes. The fix is not a new
  algorithm — spend the surplus walk budget on separate lobes joined by
  single-tile throats, and put the `way` at the graph-eccentric tile. Target to
  measure: cut tiles scaling 10 → 20 → 30 and open-lump share **falling**.
- **Caves connect to other caves, but not to other BEACHES.** 445/445 links
  stay at the same (q,r,d). What shipped is a linear elevator behind one beach;
  what Sean asked for is topological — two beaches you already know turning out
  to be one system, which gives the *chart* hidden structure. Geography permits
  it: 3–6 beach hexes per world, closest pair 3–10 hexes apart. Seed 1 had
  exactly one beach in 817 hexes, so any implementation needs today's terminal
  as a fallback.
- **`deepruin` is the ruin generator with a different cache key** — 114.1 vs
  114.2 tiles, 4.78 vs 4.79 rooms, 2.96 vs 2.96 doors. The hardest-to-reach
  room in the game pays 3.62 against a floor ruin's 3.74.
- **The hull is the best site in the game and the one you may not keep** —
  most loot (4.85), least drowned water, most legible layout. The cheap answer
  to "claiming and repairing a wreck": weight the hull's loot roll toward
  `kind:'fit'` (the six salvaged boat parts already in `ITEMS`), so a wreck
  becomes something you cannibalise to repair *your* boat. Same fantasy, no new
  system, and it feeds the Libertines question in the open list below.
- **"Ruins in deeper waters" is not in the world generator.** Prize type is a
  uniform hash over 7 types with no depth term; hull and ruin have identical
  depth distributions across 1,127 prizes in 6 worlds.
- **`ruin` is a still, not an animation** — it has `art`, not `frames`, so one
  of the three "ruin animations" does not animate. `hullside` has 2 distinct
  frames of 4.
- **Interiors and grotto plans ignore `worldSeed`.** `hashStr('interior:q,r,d')`
  takes no seed, so 0 of 169 ruins differ between two worlds. `restart()`'s
  comment that interiors "belong to the old seed" is false. Probably harmless
  (*where* prizes sit does vary) but the model claims otherwise.
- **UI, measured and not yet acted on:** the porthole's ✕ is 7.4×9 px with
  `pointer-events: none`, so tapping it falls through and **moves the boat**;
  `recenter-btn` is 36×36 (the only control under 40×40) and does nothing
  ashore; the ashore vignette stops 57.8 px short top and bottom because
  `setViewport` is wired to `window.resize` only; the depth readout ashore is
  15.68 px, the same size as Air and Hold, and Sean has already said it is too
  small; `#log` is a hard `7.2rem`, so at 360×700 the chart (279 px) is smaller
  than log + controls (334 px) — his complaint is arithmetically true on a
  shorter phone.
### THE ECONOMY AUDIT (came in last, and is the best of the five)

It found **seven bugs in its own probes before reporting a number**, every one
biasing income downward — targeting a prize's identity depth instead of where
it rests, BFS on turns instead of air, `setTimeout` stubbed so `endGame` never
ran. It listed them first. That is the standard.

**RULING 1 HOLDS, COMFORTABLY, AND IS NOT CLOSE TO FAILING.** At the *ceiling*
(a bot that knows every site from turn 1), over 20 seeds × 500 taps:

```
                    mean  med   0 crates   >=5 (a hand)   >=6 (a station)
oracle explorer      0.3    0      80%          0%              0%
oracle ruin          0.8    0      55%          0%              0%
oracle grotto        1.7    0      55%         20%              5%
oracle mixed         3.6    2      25%         30%             25%
local  mixed         2.9    2      35%         30%             25%
```

**500 → 700 taps moves the mean by 0.0.** The cause is measured: **3.20
workable sites in reach per world** (radius 14, ≤2160 m; 2 of 20 worlds have
none at all). Progress is not gated by yield-per-site — it is gated by SITE
COUNT. Twenty more minutes buy nothing once the three are worked.

**The grotto is dominant on both scarce axes** — 2.3× a ruin per tap, 2.4× per
air — because the beach hands back 175 on arrival, so the *visit* is cheaper
despite being longer. My "1.73× across 2.03 decks" was right in direction and
measured the wrong denominator: **decks are not a resource the player spends.**
But it is not *strictly* dominant, and the exception is good: fights per visit
are ruin 0.00, hull 0.63, **grotto 2.33**, and grottoes drowned 3 of 12
captains against 1 of 6 and 1 of 8. A cave trades the flood clock for a wipe
risk. Do not touch that.

**The Erebus's tank cannot empty a deck** — content actually picked up is ruin
61%, hull 53%, grotto 66%, and every one of the 6 ruin walks ended on air.
Systems average 1.75 decks; captains walk 1.42.

**Two of Sean's open questions are now answered:**
- `CREW_HIRE_COST` 5 against "a measured ceiling of 4" — **REFUTED.** 30% of
  sessions bank ≥5; max observed 15. **Leave it at 5.**
- 20 of 35 items with no buyer — **CONFIRMED**, with the mechanism: `buyMult`'s
  "nobody buys back their own stock" voids the only plausible buyer for
  `saltiron`, `lens`, `chime` (Dagon sells them) and `pressurehull`
  (Confluence sells it). **And the port buys no items at all** — the dock banks
  crates and vaults relics, nothing else. An item is only money at an enclave
  you must first find.

**STILL OPEN — the biggest thing in this file, and it threatens Sean's own
ruling that charting is a legitimate way to play:**

> **The typed-lead system has exactly one door and it opens about once in
> twenty sessions.** `makeLead()`'s only player-reachable call site is
> `readChart()`, which consumes a `kind:'chart'` item. Measured: **0.65 item
> finds per session**, charts are 6–16% of the item table → **≈0.05 charts per
> session.** Observed: 0 of 20. That single gate holds shut `word` leads (the
> charting-pays mechanic), `cavern` leads, `quarry` leads, **and all fourteen
> pages of THE ACCOUNT.** A feature that fires one session in twenty is
> indistinguishable from one that does not exist. The ruling-2-safe fix is not
> more crates — it is a **second door into `makeLead()` that costs the player
> something other than luck.** Confirm with: charts-read per session, currently
> 0.05.

**Also still open:** a beach has no instrument pointing at it — not soundable,
not a `cavern` lead target, not a POI. 55% of beaches have no lateral water
neighbour at their depth, so the only approach is vertical, from inside the
chamber below. The audit's proposal, which respects the epistemic law: have
`soundingBelow()` report a beach cell that lies **inside the boat's own
`cellRun`** — that is water you are already in, not a reading through rock.

(Its recommendations 1 and 2 — add `hull` to `SOUNDER_PRIZE` and to
`nearestWayIn` — were already done before it reported.)

## THE ON-FOOT OVERHAUL (2026-07-28, `a1d38e5`..`3bb1400`) — three kinds of place

Sean's brief: *"there should be sunken vessels, submarines, and it should be
clear we're exploring aboard the decks of a wrecked submarine ... there should
also be ruins in deeper waters ... the rules for each might be slightly
different ... when I thought of claiming bases, I imagined a sub anchored in a
grotto, an underground lake with a beach and a cave opening that could be
spelunked ... it could connect to other caves ... and maybe exit into ruins,
too. i think the ruins should be revisitable."*

Built in three stages, each battery-gated before the next started.

**Stage 1 — revisitable ruins.** `state.deckTook` is a map of deck key →
tile keys already lifted, and it is SAVED. The breach reopens; nothing regrows.
This is what makes re-entry safe to allow: the deck simply has nothing left.

**Stage 2 — a sunken boat is not a sunken building.** `hull` is its own prize
type with its own generator: one spine the length of the boat, 5–7 compartments
opening on it and nothing else, half of them upended so the spine runs across
the deck and the whole place reads wrong on purpose. Measured 53% of tiles on
the spine vs 38% for a ruin — the shape is real, not a label. Six porthole
scenes (hullbreak/hullup/hullside, ruin/ruintower/ruinwall), picked by a hash of
the site's own coordinates so a site always looks like itself. **A hull cannot
be claimed** — Sean: *"it would be strange to make a base out of a wrecked
submarine"* — and the refusal is mechanical, not arbitrary: every compartment
opens on the next one and the last opens on the sea, so there is nothing to
pump out to.

**Stage 3 — the grotto.** Cavern beaches have been in the world generator since
the beginning and only ever handed you an abstract dice expedition. Now you go
ashore. `interiorAt(q,r,d,'cave')` carves by RANDOM WALK, not rooms and
corridors — a cave is what water left behind. Three sizes: 32 / 66 / 115 tiles
measured. `grottoPlan(q,r,d)` chains 1–3 segments and decides whether the last
opens into a `deepruin` (worked stone, ruin generator, own key `:dr`); 15% of
large systems do. Walked end to end in the browser: cave 36 → cave1 25 → cave2
115 with a clutch living in it → deepruin 138.

**The rules genuinely differ, and that is the point:**

| | ruin | hull | cave |
|---|---|---|---|
| floods from the breach | yes | yes | **no** — you walked in above the waterline |
| bulkheads to seal | yes | yes | **no** — nobody hung a door in rock |
| can be your station | yes | **no** | **yes** — it is where one belongs |
| worked out on leaving | yes | yes | **no** — a beach is a place, not a prize |

So a ruin gives you a clock and a door; a cave gives you neither. The tenant in
a cave cannot be shut out, only outrun. The `Seal Bulkhead` button is HIDDEN in
a cave rather than left dead — which also teaches the difference without a word
of instruction.

**Key discipline:** `deckSuffix(kind)` gives `''`/`:h`/`:c0`/`:c1`/`:c2`/`:dr`.
A hull, a tower and three cave links can all sit on one set of coordinates and
they are not the same place. Anything that reads or writes `deckTook`,
`clearedDecks` or `interiorCache` MUST go through it.

**THE BEACH RATE IS NOT AN ECONOMY BUFF, and here is the measurement that says
so.** 0.12 → 0.34 looked like one. At radius 14 across five seeds:

```
rate   nearest landfall from origin        landfalls in range
0.12   12,  9,  8, 13,  NONE               1, 2, 1, 1, 0     <- old
0.34   12,  9,  7, 10, 11                  1, 2, 3, 4, 4     <- now
```

One world in five had no grotto at all. A base site that does not exist in 20%
of games is broken, not scarce. The nearest is still 7–12 hexes out. Separately:
a whole grotto pays 1.73× a ruin across 2.03 decks of walking — slightly *less*
per deck, in exchange for no flood clock and no door. `tests/grotto.js` holds
both measurements and their method.

**A bug the walkthrough surfaced, and the class-level guard it earned.**
`trackForNow()` read `ashore() && !state.foot`, which is false by construction —
`ashore()` returns true only WHEN `state.foot` is set. The condition could never
fire. It existed solely to write *"You are not aboard"* into the log once per
music evaluation, forever, while the captain stood on a deck. **`ashore()` is an
ANSWER, not a question: it logs and then returns.** The battery now enforces
that every `ashore()` call is the LAST term of an early return, and the guard
was proven by reintroducing the exact line and watching it fail.

## THE SEVEN AUDITS (2026-07-27) — read this section before anything below it

Seven independent agents measured this game end to end: the economy, the
interface, the first hour, combat and stealth, the crew, state integrity, the
prose, and the on-foot layer. Every one of them found shipped features that
were not running. **The pattern is now undeniable and it is the most important
thing in this file: this project's failure mode is not bad code, it is code
that looks right, is believed to work, and has never been measured.**

Six things recorded in this handoff as SHIPPED were dead:
- the strict claim rule (read `poiDepth` off a tile object chunk generation replaces — 0 of 29 prize hexes retained it)
- the `jettison` tip (no call site, ever)
- `airMult` on a flooded lung (no reader — air cost was identical with three of them)
- `FLAVOR.growth` (no call site; contains the best sentence in the file)
- `noteCreature` for a silent captain (gated on the sonar being ON, so correct play learned nothing)
- the tip system's ordering (four of eight tips printed the lesson ABOVE the event)

**AND THREE OF MY OWN FIXES WERE WRONG IN WAYS ONLY MEASUREMENT CAUGHT:**
1. The ruin treadmill fix recorded found-ness under the PLAYER's depth while `handleTile` asks under the PRIZE ANCHOR's — 343 of 343 ruins stayed an unbounded faucet, and I wrote the comment saying it was fixed.
2. The sounder repetition damper was keyed on the exact metres under the keel, a continuous quantity, so it almost never held. `tests/firsthour.js` said 18.4% → 5.8%; over 500-turn sessions it was still 11.2%, because 25 taps never leaves the shelf.
3. The specimen-jar breeding printer was created BY my own arbitrage fix the session before.

**THE RULE THAT FOLLOWS FROM THIS:** a feature is not shipped until an
instrument proves it fires in play. Not "the battery passes" — the battery
proves it is not broken, which is a different claim. `tests/firsthour.js`,
`tests/hunt.js` and `tests/corpus.js` exist for exactly this, and each one
carries a caveat about what its numbers CANNOT tell you. Read the caveat first.

**AND: CHECK YOUR INSTRUMENT BEFORE YOU BELIEVE IT.** Four times this session
my own probe was the bug — a ruin probe calling `enterInterior` directly and
missing the guard in `handleTile`; a hull-damage probe calling `changeDepth`
directly when `syncDiveControls` had held all along; a `layerKnown` check
sitting inside its own 240 m proximity shortcut; and an income bot with no way
home that died of air 16 times in 24. Two of my new battery assertions also
passed vacuously (one read `.fit` off a string; one sat inside an `if` on a
probe that did not exist). If a number surprises you, suspect the instrument
first.

## WHAT THE AUDITS FIXED (2026-07-27, commits `9ac18c4`..HEAD)

**Campaign-destroying, now fixed:** a save this game could not parse, it also
DELETED — and `restart()` calls `clearSave()`, so the evidence went with it.
A save is a 250 KB write every 400 ms including while Android tears the tab
down. Unreadable saves are now set aside as `fathom-save-v1-broken`, the
player is told, and the version gate is a ceiling (older shapes load, newer
ones are refused without being wiped). The mirror-image bug — a wrong-typed
field threw inside `resumeGame` AFTER the title had gone
`pointer-events: none`, giving a blank unclickable screen on every reload
forever — is fixed by keeping the title tappable until the boot succeeds.

**New World was not a full wipe.** Four things walked through: `quarryCache`
(free crates at a hex never visited), `layersFelt` (a new sea arriving
pre-read — a direct break of the epistemic law), `portHire`, and `logHistory`.

**The stealth game did not run.** 267 creatures came within 6 hexes across 40
games; 253 never touched the hull. The decoy — the one hard counter — cost
+53% MORE hull with the sonar on and drew a hunter off 0 times in 200 trials,
because `noiseMade` STOKES and the HUNT branch read the player's true position
within 14 hexes. A silent boat above a hard thermocline was found 200/200
times, mean final range 0.00. All three fixed and measured in `tests/hunt.js`.

**The crew system:** nobody could die of a wound (`m.dying` had no clock), the
thing on the deck never reached a hand (nearest-body targeting + a party that
walks toward the captain = the captain is always nearest, 352 hits to 0), and
the Muster printed `, , ` where a person's injuries should be.

**The first hour:** the pier the opening paragraph points at cost 4-8 hull to
touch; nothing ever said the shelf floor is not the sea floor.

## OPEN — SEAN'S CALLS, WITH THE EVIDENCE (2026-07-27)

These are deliberately NOT changed. Each is a feel question, and Sean is the
one playing it.

1. **THE INCOME QUESTION — the biggest one.** Three audits' bots agree a
   captain banks ~0-4 crates in 300-400 turns. A hand costs 5. So the crew
   system, the cultures and the boat ladder are all gated behind a number
   nobody reaches. BUT `tests/economy.js` says the content is there and
   reachable — 51 prizes in starter-safe water, sounder precision and recall
   both 100% — and every bot is a guess at how a human plays. I built a
   better bot to settle it and ended up tuning the bot. **Sean's ruling stands
   ("do not buff the economy until progress is reliable"; "enough progress in
   a 40-minute session should not be virtually guaranteed") and nothing here
   was touched.** What is wanted is one honest 40-minute session and the
   answer to: did you bank anything, and did it feel earned or arbitrary?
2. **`CREW_HIRE_COST` is 5 against a measured ceiling of 4.** One crate. That
   may be deliberate scarcity or an accident. Not changed.
3. **Engagement rate is 13% of close passes reaching STALK** (was 1%). The
   combat audit suggested ~33%. I stopped at 13% because creature aggression
   is exactly the kind of thing that should be felt, not computed.
4. **The Libertines are strictly dominated as a market** — 7 of 7 items they
   buy are paid better elsewhere, top payer for nothing. Fixing it means
   changing what a people WANTS, which is canon. The canon-safe lever if you
   want it: give them a category nobody else prizes (worked boat-parts,
   `kind:'fit'`) rather than raising their multiplier on Dagon's holy things.
   **Do not resolve this by arithmetic** — the battery caught me doing exactly
   that once already.
5. **20 of 35 findable items have no buyer at any culture.** Most are
   consumables with a use, which is fine; but `saltiron`, `chime`, `lens` and
   `inertiallog` are deep finds that can never become crates.
6. **37% of all log output carries no tag** — and it is precisely the
   atmosphere. Tagged reads as "matters", untagged as "skip", which is
   backwards for a game whose text is the game. Either tag them (`SEA`,
   `PORTHOLE`) or accept it.
7. Still pending from before: music levels, viewport delight-vs-distraction,
   sounder frequency, whether nine tips is the right number.

**NEVER RAN:** the hours 2-10 mid-game audit. It is the one beat nobody has
measured, and it owns questions 1 and 2 above.

---

# HISTORY BELOW THIS LINE (pre-2026-07-27)


## OPUS WORK QUEUE (2026-07-26, ordered — Sean-approved split; Fable took the found-text system)

**Guardrails first, they are why tonight went long:** read the traps sections below before touching substrate. New seed-derived caches go in `resetWorldCaches()` and nowhere else. After ANY substrate change run `node tests/economy.js` and read the SOUNDER block, not just reachability. Do not restore the deep-claim fallback. The playtest harness noise floor is ±4–6 points — run the same build twice before believing a delta. When a diagnosis depends on a number, instrument the thing itself, not a proxy.

**DONE (2026-07-26): T2 all five bugs (`d1ffc77`) and the PWA (`61e3df4`).** E7 enclave-on-descend, S6 breach arm-then-confirm, O8 sonar units, O7 visible hold-station, M2 trade shortfalls. PWA: manifest + service worker + icon, fonts self-hosted (M10), **verified offline by killing the server for real**. Remaining below: T4 polish, music levels, bestiary, T6 harness, and the Sean calls.

**QUEUE CLEARED (2026-07-26).** T2 (`d1ffc77`), PWA + fonts (`61e3df4`), S2 free axe + D7 zoom + T4 polish (`507e869`), T6 harness (`a1bb979`, `a699b10`). Everything below is history except the WAITING ON SEAN block at the end, which is the whole remaining list.

**KEY FINDINGS FROM CLEARING IT:**
- **The sounder works, and now we can prove it.** Teaching the bot to read it took cargo pickup **20% → 32%/31%** (twice), against a ±4–6 noise floor. The old 20% was the harness being blind, not the strict-claim rule losing content.
- **"Softlocks" were never softlocks.** Split into TRAPS (world closed = generator bug; **zero, ever**) and bot-oscillation (harness limitation). Every "softlocks: N" in this project's history was the harmless kind.
- **The free axe lives on the BOAT** (`state.lockerWeapon`), not a hand — reissued with each hull. It is a floor, not a solution: 20 rounds of axe-work leaves a tough-40 tenant standing; relic-work settles it in 3.
- **A workflow hazard:** the service worker will serve a cached build when the dev server is down, so browser probes can silently verify the PREVIOUS version. Symptom: a change that "did not take" while the file on disk is correct. Purge with `caches.keys()`/`delete` + `unregister` before trusting any browser check after a server restart.

**T2 — DONE, kept for the record:**
1. **E7**: `checkEnclave()` has one call site (in `move()`), so descending onto an enclave never opens trade. Mirror the existing fix pattern: `handleTile` is already called after a successful `changeDepth` — add `checkEnclave()` the same way. Verify by descending onto a spawned enclave in the browser.
2. **S6**: inside a ruin, the exit tile (`t:'entry'`) is styled nearly identically to floor and one mis-tap calls `leaveInterior`, spending the site. Give it a distinct glyph/colour AND an arm-then-confirm on tap, same pattern as Jettison ("Leave? tap again").
3. **O8**: sonar readout prints "OFF air · silent m" — the units are hardcoded around the spans (index ~line 970 region, `updatePingDisplay`). Suppress units when the value is a word.
4. **O7**: "wait" is an invisible `waitHit` polygon (fill 0.001 opacity). Give it a visible affordance — a faint ring or a Hold Station button.
5. **M2**: the enclave trade panel still refuses silently (`class="act none"` with no reason). Copy the Port's shortfall pattern ("2 more crates").
6. **S2**: no starting weapon — the Port now *displays* the axe (2 crates) so this is softened; **ask Sean** whether a free starting axe is wanted before adding one.

**T-PWA — Sean's #1 priority ("mobile that doesn't suck"):**
7. `manifest.json` + service worker + icon (generate from the ANSI angler), installable, offline-capable, full-screen. EVERY ASSET IS OPTIONAL still applies — the bare HTML must keep working. Test offline explicitly, and test that the sw caches `assets/music/` lazily, never as an install blocker.
8. **M10**: the Google Fonts `@import` (line ~11) breaks offline. Self-host as `assets/fonts/` with `@font-face` + system-font fallback so the bare file still renders.

**T4 — mobile polish batch:** M3 Android back-button closes panels (pushState/popstate per panel); M9 `.inv-row .act` min-height 34px+; M4 raise `.stat-label`/`.stat-value` sizes; O4 long-press = show the `title=` text in a toast. **D7 (dropping `user-scalable=no`) is a Sean call — ask.**
9. **Music**: levels are unverified guesses (theme .50 / ambient .34 / hunted .44 vs sfx .22) — adjust to Sean's playtest verdicts. Six unused tracks in the source archive; candidates: on-foot ruins, enclaves, past-crush. Placement is a Sean call.
10. **Bestiary ANSI tranche** (if Sean approves after seeing the six): drifter, silt-ambusher, rival boat, shoal at 24×10 — silhouettes, key-based colour, battery check already enforces well-formedness.

**T6 — harness debt:** teach the bot captain to follow the sounder (dive when `snd.odd` — cargo-pickup numbers currently under-read the new signposting); add the S5 generator softlock assertion; note economy.js counts prizes per-hex (stack entries have their own table now).

**DONE BY FABLE (2026-07-26, `a53918e`): THE ACCOUNT (found-text system).** Fourteen pages of Sean's 2016 gamebook *The Dark Way Down*, verbatim, recovered **in order, one per resolved `word` lead** (`PAGES`, `recoverPage`, hook in `resolveWord`). Second person kept deliberately — framed once, never again. Pages are **campaign knowledge**: they survive death/restart like the bank (state literal comment explains; do not "fix" by resetting them). `btn-pages` hidden until the first page. Panel `#pages` renders found pages as a document, unfound as dim rules. Nine invariants in items.test §19. **Extension hooks if Sean wants more:** the source has ~50k words — a second account could gate on deeper water; pages could also seed into ruin lockers on foot; the curated fragments live in the `PAGES` const with the full source in Sean's Drive. **Trap fixed en route:** `poiStack` reads `cellPois` by coordinates, so the strict claim rule was hijacking legacy floor prizes on hexes that also hold a chamber stack — gate is `tile.poiDepth != null` in `atReachableBottom`; cargo.test rolls a random seed and is what caught it.

**WAITING ON SEAN'S PLAYTEST — do not tune blind:** sonar power ladder (S3, settings 1–4 dominated), cross-culture arbitrage (E6), engineer multiplier (E8), corpse prices (E10), Fire two-tap (S1), decoy tracking (S4). Also pending Sean: viewport delight-vs-distraction, sounder frequency, music levels, D7 zoom, bestiary go/no-go.

## THE WATER HAS TERRAIN NOW (2026-07-26) — answer to Sean's "how do we make sub exploration more interesting?"

**The diagnosis, which was not "add more content":** every open hex was mechanically identical, so moving was one undifferentiated verb and travel was dead time between sparse events. Prose cannot fix dead time. Exploration gets interesting when there is a small decision every single turn. Three commits, each one making the next better:

**1. CURRENTS (`currentAt` / `stepDir` / `currentFavour`, `CURRENT_SCALE=9`).** Deterministic gyres; 92% of neighbours share a set, so the water is *learnable*, not random. Favour ∈ {+2,+1,0,−1,−2} → cost mult 0.4 / 0.65 / 1 / 1.5 / 2.1. Punching it is LOUD (`noiseMade` 2–3), which wires it into the existing sound grammar. At depth: 1 air with, 7 against. **The outbound route is not the return route.**

**2. THE LAYER (`layerAt` / `layerDamp` / `crossedLayer` / `layerKnown`, `LAYER_SCALE=11`).** Thermocline at 240–1320 m, snapped to `DEPTH_GRID`. Depth was an *expense*; now it is a *hiding place*. A hard layer latches `soundColumn`'s up/down clear flags exactly the way stone does, and `passiveContactR(depth,q,r)` collapses 3 hexes → 0 across it. **Symmetric always** — it hides you from it as much as it hides it from you, so going under is blind as well as safe. `rivalAlignDepth` already trims rivals toward you one slice a turn, so the layer buys a head start, never immunity.
  - **Epistemic gate:** a hull thermometer reads its own water. You learn a layer by crossing it or coming within 240 m (`state.layersFelt`, persisted). This is not a restriction bolted on — it is what turns a readout into something worth going to look for.

**3. TRACES (`traceAt`, `TRACE_REACH=3`, `TRACE_SHED`).** POIs shed into the water; the current carries the shed downstream. A trace is **evidence with a direction in it** — read the set, turn into it, source is up that line. Walks upstream hop-by-hop so it bends around a gyre. Following a lead therefore means punching the current: the game charges for the lead in the currency the lead is worth. **Slack water carries nothing**, which is what makes running water feel like somewhere.

**What a captain reads on arrival now:** *"The water sets west, slow and steady. The thermometer is unsteady: a hard layer at 720 m. Below it, you would be hard to find. There is a sweetness in the water that the crew do not like at all. The set here runs west, so whatever is shedding it lies east of you."* — three facts, three decisions, no tutorial.

**Measured against a pre-currents baseline** (harness now takes `FATHOM_HTML=<path>`): survival 60%→58% (noise at n=120), cargo pickup 28%→32%, **softlocks 10→2**. Bots were idling at depth in a loop; varied move costs break the loop. That was an accident and a good one.

**CAVEAT, stated plainly:** the bot harness cannot read prose, so it cannot measure the thing these three features are actually for. Their value is unverified until Sean plays them.

## THE EMPTY DEEP: PER-CELL POIs ARE DONE, THE CAUSE IS STILL OPEN (2026-07-26)

**DONE.** Prizes are a depth-keyed stack: `t.pois = [{d, type}]`, shallowest first. `t.poi`/`t.poiDepth` mirror the shallowest **deliberately** — ~50 sites read `t.poi` for glyphs, traces, lead targets and chart markers, and all of them keep working untouched. Depth-aware paths only: `poiStack` / `poiTaken` / `poiAtDepth`, `atReachableBottom` (claims at any stack depth), `handleTile` (resolves the prize at *your* depth and passes a tile-view wearing its face), per-cell found-ness, and the sounder.
- **DO NOT remove the sealed-run fallback in `atReachableBottom`.** It is what keeps 83% of wrecks from re-stranding. Reachability sits at 92.3%.

**STILL BROKEN, AND I WAS WRONG ABOUT IT TWICE.** Read this before forming a third theory:
1. ~~`if (t && !t.poi)` — shallow chambers win the hex race~~ **False.** Measured after the fix: across a whole region, *no two chambers ever elect the same hex.* That guard fired almost never.
2. ~~The election picks a hex with no water at chamber depth and gives up~~ **False.** Made it try six candidates off the same seeded stream. Prize entries before: **24**. After: **24**, byte-identical distribution.

3. ~~Too few chambers carved near the dock~~ **False.** Instrumenting `carveChamber` directly (the thing I should have done first) gave the real numbers:

```
473 chambers carved   (181 shallow / 121 mid / 83 deep / 88 abyss)
208 POI rolls passed  (~40% of 473, exactly as designed)
208 prizes PLACED     zero misses, at every depth
 24 surviving in the world
```

**THE ACTUAL CAUSE: 88% of prizes are generated correctly and then destroyed.** The stack hangs off the tile *object* (`t.pois`), and `world` tiles are rebuilt by later chunk generation, which bins the array with the old object.

**FIXED (`47a87f2`).** Prizes live in `cellPois`, a sparse map keyed like `cells`. **208 placed → 208 surviving**, against 24 before. The deep now genuinely holds content: **41 prizes in 3200-6000 and 33 below 6000**, proportional to where chambers are.

**THE TRAP THAT COST A REVERT — read before adding any new world cache.** Six test files (`economy`, `items`, `interior`, `flip`, `creature`, `playtest`) each hand-roll a `__seed` shim that clears world caches **by name**. A new cache is invisible to all of them, so state leaks across seeds and every measurement silently lies. That is exactly what happened: `economy.js` runs five seeds then re-seeds for the sounder block, prizes from all five worlds pooled, and the sounder scored 0% precision / 44 false alerts. **The game was never broken — the harness setup was.** All six clear `cellPois` now. **Any future substrate map must be added to all six.**

**Run `node tests/economy.js` and read the SOUNDER block, not just REACHABILITY.** Checking only reachability is how a 0%-precision instrument got shipped.

## THE CLAIM RULE IS FINISHED (2026-07-26, `bfde5fe`) — the empty-deep saga is CLOSED

**The law, which every future feature touching prizes must obey: the claim, the sounder, and the announcement share ONE definition of "reachable from here" — the contiguous water the boat is in (`cellRun`).** Any two disagreeing means one is lying. Every failed attempt at this fixed one leg and left the other two.

- **Claim** (`atReachableBottom`): stack prizes are worked at their chamber, ±60 m, no fallback. Legacy seabed prizes (no stack — shelf wrecks) keep the sealed-run relaxation; that is what the 83%-stranded fix protected.
- **Sounder** (`soundingBelow`): `p.d > run.floor → skip`. Reads through water, not rock. 100% precision/recall on the upgraded scorer (sounds from every water cell in the column, not just the top).
- **Announce** (`prizeDepthHere`): quotes the prize's depth; **silent** when the prize is not in your water.

**Corrections to the record above:** the 69.2% figure **replicates on the clean harness** — it was never pollution, it is real geography. And it is the *design*: every 0–1500 m entry is standable (47/47), so the starter game is intact; what dropped was only ever claimable by fraud. Claim-depth bands went 0/1/0 → **3/7/2** across 2200+/3200+/6000+; median claim depth 720 → **1080 m**. Erebus-safe fell 85 → 63% of claimable — **that is Nyx's reason to exist appearing, not a regression.**

**The sealed third of the deep** (entry table: 3/7 · 7/19 · 2/20 standable in the three deep bands) is silent — no chirp, no announce — and is deliberate latent content: **dig targets** (the digging rig exists) and lateral approaches beyond the flood fill's 26-hex radius, which undercounts connectivity by construction. Do not "fix" it by restoring a fallback.

**Known small caveats, none urgent:** traces still shed from `t.poi` (shallowest face), so a trace can point at a hex whose prize is sealed — acceptable under "progress not guaranteed", but worth a look if playtests complain of wild geese. `leaveInterior` still marks found-ness by hex key, so a multi-ruin column marks its shallowest face when any deck is walked. Bot cargo pickup reads 20% vs 27–32% — partly the removed fraud, partly that the bot cannot read the sounder or the announcement; a human can.

**Also do not repeat this:** the "strict anchor vs fallback" trade-off I described was not real. `cellRun` already gives the water the boat occupies, so "is this chamber divable from here" needs no flood fill. That rule alone is still not sufficient — most deep chambers are separated from the surface run by rock and are reached laterally — so the honest test is connectivity, not vertical adjacency.

**Instruments:** `node tests/economy.js` (add `FATHOM_HTML=<path>` to A/B any commit). Note it counts one prize per **hex**, so it cannot see stacking — count `t.pois` entries directly for that. Numbers to move: *prizes per 1000 cells* in the 3200-6000 and 6000+ bands, currently **0.06** and **0.00**.

## THE SINGLE-FILE RULE IS DEAD — READ BEFORE "RESTORING" IT (2026-07-26)

Sean asked why it existed. **Nobody had decided it.** It arrived with the first commit as a *description* of an imported prototype and hardened into a law; no rationale was ever written down. Two rules had been fused:

- **"No build step" — KEEP FOREVER.** No toolchain to rot, edit-to-live in two minutes, opens in five years.
- **"One file" — RETIRED.** It only ever bought offline single-file delivery, and it was silently blocking audio, images, and a PWA — the last of which is the best available answer to Sean's stated number-one priority (*"a game I can play mobile that doesn't suck"*), since a PWA needs `manifest.json` + a service worker as separate files.

**THE REPLACEMENT RULE, which is not optional: EVERY ASSET IS OPTIONAL.** The game must run *identically* when assets are missing. Proven, not asserted — a bare copy of the HTML served from a directory with no `assets/` marks its tracks dead, throws nothing, and keeps drawing the viewport, HUD and synthesized sfx. A build handed to Sean as one file still works; it is just silent.

**MUSIC (`MUSIC`, `musicEl`, `trackForNow`, `musicTo`, `musicSync`, `musicUnlock`).** Sean's own, written 2012 for *The Dark Way Down*, never used. `assets/music/`, 1.3 MB, four tracks. **Scored to STATE, not events** — same discipline as the viewport, so it cannot disagree with the situation: `theme` (dock/pre-sail) · `shallow` (shelf) · `deep` (≥1200 m) · `hunted` (something within 6 hexes with a fix on you). The ♪ button governs music as well as sfx. Playback waits for the first real gesture.
- **Levels are unverified guesses:** theme 0.50, shallow/deep 0.34, hunted 0.44, against sfx master 0.22.
- **Six more tracks exist** in the source archive, unused — `in the dark` (5 MB), `Haunted 2`, `Time`, `Desert Rain`, and two opening-theme variants.
- **Two images in that archive are NOT Sean's** (`cthulhu-mythos-04.jpg`, `hplart.jpg`). Never copy them into the repo.

**TESTING LESSON FROM THIS WORK, worth more than the feature:** my missing-file check passed for the wrong reason — `preload='none'` meant the browser never requested the file, so nothing *could* have failed. **An absent request is not a successful degradation.** A second attempt was contaminated by a stale element an earlier probe had cached, so it was measuring the previous test.

## TYPED LEADS + KNACKS (2026-07-26) — both of Sean's banked rulings, built

**TYPED LEADS.** Every lead used to resolve into the same cache of crates, so a session had exactly one correct shape. Marks now carry a `kind`, stated on the chart and in the log *before* you commit the air:
- `cache` — crates, the old baseline.
- `cavern` — a place, not a payout. **Snaps to a REAL ruin/sinkhole/sprung hull within 7 hexes** (`nearestWayIn`) and honestly downgrades to a cache when it can't find one. 45/60 hold. *A clue that lies is worse than no clue.*
- `quarry` — an **offer**, never an ambush. Creature is named (so you can weigh it) and awake; the cache is visible; **arriving does not take it** (`state.quarryCache`, persisted). Come back with a torpedo, or braver.
- `word` — **pays zero cargo.** Pays in chart: a stretch of somebody else's survey, water you've never been to, revealed. Word begets word, and the chain turns into cargo later. **This is Sean's "a charting session is a legitimate session" ruling made mechanical.**

**KNACKS (`KNACKS`, `knackOrder`, `crewCan`, `checkKnackGain`).** Sean: crew-only, "I don't want to start a kind of scale problem." So: **A KNACK OPENS AN OPTION. IT NEVER MULTIPLIES A NUMBER.** Five, all wired to existing systems — cold nose (`layerKnown`), reader of water (`traceAt` reach), quiet feet (`noiseMade`), steady hands (`stressHold`), scrounger (on-foot rubble). Fixed seeded order per person, so keeping someone alive is finding out who they become; losing a veteran costs a *capability*. Gained at 4/10/18 voyages.
- **The load-bearing test:** a hand with 40 voyages scores identically to one with 0 (2 atk / 1 def each). If that ever fails, the scale problem has started.
- **THE MUSTER** panel (`btn-muster`) — built because none of this was visible; crew only ever reached the player through log lines.

## HARNESS NOISE FLOOR — READ BEFORE CHASING A REGRESSION

`tests/playtest.js` is **non-deterministic**. Same build, back to back: **54% / 58% survival, 29% / 23% hull failure.** So the floor is **±4–6 points at n=120**. A 4-point swing is nothing. Run the same build twice before believing any delta, and use `FATHOM_HTML=<path> node tests/playtest.js` with `git show <sha>:fathom-chart.html` to A/B against any prior commit.

**And the BATTERY had a flake too, found 2026-07-29 — the first one ever.** The
substrate is a pure function of the seed, but *gameplay dice* are seeded off the
clock on purpose (`rng = mulberry32((worldSeed ^ Date.now()) >>> 0)`), so any
suite that spends dice can vary. `tests/interior.test.js` saturated a deck with
600 flood advances and a tenant step before checking the Seal control, and
**3 runs in 20** came out of that with a dead captain — at which point `sealDoor`
returns at its first guard (`!state.alive`), touches nothing, and the check
failed while printing the word "reopened", i.e. the opposite of what happened.

**And I got the cause wrong twice before getting it right, which is the part worth
reading.** First I decided the captain had drowned in the flood, made the walk
cleaner, saw 14 consecutive passes and called it fixed. It came back — with
`there is a live crew to work the bulkhead with — aboard, air 340` printed on the
line directly above, which refutes that theory in one line.

The actual cause: `doorK` came from `__int(q, 7, 660)`, which forces kind `'ruin'`
at depth 660, while `__enter` goes through `enterInterior`, which resolves its own
anchor with `poiAtDepth`. Those two can name **different decks** — and which anchor
answers depends on `state.poisFound`, which by that point in the suite has grown
differently depending on gameplay dice. So perhaps one run in seven entered a deck
on which `doorK` is not a door, `sealDoor` correctly reported "no bulkhead within
reach", and the check failed while printing the word "reopened".

Four lessons, in order of how much they cost:

1. **A test that reads one deck and drives another cannot be repaired by tidying
   the walk.** Ask the deck you are standing on — `footChunk()`, now exposed to the
   harness as `__chunk()`.
2. **`__int(q,r,d)` and `__enter(q,r,d)` are not the same place.** Anywhere a suite
   uses both on the same coordinates, check that assumption.
3. Before blaming a code change for a battery failure, **run the suite 15–20
   times**, and remember that a clean run of 14 is not proof — it was here, and it
   was wrong.
4. **A check that can fail for a reason it does not report is worse than no
   check.** Both wrong diagnoses came from the check printing "reopened" while
   something else entirely had happened.

## THREE MISTAKES WORTH NOT REPEATING (2026-07-26)

1. **The battery caught a real design error.** I had a hard layer latch `soundColumn`'s clear flags like stone, which broke "an opening reachable by rising IS reported". The test was right: that hides *the shape of the world*, not the things hunting in it. Structure returns are loud; radiated noise is faint. **The layer belongs in `passiveContactR`/`noiseMade` and nowhere near geometry.** Blinding navigation sonar makes the sea arbitrarily lethal and degrades the chart, which is the point of the game.
2. **Two of my own new tests passed vacuously.** The stats check compared two *gearless* hands — `teamScore` skips the gearless, so it asserted `0 === 0`. Now has a liveness guard that fails if the comparison isn't measuring anything. **A test that cannot fail is worse than no test.**
3. **A two-sample variety check isn't a variety check.** Two names honestly rolled the same first knack; it now samples the whole hiring pool.

**Bugs the water-terrain commits shipped past (both silent, both found only by verifying):** `currentFavour` compared a hex to itself because `state.q` was advanced before favour was computed — the prose said the water was setting and the water did nothing. And the chart framed all 13,217 *generated* hexes instead of the ~58 *known*, rendering a hard-won survey as a speck. Chart now frames `chartKnown` tiles + dock + player + enclaves + leads.

---


**Read this file first, then `memory/roadmap_vision.md` + `memory/project_fathom.md`. That is the whole handoff — no chat history required.**

**What Fathom is:** single-file HTML game (`fathom-chart.html`, ~4300 lines, no deps, no build step). Sub *Erebus* explores an infinite undersea cave world. Mobile-first (Sean tests on Android Chrome). Live at https://botheyesshut.github.io/fathom/fathom-chart.html — pushes auto-deploy in ~1-2 min. Deliver builds to Sean via SendUserFile.

**Setting:** post-apocalyptic × Lovecraft. Scarcity is the aesthetic; violence is usually the wrong answer; the best gear is often protective. Prose is spare and nautical.

**State (all shipped, verified, pushed):** infinite deterministic world (pure fn of seed) · voxel cell model (no columns) · save/resume (seed + overlay) · creatures (drifter/lurker/eel/rival, sound-driven) · economy (salvage→crates→bank→yard/outfitter, relics→vault) · 3-boat ladder · expeditions & cavern beaches · named crew with XP/roles · equipment (scrap + relic-work tiers, hazards, wounds) · synthesized audio · death ruling (lose the boat & all aboard, keep the campaign).

**BEFORE SHIPPING ANYTHING: `node tests/run-all.js` — ship only on ALL SUITES PASSED.** Doctrine + harness traps documented below.

**THE BOTTLENECK IS PLAYTESTING, NOT BUILDING.** ~25 tuning knobs are set to Fable's guesses and have never been felt by a human. Sean's verdicts gate the tuning pass. Do not invent scope to feel busy.

## CREW AS PEOPLE — the big design (Sean ratified the 4 forks 2026-07-24)
**The spine: a crew member is a HISTORY, not a number.** This is the deliberate move away from HP+XP toward mature/emergent/surprising/fair. Sean's four ratified decisions:
1. **Small positioned party** — crew are individual BODIES on the deck grid (1-3 along), can be hurt, cut off by a sealed door or rising water, and lost. Not an abstract pool, not a full X-COM squad.
2. **Full condition system — NO hit-point pool.** Harm inflicts a NAMED, specific state from a seeded table ("crushed hand — no two-handed weapon", "flooded lung — actions cost extra air", "the shakes"). Fair because legible + actionable; unpredictable because WHICH condition varies; strategic because each changes what the body can do. `member.wounded` is the proto-version; conditions generalise it (keep `wounded` as a derived flag so existing dial/hazard/port code keeps working).
3. **Soft survival** — `stores` feed a VIGOR axis. Hunger/water/warmth NEVER kill directly (no Oregon-Trail bookkeeping); they are a MULTIPLIER on danger — depleted crew wound worse and fray faster. The reason to turn back for base/port. Base/port re-provisions.
4. **Break into horror** — beyond death: a mind pushed past breaking walks off into the structure, and a body lost in the deep can resurface later as the **hollow-man tenant wearing a uniform you issued** (`state.lostCrew` → hollow-man `wornName`). Closes the setting's loop on itself.

**Three pressures, not one bar** (each = proximity-to-a-bad-condition, not HP): **Body** (physical), **Nerve** (the Lovecraft axis — low nerve reads froze/fled/dropped-the-lamp/fired-wild, not "insane"), **Vigor** (fed from stores).
**Gear changes the ODDS, not the arithmetic**: `atk`/`def` stop meaning damage/soak and become how the wound table TILTS — a wardsuit deletes the worst rows; relic-work gives strange edges.
**Tenure = scars + traits + trust, not bigger numbers**: staying with you accretes history (double-edged scars, earned traits, reliability under nerve-pressure). Portable whether or not aboard/in the party.
**On-foot combat beyond turn-based**: position (a doorway = one-at-a-time), commitment (striking is loud/exposes — the silence grammar indoors), light (fight what the lamp shows), and NO damage numbers (you read the body).

**BUILD ORDER (this is a multi-push feature — do NOT try it in one drop):**
- **A. Condition foundation + combat wiring** — ✅ **DONE 2026-07-24** (see below).
- **B. Positioning** — ✅ **DONE 2026-07-25** (see below). Roster now reads off the deck (state-coloured bodies).
- **C. Tenure** — scars/traits/trust progression. NOTE: `member.scars[]` already accretes (incap conditions leave a scar), and `scar` strings exist on CONDITIONS — the data is being collected; C is about making scars/traits DO something.
KNOBS throughout are Fable-guessed until Sean plays. Prose tables are Sonnet-subagent work against the schema.

### STAGE A AS BUILT — the crew are people now (2026-07-24)
- **`CONDITIONS` table** (near GEAR): named states, each `{pressure:body|nerve, tier:1-3, atk/def/airMult/nerve deltas, incap, mortal, got:prose, scar}`. 10 to start (bruised…bleedingOut, shaken…unstrung).
- **Member fields** (lazy via `crewVitals(m)`, so old saves/hires upgrade for free): `nerve` (0-100, def 70), `conditions[]`, `dying`, `scars[]`. Legacy `wounded` kept as a DERIVED flag (set on incap) so all existing dial/hazard/port code still works.
- **`inflictCondition(m, severity01)`**: `eff = severity·vigorMult − crewDef·0.12`; eff→maxTier; picks a condition in-band. **`if(m.lost) return`** guard (browser caught the dead still being wounded — regression-tested). Nerve-conditions call `frayNerve`; incap sets `wounded`; scar recorded; mortal sets `dying`.
- **`frayNerve(m, amount)`**: ×vigorMult; ≤0 → `loseCrew(m,'broke')`. Also `if(m.lost) return`.
- **`loseCrew(m, how)`**: splice from crew, push `{name,role,how}` to `state.lostCrew`. how = broke/taken/drowned, each its own prose.
- **`vigorMult()`** from `state.stores` (100→1.0, 0→1.6). `provisionTick()` per boat-move (0.4) and foot-step (0.3); refills at port (full) and on entering a secure station (+40). Crossing below 33 warns once. **Never kills directly.**
- **Combat wiring**: `dwellerStep` dist-0 → `tenantStrikesParty(spec)` if any able crew (they SCREEN the captain: wounds land on THEM + fray nerve; a `dying` body hit again is lost unless a kit auto-spends); else the captain's air pays, as before. **OFFENSE is decoupled from conditions** — `bestWeaponAtk()` (best weapon among non-lost crew, captain wields it) drives the swing, so wounding crew never makes a fight unwinnable (fairness is the brief). `teamScore()` now condition-aware for def/hazards.
- **THE LOOP CLOSES**: `enterInterior` (OVERLAY, never the pure substrate) gives a generated `hollow` dweller a 40% `worn = <lostCrew name>`; `dwellerStep` first-sight logs the uniform line. Verified: a broken Marchetti resurfaced as a hollow man wearing his own uniform.
- **Persistence**: `stores`, `lostCrew` saved; crew conditions/nerve ride on the member objects; `resumeGame` runs `crewVitals` on each. Round-trip tested.
- **Port**: surgeon+shore now clears conditions, restores nerve to 100, refills stores — **scars stay** (they are the record). 
- **interior.test.js → 110 checks.** KNOBS NOT FELT: nerve start 70 / fray 8-per-hit, condition tiers & effects, `vigorMult` 0.6 span, `provisionTick` rates, station +40, worn chance 0.4, `crewDef·0.12` armour tilt (currently strong — a wardsuit deleted ALL tier-2 at sev 0.7 in test).

## DIGGING — Stage 5, the last ladder rung (2026-07-24). The Dwarf-Fortress heart.
**You cut your own fortress out of the rock of a station, tile by tile.** Station-only (you dig to expand what is yours). The trick is a CARVED OVERLAY on the substrate deck, honored by one accessor so the tunnels are real everywhere at once.
- `state.base.carved: []` — tile keys the player has cut to floor. Overlay, saved, restored, reset. `baseCarved()` / `onOwnDeck()` helpers.
- **One accessor does it**: `footTile()` returns a synthetic `{t:'carved'}` for carved keys on your own deck → carved tiles are walkable in movement, floodable in `floodAdvance` (uses an `open()` that includes carved), and drawn as floor in `renderInterior`. Copy this pattern for any future interior overlay.
- **`digAdjacent()`** on `#btn-dig` (shown in a secure station when `digTargetNear()` finds solid rock beside you). Cuts the first solid neighbour in the diggable band. `DIG_COST=2` crates from the station's own stores. Raises `base.threat` +6 — **digging is loud, and the deep hears a fortress being built** (draws sieges).
- **THE DWARF-FORTRESS FAILURE MODE Sean loved**: the grid's outer ring (0/19) is the hull and cannot be dug; the innermost diggable band (1 or 18) is a **telegraphed gamble** — `rand()<0.4` breaches into the sea (`base.breached=true`, floods the deck at the cut tile, reuses the siege-breach machinery). "The last foot of rock gives all at once, into cold black water."
- **THE PAYOFF**: a bigger warren is harder to take — `baseTick` divides the siege breach rate by `warren = 1 + min(2.5, carved/12)`. Plus the emergent one: more dug room = farther for a boarder to walk, more places to seal and fight.
- **interior.test.js → 123 checks.** Digging: carves & costs & is walkable, floods like anything, refused without crates, warren slows the siege (10.4→3.0/turn at 30 tiles), hull-band dig breaches + floods, survives reload. Verified in a live browser: dig 3 rooms, walk into a tile just cut, and breach the hull on the perimeter. No console errors.
- **KNOBS NOT FELT**: `DIG_COST:2`, breach chance 0.4, dig threat +6, warren cap 2.5 / divisor 12.
- **STILL OPEN ("Fitting")**: placing furniture/defences/bulkheads on carved tiles; player-authored chokepoints; multi-cell fortresses (dig through a cell edge into the next 60m cell — the substrate/overlay model already allows it).
- **THE RESOLUTION LADDER IS NOW 7/7 BUILDABLE RUNGS DONE.** Rung 7 (rival PvP raids) awaits a multiplayer backend; the sub-vs-sub detection model (below) is its combat core.

## SEAN'S DESIGN DIRECTION, 2026-07-25 — NOT YET BUILT. Read before tuning anything.
Four rulings from Sean. The first one **overrides** the instinct to "fix" the economy.

### RULING: progress must NOT be guaranteed
"'Enough progress' in a 40 minute session should not be virtually guaranteed. If a person just
wants to explore in the sub and see and hear interesting things, flesh out their map, they should
be able to do that." **Do not buff the economy until progress is reliable.** A session that banks
nothing but charts new water is a legitimate session. When the persona playtest reports "the
economy does not compound", separate the genuine bug (cargo was near-unobtainable — since fixed)
from this deliberate design. Exploration is its own reward; the job is to MAKE it rewarding, not
to replace it with guaranteed income.

### THE CHART (the strongest idea; do this one properly)
A **nautical-chart map view**, separate from the tactical hex view (which stays as the periscope).
Ink-on-wet-paper: soundings, hachured rock, a compass rose, the coastline you have charted.
- **AT FIRST, THE SUB DOES NOT APPEAR ON IT.** You see the water you have charted but not where
  you are in it — you dead-reckon. **Own-position is an UPGRADE to work toward** (an inertial log
  / positioning array — a natural Confluence instrument, or a `fit`).
- **WHAT THE CHART SHOWS (Sean, ratified 2026-07-25):** the ENTIRE SURFACE (depth 0) is drawn, no
  restriction — humanity charted the surface before the Fall. **The moment the sub descends at all,
  the chart shows only hexes explored or otherwise revealed** (visited / ping-revealed / passive /
  any future method). So: a complete surface map, and beneath it only what you have earned.
- Sean confirmed the split: the tactical hex view STAYS as the periscope; this is a separate
  zoomed-out chart you open.
- WHY THIS IS RIGHT: it is the epistemic law taken to its end — knowing where YOU are is knowledge
  like any other, and the game has been quietly giving it away. It also gives the explorer
  playstyle a PROGRESSION TRACK, which is what makes the "progress not guaranteed" ruling work:
  fleshing out the chart IS the reward.

### TYPED LEADS (breadcrumbs that promise different things)
Today every lead resolves to the same generic cache (`resolveLead`), so they are interchangeable.
Leads should carry a KIND, and the clue text should TELEGRAPH it so a player can decline one:
- **quarry** — something worth fighting, with a reward for winning
- **cavern** — a place worth exploring, by sub or on foot
- **word** — information: eventual rewards (reveals other leads, names a people's location,
  marks a region, opens a lock). Sean: "information they might glean (for eventual rewards)."
A lead you can turn down because you are not in the mood for a fight is a real choice.

### CREW SKILL TREE — crew ONLY, and that is the scale control
Sean: "That would just be for the crew members because I don't want to start a kind of scale
problem where players can become all-powerful. I don't want that eventuality."
- **WHY CREW-ONLY BOUNDS THE CEILING**: crew are MORTAL and FEW. They break, they die, they walk
  into the dark. Investment that can be lost does not accumulate into god-mode, and PARTY_MAX /
  crewCap caps the width. The captain never gets stronger — the people do, and the people are at risk.
- Build as **specialisation, not strength**: a hand good in the dark is not thereby good with a
  speargun. Earned from what they SURVIVED (the data already accrues: `m.xp`, `m.scars`).
- This is crew Push C (tenure), now with Sean's shape on it.

## THE HOLD & THE TRAIL — items with teeth, and exploration that leads somewhere (2026-07-25)
**Sean: make exploring rewarding; items need PALPABLE gameplay value — worth using, keeping, storing, stealing.** Two systems, both battery-green (new `items.test.js`, 20 checks) and browser-verified.
- **`ITEMS` data table** (beside GEAR — add a row, get a new thing worth diving for). Kinds: `use` (consumable), `fit` (permanent boat upgrade), `key`, `chart` (clue), `valuable` (pure worth). Each has glyph/col/flavor/`find` weight/`depth` gate. v1 roster: patchkit(hull), airflask(air), rations(stores/Vigor), dressing(clear a crew wound), salts(restore nerve), probe(SILENT scout + nearest-POI tell), sonararray(fit→passive range), pressurehull(fit→+450 m safe depth), hatchkey, seachart, idol/ingot(valuables).
- **`state.items` = {key:count}` hold + `state.fits` = {sonar,depth} levels.** Helpers `giveItem/takeItem/itemCount/fitLevel/rollItem(depth,rng)`. `rollItem` is depth-gated + `find`-weighted (deep water gives the rare things).
- **Fits are single-site hooks**: `passiveRange()` += `fitLevel('sonar')`; `safeDepthNow()` (new; replaces all `sub.safeDepth` uses) = base + `fitLevel('depth')*450`. Add more fits by adding a hook.
- **Findability**: interior loot (16% → a rolled item via the deck's own rng, deterministic), boat salvage (30% chance), and trail caches. Interior item loot draws with the item's glyph; foot pickup → `giveItem` straight to the hold.
- **The Hold UI**: `#btn-hold` opens `#inventory` overlay → `renderInventory()` lists each find (glyph/name/count/flavor) with ONE action (Use/Fit/Read; keys & valuables inert), sorted by kind, + a "fitted to the boat" summary row. `useItem(key)` is the single entry point; the table decides the effect.
- **THE TRAIL (discovery/breadcrumbs)**: `seachart` → `readChart` → `makeLead(tier, fromQ, fromR, seedStr)` lays a deterministic mark 8-16 hexes off at depth (`leadTarget` hashes seed+pos). `state.leads` render as a gold ⌖ on the chart (your own hand — shown regardless of what the water there is known to be), with closing-distance nudges. `checkLeads()` (in move) resolves a lead within 1 hex → `resolveLead`: a cache of crates/relic/items scaled by tier, and `rand()<0.5+tier*0.08` drops the NEXT mark → a chain that escalates. **This is the reward exploration lacked.**
- **Death & storage**: `endGame` clears `state.items` + `state.fits` (aboard/bolted-on = lost with the boat). `base.stores.items` survives death (struck below is safe) — `storeAtBase` now stows/draws items too. Save/restore for items/fits/leads + `base.stores.items` backfill.
- **KNOBS NOT FELT**: every `find`/`depth`/effect number in ITEMS; item-loot rates 16%/30%; lead distance 8-16, lead depth 600-3800 (may be too deep for a starter boat — likely wants scaling to the boat), chain chance, cache richness, fit magnitudes (sonar +1/level, depth +450/level).
- **EASY EXTENSIONS (Sean's list, add as rows/hooks)**: keys→sealed caches/rooms (hatchkey exists, no lock consumes it yet); blueprints→unlock dock builds; more fits (quieter engines, cheaper dives, bigger magazine); trade valuables at port for coin; leads that point to set-piece wrecks; a foot-bag so interior item pickups only bank on exit (currently go straight to the at-risk hold).

### ITEM PROPERTIES — tags that make a thing behave (2026-07-25). Sean: "give items properties... explode under pressure/fire/violence, cultural value, cursed by contact with the old ones."
- **`props: []` on an ITEMS row + a hook per property.** Legible in the Hold panel as colour-coded tags, so nothing is a surprise (fairness). Properties built:
  - **volatile** → `stressHold(trigger, intensity)` rolls each volatile held item on a STRESS EVENT: firing (`fireWeapon`, 0.3), diving past safe depth (`applyMoveCosts` pressure branch, scales with `over`), and a torpedo hit (`tickThreats`, 0.6). Detonation = 22-48 hull, a loud `noiseMade(6)`, item destroyed, `checkDeath`. Item: **warhead**. Carrying live ordnance deep or into a fight is now a real wager.
  - **cursed** → `hauntTick()` (in `move`) bleeds a random crew member's nerve while the item rides in the hold. **Auto-quiets when stored below** (it leaves `state.items` → not counted) and `jettisonItem()` casts it back to cure it. Item: **idol**.
  - **heavy** → `countHeldWith('heavy')` adds air/move in `applyMoveCosts`. Item: **ingot**.
  - **fragile** → shatters on a `stressHold` (0.5×intensity). Item: **salts** vial.
  - **luminous** → `effLampR()` = `LAMP_R + luminousBonus()`; widens the on-foot lamp (sweep + render + dweller-visibility all routed through it). Item: **lumen** (a passive carry — `keep:true`, no Use action).
  - **sig** → `itemWorth(key)` = `val × CULTURES[sig].mult`. **`CULTURES = {}` IS LEFT EMPTY ON PURPOSE — Sean invents the peoples.** Add `sig` key → mult and the hook lights up. idol/ingot tagged `sig:'unplaced'`.
- **Panel**: prop tags per row; **Cast Off** action (`jettisonItem`) replaces the inert label for cursed/volatile items.
- **items.test.js → 32 checks.** Property checks: volatile detonates + wounds (stable items don't), curse bleeds nerve + quiets out of hold + cure by jettison, heavy costs air, luminous widens the lamp, CULTURES stays empty, worth-hook returns face value.
- **RNG-COUPLING TRAP (fixed)**: adding item-loot rolls to `interiorAt` shifted the world RNG, and a positioning test that assumed a crewman stayed un-incapacitated across the shift went flaky ("dealt 0"). Any deterministic test downstream of a generator you touch can shift — reset the specific state a check depends on rather than trusting the seed.
- **KNOBS NOT FELT**: volatile 0.26×intensity & trigger intensities, curse bleed 0.35×n & fray 3-6, heavy +1 air/each, luminous +1 tile/each, fragile 0.5×intensity.
- **COMBO EMERGENCE (Sean will enjoy)**: the idol is cursed + luminous + significant at once — a fortune that lights your way, eats your crew's minds, and is worth a killing to a people who do not yet exist. Adding more multi-prop items is just more `props` arrays.

### THE BIG ROSTER + 5 MORE PROPERTIES (2026-07-25). Sean: "great big, diverse, colorful, dangerous, awe-inspiring, internally consistent with our mythos."
- **ITEMS is now ~34 entries**, grouped by mythos: salvaged pre-Fall tech (weldkit, oxygen candle, freshwater, hydrophone, sound-baffle lagging, trim tanks, live torpedo, flare), provisions/medicine (antivenom, hand water-still), and relic-work/the strange (salt-iron ward, still-water chime, scrying lens, black pearl, specimen jar, drowned-wax effigy, deep ambergris, scrimshaw), plus charts/keys (logbook, great bone key). Depth-gated + find-weighted.
- **5 NEW PROPERTIES, each a real wired hook (not a label)**:
  - **ward** → `noiseMade` `damp` factor: hunters + rival boats + base-threat all stoke slower per warded item. Item: saltiron. Defensive/stealth.
  - **soothing** → `holdTick()` (in move): restores a fraying nerve (negative `frayNerve`). The deep's rare mercy; counters cursed. Item: chime.
  - **preserving** → `provisionTick` multiplies drain down. Item: still. Logistics.
  - **living** → `holdTick()`: nibbles crew nerve, and rarely GROWS (`giveItem` +1). Item: specimenjar. Scary/emergent.
  - **seeing** → `seeAround()` use-effect: unmasks nearby anglers + reveals near water, silently. Item: lens (`see:true`).
- **2 NEW FITS**: **quiet** (bafflegear) → shares the `noiseMade` `damp` with ward; **trim** (trimtanks) → `-fitLevel('trim')` air in BOTH `applyMoveCosts` (deep travel — where air actually drains, 9→6/hex at 3000m) and `changeDepth`. NB: trim as a flat subtraction is negligible on dive-cost alone (floors at 1) — it was retargeted to the horizontal move cost where it bites. A knob to watch.
- **New use-effects**: `torpedo:1` (loads `state.torpedoes`, and the item is itself `volatile`), `flare` (loud radius reveal — the noisy opposite of the silent probe), `see`.
- **Panel**: PROP_TAG extended (ward/soothing/preserving/living/seeing); passive `keep:true` relics show a flavour label (a ward / a comfort / at work / carry it?); fit summary shows quiet/trim.
- **items.test.js → 40 checks.** New: ward damps interest, quieting damps rival alert, trim cuts deep-travel air, soothing steadies a nerve, a living jar stirs/grows, the lens unmasks an angler, a live torpedo arms the boat. Verified in a live browser (panel + tags + no console errors).
- ~~STILL OPEN: the CULTURES registry stays empty~~ → **SEAN INVENTED THE PEOPLES — see below.** Keys (hatchkey/bonekey) still have no locks that consume them; the keys-and-locks layer remains the obvious next content beat.

### THE THREE PEOPLES + TRADE (2026-07-25). Sean's own mythology, wired to the economy.
**Sean's canon (do not re-invent, extend only):**
- **The Children of Dagon** (`dagon`, ᛝ, deep water ≥2400 m). Breathe underwater. Fiercely protective of their god, religion, culture and relics. **Eat human flesh with great relish — it is their most desired food; corpses may be brought FRESH.** Wretched and conniving, but will trade to recover their relics. Pay the top rate (×3.6) for `sig:'dagon'` items, anything `cursed`, and relics.
- **The Confluence** (`confluence`, ⎈, shelf water <900 m) — Sean's "socialists"; **name chosen this session, rename freely (one line)**. A federation of mariners who keep each other afloat: good at hulls, health and provisioning, poor at war. Buy pre-Fall salvage & fittings (×2.1); sell patch kits, welding rigs, oxygen, water, rations, dressings, antivenom, stills, pressure-hull, hydrophones.
- **The Libertines** (`libertines`, ⚙, mid water 900-2400 m) — individualist, patriotic, xenophobic; **the best weapons and boat-parts in the sea**, and they will sell to anyone whose crates ring true. Buy ingots/warheads/relics (×1.8); sell torpedoes, warheads, sonar arrays, baffle lagging, trim tanks, flares, cold-light.
- **Mechanism**: `CULTURES[key] = {name, short, glyph, col, depthBand, creed, buys:{sigs,keys,kinds,props,relics,flesh,mult}, sells:[], markup, danger}`. `buyMult(culture,item)` unions sig/key/kind/prop matches, best wins. `sellPriceTo` / `buyPriceFrom` in CRATES (the coin of the deep). **The same idol: 22 crates to Dagon, 0 to the Confluence** — where you carry a thing decides what it is worth. That is the whole culture economy.
- **Enclaves**: `spawnEnclave(culture,q,r,depth)` on the SAME deterministic per-chunk rail as creatures (5%/chunk, `spawnedChunks`-gated); culture chosen by depth band. `state.enclaves` is overlay, saved. Drawn on the chart with the culture's glyph/colour once known. `checkEnclave()` (in `move`) fires once on arrival (`state._atEnclave` guard), logs the creed, and opens the trade panel.
- **Trade panel** (`#trade`, reuses the Hold's styling): creed, crates aboard, "They will sell" (their stock at `markup`) and "They will take" (only what they prize, at their rate, incl. relics at `4×mult`).
- **items.test.js → 52 checks.** Culture checks: differential valuation both ways, each people's specialty stock, a real sell→buy loop at an enclave, enclaves survive a reload.
- ~~NEXT BUILD~~ **BOTH DONE 2026-07-25 — see below.**

### DROWNED TUNNELS + THE CORPSE TRADE (2026-07-25). Both of Sean's Dagon asks, built.
**(1) WATER IN THE INTERIORS.** `interiorAt` now generates water as substrate on the tile: `t.wet = 'shallow' | 'drowned'`, plus `t.fall` (a waterfall through a broken deck).
- **Generation**: a watercourse between two rooms (55%) whose middle stretch drowns; a pool filling a room (40%, shallow rim / drowned heart); a fall (30%). Rubble no longer generates on wet tiles. Measured: ~460 shallow / ~170 drowned tiles per 40 decks.
- **THE POINT — drowned water is a wall to lungs and a door to Dagon.** `canBreatheWater()` = `countHeldWith('gills') > 0`. Without gills: the FIRST tap on a drowned tile is a **warning only** (`f.warnedDrown`, fair — never a surprise drowning), the second commits; crossing costs `FOOT_AIR*8` and has a 30% chance to inflict a condition + fray nerve. With gills it costs `FOOT_AIR`. **Measured 16 air vs 2.**
- **Your crew will not follow you under.** `bodyStepToward` refuses drowned tiles without gills — the party waits at the bank and you go on alone. That is the tactical teeth: loot beyond drowned water is guarded by the water itself.
- **THE LOOP THAT CLOSES IT**: the only source of `gills` is **`gillhood`, sold by the Children of Dagon** (`find: 0` — never found loose). Trade with the Deep Ones to earn the freedom of their own element. Shallow water = +1 air/step and prose; falls get their own line.
- **Render**: drowned `≈` on deep blue, shallow `~` on lighter, falls `⇊`.

**(2) THE CORPSE TRADE.** `buys.flesh` is now real.
- A hand lost **on a deck** leaves a body where they fell (`foot.dead[]`, drawn `☠`). A mind that **breaks** walks into the dark and leaves nothing — you cannot sell someone who was never a body.
- Walking onto the body takes it up → `state.corpses[{name, fresh:60}]`, and **every hand aboard loses nerve watching you do it**.
- `corpseTick()` (in move) decays freshness and periodically frays the crew ("something in the hold that used to answer to a name"). `corpseValue` = `max(3, 14 × fresh/60)` — **Dagon pay for FRESH**, 14 crates down to 3.
- `tradeSellBody()` at a Dagon enclave: pays out, and costs **every crew member 12 nerve**. It is the worst thing in the game, it is available, and it pays.
- **items.test.js → 70 checks.** Water: generation, gills gate both ways, warning-then-commit, crew refuse to follow, cost differential. Corpses: body left on death but not on breaking, recovery costs nerve, freshness decays value, the sale pays and scars the crew, and it all survives a reload.
- **KNOBS NOT FELT**: water generation rates .55/.4/.3, drowned air ×8, condition chance 0.3, corpse fresh 60 / value 14, nerve costs 4 (recover) and 12 (sell).
- **KNOBS NOT FELT**: enclave rate 0.05/chunk, depth bands, all mults/markups, relic price `4×mult`.

## CREW POSITIONING — Push B, the tactical layer that makes on-foot combat cohere (2026-07-25)
**The abstract "screening pool" is gone. Crew are BODIES on the deck, and the deep takes the nearest one — so the screen is now literal geometry.** This is what makes the rich crew-condition system (Push A) actually pay off in play.
- **Bodies**: on `enterInterior`, `deployParty(ch)` sends up to `PARTY_MAX=3` able crew over the side as bodies (`m.ashore, m.fx, m.fy, m.hold`), placed around the entry. Incapacitated crew stay aboard. `partyBodies()` = ashore & not lost. Fields persist on the member objects (saved/restored). `recallParty()` on `leaveInterior`; `loseCrew` clears the body.
- **`dwellerStep` rewritten**: the tenant targets the NEAREST body (captain OR crew), paths to it (blocked by bodies/closed doors), and wounds whoever it reaches — crew via `tenantHitMember` (a named condition + nerve fray), the captain via the air line. Stand a hand between yourself and the thing and that hand takes the blow. (The old abstract `tenantStrikesParty` is deleted.)
- **`partyStep()`** (called from `stepFoot` and `fightTenant`): a body toe-to-toe with the tenant swings its own weapon (`applyTenantDamage`); the rest follow the captain (greedy step, around bodies/walls/dogged doors) unless told to hold. Returns true if the party broke it.
- **`fightTenant` is now one ROUND of melee**: captain swings if adjacent (best weapon in the locker), then the party lays in, then the tenant answers. Board It shows when the captain OR any crew is adjacent. `applyTenantDamage` extracted so captain and every crew body drive the same break logic.
- **Orders**: tap a crew body → `toggleHold(m)` (hold this ground / fall back in). A held hand is the "Marchetti holds the throat while you flank" move.
- **Roster reads off the deck**: each body drawn as its initial, coloured green (sound) / amber (marked) / red (going), with a ring when holding. No separate panel needed — the map IS the roster.
- **interior.test.js → 137 checks.** Positioning: deploys as bodies, the screen (tenant hits the nearer crew, captain's air untouched), crew fight adjacent, follow vs hold, a positioned hand lost off the deck, recall on leave, incapacitated stay aboard, positions survive reload.
- **BUG THE BROWSER CAUGHT (headless missed it)**: a STALE captain-only reach guard at the top of `fightTenant` (`dist(tenant,captain)>1 → return`) survived the rewrite and silently blocked every crew-only engagement — "It is not within reach" forever while a held crewman stood beside the thing doing nothing. Functions worked in isolation; only a real fight exposed it. Removed. **Lesson restated: play the actual fight, don't just green the unit.**
- **KNOB/EDGE NOTE**: crew anchor to the CAPTAIN (follow), so if you stand still while the tenant sidesteps, the party can drift and combat stalls until you step toward it — intended (you lead), but greedy-pathing a bot around walls will stall; a human just walks around. Push C candidate: a "hold the deck / re-engage" pass action so you needn't move to pass a turn.
- **STILL OPEN (Push C)**: tenure — scars/traits that DO something (data already accretes); party SELECTION UI (currently first 3 able auto-deploy); stranded-on-exit = lost (currently all living crew recall safely).

## SUBMARINE vs SUBMARINE (2026-07-24) — Sean: "stealthy, hair-raising, cat and mouse, Red October, NOT a slugfest"
**The whole duel is DETECTION, and it reuses the game's existing sound grammar.** No new HP-trading — one good torpedo cripples a boat, two ends it, so nobody trades blows; you manoeuvre in the dark for the one shot that lands unheard.
- **Rivals gained a combat soul** (spawnCreature init): `hull:20`, `alert` (its fix on YOU: <30 unaware / 30-70 searching / 70+ locked), `silent`, `underPower`, `torps:3`, `reload`, `fq/fr` (last fix), `nerve` (bold vs timid), `hostile` (60% — the rest are the old salvager racers, now `tickSalvager`).
- **Mutual, sound-based detection**: `noiseMade` now spikes rival alert + sets its fix (a ping/shot/ballast/impact hands it your bearing); a **proximity sniff** in tickRival leaks your machinery within 3 hexes unless silent-running; alert DECAYS each turn (faster when you run silent — the escape).
- **The ghost**: a rival that cuts engines (`silent`) or isn't `underPower` gives NO passive contact and is NOT drawn (`rivalLocalized()` gate in render + the passive-contact `hidden` clause). You cannot fire on what you cannot place.
- **The active-sonar bargain**: `ping()` sets `revealTurns=3` on rivals in range (you see them precisely) — but the same ping's `noiseMade` spikes their alert to you. Find it and be found.
- **Firing both ways**: player torpedoes → `hitRival()` (hull; ≤8 → crippled + flees silent; ≤0 → sunk; a hit sets its alert 100 — it knows where you are now). Harpoon stays creature-only (won't hull a boat). Rival → `rivalFires()` pushes a `state.threats` torpedo with a 2-turn fuse and a loud WARNING that always reveals the shooter (fair).
- **Evasion / `tickThreats()`** (called top of creatureTick): the fish runs to its aim and detonates on turn 0. **Break the solution** by opening the range (2+ hexes), **changing depth** (>1 slice), or a **decoy** (buoy within 2 of the aim reseats the fish onto it). Torpedo drawn as a red `◄` — a running fish is always visible, the one mercy.
- **Persistence**: `state.threats` saved/restored/reset. Rivals ride in state.creatures.
- **Tests**: creature.test.js +20 checks (ghost, noise→alert, silent-escape, locked-fires, hit/miss/depth/decoy resolution, hitRival cripple/sink, no-fire-on-ghost, crippled-runs, threats survive save). Full duel verified in a live browser: ping→localize→it fires→evade by range→counter-kill in 2. No console errors.
- **KNOBS NOT FELT**: `hull:20`, `RIVAL_TORP_RANGE:3`, alert bands 30/70, decay 3/7, sniff 30/14/6, fuse 2, torpedo hit 34-54, hostile rate 0.6, decoy seduce radius 2.
- **THE PvP SEED**: this is single-player vs an AI boat, but the detection/threat model is exactly what async-multiplayer rival raids will reuse.

## THE WATER, DESCRIBED (2026-07-24) — Sean's "more English" ask, and the air fix
**Sean died of asphyxiation because nothing ever told him where air comes from.** That is a teaching failure, not a tuning one. Ruling taken: **no scripted tutorial yet** (it would go stale every stage); instead the game teaches diegetically, out of world state, which does not rot.
- `describeSpace(mode)` builds Infocom-style room prose from REAL voxel geometry — `spaceAround()` counts open neighbours at this depth, sounds the column up and down, and checks what the chart knows. `spaceClass()` names it: surface / shaft / tunnel / junction / expanse / deadend / nook / pocket.
- **Constitution holds at prose level**: what is known is stated, what is not is HEDGED (`HEDGE[]`, fired only when ≥2 open ways are uncharted, and only 35% of the time — said every time it stops meaning anything). Known-ness is counted over OPEN neighbours only; counting it over all six made the boat hedge about walls.
- `mode:'first'` is **hash-stable per place** so the world feels solid; `'again'` is loose so a second LOOK finds new words. Full description on first arrival, 40% on re-entry, 55% on depth change.
- **`#btn-look`** — free LOOK action. Ashore it calls `describeDeck()` instead (open sides, how close the water is, whether the tenant is near).
- **`airCounsel()`** — four rungs (50/30/15/7%), each fires once, each says what to DO ("the tanks refill three ways: at the surface, at trapped gas pockets, and on cavern beaches"), and the ladder re-arms after a refill. Verified firing in order and re-arming.
- **TRAP**: a "dead end" was being reported with open water above and below it — `spaceClass` must treat any vertical opening as a way on. That was a logic bug the prose exposed; read generated text as WRITING, not just as code that runs. `scratchpad/prose-sample.js` dumps a wide sample for exactly this.
- ~~**walls when you strike them**~~ DONE (WALL_FACE/UNDER/OVER). **Prose tables WIDENED 2026-07-24** by a Sonnet subagent (123 new lines): SPACE_FIRST every key→10, SPACE_AGAIN every key→6, DEPTH_MOOD every band→8, WALL_FACE→20, WALL_UNDER/OVER→8, HEDGE→8. Voice held indistinguishably; verified via `scratchpad/prose-sample.js`. **This is the model for cheap content work: a Sonnet subagent against a fixed schema + a review pass.** 36 TENANT look/hurt/near alternates sit COMMENTED in `scratchpad/prose-expansion.js` — wire them in when you want the tenant lines to vary per-encounter (they are single strings today).
- **Still wanted**: weather/current prose, interior room prose per room type, per-encounter tenant line variation (alternates ready).

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
5. ~~**Digging**~~ **DONE 2026-07-24** (carve; see below). "Fitting" (furniture) still open.
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
- **THE BOARDING (built 2026-07-24, closes the two-layer siege)**: a forced lock no longer resolves abstractly — the besieger comes IN. `BOARDER_AS` maps its water-type to an interior tenant kind (eel→whisper, silt→hollow, lurker→clutch, baro/hulk→warden); `boarderFrom()` makes it siege-grade (×1.3 tough). `breachStation` marks the besieger `gone`, sets `base.boarder = {kind, tough, hurt}`, and — if the captain is standing in the station — drops the tenant in the room then and there. `enterInterior` places `base.boarder` as the dweller on re-entry (overrides substrate tenant). `fightTenant` mirrors `hurt` back to `base.boarder` each swing (survives fleeing mid-fight) and clears it on kill. `repumpStation` refuses while a boarder lives. So: a taken station is flooded AND occupied; you must put the thing down (Board It, in rising water) before you can Repump. **interior.test.js is now 95 checks**; the full arc verified in a live browser (baro besieger → warden boarder → 6 rounds with a relic lance → repump). KNOBS: `BOARDER_AS` mapping, ×1.3 toughness.

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
