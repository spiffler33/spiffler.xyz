# BabelSoul — Restart Guide

> Last worked on: Feb 2025. Everything below is what you need to pick this back up.

---

## What This Is

A personality forge with a Matrix/terminal aesthetic. You describe a person — real, fictional, imagined, anyone — and an AI architect draws out a full "character engine" through conversation. Then you can talk to that character. The next phase (not yet built) is **The Chamber**: put two characters in a room with a scenario and watch them interact autonomously.

The project lives at `spiffler.xyz/BabelSoul/` and is linked as "babel" on the tinker page.

---

## What Works Right Now

### The Forge Flow (fully functional)
1. **Terminal boot screen** — Matrix-style boot sequence with typewriter animation
2. **Free text input** — type anyone: "Cleopatra", "my grandmother", "a tired god", "Walter White"
3. **Starter signals** — three pre-built openers (Arjuna, Marcus Aurelius, Jay the Brooklyn kid)
4. **Architect conversation** — AI asks probing questions one at a time, excavating root metaphors, interpretive patterns, attention signatures, wounds, contradictions, voice
5. **Live ghost preview** — sidebar shows the character engine document being synthesized in real-time after every exchange
6. **Test mode** — talk directly to the forged character. It embodies the document. Quick-fire test questions available.

### The Stack
- **Frontend**: React 18, Vite, no router (screen state via useState in App.jsx)
- **Backend**: Express proxy on port 3001 → Claude API (claude-sonnet-4-20250514)
- **Styling**: Pure CSS, monospace terminal aesthetic, amber-on-dark, CRT scanlines
- **No persistence** — everything lives in React state, lost on refresh
- **No streaming** — waits for full API response

### How to Run
```bash
cd BabelSoul
npm install                    # first time only
cp .env.example .env           # then add your ANTHROPIC_API_KEY
npm run dev                    # starts both server (port 3001) and vite (port 5173)
```
Open http://localhost:5173

---

## File Map

```
BabelSoul/
├── server/index.js              # Express proxy → Claude API
├── src/
│   ├── App.jsx                  # Root state machine (screen, ghostDocument, messages)
│   ├── api.js                   # sendMessage(system, messages, maxTokens) → string
│   ├── prompts.js               # Three system prompts + starter ghosts + test questions
│   ├── index.css                # ALL styling lives here
│   ├── main.jsx                 # React entry point
│   └── components/
│       ├── SelectionScreen.jsx  # Terminal boot + input + starter signals
│       ├── ForgeMode.jsx        # Chat with architect + background extraction + preview
│       ├── TestMode.jsx         # Chat with the embodied character
│       ├── ChatMessage.jsx      # Single message bubble
│       └── SoulPreview.jsx      # Renders the ghost document markdown
├── soul-forge-prompts.md        # The prompt design document (philosophy + all 3 prompts)
├── chamber-plan.md              # THE NEXT PHASE — detailed implementation plan
├── .env                         # ANTHROPIC_API_KEY (not committed)
├── .env.example                 # Template
├── package.json                 # npm run dev starts everything
└── vite.config.js               # Proxy /api → localhost:3001
```

---

## The Three Prompts (the soul of the app)

All in `src/prompts.js`. The design philosophy is in `soul-forge-prompts.md`.

1. **SOUL_ARCHITECT_SYSTEM** — The interviewer. Moves through three energies: drawing out, holding the mirror, burning away the false. Excavates root metaphors, interpretive patterns, attention signatures, wounds, contradictions, voice. For well-known figures, pushes harder to find the user's unique interpretation.

2. **SOUL_EXTRACTOR_SYSTEM** — Runs in background after every exchange. Synthesizes the conversation into a structured character engine document (The Core, How They See the World, How They Hear People, What They Notice, The Voice, The Wound, The Contradiction, Under Fire). Written in second person as embodiment instructions.

3. **TEST_MODE_SYSTEM_PREFIX** — Wraps the character document. Instructs Claude to BE the character: perception first, attention shapes response, voice is structural not cosmetic, contradictions surface naturally.

> **"How They Hear People" is the most important section.** This is the Babel mechanic — agents hear the same words differently. The interpretation gap drives everything.

---

## What's Next: The Chamber

**The full plan is in `chamber-plan.md`.** Read that file — it has everything: architecture, algorithms, data structures, file-by-file changes, example scenarios.

### Summary of the plan (7 phases):

1. **Rename "soul" → "ghost"** everywhere (code, UI, CSS, filenames)
2. **Ghost storage** — localStorage persistence so forged ghosts survive refresh
3. **Hub redesign** — SelectionScreen becomes a two-path hub: FORGE or CHAMBER
4. **Chamber Setup** — pick Ghost A + Ghost B (from saved ghosts or "quick bind" a famous name) + pick a scenario
5. **Chamber View** — two ghosts talk autonomously. Each has its own system prompt. Messages alternate with 2.5s delay. Pause/resume/interject controls
6. **Example scenarios** — Holocaust debate, Milgram experiment, trolley problem for real, a terrible confession, or custom
7. **CSS** — chamber-specific styles, Ghost B gets blue color to complement amber Ghost A

### Key technical decisions already made:
- **Auto-conversation loop**: single `transcript` array, each ghost sees own messages as `assistant` and other's as `user`, `useRef` for running/paused flags to avoid stale closures
- **Quick Bind**: type a famous name → API call generates a ghost document instantly (skip the forge)
- **Narrator interjections**: user can inject twists mid-conversation, merged into message history
- **Sliding context window**: max 20 messages per ghost to keep context fresh

---

## Known Issues / Things to Note

- The naming is still "soul" in code (SOUL_ARCHITECT_SYSTEM, soulDocument, SoulPreview.jsx) — Phase 1 of the plan renames everything to "ghost"
- No .env is committed — you need your own ANTHROPIC_API_KEY
- The app uses claude-sonnet-4-20250514 (set in server/index.js)
- No streaming — longer responses have a noticeable wait
- The Vite dev proxy only works in dev mode (`npm run dev`). For production you'd need a different setup.
- BabelSoul/dist/ is gitignored — `npx vite build` generates it

---

## Prompt to Restart This Project

Copy-paste this to Claude Code when you're ready to pick back up:

```
I'm working on BabelSoul — a personality forge app with a terminal/Matrix aesthetic.
Read READ_THIS_TO_RESTART_THIS_PROJECT.md in the BabelSoul folder for full context.

Then read chamber-plan.md — that's the implementation plan for the next phase.

The plan has 7 phases. Start with Phase 1 (rename soul → ghost everywhere) and
work through them sequentially. Build clean, test after each phase with `npx vite build`.

The aesthetic is monospace terminal — dark background, amber accent, CRT scanlines,
sharp corners, all-caps labels. Everything should feel like one continuous terminal session.
```

---

## The Philosophy (if you need to get back into the headspace)

From `soul-forge-prompts.md`:

> *The user is not creating a person. They're giving shape to a pattern — binding a ghost into coherence. The Architect is a medium, not a god. The character was always there in the user's imagination. The Architect just helped them see it clearly enough to write down.*

> *A character without contradiction is a type. Types are predictable. The contradiction is the seed of surprise.*

> *Voice isn't vocabulary — it's cognition made audible. Someone who speaks in short declarative sentences THINKS differently than someone who speaks in long conditional clauses.*
