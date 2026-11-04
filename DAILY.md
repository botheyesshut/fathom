# FATHOM — DAILY

The nightly run leaves its report here, newest first. Answer a question by
writing a line under it that starts `SEAN:` — that line is a decision, and
the next night builds on it. What the run does, and what it may not decide,
is in `.claude/skills/fathom-daily/SKILL.md`; what it may build is **THE
BUILD QUEUE** at the top of `FATHOM_NEXT.md`.

---

## 2026-11-04 — The signal dive team loses its dead weight; its dice are pinned by a test

**Changed**
- Nothing a player will notice, on purpose. The diver's dice (relic, crate, snag, pocket, hazard) are exactly what they were.
- `startExpedition` no longer takes a kind it never used, and the expedition no longer carries a `type` nothing read. The beach arm of the old code was already gone; this took what was left.
- New check `expedition.test`: pins every band of the dive team's dice at both edges. It fails 3 checks against the old build. Build is v27.

**Broke** — nothing. Battery green on arrival and after (expedition.test added); dead functions 0; moved.js 0 moved, 189 held.

**Test these three** — D4 needs no thumb, so the three most useful tries:

| # | what | where | look for |
|---|---|---|---|
| 1 | Work a signal: sail onto a SIGNAL hex and wait | sea | divers surface crates, relics and the odd snag as before; the team comes in when you move off |
| 2 | Rotate the phone with the chart open | sea chart, landscape | the chart and its buttons still sit cleanly (I opened the screenshot; it looked right at rest, but not through a rotation) |
| 3 | Start a dive, look at the first log lines | title, Dive | can you tell what to do in the first minute without the Standing Orders? |

**What the playtest found**
- Browser playtest RAN (box Chromium; `playwright install --with-deps` failed again). Phone, landscape, desktop: nothing past the edge, nothing cut off, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%. Opened and looked at phone 06-more, phone 04-chart, landscape 04-chart: clean at rest.
- Under 44 px, unchanged and deliberate: chart undo/clear/go and Options toggles (40 px). Bestiary step skipped: its button is hidden until met.
- Bots, 40 x 300: 8 of 40 captains died (6 air, 2 hull); survival 70–90% by style; median 3 crates banked (max 9); 6 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades at 0% (A3, yours). No invariant violated in 9,957 turns. Last night's run had 0 deaths; a different run of the same bots, so I would not read a trend into it.
- First-hour bot: ran, output not mined beyond the headline.
- Nothing new that is Verified and structural.

**Questions for Sean**
- (Carried) What a captain has learned about each creature survives a new ocean, as the bestiary does. Should a new ocean forget it?
- (Carried) A hostile boat you signal answers in one log line. Should it become a COMING ABOUT card?

**Tomorrow** — nothing DECIDED is left in the queue but D2 slice 2 (her own paint; a coming-about card), which waits on your answer above. If none comes, the night spends itself on verification depth.

---

## 2026-11-03 — A new world now starts with full water tanks, and restart() has a test

**Changed**
- A captain who died of thirst and began a new ocean started on an empty tank with the still left running. Now every new boat has full tanks, and the still and the rain are off. Build is v26.
- New check `restart.test`: it dirties every one of the 65 state fields, restarts, and fails on any that comes back changed. It fails against the old Standing Orders leak, so it can catch one.
- The locked-door test now saves and loads through the game's real save code instead of copying a list by hand.

**Broke** — nothing. Battery green on arrival and after (restart.test added); dead functions 0; moved.js 0 moved, 189 held; no invariant violated in 9,954 bot turns.

**Test these three** — thumb work:

| # | what | where | look for |
|---|---|---|---|
| 1 | Run low on water, die or Abandon, start a new world | Options, then Dive | does the water gauge read full, and is the Still button off? |
| 2 | Start a new world after finishing the Standing Orders | title, Dive | do the Standing Orders come back? |
| 3 | Open a locked hatch on a wreck, leave, reload the page, return | wreck deck | does the door stay open? |

**What the playtest found**
- Browser playtest RAN (box Chromium; `playwright install --with-deps` failed). Phone, landscape, desktop: nothing past the edge, nothing cut off, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%. I did not open the screenshots tonight, so no visual verdict.
- Under 44 px: chart buttons and Options toggles, unchanged and deliberate. Bestiary step skipped: its button is hidden until met.
- Bots, 40 x 300: 0 deaths; 5 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached (A3, yours).
- First hour: the first collision's 8 hull is still not explained (still true). Depth, crush, port, chart and jettison tips fire in 0 of 40 first hours.
- **restart() left water, still and inRain alone** — BUG — Verified. Evidence: tests/restart.test.js failed on them. Fixed tonight.

