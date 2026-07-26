# FATHOM — MASTER PROBLEM LIST
**Six persona playtesters, ~120 raw findings, deduped to 63 distinct problems. 2026-07-25.**

Read this instead of the raw persona reports. Where several personas hit the same thing it is ONE entry here, with a count — **a problem four players found independently is a different order of problem than one player's bugbear, and the counts are the most useful signal in this document.**

## The persona key

| Tag | Who |
|---|---|
| **MOBILE** | Android Chrome, one-handed, 5–10 min bursts on the bus |
| **FORTY** | Mid-forties, 40 min twice a week, raised on Elite and Sid Meier |
| **TWENTY** | 20s, FTL / Dredge / Barotrauma / Subnautica background |
| **LITERATE** | Here for the writing and the world |
| **OPTIMISER** | Strategy player, economy-breaker |
| **BUTTONS** | Presses buttons, reads nothing, bored in sixty seconds |

## How confidence is marked

- **Verified** — measured in the live page or read off the source with a line reference. I independently re-checked every claim in the top six plus a sample below; all held, and one sharpened (see §5).
- **Suspected** — the reporter could not close the loop (no real device, no real thumb, no screenshot). Flagged individually. There are only five.
- **Contested** — two personas measured the same thing and got different answers. There is one, and it is load-bearing (see Disagreements §D2).

**Verdict tally: 4 of 6 personas said they would not keep playing. The two "maybes" both said "maybe" for the same reason — the writing.**

---

# THE FEW THINGS THAT MATTER MOST

These six are ranked by impact × confidence. The first four are cheap. The middle two are the game.

---

## 1. The control row runs off the right edge of every Android phone
**Found by: MOBILE, FORTY, TWENTY, OPTIMISER, BUTTONS (5 of 6 — 4 called it a blocker).** Verified, and I re-confirmed the CSS.

The single most-agreed finding in the audit, and the cheapest thing on this list to fix.

`#controls-row` is `display:flex` with no `flex-wrap` (line 557). `.btn` is `flex: 1` with the default `min-width:auto` (line 562), so seven buttons can never shrink below their min-content width and simply run off the edge. `body` is `overflow:hidden` + `touch-action:none`, so there is no scroll, no pan, and no way to reach what is clipped. **`grep -c '@media' fathom-chart.html` returns 0** — there is not one media query in 8,504 lines of a mobile-first game.

Measured across widths (row content is 479px against a 328–380px box):

| Viewport | SURFACE visible | NEW WORLD visible |
|---|---|---|
| 360×800 (Galaxy) | 17 of 81px (21%) | 0% |
| 375×812 | 32 of 81px (39%) | 0% |
| 412×915 (Pixel) | 69 of 81px (85%) | 0% |
| On foot in your own station | 0% | 0% (DIG also 0%, FORTIFY 64%) |

**Why it is the top entry and not just a layout bug:** SURFACE is the verb that refills air, banks cargo, repairs the hull, buys every boat, hires every hand and closes every purchase. It is the only way to convert a session into progress. NEW WORLD is bound to the *only* call to `restart()` (line 8250), and the game auto-resumes a save on launch — so a phone player has no in-game way to abandon a bad ocean or clear a corrupt save. Ever.

**Fix:** `min-width: 0` on `.btn` and `flex-wrap: wrap` on `#controls-row` is the two-line floor. Better: cut `letter-spacing: 0.2em` to `0.1em` (buys ~40px on its own), hide contextually dead buttons (§2 below, and entry O1), and move NEW WORLD out of the primary row entirely. Removing just FIRE while unarmed takes the row from 479 → 417px and puts SURFACE fully on screen at 375px.

**Same root cause, separate symptom** *(MOBILE, FORTY — 2 personas)*: `.btn { flex: 1 }` also applies inside `#gameover`, which is `flex-direction: column`. So `#go-restart` grows *vertically* into a 170×462px hollow rectangle with 11.2px text floating in the middle — 57% of the death screen, and any tap in the bottom half instantly starts the next run while you are still reading what you lost. **Fix:** `#go-restart { flex: none }`, or scope the row rule to `#controls-row .btn`.

---

## 2. Dead controls fill the row that is already overflowing
**Found by: FORTY, TWENTY, BUTTONS, OPTIMISER (4 of 6).** Verified.

This is the fix for §1 and a clarity problem in its own right, which is why it gets its own entry.

The codebase **already states the rule, in a comment, at line 2885**: *"Boat controls are dead weight while the captain is off the boat — they do nothing but scold. Hide them rather than leave the row full of refusals."* And elsewhere: *"A dead control is worse than no control."* The rule is applied to exactly three buttons and no further:

```js
for (const id of ['btn-ping', 'btn-fire', 'btn-launch']) {
  el.style.display = inside ? 'none' : '';
}
```

What it misses:

- **FIRE on an unarmed boat.** `state.armament` is `null` and `torpedoes` is 0 on a fresh game; the button's only behaviour is to log *"You carry no weapon. Buy an armament at the dock."* — advice you then cannot act on, because the harpoon is fifth in a fixed port precedence queue behind a boat, a hire and crew gear (see E4). It costs 54px + an 8px gap, permanently, for essentially every player who ever exists.
- **The whole depth ladder, the sonar slider and SURFACE while ashore.** Inside a ruin, `#dive-controls`, `#ping-power-row` and `#btn-surface` all stay visible and enabled; every press answers *"You are not aboard. The boat holds station somewhere above you."* That is the bottom third of a 375px screen doing nothing while the controls you actually need are clipped.
- **LAUNCH DECOY with nothing hunting you.** 72px — the widest button in the row — unlimited, gated only on `state.air >= 6`, offered on turn one, with no decoy count anywhere in the UI.

**Fix:** extend the existing rule. `fire.style.display = (inside || (!state.armament && !state.torpedoes)) ? 'none' : ''`; add `dive-controls`, `ping-power-row` and `btn-surface` to the ashore hide list; gate LAUNCH on something actually tracking you. This is a three-string change that also fixes §1.

---

## 3. The log is a 96px letterbox with no scrollback — it destroys the writing and the teaching at once
**Found by: MOBILE, FORTY, TWENTY, LITERATE, BUTTONS (5 of 6 — 1 blocker, 4 major).** Verified.

`#log` is `min-height: 6rem; max-height: 6rem; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end` (lines 427–439), hard-capped at three entries (line 7656). Because it is a bottom-aligned flex column, overflow goes off the **top**, which is unreachable even with `overflow:auto` — and `scrollHeight === clientHeight === 96`, so there is nothing to scroll anyway.

Measured consequences, all in the live page at 375×812:

- A single generated arrival description renders 112–155px into a 68px content box: **54% visible alone.** With one ambient line following it, 24%. With two, **0% — entirely off-screen in the turn it was written.**
- 31% of turns emit three or more lines (histogram `{1:1265, 2:1444, 3:771, 4:329, 5:107, 6:22, 7:4}`), so eviction is the normal case, not the edge case.
- The surviving previous entry is styled `.old` at 16px and 0.55 opacity = **2.23:1 contrast** against the void, against a WCAG AA floor of 4.5:1. That is the line you most want to re-read.
- BUTTONS instrumented 250 moves: 320 log lines, of which **zero were actionable**. The air advisory — the rung that exists specifically because Sean drowned not knowing where air comes from — fired and was gone from the DOM within four taps, evicted by *"Through the porthole: a fish with too many teeth and too few eyes."*

**This is the highest-leverage single fix in the document,** because it is the delivery channel for both of the things the game is best at and worst at: the prose (the one asset every persona praised) and the diegetic teaching (the declared substitute for a tutorial). It multiplies §6 and every prose entry below.

**The fix is already half-built.** `const logHistory = []` at line 7634 is pushed to at 7653 and **read nowhere in the file** — I confirmed with a full-file grep, two hits, declaration and push. Someone already intended this.

**Fix:** make `#log` tappable to expand into a full-height scrollable transcript rendered from `logHistory`. This costs zero permanent vertical pixels, which matters because MOBILE wants that space back for the chart (see Disagreements §D4). Minimum viable: lift `.old` to 0.75 opacity and let the box scroll.

---

## 4. Tapping DESCEND into rock bills you 4–8 hull, forever, with no disabled state
**Found by: FORTY, BUTTONS, MOBILE (3 of 6 — 2 blockers).** Verified; I re-read the branch.

Two personas killed a boat on this without ever meeting a monster, on move zero, at the dock.

The game is called Fathom, the start button says "Dive", and the four dive arrows are the largest controls on screen. The first press of ▼ works. Every press after that hits the seabed and charges `4 + Math.floor(rand() * 5)` hull for nothing — no depth change, no air cost, no confirmation, no greying. FORTY clicked ▼ twelve times from a fresh game: hull 100 → 93 → 87 → 82 → 76 → 71 → 64 → 56 → 49 → 42 → 35 → **31**. Depth stayed at 60m, air stayed at 349, moves stayed at 0. `#btn-descend` reported `disabled:false, opacity:1, pointerEvents:auto` throughout.

**`changeDepth` has already computed `actual === state.currentDepth` before it applies the damage. The game knows the move is impossible and charges for it anyway.** Ping is the only disabled control in the entire file (line 3810).

Three aggravating factors, each independently reported:

- **The eleven impact prose lines make it worse, not better** — it reads like something is happening.
- **The lesson is taught backwards.** At depth 0, ▲ logs *"You are at the surface."* and costs nothing. In a cave, ▲ into a ceiling costs 4–8 hull. The harmless behaviour is taught in the safe place and the punishing one is discovered in the dangerous place. *(FORTY, minor)*
- **The natural mobile behaviour is the punished one.** `diveStepFast` is 120m, so reaching 2400m is 20 consecutive presses of a 38×35px button with a 6px gap to its neighbour. Hammering ▼▼ until you stop moving is exactly how you find the single 60m slice where salvage can be collected — and exactly what the code bills you for. *(MOBILE, TWENTY, BUTTONS)*

**Note on intent:** the source comment reasons deliberately about this (*"driving the sub into a chamber ceiling is just as much striking rock as driving it into a side wall"*), and carves out only the surface. So the damage is a design position, not an oversight. The problem is the missing disabled state, not the collision.

**Fix:** grey out ▼/▼▼ when `volumeContaining(tile, depth).floor` is already reached, and ▲/▲▲ at a ceiling. The information is already computed. Keep the collision available for a deliberate ram if you want it — just not on the default tap. And take the dive buttons to 48×48 with 12px gaps; `#dive-controls` is 343px wide and the depth readout is eating 169px of it.

---

## 5. The economy can be broken in about forty taps — and the invariant that would prevent it is one line
**Found by: OPTIMISER (1 of 6, three separate verified blockers).** Verified; **I re-derived the arithmetic from the source and it is worse and simpler than reported.**

Only one persona goes looking for this, which is exactly why it needs to be near the top: **every tuning decision downstream of the economy is meaningless while an infinite-money button exists in it.** You cannot playtest a crate economy that has a free crate faucet.

### 5a. Two of three peoples buy back their own stock above what they sell it for

