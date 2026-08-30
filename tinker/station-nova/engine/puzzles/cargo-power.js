// cargo-power — the 2x3 rotatable conduit panel between the backup battery and the crane.
//
// Grid coordinates are [row][col]: row 0 is the top row, col 0 the west-most column.
// The battery feeds the WEST side of row 0; the crane socket takes the EAST side of row 1.
//
//   solved:   (0,0) straight —   (0,1) corner ┐ (west→south)   (0,2) decoy stub
//             (1,0) decoy stub   (1,1) corner └ (north→east)   (1,2) straight —
//
// Every path tile starts one 90° turn clockwise from where it belongs, so the panel is
// visibly wrong on arrival and putting it right is pure rotation. The two stubs have a
// single open end and can therefore never carry current, whichever way they point.
//
// The fuse must be inserted before any of it counts. There is no inventory-removal API in
// the engine, so consumption is recorded right here as `fuseIn` and the UI reads that.

import { say } from '../state.js';
import { NO_FUSE } from '../script/cargo.js';

export const ROWS = 2;
export const COLS = 3;

export const KINDS = [
  ['straight', 'corner', 'stub'],
  ['stub', 'corner', 'straight'],
];

const INITIAL_ROT = [
  [1, 3, 0],
  [0, 1, 1],
];

// Which sides each kind joins at rotation 0. A rotation step turns the whole set clockwise.
const BASE = { straight: ['W', 'E'], corner: ['N', 'E'], stub: ['N'] };
const CLOCKWISE = { N: 'E', E: 'S', S: 'W', W: 'N' };
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const STEP = { N: [-1, 0], S: [1, 0], W: [0, -1], E: [0, 1] };

export const BATTERY = { row: 0, col: 0, side: 'W' };
export const SOCKET = { row: 1, col: COLS - 1, side: 'E' };

/** The sides a tile joins, once its rotation is applied. */
export function connections(kind, rot) {
  const turns = (((Number(rot) || 0) % 4) + 4) % 4;
  let dirs = BASE[kind] || [];
  for (let i = 0; i < turns; i += 1) dirs = dirs.map((d) => CLOCKWISE[d]);
  return dirs;
}

const key = (row, col) => `${row},${col}`;

/** Every cell current actually reaches from the battery, as a Set of "row,col" keys.
 *  Exported so the close-up can light the live part of the run without re-deriving it. */
export function poweredCells(rot) {
  const lit = new Set();
  if (!connections(KINDS[BATTERY.row][BATTERY.col], rot[BATTERY.row][BATTERY.col]).includes(BATTERY.side)) {
    return lit;
  }
  const stack = [[BATTERY.row, BATTERY.col]];
  lit.add(key(BATTERY.row, BATTERY.col));
  while (stack.length) {
    const [row, col] = stack.pop();
    for (const side of connections(KINDS[row][col], rot[row][col])) {
      const [dr, dc] = STEP[side];
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (lit.has(key(r, c))) continue;
      if (!connections(KINDS[r][c], rot[r][c]).includes(OPPOSITE[side])) continue;
      lit.add(key(r, c));
      stack.push([r, c]);
    }
  }
  return lit;
}

/** True when current runs unbroken from the battery port to the crane socket. */
export function pathComplete(rot) {
  if (!poweredCells(rot).has(key(SOCKET.row, SOCKET.col))) return false;
  return connections(KINDS[SOCKET.row][SOCKET.col], rot[SOCKET.row][SOCKET.col]).includes(SOCKET.side);
}

export default {
  id: 'cargo-power',
  module: 'cargo',
  initialState: { fuseIn: false, rot: INITIAL_ROT },
  actions: {
    insert(state, payload, ctx) {
      if (state.fuseIn || !ctx.inventory.includes('fuse')) return state;
      return { ...state, fuseIn: true };
    },
    rotate(state, payload) {
      // Once current runs, the panel is finished. Letting her spin a solved run back apart
      // would show a broken conduit under a crane that is plainly still powered.
      if (state.fuseIn && pathComplete(state.rot)) return state;
      const row = Number(payload && payload.row);
      const col = Number(payload && payload.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) return state;
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return state;
      const rot = state.rot.map((line, r) => line.map((v, c) => ((r === row && c === col) ? (v + 1) % 4 : v)));
      return { ...state, rot };
    },
  },
  emits: {
    insert: (prev, next) => {
      if (next !== prev) return 'clunk';
      return next.fuseIn ? null : ['wrong', say(NO_FUSE)];
    },
    rotate: (prev, next) => (next === prev ? 'click' : 'clunk'),
  },
  isSolved: (state) => state.fuseIn === true && pathComplete(state.rot),
  onSolveFlags: ['crane-powered'],
};
