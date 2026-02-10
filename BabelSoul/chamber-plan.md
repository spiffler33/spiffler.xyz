# Ghost Forge + The Chamber — Implementation Plan

## Context
BabelSoul has a working forge → test flow with a terminal aesthetic. Now we need:
1. Rename "soul" → "ghost" everywhere
2. Persist forged ghosts (localStorage)
3. Build **The Chamber** — two ghosts interact autonomously in a scenario
4. Quick Bind — auto-generate a ghost from just a name (skip the forge)
5. Example scenarios showing the range (historical debates, philosophy experiments, moral dilemmas)

## New Screen Flow

```
GHOST_FORGE v2.0 (hub)
  ├── FORGE → ForgeMode → Session  →  [SAVE GHOST]
  └── THE CHAMBER → ChamberSetup → ChamberView
                    (pick 2 ghosts    (auto-conversation
                     + scenario)       pause/resume/interject)
```

The current SelectionScreen becomes the hub with two paths. No separate MainMenu needed — keep it lean.

## Phase 1: Rename soul → ghost

All files — mechanical rename of exports, props, state, CSS classes, UI text:

- `prompts.js`: `SOUL_ARCHITECT_SYSTEM` → `GHOST_ARCHITECT_SYSTEM`, `SOUL_EXTRACTOR_SYSTEM` → `GHOST_EXTRACTOR_SYSTEM`, `STARTER_SOULS` → `STARTER_GHOSTS`
- `App.jsx`: `soulDocument` → `ghostDocument`, `handleSelectSoul` → `handleSelectGhost`
- `ForgeMode.jsx`: prop renames, `extractSoul` → `extractGhost`, UI: `GHOST_FORGE`
- `TestMode.jsx`: prop rename, UI: `THE_GHOST`
- `SoulPreview.jsx` → rename file to `GhostPreview.jsx`, component + props + CSS classes
- `SelectionScreen.jsx`: `STARTER_GHOSTS`, boot text `GHOST_FORGE v2.0`
- `index.css`: all `.soul-preview*` → `.ghost-preview*`
- `index.html`: title tag

## Phase 2: Ghost Storage

**New file: `src/ghostStorage.js`**
- `loadGhosts()` / `saveGhost(ghost)` / `deleteGhost(id)` — localStorage CRUD
- `extractGhostName(doc)` — parse `# Name` line from ghost document
- Storage key: `'babelsoul-ghosts'`
- Ghost shape: `{ id, name, document, createdAt, source: 'forged' | 'quick-bind' }`

**ForgeMode changes:**
- Add `[SAVE]` button next to `[TEST]` in the header
- On click: extract name from document, save to localStorage, show brief `// ghost saved` flash

## Phase 3: Hub Redesign (SelectionScreen)

The boot screen becomes a two-path hub:

```
> GHOST_FORGE v2.0
> SYSTEM READY

> [FORGE A GHOST]     — describe someone, build them from scratch
> [THE CHAMBER]       — put two ghosts in a room, see what happens

> saved ghosts: 3
```

Keep the same boot animation. After boot, show two primary paths + saved ghost count. Clicking FORGE goes to existing flow (with the "who do you have in mind?" input + starter signals). Clicking CHAMBER goes to ChamberSetup.

## Phase 4: Chamber Setup (`ChamberSetup.jsx`)

Two ghost selector slots + scenario picker:

```
THE_CHAMBER
// two ghosts. one scenario. no rules.

GHOST A                    GHOST B
[saved ghost dropdown]     [saved ghost dropdown]
   — or —                     — or —
> quick bind: ___          > quick bind: ___

SCENARIO
[Holocaust Debate] [Milgram Question] [Trolley — For Real] [Confession]
> or write your own: _______________

[ENTER THE CHAMBER →]
```

**Quick Bind**: User types a famous name → API call with `QUICK_BIND_SYSTEM` prompt → generates ghost document in ~5s → auto-saves to localStorage.

**New prompt: `QUICK_BIND_SYSTEM`** — instructs Claude to generate a full ghost document from just a name, using the same format as the extractor but drawing on its knowledge. Prioritizes "How They Hear People" and "The Voice."

## Phase 5: Chamber View (`ChamberView.jsx`)