**Questions for Sean**
- What a captain has learned about each creature (it never makes the same mistake twice) survives a new ocean, as the bestiary does. Should a new ocean forget it?
- (Carried) A hostile boat you signal answers in one log line. Should it become a COMING ABOUT card?

**Tomorrow** — D4 (delete the dead arms of `startExpedition`); D2 slice 2 waits on your answer.

---

## 2026-11-02 — The Signal button for a boat under water now opens a card

**Changed**
- Under water, with another boat alongside, SIGNAL now puts up a card: her picture, "Contact alongside, sir. A boat, running dark.", and two choices.
- **Signal her** does what the button always did (the lamp, her name, her people, her news); the words land on a second card. **Leave her be** does nothing.
- The card does not say whose she is. You find that out by signalling.
- First slice of D2. Her own paint, and a coming-about card for a hostile boat, are still to do. Build is v25.

**Broke** — nothing. Battery green on arrival and after; dead functions 0; moved.js 0 moved, 189 held; no invariant violated in 9,966 bot turns.

**Test these three** — the card wants a thumb:

| # | what | where | look for |
|---|---|---|---|
| 1 | Dive and close on another boat until SIGNAL shows | main screen, under water | does her card come up with the picture, and read right in the Mate's voice? |
| 2 | Press Signal her | the card | does the second card show the lamp lines, and does Carry on return you to the sea? |
| 3 | Press SIGNAL again at the same boat | main screen | does it offer only Leave her be? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed, the box's own Chromium was used). Phone, landscape, desktop: nothing past the edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%.
- Screenshots opened: phone ping, hold, descend, landscape chart. They read cleanly; no visual fault seen. Landscape's main-screen map is 63%, the HUD sits top-left over it.
- Under 44 px: chart buttons and Options toggles, unchanged and deliberate. Bestiary "step could not be taken" is the same hidden-until-met button.
- Bots, 40 x 300: 0 deaths; 5 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. Income question (A3), yours.
- First hour: first collision's 8 hull is still not explained (still true, asked before). Depth, crush, port, chart and jettison tips fire in 0 of 40 first hours.

**Questions for Sean**
- A hostile boat you signal now answers "with her bow" in one log line. Should that become a COMING ABOUT card with the same Stand and fight / Break away as a surface hull? (Needs a call on whether a boat under water can be broken away from.)
- Should the Ear speak before she is alongside, at the moment she is first heard?

**Tomorrow** — D2 slice 2 if you answer; otherwise D3, the test of what `restart()` clears.

---

## 2026-11-01 — B5 re-checked: all five phone items were already fixed

**Changed**
- Nothing a player will notice. No game code touched; build stays v24.
- B5 closed in the queue: Options toggle, ▼/▼▼ gap, disabled-button look, rotating with the chart open, duplicate ids. All five already fixed; the gap measured at 9.6 px.
- D1 is finished. D2 (cards for the boats under water) is next.

**Broke** — nothing. Battery green on arrival; dead functions 0; no invariant violated in 9,965 bot turns.

**Test these three** — no change to test; the most useful by hand instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | Turn the phone sideways with the sea chart open | chart | does it redraw to the new shape at once? |
| 2 | Toggle Sound and Tips in Options with the list scrolled down | Options | does the list stay where it was? |
| 3 | Reach the seabed and look at the dive arrows | main screen | does a greyed arrow still read as there, not gone? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed, the box's own Chromium was used). Phone, landscape, desktop: nothing past the edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%.
- Screenshots NOT opened tonight, so no visual claim is made.
- Under 44 px: chart buttons (36-40) and Options toggles (40), unchanged. Bestiary "step could not be taken" is the same hidden-until-met button.
- Bots, 40 x 300: median 3 crates banked in every playstyle; 5 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. Income question (A3), yours.
- First hour: 0 deaths in 40; first collision's 8 hull is still not explained (still true, asked before).

**Questions for Sean**
- None new. (Still open: A13, A14, A15, A12, A10, A11, A9, A1, A7, A3.)

