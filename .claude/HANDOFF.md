# Handoff — 2026-08-24 (phase closed: gravity-golf anti-cheat + new mechanics)

`tinker/gravity-golf/index.html` shipped: the aim preview no longer reveals a sinking shot, and four new mechanics were added to the procedural hole generator. Nothing else in the site changed.

## Read first
- Memory `gravity-golf-design` — how the game is structured, why the preview must never signal success, and how to test `#core` headlessly.
- Memory `spiffler-deploy` — this repo is GitHub Pages from `master` root; a commit is not live until pushed.

## Verify before coding
- `git status --short` in `~/dev/projects/spiffler.xyz` — expect clean except the known untracked `Library/*` and `house-md/START_HERE_NextEpisodePrompt.md` (deliberately left out, see below).
- Extract and run the engine headlessly — `#core` is DOM-free by design:
  `node -e "const s=require('fs').readFileSync('tinker/gravity-golf/index.html','utf8').match(/<script id=\"core\">([\s\S]*?)<\/script>/)[1];const GG=new Function(s+';return GG;')();for(let n=1;n<=40;n++){const c=GG.genHole(n);if(c.planets.length>26)throw n;}console.log('ok')"`
- Expected shape of holes 1–40: par 2 at hole 1 rising to 6 by hole ~10; worst-case `genHole` ~105 ms (hole 28); max 21 bodies.

## What shipped
- **Anti-cheat.** Deleted the green ring that pulsed on the hole whenever the previewed path would sink — spiff's kids wiggled the drag until it lit, so the game solved itself. Replaced with a look-ahead that shrinks by hole number: `aimSteps()` in `#app`, 480 physics steps (2.0 s) at hole 1 down to 108 (0.45 s) from hole 12. The crash marker stayed; failure is fair to show, success is not.
- **Four mechanics**, gated into the existing difficulty ladder: asteroid belts (hole 5+, dead rock orbiting a static planet, `mu = 0`), wormhole pairs (8+, same speed and heading out of the far mouth), bumpers (11+, zero-gravity elastic mirrors, mint), drifting black hole (14+, the target orbits its own dashed track).
- Bodies are sorted gravity-first and `course.gravN` bounds the force loop, so belt rocks cost collision checks only.
- `solvable()` sweep coarsened to 144 bearings x 9 powers — halves generation cost *and* guarantees surviving holes have a forgiving solution window.

## Constraints carried forward
- **Never reintroduce a "this shot goes in" indicator.** Tune difficulty with the two constants in `aimSteps()`.
- Every hole must stay sinkable from the tee in one shot — `solvable()` enforces this at generation time; don't weaken it.
- The preview must remain bit-identical to the flown path (same `substep`, same `DT`, same absolute-time formula). Any new mechanic must be a pure function of state and `t`.
- `~/dev/projects/fluid/gravitygolf/index.html` is a byte-identical duplicate. Only the `tinker/` copy deploys. Keep them in sync or delete the duplicate.

## Next
Open the ask to spiff: is the shrinking preview tuned right? The ramp (full at hole 1, hardest from hole 12) was a judgement call, not a measurement — he was going to play holes 10–14 and say. Adjust `aimSteps()` from his answer; change nothing else.

**Deliberately not committed:** `Library/design-prompt.md`, `Library/reader-design-plan.md`, `Library/how-we-die/passages-original.json` (782 KB of book text), and `house-md/START_HERE_NextEpisodePrompt.md`. The `.gitignore` already excludes library source files and plans under `library/`; these sit under `Library/` and slipped past it. Confirm with spiff before adding any of them.
