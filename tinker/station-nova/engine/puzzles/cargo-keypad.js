// cargo-keypad — the locked crate on the glow-painted wall. Code 2947.
//
// A wrong code is not a fail state: the pad forgets what she typed, plays the gentle
// `wrong` sound (the renderer shakes the panel on it) and PIP says something kind.
// Nothing is lost, nothing is counted against her, nothing resets.

import { say } from '../state.js';
import { KEYPAD_WRONG, KEYPAD_FULL } from '../script/cargo.js';

export const CODE = '2947';

// A fixed table of the ten legal keys — exact membership, not a pattern match.
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default {
  id: 'cargo-keypad',
  module: 'cargo',
  initialState: { entry: '', opened: false, tries: 0 },
  actions: {
    digit(state, payload) {
      if (state.opened || state.entry.length >= CODE.length) return state;
      const key = String(payload && payload.digit);
      if (!DIGITS.includes(key)) return state;
      return { ...state, entry: state.entry + key };
    },
    clear(state) {
      return state.entry === '' ? state : { ...state, entry: '' };
    },
    submit(state) {
      if (state.opened) return state;
      if (state.entry === CODE) return { ...state, opened: true };
      return { ...state, entry: '', tries: state.tries + 1 };
    },
  },
  emits: {
    // A fifth press onto a full pad must still answer — a silent key inside a close-up
    // reads as broken. It ticks, and PIP names the two keys that do something.
    digit: (prev, next) => {
      if (next !== prev) return 'keypad';
      if (!prev.opened && prev.entry.length >= CODE.length) return ['click', say(KEYPAD_FULL)];
      return 'click';
    },
    clear: (prev, next) => (next === prev ? null : 'click'),
    // A correct code stays silent here: the engine's own solve arpeggio and the
    // 'crate-open' script lines carry that moment.
    submit: (prev, next) => (next.opened ? null : ['wrong', say(KEYPAD_WRONG)]),
  },
  isSolved: (state) => state.opened === true,
  onSolveFlags: ['crate-open'],
  onSolveItems: ['fuse', 'shard-1'],
};
