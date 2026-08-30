// cargo-crane — the ceiling-rail crane, the huge crate flush against the far wall, and
// what is behind it. Gasp #1.
//
// Two beats, one puzzle: grab / lift / move / drop the crate off its slot (which reveals
// the crawl hatch and fires the pinned gasp line), then drag the hatch wheel around at
// least twice. Solving sets `hatch-open` — P7 hangs the crawl-through to the greenhouse
// off that flag, because a puzzle may not set `module` itself.
//
// The whole rig is gated on `crane-powered`, so this beat can only happen last: torch →
// keypad → fuse → conduit run → crane. That gate is what keeps shard 1 and the fuse on the
// only road out of the room.
//
// Nothing here can fail. An action that cannot apply returns its slice unchanged, which
// the `emits` functions read as identity and answer with the gentle `wrong` sound — plus,
// when the reason is simply no power, PIP saying so.

import { say } from '../state.js';
import { GASP_1, WHEEL_NUDGE, CRANE_DEAD } from '../script/cargo.js';

export const SLOTS = 4;
export const HOME_SLOT = SLOTS - 1;   // hard against the far wall, where it has always sat
export const WHEEL_TURNS = 2;

/** Nothing on this rig moves until the conduit run is carrying current. Without this the
 *  enormous crate — the most obvious object in the room — is movable from second one, and
 *  the whole Cargo Bay (torch, keypad, fuse, shard 1) can be walked straight past. Every
 *  action reads the flag the same way cargo-power.insert reads the inventory. */
const powered = (ctx) => ctx.flags['crane-powered'] === true;

/** A refusal PIP explains, never a dead click: the gentle sound plus the reason. */
const refuse = (ctx) => (powered(ctx) ? 'wrong' : ['wrong', say(CRANE_DEAD)]);

export default {
  id: 'cargo-crane',
  module: 'cargo',
  initialState: { grabbed: false, lifted: false, slot: HOME_SLOT, revealed: false, wheel: 0 },
  actions: {
    grab(state, payload, ctx) {
      if (!powered(ctx)) return state;
      return state.grabbed ? state : { ...state, grabbed: true };
    },
    lift(state, payload, ctx) {
      if (!powered(ctx) || !state.grabbed || state.lifted) return state;
      return { ...state, lifted: true };
    },
    move(state, payload, ctx) {
      if (!powered(ctx) || !state.grabbed || !state.lifted) return state;
      const dir = payload && payload.dir;
      const delta = dir === 'left' ? -1 : (dir === 'right' ? 1 : 0);
      if (delta === 0) return state;
      const slot = state.slot + delta;
      if (slot < 0 || slot >= SLOTS) return state;
      return { ...state, slot };
    },
    drop(state, payload, ctx) {
      if (!powered(ctx) || !state.grabbed) return state;
      return {
        ...state,
        grabbed: false,
        lifted: false,
        revealed: state.revealed || state.slot !== HOME_SLOT,
      };
    },
    // The wheel widget reports the absolute turns it has accumulated, like the torch crank.
    turn(state, payload) {
      if (!state.revealed) return state;
      const turns = Number(payload && payload.turns);
      if (!Number.isFinite(turns) || turns <= state.wheel) return state;
      return { ...state, wheel: Math.min(WHEEL_TURNS, turns) };
    },
  },
  emits: {
    grab: (prev, next, payload, ctx) => (next === prev ? refuse(ctx) : 'clunk'),
    lift: (prev, next, payload, ctx) => (next === prev ? refuse(ctx) : 'rumble'),
    move: (prev, next, payload, ctx) => (next === prev ? refuse(ctx) : 'rumble'),
    drop: (prev, next, payload, ctx) => {
      if (next === prev) return refuse(ctx);
      if (next.revealed && !prev.revealed) return ['rumble', say(GASP_1), say(WHEEL_NUDGE)];
      return 'clunk';
    },
    turn: (prev, next) => {
      if (next === prev) return null;
      return (next.wheel >= WHEEL_TURNS && prev.wheel < WHEEL_TURNS) ? 'clunk' : 'crank';
    },
  },
  isSolved: (state) => state.revealed === true && state.wheel >= WHEEL_TURNS,
  onSolveFlags: ['hatch-open'],
};
