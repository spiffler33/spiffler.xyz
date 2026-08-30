// bridge-password — play the three crew logs, then unlock NAV with what everyone calls the
// Commander.
//
// Locked decision 7: there is no parsing here. ui/console.js has already split the typed line
// on whitespace and looked the command up in a fixed table; this puzzle receives the one
// remaining token and compares it, case-insensitively, against one exact word.

import { say } from '../state.js';
import { LOGS, PIP } from '../script/bridge.js';

const PASSWORD = 'taklu';

/** The one comparison. Exported so the test and the terminal agree on "any case". */
export function passwordMatches(given) {
  return typeof given === 'string' && given.trim().toLowerCase() === PASSWORD;
}

function logNumber(payload) {
  const n = payload && payload.n;
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

export default {
  id: 'bridge-password',
  module: 'bridge',
  initialState: { played: [], unlocked: false },

  actions: {
    playLog: (state, payload) => {
      const n = logNumber(payload);
      if (!n || state.played.includes(n)) return state;
      return { ...state, played: [...state.played, n] };
    },
    // A wrong password is a no-op: nothing is lost, nothing resets, no penalty.
    unlock: (state, payload) => {
      if (!passwordMatches(payload && payload.password)) return state;
      return state.unlocked ? state : { ...state, unlocked: true };
    },
  },

  emits: {
    playLog: (prev, next, payload) => {
      const log = LOGS[logNumber(payload)];
      if (!log) return ['wrong', say(PIP.badLog)];
      return ['chime', say(log.text, { speaker: log.speaker })];
    },
    // Keyed off the password, not off the diff: replaying a correct unlock must not scold her.
    unlock: (prev, next, payload) => {
      if (!passwordMatches(payload && payload.password)) return ['wrong', say(PIP.wrongPassword)];
      return next === prev ? 'chime' : null;   // the first success rings its own 'solve'
    },
  },

  isSolved: (state) => state.unlocked === true,
  onSolveFlags: ['nav-unlocked'],
};