`buyPriceFrom` uses `culture.markup`; `sellPriceTo` uses `culture.buys.mult`; **nothing checks that `markup >= mult`.** From the source:

| People | markup (you pay) | buys.mult (you receive) | Profit per cycle |
|---|---|---|---|
| **Children of Dagon** | 2.6 | **3.6** | **+1.0 × val** |
| **The Confluence** | 1.8 | **2.1** | **+0.3 × val** |
| The Libertines | 2.2 | 1.8 | none (correct) |

The Libertines are the control case that proves this is a data slip, not a design. Live-verified with real DOM clicks: 30 pressure-hull cycles at a Confluence enclave took cargo 20 → 50; 20 idol cycles at a Dagon enclave took cargo 20 → **140**. `tradeBuy`/`tradeSell` consume no turn, no air, and make no noise. It is a pure button-mash.

**Fix:** one invariant — refuse to buy back anything in `cu.sells`, or cap `sellPriceTo` at `floor(buyPriceFrom * 0.6)`. **And a one-line test in `items.test.js` that asserts `markup > buys.mult` for every culture would have caught this before it shipped.** Add that test whatever else you do.

### 5b. Every boat fitting is uncapped

`fitItem()` does `state.fits[k] = fitLevel(k) + 1` with no ceiling. `safeDepthNow() = sub.safeDepth + fitLevel('depth') * 450`. The Confluence sells pressure-hull at 7 crates and lives in shelf water under 900m — reachable on turn one in the starter boat, and paid for in **aboard** crates that never have to be sailed home. Two plates (14 aboard) beat the Charon's safe depth (20 banked), so the boat ladder is bypassed before it starts. Probe: 30 plates → `safeDepthNow()` 15,000m against a world floor of ~11,000m; 30 hydrophones → passive range 31.

Compounding it: **`crushDepth` never appears in the damage formula.** All pressure damage is gated on `currentDepth > safeDepthNow()` (line 6703); `sub.crushDepth` is used only for a log string, a HUD colour and a tick on the depth bar. With 2 plates an Erebus takes **exactly 0 hull per move at 2400m, 550m past its own stated crush depth.** The advertised safe/crush two-band model is one band that money moves.

**Fix:** cap each fit (depth 2, sonar 2, quiet 2, trim 2). Advance `crushDepth` with the fit too, or apply a separate hard penalty past `crushDepth` regardless of `safeDepthNow` so the second line still means something.

### 5c. The lead chain becomes perpetual motion at tier 7

`resolveLead` chains with `rand() < 0.5 + tier * 0.08` (line 1615, confirmed). **That expression reaches 1.0 at tier 6.25, so from tier 7 the chain is guaranteed forever.** Every payout term scales with tier and none are capped: crates `2+tier … 4+tier`, relic chance `0.35 + 0.15*tier` (certain from tier 5), items `1+floor(tier/2) … 2+floor(tier/2)`. A tier-50 link pays 52–54 crates and 26 items. Monte-Carlo over 200,000 chart reads: **20.5% of chains reach tier 7 and then never terminate.**

**Fix:** `Math.min(0.85, 0.5 + 0.08 * tier)` and a hard tier cap, or make each link cost something that scales too — air, threat, a hunter drawn to the cache.

---

## 6. The ocean is empty, so the economy never pays, so nine built systems are at 0% reach
**Found by: MOBILE, FORTY, TWENTY, OPTIMISER, BUTTONS (5 of 6 — 4 blockers).** Verified in the harness, in headless probes and in the live browser, by five people separately. One sub-claim is Contested — see D2.

This is the game, and it is one causal chain. Presented as one entry because the fixes are one family of levers.

**Supply — there is nothing out there.**
- OPTIMISER's 61×61 census: 3,335 open hexes containing 11 wrecks and 6 ruins = **26.7 crates per 3,335 hexes**.
- TWENTY, 14 seeds, r≤20 of the dock: ~3.9 salvage/ruin sites per seed. FORTY, 8 seeds within 12: **one salvage per 629 open hexes; 0.6 workable wrecks per starting region.**
- **FORTY's 3-D BFS over the (hex, depth) graph the game actually moves on found ZERO routable salvage or ruin within 14 hexes and 3,600m in 6 of 12 seeds.** BUTTONS found 18 of 24 seeds with none within 14 hexes. Half of all captains are handed a home ocean with no reachable prize, are never told so, and the run is dead before the first decision.

**Yield — a worked wreck pays one crate.** `state.cargo++`, line 7429. TWENTY: a round trip to a typical wreck is 40–50 taps for that one crate.

**Prices — set for an income the world does not produce.** Charon 20 banked, Nyx 60, a crewman 5, a station 6, a harpoon 8, a boarding axe 2. Against 26.7 crates per 3,335 hexes, that axe is **249 hexes of new water** and the Charon is 2,494.

**Result — measured four ways, agreeing:**

| Harness run | Ever picked up ANY cargo | Median crates banked |
|---|---|---|
| 40 runs × 300 turns | 25% | 0 (max 1) |
| 16 runs × 500 turns | 25% | 0 (max 1) |
| 24 runs × 1200 turns | 21% | **0 (max 1 across all 24)** |

1,200 turns is longer than FORTY's entire fortnightly session. TWENTY's independent probe over 3,768 turns of real game calls: **96% of turns produce nothing but scenery; 1 crate per 1,884 turns; 0 items entering the hold.**

**And so the content does not exist in play.** Across 24 runs × 1,200 turns, every one of these is at **0%**: claimed a station · held a station · station besieged · dug out a fortress · met the Dagon · met the Libertines · sold to a people · bought from a people · sold a body · found a drowned passage · waded · carried their dead · fired a torpedo · reached 2400m · reached the abyss · followed a lead · read a chart · fitted an upgrade · bought a better boat · sailed with crew. **1 of 35 items ever held** (4/35 on a shorter sweep). 13% entered a ruin on foot; 4% met a tenant.

Every system in the last five commits — crew as people, positioning, digging, sieges, the three peoples, drowned tunnels, the corpse trade, the 35-item hold with eleven wired properties — is downstream of banked crates and depth, and the funnel above them is closed. **Nothing on that list needs building. It needs to be reachable.**

**Fix — three independent levers; probably you want a little of each rather than all of one:**
1. **Density near home.** Guarantee 3–5 shallow, workable wrecks inside ~8 hexes of the dock on every seed, at shelf depth. The starting neighbourhood is a tutorial whether or not you write one.
2. **Yield.** A wreck pays 3–5 crates, scaling with depth, instead of 1.
3. **Price.** Charon at 5–6 rather than 20; the axe at 1. The first rung has to move once per session.

MOBILE adds the session-shape constraint: give the shelf (0–600m, five taps down) a guaranteed small prize on a short cycle — one crate per uncharted shelf hex — so a ten-minute ride always banks *something*. The deep can stay a long pursuit.

---

# ONBOARDING & TEACHING

The standing ruling is *no scripted tutorial; the game teaches diegetically*. **The personas did not object to that ruling.** What they found is that the diegetic teaching is unreliable — gated behind coin flips, unreachable early returns, invisible affordances, and a log that evicts it. Fixing reliability does not require abandoning the ruling. See Disagreements §D1.

### O1. You are never told you are standing on a wreck above 200m, and only ~45% of the time below it
**FORTY (blocker), BUTTONS (major), TWENTY (contributing). 3 personas.** Verified — I re-read `handleTile`.

Two unconditional early `return`s sit above the switch on `tile.type` (lines 7360–7373): an `atSurface` branch and an `inShallow` (<200m) branch, both firing on every first visit. **So in the top 200m — the shelf, where the starter boat lives — swimming onto a wreck or ruin prints generic marine-snow flavour and the salvage case is never reached at all.**

Below 200m the hint is behind `rand() < 0.5`. FORTY's probe over seed 47302 (30 wreck/ruin hexes, 200 first-visit arrivals per depth):

| Depth | 0m | 60m | 120m | 180m | 240m | 360m | 600m | 900m | 1200m |
|---|---|---|---|---|---|---|---|---|---|
| Wreck mentioned | 0% | 0% | 0% | 0% | 51% | 44% | 49% | 43% | 45% |

Combined with the glyph being hidden until you have charted within 180m of the seabed, **a wreck on the shelf is completely invisible: no marker, no message, nothing.** This is a large part of why 79% of runs never pick up a crate.

Three instructional lines carry the same `rand() < 0.5` gate — salvage ("Descend to work it"), ruins ("Descend to put divers on it"), air pockets ("Rise to vent"). These are not flavour. They are the sentences that teach the entire salvage loop, and they are coin flips.

**Fix:** move the salvage/ruin/air switch **above** the depth-flavour early returns, and drop the `rand()` gate on all three. *Randomise flavour; never randomise instruction.* One mercy already in the code and worth keeping: the hex is not burned (`poisFound` is not pushed), so you can come back if you ever learn it is there.

### O2. Nothing ever states the objective
**TWENTY (major), BUTTONS (major). 2 personas.** Verified.

`restart()` emits exactly two lines: the dock description and *"The Erebus casts off. The hatch is open; the air is yours."* Nothing anywhere — not the title card, not the cast-off, not any help screen — says that salvage is the point, that crates are currency, or that the dock buys things. There is no help screen, no legend, no glyph key (`grep` for legend/Help/tutorial returns no UI). **There is not even a cargo counter in the HUD to hint that cargo matters** (see E9).

BUTTONS played 41 moves on a clean save: 71 log lines, cargo 0, and not one line naming the trade.

**Fix:** one line on the CAST OFF turn — *"the yard pays in crates for anything you can winch off the bottom"*. It is diegetic, it never goes stale, and it is the whole game. Plus a crates readout in the HUD.

### O3. The safe and crush depths are never written down anywhere
**FORTY (major), BUTTONS (major), MOBILE (contributing via the depth strip). 3 personas.** Verified.

The HUD is AIR / HULL / DEPTH and stops. The number 1500 appears in the source 11 times and in player-facing prose **zero** times. The Erebus's own description says *"the deep abyss will crush it"* — but `.description` is printed only when you **buy** a boat (line 7906), so the starter's is never shown to anyone, ever.

Worse, the warning does not scale. Past safe depth the game says *"The hull groans under the pressure."* — identically at −2 hull/move and at −26:

| Depth | Hull/move | Message |
|---|---|---|
| 1560m | −2 | "The hull groans under the pressure." |
| 1800m | −12 | *identical* |
| 1980m | −19 | *identical* |
| 2160m | −26 | *identical* |

So the lesson learned at 1560m ("this costs me nothing much") is actively false at 1980m, where a full-hull Erebus has four moves left. And below `over > 50` there is no message at all — the first 50m past the limit is billed silently. **That is a trap dressed as atmosphere.**

**Fix:** put the rating on the HUD next to depth (`600 / 1500 m`), turn it amber past it, and scale the prose into three bands stating the cost once — *"The hull groans — that is seven plates a mile down here."*

### O4. Every button's explanation lives in a `title=` tooltip, which does not exist on touchscreens
**TWENTY (major), BUTTONS (major). 2 personas.** Verified.

