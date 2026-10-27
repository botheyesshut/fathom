---
name: fathom-daily
description: One day's work on Fathom without Sean — pull, gate, playtest, build the next DECIDED item or fix a Verified bug, verify the Fathom way, commit to main, and leave the morning report at the top of DAILY.md.
---

# fathom-daily

You are working on **Fathom**, Sean's single-file game (`fathom-chart.html`,
~24,000 lines, no build step), overnight, with nobody to ask. Sean set this up
on 2026-10-26 so that *"more progress can be made without my having to stop in
and direct little things."* His guardrail, in his words: **"Flag it for me,
build only what's decided."** His report time: 6 am Pacific.

Everything below is the day. Budget: **three hours of your time**, hard stop.

## 0. Orientation (ten minutes, no more)

Read, in this order:

1. `FATHOM_NEXT.md` — only its first section, **THE BUILD QUEUE**. It is the
   list of what is decided, what is a bug, and what is a question. Then its
   section **HOW TO CHECK YOUR WORK HERE** (search for the heading).
2. `DAILY.md` — the top entry. Sean answers questions by writing a line that
   starts `SEAN:` under them, in `DAILY.md` or in the queue. A `SEAN:` line is a
   decision: move the item to DECIDED with his words quoted, and it is yours to
   build.
3. `VOICE.md` — if the day's item puts words in the game.

The standing rules of this project, which no entry repeals:

| rule | in Sean's words, or the reason |
|---|---|
| A knack opens an option. It never multiplies a number. | *"A KNACK OPENS AN OPTION. IT NEVER MULTIPLIES A NUMBER."* Skills are for crew only |
| A deck is a BOAT | ships and subs only; caves, ruins and stations have their own nouns |
| No dolphins or turtles as quarry. A minimum of clutter. | his words |
| *"'Enough progress' in a 40 minute session should not be virtually guaranteed"* | the income question is his to answer, not yours to tune |
| **The Account** (the Dark Way Down pages) is out, at his word, 2026-08-03 | never propose it again. The music stays |
| Two images in the archive are not his: `cthulhu-mythos-04.jpg`, `hplart.jpg` | never commit them |
| Any change to the world's SHAPE is gated on `worldGen` (`WORLD_GEN`) | or a saved campaign is redrawn under the boat |
| The game speaks in its own voice | `VOICE.md` |

## 1. Pull and gate

```bash
git pull --ff-only
node tests/run-all.js
```

Red on arrival means the day's item is *that*, and nothing else gets built.
Never delete a suite, never loosen a check to pass it. If a check is wrong,
say why in the commit.

## 2. Playtest

Read `.claude/skills/fathom-playtest/SKILL.md` and do what it says. Its
findings go into today's report; a Verified structural bug goes into the
queue under BUGS.

## 3. Pick one thing

In this order, the first that applies:

1. the battery is red → fix it
2. a **Verified** bug — from today's playtest or the queue's BUGS list
3. the next item in the queue marked **DECIDED**

Never an item marked **ASK**. Never something not in the queue, however
obvious it looks — put it in the report as a question instead.

Size it to land today. If the item is bigger than the budget, build the first
slice that is complete on its own (ships, passes, is in the ledger) and leave
the rest in the queue with a line saying what is left.

If the queue has nothing buildable, say so in the report and spend the time on
verification depth: a persona pass on a later stage of the game, an
instrument for something no instrument reaches. Do not invent features.

## 4. Build it the Fathom way

- **Find the code with grep**, never with a remembered line number. The file
  is long and every number in every doc is stale.
- **Every new function has a caller.** `node tests/reachable.js` — nothing of
  yours under DEAD. This is the project's most repeated bug.
- **A check must be able to fail.** Add or extend a suite in `tests/`, run it
  against the broken state once, see it fail, then fix. A probe that only
  measures what you added is not a check.
- **The gate:** `node tests/run-all.js` → `ALL SUITES PASSED`.
- **What else moved:** `node tests/moved.js` (~2 min). Read it. Every number
  that moved is explained in the ledger entry or the change is wrong.
- **In-game text** follows `VOICE.md`. The Mate, the Ear, the Wrench speak in a
  named person's voice and never add a line to a situation that had one.
- **Shipped means visible:** `sw.js` → bump `VERSION` (`fathom-vNN`, with the
  one-line comment saying what the build is) whenever `fathom-chart.html`
  changed, or phones keep the old build.
- **The ledger:** under the queue item in `FATHOM_NEXT.md`, write what was
  built, what was measured, which calls were yours, and **the single knob that
  undoes each one**. Record Sean's words as his, yours as yours.

## 5. Commit and push

```bash
git add <each file by name>        # never -A
git commit -m "<title in the project's voice>

<what and why, a few lines>

Co-Authored-By: <the model that did the work, e.g. Claude Sonnet 5.5> <noreply@anthropic.com>"
git push origin main
```

The trailer names the model that actually worked — the one you are — so the
history says who built what.

Sean: no separate branch — *"We can undo anything we do."* `main` may have
moved while you worked, so `git pull --rebase origin main` before the push,
re-run the gate if anything came in, and push again. Only if the push is
still refused, push the same commit to a branch `daily/YYYY-MM-DD`, open a
pull request with `gh pr create` (body ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)`),
and say so in the report. Work that does not pass the gate by the deadline is
not committed; the report says what was attempted and why it did not land.

## 6. The morning report

A dated entry at the **top** of `DAILY.md`, pushed with the work. Sean reads
it on his phone before coffee. Short. One idea per line. Tables for three or
more of a thing. No code in it.

```
## 2026-MM-DD — <one line, what the night did>

**Changed**
- (three to five lines; what a player would notice)

**Broke** — nothing / what, and whether it is fixed

**Test these three** — the things that need human hands

| # | what | where | look for |
|---|---|---|---|
| 1 | … | … | … |

**What the playtest found** — (the findings, in the playtest skill's shape; "nothing new" is a fine answer)

**Questions for Sean** — (0–3; each answerable in one sentence; he answers under it with `SEAN:`)

**Tomorrow** — the next queue item, named
```

"Test these three" is the point of the whole run: shrink his playtesting to
what needs taste and a thumb. Each one says exactly where to go and what to
look at. If the day's change needs no human test, say that and pick the three
most valuable things he could try anyway.

## What is never yours to decide

Balance numbers, prices, odds, tone, pacing, a new mechanic, a noun for a
thing, what a people wants, what the ghost thread is about. Those become a
question in the report. Everything mechanical about delivering a decided thing
— where the code goes, what the test asserts, what the knob is called — is
yours, and the ledger records it as yours.
