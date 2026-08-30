// STATION NOVA — PIP's own voice: the lines that belong to him rather than to a room.
//
// Pure data plus one pure helper. No DOM, no engine import, no browser global — this file
// runs under bare node and is imported by the integration glue in index.html.
//
// The three idle barks are [pinned] payload from PLAN.md: verbatim, character for character.
// Never rewritten, never paraphrased, never re-punctuated.

// ---- [pinned] the idle-bark pool -------------------------------------------------------------
export const IDLE_BARKS = Object.freeze([
  "The station hums when she's thinking. Me too.",
  'No rush, Commander. Space is very patient.',
  'I checked. Fish is fine.',
]);

// ---- the shard counter on PIP ----------------------------------------------------------------
// Shards 1 and 2 land in the inventory. Shard 3 never does: the engine has no mid-puzzle
// add-to-inventory API, so bridge-memory records it in its own slice (`taken`) — the documented
// pattern. The glue counts both halves, which is why this is a fixed list of two, not three.
export const SHARD_ITEMS = Object.freeze(['shard-1', 'shard-2']);

/** Indexed by how many shards she has found. Index 0 hides the badge, so it says nothing. */
export const SHARD_LABELS = Object.freeze(['', '⅓ of me!', '⅔ of me!', 'All of me!']);

/** How much of PIP she has put back together, off `game.state`. Both halves of the count in
 *  one place, so the badge is provable under node instead of only by looking at it. */
export function countShards(state) {
  if (!state) return 0;
  const inventory = state.inventory || [];
  let found = 0;
  for (const item of SHARD_ITEMS) if (inventory.includes(item)) found += 1;
  const memory = (state.puzzles || {})['bridge-memory'];
  if (memory && memory.taken === true) found += 1;
  return found;
}

/** Round-robin over a pool, so PIP never repeats himself back to back. `start` is randomised
 *  by the caller so two sessions do not open with the same line; the order after that is
 *  fixed, which is what keeps the rotation honest instead of accidentally clumping. */
export function createBarkRotation(pool = IDLE_BARKS, { start = 0 } = {}) {
  const lines = pool.slice();
  if (!lines.length) return { next: () => '' };
  let i = Number.isInteger(start) ? ((start % lines.length) + lines.length) % lines.length : 0;
  return {
    next() {
      const line = lines[i];
      i = (i + 1) % lines.length;
      return line;
    },
  };
}