Fourteen of eighteen controls carry a genuinely useful one-line explanation — what LOOK costs, what SEAL BULKHEAD sacrifices, why DIG is dangerous — delivered by an affordance Android Chrome does not have. **On the target platform the game ships with excellent documentation that is 100% invisible.** DIG, FORTIFY and BOARD IT are not self-describing to anyone who has not read a design document. PING and SURFACE have no title at all.

**Fix:** long-press a button to log its title line, or log it once the first time each control becomes available. Zero new copy required — it makes writing that already exists reachable.

### O5. The death screen is the most-read screen in the game and it misinforms
**BUTTONS (major, wrong cause), FORTY (major, silent losses). 2 personas, two distinct defects.** Verified. 9 of 16 bot runs end in death; this is the last impression of every failed session.

- **It names the wrong cause.** `checkDeath()` has two hardcoded strings and no cause parameter. BUTTONS died at 240m from repeatedly hitting the seabed and was told *"The hull fails. The pressure finds every seam at once."* Crush depth is 2,200m. A new player learns "don't go deep" — the exact opposite of the actual lesson and of what the game wants them to do.
- **It never says what you lost from the hold.** `endGame()` wipes `state.items` and `state.fits` — every consumable, every relic-work carry, every bolted-on fitting. The screen lists moves, max depth, discoveries, crates, relics and the dead, and not one word about a pressure hull worth +450m of safe depth. Then `doSave(true)` fires immediately, before you have finished reading, so there is no reload to undo it.

**Fix:** pass the cause into `checkDeath` and print the last thing that hurt you — *"You drove her into the rock once too often"* is truer and more in voice. Add one line to `go-stats`: *"Gone down with her: a pressure hull, a sonar array, two patch kits, three fish."* Grief needs an inventory. And bump the stat block off 11.2px.

### O6. Coming back after a week, the game tells you one thing: your depth
**FORTY (major). 1 persona — but this persona is the twice-a-week player, and it is his defining need.** Verified.

`resumeGame()` wipes the log and writes a single line: *"The chart unrolls where you left it. The Erebus holds station, 1080 m down."* FORTY built a mid-campaign captain (2 active leads, 2 named crew with scars, 11 banked / 2 vaulted, 4 crates aboard, four item types, a sonar fit, stores 46), round-tripped the save, and got that one line. No objectives panel, no journal, no ledger, no log history — `#objectives`, `#journal`, `#quests`, `#ledger`, `#captains-log` are all absent from the HTML. And the title button says "Dive" whether or not a save exists, so there is no confirmation your campaign was even found before you commit to it.

**Fix:** a three-line resume brief — where the boat is and what shape it is in, who is aboard, what marks are still on the chart and their bearing. Label the button **Continue** when a save exists.

### O7. "Wait" is an invisible, unadvertised tap target on your own hex
**BUTTONS (major), MOBILE (minor). 2 personas.** Verified.

`render()` attaches a polygon over the sub's own hex at 85% of hex size, `fill: rgba(0,0,0,0.001)`, wired to `wait()`. No label, no glyph, no mention in any log line or tooltip. Passing a turn is a **core verb** — it is how a hunter's interest decays, how you let a besieger come to the lock, how a decoy works. BUTTONS played 200 taps and found it only by reading the source.

It is also a trap in the other direction: it is a real turn (`baseTick`, `moves++`, `applyMoveCosts(1)`, `creatureTick`, `checkDeath`), it sits in the dead centre of the screen at ~57px, and it is visually identical to the six move targets around it. A slipped thumb silently spends a turn and gives every hunter a free move.

**Fix:** a "Hold Station" button, or at minimum draw the own-hex target with a faint dotted ring so it reads as pressable — and shrink it so a near-miss on a neighbour cannot land on it.

### O8. The sonar readout prints "OFF AIR · SILENT M" at power 0 — the exact state the game tells you to enter
**BUTTONS (major). 1 persona.** Verified.

When a hunter locks on, the game says *"kill the sonar and pray it loses you."* If you work out that this means dragging SONAR POWER to zero, your reward is a broken string: line 814 hardcodes the words `air ·` and `m` around the two spans, and `updatePingDisplay` substitutes "OFF" and "silent" into them. Nothing labels 0 as silent running, and nothing says it also blinds your passive sonar.

**Fix:** special-case the whole line at 0 — *"SONAR — SILENT RUNNING · deaf and unseen"* — and put a labelled tick at the zero end of the slider.

---

# ECONOMY & PROGRESSION

The three structural breaks are in §5; the supply failure is in §6. These are the rest, and several are one-liners.

### E1. Purchases expire on a 45-second wall clock that runs while the phone is in your pocket
**MOBILE (major), TWENTY (major), BUTTONS (minor). 3 personas.** Verified.

All four dock flows arm an offer with `until: performance.now() + 45000` and require a second SURFACE press inside that window (lines 7913, 7933, 7970, 7993). `performance.now()` is monotonic from navigation and **does not pause when a tab is backgrounded**, so locking the phone for a minute silently kills the offer. This is the one place a purely turn-based game reaches for a real-time timer, and it is aimed squarely at the interruption the mobile player lives with.

Worse: **none of the four offer objects are in `doSave()`'s payload**, and `resumeGame` explicitly nulls `_outfitOffer`. MOBILE's headless probe set the offers, saved, and parsed the blob — `_outfitOffer saved? false`, and the same for all four. Android evicts tabs routinely; a pending purchase evaporates with no trace. The only notice you ever get is a log line, which the log discards within two more messages.

**Fix:** expire the offer on **moves** (leave the dock hex) rather than seconds, and persist it. The confirm-by-repeating-SURFACE idiom is fine; the stopwatch is the problem. See D6 for the larger question.

### E2. There is no shop — every purchase is a hidden double-tap of the button you press to top up air
**TWENTY (major), BUTTONS (minor), OPTIMISER (contributing). 3 personas.** Verified.

The port has no UI. It emits one random text offer at a time, gated by a strict precedence chain and a real-time window keyed to your exact hex. You cannot see what is for sale, what it costs, or **that a shop exists at all** until you happen to have enough crates. For anyone who has used FTL's store screen this reads as a bug.

And the confirmation overloads the action button: at the dock, SURFACE says *"Already at full air."* The natural response is to press it again — and if you happen to have 20 banked crates, that second press spends them and swaps your boat. BUTTONS verified the full sequence: press 1 offers the Charon, press 2 buys it, press 3 offers a hire, press 4 signs Adeyemi aboard. Four taps of the same button, four different irreversible outcomes, no countdown, no visible state change.

**Fix:** a real port panel listing what is available with explicit Take / Not this trip choices. This one change also kills E1, E3 and E4.

### E3. The yard spends your savings before offering you the boat you saved for
**TWENTY (major), OPTIMISER (major). 2 personas.** Verified.

Auto-repair runs unconditionally, **first**, with no consent, and the outfitter offer is made only from what is left. Arrive with exactly the price of the next boat and one hull scratch, and the yard takes a crate to fix the scratch and then offers you a crew hire instead. The Charon offer never appears, and there is no "you are three crates short" line anywhere in the function.

- TWENTY: bank exactly 20, hull 99/100 → *"1 crate buys +1 hull. 19 banked"* then a CREW offer. At hull 100/100, the Charon is offered immediately.
- OPTIMISER: 21 banked + hull 5/100 → 4 crates spent, 17 banked, no outfit offer.

It also prices repair terribly at the margin: `spend = ceil((max-hull)/25)` is charged but `gained` is capped at the actual deficit, so **repairing 1 hull point costs a full crate.**

**Fix:** make repair an offer like everything else, or at minimum run it *after* the outfitter and log *"the yard held off — you are three crates from the Charon."*

### E4. The port offer chain locks you out of crew, gear and the harpoon the moment you can afford a boat
**OPTIMISER (major), BUTTONS (contributing). 2 personas.** Verified.

`surface()` runs yard → outfit → hire → armory → arms, each gated on the previous offer being unset. `if (next && cargoBanked >= SUBS[next].price)` fires unconditionally, so **any bank at or above the next tier's price permanently suppresses the hiring hall, the armory and the harpoon.** You cannot skip a tier: saving 60 for the Nyx keeps the 20-crate Charon offer standing forever. The armory needs a full crew *plus* a bank in [2,19] — a window most captains never occupy. OPTIMISER made 30 presses with 200 banked and produced zero armory offers.

This is why FIRE's advice (§2) cannot be followed.

**Fix:** show all available offers at once, or let the player decline the boat for the visit so the lower rungs open.

### E5. Leads: the depth is rolled wrong, displayed wrong, not enforced, and never shown on the chart
**FORTY (2× major), OPTIMISER (major), TWENTY (contributing). 3 personas, four defects in one system.** Verified.

Leads are the game's only directed goal, and all four legs are broken:

1. **Rolled past your own crush depth.** `leadTarget` rolls uniformly over 600–3800m regardless of boat (line 1566, confirmed). Over 500 rolls: median 2100m, **70% past the Erebus safe depth, 47% past its crush depth.** Following the game's own signposting kills you.
2. **Not enforced at all.** `checkLeads` resolves on `hexDistance` alone — `L.d` is never compared with `state.currentDepth`. OPTIMISER laid a lead at 2520m and resolved it **standing at depth 0** (cargo 0→3, +weldkit). So the depth gate on the richest reward loop does not exist.
3. **Always off-screen, with no indicator.** Leads are placed 8–16 hexes away; the chart at phone width shows a radius of 3 hexes east-west and 4 north-south. The render loop draws a lead only if it falls inside the viewBox and otherwise `continue`s — **no edge arrow, no bearing pip, nothing.** The mark you just paid a sea chart for is guaranteed invisible from the moment it is created. Your only guidance is one log line (evicted within two messages) and a 40%-chance nudge that starts once you are already within 4 hexes.
4. **Infinite past tier 7** — see §5c.

**Fix:** scale the roll to `safeDepthNow()`; add `&& Math.abs(state.currentDepth - L.d) <= DEPTH_GRID` to `checkLeads`; clamp off-screen leads to the chart edge as a ⌖ with bearing and distance, the way Elite's compass does. State the comparison in the log line: *"2400 m down — nine hundred past what this hull is rated for."*

### E6. Cross-culture arbitrage — the advertised point of the three peoples — does not exist
**OPTIMISER (major). 1 persona.** Verified.

The design pitch is *"where you carry a thing decides what it is worth."* OPTIMISER enumerated every (item × seller × buyer) triple in `CULTURES`: **there is not one profitable cross-culture trade.** A Libertine warhead costs 11 and fetches 9 from them and 0 from anyone else. Every profitable loop in the game is same-vendor — i.e. the bug in §5a. The trade triangle is inert.

**Fix:** give each people a few items they stock cheaply that another prizes — Libertines stock ingots (Confluence `sig`), Confluence stock scrimshaw. That is the whole trade game and it is one data-table edit away.

### E7. The trade panel can only be opened by a horizontal move
**OPTIMISER (major). 1 persona.** Verified.