**Tomorrow** — D2, the cards for the boats under water.

---

## 2026-10-31 — Re-read M1–M10 of the old phone list: five fixed or mostly, five still hold

**Changed**
- Nothing a player will notice. No game code touched; build stays v24.
- D1 slice 4: the phone items M1–M10 of `PLAYTEST_FINDINGS.md` checked against today's source. "Cast Off" is renamed, the back gesture closes panels, fonts are local, ids are fixed. Written up under D1 in the queue.
- Three still-true items are now asks (A13–A15).

**Broke** — nothing. Battery green on arrival; dead functions 0; no invariant violated in 9,966 bot turns.

**Test these three** — no change to test; the most useful by hand instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | Walk a deck outdoors in daylight | on foot, any wreck | can you see the walls (A13)? |
| 2 | Open Hold, press Use on a full hull, then press the Android back button | main screen | does the refusal show? does back close the panel and stay in the game? |
| 3 | First launch on the hosted page | title, Dive | does sound start unasked (A15)? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed, so the box's own Chromium was used). Phone, landscape, desktop: nothing past the edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%.
- Screenshots opened: phone 06-more and 04-chart. Both read cleanly. Not opened: 03-ping, 17-descend, landscape 04-chart.
- Under 44 px: chart buttons (36-40) and Options toggles (40), unchanged. The bestiary "step could not be taken" is the same hidden-until-met button.
- Bots, 40 x 300: median 3 crates banked (max 9); 6 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. Income question (A3), yours.
- First hour: 0 deaths in 40; the first collision's 8 hull is still not explained (still true, asked before).

**Questions for Sean**
- A13 — Lift the deck's wall colours and bring back the depth-strip numbers, or keep it dark on purpose?
- A14 — An edge arrow for known prizes and leads, so you need not pinch out?
- A15 — Start the hosted game muted, with a "tap for sound" hint?
- (Still open: A12, A10, A11, A9, A1, A7, A3.)

**Tomorrow** — B5 (re-verify the five phone items), then D2.

---

## 2026-10-30 — Re-read E1–E11 of the old problem list: nine are fixed, one is half, one is yours

**Changed**
- Nothing a player will notice. No game code touched; build stays v24.
- D1 slice 3: the economy items E1–E11 of `PLAYTEST_FINDINGS.md` checked against today's source. The port panel, leads, enclave, engineer, HUD money, keys, jar and hire are all fixed. Written up under D1 in the queue.

**Broke** — nothing. Battery green on arrival; dead functions 0; no invariant violated in 9,960 bot turns.

**Test these three** — no change to test; the most useful by hand instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | Dock with a hurt hull and exactly the price of the next boat | any port | does the panel show both, and take nothing until you tap? |
| 2 | Bring a relic home, then try to spend it | port | is there anything to do with it but torpedoes (A12)? |
| 3 | Sign a hand on, let them die, sell the body, dock | port, trade | does the crew coming back whole feel right (A12)? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed, the sandbox blocks it). Phone, landscape, desktop: nothing past the edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%.
- Screenshots opened: phone 06-more and 04-chart. Both read cleanly. Not opened tonight: 03-ping, 17-descend, landscape 04-chart.
- The bestiary "step could not be taken" is the same hidden-until-met button as before, not a bug.
- Under 44 px: chart buttons and Options toggles, deliberate, unchanged.
- Bots, 40 x 300: median 3 crates banked (max 9); 4 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. That is the income question (A3), yours.
- First hour: 0 deaths in 40; the first collision's 8 hull is still not explained to the player (still true, asked before).
- The repo was checked out detached at 80ac427; I switched to main (same commit) before working.

**Questions for Sean**
- A12 — A relic carried home has no price, and a night ashore resets every crew nerve to 100. Give relics a floor price in crates? Leave some shake on the crew?
- (Still open: A10, A11, A9, A1, A7, A3.)

**Tomorrow** — D1 slice 4: M1–M10 of `PLAYTEST_FINDINGS.md`; then B5.

---

## 2026-10-29 — Re-read O1–O8 of the old problem list: seven are fixed, one is yours

**Changed**
- Nothing a player will notice. No game code touched; build stays v24.
- D1 slice 2: onboarding items O1–O8 of `PLAYTEST_FINDINGS.md` checked against today's source. O1, O2, O4, O5, O7, O8 are fixed. O3 is half fixed. O6 still holds. Written up under D1 in the queue.

