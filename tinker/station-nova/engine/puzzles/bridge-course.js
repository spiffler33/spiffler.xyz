// bridge-course — plot the way home through the three charted constellations.
//
// Gated on TWO flags. `nav-unlocked` first: the plotter lives inside the nav computer, so
// `chart` before the Taklu password is refused — otherwise `chart` is reachable as the very
// first command she types and the whole log-1/2/3 → `unlock nav TAKLU` beat is skippable.
// Then P5's `charted`: without the star chart there is nothing to plot against and PIP points
// back at the dome. Neither is a fail state; both are a redirect.
//
// isSolved is only ever evaluated during a dispatch AT this puzzle, so a flag flipping
// elsewhere cannot self-solve it — the terminal dispatches `open`, then `plot`.

import { say } from '../state.js';
import { PIP } from '../script/bridge.js';

/** [pinned] "Home run: the Whale, then the Comb, then the Unicorn. Every time. — T." */
export const COURSE_ORDER = Object.freeze(['whale', 'comb', 'unicorn']);

/** True while `order` is still on the way to COURSE_ORDER. The plot widget shares this so the
 *  line she is dragging and the line the engine believes in can never disagree. */
export function isCoursePrefix(order) {
  if (!Array.isArray(order) || order.length > COURSE_ORDER.length) return false;
  for (let i = 0; i < order.length; i += 1) {
    if (order[i] !== COURSE_ORDER[i]) return false;
  }
  return true;
}

function sameOrder(a, b) {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

function wanted(payload) {
  const order = payload && payload.order;
  return Array.isArray(order) ? order.slice(0, COURSE_ORDER.length) : [];
}

export default {
  id: 'bridge-course',
  module: 'bridge',
  initialState: { opened: false, order: [] },

  actions: {
    // The `chart` command. NAV first, then the star chart — either missing and the plotter
    // stays shut.
    open: (state, payload, ctx) => {
      if (ctx.flags['nav-unlocked'] !== true || ctx.flags.charted !== true) return state;
      return state.opened ? state : { ...state, opened: true };
    },
    // The whole line, every time: a leg that is not on the way home drops the line back to
    // empty rather than failing anything.
    plot: (state, payload) => {
      const next = isCoursePrefix(wanted(payload)) ? wanted(payload) : [];
      return sameOrder(next, state.order) ? state : { ...state, order: next };
    },
  },

  emits: {
    open: (prev, next, payload, ctx) => {
      if (ctx.flags['nav-unlocked'] !== true) return ['wrong', say(PIP.navLocked)];
      if (ctx.flags.charted !== true) return ['wrong', say(PIP.noChart)];
      return 'chime';
    },
    plot: (prev, next, payload) => {
      if (!isCoursePrefix(wanted(payload))) return ['wrong', say(PIP.courseWrong)];
      return next.order.length === COURSE_ORDER.length ? null : 'click';
    },
  },

  isSolved: (state, ctx) => ctx.flags.charted === true && sameOrder(state.order, COURSE_ORDER),
  onSolveFlags: ['course-locked'],
};