`openTrade()` is called from exactly one place — `checkEnclave()` — which is called from exactly one place: `move()`. **`changeDepth()` never calls it, and there is no Trade button.** So descending onto an enclave, which is the natural approach to a Dagon enclave at 2400m+, leaves you sitting inside it with `enclaveHere()` returning true and no panel, no creed, nothing. Close the panel to check your Hold and you cannot reopen it without moving two hexes out and back.

**Fix:** call `checkEnclave()` from `changeDepth()` too, and add a Trade button to `syncFootControls` whenever `enclaveHere()` is non-null.

### E8. The engineer role does nothing whenever you can afford the repair
**OPTIMISER (major). 1 persona.** Verified. One of three crew roles is a paid no-op.

`need` is computed as `ceil(damage / hullPerCrate)` **without** the engineer multiplier, and `gained` is then capped at the outstanding damage — so spend is identical with or without an engineer and the bonus is always clipped away. Across damage 30/60/99/130 at engineer level 0, 3 and 9: spend 2/3/4/6 and gain 30/60/99/130 in **every** case, byte-identical. `crewLvl('engineer')` appears exactly once in the whole file.

**Fix:** `need = ceil(damage / (hullPerCrate * (1 + 0.25 * eng)))`. Or give the engineer a second hook — cheaper digs, slower hull damage past safe depth.

### E9. The HUD never shows money
**OPTIMISER (minor), TWENTY (contributing). 2 personas.** Verified.

`#hud` reads exactly `AIR 350 HULL 100 DEPTH 600 m`. Crates aboard, crates banked and relics appear nowhere on screen. For a game whose central loop is *work salvage, carry it home, spend it*, the player must reconstruct their balance from log scrollback that does not exist. Every economy decision in this section needed a number the interface does not show.

**Fix:** a `▪3 ✦1 · 7 banked` strip under the HUD. One-line `updateHUD` change.

### E10. The corpse trade pays nearly three times what a hand costs
**OPTIMISER (minor). 1 persona.** Verified. *"It is the worst thing in the game, it is available, and it pays"* — the arithmetic currently makes it the best-paying thing in the game per unit of investment.

A crew hand signs on for 5 banked crates. Their fresh body sells to Dagon for 14 aboard crates. The only cost is 12 nerve to every survivor — **and the port surgeon restores every crew member's nerve to 100 for free on the next visit** (line 7864).

**Fix:** make the nerve cost permanent in some form — a scar, a trait, a refusal to sign on again — and drop `corpseValue` below the hire cost, so selling a hand is a loss you take in desperation rather than a business model.

### E11. Smaller economy defects
All **OPTIMISER**, all verified, all minor — grouped to keep them from crowding the list.

| Problem | Detail | Fix |
|---|---|---|
| **The hire and armory are free slot machines** | The hire setter re-rolls name *and* role on every SURFACE press with no live offer; air is free at the dock, so you pull the lever until a diver appears. 12 free pulls gave 7 sonarmen, 3 divers, 2 engineers. | Seed the offer off `state.moves`, not `rand()` — the hand on the dock is the hand on the dock until you sail. |
| **The dock is the worst torpedo vendor** | 2 relics for 3 torpedoes = 28 crate-equivalents at Dagon rates; the Libertines sell three torpedo items for 21 aboard crates. | Reprice, or make the dock's convenience worth something else. |
| **`relicsBanked` is a scoreboard** | Only three sinks exist (lance ×1, wardsuit ×1, torpedoes ×2) and the Erebus's crewCap of 2 means at most 4 relics can ever be absorbed. A relic carried to Dagon is 14 crates. Correct play: never bank one. | A port relic exchange at a poor rate (~5 crates) so relics always have a floor. |
| **Both keys are 4–6% of every roll and there is nothing to unlock** | `hatchkey`/`bonekey` sell for 0 to all three peoples; `useItem` prints *"There is no lock within reach that it fits."* Known-deferred, but it reads as broken and dilutes a thin drop table. | `find: 0` until locks exist, or let the Confluence buy them as scrap. |
| **The specimen jar is unsellable and undroppable** | Kind `valuable`, `buyMult` returns 0 for all three peoples — the only valuable with no buyer. Its `living` prop frays crew nerve ~0.36/move. `renderInventory` only surfaces Cast Off for cursed/volatile, so it shows an inert "carry it?" label. Only exits are a station or death. | Show Cast Off for any harmful prop; give Dagon a reason to want it. |
| **The shot-turret (22cr) is dominated by the hardened lock (14cr)** | They differ only when siege power ≥ 11, needing depth ≥ 2250m. At 600/1500/2400m both give 334 turns to breach. And the lock alone floors the rate at 0.3 = effectively permanent immunity. Top two rungs of a five-rung ladder are a fake choice. | Scale siege power with depth faster; make the floor scale with power so no defence is absolute. |
| **Digging costs more threat than the warren bonus is worth** | 2 crates and +6 threat per tile; a siege starts at 100. Full `/3.5` divisor needs 30 tiles = 60 crates and +180 threat ≈ two self-inflicted sieges — protecting against a thing the 14-crate lock already neutralises. | Drop threat/dig to ~2 and make dug rooms *hold* something (stores, emplacements) so the payoff is not purely defensive. |

---

# MOBILE & UI

The control row (§1), dead controls (§2), the log (§3) and the dive arrows (§4) are above. These are the rest. **Reminder: zero `@media` queries in the file.**

### M1. "Cast Off" labels two opposite actions, one of which destroys an item stack with no confirmation
**LITERATE (major), BUTTONS (major). 2 personas.** Verified — `grep 'Cast Off'` returns exactly two hits, and I re-confirmed both.

- **Line 743**, on the trade panel: `<button class="btn" id="trade-close">Cast Off</button>` — closes the dialogue, you sail on.
- **Line 1349**, in the Hold: `<button class="act warn" data-j="${k}">Cast Off</button>` → `jettisonItem` → `takeItem(key, itemCount(key))` — **the entire stack, permanently, on one 85×31px tap, no confirmation.**

A player who learns the first meaning at an enclave will, in the Hold, tap "Cast Off" beside their idol and lose a 22-crate valuable. Both readings are correct nautical English, which is exactly why the collision is dangerous. It sits in the same column position as the harmless "Use" buttons on neighbouring rows.

**Fix:** rename the Hold action to **Over the Side** (the jettison log already uses that phrasing) and leave "Cast Off" to the trade panel. Give it the armed two-tap that NEW WORLD already has.

### M2. Every refusal inside the Hold and Trade panels is silent
**MOBILE (major), BUTTONS (minor). 2 personas.** Verified.

`useItem()` has five refusal paths that each `log()` and return — full hull, full tanks, full lockers, nobody wounded, nobody near breaking — and the trade functions do the same. But `#inventory` is z-index 55 and `#trade` is 56, both `inset: 0`, while `#log` is z-index 10. **The panel is a full-screen overlay covering the only channel the refusal is written to.** The player taps Use, the item is correctly not consumed, and absolutely nothing happens: no toast, no inline message, no shake, no colour change. `sfx('bell')` fires only on success, and only if audio is on.

MOBILE confirmed with `document.elementFromPoint` at the centre of the log rect: it returns an element inside the Hold panel. A thumb-driven player taps three or four times and concludes the button is broken.

BUTTONS found the same shape at an enclave with 0 crates: every price button renders `class="act none"` with `data-buy = null`, so the listener at line 1426 never binds. Five taps, zero acknowledgement, and `tradeBuy`'s own *"Not crates enough for that"* is unreachable code. The `.act.none` dim rule is scoped `.inv-row .act.none` so it barely reads — 2.5:1.

**Fix:** route `log()` through a callback that also writes into a status strip inside the open panel (there is room under `#inv-head`). Flash the tapped button red on refusal. Bind the handler even when unaffordable and let it say why.

### M3. Modals can only be dismissed by a 70×31px button at the top of the screen
**MOBILE (major). 1 persona.** Verified.

The Hold and Trade overlays have exactly one exit each. **Tapping the dimmed backdrop does nothing. Escape does nothing. There is no `popstate` or `history.pushState` anywhere in the file** — so the Android back gesture, the reflex every Android user has for dismissing a sheet, navigates away from the page entirely. The close button sits at y=88 on an 812px screen: the single hardest region to reach one-handed.

**Fix:** close on backdrop tap; push a history entry when a panel opens and pop it on back; add a full-width Close bar pinned to the **bottom** of the panel where the thumb already is.

### M4. The numbers that keep you alive are 8.8–13.6px, and pinch-zoom is disabled three ways
**MOBILE (major), FORTY (major). 2 personas.** Verified.

The prose is generously sized (18.4px). Every piece of scannable instrument data is not:

| Element | Size | Note |
|---|---|---|
| AIR / HULL / DEPTH labels | **8.8px** | 0.25em tracking, 4.98:1 — right at the AA floor |
| The air value | **13.6px** | 44% of deaths are asphyxiation |
| Sonar cost / range | 9.6px | |
| Every button label | 11.2px | |
| Hold property tags (VOLATILE, CURSED) | **8.96px** | safety information the brief calls fairness |
| Death-screen stats | 11.2px | the run's only report card |

FORTY measured x-heights: 8.8px JetBrains Mono gives a 5px x-height. And there is no escape hatch — the viewport meta sets `maximum-scale=1.0, user-scalable=no`, `body` sets `touch-action: none`, and `gesturestart`/`gesturechange` are `preventDefault`'d. Three separate locks on a player who simply cannot read 5px.

**Fix:** stat values to 20px, labels to 11px (the HUD has 61px of height and is mostly whitespace); `.btn` to 12.5px with 0.1em tracking — **which also buys ~40px of row width toward §1.** Drop `maximum-scale`/`user-scalable`: the pinch-block is already handled by `touch-action` and the gesture handlers, so the meta buys nothing except locking out people who need to zoom.

### M5. The depth gauge is 26px wide at 1.26:1 with its labels hard-disabled
**MOBILE (major). 1 persona, but it compounds O3.** Verified.

`#depth-strip` is the only place the game shows the shape of the water column — ceiling, floor, safe depth, crush depth. It is 28px wide, `pointer-events: none`, and `#depth-strip-labels` is hardcoded `display: none` with the comment *"hide for now to keep strip clean"* (line 284) — **so it carries no numbers at all.**

Contrast against black: hex-range fill 1.26:1, crush line (1px dashed) 2.42:1, safe line 4.54:1. The only clearly visible element is the 4px lantern marker. Since collecting salvage requires landing within one 60m slice of the reachable bottom, this strip is doing load-bearing work it is not legible enough to do.

**Fix:** widen to ~44px, re-enable the labels with current depth and the run's floor in metres, raise the band fill to ~0.35 alpha, make the crush line 2px solid. Then make it tappable — drag the marker to dive, which would also relieve the 20-tap elevator problem in P2.

### M6. On foot, the deck is invisible in daylight — walls read at 1.16:1
**MOBILE (major). 1 persona.** Verified. FATHOM_NEXT already predicted this: *"Deck legibility at the memory-dim end is the most likely first complaint."*

