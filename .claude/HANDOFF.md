# Handoff — 2026-08-30 (phase closed: station-nova published to tinker)

`tinker/station-nova/` shipped — a browser escape room built for Nandini, added to `tinker.html` and `sitemap.xml`. It is a **vendored copy**; the source repo is elsewhere. Later the same day `tinker.html` was regrouped into three sections (`games` / `learn` / `projects`) — a new game gets a card under `games` plus a `sitemap.xml` entry.

## Read first
- Memory `station-nova` — why the site copy is not canonical, what must never be published, and how to verify a deploy.
- Memory `spiffler-deploy` — this repo is GitHub Pages from `master` root; a commit is not live until pushed.

## Verify before coding
- `git status --short` in `~/dev/projects/spiffler.xyz` — expect clean except the known untracked `Library/*` and `house-md/START_HERE_NextEpisodePrompt.md`, both deliberately left out.
- Open `https://spiffler.xyz/tinker/station-nova/?autotest=1` (or serve locally and use the same query) — wait ~45 s for a green **PASS** badge top-right and `PASS` in the tab title. That replays the whole solve path through the real UI. It wipes the save at both ends, so run it before playing, never mid-game.
- `find tinker/station-nova -type f | wc -l` → **35**. Only `index.html`, `engine/`, `ui/`, `assets/`.

## The one thing that will trip you up

**Do not edit `tinker/station-nova/` directly.** The canonical source is a separate git repo at `~/dev/projects/games/station-nova` (private remote `spiffler33/station-nova`), which also holds the 198-test suite, the Chrome-driven `tests/fit-check.mjs`, and `PLAN.md`. Fix bugs there, verify there, then re-copy the four paths above and push here.

Every game under `tinker/` follows the same rule since 2026-08-30: the source is `~/dev/projects/games/<name>/`, and `tinker/<name>/` is a byte-identical copy of its runtime files. gravity-golf used to be the exception (deployed file was the one to edit) — it no longer is.

`PLAN.md` and `tests/` are excluded on purpose: `PLAN.md` contains every puzzle solution and all the pinned dialogue, and this repo is public. The tests assert pinned strings against it, so they cannot run from the copy either.

## What's next

**Redesign committed 2026-08-30, NOT pushed:** the front page now carries the whole catalogue (`games` / `learn` / `projects` / `elsewhere`), `tinker.html` is a redirect stub to `/#games`, nav everywhere is `substack` + `github` (meridian and the old blog link are gone). Substack is https://substack.com/@spiffler. Pushed 2026-08-30. On the game itself, the build stopped at its human-playtest gate — spiff plays it and findings become new phases in the source repo's `PLAN.md`. Three items were deliberately left for his judgement rather than guessed at: the `cargo-power` answer hint is pinned text that restates the goal instead of giving the answer; camera flick/blur coast is tuneable in one FEEL KNOBS constant; and two discoverability beats (the fuse carry, and the fourth code fragment needing a deliberate pan right) were judged fair but are worth watching.

Note another session was committing `star-shooters` to this repo minutes before this phase — pull before starting work.

---

# Handoff — 2026-08-31 (phase closed: fc ved published to tinker)

`tinker/fcved/` shipped — a retro top-down football game built for Ved, with a card at the top of `index.html#games` and a `sitemap.xml` entry.

**Source of truth is `~/dev/projects/games/fcved/app` — never edit `tinker/fcved/` directly.** It is a build output, not source. The loop is: change the source repo, `cd ~/dev/projects/games/fcved/app && npm run build`, then `rm -rf tinker/fcved && cp -R app/dist tinker/fcved` here, then commit and push. `diff -r ~/dev/projects/games/fcved/app/dist tinker/fcved` must be empty afterwards.

Copy `dist/`, never `app/public/`: `public/sw.js` is a template carrying `__FCVED_VERSION__` / `__FCVED_PRECACHE__` placeholders that only the build fills in. A `public/`-sourced service worker would precache nothing.

Vite's `base` is hard-wired to `/tinker/fcved/`, so the assets, the manifest and the service-worker scope only resolve at that path. Moving the folder means rebuilding with a new base.
