// STATION NOVA — pure game state machine.
//
// This file has zero browser globals: no DOM, no window, no Audio, no timers, no I/O.
// It runs under bare `node`. Time enters the engine as an action payload (e.g. {dt}),
// never as a timer the engine owns.
//
// ---------------------------------------------------------------------------
// STATE (plain, JSON-serialisable — P3's IndexedDB save round-trips it verbatim)
//
//   game.state = {
//     version:   1,                       // SAVE_VERSION — see RESTORE
//     module:    'cargo',                 // current module id
//     flags:     { 'torch-charged': true },
//     inventory: ['fuse', 'shard-1'],
//     solved:    { 'cargo-torch': true }, // one latch per puzzle, set on first solve
//     puzzles:   { 'cargo-torch': { turns: 3 } },   // each puzzle's own slice
//   }
//
// `game.state` and EVERYTHING reachable from it is deep-frozen — you cannot set a
// flag by writing to it. The engine replaces a container on write, so `game.state`
// itself is a stable object but `game.state.flags` is a new object after each change:
// hold `game.state`, re-read `game.state.flags` (don't cache the inner containers).
//
// Anything stored in a puzzle slice OR in a flag must survive JSON: no function, Map,
// Set, class instance, `undefined` value, array hole, cycle or non-finite number.
// Violations throw at the write that introduced them, before anything is committed.
//
// ---------------------------------------------------------------------------
// PUZZLE MODULE SHAPE
//
//   export default {
//     id: 'cargo-torch', module: 'cargo',
//     initialState: { turns: 0 },
//     actions: { crank: (state, payload, ctx) => newState },   // PURE
//     emits:   { crank: 'crank',                               // optional, per action
//                submit: (prev, next, payload, ctx) => spec | spec[] | null },
//     isSolved: (state, ctx) => bool,
//     onSolveFlags: ['torch-charged'],   // optional, set true once, on first solve
//     onSolveItems: ['fuse'],            // optional, pushed to inventory once
//   }
//
//   ctx = { module, flags, inventory } — frozen read-only snapshots. This is how a
//   puzzle reads the world (does she have the fuse? is `charted` set?). Puzzles never
//   read another puzzle's slice; they read the flags that puzzle set.
//
//   Actions are handed a DEEP-FROZEN slice and must not mutate it. The engine deep-COPIES
//   whatever an action returns, so it never freezes an object the caller still owns
//   (`pan: (s, {to}) => ({at: to})` is safe — the UI's live array stays writable).
//   Returning the slice you were handed, unchanged, is the idiom for "nothing happened":
//   identity is preserved, so `emits: {chart: (prev, next) => next === prev ? 'wrong' : 'chime'}`
//   works.
//
//   An emit spec is a sound name string ('click'), a {type:'sound'|'dialogue'} event,
//   or an array of those. A bare string in `emits` is always a SOUND NAME and must be
//   one of SOUND_NAMES (exported below) — for a spoken line use the exported say():
//   emits: { submit: () => ['wrong', say('Not that one.')] }
//   (in a `script` map, where everything is speech, a bare string is the line itself).
//   Actions may NOT emit 'flag' events — flags come from onSolveFlags or setFlag, so a
//   flag event always means the state really changed.
//   There is no implicit sound: an action with no `emits` entry is silent.
//
// ---------------------------------------------------------------------------
// VALIDATED AT createGame — a content typo fails at LOAD, loudly, never mid-play
//
//   Every barrel `script` line, every literal `emits` spec (sound names included),
//   every onSolveFlags / onSolveItems entry, every `initialState`, and every restored
//   save is checked while the game is built. A malformed line that only surfaced on the
//   dispatch that would have solved the puzzle used to abort that dispatch — leaving the
//   puzzle permanently unsolvable on every retry. Now it cannot reach play.
//   Also rejected at load: an `emits` key with no matching action, onSolveFlags /
//   onSolveItems on a puzzle with no `isSolved` (they could never fire), duplicate puzzle
//   ids or script keys across barrels, and a puzzle whose initialState already satisfies
//   its own isSolved (nothing would ever latch it).
//   An `emits` FUNCTION cannot be checked early; what it returns is checked when it runs.
//
// ---------------------------------------------------------------------------
// EVENT ORDER (fixed — downstream code depends on it)
//
//   dispatch(puzzleId, action, payload):
//     1. the action's `emits` events, in array order
//     2. only on the first transition to solved:
//        2a. { type:'sound', name:'solve' }
//        2b. for each onSolveFlags entry, in order:
//              { type:'flag', name, value:true }   — only if the flag was not already true
//              then that flag's script lines, in order — ALWAYS, so a line pinned to a
//              flag that a scripted beat set earlier still plays on the solve
//        (onSolveItems are already in state.inventory before 2a is delivered)
//
//   setFlag(name, value):
//     1. { type:'flag', name, value }        — only if the stored value changed
//     2. that flag's script lines, in order
//
//   Events are delivered synchronously after state is committed, so a subscriber
//   always reads consistent state. Subscribers added mid-delivery do not receive
//   events that already fired — there is no replay, ever.
//   A subscriber MAY call setFlag/dispatch: that change commits immediately, and its
//   events are queued and delivered after the batch in flight finishes, so the order
//   above always holds. A subscriber that emits unconditionally never settles; after
//   MAX_EMIT_BATCHES queued batches delivery throws instead of running forever.
//
// LIFETIME
//   An error thrown by an action (or by isSolved / an emits function / a malformed
//   returned state) aborts the whole dispatch: state is untouched, zero events are
//   delivered, and the error is rethrown to the caller.
//   An error thrown by a SUBSCRIBER cannot corrupt state — delivery still completes
//   for every other subscriber, then it is rethrown wrapped in a SubscriberError
//   (exported, `.committed === true`). That is the one error that means "the change
//   DID happen": do not retry the dispatch.
//
// SCRIPT
//   createGame merges each barrel's `script`: a map of FLAG NAME -> dialogue line(s).
//   That is its only job. Hints, barks and logs live in engine/script/<module>.js and
//   are read directly by the UI. A line is a string (speaker 'pip', pose 'talk') or
//   { speaker, text, pose }; an array plays several lines in order.
//   The key for a non-boolean flag is `name:value` — so the module transition
//   setFlag('module', 'greenhouse') plays the script line keyed 'module:greenhouse'.
//   (Script keys are for boolean and string flags; a structured flag value has no key.)
//
// SOLVED
//   `isSolved` is evaluated ONLY during a dispatch at that puzzle, on the state that
//   dispatch produced. Nothing else re-checks it. A puzzle gated purely on an external
//   flag (`isSolved: (s, ctx) => ctx.flags.charted === true`) therefore latches only when
//   the UI dispatches SOME action at it — setting the flag elsewhere is not enough.
//   `game.isSolved(id)` reads the latch in state.solved, which is what onSolveFlags and
//   onSolveItems fire from, exactly once.
//
// RESTORE
//   createGame({ modules, state }) validates the save and THROWS if it is not a state
//   this build can run: a different `version`, an unknown module id, a non-array
//   inventory, flags/solved/puzzles that are not plain objects, or solved/puzzles entries
//   for puzzles that do not exist. Callers (P3's loader) wrap the restore in try/catch and
//   fall back to a fresh createGame({ modules }) — one handler covers every bad-save case.
//   Bump SAVE_VERSION whenever a puzzle slice shape changes, so old saves are refused
//   instead of crashing an action that no longer understands them.
//
// RESERVED
//   The flag name 'module' is reserved: it moves the player and lives at state.module
//   (not in state.flags). Only setFlag may set it, and only to a known module id.
//   `hasFlag('module')` is therefore always false — read `game.state.module` instead.