`renderInterior` draws the room's shape entirely with fill colours against a pure black chart: wall `#1b1712` @0.95 = **1.16:1**, lamplit floor `#3a3126` = 1.65:1, door 1.77:1, rubble 1.81:1. Remembered tiles multiply all of it by `dim = 0.4`, dropping them to 1.03–1.09:1. The glyphs on top are fine (the `@` is 17:1) — **but the glyphs do not tell you where the walls are; the fills do.** In sunlight the whole deck is one black rectangle with floating symbols, and on-foot is where flooding, tenants and digging all live. There is no brightness or high-contrast option anywhere in the file.

**Fix:** lift the lamplit floor to ~4:1 (e.g. `#6b5c46`), give walls a visible 1px outline instead of relying on a 1.16:1 fill, raise `dim` to ~0.65, and add a "bright water" toggle beside the sound button.

### M7. You cannot both see the world and tap it
**TWENTY (major), FORTY (minor), MOBILE (minor). 3 personas.** Verified.

At the default zoom of 2.4 the chart shows a radius of 3 hexes east-west and 4 north-south — about 6 hexes across, 12 polygons at the dock. Prizes are 10–26 taps away and leads are 8–16 hexes off, so **you steer blind.** Pinching out to `ZOOM_MIN` 0.6 drops hexes to 15.8×18.2px and POI glyphs to 9px — well under the touch minimum, effectively inert. There is no middle setting, no minimap, and no waypoint marker to bridge the gap, so the loop is: pinch out to plan, pinch in to act, repeat — a two-handed gesture cycle in a one-thumb game.

Render cost is not the constraint (1.2ms at 2.4, 7ms at 0.6). This is purely a legibility choice.

**Fix:** the cheapest half-fix is an **off-screen edge indicator for known POIs and leads**, which solves the blind-steering problem without touching zoom (and doubles as the fix for E5.3). Beyond that: keep hit polygons at a constant screen size independent of zoom, or raise `ZOOM_MIN` to ~1.2.

### M8. On a 640px-tall phone the chart gets 45% of the screen
**MOBILE (major). 1 persona.** Verified.

`#hud`, `#log` and `#controls` are all `flex-shrink: 0` with fixed heights, consuming a constant **351px** regardless of viewport. At 812px that is a tolerable 56.9% for the chart; at 360×640 — a budget Android, or any phone the moment Chrome's URL bar shows — the map collapses to 290px, about four hexes tall. The ping-power row alone permanently occupies 61px for a slider you touch once a minute.

Compounding it: `html`/`body` are `position: fixed; overflow: hidden; touch-action: none`, so the document never scrolls, so **Chrome's URL bar can never auto-hide** the way it does on a normal page. The game permanently forfeits that strip.

**Fix:** collapse the ping row into the button bar (a "Sonar 3" button opening a small stepper) and let `#log` shrink below ~700px viewport height. That is ~100px straight back to the chart. See D4 — this competes with the log fix.

### M9. Almost every touch target is below the 48dp Android minimum
**MOBILE (minor), TWENTY (minor), BUTTONS (minor). 3 personas.** Verified.

Material asks 48×48dp; WCAG 2.2 AAA asks 44×44px. The chart hexes are genuinely good at 63×73px. Essentially every chrome control is not — and they are the controls you use when something has gone wrong and you are hurrying:

| Control | Size |
|---|---|
| Hold/Trade action buttons (Use, Fit, **Cast Off**, Buy, Sell) | 47–62 × **31px** |
| `#inv-close` / `#trade-close` | 70×31 / 94×31 |
| Dive buttons | 38×35, 6px gaps |
| `#sound-btn` / `#recenter-btn` | 34×34 / 36×36 |
| Ping slider thumb | 16px |

The worst case is the Hold action column: 31px tall, right-aligned at x≈289 in the zone a one-handed grip reaches least well, in a scrolling list, where one of the reachable actions permanently destroys an item stack (M1).

**Fix:** a global `min-height: 44px` on `.act`, `.btn` and the round overlay buttons. Hold rows are already 75–175px tall, so there is no layout cost.

### M10. Smaller UI defects

| Problem | Who | Confidence | Detail & fix |
|---|---|---|---|
| **Four render-blocking Google Fonts requests** | MOBILE, FORTY (2) | Verified | Line 11 is `@import url('https://fonts.googleapis.com/...')` inside the inline `<style>` — render-blocking, so on a train in a dead zone the player stares at a blank `#040810` screen. **This violates the standing law "Single file, no deps"** and is the one thing between this game and working offline, which is exactly what a commuter wants. Forcing the fallback changes row scrollWidth 479→460, so the layout does not depend on it. **Fix:** base64 two subset WOFF2s, or take the system stacks and pick sizes that work in both. |
| **Hold rows run to 175px with the action button floating mid-row** | MOBILE (1) | Verified | `.inv-row` centres the action vertically, so on a tall row the button sits 72px below the item's name — name and button visually decoupled. 35 items = a ~3,500px list with no search, no filter, no section headers. Using the last of a consumable removes its row and reflows everything under your thumb — the classic double-tap hazard, next to Cast Off. **Fix:** `align-items: start`, clamp flavour to two lines, sticky kind headers. |
| **Duplicate DOM ids** | MOBILE, TWENTY, BUTTONS (3) | Verified | `#inv-panel` and `#inv-head` each declared twice (lines 734/742, 735/743). Harmless today because nothing queries them — but it is a live tripwire for exactly the panel-level fixes this audit recommends (a status strip, a scroll restore, a height fix). **Fix:** rename the Trade copies to `#trade-panel`/`#trade-head`, promote shared styling to a `.sheet` class. |
| **Sound is on by default; its 34px mute button covers the depth strip** | MOBILE (1) | Verified | `audioMuted` starts false and only flips if localStorage holds '0', so a first launch in bed starts making noise on the first Dive tap. The button also occludes the top 7.7% of the depth gauge — the surface marker. **Fix:** default muted with a "tap ♪ for sound" hint; 44×44; nudge it left of the strip. |
| **`viewport-fit=cover` with no safe-area insets** | MOBILE (1) | **Suspected** | The meta opts into drawing under system bars but there is not one `env(safe-area-inset-*)` in the file. `#controls` has a flat 19.2px bottom padding against a typical 24–48px gesture zone, and the app is `mobile-web-app-capable`. Would put SURFACE partly inside the home-gesture strip. *Absence of insets is verified; the harm needs a real device.* **Fix:** `padding-bottom: calc(1.2rem + env(safe-area-inset-bottom))`. |
| **8px Manhattan tap threshold eats wobbly thumb taps** | MOBILE (1) | **Suspected** | `TAP_THRESH = 8` tested as `|dx| + |dy|`, so a diagonal slip of 6px per axis (8.5px of real travel) already registers as a pan and the capture-phase handler suppresses the tap. `touch-action: none` means Chrome's own tap heuristics are not there to help. Failure mode is the worst kind: the move silently does not happen. *Could not test a real thumb.* **Fix:** raise to ~14 and use `Math.hypot`, or gate on distance **and** duration — sub-250ms should count as a tap regardless. |
| **Walkable and wall hexes differ by a 0.8px dashed stroke at 55% alpha** | BUTTONS (1) | **Suspected** | Reachable neighbours get a faint dashed sonar-green stroke; walls and depth-locked hexes get `fill: rgba(0,0,0,0.001)`, no stroke, and a click handler that routes to collision damage. Probe over 2,400 sampled positions: **15.6% of adjacent hexes damage you if tapped.** *No screenshot possible — this is a CSS judgement, not an eyeball one.* **Fix:** 1.5px / 0.8 alpha, and a distinct faint marker for depth-locked openings — they are information, not just punishment. |
| **The trade panel's "They will take" half opens 496px below the fold** | TWENTY (1) | Verified | It does scroll, but on opening an enclave you see only their stock, with no affordance saying there is more. The differential-valuation idea is the entire point of the three peoples. **Fix:** a scroll hint, or a two-tab layout. |

---

# PROSE & WORLD

**This section exists because the writing is the game's best asset** (see WHAT IS WORKING). Every entry here is a case of good writing being wasted, contradicted, or worn out by repetition — not of bad writing. LITERATE found nearly all of it; the counts below are firing rates across 10 sessions × 600 turns (8,477 captured log lines) unless noted.

### W1. The on-foot layer has 49 sentences and says one of them 78% of the time
**LITERATE (blocker). 1 persona.** Verified.

Flooding is the declared keystone of the interior design, and the entire experience of it is **one hardcoded string** fired per step through a wet tile (line 5295). Once a deck is half under, nearly every step is a wet tile. LITERATE walked 40 real generated decks (6 seeds, ≤90 steps each): 4,021 log lines, **49 distinct**, of which **3,128 (77.8%) were the same sentence** — *"You go in up to the chest and push through. It is cold, and it is rising."* Second place, 349.

The line also asserts *"it is rising"* every time, including on a fully saturated deck where nothing is rising any more.

The rest of the dungeon is equally thin: `TENANTS` carries **one** `look`, **one** `hurt` and **one** `near` string per kind across 4 kinds, so a chase repeats the same "near" sentence every other step. `describeDeck()` — the on-foot LOOK — is 6 lead strings, 5 water strings and 1 proximity string; 24 samples produced **4 distinct outputs**.

**Fix:** wading, flood-advance and tenant-near are the three highest-frequency strings in the dungeon; give each a table of 8–10, the way `WALL_FACE` got 20. **Note for the handoff:** FATHOM_NEXT line 160 promises 36 tenant alternates sitting commented in `scratchpad/prose-expansion.js` — **that path is not in the repo** (`git ls-files` shows no scratchpad). They appear to be lost and will need rewriting.

### W2. The widening pass went to the tables the player reads least
**LITERATE (major). 1 persona.** Verified.

`FLAVOR` (line 7500) is the old, thin ambient set and the single largest source of text in play. It holds **62 strings against `describeSpace`'s ~123** — and it was never touched by the widening pass. `FLAVOR.openWater` is 7 strings covering every move in open water; `chasm` is 2; `kelp` 3; `ruin` 3; **`porthole.deep` is 4 strings covering everything from 250m to 8000m** — the entire deep column looks out of the porthole at the same four things.

Measured: FLAVOR fired **3,135 times (37% of all output) from 62 strings = 50.6 reads per string**, against describeSpace's 19.1. **Each FLAVOR string is read 2.6× as often as each new string.** In one session: *"Pressure builds slowly. The boat settles into the depth."* ×46; *"The hull is silent. You could be the only living thing for miles."* ×43.

**Fix:** run the same Sonnet-subagent-against-a-schema pass that produced the 123 new SPACE/WALL/MOOD lines, but point it at FLAVOR — `openWater` and `porthole.deep` first, and split `porthole.deep` into bands to match `DEPTH_MOOD`. **The model for this is documented and proven; it is the cheapest quality win in the document.**

### W3. "The ping returns only stone." — 619 fires, and it lies
**LITERATE (major). 1 persona.** Verified.