### Auto-Conversation Loop

Single `transcript` array: `[{ speaker: 'a' | 'b' | 'narrator', content: string }]`

**Message framing per ghost:**
- Ghost A sees own messages as `assistant`, Ghost B's as `user`
- Ghost B sees own messages as `assistant`, Ghost A's as `user`
- Narrator messages always appear as `user`

**Loop algorithm:**
1. Ghost A gets scene-setting user message → responds
2. Ghost B gets Ghost A's response as user message → responds
3. Alternate with 2.5s delay between turns
4. Use `useRef` for running/paused flags (avoids stale closures in setTimeout)
5. `mergeConsecutiveRoles()` handles narrator interjections (Claude requires strict alternation)

**Chamber system prompt per ghost:**
```
[TEST_MODE_SYSTEM_PREFIX + ghost document]

--- SCENE ---
[scenario text]

You are in conversation with [other ghost name]. Respond naturally.
Keep responses to 2-4 paragraphs. You have opinions — use them.
React to tone, not just content. You can disagree, push back, get uncomfortable.
```

**Controls:**
- `[PAUSE]` / `[RESUME]` / `[STOP]`
- Turn counter
- Interject input: user types a twist → injected as narrator message → next ghost sees it

### UI Layout
```
[< BACK]            THE_CHAMBER           [PAUSE] [STOP]
              // Ghost A vs Ghost B

GHOST_A (amber, left):
"response text..."

       GHOST_B (blue, right):
       "response text..."

[typing indicator for current speaker]

> inject a twist...                              [SEND]
```

Ghost B gets a complementary color: `--accent-b: #74b8d4` (cool blue vs warm amber).

## Phase 6: Example Scenarios (`CHAMBER_SCENARIOS` in prompts.js)

```js
[
  { title: 'The Holocaust, Revisited',
    description: 'Two minds collide over history\'s darkest chapter',
    prompt: 'Private room. The topic: the Holocaust...' },
  { title: 'The Milgram Question',
    description: 'Would you flip the switch?',
    prompt: 'You\'ve both just watched a documentary about Milgram...' },
  { title: 'Trolley Problem — For Real',
    description: 'Not a thought experiment anymore',
    prompt: 'You\'re standing at a real track switch...' },
  { title: 'A Terrible Confession',
    description: 'A stranger tells you something they\'ve never told anyone',
    prompt: 'Quiet bar. The person next to you turns...' },
  { title: 'Custom', description: 'Write your own', prompt: null }
]
```

## Phase 7: CSS additions

- Hub styles (two-path layout)
- ChamberSetup (ghost picker slots, scenario grid, quick-bind input)
- ChamberView (dual-speaker transcript, Ghost B color, narrator styling, controls bar)
- All monospace terminal aesthetic, matching existing patterns

## Files Summary

| File | Action |
|------|--------|
| `src/prompts.js` | Rename exports, add `QUICK_BIND_SYSTEM`, `CHAMBER_SCENARIOS`, `buildChamberPrompt()` |
| `src/ghostStorage.js` | **NEW** — localStorage CRUD |
| `src/App.jsx` | Rename state, add screen states (chamber-setup, chamber-view), chamber state vars |
| `src/components/SelectionScreen.jsx` | Redesign as hub with FORGE + CHAMBER paths |
| `src/components/ForgeMode.jsx` | Rename, add save button |
| `src/components/TestMode.jsx` | Rename props/UI text |
| `src/components/GhostPreview.jsx` | **RENAMED** from SoulPreview.jsx |
| `src/components/ChatMessage.jsx` | No changes needed |
| `src/components/ChamberSetup.jsx` | **NEW** — ghost + scenario selection |
| `src/components/ChamberView.jsx` | **NEW** — auto-conversation engine |
| `src/index.css` | Rename classes, add ~200 lines for chamber + hub |
| `index.html` | Title rename |

## Verification

1. `npx vite build` — clean build, no errors
2. Forge flow works: boot → forge → session → save ghost
3. Saved ghosts persist across refresh
4. Quick bind generates a ghost document from a name
5. Chamber: select two ghosts + scenario → auto-conversation runs → pause/resume works
6. Interjection injects twist into conversation
7. All screens maintain terminal aesthetic
