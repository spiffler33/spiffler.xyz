# Handoff — 2026-08-30 (phase closed: station-nova published to tinker)

`tinker/station-nova/` shipped — a browser escape room built for Nandini, added to `tinker.html` and `sitemap.xml`. It is a **vendored copy**; the source repo is elsewhere. Nothing else in the site changed.

## Read first
- Memory `station-nova` — why the site copy is not canonical, what must never be published, and how to verify a deploy.
- Memory `spiffler-deploy` — this repo is GitHub Pages from `master` root; a commit is not live until pushed.

## Verify before coding
- `git status --short` in `~/dev/projects/spiffler.xyz` — expect clean except the known untracked `Library/*` and `house-md/START_HERE_NextEpisodePrompt.md`, both deliberately left out.
- Open `https://spiffler.xyz/tinker/station-nova/?autotest=1` (or serve locally and use the same query) — wait ~45 s for a green **PASS** badge top-right and `PASS` in the tab title. That replays the whole solve path through the real UI. It wipes the save at both ends, so run it before playing, never mid-game.
- `find tinker/station-nova -type f | wc -l` → **35**. Only `index.html`, `engine/`, `ui/`, `assets/`.

## The one thing that will trip you up

**Do not edit `tinker/station-nova/` directly.** The canonical source is a separate, remoteless git repo at `~/dev/projects/fluid/escaperoom`, which also holds the 198-test suite, the Chrome-driven `tests/fit-check.mjs`, and `PLAN.md`. Fix bugs there, verify there, then re-copy the four paths above and push here.

This is the **opposite** direction from the gravity-golf duplicate-copy gotcha, where the deployed file is the one to edit. Don't pattern-match between them.

`PLAN.md` and `tests/` are excluded on purpose: `PLAN.md` contains every puzzle solution and all the pinned dialogue, and this repo is public. The tests assert pinned strings against it, so they cannot run from the copy either.

## What's next

Nothing outstanding on the site side. On the game itself, the build stopped at its human-playtest gate — spiff plays it and findings become new phases in the source repo's `PLAN.md`. Three items were deliberately left for his judgement rather than guessed at: the `cargo-power` answer hint is pinned text that restates the goal instead of giving the answer; camera flick/blur coast is tuneable in one FEEL KNOBS constant; and two discoverability beats (the fuse carry, and the fourth code fragment needing a deliberate pan right) were judged fair but are worth watching.

Note another session was committing `star-shooters` to this repo minutes before this phase — pull before starting work.