Ping is a core verb with an air cost and a noise cost, and **at the default power of 2 every non-POI ping falls through to a single fallback sentence** — all four descriptive branches require `power >= 3`. So the boat's most-used instrument has effectively one response line, and that line makes a **positive claim about stone** rather than admitting the ping was too weak to say anything.

619 occurrences across 10 sessions — the single most-repeated line in the game; 75 in one session; 21 of those adjacent duplicates. Of 522 cells classified `expanse` (5–6 open neighbours), a power-2 ping returned it in **59%** — often two lines after the arrival text said no wall answered the sonar.

**Fix:** make the fallback honest about the *instrument* rather than the rock — *"The ping comes back close and tells you nothing you did not already know"* — and let power 1–2 report open/closed cheaply, just at short range.

### W4. The most common sentence pattern in the game contradicts itself
**LITERATE (major). 1 persona.** Verified. This is 66% of all arrival prose.

`spaceClass` **defines** `expanse` as `lateral >= 5` (line 6963), so every expanse lead is immediately followed by a `DIR_COUNT` clause naming 5 or 6 discrete ways out. The leads are written as *"the walls fall away"*, *"No wall answers the sonar in any direction worth mentioning"*, *"nothing answers the lights but distance"* — and the clause bolted on counts throats:

> *"No wall answers the sonar in any direction worth mentioning. The dark goes down a long way; five ways open from here."*

Both clauses are generated from the same number. This is not an occasional collision, it is structural.

Compounding it, **`DIR_COUNT[5]` and `[6]` hold 2 strings apiece** while `SPACE_FIRST` got 10 per key — and one of the four is a joke. *"six ways out, which is to say the rock here is more hole than rock"* fired **739 times** (74 per session). Jokes are the one register that cannot survive repetition.

**Fix:** suppress `DIR_COUNT` for `expanse` entirely — a vast room does not have counted throats — or give expanse its own exits vocabulary (*"the water goes on in every direction the sonar tries"*). Take `DIR_COUNT[3]`–`[6]` to 8 strings each and retire the joke.

### W5. The constitution's HEDGE never fires
**LITERATE (major). 1 persona.** Verified. **This is a logic bug the prose exposed, exactly as FATHOM_NEXT's own trap note predicts.**

The comment at line 6920 states the law: *"What is known is stated. What is not known is HEDGED."* Eight hedge lines were written for it. **They are unreachable.**

`move()` calls `revealAt()` on all six neighbours (line 4307) **before** calling `describeSpace('first')` (line 4313), and `spaceAround` tests known-ness with `revealed.has(k)` — the hex key only, ignoring the depth set. So `lateralKnown === lateral` at every arrival and forever after. LITERATE simulated the exact arrival sequence over 2,822 real arrivals: **hedge-eligible cells = 0.** Before the reveal, 6,468 of 7,079 would have qualified.

The trigger is also gated on the wrong predicate: the hedge lines are about what lies *past* the openings (*"what is past them is anyone's guess"*), which is always unknown — but the condition tests whether the openings themselves are charted, which is always known.

So **the boat states an exact exit count with total confidence, every single time, and the game's most distinctive design law is invisible in its own prose.**

**Fix:** gate on the depth-tagged reveal (`revealed.get(k)?.has(snapped)`) or — better, since the sentences are about what is beyond — fire on whether the *neighbours' own neighbours* are charted.

### W6. Two of eight space-classes never generate; 32 written lines are dead
**LITERATE (major). 1 persona.** Verified.

`SPACE_FIRST`/`SPACE_AGAIN` were widened to 10/6 lines for all eight buckets, but the cave generator never produces `deadend` or `pocket`, and produces `nook` 0.1% of the time. Sweep of 7,079 open cells across 4 seeds:

| Class | expanse | junction | shaft | surface | tunnel | nook | deadend | pocket |
|---|---|---|---|---|---|---|---|---|
| Share | **65.7%** | **24.0%** | 6.1% | 2.3% | 1.9% | 0.1% | **0** | **0** |

`deadend` requires `!vert && lateral===1` and `pocket` requires `lateral===0 && !vert`; the generator's vertical connectivity makes both nearly impossible. **32 hand-written strings the player can never see, while expanse and junction carry 90% of arrivals off 20 strings between them.**

**Fix:** retire the two dead buckets and redistribute their 32 lines into expanse/junction, which need them badly — or split `expanse` by lateral count and by upRun/downRun so it stops being one 66% bucket.

### W7. The chorus's lies wear different clothes from the truth
**LITERATE (major). 1 persona.** Verified. The design comment says *"Near a chorus, your instruments are liars"* — in practice the instruments announce which readings are lies.

`tickChorus` emits *"Passive sonar: something moving — <dir>, <n> m."* The real contact emitter (line 6554) draws from a ten-entry species vocabulary — *"something that was pretending, withdrawing"*, *"a school, circling to surround you"*, *"a vast pressure, pacing you in the deep"* — and **never produces the string "something moving."** So the phantom is identifiable by prose alone.

Worse, the phantom drowns out the real thing: of 104 "Passive sonar:" lines across ten sessions, **102 (98%) were the chorus phantom.** The game's best epistemic writing fired twice.

**Fix:** have the chorus borrow the real `what` table — pick a species line at random at a plausible bearing. **The lie has to wear the same clothes as the truth or it is not a lie.**

### W8. The deep and abyss prose never fires
**LITERATE (major), corroborated by the harness. 1 persona + 3 harness runs.** Verified. Not a prose fix — a reachability symptom, listed here so nobody rewrites tables that work.

`DEPTH_MOOD`'s best writing lives in `middle`, `deep` and `abyss` (*"The dark here is not an absence of light. It is a material, and the boat is in it"*). Across 8,477 lines, DEPTH_MOOD fired 1,905 times: **sunlit 1,617, upper 286, middle 2, deep 0, abyss 0.** Median depth of any logged line: 180m. p95: 660m. **Twenty distinct mood sentences never fired once,** and the official harness agrees — 0% of runs reach 2400m.

The Lovecraftian payload of the entire depth ladder exists in the source and not in the game. **Fixed by §6, not by writing.**

### W9. The creed is a 40-word ethnographic brief, delivered on first sight, printed twice at once
**LITERATE (major). 1 persona.** Verified.

`checkEnclave` logs `You come upon ${cu.name}. ${cu.creed}` the instant you arrive — a full anthropological summary (that they eat men with relish, that they are wretched and conniving, what they trade for) **on first glimpse of a glyph in the dark**, in a game whose whole law is that the chart shows only what the boat could know. `renderTrade` then sets `#trade-creed` to the identical string, so the player reads the same paragraph twice within a second. There are three creeds in the entire culture layer, and `state._atEnclave` resets on leaving, so **every re-visit replays the whole thing verbatim.**

**Fix:** log a short first-sight line generated from what the boat can actually see — glyph, depth band, how they hold themselves — keep the creed in the panel only, and let a second visit say something shorter.

### W10. The crew fight in one sentence, or in silence, while the captain has seven
**LITERATE (major). 1 persona.** Verified. This lands on the spine of the biggest feature in the game.

Push A/B's stated spine is that *a crew member is a history, not a number*, and positioning exists so that *"a hand you put between yourself and the thing"* matters. When that hand actually swings, the game says **`${by} gets in a blow, and it tells.`** — one string, forever. When the swing misses it says **nothing at all** (`partyStep` only calls `applyTenantDamage` when `sw > 0`). The captain's own swings draw from `SWING_HIT` (4) and `SWING_POOR` (3). Across 122 melee rounds, that one line was the entire crew-combat vocabulary.

**The most emotionally loaded action in the game's biggest feature is its least-written moment.**

**Fix:** give the crew their own hit/miss tables and let a named hand's condition tilt which table they draw from — a crushed hand should read differently from a whole one. **That is where "a history, not a number" becomes prose.**

### W11. The gill-hood shows no tag for the one thing it does
**LITERATE (major). 1 persona.** Verified. Breaks a stated fairness principle.

FATHOM_NEXT: item properties are *"legible in the Hold panel as colour-coded tags, so nothing is a surprise (fairness)."* **`PROP_TAG` has no entry for `gills`**, and `tags()` filters out any prop not in the map — so the one property that gates an entire content layer (drowned tunnels) is silently dropped. The action column then falls through every branch to the generic label **"worth"**, actively telling the player it is just treasure. Live DOM: `{name: "a gill-hood of Dagon make", tags: "significant", action: "worth"}`. Only the flavour text carries the truth, and flavour is what a player skims.

**Fix:** `gills: { t: 'breathes water', c: '#6fae72' }` in `PROP_TAG`, and a gills branch in the passive label — *"you can swim it."*

### W12. `pick()` has no anti-repeat guard
**LITERATE (minor), TWENTY (minor). 2 personas.** Verified.

`pick()` and `pickLoose()` are bare uniform draws with no memory. Across 8,467 adjacent line-pairs: **94 immediate verbatim repeats (1.1%), 7 of them triples.** The cruellest instance — *"The hull is silent. You could be the only living thing for miles."* three times consecutively. A sentence about being alone, said three times, becomes a joke. Also 288 of 3,653 (7.9%) consecutive room descriptions open with the identical sentence.

TWENTY measured the same wallpaper effect from the other side: across 720 turns, five ambient strings fired 33–34 times each; distinct lines per seed 68–103.

**Fix:** one shared helper that remembers the last index per array and re-rolls once. **Ten lines of code that improve the felt quality of every table in the game.**

### W13. Smaller prose defects

