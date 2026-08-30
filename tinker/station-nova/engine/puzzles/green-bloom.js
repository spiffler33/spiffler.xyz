// green-bloom — the vault-flower's light recipe.
//
// Three lamps over the pot (sun / leaf / moon), 0-10 detents each. The recipe card clipped to
// the pot reads "Sunset feed: 80% sun · 20% leaf · 60% moon", so the sliders want 8 / 2 / 6.
// There is deliberately no submit button: the bud opens the moment the light is right, so
// there is no wrong answer to get wrong — only light that is not yet its favourite.

export const LAMPS = Object.freeze(['sun', 'leaf', 'moon']);
export const RECIPE = Object.freeze({ sun: 8, leaf: 2, moon: 6 });
export const MAX_DETENT = 10;

// A detent index, or null for anything that is not one.
function detent(value) {
  if (!Number.isFinite(value)) return null;
  const step = Math.round(value);
  if (step < 0) return 0;
  return step > MAX_DETENT ? MAX_DETENT : step;
}

export default {
  id: 'green-bloom',
  module: 'greenhouse',
  // Every lamp starts at half: the pot is lit, just not the way it likes.
  initialState: { sun: 5, leaf: 5, moon: 5 },

  actions: {
    setLamp: (state, payload) => {
      const p = payload || {};
      if (!LAMPS.includes(p.lamp)) return state;
      const value = detent(p.value);
      if (value === null || value === state[p.lamp]) return state;
      return { ...state, [p.lamp]: value };
    },
  },

  // Identity preserved => nothing moved => no sound. The widget must not also play a click.
  emits: { setLamp: (prev, next) => (next === prev ? null : 'click') },

  isSolved: (state) => LAMPS.every((lamp) => state[lamp] === RECIPE[lamp]),
  onSolveFlags: ['vault-open'],
  onSolveItems: ['valve-handle', 'shard-2'],
};
