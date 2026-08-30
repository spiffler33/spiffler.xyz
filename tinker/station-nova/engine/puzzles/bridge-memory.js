// bridge-memory — three shards, three slots, one small robot getting himself back.
//
// Trivially easy by design: each shard carries a waveform and each slot is etched with one.
// This beat is for feelings, not difficulty. The only thing that gates it is finding shard 3,
// which is behind Commander Taklu's portrait.
//
// Its pinned hint is "Slide the portrait, take the shard, match wave shapes to slots", so
// TAKING is a real act: `slide` exposes the shard, `take` picks it up, and only then will the
// third waveform go into a slot. The engine has no mid-puzzle add-to-inventory API, so the
// shard is recorded in this slice (the documented pattern) and the dock widget reads it.

import { say } from '../state.js';
import { PLAQUE, PIP } from '../script/bridge.js';

/** Left to right, the etchings on PIP's dock. Deliberately not 1-2-3 — she still has to look. */
export const SLOT_WAVES = Object.freeze(['triangle', 'sine', 'square']);

/** Which shard carries which waveform. Shard 3 is the one behind the portrait. */
export const SHARD_WAVES = Object.freeze({ 1: 'sine', 2: 'square', 3: 'triangle' });

const HIDDEN_WAVE = SHARD_WAVES[3];

function slotIndex(payload) {
  const slot = payload && payload.slot;
  return Number.isInteger(slot) && slot >= 0 && slot < SLOT_WAVES.length ? slot : -1;
}

export default {
  id: 'bridge-memory',
  module: 'bridge',
  initialState: { portraitOpen: false, taken: false, slots: ['', '', ''] },

  actions: {
    // The portrait hotspot. Clicking it again just re-reads the plaque.
    slide: (state) => (state.portraitOpen ? state : { ...state, portraitOpen: true }),

    // The shard hotspot, which only exists once the portrait has moved.
    take: (state) => (state.portraitOpen && !state.taken ? { ...state, taken: true } : state),

    insert: (state, payload) => {
      const slot = slotIndex(payload);
      if (slot < 0 || state.slots[slot]) return state;
      const wave = payload && payload.wave;
      if (SLOT_WAVES[slot] !== wave) return state;
      if (wave === HIDDEN_WAVE && !state.taken) return state;
      const slots = state.slots.slice();
      slots[slot] = wave;
      return { ...state, slots };
    },
  },

  emits: {
    slide: (prev, next) => (next === prev
      ? say(PLAQUE, { speaker: 'Brass plaque' })
      : ['clunk', say(PLAQUE, { speaker: 'Brass plaque' }), say(PIP.portrait)]),
    take: (prev, next) => (next === prev ? 'click' : ['pickup', say(PIP.tookShard)]),
    insert: (prev, next, payload) => {
      if (next !== prev) return 'pickup';
      const wave = payload && payload.wave;
      if (wave === HIDDEN_WAVE && !prev.taken) return ['wrong', say(PIP.needShard3)];
      return ['wrong', say(PIP.wrongSlot)];
    },
  },

  isSolved: (state) => state.slots.length === SLOT_WAVES.length && state.slots.every(Boolean),
  onSolveFlags: ['memory-restored'],
};
