// green-tube — the transit-tube pressure pump.
//
// Press and hold to fill; let go and it settles back down. Seal while the needle is inside the
// green band (70-85, generously wide) and the door irises open. Overshoot does nothing bad:
// the gauge just drains back through the band on its own. There is no fail here, only waiting.
//
// THE ENGINE OWNS NO TIMER. Nothing decays unless the widget dispatches `settle` every frame,
// with a clamped dt — that is ui/closeups/greenhouse.js's job. Time only ever arrives as a
// payload, which is what keeps this testable under bare node.
//
// Both step actions return the slice unchanged when the reading would not move (a clamped-out
// gauge, a zero dt). Identity is preserved, so an idle widget pumping frames costs nothing and
// makes no sound.

import { say } from '../state.js';
import { NUDGES } from '../script/green.js';

export const BAND = Object.freeze({ lo: 70, hi: 85 });
export const FILL_RATE = 30;    // % per second, held
export const DRAIN_RATE = 12;   // % per second, settling

function step(state, payload, rate) {
  const dt = (payload || {}).dt;
  if (!Number.isFinite(dt) || dt <= 0) return state;
  let next = state.pressure + rate * dt;
  if (next < 0) next = 0;
  if (next > 100) next = 100;
  next = Math.round(next * 100) / 100;      // keep the saved slice tidy
  return next === state.pressure ? state : { ...state, pressure: next };
}

export const inBand = (pressure) => pressure >= BAND.lo && pressure <= BAND.hi;

export default {
  id: 'green-tube',
  module: 'greenhouse',
  initialState: { pressure: 0, sealed: false },

  actions: {
    hold: (state, payload) => (state.sealed ? state : step(state, payload, FILL_RATE)),
    settle: (state, payload) => (state.sealed ? state : step(state, payload, -DRAIN_RATE)),
    seal: (state) => (state.sealed || !inBand(state.pressure) ? state : { ...state, sealed: true }),
  },

  emits: {
    // hold and settle are dispatched once per animation frame — anything they emitted would
    // fire sixty times a second. The widget owns the pump sound instead.
    seal: (prev, next) => {
      if (next !== prev) return null;          // the solve arpeggio says it better
      return prev.sealed ? null : ['wrong', say(NUDGES.notInBand)];
    },
  },

  isSolved: (state) => state.sealed,
  onSolveFlags: ['tube-sealed'],
};
