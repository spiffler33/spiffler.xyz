// cargo-torch — the hand-crank torch in the open supply locker.
//
// The close-up widget drags the handle in circles and dispatches the ABSOLUTE number of
// turns it has accumulated so far. Charge only ever climbs: wiggling the handle back and
// forth must never undo work she already did.
//
// No `emits.crank` here on purpose. The widget owns that sound so its pitch can rise with
// the charge, and declaring it in both places fires it twice per tooth.

export const TURNS_NEEDED = 3;

export default {
  id: 'cargo-torch',
  module: 'cargo',
  initialState: { turns: 0 },
  actions: {
    crank(state, payload) {
      const turns = Number(payload && payload.turns);
      if (!Number.isFinite(turns) || turns <= state.turns) return state;
      return { turns: Math.min(TURNS_NEEDED, turns) };
    },
  },
  isSolved: (state) => state.turns >= TURNS_NEEDED,
  onSolveFlags: ['torch-charged'],
};
