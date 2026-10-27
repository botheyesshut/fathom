---
name: fathom-playtest
description: Playtest Fathom without Sean — run the battery, the bots and the real page in a headless browser at phone, landscape and desktop widths, read what they measured, and write findings with confidence marks. Finds; never fixes.
---

# fathom-playtest

Fathom is one file, `fathom-chart.html`, played on an Android phone in Chrome.
Sean's own playtesting is the project's bottleneck. This skill does the part a
machine can do, and says plainly which part it cannot.

**It finds. It does not fix.** Fixing is `fathom-daily`'s job.

## 1. The gate

```bash
node tests/run-all.js
```

Record the last line. Only `ALL SUITES PASSED` counts. A red suite is the first
finding of the day and outranks everything below.

## 2. The screen (the part no other instrument can see)

```bash
npm install --no-audit --no-fund        # once per checkout; Playwright only
npx playwright install chromium         # once per machine; on a bare Linux box
                                        # that complains of missing libraries:
                                        # npx playwright install --with-deps chromium
node tests/browse.js --devices phone,landscape,desktop
```

`browse.js` opens the real page in headless Chromium, taps Dive, answers the
Standing Orders like a player, presses LOOK, PING, CHART, every panel under
MORE, and dives twice. After every step it screenshots, measures the layout,
and reads the log. Same seed every run (`--seed 20261026`), so screenshots are
comparable day to day.

| exit | meaning | what you write |
|---|---|---|
| 0 | ran | read the report |
| 2 | the game did not boot | the top finding, Verified |
| 3 | SKIPPED — no Playwright or no Chromium | "browser playtest skipped" in the report. A skip is never a pass |

Read `tests/out/browse.md` first. It lists, per width: controls past the right
edge, controls below the viewport (and whether something scrolls to reach
them), page overflow, clipped text, controls under 44 px, console errors,
failed requests, steps that could not be taken, the Standing Orders shown.

Then **open the screenshots** — the measurement cannot see an ugly screen:

- every screenshot `browse.md` names in a finding
- at phone width always: `03-look`, `05-chart`, `07-more`, `17-descend`
- at landscape always: `05-chart`

`tests/out/browse.json` has everything else: each step's new log lines, the
text of every Standing Order, the HUD readings.

## 3. The bots

```bash
node tests/playtest.js 40 300      # ~2 min: deaths, content never reached, softlocks, crates banked
node tests/firsthour.js             # ~1 min: the first 25 turns, 40 captains
node tests/reachable.js             # DEAD must be empty; ONLY-IN-TESTS is for the eye
```

Read for: what kills captains and when; anything at 0 % reached; softlocks;
crates banked per run (the income question — report, do not retune). The bots
reach a deck in ~3 % of runs, so the on-foot layer is invisible to them;
`node tests/delve.js` walks it directly if the day's work went ashore.

## 4. The persona pass — a rubric, not a séance

Six personas from `PLAYTEST_FINDINGS.md`. Ask each one question **against the
evidence above**, not against imagination:

| persona | the one question | evidence |
|---|---|---|
| MOBILE | anything off-screen, clipped, or under 44 px at 375 or 812×375? | browse.md, the phone screenshots |
| FORTY | can the first forty turns be followed from the log alone? | the `log` lines in browse.json; the Standing Orders text |
| TWENTY | does the first session put a goal in front of the player? | `07-more`, the harbour board in firsthour.js output |
| LITERATE | does any line break `VOICE.md`? | twenty log lines sampled from browse.json |
| OPTIMISER | does anything pay more than it costs? | playtest.js economy lines; `greed.test` guards the known ones |
| BUTTONS | did any press do nothing visible? | steps in browse.json with `skipped` set or an empty `log` |

## 5. Write the findings

Each finding is three lines, in this shape:

```
**<what, in one sentence>** — <PERSONA tag(s)> — Verified | Suspected
Evidence: <screenshot path, harness line, or source line>
Fix, if obvious: <one line>   Impact: blocker | hurts | cosmetic
```

- **Verified** means measured: a screenshot you opened, a line a harness
  printed, a source line you read. **Suspected** means reasoned and not
  measured. Never write Verified without the evidence line.
- Check `PLAYTEST_FINDINGS.md` before calling anything new. Its top entries
  are from 2026-07-25 and most are fixed; if one still holds, say "still true"
  with today's evidence, and if it is fixed, say so once and move on.
- Findings go in the day's `DAILY.md` entry under **What the playtest found**.
  A Verified structural bug also goes into the BUILD QUEUE in `FATHOM_NEXT.md`
  under BUGS, so tomorrow builds on it.

## Rules

- Never claim what was not measured. "Looks fine" without an opened
  screenshot is not a finding and not a pass.
- A skipped instrument is reported as skipped, in those words.
- Short. One idea per line. Tables where there are three or more of a thing.
- Do not change the game in this skill.

## Time

About ten minutes of wall clock, most of it the bots. Do not run
`node tests/moved.js --full` here (25 minutes); the daily skill runs the short
form when it has changed code.
