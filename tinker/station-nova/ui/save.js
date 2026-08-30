// STATION NOVA — persistence.
//
// IndexedDB only: db `station-nova`, object store `save`, one record under key `current`.
// The browser's synchronous key/value stores are banned project-wide (owner doctrine), so
// neither of their names appears anywhere in this build — including in this comment, which is
// what lets the ban be checked by a plain token scan over ui/ and engine/.
//
// The record is a JSON snapshot of `game.state` exactly as the engine hands it out —
// { version, module, flags, inventory, solved, puzzles } — plus `elapsedMs`, the count-up
// clock, which is UI state the engine never sees and which createGame ignores. It feeds
// straight back into createGame({ modules, state }). The engine THROWS on a save it cannot run (wrong
// SAVE_VERSION, unknown module, unknown puzzle id, corrupt shape); the caller's job is to
// catch that once and start a fresh game. See boot() in index.html for the one handler.
//
// Nothing in this file throws at the caller. A browser with IndexedDB disabled (private
// window, storage blocked) degrades to "no save": the game is fully playable, Continue just
// never appears. Importing this file under bare `node` is safe — every entry point checks
// for the global first.

const DB_NAME = 'station-nova';
const STORE = 'save';
const KEY = 'current';
const WRITE_DEBOUNCE_MS = 200;
const SWEEP_MS = 1200;

function db() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const conn = req.result;
      if (!conn.objectStoreNames.contains(STORE)) conn.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

// Resolves { ok, value }. `ok` is whether the transaction actually completed — a read that
// found nothing and a browser with no storage at all both yield a null value, and a save
// that silently did not happen must never report success.
function run(mode, work) {
  return db().then((conn) => {
    if (!conn) return { ok: false, value: null };
    return new Promise((resolve) => {
      let tx;
      try {
        tx = conn.transaction(STORE, mode);
      } catch {
        conn.close();
        resolve({ ok: false, value: null });
        return;
      }
      let value = null;
      const req = work(tx.objectStore(STORE));
      if (req) req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => { conn.close(); resolve({ ok: true, value: value === undefined ? null : value }); };
      tx.onerror = () => { conn.close(); resolve({ ok: false, value: null }); };
      tx.onabort = () => { conn.close(); resolve({ ok: false, value: null }); };
    });
  });
}

/** The saved state object, or null when there is nothing to continue. Never rejects. */
export function loadSave() {
  return run('readonly', (store) => store.get(KEY)).then((r) => r.value).catch(() => null);
}

/** True when a save exists — what the title screen's Continue button is gated on. */
export function hasSave() {
  return loadSave().then((saved) => saved !== null && typeof saved === 'object');
}

/** Write one snapshot. Resolves true on success, false when storage is unavailable. */
export function writeSave(snapshot) {
  return run('readwrite', (store) => store.put(snapshot, KEY))
    .then((r) => r.ok)
    .catch(() => false);
}

/** Drop the save — used by "start a fresh game" and by the fallback for a stale save. */
export function clearSave() {
  return run('readwrite', (store) => store.delete(KEY))
    .then((r) => r.ok)
    .catch(() => false);
}

/** JSON-plain copy of the live state. `game.state` is deep-frozen and its containers are
 *  accessors, so this both unfreezes it and proves it survives the round trip the engine
 *  already guarantees. */
export function snapshot(game) {
  return JSON.parse(JSON.stringify(game.state));
}

/** One record: the state, plus how long she has played it. Time never lives in the engine —
 *  it owns no timer at all — so the wall clock rides ALONGSIDE the state ({ …state,
 *  elapsedMs }) and createGame ignores the extra key. */
export function saveRecord(game, elapsedMs) {
  const data = snapshot(game);
  if (Number.isFinite(elapsedMs) && elapsedMs > 0) data.elapsedMs = Math.round(elapsedMs);
  return data;
}

/** How long she has already played, off a saved record. Without it the certificate prints
 *  only the sitting she happened to finish in, and that number has her name on it. */