const MODULE_FLAG = 'module';

// Bumped whenever a slice shape changes. A save from a different version is refused.
// 2: bridge-memory's slice gained `taken` (a version-1 save restores it missing, and the
//    shard counter reads it), and the record now carries the count-up clock alongside.
export const SAVE_VERSION = 2;

// The only sound names the engine may emit — ui/audio.js has the matching recipe table.
export const SOUND_NAMES = Object.freeze([
  'click', 'clunk', 'glint', 'crank', 'keypad', 'wrong',
  'solve', 'pickup', 'whoosh', 'rumble', 'chime', 'squeak',
]);
const SOUND_SET = new Set(SOUND_NAMES);

// How many queued re-entrant batches one delivery may drain before we call it a runaway.
const MAX_EMIT_BATCHES = 64;

// Thrown when a subscriber (or a runaway emit loop) fails AFTER the change was committed.
export class SubscriberError extends Error {
  constructor(cause) {
    super(`event delivery failed after the change was committed: ${cause?.message ?? String(cause)}`);
    this.name = 'SubscriberError';
    this.cause = cause;
    this.committed = true;
  }
}

function soundEvent(name, where) {
  if (typeof name !== 'string' || !name) throw new TypeError(`${where}: sound needs a name`);
  if (!SOUND_SET.has(name)) {
    throw new TypeError(
      `${where}: "${name}" is not a sound name — a bare string in emits is a SOUND NAME; ` +
        `for a spoken line use say("…"). Known sounds: ${SOUND_NAMES.join(', ')}`,
    );
  }
  return Object.freeze({ type: 'sound', name });
}