| Problem | Who | Detail & fix |
|---|---|---|
| **LOOK returns the same strings the boat just volunteered** | LITERATE (1) | `lookAround()` calls `describeSpace('again')` — the identical pool already printed unbidden on 40% of re-entries and 55% of depth changes. The free LOOK action, which should reward curiosity, hands back the sentence you just read. Fired 1,315 times across 10 sessions. **Fix:** give LOOK its own third table reporting what the passive text does not — the hull, what the crew are doing, what the water tastes of. |
| **Mood clauses flicker while the boat holds station** | LITERATE (1) | `describeSpace('again')` picks `DEPTH_MOOD` with `pickLoose`, but the mood lines are written as assertions of fact about the light. Within a minute in the same band the boat reports light "still reaches down here", "gives out well short of comfort", "arrives as a rumour", and "the water holds a little daylight". The narrator appears to change their mind. **Fix:** make mood hash-stable per band+hex the way `first` is, or write an 'again' set phrased as re-noticing. |
| **"It has your scent" — the key teaching line uses the wrong sense** | LITERATE (1) | The lurker AI is entirely acoustic: `noiseMade` spikes interest, silence decays it. This one-shot advisory is the most important line an unarmed captain reads, and it primes exactly the wrong model, then says *"kill the sonar"* in the same breath. **Fix:** *"It has your noise."* |
| **British/American spelling collides; the boat renames itself** | LITERATE (1) | The voice is consistently British-nautical except in four visible strings — worst, the **armoury** appears both ways inside one feature (*"the armoury at the dock"* vs `log('The armory: …', 'warn', 'ARMORY')`). Also *"color of old iron"*, *"your only defenses"*. Separately, three strings hardcode **Erebus**, so a captain in a Nyx is told *"The Erebus rides the top of the water"* two lines after the outfitter correctly said *"The Nyx takes the water."* **Fix:** one spelling pass (the internal `armor` GEAR slot key can stay) and `activeSub().name` at lines 6972, 1080, 4924. |
| **One hire offer in three reads "a engineer"** | BUTTONS (1) | `On the dock: ${name}, a ${role}` against `CREW_ROLES = ['diver','sonarman','engineer']`. BUTTONS: *"it was the first sentence that made me stop believing a person wrote this."* **Fix:** `const art = /^[aeiou]/i.test(role) ? 'an' : 'a'`. |
| **The apocalypse is absent from every line the player actually reads** | LITERATE (1) | "The Fall" appears in 5 item flavours and nowhere recurring. The surface — where the median logged depth of 180m means players live — has 23 strings across surface/breach/dock/porthole, and **none register that a civilisation ended.** Half of "post-apocalyptic × Lovecraft" is doing no work above 300m. **Fix:** three or four surface lines that notice what is *missing* — an unlit coast, shipping that never comes, a channel marker nobody maintains. Cheaper and more-read than another abyss table. |
| **The epigraph promises an unreliable chart the game never delivers** | LITERATE (1) | *"The Chart you carry was drawn by drowned men, and they were not careful"* promises an inherited, untrustworthy document. What ships is a blank fog-of-war map you draw yourself that is perfectly truthful. The only lies come from two creatures, reached in 13% and 6% of runs. **Fix (not a bug):** a handful of pre-marked, sometimes-wrong hexes on the starting chart — the `state.leads` gold-mark machinery already renders exactly that. Also: *"The Chart · Prototype"* puts a development word on the one screen that is otherwise pure fiction. |
| **The three peoples read as a 20th-century political triad** | LITERATE (1) | Two of three cultures are named and written as ideological positions (a mutual-aid federation, xenophobic individualists) and the third is a cannibal cult. In a Lovecraftian frame the point of non-human peoples is that human categories do not apply. Also **"libertine" means without moral restraint, not libertarian** — the creed describes individualist patriots, a different word. And the Dagon creed breaks the game's non-judgemental voice: *"wretched and conniving"* is the narrator taking a side. **Fix:** FATHOM_NEXT already marks the Confluence name free to change; "The Libertines" wants to be **the Free Yards** (already its `short`). *"They eat men, and they are glad of it"* is colder and worse than judging them. |

---

# COMBAT & SYSTEMS

### S1. FIRE sits 8px from HOLD, fires on one tap, spends a torpedo and can detonate your cargo
**MOBILE (major). 1 persona.** Verified.

`btn-fire` is bound directly to `fireWeapon` with **no confirmation** — unlike NEW WORLD, which has a sensible 4-second armed two-tap. `fireWeapon` decrements `state.torpedoes`, calls `noiseMade` with the weapon's loudness (the thing the entire sound grammar punishes), and runs `stressHold('the firing shook it', 0.3)`, which rolls every volatile item in the hold for a **22–48 hull detonation**. Torpedoes cost 2 relics for three. HOLD — the safest and most frequently used button in the game — sits 8px to its left.

**Fix:** give FIRE the armed two-tap NEW WORLD already has when a torpedo (not the free harpoon) would be spent, and put 16px or a divider between HOLD and FIRE. Note §2 hides FIRE entirely while unarmed, which covers the early game.

### S2. An unarmed captain cannot fight anything, and the axe is behind the tightest gate in the game
**OPTIMISER (major). 1 persona.** Verified.

Unarmed swing is `rand() < 0.3 ? 1 : 0` — mean 0.30. Rounds to break a tenant:

| Tenant (toughness) | Unarmed | Axe | Speargun | Lance |
|---|---|---|---|---|
| Clutch (14) | 47 | ~10 | — | — |
| Warden (22) | **74** | 15 | 9 | 5 |

At `FOOT_AIR` 2 per round, a warden unarmed is 148 air while it answers every round. So the entire on-foot layer — tenants, boarding, claiming a station (refused while a tenant lives) — is gated on a **2-crate** boarding axe that requires a full crew, a bank under 20, and a lucky draw from the armory (E4). Harness: **0% of runs ever fought a tenant hand-to-hand; 0% ever claimed a station.**

**Fix:** start the captain with a boarding axe — it is salvage-era junk, not a reward — or let the Confluence sell it for aboard crates so it is not hostage to the port offer chain.

### S3. The sonar slider has six positions and two meanings
**OPTIMISER (minor), BUTTONS (major, via O8). 2 personas.** Verified.

`passiveRange()` returns 0 at power 0 and the same value at **every** other setting; everything else reads the boolean `sonarSilent()`. A high slider costs nothing while idle — air and loudness are paid only when you press PING, a separate button. So the optimal stance is: leave it at 5 forever so the biggest ping is one tap away, and drop to 0 only to break a lurker's thread. **Settings 1–4 are strictly dominated,** and "silence is a decision" is really a two-position switch dressed as a dial — occupying 61px of permanent vertical space (M8).

**Fix:** make the standing setting cost something per turn — a trickle of air, or a per-turn interest feed scaled by loudness — so leaving the dial at 5 is a real wager rather than a free option.

### S4. Launch Decoy is unlimited, free, and offered on turn one with nothing hunting you
**TWENTY (minor). 1 persona.** Verified.

`launchDecoy()` checks only `state.air < 6`, then pushes a buoy. There is **no consumable count anywhere** — `state.decoys` is undefined — and nothing gates it on being tracked. Pressed on the dock it burns 6 air and logs *"Move — let it have their attention"* with zero creatures in the world. It reads as broken or pointless, and it costs the widest slot (72px) in the overflowing row.

**Fix:** give it a count, gate its visibility on something actually tracking you.

### S5. Two of sixteen runs reached a state with no legal action
**FORTY (minor), TWENTY (minor). 2 personas — both marked SUSPECTED, and I am keeping that.** **Suspected.**

The harness reports runs terminating because no neighbour hex accepted the current depth and neither one step up nor down was open.

| Sweep | Rate | Depths |
|---|---|---|
| 16 × 500 | 13% (2) | 780m, 480m |
| 24 × 1200 | 13% (3) | 780m, 600m, 780m |
| 40 × 300 | 15% (6) | 600–900m |

**Why suspected, honestly:** the bot's escape logic only probes exactly ±1 depth step, so a cell whose only exit is 120m away reads as a dead end when a human reading the depth strip would simply walk out. A human also has ping, wait and fast dive.

**But the underlying geometry is real and worth a look.** TWENTY's independent probe on seed 24151 found that of 2,957 open cells within r=14, **29 (1.0%) have zero horizontal exit at their own depth** — and watched a boat oscillate 720m↔780m for 18 consecutive turns. Three independent sweeps landing in the same 600–900m band, which is exactly where players spend their time, does not smell like noise.

**Fix:** add an assertion to the battery — from any reachable cell, a route to depth 0 must exist. If it does not, the generator has made a sealed pocket. That test settles it either way.

### S6. Your one ruin can be destroyed forever by a mis-tap on a tile that looks like every other tile
**BUTTONS (blocker). 1 persona.** Verified. Severity is real even at one persona: it permanently deletes the scarcest content in the game.

On foot, the tile you came in by is a 53×53 square distinguished from an ordinary move target **only by stroke opacity** — `rgba(110,207,174,0.75)` versus `rgba(94,184,154,0.5)`, a 0.25 alpha difference on a 0.7–0.9px stroke. BUTTONS entered their only ruin, took two steps, tapped a square, and was ejected: *"You haul yourself back out through the breach, empty-handed. The site is worked out."* `leaveInterior` then ran `setTile(f.q, f.r, 'passage')` — **the hex reverted from a ruin to plain water, verified in-session.** No confirmation. Under ten seconds. Given §6's density numbers, that was very likely the only ruin that run would ever reach.

**Fix:** give the lock a glyph (⌐ or ↑) and a one-tap confirm, or make leaving a labelled button rather than a tile sitting one step from where you spawn.

---

# PACING

### P1. 96% of turns produce no consequence
**TWENTY (blocker), corroborated by MOBILE and FORTY. 3 personas.** Verified. The full causal chain and fixes are in **§6** — recorded here as the pacing-side statement of the same problem.

TWENTY's probe, 12 runs × 400 turns = 3,768 turns of real game calls:

| Turn outcome | Count | Share |
|---|---|---|
| No log output at all | 434 | 11.5% |
| **Only scenery / room prose** | **3,188** | **84.6%** |
| A real consequence | 146 | 3.9% |

Modern roguelikes give a decision every 10–30 seconds. Cargo was gained on 2 turns — **one crate per 1,884 turns.** Items entering the hold: **0**.

*Stated honestly:* TWENTY's bot navigates imperfectly. But the repo's own harness, which steers for prizes with a smarter goal-picker, agrees on the order of magnitude, and so do two independent probes by other personas.

### P2. Every hex of a fifteen-hex journey is a separate tap, and so is every 60m of depth
**TWENTY (major), MOBILE (major). 2 personas.** Verified.

Only the six adjacent hexes get click handlers. **There is no click-to-path, no auto-run, no travel-to-marker** — `grep` for pathTo/travelTo/autopath returns nothing. Combined with prize distances (median ~10 hexes, 3–19 range) a round trip is 40–50 taps for one crate, so **the first boat upgrade is roughly 900 taps of pure navigation.**

The vertical axis is worse. `diveStepFast` is 120m, so the median max depth reached (840m) is 7 taps down and 7 back **before any actual play**, and 2400m is 20 consecutive presses of a 38px button. MOBILE: *"a bus ride is mostly spent operating a lift."*

Every comparable game abstracts this — Dredge's boat, FTL's beacon jumps, Subnautica's swim.

**Fix:** tap a non-adjacent **known** hex to queue a path, interrupted by any contact. TWENTY estimates this alone cuts tap count ~5× without touching the economy. For depth, make the depth strip draggable (M5).

### P3. Ambient prose becomes wallpaper within one session
**TWENTY (minor), LITERATE (via W2/W12). 2 personas.** Verified. Cause and fix are in **W2** and **W12**; the pacing note is that *because* 85% of turns emit only scenery, the same ~18 strings carry the entire experience and the player learns them by heart in about ten minutes. **The fix is not more lines — it is fewer empty turns competing for them.**

---

# POLISH

Everything below is verified, low-severity, and cheap. Several are one-liners already noted inline above; collected here so they are not lost.

