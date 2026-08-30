// bridge-boot — PIP docks into the captain's console and the screen wakes.
//
// The teach beat for the terminal: type `help`, then `scan`. All three actions are driven by
// ui/console.js (the one mounted terminal drives four puzzle ids through api.dispatchTo).
// The console owns the per-keystroke blip; these emits own the response sound.

import { say } from '../state.js';
import { BOOT_LINE, PIP } from '../script/bridge.js';

export default {
  id: 'bridge-boot',
  module: 'bridge',
  initialState: { docked: false, helped: false, scanned: false },

  actions: {
    // Dispatched once by the terminal widget when the close-up mounts.
    dock: (state) => (state.docked ? state : { ...state, docked: true }),
    help: (state) => (state.helped ? state : { ...state, helped: true }),
    scan: (state) => (state.scanned ? state : { ...state, scanned: true }),
  },

  emits: {
    dock: (prev, next) =>
      (next === prev ? null : ['clunk', say(BOOT_LINE), say(PIP.dockedIn)]),
    help: (prev, next) => (next === prev ? 'click' : ['click', say(PIP.tryScan)]),
    scan: (prev, next) => (next === prev ? 'click' : 'chime'),
  },

  isSolved: (state) => state.helped === true && state.scanned === true,
  onSolveFlags: ['bridge-online'],
};
