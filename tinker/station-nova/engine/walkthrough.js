// STATION NOVA — the canonical solve path.
//
// Each module barrel owns its own segment; this file only concatenates them, in play
// order. No module phase edits this file.
//
// A step is either { puzzle, action, payload } or { flag, value } (value defaults to
// true) for a scripted beat — including the module transitions, which are
// { flag: 'module', value: 'greenhouse' }.

import { SubscriberError } from './state.js';
import cargo from './modules/cargo.js';
import greenhouse from './modules/greenhouse.js';
import bridge from './modules/bridge.js';

export const MODULES = [cargo, greenhouse, bridge];

export const WALKTHROUGH = [
  ...(cargo.walkthrough ?? []),
  ...(greenhouse.walkthrough ?? []),
  ...(bridge.walkthrough ?? []),
];

// Runs the steps against a game and returns every event they emitted, in order.
export function runWalkthrough(game, actions = WALKTHROUGH) {
  const events = [];
  const unsubscribe = game.subscribe((event) => events.push(event));
  try {
    for (let i = 0; i < actions.length; i += 1) {
      const step = actions[i];
      if (!step || typeof step !== 'object') throw new TypeError(`walkthrough[${i}] is not a step object`);
      try {
        if (typeof step.puzzle === 'string') {
          game.dispatch(step.puzzle, step.action, step.payload);
        } else if (typeof step.flag === 'string') {
          game.setFlag(step.flag, step.value === undefined ? true : step.value);
        } else {
          throw new TypeError('step needs {puzzle, action, payload} or {flag, value}');
        }
      } catch (err) {
        const label = step.puzzle ? `${step.puzzle}.${step.action}` : `flag ${step.flag}`;
        // A SubscriberError means the step itself worked and a listener blew up afterwards.
        // Reporting that as a failed step would send us hunting the wrong puzzle.
        const committed = err instanceof SubscriberError;
        const what = committed ? 'succeeded, then a subscriber threw' : 'failed';
        const wrapped = new Error(`walkthrough[${i}] (${label}) ${what}: ${err.message}`, { cause: err });
        if (committed) wrapped.committed = true;
        throw wrapped;
      }
    }
  } finally {
    unsubscribe();
  }
  return events;
}
