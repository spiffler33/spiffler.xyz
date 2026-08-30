// Cargo Bay barrel — the one seam between this module and everything else.
//
// createGame reads only `id` / `puzzles` / `script`; the renderer reads `hints`, `items`
// and `scene` off the same object, which is why no new import appears anywhere for the UI's
// half. The scene effects below build DOM inside `mount()` and nowhere else, so this file
// still loads and runs under bare node — `mount` is only ever called by the renderer.

import torch from '../puzzles/cargo-torch.js';
import keypad from '../puzzles/cargo-keypad.js';
import power from '../puzzles/cargo-power.js';
import crane from '../puzzles/cargo-crane.js';
import {
  OPENING, SHARD_1, PLUSH, HINTS, BARKS,
  TORCH_LIT, FUSE_FOUND, POWER_UP, HATCH_OPEN,
} from '../script/cargo.js';

const SCENE_W = 3600;
const SCENE_H = 1000;

// ---------------------------------------------------------------------------------------
// The torch beam — the whole visual conceit of this room.
//
// Two stacked veils, crossfaded, both BELOW the hotspot layer so an interactive object
// still shimmers faintly in the dark (locked decision 8: no pixel-hunting) while the ART
// stays hidden until the beam sweeps over it.
//   unlit   : a flat near-black veil. Only the emergency amber strips read through it.
//   lit     : a radial hole that follows the cursor, polled from onFrame — never from a
//             pointermove listener, or the beam freezes while the camera coasts.
//   powered : the same hole, lifted, because the amber strips have come up to full.
// ---------------------------------------------------------------------------------------
const beamEffect = {
  id: 'cargo-beam',
  mount(world, fx) {
    // Both veils MUST sit under the hotspot layer. If the renderer ever stopped shipping
    // one, appending would put a 90%-black sheet OVER every hotspot and kill the glints —
    // so the safe fallback is no veil at all, not a veil in the wrong place.
    const hot = world.querySelector('.nv-hotlayer');
    if (!hot || hot.parentNode !== world) return null;
    const put = (n) => world.insertBefore(n, hot);

    // Built through world.ownerDocument, never a global: engine/ names no browser global.
    const doc = world.ownerDocument;
    const veil = doc.createElement('div');
    veil.style.cssText =
      'position:absolute;inset:0;pointer-events:none;transition:opacity 1.2s ease;' +
      'background:rgb(4 3 6 / .90);';

    // The radius is a LENGTH, never a percentage: a circle's <size> may not be a percentage
    // and the whole gradient computes to `none` if it is — a silent, invisible failure that
    // leaves the room evenly lit and the torch pointless. 340px of the stage, so the pool is
    // the same size on screen whatever the window does to the scene scale.
    const beam = doc.createElement('div');
    beam.style.cssText =
      'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.2s ease;' +
      'background:radial-gradient(circle 340px at var(--bx) var(--by), transparent 0%, ' +
      'rgb(4 3 6 / .42) 40%, rgb(4 3 6 / .93) 76%);';
    beam.style.setProperty('--bx', '50%');
    beam.style.setProperty('--by', '50%');

    put(veil);
    put(beam);

    const paint = () => {
      const lit = fx.hasFlag('torch-charged');
      const powered = fx.hasFlag('crane-powered');
      veil.style.opacity = lit ? '0' : '1';
      beam.style.opacity = lit ? (powered ? '0.5' : '1') : '0';
    };
    paint();
    fx.on('flag', paint);

    fx.onFrame(() => {
      const p = fx.pointer();
      if (!p.inside) return;
      beam.style.setProperty('--bx', `${((p.x / SCENE_W) * 100).toFixed(2)}%`);
      beam.style.setProperty('--by', `${((p.y / SCENE_H) * 100).toFixed(2)}%`);
    });

    return () => { veil.remove(); beam.remove(); };
  },
};