| Item | Who | Fix |
|---|---|---|
| `@import` of Google Fonts breaks the "single file, no deps" law and the offline case | MOBILE, FORTY (2) | Inline two subset WOFF2s as base64, or take system stacks. See M10. |
| Duplicate `#inv-panel` / `#inv-head` ids | MOBILE, TWENTY, BUTTONS (3) | Rename the Trade copies. See M10. |
| "a engineer" | BUTTONS (1) | Article test. See W13. |
| armoury/armory, color/colour, defenses/defences in visible strings | LITERATE (1) | One spelling pass. See W13. |
| Three strings hardcode "Erebus" | LITERATE (1) | `activeSub().name` at lines 6972, 1080, 4924. |
| Sound on by default; 34px mute button over the depth strip | MOBILE (1) | Default muted, 44×44, move left. See M10. |
| No `env(safe-area-inset-*)` despite `viewport-fit=cover` | MOBILE (1) | **Suspected** — needs a device. See M10. |
| "The Chart · Prototype" on the title screen | LITERATE (1) | A development word on the one screen that is pure fiction. |
| Trade panel's "They will take" half opens below the fold | TWENTY (1) | Scroll hint or tabs. See M10. |

---

# DISAGREEMENTS & JUDGEMENT CALLS

**These are Sean's to decide, not ours.** Each is a genuine fork where personas wanted opposite things, or where the evidence does not settle the question. We have framed the tradeoff and stopped.

### D1. How much teaching, against the "no scripted tutorial" ruling
**BUTTONS and TWENTY want an explicit objective statement and a help screen. LITERATE wants *less* telling** — W9's complaint is that the creed dumps a 40-word ethnographic brief on first glimpse of a glyph, which is exactly the kind of exposition BUTTONS is asking for more of.

**The honest reading:** the personas are not actually split on the ruling. Nobody asked for a scripted tutorial. What BUTTONS and TWENTY hit is that the *diegetic* teaching is unreliable — coin-flipped (O1), unreachable above 200m (O1), invisible on touch (O4), and evicted by the log (§3). Fixing reliability satisfies both camps and violates no ruling.

**The one genuine call:** does a single line at cast-off naming the trade (*"the yard pays in crates for anything you can winch off the bottom"*) count as a scripted tutorial? It is one sentence, it never goes stale, and it is the only thing standing between BUTTONS and total incomprehension. **Sean's call. Our read: it is diegetic — a dockmaster's parting remark — but it is his ruling to bend.**

### D2. CONTESTED FACT — how deep the prizes actually are
**Three personas measured POI depth reachability and got three answers.** This one is not a taste disagreement; it is a measurement conflict, and it matters because it determines *which* lever in §6 you pull.

| Persona | Method | Result |
|---|---|---|
| **TWENTY** | 14 seeds, r≤20 disc | **76%** of sites workable inside the Erebus's 1500m safe depth — *"Depth is NOT the blocker — I checked and corrected myself on this"*, citing the sealed-run relaxation in `atReachableBottom()` |
| **FORTY** | 12 seeds, r≤16 | **62%** workable at or above safe depth; 24% must be worked past crush depth |
| **BUTTONS** | 24 seeds, r≤14, headless | **14%** (21 of 150) sit at ≤1500m; median resting depth **4,680m** |

They are probably measuring different quantities — a POI's *resting depth* is not the same as the depth at which `atReachableBottom()` will let you work it, and the relaxation TWENTY cites may reconcile the spread entirely. **But until someone re-runs this with one agreed definition, we do not know whether the fix is "more prizes" or "shallower prizes", and those are different edits.**

**Recommendation: re-measure before tuning §6.** All three agree completely on the thing that matters most — **density is far too low and half of all seeds have nothing reachable** — so the density lever is safe to pull now regardless.

### D3. Guaranteed starter prizes vs. "scarcity is the aesthetic"
**Four personas want guaranteed workable wrecks near the dock** (§6). The setting law in FATHOM_NEXT is *"Scarcity is the aesthetic."* LITERATE, who is here for the mood, never asked for more prizes — and a Dredge-style opening bay is a different game's texture.

**The tradeoff:** scarcity works as an aesthetic only if the player survives long enough to feel it as *atmosphere* rather than as *an empty room*. Right now 75% of players never find anything, so they experience absence with no contrast to measure it against.

**Three levers, and they are not equivalent:**
- **More sites near home** — best for onboarding, most corrosive to the aesthetic.
- **Richer sites (3–5 crates each)** — keeps the world sparse and the *finding* rare, but makes each find matter. **Our read: this is the one most compatible with the stated aesthetic.**
- **Cheaper prices** — leaves the world untouched entirely and just moves the ladder down. Cheapest edit; does nothing for the 96%-empty-turns problem.

Probably a little of each, weighted toward yield. **Sean's call on the weighting.**

### D4. The log wants more space; the chart wants the same space
**A direct conflict for vertical pixels.** LITERATE, FORTY, TWENTY and BUTTONS all want the log bigger or scrollable (§3). MOBILE wants the 351px of fixed chrome cut so the chart is not 45% of a budget phone (M8) — and specifically nominates the log as one of the things that should *shrink* below 700px of viewport height.

**The resolution shape that satisfies both:** a **tap-to-expand transcript** backed by the already-existing `logHistory` costs **zero permanent vertical pixels** while making every line recoverable. That is why §3 recommends it over simply raising `max-height`. If Sean prefers a taller default log instead, M8's ping-row collapse has to fund it.

### D5. Hide the FIRE button, or keep it as a signpost
**Four personas want FIRE hidden while unarmed** (§2). But hiding it removes the only hint in the game that armaments exist at all — and BUTTONS's complaint was precisely that FIRE's advice (*"Buy an armament at the dock"*) **cannot be followed**, because the port precedence chain suppresses the armory (E4).

**The tradeoff:** hide the button and you must fix the dock, or the player never learns weapons exist. Keep the button and it scolds forever while pushing SURFACE off the screen.

**Our read: hide it and fix E4 in the same push** — let the dock offer arms *first* when the captain is unarmed and has been struck. But if only one of the two ships, keeping FIRE visible is the safer half.

### D6. The 45-second timer: patch it, or build the shop
**MOBILE wants move-based expiry** (E1). **TWENTY and BUTTONS want the confirmation off the action button entirely** (E2) — a real panel. The repeat-press-SURFACE idiom is a deliberate design choice and a panel is meaningfully more work.

**The tradeoff:** the cheap patch (expire on moves, persist in the save) fixes the pocket-time bug and nothing else. The panel fixes E1, E2, E3 and E4 at once, makes the whole economy legible, and is the single thing that would most change how the port *feels* — but it is a real build.

**Sean's call, and it is largely a scheduling question.** If the economy tuning pass (§6) is coming anyway, doing it against a visible shop is far easier than tuning blind.

### D7. Pinch-zoom: accessibility vs. gesture control
**MOBILE and FORTY both want `maximum-scale=1.0, user-scalable=no` dropped** — it is the only escape hatch for a player who cannot read 8.8px type (M4). The game disables it deliberately to own its own pan/zoom.

**The tradeoff is smaller than it looks:** the pinch-block is *already* enforced by `touch-action: none` and the `gesturestart`/`gesturechange` handlers, so **the meta tag buys nothing except locking out people who need to zoom.** The residual risk is accidental double-tap zoom on Android interfering with fast tapping. **Cheap to test on Sean's device; we would drop it.**

---

# WHAT IS WORKING

**Protect these while fixing everything above.** Several of the fixes in this document touch the same code as the things below; where they conflict, these win.

### 1. The prose. All six personas praised it — including all four who quit.
This is the finding to take most seriously in the whole document, because it is unanimous across personas who agree on nothing else.

> LITERATE: *"Fathom writes better than almost anything in its genre."*
> BUTTONS (reads nothing, quit in sixty seconds): *"the prose is gorgeous… The writing made me want to like it, which made quitting worse."*
> FORTY: *"The prose is genuinely beautiful and the systems underneath are clearly deep; I would never find out."*
> TWENTY: *"The writing is genuinely great and I'd come back the day the first ten minutes has one wreck in it."*

Note what this implies: **the writing is already carrying players past friction that would otherwise have ended the session sooner.** It is the asset, and §3 is the finding that it is being thrown away two lines at a time.

### 2. Turn-based play that genuinely respects interruption
> MOBILE: *"the turn-based clock means I can put the phone down mid-dive without losing a thing, which almost no game gets right."*

This is a real competitive advantage for the target platform and it was achieved by design, not accident. **The 45-second port timer (E1) is the one place the game breaks its own promise here** — which is exactly why it stings.

### 3. Systems depth that reviewers noticed unprompted
> TWENTY: *"Fathom has more systems than most commercial roguelikes."*
> OPTIMISER: *"the systems underneath are genuinely interesting and the item/culture table is the best part of the design… Fix the buyback loop and the fit caps and I'd play this for hours."*

**Nothing on the 0%-reach list in §6 needs building.** That is the good news buried in the worst finding: the content exists and is well made; the funnel above it is closed.

### 4. The item system is healthy — do not rewrite it
Worth stating explicitly so the §6 panic does not spread to code that works. TWENTY probed `rollItem(d)` directly: **9 distinct results at 0m rising to 34 at 3600m over 1000 rolls, correctly depth-gated and find-weighted.** The 34-of-35-items-never-seen number is a *reachability* symptom, not an item-table fault. Same for the `DEPTH_MOOD` tables in W8.

### 5. The chart's own tap targets, and the hex/interior mode switch
The one control surface that clears the touch minimum comfortably: **63×73px hexes at default zoom**, called *"genuinely good"* by the persona hunting for touch failures. The square-grid-inside / hex-outside mode switch also did its job — no persona was confused about which mode they were in.

### 6. The codebase already knows how to be fair — in places
Several patterns the audit found and approved, worth naming because **the fixes above are mostly about applying them consistently rather than inventing anything:**

- A wreck you fail to notice is **not** burned — `poisFound` is not pushed, so you can come back. FORTY: *"mercifully."*
- Drowned water is **warn-then-commit** — the first tap is a warning only. Never a surprise drowning.
- NEW WORLD has an **armed two-tap**. (FIRE and Cast Off do not — S1, M1.)
- `syncFootControls` **hides dead controls** and says why in a comment. (It just stops at three buttons — §2.)
- The boat-loss ruling landed: FORTY, the persona most hostile to unforeseeable loss, wrote *"I accept the ruling that a lost boat is not a lost campaign."*

### 7. The bot harness is a validated instrument
Three personas independently built their own probes and cross-checked against `tests/playtest.js`; **it agreed with all of them on the order of magnitude every time.** The verification doctrine in FATHOM_NEXT is working. The one-line invariant test recommended in §5a (`markup > buys.mult` for every culture) is the natural next entry in it.

---

## Appendix: the fastest route through this list

If the next session is short, this order maximises change per edit. The first four are hours, not days, and between them they address findings from all six personas.

1. **`min-width: 0` + `flex-wrap: wrap` + hide dead controls** — §1, §2. Two personas' blockers, five personas' finding.
2. **Disable ▼/▼▼ at a floor** — §4. Stops two personas' recorded deaths.
3. **Tap-to-expand log from the existing `logHistory`** — §3. The multiplier on the prose and on every teaching fix.
4. **`markup > buys.mult` invariant + fit caps + `Math.min(0.85, …)` on the lead chain** — §5. Three blockers, three small edits; makes the economy tunable at all.
5. **Move the salvage switch above the shelf early-returns; drop the three `rand() < 0.5` instruction gates** — O1.
6. **Then, and only then, tune §6** — after re-measuring D2.
