# FATHOM — DAILY

The nightly run leaves its report here, newest first. Answer a question by
writing a line under it that starts `SEAN:` — that line is a decision, and
the next night builds on it. What the run does, and what it may not decide,
is in `.claude/skills/fathom-daily/SKILL.md`; what it may build is **THE
BUILD QUEUE** at the top of `FATHOM_NEXT.md`.

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
