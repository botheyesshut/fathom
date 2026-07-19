# FATHOM HANDOFF 2
*Session: e23f0a9a — ILC lighting app context, Fathom work cross-directory*

---

## What Fathom Is

Single-file HTML browser game (`fathom-chart.html`). Sub *Erebus* explores an undersea cave network. Mobile-first — Sean tests on Android Chrome. No build step, no dependencies. ~3700 lines.

**Grand vision:** Late 80s/90s D&D feel, X-Com strategic layer (resource/crew management), Trade Wars 2002 economy, Sunless Sea atmosphere. Current work is entirely on the **overworld chart layer** — the ocean/trench/cave map. Dungeon delve (on-foot crew disembark at beaches) not yet started.

---

## Dev Workflow

- **File:** `C:\Users\bothe\Documents\GitHub\personal\Fathom\fathom-chart.html`
- **Syntax check:** `node -e "const fs=require('fs'); const h=fs.readFileSync('fathom-chart.html','utf8'); const m=h.match(/<script[^>]*>([\s\S]*?)<\/script>/g); let ok=true; for(const b of (m||[])){const s=b.replace(/<script[^>]*>/,'').replace(/<\/script>/,''); try{new Function(s);}catch(e){console.error('SYNTAX ERROR:',e.message);ok=false;break;}} if(ok)console.log('Syntax OK');"` (run from Fathom directory)
- **Preview server:** `C:\Python314\python.exe -m http.server 8765` from the Fathom directory
- **Sean tests on phone** — he can't git pull on Android. When builds are ready, use `SendUserFile` to deliver `fathom-chart.html` for download. There is ALSO a launch config in the ILC repo's `.claude/launch.json` that serves the Fathom directory on port 8765 for desktop preview.
- **bypassPermissions** is set in `C:\Users\bothe\Documents\GitHub\personal\Fathom\.claude\settings.json` — opening a Claude Code session rooted in the Fathom directory skips all permission prompts automatically. Sean knows this and prefers it.

---

## GitHub Pages (INCOMPLETE — needs Sean to act first)

The Fathom repo has NO remote configured. Sean wants GitHub Pages so he can bookmark a URL on his phone and reload after each build push.

**Sean needs to do** (one-time, 30 seconds):
1. Go to github.com/new
2. Create repo: name `Fathom`, **Public**, no README/license (empty)
3. Report back

**Then next Claude does:**
```bash
cd /c/Users/bothe/Documents/GitHub/personal/Fathom
git remote add origin https://github.com/botheyesshut/Fathom.git
git branch -M main
git push -u origin main
```

Then enable Pages via GitHub API or tell Sean: Settings → Pages → Deploy from branch → main → / (root).

URL will be: `https://botheyesshut.github.io/Fathom/fathom-chart.html`

Sean bookmarks that once on his phone. Every `git push` updates it automatically.

---

## CRITICAL: The Column/Cell Model

**NEVER say "this column is a wall."** Say "this column has zero water volumes."

Each tile (q,r) stores `volumes: [{ceiling, floor, kind}]` — runs of contiguous water. Cell (q,r,z) is water iff some volume contains z. `hexAcceptsDepth(tile, z)` tests this.

- `DEPTH_GRID = 60` — all depths snap to multiples of 60m
- `tile.wall === true` means zero water volumes
- `tileAt(q, r)` — ensures chunk generated and returns tile. Stone tiles created here are NOT added to `revealed`.
- `revealed` Set — contains only open water tiles the player has been near. Stone tiles are never in it.
- `addVolume()` — foundation function; clamps, snaps, merges

---

## Perimeter Color Rule (Hard-Won — Do Not Change Without Sean)

Edges are drawn FROM a reachable water hex TO its non-reachable neighbors. One step promise only.

| Neighbor state at (q',r') | Edge color |
|---|---|
| Stone wall (zero volumes) | `#a89a88` warm grey |
| Water accessible one step up (z-60) | `#7ed4f0` cyan |
| Water accessible one step down (z+60) | `#6048c8` indigo/purple |
| Both up and down (not current) | Gradient: cyan midpoint, indigo corners |
| Three stone cells (wall above, here, below) | `#a89a88` grey — functionally a wall |

The gradient (`aboveColor`/`belowColor`) is drawn per-edge with its own linearGradient anchored to the edge endpoints.

---

## Edge Rendering Fix (This Session)

**Problem:** Stone hexes rendered after the player's hex in the loop were drawing their stone fill polygons on top of edge lines, making east-facing walls appear thinner than west-facing ones (SVG renders in document order; later = on top).

**Fix:** All edge `line` elements now collect into a `pendingEdges` array during the main render loop and are appended to `g` after the loop completes. This guarantees edge lines always render on top of all stone fills regardless of iteration order.

Look for: `const pendingEdges = [];` before the `for (let dr...)` loop, and `for (const el of pendingEdges) g.appendChild(el);` after it.

---

## Stone Fill (This Session)

Stone hexes adjacent to any revealed open neighbor draw a dark warm grey fill.

```js
const seen = hexNeighbors(q, r).some(n => revealed.has(hexKey(n.q, n.r)));
if (seen) {
  const stoneAlpha = Math.max(0.6, 0.88 - Math.max(0, dFromPlayer - SIGHT) * 0.05);
  // fill: '#4a4540' — warm grey, visible even at depth over dark ocean background
}
```

**Why `#4a4540` not `#1e1c1a`:** The previous color at 35% min opacity over the dark ocean background `#08141e` blended to near-black (RGB ~16,23,29). `#4a4540` at 60% min opacity renders as clearly warm grey even in deep tunnels.

Stone hexes with NO revealed open neighbor stay pure black void — this is intentional fog of war.

---

## Key Code Locations

| Thing | Approx line |
|---|---|
| `addVolume()` | ~400 |
| `tileAt(q, r)` | ~1487 |
| Main render loop start | ~1729 |
| `pendingEdges` declaration | ~1729 (just before the loop) |
| Stone fill block | ~1797 |
| Perimeter edge block | ~1856–1967 |
| `pendingEdges` flush | ~2084 |
| Player marker (Erebus) | ~2027 |
| `restart()` | ~3304 |

---

## Sub Stats

hull=100, air=350, safeDepth=1500m, crushDepth=2200m, diveStep=60, diveStepFast=120, airBase=1, pressurePerMeter=0.04

---

## Open Threads (Not Started)

- Air resupply in deep caves
- Creature/loudness hookup
- Internal pillars in caverns
- Beach/air-pocket cells (on-foot module architecture — the dungeon layer)
- Underground lakes
- Sounding throttling
- Docking mechanics
- Crew system / economy layer (Trade Wars feel)

---

## Do Not

- Add features unasked
- Change the perimeter color rule without Sean explicitly approving it
- Use exotic Unicode for POI characters — ASCII only (JetBrains Mono on Android Chrome)
- Assume `tileAt()` adding a stone tile means it's in `revealed` — it never is