**Broke** — nothing. Battery green on arrival; dead functions 0; no invariant violated in 10,012 bot turns.

**Test these three** — no change to test; the most useful by hand instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | Close the game with a campaign going, reopen, tap Dive | title | does one line about the depth tell you enough to carry on (A11)? |
| 2 | Hold a finger on any button for half a second | main screen | does the explanation appear and the button not fire? |
| 3 | Take the boat below 1500 m | deep water | does the groan tell you how bad it is (A10)? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed again, the sandbox blocks it). Phone, landscape, desktop: nothing off the right edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%.
- Screenshots opened: phone 02-look, 04-chart, 06-more, 17-descend-2, and landscape 04-chart. All read cleanly; nothing clipped, nothing overlapping.
- The bestiary "step could not be taken" is the same hidden-until-met button as last night, not a bug. Still not touched.
- Under 44 px: chart buttons and Options toggles, deliberate, unchanged.
- Bots, 40 x 300: median 3 crates banked (max 9); 5 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. That is the income question (A3), yours.
- First hour: 0 deaths in 40; the first collision's 8 hull is still not explained to the player (still true, asked last night).

**Questions for Sean**
- A10 — Past her rated depth the log says "the hull groans" whether it costs 2 hull or 26, and says nothing for the first 50 m. Scale the words in bands, or keep it vague?
- A11 — On loading a save the game writes one line (the depth). Add who is aboard and what is still marked, and call the title button Continue?
- (Still open: A9, the rock-hit line, A1, A7, A3.)

**Tomorrow** — D1 slice 3: E1–E11 of `PLAYTEST_FINDINGS.md`; then B5.

---

## 2026-10-28 — Re-read the top six of the old problem list: five are fixed, one is yours

**Changed**
- Nothing a player will notice. No game code touched; build stays v24.
- D1 first slice: the six biggest items in `PLAYTEST_FINDINGS.md` checked against today's source. #1 to #5 are fixed (control row, dead buttons, the log, the rock-tap, the money faucets). Written up under D1 in the queue.

**Broke** — nothing. Battery green on arrival; dead functions 0; no invariant violated in 9,966 bot turns.

**Test these three** — no change to test; the most useful by hand instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | Tap the log | main screen, any time | does the transcript open and scroll well with a thumb? |
| 2 | Tap DESCEND on the sea floor, twice | first dive | one line, no hull lost, the arrow dimmed |
| 3 | A mission in an underwater city | city → arrangements | is the ask sensible, the pay worth the trip (A9)? |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed again, the sandbox blocks it). Phone, landscape, desktop: nothing off the right edge, nothing cut off, page never wider, no clipped text, 0 console errors, 0 failed requests. Maps 40% / 63% / 52%. Screenshots not opened tonight.
- **The bestiary "step could not be taken" is not a bug.** The button is hidden until the boat has met something (`style="display:none"`, shown on the first sighting). The harness presses it on a fresh game. Verified by source. Suggest browse.js stops counting it; not touched, it is a test change not in the queue.
- Under 44 px: the chart buttons and Options toggles, 36-40 px, deliberate and unchanged. Phone: Abandon sits below the fold but its list scrolls.
- Bots, 40 captains x 300 turns: median 3 crates banked (max 9); 4 of 36 items ever held; torpedoes, deep, abyss, stations, selling to a people, upgrades never reached. That is the income question (A3), yours.
- First hour: 0 deaths in 40; the first collision's hull cost is still not explained to the player (still true, open from before).

**Questions for Sean**
- A9 — A mission pays its crates on top of the sale of the goods (about +8 a unit at Confluence). Keep as a bonus, or should the mission replace the sale?
- The first hit on rock costs 8 hull and the log never says why. One plain line the first time, yes or no?
- (Still open: A1, A7, A3.)

**Tomorrow** — D1 slice 2: O1–O8 of `PLAYTEST_FINDINGS.md`; then B5.

---

## 2026-10-27 (night) — A city's mission can no longer name a thing it would refuse

**Changed**
- Nothing a player would notice yet: a city's mission is now only ever for goods the city will actually pay for (B4). It was a latent hole; no live offer was affected. Build v24.

**Broke** — nothing. Battery green on arrival and after; dead functions 0. The new check fails on the old code (61 of 300 offers named a refused item) and passes on the new.

