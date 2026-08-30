// STATION NOVA — GREENHOUSE dialogue, hints and object barks.  (P5 owns this file.)
//
// Pure data. No DOM, no imports, no logic. engine/modules/greenhouse.js folds LINES into the
// engine `script` map (flag name -> dialogue) and re-exports HINTS on the barrel, which is the
// only place the renderer looks for them.
//
// Every string in PINNED is [pinned] payload from PLAN.md — verbatim, character for character.
// Never rewrite one, never "improve" its punctuation. New lines (the barks below) must match
// PIP's voice: short sentences, earnest, curious, slightly forgetful, never sarcastic at
// Nandini's expense, calls her Commander.

// ---- [pinned] — PLAN.md, P5 -----------------------------------------------------------------
export const PINNED = Object.freeze({
  entry: 'Welcome to the green module. Mind the moss. It minds you.',
  bloom: "The vault-flower only opens for its favourite light. Recipe's on the pot. Botanists, huh.",
  shard2: 'Another piece of me! I remember… fish? Someone fed fish. It was probably important.',
  valves: "Everybody's watered and nothing's on fire. That's a good day in space.",
  tube: "Pressure's green! Hold on to your everything —",
  stickyNote: 'The fish is called Fish. Do not let PIP rename it. — T.',
  recipeCard: 'Sunset feed: 80% sun · 20% leaf · 60% moon.',
});

// ---- flag name -> line(s), merged into the engine script map by the barrel -------------------
export const LINES = Object.freeze({
  'module:greenhouse': PINNED.entry,
  'vault-open': PINNED.shard2,
  'planters-watered': PINNED.valves,
  charted: 'Star chart saved. "The Comb" is not a real constellation, Commander. I love it anyway.',
  'tube-sealed': { text: PINNED.tube, pose: 'celebrate' },
});

// ---- [pinned] hint tiers — exactly three strings per puzzle: nudge, hint, answer -------------
export const HINTS = Object.freeze({
  'green-bloom': Object.freeze([
    'That big bud is fussy about light. Someone wrote down what it likes.',
    'The card says how much of each lamp. The sliders have notches.',
    'Sun 8, leaf 2, moon 6.',
  ]),
  'green-valves': Object.freeze([
    'The vines are thirsty. The pipes are dry. Follow them back to the valves.',
    'Water every planter — but the sparky box must stay dry. Close the branches that lead to it.',
    'Open A, C, D and F. Close B and E.',
  ]),
  'green-stars': Object.freeze([
    "Those plaques by the door aren't decoration. Look up.",
    "Find each plaque's shape in the telescope and press CHART.",
    'Chart the Unicorn top-left, the Comb centre-right, the Whale lower-middle.',
  ]),
  'green-tube': Object.freeze([
    'That door needs pressure. The pump handle is right there.',
    'Hold to fill, let go to settle — seal while the needle is in the green.',
    'Hold until just past 70, then press SEAL before it drains.',
  ]),
});

// ---- object barks — decision 8: no dead clicks ------------------------------------------------
export const BARKS = Object.freeze({
  moss: 'The moss is soft, warm, and I am fairly sure it is listening.',
  planter1: 'Row one. Sun-melons. They hum when they are happy.',
  aquarium: Object.freeze([
    'Fish!',
    Object.freeze({ speaker: 'Sticky note', text: PINNED.stickyNote, pose: 'idle' }),
    'I had eleven better names ready. I have put them away.',
  ]),
  vaultClosed: PINNED.bloom,
  vaultOpen: 'It is showing off. Honestly, I would show off too.',
  manifold: 'The irrigation manifold. Six valves, one very dry garden.',
  pipes: 'Drip. Drip. Drip. That water is extremely patient.',
  planter23: 'Rows two and three. Someone left a trowel out. It was probably me.',
  plaques: Object.freeze([
    'Three brass plaques. The Unicorn — five stars. The Whale — six.',
    'And "The Comb", four stars. Taklu Uncle put that one in the sky himself.',
  ]),
  dome: 'Real stars, Commander. Not a screen. I checked twice.',
  telescope: 'The dome telescope. It still points itself at whatever it likes.',
  planter4: 'Row four. These ones glow when you talk to them. Please talk to them.',
  tubeVined: 'The transit tube is under there. The vines are giving it a very long hug.',
  // Watered, but the Bridge cannot plot a course without the star chart, and there is no way
  // back into here once she rides. So the door waits, warmly, and points at the dome.
  tubeNoChart: 'Door is ready, Commander. But we should not leave blind — the dome telescope still owes us a star chart.',
  tubeClear: 'Vines off, door clear. It wants pressure before it lets you through.',
  fronds: 'Careful of the big fronds. They tickle back.',
  frondsRight: 'More big fronds. This lot lean towards the door, like they are seeing you off.',
});

// ---- close-up feedback: no fail states, only warm redirection ---------------------------------
export const NUDGES = Object.freeze({
  // green-valves: the electrics branch is refused, never allowed to flood.
  electrics: 'Careful, Commander — that branch runs at the electrics box. I did not let it through.',
  // One line for one situation: the manifold has no handle on it. It is the honest answer both
  // when she turns a wheel and when she taps the empty socket, so there is only one of it.
  noHandle: 'The manifold has no handle on it yet. That brass one from the pedestal should fit.',
  handleInKit: 'It is in your kit. Click the handle down there to pick it up, then click the socket.',
  handleAlreadyOn: 'The handle is already on, Commander. Turn the wheels.',
  // green-stars
  nothingCharted: 'Nothing lines up in the reticle yet. Nudge the sky a little, Commander.',
  // green-tube
  notInBand: 'Not yet — seal it while the needle is inside the green.',
});