function flagEvent(name, value) {
  return Object.freeze({ type: 'flag', name, value });
}

function dialogueEvent(line, where) {
  if (typeof line === 'string') {
    if (!line) throw new TypeError(`${where}: dialogue text is empty`);
    return Object.freeze({ type: 'dialogue', speaker: 'pip', text: line, pose: 'talk' });
  }
  if (!line || typeof line !== 'object' || typeof line.text !== 'string' || !line.text) {
    throw new TypeError(`${where}: dialogue needs a non-empty text`);
  }
  return Object.freeze({
    type: 'dialogue',
    speaker: typeof line.speaker === 'string' && line.speaker ? line.speaker : 'pip',
    text: line.text,
    pose: typeof line.pose === 'string' && line.pose ? line.pose : 'talk',
  });
}

// A spoken line, for use inside `emits`, where bare strings mean sound names.
export function say(text, { speaker = 'pip', pose = 'talk' } = {}) {
  if (typeof text !== 'string' || !text) throw new TypeError('say() needs a non-empty line of text');
  return { type: 'dialogue', speaker, text, pose };
}

// A sound name, a sound/dialogue event, or nothing.
function toEvent(spec, where) {
  if (spec === null || spec === undefined) return null;
  if (typeof spec === 'string') return soundEvent(spec, where);
  if (typeof spec !== 'object') throw new TypeError(`${where}: expected a sound name or an event object`);
  if (spec.type === 'sound') return soundEvent(spec.name, where);
  if (spec.type === 'dialogue') return dialogueEvent(spec, where);
  throw new TypeError(`${where}: actions may emit only 'sound' and 'dialogue' events`);
}

function pushEvents(out, spec, where) {
  if (Array.isArray(spec)) {
    for (const one of spec) {
      const event = toEvent(one, where);
      if (event) out.push(event);
    }
    return out;
  }
  const event = toEvent(spec, where);
  if (event) out.push(event);
  return out;
}

function scriptKey(name, value) {
  return value === true ? name : `${name}:${String(value)}`;
}

// One script entry -> its frozen dialogue events. Runs at createGame, so a malformed
// pinned line is a load error, not a surprise on the dispatch that would have played it.
function compileLines(entry, where) {
  const list = Array.isArray(entry) ? entry : [entry];
  if (list.length === 0) throw new TypeError(`${where}: a script entry has no lines`);
  return Object.freeze(list.map((line) => dialogueEvent(line, where)));
}

const NO_LINES = Object.freeze([]);