// ---------------------------------------------------------------------------------------
// The wall crate slides aside in the scene the moment she moves it in the close-up, so
// backing out lands her on the hatch itself rather than on a wall that has not caught up.
// Watches the puzzle slice, not a flag — there is no flag for "revealed", and inventing one
// would mean an onSolveFlags that fires too late.
// ---------------------------------------------------------------------------------------
const crateEffect = {
  id: 'cargo-crate',
  mount(world, fx) {
    const crate = world.querySelector('#huge-crate');
    if (!crate) return null;

    const paint = () => {
      const slice = fx.state().puzzles['cargo-crane'] || {};
      crate.style.transform = slice.revealed === true ? 'translate(-470px, 0)' : 'translate(0, 0)';
    };
    paint();
    fx.on('*', paint);
    return null;
  },
};

export default {
  id: 'cargo',
  puzzles: [torch, keypad, power, crane],

  // Flag name -> the lines that play when it is set.
  script: {
    'torch-charged': TORCH_LIT,
    'crate-open': [SHARD_1, FUSE_FOUND],
    'crane-powered': POWER_UP,
    'hatch-open': HATCH_OPEN,
  },

  // The canonical solve path for this module. engine/walkthrough.js concatenates it.
  walkthrough: [
    { puzzle: 'cargo-torch', action: 'crank', payload: { turns: 3 } },
    { puzzle: 'cargo-keypad', action: 'digit', payload: { digit: '2' } },
    { puzzle: 'cargo-keypad', action: 'digit', payload: { digit: '9' } },
    { puzzle: 'cargo-keypad', action: 'digit', payload: { digit: '4' } },
    { puzzle: 'cargo-keypad', action: 'digit', payload: { digit: '7' } },
    { puzzle: 'cargo-keypad', action: 'submit' },
    { puzzle: 'cargo-power', action: 'insert' },
    // Each path tile starts one turn clockwise from solved; the straights are symmetric,
    // so they come right in one click and the corners take three.
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 0, col: 0 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 0, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 0, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 0, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 1, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 1, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 1, col: 1 } },
    { puzzle: 'cargo-power', action: 'rotate', payload: { row: 1, col: 2 } },
    { puzzle: 'cargo-crane', action: 'grab' },
    { puzzle: 'cargo-crane', action: 'lift' },
    { puzzle: 'cargo-crane', action: 'move', payload: { dir: 'left' } },
    { puzzle: 'cargo-crane', action: 'drop' },
    { puzzle: 'cargo-crane', action: 'turn', payload: { turns: 2 } },
    // The scripted beat P7 fires from the 'hatch-open' flag in the real game. Repeating it
    // at the head of the greenhouse segment is a no-op, so it is safe either way.
    { flag: 'module', value: 'greenhouse' },
  ],

  hints: HINTS,

  items: {
    fuse: 'Fuse',
    'shard-1': 'Memory shard 1',
  },

  scene: {
    svg: 'assets/cargo.svg',
    intro: OPENING,
    effects: [beamEffect, crateEffect],
    // Reach: mid/front x <= 3400, back x <= 2400. Nothing here rides the back layer.
    hotspots: [
      {
        id: 'cargo-airlock',
        label: 'Shuttle hatch',
        shape: { type: 'rect', x: 70, y: 380, w: 230, h: 470, r: 26 },
        bark: BARKS.airlock,
        sound: 'clunk',
      },
      {
        id: 'cargo-locker',
        label: 'Supply locker',
        shape: { type: 'rect', x: 300, y: 396, w: 286, h: 450, r: 20 },
        puzzle: 'cargo-torch',
      },
      {
        id: 'cargo-note',
        label: 'Sticky note',
        shape: { type: 'rect', x: 622, y: 470, w: 132, h: 122, r: 10 },
        bark: BARKS.note,
      },
      {
        // The rest of the shut locker bay, below the note. Decision 8: every object in the
        // scene answers, and this bay is a big obvious door.
        id: 'cargo-locker-shut',
        label: 'Locked bay',
        shape: { type: 'rect', x: 598, y: 594, w: 158, h: 254, r: 14 },
        bark: BARKS.lockerShut,
        sound: 'clunk',
      },
      {
        id: 'cargo-crates',
        label: 'Crate stacks',
        shape: { type: 'rect', x: 800, y: 470, w: 380, h: 390, r: 18 },
        bark: BARKS.crates,
        sound: 'clunk',
      },
      {
        id: 'cargo-netting',
        label: 'Ceiling netting',
        layer: 'front',
        shape: { type: 'rect', x: 1000, y: 60, w: 700, h: 180, r: 24 },
        bark: BARKS.netting,
      },
      {
        // Listed after the netting so it takes the click where the two overlap.
        id: 'cargo-plush',
        label: 'Unicorn plush',
        layer: 'front',
        shape: { type: 'circle', cx: 1330, cy: 168, r: 78 },
        bark: PLUSH,
        sound: 'squeak',
        sparkle: true,   // one of the six places rainbow is allowed
        enabled: (state) => Boolean(state.flags['torch-charged']),
      },
      {
        id: 'cargo-conduit',
        label: 'Conduit panel',
        shape: { type: 'rect', x: 1250, y: 380, w: 430, h: 380, r: 18 },
        puzzle: 'cargo-power',
      },
      {
        // The whole west block of the crate wall — six crates the art draws and nothing
        // used to answer for. Listed BEFORE the glow paint so the paint wins its own patch
        // once the torch is lit, and this barks there while the room is still dark.
        id: 'cargo-wall-crates',
        label: 'Crate wall',
        shape: { type: 'rect', x: 1795, y: 296, w: 395, h: 570, r: 18 },
        bark: BARKS.wallCrates,
        sound: 'clunk',
      },
      {
        id: 'cargo-glowpaint',
        label: 'Glow paint',
        shape: { type: 'rect', x: 1830, y: 300, w: 320, h: 230, r: 16 },
        bark: BARKS.glowpaint,
        enabled: (state) => Boolean(state.flags['torch-charged']),
      },
      {
        id: 'cargo-crate-locked',
        label: 'Locked crate',
        shape: { type: 'rect', x: 2170, y: 560, w: 320, h: 300, r: 16 },
        puzzle: 'cargo-keypad',
      },
      {
        id: 'cargo-rail',
        label: 'Crane rail',
        layer: 'front',
        shape: { type: 'rect', x: 2450, y: 78, w: 900, h: 96, r: 20 },
        bark: BARKS.rail,
      },
      {
        // The three-crate tower east of the locked crate. Listed BEFORE the crane console
        // so the console keeps the corner where the two shapes meet.
        id: 'cargo-crate-tower',
        label: 'Crate tower',
        shape: { type: 'rect', x: 2490, y: 292, w: 220, h: 574, r: 18 },
        bark: BARKS.crateTower,
        sound: 'clunk',
      },
      {
        id: 'cargo-crane-panel',
        label: 'Crane controls',
        shape: { type: 'rect', x: 2640, y: 520, w: 240, h: 290, r: 16 },
        puzzle: 'cargo-crane',
      },
      {
        id: 'cargo-crate-huge',
        label: 'Enormous crate',
        shape: { type: 'rect', x: 2920, y: 340, w: 420, h: 520, r: 20 },
        puzzle: 'cargo-crane',
        enabled: (state) => state.puzzles['cargo-crane'].revealed !== true,
      },
      {
        // Same patch of wall, once the crate is off it. The caption has to tell the truth.
        id: 'cargo-hatch',
        label: 'Crawl hatch',
        shape: { type: 'rect', x: 2960, y: 500, w: 350, h: 360, r: 24 },
        puzzle: 'cargo-crane',
        enabled: (state) => state.puzzles['cargo-crane'].revealed === true,
      },
    ],
  },
};
