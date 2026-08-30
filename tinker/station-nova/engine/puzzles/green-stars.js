// green-stars — the dome telescope.
//
// The starfield is two screens wide. The eyepiece has a fixed reticle at its centre, so the
// only thing the engine needs to know is where that reticle currently points: `at` is a
// position in FIELD units, not a camera offset, which keeps the puzzle independent of whatever
// size the window happens to be.
//
// Three brass plaques by the door name the shapes: The Unicorn (5 stars), The Comb (4 — Taklu
// Uncle's own contribution to astronomy) and The Whale (6). Centre the reticle on one and
// press CHART. All three charts the sky: `charted`, which the Bridge course plotter needs.
//
// CONSTELLATIONS is exported for the widget so the sky, the plaques and the hit test can never
// drift apart. Star positions are absolute field coordinates.

import { say } from '../state.js';
import { NUDGES } from '../script/green.js';

export const FIELD = Object.freeze({ w: 2000, h: 1400 });
export const TOLERANCE = 130;   // generously wide: this is a kid's telescope, not a sextant

export const CONSTELLATIONS = Object.freeze([
  Object.freeze({
    id: 'unicorn',
    name: 'The Unicorn',
    at: Object.freeze([430, 330]),                    // upper-left
    stars: Object.freeze([[350, 360], [410, 330], [460, 290], [520, 235], [430, 405]]),
    lines: Object.freeze([[0, 1], [1, 2], [2, 3], [1, 4]]),
  }),
  Object.freeze({
    id: 'comb',
    name: 'The Comb',
    at: Object.freeze([1420, 690]),                   // centre-right
    stars: Object.freeze([[1315, 675], [1385, 685], [1455, 695], [1525, 705]]),
    lines: Object.freeze([[0, 1], [1, 2], [2, 3]]),
  }),
  Object.freeze({
    id: 'whale',
    name: 'The Whale',
    at: Object.freeze([960, 1090]),                   // lower-middle
    stars: Object.freeze([[840, 1110], [860, 1150], [930, 1120], [1000, 1100], [1065, 1075], [1030, 1020]]),
    lines: Object.freeze([[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [3, 5]]),
  }),
]);

function coord(value, limit) {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  return value > limit ? limit : value;
}

/** Which constellation the reticle is sitting on, or null. */
export function under(at) {
  for (const c of CONSTELLATIONS) {
    const dx = at[0] - c.at[0];
    const dy = at[1] - c.at[1];
    if (dx * dx + dy * dy <= TOLERANCE * TOLERANCE) return c.id;
  }
  return null;
}

export default {
  id: 'green-stars',
  module: 'greenhouse',
  initialState: { at: [FIELD.w / 2, FIELD.h / 2], charted: [] },

  actions: {
    // The widget dispatches this when a drag settles, not every frame.
    aim: (state, payload) => {
      const to = (payload || {}).to;
      if (!Array.isArray(to) || to.length < 2) return state;
      const x = coord(to[0], FIELD.w);
      const y = coord(to[1], FIELD.h);
      if (x === null || y === null) return state;
      if (x === state.at[0] && y === state.at[1]) return state;
      return { ...state, at: [x, y] };      // a fresh array: the caller keeps its own
    },

    chart: (state) => {
      const found = under(state.at);
      if (!found || state.charted.includes(found)) return state;
      return { ...state, charted: [...state.charted, found] };
    },
  },

  emits: {
    // aim is silent on purpose — panning the sky is continuous, and a sound per drag is noise.
    chart: (prev, next) => {
      if (next !== prev) return 'chime';
      // Re-charting one she already has is not a wrong answer, so it does not sound like one.
      if (under(prev.at)) return ['click', say('That one is already on the chart, Commander.')];
      return ['wrong', say(NUDGES.nothingCharted)];
    },
  },

  isSolved: (state) => state.charted.length === CONSTELLATIONS.length,
  onSolveFlags: ['charted'],
  onSolveItems: ['star-chart'],
};