export function savedElapsed(record) {
  const ms = record && record.elapsedMs;
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/** The boot decision, in one place: run the save when the engine accepts it, fall back to a
 *  fresh game when it does not, and say WHICH happened. `restored` is what the renderer's
 *  intro suppression keys on, so computing it from "a save existed" instead of "the save was
 *  accepted" fails silently and totally: every rejected save (stale version, unknown module,
 *  corrupt shape) starts a correct fresh game with PIP's entire opening suppressed.
 *  `create(state|null)` is the caller's createGame. A failure to build a FRESH game is a
 *  content error, not a bad save, and is rethrown. */
export function openSaved({ saved, create, onReject } = {}) {
  if (saved) {
    try {
      return { game: create(saved), restored: true, elapsedMs: savedElapsed(saved) };
    } catch (err) {
      if (onReject) { try { onReject(err); } catch { /* never bite the caller */ } }
    }
  }
  return { game: create(null), restored: false, elapsedMs: 0 };
}

/** Watches for a COMMITTED state change of any kind. The engine replaces a container on
 *  write and never mutates one in place, so five identity checks are the whole test — no
 *  deep compare, no serialisation. `changed()` reports each change exactly once. */
export function createChangeWatch(game) {
  const stamp = () => {
    const s = game.state;
    return [s.module, s.flags, s.inventory, s.solved, s.puzzles];
  };
  let last = stamp();
  return {
    changed() {
      const next = stamp();
      if (next.every((v, i) => v === last[i])) return false;
      last = next;
      return true;
    },
  };
}

/** Autosave on every committed state change — decision 4's "every flag change" is the floor,
 *  not the ceiling. A flag-only trigger silently loses everything that happens INSIDE a
 *  puzzle: torch turns, keypad digits, conduit rotations, valve toggles, charted
 *  constellations, throttle state, switch flips. Worse, a puzzle with `onSolveItems` but no
 *  `onSolveFlags` emits no flag at all, so its solved latch AND its granted inventory vanish
 *  on reload.
 *
 *  Two triggers, one funnel: every engine event (instant, covers everything that makes a
 *  sound or a line), plus a slow sweep for dispatches that emit nothing at all — the torch
 *  crank owns its own sound, so its dispatches are silent by design. Writes are debounced, so
 *  the burst a single solve emits still costs one write.
 *
 *  `onStatus(ok, err)` fires after each write attempt: ok=false when storage is unavailable
 *  or full. The caller surfaces that in-app (owner doctrine: a backup that is not happening
 *  must be visible), and gets ok=true again if a later write succeeds.
 *
 *  The subscriber body cannot be allowed to throw: the engine wraps a throwing subscriber in
 *  SubscriberError and rethrows it at whoever dispatched. Returns a stop function that
 *  unsubscribes and writes one final snapshot. */
export function attachAutosave(game, { onStatus, elapsed } = {}) {
  const watch = createChangeWatch(game);
  let timer = null;
  let pending = null;

  // The clock is stamped at each state change rather than on a timer of its own: every
  // dispatch, every flag, every solve writes, so the most a crash can cost is the thinking
  // time since her last click.
  const record = () => saveRecord(game, elapsed ? elapsed() : 0);

  const status = (ok, err) => { if (onStatus) { try { onStatus(ok, err); } catch { /* never bite the caller */ } } };

  const flush = () => {
    timer = null;
    const data = pending;
    pending = null;
    if (!data) return;
    writeSave(data).then((ok) => status(ok, ok ? null : new Error('save unavailable')));
  };

  const mark = () => {
    try {
      if (!watch.changed()) return;
      pending = record();
      if (timer === null) timer = setTimeout(flush, WRITE_DEBOUNCE_MS);
    } catch (err) {
      status(false, err);
    }
  };

  const unsubscribe = game.subscribe(mark);
  const sweep = setInterval(mark, SWEEP_MS);
  if (typeof sweep === 'object' && sweep && typeof sweep.unref === 'function') sweep.unref();

  return () => {
    unsubscribe();
    clearInterval(sweep);
    if (timer !== null) clearTimeout(timer);
    mark();
    flush();
  };
}
