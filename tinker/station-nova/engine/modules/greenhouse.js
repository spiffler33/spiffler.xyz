// STATION NOVA — GREENHOUSE barrel.  (P5 owns this file.)
//
// One object, two halves. `createGame` reads id / puzzles / script and ignores the rest;
// ui/renderer.js reads hints / items / scene and ignores the rest. That is the whole seam
// between this phase and everything else — no phase edits another's files.
//
// The greenhouse is arrived at, not started in: its opening line hangs off the engine script
// key 'module:greenhouse' rather than scene.intro (which is cargo-only). The transition OUT of
// here is P7's glue watching 'tube-sealed'; the walkthrough segment below scripts the same beat
// so the canonical solve path runs headless.

import bloom from '../puzzles/green-bloom.js';
import valves from '../puzzles/green-valves.js';
import stars, { CONSTELLATIONS } from '../puzzles/green-stars.js';
import tube from '../puzzles/green-tube.js';
import { LINES, HINTS, BARKS } from '../script/green.js';

const solvedBloom = (state) => state.solved['green-bloom'] === true;
const watered = (state) => state.flags['planters-watered'] === true;
const charted = (state) => state.flags.charted === true;

// The tube is a one-way door: P7 rides her to the bridge on `tube-sealed` and there is no route
// back into here. bridge-course needs the star chart, so the door only opens once she has it.
// Not a lock — the other door hotspot below takes the click and PIP points back at the dome.
const canRide = (state) => watered(state) && charted(state);

// Reticle centres for the canonical solve path — the same numbers the sky is drawn from.
const [unicorn, comb, whale] = CONSTELLATIONS;