**Test these three** — the change needs no human test; the three most useful instead:

| # | what | where | look for |
|---|---|---|---|
| 1 | The three from two entries ago | passage, a sail's card, a fight | still untried by hand |
| 2 | Take a mission in an underwater city | city → arrangements | does the ask make sense, and is the pay worth the trip? (see A9) |
| 3 | Sideways play, a few turns | title → DIVE → MORE | the landscape build, still on your thumb |

**What the playtest found**
- Browser playtest RAN (Chromium from /opt/pw-browsers; `playwright install --with-deps` failed, as the sandbox blocks it). Phone, landscape, desktop: nothing off the right edge, nothing cut off, 0 console errors, 0 failed requests, no clipped text. Maps 40% / 63% / 52%.
- Steps not taken at all three widths: bestiary and bestiary-close ("#btn-bestiary is not on screen") — Suspected: either the button is hidden until something is found, or a control moved. Evidence: `tests/out/browse.md`. Not opened by eye tonight.
- Under 44 px: chart buttons and Options toggles (40 px; 36 px in landscape) — unchanged and deliberate.
- Bots, 40 captains x 300 turns: no invariant violated in 9,653 turns. Never reached: torpedoes, deep and abyss, stations, selling to a people, upgrades — the income question (A3), yours. 4 of 36 items ever held.
- Screenshots were not opened tonight; the above is measurement only.

**Questions for Sean**
- A9 — A mission pays its crates on top of the ordinary sale of the goods (about +8 a unit at Confluence). Intended bonus, or should the mission pay replace the sale?
- Is the bestiary button meant to be hidden at the start?
- (Still open from before: A1, A7, the first-collision line.)

**Tomorrow** — D1: re-audit `PLAYTEST_FINDINGS.md`; then B5.

---

## 2026-10-27 — The phone on its side now has a map

**Changed**
- Turn the phone sideways: the main screen is two columns — readings and the map on the left, the log over the buttons on the right. It had no map at all before.
- MORE no longer pushes Muster and Options off the bottom; the button column scrolls.
- The title's DIVE button is on screen in landscape (it was 11 px under the edge).
- Portrait is unchanged. Build v23.

**Broke** — nothing. Battery 21 of 21; dead functions 0; the playtest instrument now measures the map and cut-off buttons, and flagged the old build (map 8% of the height, three buttons cut off) before passing the new one (map 63%, none cut off).

**Test these three**

| # | what | where | look for |
|---|---|---|---|
| 1 | Play a few turns sideways | title → DIVE → LOOK, PING, a dive arrow, MORE | is the map big enough to steer by, and are the buttons where a right thumb falls? |
| 2 | Read a long log line sideways | trigger any room description | does the log box (top right) show enough, and does dragging its top edge still work? |
| 3 | The three from the last entry | passage, a sail's card, a fight | still untried: nobody with hands has played them |

**What the playtest found**
- **B1, B2, B3 (landscape) are fixed and landed** — MOBILE — Verified. Evidence: `tests/out/landscape/02-look.png`, `06-more.png`, `00-title.png`; browse.md reports none cut off, map 236 of 375 px.
- Portrait phone and desktop: nothing off-screen, nothing clipped, 0 console errors, 0 failed requests. Options' Abandon is below the fold; the panel scrolls to it.
- Landscape sea chart: fine (`04-chart.png`).
- Bots, 40 captains × 300 turns: no invariant violated in 9,966 turns; the same unreached list as before (torpedoes, Dagon, stations, selling). That is the income question, A3, yours.
- First hour, 40 captains: no deaths; the first ping names its reach and the dial. The first collision's hull cost is still not explained to the player afterwards (NOW NO in firsthour.js) — Suspected: a missing line, a voice call, so a question not a fix.
- Cloud note: GitHub access worked tonight; the push result is below.

**Questions for Sean**
- A1 — Depth charges: should a destroyer follow you down?
- A7 — Her ports: one line on HER COLOURS, *"out of Harrow, bound for the Shallows"* — yes or no?
- The first collision costs 8 hull and the log never says why — a line from the Mate, yes or no?

**Tomorrow** — D1: re-audit `PLAYTEST_FINDINGS.md` against this build; then B4 (missions pay for goods the pricing rules refuse).

---

## 2026-10-26 — The night shift is set up; the game itself is untouched