// Deep-COPY a value into a frozen, JSON-safe version of itself, rejecting anything JSON
// would lose or change. Copying means the engine never freezes an object its caller still
// owns; `seen` holds the current ancestor chain, so cycles are caught rather than accepted
// and left to explode inside JSON.stringify.
function sealPure(value, path, seen) {
  if (value === null) return value;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`state.${path} is ${value}; state must survive JSON`);
    return value;
  }
  if (type !== 'object') throw new TypeError(`state.${path} is ${type}; state must survive JSON`);
  if (seen.has(value)) throw new TypeError(`state.${path} refers back to itself; state must survive JSON`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
    throw new TypeError(`state.${path} is not a plain object or array; state must survive JSON`);
  }
  seen.add(value);
  let copy;
  if (Array.isArray(value)) {
    copy = [];
    for (let i = 0; i < value.length; i += 1) {
      if (!Object.hasOwn(value, i)) throw new TypeError(`state.${path}[${i}] is a hole; state must survive JSON`);
      copy.push(sealPure(value[i], `${path}[${i}]`, seen));
    }
  } else {
    copy = {};
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) throw new TypeError(`state.${path}.${key} is undefined; state must survive JSON`);
      copy[key] = sealPure(value[key], `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
  return Object.freeze(copy);
}

const seal = (value, path) => sealPure(value, path, new Set());

// Everything about one puzzle that can be checked without playing it.
function validatePuzzle(id, puzzle) {
  const actions = puzzle.actions ?? {};
  const emits = puzzle.emits ?? {};
  for (const name of Object.keys(emits)) {
    if (!Object.hasOwn(actions, name)) {
      throw new Error(`puzzle "${id}": emits."${name}" has no matching action — that sound would never play`);
    }
    const spec = emits[name];
    if (typeof spec === 'function') continue; // computed — checked when it runs
    pushEvents([], spec, `${id}.emits.${name}`);
  }
  const flags = puzzle.onSolveFlags ?? [];
  const items = puzzle.onSolveItems ?? [];
  for (const name of flags) {
    if (typeof name !== 'string' || !name) throw new TypeError(`puzzle "${id}": onSolveFlags needs flag names`);
    if (name === MODULE_FLAG) {
      throw new Error(`puzzle "${id}": "module" is reserved — move the player with a {flag:'module'} beat`);
    }
  }
  for (const item of items) {
    if (typeof item !== 'string' || !item) throw new TypeError(`puzzle "${id}": onSolveItems needs item names`);
  }
  if (typeof puzzle.isSolved !== 'function' && (flags.length || items.length)) {
    throw new Error(`puzzle "${id}": onSolveFlags/onSolveItems need an isSolved — nothing would ever fire them`);
  }
}

// A save is either something this build can run, or an error. There is no middle.
function validateSave(saved, moduleIds, registry) {
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
    throw new TypeError('createGame: state must be a saved-game object');
  }
  if (saved.version !== SAVE_VERSION) {
    throw new Error(
      `createGame: save version ${String(saved.version)} is not ${SAVE_VERSION} — discard the save and start fresh`,
    );
  }
  if (saved.module !== undefined && !moduleIds.includes(saved.module)) {
    throw new Error(`createGame: saved module "${String(saved.module)}" is not a known module`);
  }
  if (saved.inventory !== undefined && !Array.isArray(saved.inventory)) {
    throw new TypeError('createGame: saved inventory must be an array');
  }
  for (const item of saved.inventory ?? []) {
    if (typeof item !== 'string' || !item) throw new TypeError('createGame: saved inventory holds a non-item');
  }
  for (const key of ['flags', 'solved', 'puzzles']) {
    const part = saved[key];
    if (part === undefined) continue;
    if (typeof part !== 'object' || part === null || Array.isArray(part)) {
      throw new TypeError(`createGame: saved ${key} must be a plain object`);
    }
  }
  for (const key of ['solved', 'puzzles']) {
    for (const id of Object.keys(saved[key] ?? {})) {
      if (!registry.has(id)) throw new Error(`createGame: saved ${key}."${id}" is not a known puzzle`);
    }
  }
}

export function createGame(opts = {}) {
  const modules = opts.modules ?? [];
  const registry = new Map();
  const moduleIds = [];
  const rawScript = Object.create(null);

  for (const mod of modules) {
    if (!mod || typeof mod.id !== 'string' || !mod.id) throw new TypeError('every module barrel needs a string id');
    if (moduleIds.includes(mod.id)) throw new Error(`duplicate module id "${mod.id}"`);
    moduleIds.push(mod.id);
    for (const puzzle of mod.puzzles ?? []) {
      if (!puzzle || typeof puzzle.id !== 'string' || !puzzle.id) {
        throw new TypeError(`module "${mod.id}" has a puzzle without an id`);
      }
      if (registry.has(puzzle.id)) throw new Error(`duplicate puzzle id "${puzzle.id}"`);
      registry.set(puzzle.id, puzzle);
    }
    for (const key of Object.keys(mod.script ?? {})) {
      if (key in rawScript) throw new Error(`duplicate script key "${key}" (module "${mod.id}")`);
      rawScript[key] = mod.script[key];
    }
  }

  // Content check: every pinned line and every literal emit, before a single click.
  const script = new Map();
  for (const key of Object.keys(rawScript)) script.set(key, compileLines(rawScript[key], `script["${key}"]`));
  for (const [id, puzzle] of registry) validatePuzzle(id, puzzle);

  const saved = opts.state ?? null;
  if (saved !== null) validateSave(saved, moduleIds, registry);

  let module = saved?.module ?? moduleIds[0] ?? null;
  let flags = Object.freeze(
    Object.fromEntries(
      Object.entries(saved?.flags ?? {}).map(([name, value]) => [name, seal(value, `flags.${name}`)]),
    ),
  );
  let inventory = Object.freeze([...(saved?.inventory ?? [])]);
  let solved = Object.freeze({ ...(saved?.solved ?? {}) });
  let puzzles = Object.freeze(
    Object.fromEntries(
      [...registry].map(([id, puzzle]) => [id, seal(saved?.puzzles?.[id] ?? puzzle.initialState ?? {}, `puzzles.${id}`)]),
    ),
  );

  // The whole state graph is frozen; the containers above are replaced on write.
  const state = {};
  Object.defineProperties(state, {
    version: { value: SAVE_VERSION, enumerable: true },
    module: { get: () => module, enumerable: true },
    flags: { get: () => flags, enumerable: true },
    inventory: { get: () => inventory, enumerable: true },
    solved: { get: () => solved, enumerable: true },
    puzzles: { get: () => puzzles, enumerable: true },
  });
  Object.freeze(state);

  // A fresh game whose puzzle is already solved can never latch — always an authoring
  // mistake. (Not checked on a restore: there the latch, not the slice, is the truth.)
  if (saved === null) {
    const ctx = Object.freeze({ module, flags, inventory });
    for (const [id, puzzle] of registry) {
      if (typeof puzzle.isSolved === 'function' && puzzle.isSolved(puzzles[id], ctx)) {
        throw new Error(`puzzle "${id}": its initialState already satisfies isSolved — nothing would ever latch it`);
      }
    }
  }

  const subscribers = new Set();
  const emitQueue = [];
  let delivering = false;

  function deliver(events) {
    if (delivering) {
      emitQueue.push(events); // re-entrant: drains after the batch in flight
      return;
    }
    delivering = true;
    let failure = null;
    try {
      let batch = events;
      let batches = 0;
      while (batch !== undefined) {
        batches += 1;
        if (batches > MAX_EMIT_BATCHES) {
          failure = new RangeError(
            `event delivery has not settled after ${MAX_EMIT_BATCHES} batches — a subscriber emits on every event`,
          );
          break;
        }
        for (const event of batch) {
          for (const fn of [...subscribers]) {
            if (!subscribers.has(fn)) continue; // unsubscribed during this delivery
            try {
              fn(event);
            } catch (err) {
              if (!failure) failure = err;
            }
          }
        }
        batch = emitQueue.shift();
      }
    } finally {
      delivering = false;
      emitQueue.length = 0;
    }
    if (failure) throw new SubscriberError(failure);
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('subscribe needs a function');
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  // Object.hasOwn, so a flag or puzzle named like an Object method is not "set".
  function hasFlag(name) {
    return Object.hasOwn(flags, name) && Boolean(flags[name]);
  }

  function isSolved(puzzleId) {
    return Object.hasOwn(solved, puzzleId) && Boolean(solved[puzzleId]);
  }

  function linesFor(name, value) {
    return script.get(scriptKey(name, value)) ?? NO_LINES;
  }

  function setFlag(name, value = true) {
    if (typeof name !== 'string' || !name) throw new TypeError('setFlag needs a flag name');
    if (name === MODULE_FLAG) {
      if (!moduleIds.includes(value)) throw new Error(`unknown module "${String(value)}"`);
      if (module === value) return;
      const events = [flagEvent(name, value), ...linesFor(name, value)];
      module = value;
      deliver(events);
      return;
    }
    const sealed = seal(value, `flags.${name}`);
    // "Changed" means the saved bytes changed — flags round-trip through JSON like slices.
    if (Object.hasOwn(flags, name) && JSON.stringify(flags[name]) === JSON.stringify(sealed)) return;
    const events = [flagEvent(name, sealed), ...linesFor(name, sealed)];
    flags = Object.freeze({ ...flags, [name]: sealed });
    deliver(events);
  }

  function dispatch(puzzleId, actionName, payload) {
    const puzzle = registry.get(puzzleId);
    if (!puzzle) throw new Error(`unknown puzzle "${String(puzzleId)}"`);
    const actions = puzzle.actions ?? {};
    const action = Object.hasOwn(actions, actionName) ? actions[actionName] : undefined;
    if (typeof action !== 'function') throw new Error(`puzzle "${puzzleId}" has no action "${String(actionName)}"`);

    // --- resolve: everything that can throw happens before anything is committed ---
    const prev = puzzles[puzzleId];
    const ctx = Object.freeze({ module, flags, inventory });

    const returned = action(prev, payload, ctx);
    // Returning the slice unchanged is "nothing happened" — keep its identity.
    const next = returned === prev ? prev : seal(returned, `puzzles.${puzzleId}`);

    const pending = [];
    const emits = puzzle.emits ?? {};
    if (Object.hasOwn(emits, actionName)) {
      const spec = emits[actionName];
      const where = `${puzzleId}.emits.${actionName}`;
      pushEvents(pending, typeof spec === 'function' ? spec(prev, next, payload, ctx) : spec, where);
    }

    const justSolved =
      !isSolved(puzzleId) &&
      typeof puzzle.isSolved === 'function' &&
      Boolean(puzzle.isSolved(next, ctx));

    const flagWrites = [];
    const newItems = [];
    if (justSolved) {
      pending.push(soundEvent('solve', puzzleId));
      const written = new Set();
      for (const name of puzzle.onSolveFlags ?? []) {
        if (written.has(name)) continue;
        written.add(name);
        // The flag event only fires on a real change; the pinned lines always play.
        if (flags[name] !== true) {
          flagWrites.push(name);
          pending.push(flagEvent(name, true));
        }
        pending.push(...linesFor(name, true));
      }
      for (const item of puzzle.onSolveItems ?? []) {
        if (!inventory.includes(item) && !newItems.includes(item)) newItems.push(item);
      }
    }

    // --- commit: no throwing past this line ---
    puzzles = Object.freeze({ ...puzzles, [puzzleId]: next });
    if (justSolved) {
      solved = Object.freeze({ ...solved, [puzzleId]: true });
      if (newItems.length) inventory = Object.freeze([...inventory, ...newItems]);
      if (flagWrites.length) {
        const merged = { ...flags };
        for (const name of flagWrites) merged[name] = true;
        flags = Object.freeze(merged);
      }
    }
    deliver(pending);
  }

  return { state, dispatch, subscribe, setFlag, hasFlag, isSolved };
}