export default {
  id: 'greenhouse',
  puzzles: [bloom, valves, stars, tube],
  script: LINES,
  hints: HINTS,

  items: {
    'valve-handle': 'Brass valve handle',
    'shard-2': 'Memory shard 2',
    'star-chart': 'Star chart',
  },

  // Cargo's segment ends by setting module:greenhouse; this one ends by handing over to the
  // bridge, exactly as the tube ride does in play.
  walkthrough: [
    { puzzle: 'green-bloom', action: 'setLamp', payload: { lamp: 'sun', value: 8 } },
    { puzzle: 'green-bloom', action: 'setLamp', payload: { lamp: 'leaf', value: 2 } },
    { puzzle: 'green-bloom', action: 'setLamp', payload: { lamp: 'moon', value: 6 } },

    { puzzle: 'green-valves', action: 'attachHandle' },
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'B' } },   // close the two
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'E' } },   // electrics branches
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'A' } },
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'C' } },
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'D' } },
    { puzzle: 'green-valves', action: 'toggle', payload: { valve: 'F' } },

    { puzzle: 'green-stars', action: 'aim', payload: { to: [unicorn.at[0], unicorn.at[1]] } },
    { puzzle: 'green-stars', action: 'chart' },
    { puzzle: 'green-stars', action: 'aim', payload: { to: [comb.at[0], comb.at[1]] } },
    { puzzle: 'green-stars', action: 'chart' },
    { puzzle: 'green-stars', action: 'aim', payload: { to: [whale.at[0], whale.at[1]] } },
    { puzzle: 'green-stars', action: 'chart' },

    { puzzle: 'green-tube', action: 'hold', payload: { dt: 2.5 } },          // 0 -> 75
    { puzzle: 'green-tube', action: 'settle', payload: { dt: 0.2 } },        // 75 -> 72.6
    { puzzle: 'green-tube', action: 'seal' },

    { flag: 'module', value: 'bridge' },
  ],

  scene: {
    svg: 'assets/greenhouse.svg',
    // palette comes from PLAN decision 9, already built into the renderer for this module id.

    hotspots: [
      { id: 'moss', label: 'Moss wall', layer: 'back', sound: 'squeak', bark: BARKS.moss,
        shape: { type: 'rect', x: 260, y: 170, w: 380, h: 280 } },

      { id: 'planter-1', label: 'Planter row one', bark: BARKS.planter1,
        shape: { type: 'rect', x: 130, y: 620, w: 380, h: 220 } },

      { id: 'aquarium', label: 'Aquarium', sound: 'chime', bark: BARKS.aquarium,
        shape: { type: 'rect', x: 610, y: 520, w: 320, h: 300 } },

      { id: 'vault-flower', label: 'Vault-flower', puzzle: 'green-bloom', bark: BARKS.vaultClosed,
        enabled: (state) => !solvedBloom(state),
        shape: { type: 'rect', x: 1000, y: 360, w: 350, h: 500 } },

      // The open bloom's head reaches y 244 (petals rx 46 ry 86 swung about 1175,424) — the most
      // eye-catching thing in the room, and its top half must not be dead. The closed bud only
      // starts at y 372, so that one keeps its own smaller box.
      { id: 'vault-flower-open', label: 'Vault-flower', puzzle: 'green-bloom', bark: BARKS.vaultOpen,
        enabled: solvedBloom,
        shape: { type: 'rect', x: 995, y: 236, w: 360, h: 624 } },

      { id: 'manifold', label: 'Irrigation manifold', puzzle: 'green-valves', bark: BARKS.manifold,
        shape: { type: 'rect', x: 1450, y: 470, w: 400, h: 380 } },

      // The overhead rail is drawn across the WHOLE panorama (x 0-3600, y 52-86) with six drip
      // nozzles and four vine strands hanging off it. Hug the rail band so every nozzle and the
      // top of every strand is live — but stay out of the dome below it.
      { id: 'pipes', label: 'Irrigation pipes', layer: 'front', bark: BARKS.pipes,
        shape: { type: 'rect', x: 0, y: 44, w: 3400, h: 112 } },

      { id: 'planter-23', label: 'Planter rows two and three', bark: BARKS.planter23,
        shape: { type: 'rect', x: 1920, y: 620, w: 370, h: 230 } },

      // Dome art spans x 1476-2524, y 40-460. The back layer can only ever bring x 2400 on
      // screen, so it stops there; the rest of the glass is decorative.
      { id: 'dome', label: 'Observation dome', layer: 'back', bark: BARKS.dome,
        shape: { type: 'rect', x: 1476, y: 44, w: 924, h: 416 } },

      // The barrel is rotated -32 degrees: its objective end lands near x 2829, y 594, well
      // outside the old box. Tripod feet reach y 856.
      { id: 'telescope', label: 'Dome telescope', puzzle: 'green-stars', bark: BARKS.telescope,
        shape: { type: 'rect', x: 2460, y: 490, w: 380, h: 370 } },

      { id: 'plaques', label: 'Brass plaques', layer: 'front', sound: 'clunk', bark: BARKS.plaques,
        shape: { type: 'rect', x: 2870, y: 230, w: 230, h: 250 } },

      { id: 'planter-4', label: 'Planter row four', bark: BARKS.planter4,
        shape: { type: 'rect', x: 2820, y: 640, w: 230, h: 210 } },

      { id: 'tube-door-vined', label: 'Transit tube door', sound: 'squeak', bark: BARKS.tubeVined,
        enabled: (state) => !watered(state),
        shape: { type: 'rect', x: 3090, y: 300, w: 280, h: 580 } },

      { id: 'tube-door-nochart', label: 'Transit tube door', sound: 'squeak', bark: BARKS.tubeNoChart,
        enabled: (state) => watered(state) && !charted(state),
        shape: { type: 'rect', x: 3090, y: 300, w: 280, h: 580 } },

      { id: 'tube-door', label: 'Transit tube door', puzzle: 'green-tube', bark: BARKS.tubeClear,
        enabled: canRide,
        shape: { type: 'rect', x: 3090, y: 300, w: 280, h: 580 } },

      { id: 'fronds', label: 'Big fronds', layer: 'front', bark: BARKS.fronds,
        shape: { type: 'rect', x: 20, y: 560, w: 240, h: 420 } },

      // The mirror-image pair on the right of the deck (art x 3386-3600, bases at 3430/3496/3560).
      // The front layer moves at 1.06x and reaches x 3600 exactly, so this one really is
      // clickable at full pan. It starts at 3480 on purpose: front and mid slide past each other
      // by 0.06*camera, up to 103 units, and anything left of ~3474 would sit on top of the
      // transit tube door (mid, ends at 3370) at full pan and swallow the room's exit.
      { id: 'fronds-right', label: 'Big fronds', layer: 'front', bark: BARKS.frondsRight,
        shape: { type: 'rect', x: 3480, y: 560, w: 120, h: 420 } },
    ],

    // No scene.effects: everything this scene does on a flag — the vines drinking and letting
    // go of the door, the pipes running wet, the bud opening — is a <style> block inside
    // assets/greenhouse.svg hanging off the .nv-flag-<name> classes the renderer puts on
    // .nv-world. No JS, nothing to tear down, nothing to leak.
  },
};
