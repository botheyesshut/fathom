# FATHOM — START HERE (last updated 2026-08-05)

## THE STRIKE (2026-08-05) — the fast way, and it asks a different question

The drive is a good puzzle and it is ten to sixteen taps. Playing all of that for
a school of mackerel worth fourteen is a chore, and a game that makes you do a
chore for small money teaches you not to bother with small money. So there is a
fast way — and per his standing rule there is not a die anywhere in it.

**What it asks instead is WHICH TOOL.** You do not net a marlin and you do not
harpoon a shoal, and every quarry's `tell` — the line the Ear reads out when the
lines go over — says which it is if you are listening:

| tell | tool |
|---|---|
| "a shoal of small silver, turning all at once" | **net** |
| "something heavy and unhurried, close to the bottom" | **line** |
| "a bill and a shadow, and it has already seen the lamp" | **harpoon** |

Right tool and you have it that turn. Wrong tool and it is gone — **but you keep
what you learned**, which is the whole difference between a knowledge check and a
coin flip. `state.lore` remembers per species and the card shows what the boat
knows: a tool already disproved goes grey and reads *"Tried on this before. Not
this."*, the proved one turns green and reads *"This is the one."* The same
mistake is never available twice. It is the chart rule applied to fish — the boat
shows only what the boat could know.

### And it is worse than driving, on purpose

Or nobody would ever drive again and the puzzle beside it would be dead content.
A struck fish is a damaged fish. Measured, every species:

```
  quarry       right tool   driven   struck   share   loud
  mackerel    net             14       11     79%     silent
  herring     net             18       14     78%     silent
  cod         line            26       16     62%     silent
  tuna        line            44       26     59%     silent
  swordfish   harpoon         52       26     50%   heard 32
  marlin      harpoon         70       35     50%   heard 32
  shark       harpoon         58       29     50%   heard 32

  every species pays less struck than driven, so the drive still has a reason.
```

The gradient is fiction, not tuning: netting a shoal is simply the right way to
take a shoal, so it costs almost nothing (79%); a harpooned marlin bleeds out on
the line and you land half of it. And the harpoon **trades silence too** — it is
a gun, and `noiseMade` does not care what you were pointing it at, so the fast
way on the big fish is also the loud way. That hooks straight into the water
economy built the same day: the boat that shouts for its dinner is the boat
something finds.

So the trade has a shape: *mackerel — strike, obviously. Marlin — 35 now and
loud, or 70 over fourteen taps at eight-in-twelve odds.* That is a decision.

### Verified in a browser, not just headlessly

Netting a marlin: 0 taken, hunt over, lore records `bad: ['net']`. Harpooning it
next time: **20 → 55 stores**, a lurker two hexes off goes to interest 40 on the
shot, lore records `good: 'harpoon'`, and the log says *"A marlin comes aboard —
35 against the 70 a clean drive would have made."* The cost is named in the same
breath as the prize.

**The shark's rule is shared with the drive** rather than written twice: struck,
it still comes up the line fighting and takes the nearest hand — but only if your
people are in the water. Take it from the boat with nobody over the side and it
is clean, which is a real interaction with the "hands over the side" cost built
an hour earlier.

### Where it lives

Offered as a card the moment the fish is sighted, because a captain who does not
know the fast way exists will play the whole positioning puzzle for a mackerel
and conclude the game is tedious. **Dismissing the card is how you choose to
drive.** A `Strike` button keeps it reachable afterwards, so setting two hands and
then thinking better of the whole business is allowed.

### The bug it shipped with for ten minutes

`STRIKE` is a `const` declared above `WEAPONS`, and it read `WEAPONS.harpoon.loud`
into its own table — so the file threw *"cannot access WEAPONS before
initialization"* the instant it was evaluated, and took three suites down. Exactly
the temporal-dead-zone trap `STARTING_ARMAMENT` fell into. **The syntax check
passes either way; only running it says so.** Resolved lazily now via
`strikeLoud`, so the gun still owns its own loudness.

*(And then I made the identical mistake inside `tests/quarry.js`, using `keys`
above its own declaration. Twice in one feature.)*

### Knobs

`STRIKE.net.yield` 0.75 · `.line.yield` 0.60 · `.harpoon.yield` 0.50 ·
`QUARRY[k].tool` — retagging a species is one word and changes the whole answer.

---

## WATER, AND THE PRICE OF IT (2026-08-05) — built after the ocean got big

Water is its own tank now, and what it costs is **silence**.

### Why a second meter is allowed to exist

Sean's standing instruction is a minimum of clutter, so the bar for a new
resource is high. The rule it had to clear: **it must ask a DIFFERENT question
from the first one.** Food already costs TIME — you go up to the sunlit water and
work the drive for it. If water also cost time, it would be the same errand
twice and the game would be poorer for owning two of them.

So water costs being heard. The Erebus distils her own; every submarine does. The
still is a hot, thumping thing in a steel hull and it goes through `noiseMade` —
the same door a ping goes through — so a boat making her own water is stoking
every lurker and rival captain in earshot and raising the threat on her own
station. **You are never obliged to come home for water. You are obliged to
choose**: run dry and quiet, or drink and be found. That keeps it clear of his
ruling that a person who just wants to explore should be able to.

And it turned out not to be a fourth meter at all. `state.stores` had existed for
months and was **drawn nowhere** — it appeared in log lines and nothing else,
which is most of why provisions never mattered to anybody: you cannot ration what
you cannot read. One HUD cell now carries both, the number being whichever of the
two is in more trouble, with two hair bars saying which.

### The numbers

| | |
|---|---|
| `WATER_DRAIN` | 0.6/turn — a full tank is **167 turns** |
| `STILL_MAKE` | 1.6/turn, so net +1.0 while it runs |
| `STILL_NOISE` | 2 — a ping's loudness scale |
| `STILL_AIR` | 0.5/turn, because it runs off the boat |
| median run to a harbour | 26 turns (after the spread) |

Measured over 10 voyages x 260 turns, the same course sailed twice:

```
  still OFF   ran dry in 10/10 voyages (median turn 166)
  still ON    ran dry in  0/10
```

**And the load-bearing claim, measured rather than asserted:**

```
  attention on you, still OFF   0.0
  attention on you, still ON  550.0
```

The first version of `tests/thirst.js` reported **0.0 against 0.0** — it cleared
`state.creatures` and then asked how alarmed the creatures were. It was measuring
an empty ocean, and a slightly more confident probe would have called the whole
feature proven. It now places witnesses on purpose and refuses to print a verdict
when it sees nothing. Confirmed live in a browser too: a lurker three hexes off
goes 0 → saturated interest in ten turns of distilling.

### Weather, and why it is not a minigame

He floated storm-chasing as a second minigame. The hunt is a week old; a second
placement puzzle at the surface makes food and water the same errand twice, and
he had already thrown out the arcade hunt on exactly that ground. So weather is
ONE FACT with consequences hanging off it, and the chasing falls out of the fact.

**The whole sky is one field sliding past on the prevailing wind.** Storms are
not spawned, tracked or stored: rain at (q, r) on turn N is a pure function of
the seed sampled at a point offset backwards along the wind by N. The substrate
law holds, nothing is written down, it costs nine hash lookups, and weather never
runs out or repeats — which a fleet of storm objects could not manage in an
infinite ocean.

In rain the still needs no heat and makes no sound, and fills faster. Measured in
the browser, ten turns each:

| | water | lurker interest | air |
|---|---|---|---|
| in rain | +29 | **0** | **0** |
| out of rain | +10 | **100** | 5 |

**Rain is only visible from the surface** — 35 rain hexes drawn at depth 0, zero
at 240 m. That is the epistemic law doing the design's work for it: to find
weather you must surface, and the surface is where every hull afloat can see YOU.
The trade needed no new mode to say it.

*The wind had to be four times faster than it looked right in the source.* At 0.06
hexes a turn a front sat over one hex for **524 turns** — measured — which is not
weather, it is a climate, and a captain would have read the rain as a fixed region
of the map. At 0.34/-0.19 a front passes in about 60 turns.

### Also

- **The hand water-still finally means what it is called.** `still` has been in
  the item table for months as "a hand water-still" whose only effect was making
  FOOD last longer, because there was no water for it to make. It now trickles
  0.25/turn, silently, with no air — not enough to cover the drain of 0.6, so it
  buys a deep expedition more rope without retiring the decision.
- **Quays fill the tank for nothing** ("it costs nothing but the asking"), and a
  claimed station's catchment has been filling the whole time you were away.
- **A cask of fresh water is water now**, not 60 points of biscuit.
- **Old saves need no migration.** `boatWater()` reads 100 when the field is
  absent and the first tick writes a real value — verified against a save with
  `water`, `still` and `inRain` deleted outright.
- `vigorMult` takes the WORSE of food and water rather than averaging, so a full
  larder can never hide an empty tank. `interior.test` caught the change the
  moment it landed, because it pinned only one of the two tanks.

### Knobs

`WATER_DRAIN` 0.6 (set it to 0 and the whole feature is off) · `STILL_MAKE` 1.6 ·
`STILL_NOISE` 2 · `STILL_AIR` 0.5 · `STORM_CELL` 34 · `STORM_CHANCE` 0.62 ·
`WIND_Q` 0.34 / `WIND_R` -0.19

### AND THEN THE TWO COSTS I HAD PROMISED AND NOT BUILT

Both of these were the missing half of a trade already shipped, which is worse
than an unstarted feature: the benefit was live and the price was a comment.

**"More crew is better but leaves the sub less protected."** His condition on the
hunt, built at last. The choice was always the player's — a hand only goes over
the side when you tap one into the water — it simply cost nothing. Now a hand in
the water is not at their post, and `crewLvl` skips them. Measured:

```
  hands in the water: 0   hand 1   gun 1   ear 1
  hands in the water: 1   hand 0   gun 1   ear 1
  hands in the water: 2   hand 0   gun 0   ear 1
  hands in the water: 3   hand 0   gun 0   ear 0
```

Send three and you will take the marlin, and for as long as it takes the Erebus
is a deaf, unarmed tube with two people in it. Indexed into `state.crew`, never
matched by name — two hands can share one, and that exact bug cost an afternoon
in `delve.js`. You also cannot dive away from your own people any more; without
that the boat could sink away from an open hunt and leave three hands floating at
the old depth, still drawn, still driving a fish on a chart she was no longer on.

*Found on the way:* `crewLvl` returned **NaN** for any crew member without an
`xp` field — one such hand would have made the whole boat's competence NaN.
Hardened to `(m.xp || 0)`.

**"Collect rain at the surface while a little defenceless."** Rain shipped as
pure gift; the only price was being visible to shipping, which is what surfacing
costs anyway and not what the WEATHER charges. A sea running under her now works
her seams — `STORM_HULL` 0.22/turn. Measured in a browser: **8.8 hull over 40
turns** lying in a storm, and **0** at sixty metres down. Entirely avoidable by
diving, and diving is exactly the thing that stops the water coming in. Both
sides of the trade exist now.

### Still open