**ONE THING ONLY YOU CAN DO, and the night does nothing until it is done.**
The first cloud run (01:04–01:41 UTC, 37 minutes) built the landscape fix
(B1–B3: two columns on a phone turned sideways, HUD and map left, log over
the controls right; gate green; nothing else moved) and then could not push:
GitHub answered 403 on `main`, on a branch, and on the GitHub tools — *"Claude
doesn't have GitHub access to botheyesshut/fathom."* The work is lost with
that sandbox; the queue still lists B1–B3 and the next run rebuilds them.
**Install the Claude GitHub App on the repo: https://github.com/apps/claude/installations/select_target
(or reconnect GitHub at https://claude.ai/customize/connectors).** One click.
After that, every night's push lands.

Two things the run taught, both fixed tonight: the sandbox cannot download a
browser, so `browse.js` now uses the Chromium the box already has; and the
box is slower than your PC, so the battery's 60 ms chunk-time check went red
on unchanged code — it now measures against the HEAD build on the same
machine when the budget is missed, and still fails a build that is really
slower.

**Changed**
- The game is unchanged: build `9043060`, v22, the one that is live.
- A browser playtest now exists: the real page, headless, at phone, landscape and desktop width, a screenshot and a layout audit after every tap (`node tests/browse.js`).
- Two skills tell the night what to do: `fathom-playtest` (the eyes) and `fathom-daily` (the day).
- The top of `FATHOM_NEXT.md` is now THE BUILD QUEUE — BUG / DECIDED / ASK. The night builds BUG and DECIDED only. ASK is yours.
- A cloud routine runs the day at 2:30 am Pacific (1:30 once the clocks go back), so this file has a new entry by six.

**Broke** — nothing. Battery 21 of 21 suites; dead functions 0; bot invariants 0 violated over 9,961 turns.

**Test these three** — the things that need your hands

| # | what | where | look for |
|---|---|---|---|
| 1 | Lay a passage and sail it | on the surface: CHART → tap three or four hexes → GET UNDER WAY | the boat runs the red line; turn the phone sideways while it does |
| 2 | Meet a sail and read her colours | near a harbour, on the surface, until a SAIL HO card comes → Approach the vessel | the chase on the chart, then HER COLOURS: whose she is, her guns, the Mate's arithmetic |
| 3 | Fight one | on HER COLOURS → Attack her → Fire a torpedo | one round per tap; Dive out from under her costs a salvo. Does it read, and does it feel like anything? |

These three shipped on 2026-10-02 and nobody with hands has tried them. You said you had no experience of naval combat here; this is where it lives.

**What the playtest found**
- **The MORE drawer runs off the bottom of a landscape phone, and nothing scrolls** — MOBILE — Verified. `tests/out/landscape/06-more.png`. Queue B1.
- **In landscape the main screen has no map at all** — MOBILE — Verified. `tests/out/landscape/02-look.png`. The sea chart in landscape is fine. Queue B2.
- **The title's DIVE button is cut off in landscape** — MOBILE — Verified, 11 px. Queue B3.
- **PLAYTEST_FINDINGS #1, the control row off the right edge, is fixed** — Verified: no control past the edge at 375 px in 23 screenshots.
- Portrait phone: nothing off-screen, nothing clipped, 0 console errors, 0 failed requests. Options' Abandon is below the fold, and the panel scrolls to it.
- Bots, 40 captains × 300 turns: 80 % survive; air kills 15 %, the hull 5 %; median 3 crates banked, best 9. Nobody fired a torpedo, met Dagon, claimed a station or sold a thing in 300 turns — the same list as before. That is the income question, queue A3, and it is yours.
- First hour, 40 captains: no deaths; the first ping names its reach and the dial every time; no tip arrives before its event.
- `tests/firsthour.js` still looked for a tip named `pages`, which left with the Account. Removed.

**Questions for Sean** — all in the queue as ASK; the night will not touch them
- A1 — Depth charges: should a destroyer follow you down?
- A7 — Her ports: one line on HER COLOURS, *"out of Harrow, bound for the Shallows"* — yes or no?
- The night shift runs on Sonnet 5.5. Say the word for Opus 5.5 or Fable.

**Tomorrow** — D1: re-audit `PLAYTEST_FINDINGS.md` against this build; fix what still holds and is a bug; the rest become ASK.
