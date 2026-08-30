// bridge-launch — the finale chain. Four guarded switches in any order, then the throttle,
// then `launch confirm` typed at the terminal.
//
// Nothing here can fail: every blocked action returns the slice it was handed, which the
// emits function reads as "nothing happened" and answers with a gentle sound and a PIP line
// naming exactly what is still missing.

import { say } from '../state.js';
import { PIP } from '../script/bridge.js';

export const SWITCH_COUNT = 4;
export const FULL_THROTTLE = 100;

function switchIndex(payload) {
  const i = payload && payload.i;
  return Number.isInteger(i) && i >= 0 && i < SWITCH_COUNT ? i : -1;
}

function armed(ctx) {
  return ctx.flags['memory-restored'] === true;
}

const allOn = (state) => state.switches.every(Boolean);

export default {
  id: 'bridge-launch',
  module: 'bridge',
  initialState: {
    covers: [false, false, false, false],
    switches: [false, false, false, false],
    throttle: 0,
    confirmed: false,
  },

  actions: {
    // The board stays asleep until PIP has his memory back — he is the one who flies her.
    cover: (state, payload, ctx) => {
      const i = switchIndex(payload);
      if (i < 0 || !armed(ctx) || state.covers[i]) return state;
      const covers = state.covers.slice();
      covers[i] = true;
      return { ...state, covers };
    },

    flip: (state, payload, ctx) => {
      const i = switchIndex(payload);
      if (i < 0 || !armed(ctx) || !state.covers[i]) return state;
      const switches = state.switches.slice();
      switches[i] = !switches[i];
      return { ...state, switches };
    },

    // Detents, driven by the widget's drag. Time never enters the engine.
    throttle: (state, payload) => {
      const value = payload && payload.value;
      if (typeof value !== 'number' || !Number.isFinite(value)) return state;
      if (!allOn(state)) return state;
      const next = Math.max(0, Math.min(FULL_THROTTLE, Math.round(value)));
      return next === state.throttle ? state : { ...state, throttle: next };
    },

    confirm: (state) => {
      if (!allOn(state) || state.throttle < FULL_THROTTLE || state.confirmed) return state;
      return { ...state, confirmed: true };
    },
  },

  emits: {
    cover: (prev, next, payload, ctx) => {
      if (next !== prev) return 'clunk';
      if (!armed(ctx)) return ['wrong', say(PIP.launchAsleep)];
      return 'click';
    },
    flip: (prev, next, payload, ctx) => {
      if (next !== prev) return 'clunk';
      if (!armed(ctx)) return ['wrong', say(PIP.launchAsleep)];
      return ['wrong', say(PIP.coverFirst)];
    },
    // The widget owns the drag sound (play('crank', {progress}) needs a live parameter the
    // engine cannot have), so a landed detent is silent here — only the blocked case speaks.
    throttle: (prev, next) => (next === prev && !allOn(prev) ? ['wrong', say(PIP.throttleLocked)] : null),
    confirm: (prev, next) => {
      if (next !== prev) return 'rumble';
      if (!allOn(prev)) return ['wrong', say(PIP.needSwitches)];
      if (prev.throttle < FULL_THROTTLE) return ['wrong', say(PIP.needThrottle)];
      return 'click';
    },
  },

  isSolved: (state) =>
    state.confirmed === true && state.throttle >= FULL_THROTTLE && allOn(state),
  onSolveFlags: ['WIN'],
};
