# Epistemics audit findings (2026-07-19) — ALL 7 FIXES APPLIED same day (see commit); kept as audit record. Deliberate-decision items below remain open.
Principle: chart shows only what the boat could know (lights ≤1 / revealed / ping / passive / sunlight ≤300m). Precedent: d305dd6. Line numbers approximate.

## Fix in this order
1. **Ping rays pass through slice-rock** (~2595): rays only stop on `tile.wall`; a hex that's rock AT current depth is transparent → permanently reveals labyrinth behind it (save-persisted!). Fix: `if (tile.wall || !hexAcceptsDepth(tile, state.currentDepth)) break;`
2. **Creature glyphs unearned** (~2203): drawn ≤SIGHT+1 with no reveal/light gate, through rock, beyond the contact-log's own passive envelope (passiveRange()+2=3). Fix: `if (dC > 1 && (dC > passiveRange() + 2 || revealFade(c.q, c.r, state.currentDepth) <= 0)) continue;`
3. **Depth strip leaks full column** (~4136): uses tile.ceiling/floor (whole column incl. unknown runs behind stone). Fix: draw `volumeContaining(tile, state.currentDepth)` run only; hide if null (logZContext model).
4. **Ping POI depth hint uncapped** (~2684): nearestVolume scans 12km; clamp announce/hint to `lvl.depthRange`. Also skip consumed air/salvage in interesting-loop (~2624) — post-reload they re-announce (mirror consumedPoi test at ~2094).
5. **Collision sonar reads whole column** (~2797): clamp `near.deltaMeters <= PING_LEVELS[activeSub().sonarMaxPower].depthRange`, else "No passage at this depth."
6. **Stone fill via known-face neighbor** (~1830): add `&& hexNearDepth(nt, state.currentDepth)` so only known OPEN water (not a revealed rock face) unlocks stone.
7. **Floodlight bubble lights roofed caves at r=2-3 unearned** (~1899): `if (dFromPlayer <= (hexNearDepth(tile, 0) ? bubbleR : 1)) fade = 1;`

## Deliberate-decision items (not bugs)
- Surface/sunlit regime shows seafloor POI glyphs at any distance; handleTile collects salvage/air with no depth requirement below 200m rule quirk — pick a fiction (hex-level vs must-dive).
- noiseMade wake-log radius (+6) vs contact log (+2): name the envelopes.
- identifyPoi depthHint branch is dead code (safe to delete).

## Verified clean (don't re-audit)
d305dd6 branch; deep-water fade gates; POI glyph dark-gating; identifyPoi; contact logs; logZContext; ping arrow depth cap; pingMemory; consumedPoi render+reward; save/resume; trail/dots/flash; movement msgs; zone/flavor; isSurf0 stone; land branch.