- ~~**The strike**~~ — BUILT 2026-08-05, see the entry at the top of this file.
- The **ghost thread** (Angelshark #22), recorded not built.
- **Angelshark #12** — a brown passable hex in a tunnel; never reproduced.

---

## THE OCEAN GETS BIG (2026-08-05) — and there is no water in Fathom

Sean asked two things: silence the game when I am driving it remotely, and
"deal with water collection", proposing a weather system, storm-chasing, a
Dune-style windtrap, or spreading the ports out.

### The premise was wrong, and the measurement is the answer

**There is no water in Fathom.** There is ONE meter, `state.stores`, and food and
water are the same number inside it. The dock line reads *"Stores off the quay —
bread, water, oil."* A cask of fresh water is an item that adds 60 to the larder,
exactly as a case of rations adds 45.

And that meter could not be made to matter:

| | |
|---|---|
| larder drain | 0.4/turn → **250 turns** full to empty |
| ports within 60 hexes of the dock | ~84 |
| median gap between harbours | 12 hexes |
| **open water → nearest port** | **median 9 turns** |

You carried twenty-seven times more supply than the longest run to a shop. Any
water mechanic built on top of that would have been a system nobody ever feels —
so the ratio had to change before anything else was worth building. He chose
that, and no new meter.

### Spreading them

`ISLE_CELL` 16 → **54**, `ISLE_CHANCE` 0.7 → **1.0**. Every island carries a
harbour, so island spacing IS port spacing. Swept over 8 seeds:

```
  cell 16  chance 0.70   84 ports   gap 12   turns  9   <- was here
  cell 26  chance 0.70   31         gap 20   turns 15
  cell 46  chance 1.00   15         gap 32   turns 21
  cell 54  chance 1.00   11         gap 38   turns 26   <- here
  cell 60  chance 1.00    8         gap 43   turns 28
  cell 70  chance 1.00    7         gap 52   turns 33
```

**The chance went to 1.0 on purpose.** The old comment in that spot recorded the
exact failure spreading invites — at cell 26 with chance 0.7, *"ONE SEED HAD NONE
AT ALL"*. A coin flip skipped at cell 16 costs an island; skipped at cell 54 it
costs a void 54 hexes wide. So the randomness came out of the lattice and the
emptiness comes from the cell being big, which cannot fail. Not a hard guarantee
and it is not written as one — `islandRoll` still rejects candidates on the
southern landmass, in shallow water, or inside the home bay, all geography rather
than chance. Measured: the emptiest of 8 worlds still held 9 harbours within 70
hexes.

Nor is it a grid — the jitter is a full cell wide, so measured gaps run 11 to 96
against a cell of 54. A lattice you could see would put every gap at 54.

**Worst case is what decides whether this is cruel**: the furthest sampled water
sat 101 turns from a harbour, against a larder of 250. A long crossing is now a
thing you provision FOR and never a thing that strands you. The home dock is
untouched — banking still works from one hex away, and the first hour measures
unchanged (0 deaths in 40 cold boots, 0 hull lost to land).

### It emptied the sea of ships, and the battery had nothing to say about it

`moved.js` caught what 18 green suites could not:

```
  tied up beside a harbour   58%  -> 21.4%
  alone in open water      27.7%  ->  0.0%
  hulls afloat: median 6 -> 1, and a low of NONE
```

Both ends of a shipping route were drawn from `SHIP_RANGE` = 26: the origin had
to be within 26 of the BOAT, and the destination within 26 of the ORIGIN. At a
median gap of 40 neither usually exists. The whole encounter layer — the fleets,
the Pirates! flow, "another boat is somebody" — went quiet, silently, because
nothing in the battery counts sails.

Fixed by separating two questions that had shared one number:

- `SHIP_RANGE` 26 stays PERCEPTION — how far off you could tell there was a ship.
- `SHIP_LANE` 90 is TRADE — how far a harbour will send a hull.
- A hull whose harbour is over the horizon now **enters the world underway**, at
  the point where her course crosses into your water, already at sea and already
  going somewhere. When the quay is close she still casts off from it, so the old
  behaviour reads exactly as it did.
- `shipStepToward` was extracted so the spawn walks the course by the same
  arithmetic the mover sails it — otherwise she appears on a hex her own route
  never visits.

### The instrument had to grow a category

After the fix, traffic read 76.1% beside a harbour and still **0.0%** in "open
water" — and that was not a regression. `traffic.js` picks the single most remote
hex it can find; at cell 16 that meant about thirteen hexes off a quay, and at
cell 54 it means sixty-odd. **The instrument quietly changed what it was asking
while its label stayed the same** — the same mistake as the `flip` perf workload,
twice in one day.

Nobody should meet shipping in the emptiest water in the world, so that reading is
kept as the floor. What was missing was the case a captain is now in most of the
time: CROSSING, on the line between two harbours that trade. Added, and it reads:

```
  tied up beside a harbour   76.1%
  crossing between two       19.9%
  alone in open water         0.0%
```

Harbours busy, lanes carrying real traffic, the empty places genuinely empty —
which is the thing he actually asked for: "I like the creepy aspect of lots of
space in the ocean."

### The theme song

The mute existed and the music honoured it; the DEFAULT was the fault. `false`,
and a preview server is a fresh origin that has never stored a preference, so
every reload came up loud. Now the origin decides: `localhost`, a bare IP and
`file://` default to silent; `botheyesshut.github.io` does not. His phone loads
the second and cannot reach the first. An explicit toggle still wins both ways.

The first version was unguarded and took down three suites — a throw at the top
level of a 20,000-line script does not fail loudly, it aborts the rest of the file
and something dies thousands of lines away with "cannot access saveTimer before
initialization". Not every harness stubs `location`, and none of them needs to.

### Knobs

`ISLE_CELL` 54 · `ISLE_CHANCE` 1.0 · `SHIP_LANE` 90 · `SHIP_RANGE` 26 ·
`SHIP_CAP` 7 · larder drain 0.4/turn

### What this unblocks, and what I would build next

Water can now be made to matter, because distance finally exists. The shape I
would give it, unbuilt and his call:

- **Water becomes its own resource** only if it makes a DIFFERENT decision from
  food. Food already costs TIME (the hunt). Water should cost SILENCE — a still is
  loud and hot, and loud is how things find you. That is the axis this game models
  most deeply (lurkers, decoys, the thermocline) and spends least.
- **Weather as a MODIFIER, not a minigame.** Storm cells drift; rain makes the
  still fast, free and silent; the surface in a storm is exposed and beats the
  hull. Storm-chasing behaviour with no new game mode — which also keeps the
  style, the same objection that killed the arcade hunt.
- **No second minigame.** The hunt is a week old. A second placement puzzle at
  the surface makes food and water the same errand twice.
- The open risk to say out loud: a fourth survival meter beside air, hull and
  stores, against his standing "I want a minimum of clutter".

---

## THE HUNT — built 2026-08-05, and it took three designs to find one that works

Sean asked for "a '20,000 Leagues Under the Sea'-style minigame in which captains
can go to the Sunlit Zone (160 m or higher) and go hunting... more crew is better
but leaves the sub less protected", and then threw out two designs, correctly:

- **push-your-luck dice** — *"I'd much prefer something that could be considered
  both intellectually challenging in some mild way and also not luck based. A game
  where I just need to hedge bets to win is not really a game to me."*
- **an arcade variant** — he had misgivings about the style break himself, and the
  game has 65 click handlers and zero frame-timed input. It would have been the
  first real-time thing in a turn-based text game.

His rule is the best idea in the feature and it is what the whole thing hangs on:
**speed in ratio to value.** *"there's more meat on a marlin than on a netted
school of mackerel."* So difficulty needs no knob — the reward IS the knob.

| | move | stores | |
|---|---|---|---|
| a school of mackerel | 0 | 14 | the tutorial catch |
| a run of herring | 0 | 18 | |
| a cod | 1 | 26 | |
| a bluefin | 2 | 44 | |
| a swordfish | 2 | 52 | |
| a shark | 2 | 58 | **cornered, it goes through the nearest hand** |
| a marlin | 3 | 70 | the fastest thing in this water |

No dolphins, no turtles, at his instruction: *"people won't like that."*

### The first build was unwinnable, and no suite in the battery would have said so

Hands chased. Every function was defined, every function was called, the syntax
was clean, `run-all` was green — and a headless driver measured this before a
human ever touched it:

```
  mackerel   move 0  ->  unresolved after 24 turns
  cod        move 1  ->  escaped
  tuna       move 2  ->  escaped
  swordfish  move 2  ->  escaped
  marlin     move 3  ->  escaped
  shark      move 2  ->  escaped
```

Two faults, both fatal and **neither tunable**:

1. A hand swims one hex and a marlin swims three. Pursuit is arithmetic you lose.
2. "Caught" demanded all six neighbours blocked — three hands and a hull can block
   four. *Nothing* could ever be caught, including a mackerel that never moves.

**Reachability is not playability.** This is the same family as the 3% on-foot
coverage hole: content wired at both ends, believed to work, never measured.

### What it is now: an ambush

The hands stop chasing. **The fish cannot see them** — they are quiet, in the
water, with nets. What it sees is the boat, and it only runs when you make it.

- walk hands out and it holds still for you;
- come inside two hexes and it notices *that* hand and starts routing round it, so
  a net laid carelessly pushes the fish away from your other nets;
- when ready, **DRIVE IT**. It bolts `move` hexes away from the boat and from
  every hand it has noticed. If the run takes it alongside a net, that net has it.

You are not catching the fish. You are choosing where it will decide to go. Not
one die is rolled anywhere in it, which was his condition.

`tests/quarry.js` plays it with a competent-not-optimal captain over 12 grounds a
species — placements tested against the real `huntSpook()` by snapshot-and-restore,
so nothing in the instrument re-implements a rule it is checking:

```
  mackerel  12/12    cod   12/12    tuna  9/12    marlin 8/12
  herring   12/12                   sword 9/12    shark  9/12
  overall  85% caught, 15% escaped, 0% lost to the cold
```

Read that as a floor. The ladder is monotonic in speed, which is the whole rule
made real, and nothing sits at 0/12 (a tease) or 12/12 above move 0 (free food).

**The arena cannot shrink.** Margin must exceed the fastest bolt or nothing fast
is catchable: arena 5, start ring 2, marlin 3. Measured — arena 4 puts the marlin
at 0/12.

### Three things measurement caught after that

- **A fished ground never emptied.** `quarryHere` is a pure function of the hex, so
  one lucky tile fed the boat forever — a vending machine, the exact shape of
  exploit `greed.test` exists to refuse. Now a ground rests `HUNT_REST` = 400 moves.
  *(And the first patch for it cleared the ledger at all six `state.hunt = null`
  sites, including every hunt ending — which would have wiped the record after
  every catch. Only the two campaign restarts should clear it.)*
- **`getTile` where it needed `tileAt`.** `getTile` is a raw cache read; the arena
  reaches five hexes off the hull, across chunk borders the boat has never visited.
  Every one of those hexes read as undefined and therefore as ROCK — the drive
  refused to start in open sea and the quarry fled from walls that are not there.
  Found by `orders.test`, which could not reach the hunt briefing from anywhere in
  twelve rings of ocean.
- **The puzzle was played off the edge of the screen.** Measured in the browser at
  375x812, which is the phone this game is actually played on: at the sea's 16 px
  hex, ring 4 of the arena is 4 of its 24 hexes visible and ring 5 — the line the
  quarry escapes across — is **0 of 30**. The camera now pulls back to an 8 px hex
  for a drive and puts the whole arena on screen (ring 4 24/24, ring 5 30/30) with
  a 34x39 px tap target. One line in `render()` decides the scale, so no ending has
  to remember to put it back.

### Also done in the same pass

- **Shelf wrecks now pay less**, which was an open item flagged in the source for a
  week. A hull `maybeShelfWreck` puts in the sunlit shelf carries a `picked` flag
  and holds markedly less: shallow, visible, worked by a century of people with
  better boats than yours. Measured at **0.51x** the value of an unpicked hull at
  the same depths. That is what turns +19% placement into a redistribution rather
  than a raise.
- **`tests/picked.js`, and why it had to exist.** When the yield change landed,
  `moved.js` reported *nothing moved* across nine instruments and 136 numbers — not
  because the change was dead, but because **not one of them ever opens a wreck in
  shelf water**. "Nothing moved" reads exactly like "nothing happened". It is in the
  FAST list now.
- **The `flip` perf gate stopped being flaky** — it straddled 60 ms and failed about
  half the time on unchanged code, which teaches you to skim past a red battery.
  Best of three now, 46-49 ms. *(Worth recording: the first attempt at that fix
  built a cold context per pass and skipped the origin burst, so it timed a heavier
  job than the threshold was ever set against, failed three times running, and
  looked exactly like a real regression. Reducing a measurement's noise must not
  change what is being measured.)*
- A **`hunt` briefing card**, driven to its own scenario in `orders.test` — that
  suite fails any card a player cannot reach, and it caught this one twice (once
  unreachable, once as an 852-character wall of text).

### Knobs

`HUNT_ARENA` 5 · `HUNT_HANDS` 3 · `HUNT_NOTICE` 2 · `HUNT_TURNS` 16 ·
`HUNT_REST` 400 · `HEX_SIZE_HUNT` 8 · `SUNLIT` 160

### Still open, honestly

- ~~**The strike**~~ — BUILT 2026-08-05, see the entry at the top of this file.
- **More crew is better but leaves the sub less protected** — the second half of
  Sean's sentence. Hands in the water are not yet absent from anything that
  matters aboard, so the trade he asked for is not real yet.
- The shark's bite is a rule and not a roll, as intended, but it has only ever
  fired in a sandbox. Nobody has been hurt by one on a phone.

---

## THE SUNLIT ZONE IS EMPTY — measured 2026-08-05, and it reframes the hunt

Sean asked for a 20,000-Leagues hunting minigame in the Sunlit Zone (<=160 m)
and noted, as lore, that "there would be more sunken vessels on the shelf at
this level than any other because of all the highly visible traffic and war at
the surface."

**Measuring that turned up something bigger.** Prizes are attached to cave
CHAMBERS, and the shelf has none:

| | |
|---|---|
| hexes with open water at 0–160 m | **3,898 of 4,628** (84%) |
| prizes anywhere at or above 160 m | **0** |
| shallowest prize in three seeds | **480 m** |

So the sunlit zone is real, large, swimmable, crossed constantly on every
transit — and held nothing at all. My first pass at his note was a weight
multiplier inside `prizeTypeAt`, which reweighted a set with no members: dead
code that measured, correctly, as a no-op. `maybeShelfWreck` now PLACES them,
in Step 1 of `ensureChunk` beside the shelf water, deterministic per hex.

**And the density had to be measured, not felt.** The first rate looked modest
in source and `moved.js` read it as **113 → 179 prizes, +58%** — most of it in
the easiest water in the game to reach, which is a wage. Settled at 0.0015:
113 → 135, about +19%, filling empty water without touching what the deep is
for. **Still open and honestly so:** a shelf wreck pays what any hull pays, and
it should pay LESS — picked-over water, sunk in sight of shore. Yield, not
placement, and not done.

### THE HUNT — designed, not built

`QUARRY` is in the source: mackerel/herring (move 0) through cod, bluefin,
swordfish, shark, to marlin (move 3). **Sean's rule, and it is the good one:**
speed is in ratio to value — "there's more meat on a marlin than on a netted
school of mackerel" — so difficulty scales with reward by nature and the hunt
needs no separate difficulty knob. No dolphins, no turtles, at his instruction.

He rejected push-your-luck outright: *"A game where I just need to hedge bets to
win is not really a game to me."* The agreed shape is two puzzles, neither
dice-driven:

1. **THE FIX.** Passive listening gives BEARING ONLY (the game already reports
   contacts this way); a ping buys range but shouts. Two bearings from two
   positions intersect. The patient play is the quiet play; impatience is what
   draws danger — risk is player-generated, not rolled.
2. **THE DRIVE** (proposed, awaiting his word). Hands are placed; the quarry
   moves away from the nearest hand by a stated rule, `move` hexes per turn.
   You corner it against the hull, a kelp bed, or a wreck. Deterministic
   tie-breaks so a good player can predict perfectly. A shark, cornered, turns
   on the nearest hand — the risk is a RULE, not a roll.

**The knot:** shelf wrecks are the terrain you pin fish against, so his lore
note and the minigame are the same feature. You fish above the dead.



## PLAYTEST ANGELSHARK (2026-08-05) — Sean's 22, and what became of each

His first real session with the cards/captions build. Numbered items, his
numbering. Root causes collapsed several: **8/15/18 were ONE bug** (checkLeads
ran on horizontal moves only, so DIVING onto a mark arrived unannounced; the
"flag beside the spot" was the announcement firing one sideways step later).

| # | finding | disposition |
|---|---|---|
| 1 | DOCK dead on first screen | FIXED — home pier absent from `ports`, so `dockHere` returned silently. Home answers now; out-of-reach says why |
| 2 | tutorial claims arrow movement | FIXED — card says tap-adjacent / tap-far-sets-course, which is what the game does |
| 3 | boot message is chart philosophy | FIXED — boot line is now a bearing to the pier; the creed survives as the `chart` tip |
| 4 | dock brief after one hex | LEFT — he judged it fine |
| 5 | ▲▲ teleported him into Port; Boring Rig row shattered | FIXED both — the Port WINDOW only opens alongside (banking at ≤4 hexes stays); `.prow-b` capped at 44% width + why-string shortened |
| 6 | "three crates" → "nothing" | FIXED |
| 7 | Tips belong as popups | FIXED — tip() queues into the same card window as the briefings, one per turn, never over a panel; titles authored per tip |
| 8 | wreck arrival unannounced | FIXED at root — `checkLeads()` now runs on depth change |
| 9 | crew should sound like people | FIXED — helm lines through the Mate ("Course made good, cap'n"), screws report in the Ear's voice; mate.test allows HELM |
| 10 | BUY on missions | FIXED — Sign / Collect / Hand back / Sign on |
| 11 | captions title-case; can be poetic now | FIXED — all 48 rewritten as prose; window wraps at min(72vw,21rem); tests guard the NEW ruling (≤72 chars, no Title Register) |
| 12 | brown passable hex in tunnel | OPEN — not reproduced from the report. Best hypothesis: a stack-prize hex charted at that depth for the first time paints its prize tile colour where plain tunnel had drawn. NEEDS his seed + position next sighting |
| 13 | LOOK repeats the Ear | FIXED — second LOOK in unchanged water draws from a look-again pool |
| 14 | "something is close" opaque, blocks helm, often false | FIXED — hazard needs an AWAKE contact within 3 depth bands, and the refusal names a bearing |
| 15 | mark beside intended position | = #8 |
| 16 | screws heard, sea empty on surfacing | FIXED — report now carries range ("about 1.3 km"), so the expectation matches the weather-model ships |
| 17 | ping prose → sonar info | FIXED — "Sounder: hard floor… Break in the floor N, 300 m." |
| 18 | "Whatever is here" for a KNOWN posting | FIXED — a board posting is named ("The wreck the board posted lies 240 m below — take her down to it") |
| 19 | surface screws audible at 600 m | FIXED — gated by passiveContactR(0,…), the same hearing model as every other contact |
| 20 | floor drawn at cave ceiling | FIXED — in the LEGIT roof/column block: pressed to the top of a tight chamber, stone wins the tie. (My first fix was an early return that drew lids over cathedrals — the columns mistake again; the cathedral check caught it before it shipped) |
| 21 | motionless anchor, no interaction, wrong porthole | FIXED ×3 — a harbour introduces itself once in the Mate's voice when first sighted; alongside a FOREIGN port the porthole shows the harbour; HAIL-at-6-hexes is the separate, working merchant encounter |
| 22 | deaths as a ghost-game plot | RECORDED below. Not built |

**#22, THE SEED (his):** "I like that we just keep coming back. This is not
unlike Torment. We could make a plot out of this. It could be a ghost game."
The material is already half-present: the respawn line is "another boat on the
same sea", lost crew persist as hollow men wearing the uniforms you issued, and
`state.lostCrew` survives the boat. A plot that OWNS the looping — the sea
keeps you, and the game slowly admits it — costs prose and a thread, not
systems. Strong candidate for the next design conversation.

**DOOR FOLLOW-UP (same day, browser-proven):** entry into a wreck/ruin was
ALSO horizontal-only — and the vertical gate that did exist (changeDepth, "the
prize is at a depth") keyed on `tileHere.poi`, which the first visit consumes
while the stack entry stands for ever. So a REVISIT that arrived by diving found
no door. Fixed at that gate (stack-aware), with a `_noReboard` latch so leaving
an interior does not re-board on the next bob of depth; one horizontal step
re-arms the door. Verified live, five cases: first vertical entry, clean leave,
latch holds, horizontal re-board, vertical revisit. My first fix was a redundant
block around the WRONG joint that never fired — deleted, not patched.

**THE EREBUS SAILS ARMED (2026-08-05).** Sean: "I don't know how submarine
battles actually work because the starting sub comes out unarmed. I'm wondering
if that's really best. I think maybe it isn't." He is right, and for this
session's recurring reason: `btn-fire` HIDES on an unarmed boat, so a new
captain never learned the verb existed — combat was wired at both ends with
nothing in the middle. Buying a weapon for a fight you have never seen is a
purchase nobody makes.

The harpoon, not the torpedo, deliberately: adjacent-only (you must already be
in trouble), loud (using it calls more), and `fireWeapon` refuses to point it at
another boat — "it takes beasts, never a hull" — so boat-against-boat stays
something you deliberately arm for. At power 6 it settles a shoal (3) or an eel
(4) and merely ANGERS a lurker (10), so "violence is rarely the answer" is now
taught by letting a captain try it. Knob: `STARTING_ARMAMENT = null` restores
the old start. A `teeth` briefing fires the first time something is alongside.

`STARTING_ARMAMENT` is declared ABOVE the state literal on purpose — the literal
is evaluated before the combat constants, and a `const` read before declaration
throws on boot: a whole game that does not start, for one misplaced line.

**TWO BUGS THE FIRST SHOT FOUND, neither findable before** (nothing had ever
fired a harpoon in a browser, because the boat had none):
- `'the ' + BESTIARY[c.type].name` — every bestiary name already carries its
  article, so the log read **"You put 4 into the the hunter"**. Fixed at the one
  caller; creature.test now forbids prepending an article.
- **A hunter from an older save could never hunt again.** `state.creatures` is
  saved and restored RAW. The migration line back-filled `interest` and stopped
  there, while the arithmetic below reads `tenacity` — so a lurker from a save
  written before temperament existed got `3 - Math.round(undefined * 2)`, its
  interest became NaN, and every band test (`NaN >= LURK_STALK`) went false
  for the rest of that campaign. An inert monster, silently. Now migrated as a
  whole animal, seeded from where it was born. Verified red-then-green.

**Process note (his question, answered in-session):** a 22-item batch was NOT
too big — numbered, self-diagnosed (his #15 EDIT solved #8), with screenshots.
That is the ideal shape. The only thing that would damage the process is fixing
without triage, which is what the root-cause table above exists to prevent.



## HOW TO CHECK YOUR WORK HERE (2026-08-04, `01b0590`) — READ BEFORE VERIFYING ANYTHING

Sean asked whether more checking helps or whether it can be pushed into
overcorrection. The answer, as work, is three tools and one finding.

**The command list:**

```bash
node tests/run-all.js      # the gate. 18 suites. Ship only on ALL SUITES PASSED.
node tests/moved.js        # what ELSE moved, vs HEAD. ~2 min. Run before committing.
node tests/moved.js --full # ...including playtest/firsthour/reasons. ~25 min.
node tests/delve.js        # the on-foot layer, walked directly. Also in the battery.
```

**THE FINDING, AND IT IS THE IMPORTANT PART: the sea-going bot reaches a deck in
3% of its runs.** One in thirty. Not for want of trying — every persona in
`playtest.js` carries `enterRuin` between 0.6 and 1.0 — it simply never finds one
in the turns it has. So tenants, wounds, nerve, conditions, bodies, the flood and
the way out have been covered by three runs in a hundred, and the on-foot layer
is where this project's design conversation keeps going. `tests/delve.js` exists
to walk it: 60 decks, ~7,000 steps, asserting the whole way. **If you are
changing anything ashore, playtest will not see it. delve will.**

*(That 3% is also worth reading as a gameplay signal, not only a coverage one.
It is Sean's call whether a captain should find a deck more often than a bot with
`enterRuin: 1.0` and 300 turns manages to.)*

**REPRODUCIBILITY — everything below was broken, and is now fixed. Do not undo
any of it.**

| what | why it mattered |
|---|---|
| four instruments rolled unseeded `Math.random` | an instrument that rolls unseeded dice reports a SAMPLE and reads like a FACT |
| **all fourteen `__seed` helpers reset `worldSeed` and `rng` but NOT `interiorSalt`** | it is read in three places deciding mouths, layout and doors — so "the same seed" NEVER meant the same building, in any test, ever |
| `resumeGame` reseeds the dice from `Date.now()` | deliberate in the game; it made every suite unreproducible from its first save/reload on. Harnesses now run a MONOTONIC fake clock |
| a frozen clock was the obvious fix and the wrong one | `restart()` derives a new world seed from the clock, so a stopped clock regenerated the same ocean every restart. save.test caught it |
| three instruments had absolute paths | worked on Sean's machine only. All 15 honour `FATHOM_HTML` now |

11 of 12 suites are byte-identical run to run. The twelfth is `flip.test`, which
measures wall-clock performance and *should* vary.

**WHAT ACTUALLY CATCHES A BUG — established by experiment, not assertion.** I
planted the nerve-recursion bug back into a scratch build and measured what
noticed. It took four tries:

- playtest's per-turn invariants — **no.** The bot never walks that code.
- `moved.js` — **no.** A diffuse scatter of shifted encounter rates that says
  *something* changed and not what. `crew lost` read 0 on **both** builds.
- delve's invariants — **no, and worse:** the BROKEN build reported FEWER
  violations, because hands break and leave the roster before they can pile up
  conditions. The bug hides behind its own symptom.
- **a re-entrancy assertion** wrapping `inflictCondition` and `frayNerve` in the
  game's own scope — **yes.** Silent on the sound build, 57 nested calls on the
  broken one. It is in `delve.js`. **When a bug is "X called Y called X", assert
  non-reentrancy directly; nothing statistical will find it.**

I had written the opposite of most of that into the file headers as fact before
testing any of it. The corrections sit next to what they correct.

**MY OWN INSTRUMENTS LIED TWICE, both caught before being believed.** delve's
first cut wandered at random and called `fightTenant` anyway — which refuses
unless something is toe-to-toe — producing 1,673 rounds "fought", 0 wounds, and
a confident "none violated" over a path never entered. Then it reported 1,486
condition bursts that were all phantoms, because it named replacement hands by
roster length and two hands shared a name. **A probe that measures nothing passes
everything. Check that your check can fail.**

**Open, and Sean's calls:** `depthBand` is declared on all four cultures and read
by nothing — and there is a live global function of the same name, so grepping it
finds 8 hits and looks wired. Either delete the four fields or make faction
encounters respect their declared band. Separately: conditions stack without a
cap and duplicates are allowed (a hand parked by a tenant collects a dozen). It
is NOT the unwinnable spiral it looks like — `crewAtk`/`crewDef` clamp at zero
and `bestWeaponAtk` is decoupled — so delve reports it as a NOTICE, not a
failure.

## THE HOUSEKEEPING PASS, PART TWO (2026-08-04, `fbfc807`..`6cbdfc2`)

Sean, asleep: *"cross-reference all our intended gameplay design and user
experience design against our code... find all kinds of things that don't make
sense and take them out"* — then *"keep going."* This is the continuation. Both
commits shipped on ALL SUITES PASSED, run twice each, with the file hash checked
before and after so no run raced an edit.

**THE GATE WAS LYING, AND THAT MATTERED MOST.** The battery failed a *different
suite on every run over an unchanged file* — `items`, then `cargo`, then nothing
— and reported "a check failed" every time. It could not have known that:
`stdio: 'inherit'` meant the runner never saw a word the child said, so a suite
that DIED (out of memory, a throw on the way up) was indistinguishable from one
that caught a bug. It now captures the output and lets the child's own FAIL line
decide, and says so in as many words when there isn't one. The classifier was
proved against two synthetic children that differ only in how they exit 1.

Under that, the "flake" was one real bug of mine, intermittent only because it
needed the RNG to roll a cursed item. **Do not trust a suite name from this
runner's older form if you find one in an old log.**

**What was fixed** (each verified, several proved red-then-green):

| | |
|---|---|
| the nerve half of `CONDITIONS` | 3 of 10 rows were `pressure: 'nerve'` and no caller passed a pressure — the whole Lovecraft axis was uninflictable. Now fires at nerve thresholds 50 and 25 |
| the Gun, the Hand | `crewLvl('gun')` and `crewLvl('hand')` had **zero call sites**. Both for sale at 5 crates, never consulted. One option each, additive |
| both doors onto a deck | `enterInterior` wrote `hurt: 0` and had no `dead` field; `footInto` reads both. The tenant healed for free at the front door, and re-entering **erased** your dead (`stashDeck` deletes the key when `f.dead` is empty) |
| a beach flooded | the flood guard asked `caveSeg` (−1 for `'beach'`) instead of `inGrotto`, which exists for exactly this |
| `deathTitle` | had 2 of the 3 rungs `deathCause` has — a boat dying of pressure was titled "Something got in." |
| a newer save | was refused and then written over. `loadSave` promises "refused, not wiped"; only the throw path set anything aside |
| two hands on the helm | `autoStart` didn't stop a set course, so two intervals called `move()` a second apart toward different hexes |
| the trade panel | in `PANELS` but not in the openers map: it popped a history entry it never pushed, so closing Trade closed the Port with it |
| the ceiling strike | took hull damage and skipped `noiseMade`, `sfx` and `creatureTick` — the only collision no hunter could hear |
| `POI_DESCRIPTIONS` | no row for `hull` or `chasm` (both in PRIZE_TYPES), a dead row for `deadend`. Now cross-checked both ways |
| the Ear's flat +1 | passive range bump removed — A KNACK OPENS AN OPTION |
| decoys | restocked inside the `stores < 100` test, so a full larder meant an empty rack |
| the hire line | printed the role slug: "signs aboard as ear" |
| the ping | now scatters the timid, which `tickShoal`'s own header has claimed all along |

**Did NOT reproduce — left alone rather than "fixed":** found-ness is depth-keyed
correctly (`poiKey` uses `here.d` whenever you are at a stack prize; the bare hex
key is the legacy channel and is right). `sw.js` genuinely never caches the
music, but that is deliberate and documented — `cache.put` throws on the 206 an
`<audio>` element provokes, and unguarded that took the music down entirely.

**`current` IS A VESTIGIAL TILE TYPE.** Nothing places one — not `PRIZE_TYPES`,
no `poi`, no `setTile`. The current *mechanic* is real and live, but it is a
FIELD over the water (`favour` in the move path), not a tile. It is now marked
in place. **Do not resolve this by adding a placement pass** — that would apply
the set twice on any tile that had both.

**`cap` is dead data on all 48 viewport scenes.** Nothing reads it since the
captions came out at Sean's request. The strings are kept (authored prose; a
caption may return as a long-press or a Look line) and both the game and the
items.test check that guards their length now say so out loud. If Sean wants
them gone for good, that is a one-pass deletion.

**MY OWN LESSON, TWICE, AND IT IS THE PROJECT'S OLDEST ONE.** I proved the nerve
fix with a probe that counted which rows appeared — and never checked whether
the hand survived. It didn't: `inflictCondition` calls `frayNerve` back, so the
threshold hook made a mutual recursion, and a tier-2 row's −40 nerve at the 25
line broke a hand outright. The battery caught what my probe was built not to
see. Then the door checks I added failed on the runs where the sweep landed on
an untenanted deck — a legal deck — reporting a game bug that was a test picking
badly. **A probe that only measures the thing you added is not a check.**

## FOUR AUDITORS (2026-08-01, second session) — what they found and what is left

Sean, going offline: *"come up with another six hours of work to complete our
goals and go... feel free to loose the test agents too."* Four agents were turned
loose on dead branches, save/load, the economy, and the phone interface while I
built. They found more than I would have in a day, and a lot of it was mine from
this week. **Everything below marked FIXED is shipped and battery-green;
everything under STILL OPEN is written down and not built.**

### Fixed — the ones a player hits

| | |
|---|---|
| **The log showed TWO LINES and pinned to the END of a message** | 45.8% of the file's 306 log calls run past two lines; every one of the seven Standing Orders is 5–7. So the tutorial put a new captain at the *last two lines* of each instruction. Now scrolls to the top of the newest entry; box takes four lines. |
| **The chart's depth stepper was off the edge of the phone** | `#chart-layers` asks for its own row with `flex-basis:100%` + `order:2`; `#chart-head` never declared `flex-wrap`, which makes both inert. Needed ~528px in a 304px box. **This is Sean's own bug report** — "I only seem able to move upward through layers, though I can't be sure" — he was looking at the left sliver of one arrow. |
| **Every Chandler row rendered `undefined \| undefined`** | `portRows` emitted `{label, cost}`; `renderPort` reads `{name, desc}`. Green in the battery the whole time because `board.test.js` indexes rows by `act` and never asks whether a row *says* anything. |
| **A tap on a glyph laid a course instead of answering** | Travel targets are wider (0.9 vs 0.7) and appended later, so they swallowed every identify tap. |
| **Long-press ate your next tap** | `fired` was only reset in `start()`, which early-returns on untitled targets — so pressing a control, sliding off and releasing swallowed the next tap *anywhere in the game*. Also: no slop threshold (one pixel of tremor killed it) and a flat 2.6s toast for a 38-word title. |
| **The music slider could not be dragged** | Its `input` handler re-rendered the scroll container, destroying the `<input>` under your thumb. |
| **Piracy cost no turns** | 6.8 presses, 9 crates, zero air, against a fleet with `guns: 0` that can never fight back. **1.40 crates/turn against the board's ceiling of 0.17–0.21.** |
| **Board errands were priced off your RANK, not the item** | A val-1 errand paid 13 at top rank; the item is 2 on a shelf. 44% of slates carried one and each also bought a **ticket** — five in a row is unrated to top rating without leaving the quay. |
| **`dropBerth` reset `found`** | One wreck could be stripped for ever. |
| **`restart()` leaked `ordersSaid`** | Finishing the tutorial once silenced it in **every world after, permanently.** Also leaked `ships` and `buoys`. |
| **`leaveInterior` never called `stashDeck`** | The ordinary exit was the *one* way out that didn't. Tenant wounds reset to full, and **a body left for you to recover was destroyed** when you went up the ladder. |
| **`own` was read after `state.foot` was nulled** | Always false — a claimed station lost its glyph for the session. The obvious repair crashes: `TILES` has no `base` key, by deliberate deletion. |
| **`CONDITIONS.pressure` was read by nothing** | All ten rows carry it; the picker filtered on tier alone, so a hand crushed against the plating could come back as "the shakes". |
| **`TRACE_SHED` had a `wreck` key no poi can be, and no `hull` key** | A sunken boat shed nothing into the current. |
| **`state.buoys` was never saved** | A decoy cost 6 air and a decoy — both durable — and the buoy evaporated on reload. |
| Smaller | `sfx('warn')` named a sound that isn't one of the nine; the gill-hood had no `PROP_TAG` row so the one item that lets a party cross drowned water advertised nothing; the two stat sub-readouts truncated at 8px so the crush depth and the vault count were never visible; hailing a rival was repeatable by reloading. |

### STILL OPEN — found, verified, NOT built

**Content that exists and nobody can reach.** `chamberKind` classifies every chamber
in an infinite world (grand/cavern/chamber/antechamber) and nothing reads it.
`CULTURES[*].depthBand` is dead and camouflaged by a same-named *function* that
takes a number. `FLEET_RIVALS`, `FLAVOR.openWater` (seven sentences),
`POI_DESCRIPTIONS.deadend`, `PRIZE_NOUN.base` — all orphans. Write-only fields:
a ship knows `fromName`/`toName` — the harbour she left and the one she is making
for — **and the game never says either**, which is a free piece of characterisation
sitting unused.

**Four porthole scenes, ~181 lines of hand-drawn art, with a zero-probability
trigger.** `shipcourier`/`shipmerchant`/`shipnaval`/`shipdestroyer` are reached
only by `'ship' + near.hull`, which is unreachable: measured 1,547 island holders
across 5 seeds — 868 mariners, 355 confluence, 324 libertines, **0 dagon** — and
all 10 reachable (culture, hull) pairs have a yard-specific scene. The comment
calls them a fallback "for a fifth people". Worth an explicit decision.

**`startExpedition` has one live arm of three.** Called once, always with
`'signal'`, so `relicChance` is always 0.20 and the `'beach'` prose can never
print. Every beach path goes through `enterGrotto` now.

**The commission chain costs more than it looks.** An alliance needs `trusted`
(≥60) at a **city**, cities are Dagon-only at ≥3,600 m on a 35% roll, and only
two of seven `nudgeStanding` sites can ever name Dagon. Measured within 60 hexes
of home: **2, 0, 2, 0, 0, 1 cities across six seeds** — half the worlds have none.
Floor of ~5 city missions after finding a city. Wired at both ends; it is the
price of the ticket that is the question.

**Missions read a pool the pricing rules never see.** `missionOffer` builds from
`cu.buys.keys` raw — `buyMult`'s no-buy-back rule never applied. The Confluence's
list contains `ambergris` (which Dagon *sells* at 13) and `warhead` (Con-Fed sells
at 17), paying 19. Net +6 and +2 per unit, and repeatable — 12 completed
back-to-back at one city. **Dormant only because Dagon alone holds cities today.**
The day another people can, it is live.

**Free provisioning.** `dockHere()` has no `state.moves++`: air 10 → 350, stores
5 → 100, all wounds cleared, decoys restocked — three taps, zero turns.
Deliberate? It is the "a night ashore" fiction. But it is the same shape as the
piracy hole and should be a decision rather than an oversight.

**More phone work.** The Options panel still re-renders and jumps to the top on
every *toggle*; the control row reflows under the thumb between the two taps of
an arm-then-confirm (`FIRE`→`FIRE?`, `AUTO`→`SURFACE`); 5.6px between ▼ and ▼▼,
where a mis-tap is 120 m of unwanted descent; `.btn:disabled` sits at **1.69:1**
so a disabled control looks absent rather than dim; rotating the phone with the
chart open leaves it mis-registered until you close and reopen; chart zoom
persists into interiors with no floor on target size; eight duplicate `inv-panel`
/ `inv-head` ids waiting for the first person to call `getElementById` on one.

**Test coverage gap the save auditor named:** *no test asserts what `restart()`
clears* — that one test would have caught the `ordersSaid` leak outright. And
`board`/`works`/`locks` never call the real save functions; `locks.test.js` fakes
the round trip with `JSON.parse(JSON.stringify(...))`.

---

## THE DAY SEAN WAS AWAY (2026-08-01) — deferred cleared, then the tutorial

He asked for the deferred list done first and then a tutorial, with minimal
interruption. Five things shipped, in this order.

**1. Traffic was a fact about where you were standing.** The despatch drew BOTH
ends of every route from harbours within `SHIP_RANGE` of *the boat*, so a captain
midway between two clusters sat in everybody's lane and one tied up at a lonely
harbour saw nothing. Measured backwards for a week: **60.6% of turns with a sail
in sight beside a harbour against 67.8% in open water.** Now the origin is a
harbour near you and the destination is a harbour near *the origin*. Beside a
harbour 60.6% → **58.0%** (barely moved, which is the point); open water 67.8% →
**27.7%**. `tests/traffic.js`.

**2. The keys open something.** `hatchkey` and `bonekey` were `kind: 'key'`,
worth 2 crates, bought by three peoples, and nothing in the world had a keyhole.
Some decks now have a strongroom: a hull takes the hatch key, a drowned building
takes the bone one, caves get none. **24% of hull decks, 19% of ruins, 0% of
caves.** Turning it SPENDS the key. The bug I nearly shipped: a lock remembered
on `state.foot` re-locks itself the moment you surface, because interiors
regenerate deterministically — it rides in `deckTook` instead. `tests/locks.test.js`.

**3. THE TUTORIAL — Standing Orders.** Seven lines, in order, one per turn, each
said once ever, covering exactly the arc he named: the helm and the free controls
→ take work off the board → follow the mark → go down to it → come home and get
paid → find a way under the shelf and go ashore → keep a place of your own. The
next only arrives when the last is **actually done**, checked against campaign
state, so a captain who wanders off and claims a grotto early is never told to do
what they have already done. **The switch is in Options, labelled Tutorial, and
governs the orders AND the tips** — one control for "help me".

Two bugs the tests caught here, both of which would have shipped:
- `sail` was done when the mark was REACHED — but reaching a mark *means* diving to it, so sail and dive completed in the same instant and **the dive line could never fire at all.** Every check was green; the failure was visible only in the printed trace.
- `helm` gated on four moves, which made an opener into an objective. The thread WAITS for the current order, so a captain who tapped DOCK before wandering was stuck on it for ever. Openers are done the moment they are read. **Found in the browser, not the suite.**

**4. The bot knows the board, so the early game has an AFTER.** `playtest.js` had
been quoting the pre-board world. Now: cargo ever picked up **17% → 33%**, median
crates banked **0 → 3**, best run **4 → 20**, and **100% of runs take work, 58%
complete one.** Median banked going 0 → 3 is the whole argument for the board in
one number.

**5. `tests/reachable.js`, `holes.js`, `traffic.js`, `reasons.js`** all still
report clean. Battery is **14 suites** now.

### What is open after today, and most of it is yours

- **The board may crowd out exploring.** The bot's median max depth fell 900 m → 180 m and it never reached 2,400 m, because unrated postings are shallow and near home and it does board work to the exclusion of all else. A human would mix. If it turns out to be real in play, the answer is the rank ladder pulling further out, **not** the board paying less.
- **96% of prizes are sealed in rock** — the ping says so honestly now and points at the nearest way down, but it is still a lot of no. Open the floor a little, or leave the deep hard to enter? Generator + economy, so yours.
- **Standing still does not move a price.** One multiplier in `sellPriceTo`. RULED 2026-08-05: yes, build it.
- **The income question**, the **deep room at 70% richer**, the **log window font/height** — all unchanged and all yours.
- **PCs proper** — merging `state.creatures` into `state.entities` — still the big refactor, still not started, still honestly described as such.
- **Rooms with a purpose** (the Dwarf Fortress step): you can cut rock, and where you cut now matters, but a carved tile is just floor. Designating a room as magazine or quarters, and works that need a room to live in, is the next real build there.

---

## WHY NOBODY FINDS ANYTHING — the real answer, 2026-07-31

Sean: *"What encourages a captain to dive and search?"* I answered from the
sounder's numbers and **got it wrong**, then measured properly. Both the wrong
answer and the right one are kept here, because the wrong one is the more
instructive.

**What I said first, off `tests/reasons.js`:** the sounder fires on 0.4% of water
hexes — one return every 233 hexes of sailing — so almost nothing invites a
captain down. True, and the wrong instrument to judge by. The sounder is passive
and *confirms*; the ping is the thing you press, and it *searches*.

**Driving the real `ping()`, 366 pings per power level from open water:**

| power | reach | air | names a prize |
|---|---|---|---|
| 1 | 1 | 1 | 4% |
| 2 | 3 | 3 | 23% |
| 3 | 5 | 6 | 38% |
| 4 | 8 | 10 | **52%** |
| 5 | 12 | 15 | 51% |

The sonar works. It finds prizes half the time. **So the failure is downstream of
finding**, and here it is:

> **145 prizes near home. SIX of them — 4.1% — sit in water open to the surface.
> The other 95.9% are sealed in rock at a median of 2,100 m.**

That is the whole thing. A captain pings, is told "wreckage north, 420 m out",
sails there, and finds unbroken water over stone. 100% of bot runs used active
sonar; 17% ever picked anything up. The sonar never lied — it said something was
there, which was true, and never said you could reach it, because nobody asked.

**What was built (2026-07-31).**

1. **The ping now says which kind of return it got.** "The water is open above it. You could go straight down." or "There is rock between you and it — no way down from this water. The nearest break in the floor is west, 720 m." Every named prize gets a verdict; measured 100% accounted for.
2. **Reachable prizes are reported first.** Sorting by distance alone meant the sonar nearly always named the one thing in earshot the boat could not have. Reachable wins, distance breaks the tie inside each group. **Swimmable reports went 3% → 12%** on the same world — a 4× improvement from sorting, not from generation.
3. **A hand who hears things.** The `sonarman` role existed and did exactly one thing: a flat +1 passive range, identical at every level — the shape the knack ruling forbids ("A KNACK OPENS AN OPTION. IT NEVER MULTIPLIES A NUMBER"). Now: with one aboard, *Look about you* gets their read on the floor — the nearest break within 9 hexes, for no air and no noise. Without one you buy the same knowledge with a ping, which costs both. Deliberately **not** scaled by level; the option is having anybody aboard who can do it.
4. **The floor keeps its secrets consistently.** `floorSecret` hid salvage resting on the bottom but let a ruin 2,100 m down under the same open water draw its glyph for free — one secret kept in one case and given away in the other. Now every prize that *rests* somewhere is earned the same way, and against `settledDepth` (where the thing actually is) rather than `tile.floor` (ground it may be nowhere near). Growth is exempt: kelp climbs the column and breaks the surface, which is the one thing down there you genuinely could see from a boat. **Verified a secret and not a deletion: 100% hidden before sounding, 100% visible after charting that depth.**

**THE BIG OPEN QUESTION, AND IT IS SEAN'S.** 96% of prizes being sealed means the
ping will say "there is rock in the way" most times it says anything. That is now
honest and it points at the door, but it is still a lot of no. The cave network is
the intended route — sinkholes, beaches, mouths — and near home there are only
**~3 breaks within 22 hexes, the nearest a median of 12 hexes away**. Two ways to
go, and I did not pick one:
- **Leave it.** The deep is meant to be hard to enter, the board now gives a reason to sail, and the sonar finally tells you what you are looking at.
- **Open the floor a little.** Raise the fraction of chambers that connect to open water, or put more sinkholes near home. That is a generator change and an economy change, so it is his call.

---

## THE HARBOUR BOARD — the early game, built 2026-07-31

Sean: *"We need a meaningful way for new captains to start moving up in the world
as soon as the game begins. Please devise it and build it and launch it."*

**What was wrong, measured first.** `node tests/playtest.js 12 900` — twelve bot
captains, 900 turns each: **17%** ever picked up any cargo at all, **median crates
banked 0**, **0 of 36 items** ever held, **0%** fitted an upgrade or bought a boat,
median deepest point **900 m**. The ocean was open in every direction and not one
of those directions was a reason to go. Work existed — missions at the deep cities
— behind a standing you cannot have yet and a dive you cannot survive yet.

**What it is.** The harbour keeps a slate. Two postings, at the dock you start on,
from the first turn, in the first section of the port window (everything else in
that room spends crates; this is the only thing in it that earns them).

- **A sounding** — a position the harbour wants on its charts. Go, be there, come back.
- **A salvage** — a boat went down and nobody has looked. Keep what you lift; the fee is for going.
- **An errand** — bring back a named item. **Never offered to an unrated captain**, because the same measurement says a new captain holds 0 of 36 items, so "fetch me a thing" is a wall with prose on it.

Taking one puts a mark on the chart — deliberately a `state.leads` entry with
`kind: 'berth'`, because three places already draw that array (chart extent, the
mark on the paper, the ⌖ over the water) and `checkLeads` already does arrival and
the "closing now" call. A job IS a position you have been given.

**The ladder — this is the "moving up" part.** Finishing work raises `state.ticket`,
and the rating is what puts better work on the slate:

| jobs done | the quay calls you | reach | depth | pays |
|---|---|---|---|---|
| 0 | nobody in particular | 5–10 hexes | 600 m | 3 |
| 1 | known on the quay | 8–15 | 1,200 m | 5 |
| 3 | trusted with a hold | 11–20 | 2,400 m | 8 |
| 6 | a name on this coast | 14–26 | 4,200 m | 12 |

**The rate, which is the number to argue with.** ~12–16 crates per 100 turns at
*every* rating — deliberately flat. The ladder gives bigger jobs, not a better
hourly, so climbing is about access and capability rather than grinding. That is a
CEILING: it assumes nothing goes wrong, and half of all bot runs die. **One number
tunes the whole thing: `pay` in `BOARD_RANKS`.** A hand costs 5 crates; the brass
first mate costs 60.

**Why this does not break the no-buff ruling.** Nothing here changes what the sea
holds. It gives a captain somewhere to point the boat and pays for the pointing.

**Two bugs found on the way, both worth keeping.**
1. **The home dock is not a port.** It is a `dock` tile the origin chunk writes; the port window opens there on a `hexDistance(..., homeDock()) <= 4` test, and `portNear` returns null. I built the whole board on `portNear` and every one of twelve seeds reported "the slate is bare" — the nearest real port is **22 hexes** from where the game starts you. `boardPort()` now asks the same question the window asks.
2. **The polar-to-axial conversion does not preserve distance** — it compresses by about a third. `leadTarget` has used it since chart-leads went in and its comment has claimed "8-16 hexes off" the whole time while delivering 5–10. I inherited the bug by copying the formula and caught it because jobs measured 4.8 hexes out against a stated reach of 5–10. `boardTarget` now opens the radius up AND checks the result. **`leadTarget`'s behaviour is unchanged** — 5–10 hexes is a good distance for a lead and has been the played distance all along; only its comment was a lie, and only the comment was fixed.

**`tests/board.test.js` is in the battery** (11 suites now). It drives `portRows()`
and `portBuy()` rather than calling `takeBerth`/`payBerth`, because the whole point
is proving a captain can *reach* the thing — the same distinction that let a broken
`surface()` pass a test that called it directly.

**Still open here:** the playtest bot does not know the board exists, so
`playtest.js` cannot yet measure the improvement — its 17%/median-0 figures are the
BEFORE and there is no AFTER from it. Teaching the bot to dock, take a posting and
follow the mark is the honest next measurement.

---

## HOW SEAN SHOULD TEST — the settled answer (2026-07-30)

He asked directly, having been startled that his phone offered to *install* the game.
It offered because **Fathom is a real PWA**: `manifest.json`, `sw.js`, standalone display,
its own icon. Nobody had told him.

**Play it at `https://botheyesshut.github.io/fathom/fathom-chart.html`, and install THAT
if he wants an icon.** Installing from the URL is completely safe: the service worker is
**network-first for the HTML** with `cache: 'reload'` to bypass the browser's own
ten-minute HTTP cache, so a push reaches him the next time he opens it. A past session
already fixed exactly that trap and left the reasoning in `sw.js`.

**What freezes is a file saved to the device** — the copies delivered by `SendUserFile`.
Those never update, they cannot register a service worker (`file://` fails the protocol
guard), and one of them is what produced the three-commit-stale screenshot. **Stop sending
files unless he asks; send the URL.**

**And the game now says which build it is.** Options → *This build* shows
`document.lastModified`, which on Pages is the deploy time — no build step, no constant to
bump, nothing that can drift. It exists because a stale build cost a round trip twice in
one morning: once on his phone, once when the local preview server handed *me* a
three-commit-old copy through three separate checks.

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

## "I'M STILL SEEING HEXES I SHOULDN'T SEE" — FOUND, AND IT WAS NEVER THE SONAR

Sean raised this twice, months apart. The second time he added the detail that solved it:
*"I was using sonar at medium-high power if that helps."* It did help, by ruling the
sonar out — because what he was seeing had nothing to do with it.

**It is the sunlight flood.** `sunlitHere` lights any hex the flood reaches at **full
brightness, whether or not it has ever been revealed** — and the flood ran **ten rings**
through connected water in a band reaching **300 m down**. Measured in a fresh world with
no ping and nothing explored, sitting at 240 m where his screenshot was taken:

| depth | rings | band | hexes rendered | furthest |
|---|---|---|---|---|
| 60 m | 10 | 300 m | 334 | 11 |
| 240 m | 10 | 300 m | **284** | **11** |
| 240 m | 5 | 120 m | **19** | **2** |

**284 hexes, out to eleven, for free** — further than the strongest ping in the game
reaches, at a depth where there is no daylight to see by.

The *rule* was right and is worth keeping: light travels along water, not through rock,
and the flood exists because a boat inside a rock chimney could once see the open sea
through the chimney wall. **The numbers were wrong.** `SUN_BAND` is now 120 m — where
useful daylight actually stops — and `SUN_REACH` is 5 hexes, which is 300 m of seawater
and exactly a power-3 ping, so the sonar is worth firing on the shelf instead of being
redundant. The shelf stays legible: 91 hexes at 60 m, against 334.

`tests/seeing.js` keeps the measurement. **"The player can see something they have not
earned" is the one class of bug that quietly dissolves the epistemic law the whole game
runs on, and no other check in the repo can see it.** It reads the constants out of the
build so it tracks the game rather than anybody's memory of it.

## SIX MORE OFF THE PHONE (2026-07-30)

| what he said | what was done |
|---|---|
| *"the SURFACE button does nothing the up arrow doesn't do... If we're at the surface whether at depth zero or in an underwater grotto with air, the air should automatically go to full"* | Both true. Air came back **eight units at a time and only at depth zero**, so a captain sat tapping a button to breathe. It now fills to **full** wherever there is air — open sky or a cavern beach under a mile of rock — and the button is gone. |
| *"tap a visible hex and have the boat automatically begin moving there one hex every .5 secs and halt if something new is detected"* | Built. `courseTo` is a BFS at the current depth through **water you have actually charted** — it will not feel its way through rock and will not sail country you have never seen. It does not dive for you: changing depth is a decision with an air cost. The halt rule is `autoHazard()`, the same one the retrace autopilot already used. Verified: a 15-hex course found, sailed and arrived; and it halts the step after something comes alongside. |
| *"The info window should only have one message at a time... if we tap it we should get the whole log"* | The tap already opened the transcript. Now only the last entry is displayed; the rest stay in the DOM and in the transcript. The box takes the height of the one line it holds. |
| *"The porthole isn't showing the right thing at the right time consistently"* | The contact hold ran **six moves and checked nothing but the clock**, so a creature heard once kept the window for six moves whether or not it was still near you and whether or not you had since sailed into a harbour. Now two moves, and **only while the thing is still within earshot**. |
| *"The porthole caption is only partially displaying... two or three words, like a title of a painting"* | Measured: **12 of 48 overflowed the 24-column frame and 40 of 48 ran past three words.** All 48 retitled. The battery check that guarded this enforced an eight-character floor — a fair proxy while captions were prose, and wrong for titles — so it now asserts the real contract: captioned, inside the frame, four words or fewer. |
| *"I can't read the two words in the upper right, I can't zoom, and I only seem able to move upward through layers"* | The note was 0.58rem uppercase and letter-spaced; it and the sheet label are now legible. **The layer control wrapped**, so the up arrow — "a shallower sheet" — took you from ALL to the DEEPEST sheet on the first press and behaved correctly ever after, which is exactly how you end up unsure what a button does. Clamped now. **Zoom is not done** — see below. |

**Zoom is now done too.** The fit stays the default and the reset — it is the whole of
what you know on one sheet, and it is also exactly why a zoom was needed, because the
more water you chart the smaller all of it gets. On top of the fit: a multiplier (1× to
10×), a pan, pinch and drag to set them, a wheel for desktops, and a **Fit** button. Zoom
anchors on the point under your fingers, and the pan is clamped so the paper cannot be
flicked off the table. Measured through a recording canvas context: the drawn span scales
linearly with zoom (113 → 206 → 412 → 823 px at 1×/2×/4×/8×), the pan clamps at ±68 px at
1× and ±536 px at 4×, and Fit returns to 1× and 0,0. The sheet always **opens** flat and
whole — a chart that opens half-dragged from ten minutes ago is disorienting.

*(The span probe reads `arc()` centres, which is the boat's fix and a few marks rather
than every hex — enough to prove the projection, not a census of what is drawn.)*

**And one near-miss worth recording.** Deleting the Surface button orphaned `surface()` —
the only thing that puts the hold ashore — leaving it defined and called by nothing.
`tests/banking.js` would have passed anyway, because it called `surface()` directly.
Banking is now reached by *breaking surface*, which is where it always belonged, and the
check drives `changeDepth(-60)` instead so it tests **reachability** rather than the
function in isolation.

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
| **~~Ruins are not placed deeper with depth~~** | **DONE 2026-07-31.** *Yield* scaled with depth and *type* varied with it, but PLACEMENT did not — see the section below for what that cost and what it now does. |

### PRIZE PLACEMENT BY DEPTH — DONE (2026-07-31)

**What was wrong.** Chamber density thins with depth on purpose (0.83 at 480 m to
0.34 at 9,480 — the CAVE_BANDS comment is right that the deep should be "sparser
and lonelier"). But `CAVE_POI_CHANCE` was a flat 0.40 in every band, so the deep
was lonely **and** poor and the two compounded: yield per lattice cell fell 0.332
→ 0.136, a 2.4× penalty for going down.

**The fix: rarer, but richer.** `density * chance` is now held constant, so a deep
chamber is scarce and worth finding. Measured over 14 seeds and 97,113 water hexes:

| band | before | after | |
|---|---|---|---|
| 0–600 m | 90 | **90** | held |
| 600–1200 | 268 | **268** | held |
| 1200–2400 | 265 | 212 | −20% |
| 2400–4200 | 132 | 106 | −20% |
| 4200–6000 | 115 | 119 | +3% |
| 6000–9000 | 92 | **133** | **+45%** |
| 9000+ | 88 | **122** | **+39%** |
| **total** | **1050** | **1050** | **0.0%** |

**The care in it is the two bands held out.** The first version flattened all seven
and looked perfect — world total +0.2%, home-shelf total a dead heat — and it still
cut the prizes a STARTING boat can reach (home shelf, ≤1,200 m) from **183 to 128**,
a third gone. Total-neutral is not the test that matters when the whole cut lands on
the first hour, which is the one part of this game already known to be too thin. So
b0/b1 keep their flat 0.40 and the deep is paid for out of the MIDDLE (1,620–3,600 m
— water a competent boat crosses on its way somewhere). Shelf ≤1,200 m is now
**183 → 183, unchanged**, and the world total is 1050 → 1050 exactly.

**A theory I had, measured, and had to throw away.** I was going to write that this
"makes trenches worth diving" — the trench being the door to the deep bands. It is
not true. A trenched hex is **0.8×** as likely as plain seabed to hold a prize below
4,400 m (0.0029 vs 0.0036 per hex). The cave network already reaches those depths
*everywhere*, through shafts; a trench only lets you swim there in open water instead
of crawling. So what this change actually did is make the **deep cave bands** pay,
wherever they are — reached by shaft, not by trench.

**Which leaves the trench question still open, and now properly measured.** Trenches
have no prize advantage of any kind: 0.010 per hex against 0.010 on the plain for the
whole column, and slightly *worse* for deep prizes specifically. Whether that is a
problem depends on what a trench is FOR. If its value is access — a way to be at
9,000 m in open water, where pressure and air are the content — then it needs no
prizes. If it is meant to be a place you go to find things, it needs a trench term in
placement, which is a further generator change and is not in this one. **Do not
repeat my mistake and reason about this from the shape of the map; measure it.** An
earlier 3-seed run said trenches were 20% *richer* (0.012 vs 0.010) and that was six
prizes' worth of noise pointing the wrong way. `PRIZE_SEEDS=14 PRIZE_W=42 node
tests/prizes.js` is the honest sample; the default 3-seed run is for a quick glance
only.


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

- **The income question.** Bots bank ~0–4 crates in 300–400 turns; a hand costs 5. His actual ruling — a session that banks nothing but charts new water is legitimate — is honoured: total income has NOT been raised — depth pays more only where it costs more, and the shelf is byte-identical to before. What is wanted is one honest 40-minute session and the answer to: did you bank anything, and did it feel earned?
- **The deep room is 70% richer than a floor ruin, and I decided that on his behalf.** 13.5 against 7–8. Reachable only through a sinkhole, a beach, the right mouth of three, and 2–4 chambers of walking with the air draining, then all of it again on the way out. My reasoning: the hardest place to reach should be the best place to reach, or the cave layer has no economic purpose. If it reads as too generous in play, the one number to move is the `'relic'` in the `kind === 'deepruin'` branch of `interiorAt`.
- **Engagement rate: measured, and NOT changed.** The audit wanted ship encounters raised from 13% to 33%. Measured instead: **92%** of open water has two harbours in reach, which is the condition for a hull to be despatched at all, and sitting in busy water gave 555 turn-sightings inside nine hexes over 300 turns. The sea is not empty and Sean's worry ran the other way. Left alone. (Creature STALK aggression is a separate 13% and also left alone — aggression should be felt, not computed.)
- **"37% of log output carries no tag" — true of the runtime stream, wrong as a conclusion.** The call-site figure is 6% (20 of 325), and **11 of those 20 are `pickFlavor`** — ambient prose, which is the *room* talking and correctly wears no instrument label. Both numbers are true at once because flavour fires every single turn. The ten that were genuinely wrong were refusals, and a refusal with no label reads as the narrator sulking; they are tagged now (ARMS, SONAR, DECOY, HELM, BALLAST, AIR). Ambient prose stays untagged deliberately.
- **Standing does not move a price, and I did not make it.** Found by the reachability sweep (2026-07-30): `standingFriendly()` existed and nothing called it. Tracing why turned up the real asymmetry — standing's *hostile* half gates real behaviour (hulls hunt you, the first mate warns you off a heading), and its *friendly* half gates nothing but flavour text and the alliance check, which asks for `trusted` outright and skips `welcome` entirely. So being **welcome** among a people currently buys you a kinder sentence and not one crate. The obvious fix is a price effect — a people that trusts you pays a little over the odds — and that is an economy change, which his ruling puts in his hands and not mine. Two things to weigh if he wants it: (a) a friendly *bonus* alone is a buff in practice, because a player always trades where they are liked; (b) a symmetric **spread** — friendly pays more, hostile pays less, `known`/`nobody` unchanged — is closer to neutral and makes hostility cost crates for the first time. The whole change is one multiplier inside `sellPriceTo`. It is not in the build.
- **The socialists' final name.** "The Long Line" is in and working; he said he would think on it.
- **Mariner and Dagon mottos** are mine and marked as proposals in the file.
- **Traffic density.** Earlier probe: a sail in reach 3.1% of turns among the harbours and 13.2% out in open water, which is backwards and was unexplained. The overnight measurement suggests why — despatch depends on two harbours being within `SHIP_RANGE` of **the boat**, not on the boat being near trade, so open water between clusters can see more traffic than a harbour on the edge of the world. Worth one honest look; the fix, if it is one, is to weight despatch by the harbours' business rather than by the player's position.

### D. Two corrections worth keeping

**THIS KEEPS HAPPENING AND IT IS THE MOST COMMON MISTAKE IN THIS PROJECT.** Since the
sweep below was written I have shipped or nearly shipped it **four more times** in a
single day: `cityHere()`, `hailRival()`, `rivalHostile()`, and `wireChartGestures()` were
each defined and called by nothing. `surface()` was worse — it *had* a caller and I
deleted it, which would have made the ledger unreachable.

**So make this a habit, not a sweep:** after writing any new function, `grep -c` its name
before committing. One occurrence means it is dead. It costs five seconds and it has
caught four bugs that the battery could not.

**AND IT IS MECHANISED NOW — `node tests/reachable.js` (2026-07-30).** Habit is what I
kept failing at, so the check no longer depends on my remembering. It walks all 456
top-level functions and reports three lists: **DEAD** (named nowhere else — the bug),
**ONLY-IN-TESTS** (the battery can reach it, the game cannot), and **wiring-only** (reached
through `addEventListener`, which is how a control is *supposed* to be reached — listed for
the eye, not as a fault). It also cross-checks every `getElementById('x')` in the script
against the ids actually in the markup, because **the suites are structurally blind to a
typo'd id**: they boot inside a Proxy DOM that answers every id with a truthy stub, so a
binding to an element that does not exist passes all ten suites and throws on boot in
front of Sean. Currently: 0 dead, 0 test-only, 93/93 ids present.

Its first run found six dead functions and one thing worse. `itemWorth()` had been
superseded by `buyMult`/`sellPriceTo` and the game had stopped calling it — but the item
suite went on checking it every single run, so a green line reading *"a Dagon relic is
worth more than its face"* had been proving nothing about any price a player could be
offered. That check now asks `sellPriceTo`, and asks more of it: prized above face (Dagon
pays 22 for an idol), worth less to a people who do not care (mariners pay 5), worth
nothing to the people who stock it themselves (ambergris, 0).

**And one it found that was not a bug at all.** `ableParty()` — the living crew minus the
incapacitated — was dead, and there was exactly one combat site still counting a senseless
hand's weapon. I wired it in. Then I read the paragraph above that function, which says in
so many words that this is *deliberate*: "the deep costs you bodies and your screen, never
your ability to keep swinging. Combat that spirals unwinnable is not fair, and fairness is
the whole brief." My fix would have built the exact spiral the design refuses. Reverted, and
the reasoning is now a comment at the call site. **A dead function is not evidence that
something is missing** — sometimes it is the residue of a decision, and the decision is
written down a few lines above it.

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
   ("a person who just wants to explore should be able to"; "enough progress in
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
be able to do that." **~~Do not buff the economy until progress is reliable.~~** *(That bolded line is MINE, not his — a paraphrase written directly under his quote and then cited back to him as a ruling for two weeks, in five files. Asked about it 2026-08-05, he did not recognise it, and it is nearly backwards: his is a design principle, mine reads as a hold waiting for reliable progress — the state he was rejecting. The real test is "does this replace exploring with a wage".)* A session that banks
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
