// green-valves — the irrigation manifold.
//
// The topology, pinned in PLAN.md, is a plain tree. No maze, no hidden pipe:
//
//   source ─ A ─────────────── planter 1
//              └ B ─────────── ELECTRICS BOX
//   source ─ C ─ D ─────────── planter 2 + planter 3
//                  └ E ─────── ELECTRICS BOX
//   source ─ F ─────────────── planter 4
//
// Water reaches the electrics box iff (A and B) or (C and D and E). That state is never
// entered: a toggle that would flood it is REFUSED and PIP warns. No fail, no reset, no
// consequence — the valve simply does not turn.
//
// The manifold starts with B and E already open (the crew left the drain branches cracked),
// which is why the pinned hint says "close the branches that lead to it".
//
// The brass handle is consumed the way the engine expects: there is no inventory-removal API,
// so "used" lives in this slice as `handleOn` and the UI reads it.

import { say } from '../state.js';
import { NUDGES } from '../script/green.js';

export const VALVES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F']);
export const TARGET = Object.freeze({ A: true, B: false, C: true, D: true, E: false, F: true });
export const HANDLE = 'valve-handle';

/** Would this valve map put water on the electrics box? */
export function floods(open) {
  return Boolean((open.A && open.B) || (open.C && open.D && open.E));
}

export default {
  id: 'green-valves',
  module: 'greenhouse',
  initialState: {
    handleOn: false,
    open: { A: false, B: true, C: false, D: false, E: true, F: false },
  },

  actions: {
    attachHandle: (state, payload, ctx) => {
      if (state.handleOn) return state;
      if (!ctx.inventory.includes(HANDLE)) return state;
      return { ...state, handleOn: true };
    },

    toggle: (state, payload) => {
      if (!state.handleOn) return state;
      const valve = (payload || {}).valve;
      if (!VALVES.includes(valve)) return state;
      const open = { ...state.open, [valve]: !state.open[valve] };
      if (floods(open)) return state;      // refused, and nothing is lost
      return { ...state, open };
    },
  },

  emits: {
    attachHandle: (prev, next) => {
      if (next !== prev) return 'clunk';
      return prev.handleOn ? null : ['wrong', say(NUDGES.noHandle)];
    },
    // A refusal with a real valve and the handle fitted can only be the electrics branch:
    // closing a valve can never flood anything, so only an opening move is ever refused.
    toggle: (prev, next, payload) => {
      if (next !== prev) return 'squeak';
      if (!prev.handleOn) return ['wrong', say(NUDGES.noHandle)];
      if (!VALVES.includes((payload || {}).valve)) return null;
      return ['wrong', say(NUDGES.electrics)];
    },
  },

  isSolved: (state) => state.handleOn && VALVES.every((valve) => state.open[valve] === TARGET[valve]),
  onSolveFlags: ['planters-watered'],
};
