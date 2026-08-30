// STATION NOVA — the BRIDGE barrel.  (P6 owns this file.)
//
// The one seam between this module and everything else. `createGame` reads only id / puzzles /
// script; ui/renderer.js reads hints / items / scene off the same object, so the UI's half
// rides here without a single new import anywhere.
//
// Nothing in this file touches a browser global: the scene effect below is handed the elements
// it works on, so engine/ still runs under bare node.

import boot from '../puzzles/bridge-boot.js';
import password from '../puzzles/bridge-password.js';
import course from '../puzzles/bridge-course.js';
import memory from '../puzzles/bridge-memory.js';
import launch from '../puzzles/bridge-launch.js';
import {
  HINTS, LOG_4, MEMORY_LINES, PIP,
  CASE_LABEL, STICKY_NOTE, PHOTO_CAPTION,
} from '../script/bridge.js';

// Taklu's portrait slides aside on the bridge-memory slice, and the shard behind it leaves the
// wall when she takes it. Neither is a flag, so the renderer's automatic .nv-flag-* classes
// cannot express them and this small effect does.
// assets/bridge.svg styles `.nvb-portrait-open #br-portrait-frame` and `.nvb-shard-taken #br-shard3`.
const portraitEffect = {
  id: 'bridge-portrait',
  mount(world, fx) {
    const paint = () => {
      const slice = fx.state().puzzles['bridge-memory'] || {};
      world.classList.toggle('nvb-portrait-open', Boolean(slice.portraitOpen));
      world.classList.toggle('nvb-shard-taken', Boolean(slice.taken));
    };
    paint();
    fx.on('*', paint);
    return () => world.classList.remove('nvb-portrait-open', 'nvb-shard-taken');
  },
};

/** The shard on the wall is only there between `slide` and `take`. */
const shardShowing = (state) => {
  const slice = state.puzzles['bridge-memory'] || {};
  return slice.portraitOpen === true && slice.taken !== true;
};

export default {
  id: 'bridge',
  puzzles: [boot, password, course, memory, launch],

  // flag name -> the lines that play when it is set. Everything [pinned] is verbatim.
  script: {
    'module:bridge': PIP.arrival,
    'bridge-online': PIP.online,
    'nav-unlocked': PIP.navOpen,
    'course-locked': PIP.coursePlotted,
    'memory-restored': [
      MEMORY_LINES[0],
      MEMORY_LINES[1],
      { speaker: LOG_4.speaker, text: LOG_4.text },
    ],
    WIN: PIP.win,
  },

  hints: HINTS,

  scene: {
    svg: 'assets/bridge.svg',
    palette: {
      bg: 'oklch(22% 0.03 250)',
      accent: 'oklch(80% 0.16 150)',
      glow: 'oklch(92% 0.02 250)',
    },
    // No `intro`: the bridge is arrived at via a flag, so its opening lines live on the
    // engine script key 'module:bridge' above.
    effects: [portraitEffect],
    hotspots: [
      {
        id: 'window',
        label: 'Forward window',
        shape: { type: 'rect', x: 1000, y: 165, w: 1360, h: 280 },
        bark: PIP.window,
        sound: 'chime',
      },
      {
        id: 'crew-station',
        label: 'Crew station',
        shape: { type: 'rect', x: 140, y: 570, w: 460, h: 280 },
        bark: PIP.crewStation,
      },
      {
        id: 'sticky-note',
        label: 'Sticky note',
        shape: { type: 'rect', x: 250, y: 450, w: 142, h: 112 },
        bark: { speaker: 'Sticky note', text: STICKY_NOTE },
      },
      {
        // Tall enough to include its own plinth: the glass ends at y 744, the base at 872.
        id: 'display-case',
        label: 'Display case',
        shape: { type: 'rect', x: 700, y: 430, w: 200, h: 445 },
        bark: { speaker: 'Display case', text: CASE_LABEL },
        sound: 'glint',
      },
      {
        id: 'nav-display',
        label: 'Nav display',
        shape: { type: 'rect', x: 1200, y: 494, w: 192, h: 176 },
        bark: PIP.navDisplay,
      },
      {
        id: 'terminal',
        label: "Captain's console",
        shape: { type: 'rect', x: 1410, y: 458, w: 500, h: 220 },
        puzzle: 'bridge-boot',
      },
      {
        id: 'console-desk',
        label: 'Console desk',
        shape: { type: 'rect', x: 1180, y: 690, w: 1150, h: 130 },
        bark: PIP.consoleDesk,
      },
      {
        id: 'photo',
        label: 'Framed photo',
        shape: { type: 'rect', x: 1952, y: 542, w: 176, h: 140 },
        bark: { speaker: 'Framed photo', text: PHOTO_CAPTION },
      },
      {
        id: 'launch-board',
        label: 'Launch board',
        shape: { type: 'rect', x: 2474, y: 414, w: 392, h: 354 },
        puzzle: 'bridge-launch',
      },
      {
        // Dispatches, so its sound belongs to bridge-memory's `emits` — no `sound` key here.
        id: 'portrait',
        label: 'Commander Taklu',
        shape: { type: 'rect', x: 2942, y: 164, w: 316, h: 400 },
        dispatch: { puzzle: 'bridge-memory', action: 'slide' },
      },
      {
        // Declared AFTER the portrait so it paints — and so hit-tests — on top of it: the
        // shard art sits entirely inside the portrait's rect, and without this her click on
        // the glowing shard would just re-read the plaque. Hidden until the portrait moves,
        // gone again once it is hers. Dispatches, so bridge-memory's `emits` owns the sound.
        id: 'shard3',
        label: 'Memory shard',
        shape: { type: 'rect', x: 3030, y: 292, w: 144, h: 144 },
        dispatch: { puzzle: 'bridge-memory', action: 'take' },
        enabled: shardShowing,
        sparkle: true,
      },
      {
        id: 'pip-dock',
        label: "PIP's charging dock",
        shape: { type: 'rect', x: 2976, y: 592, w: 288, h: 276 },
        puzzle: 'bridge-memory',
      },
      {
        // Front layer, so it wins over the desk where they meet. The pinned sticky note gives
        // her this chair; clicking it must say something.
        id: 'captains-chair',
        label: "Captain's chair",
        layer: 'front',
        shape: { type: 'rect', x: 1560, y: 820, w: 336, h: 175 },
        bark: PIP.captainsChair,
      },
    ],
  },

  // The canonical solve path for this module. engine/walkthrough.js concatenates the three
  // segments; `charted` arrives from the greenhouse's star-chart segment before this runs.
  walkthrough: [
    { puzzle: 'bridge-boot', action: 'dock' },
    { puzzle: 'bridge-boot', action: 'help' },
    { puzzle: 'bridge-boot', action: 'scan' },

    { puzzle: 'bridge-password', action: 'playLog', payload: { n: 1 } },
    { puzzle: 'bridge-password', action: 'playLog', payload: { n: 2 } },
    { puzzle: 'bridge-password', action: 'playLog', payload: { n: 3 } },
    { puzzle: 'bridge-password', action: 'unlock', payload: { password: 'TAKLU' } },

    { puzzle: 'bridge-course', action: 'open' },
    { puzzle: 'bridge-course', action: 'plot', payload: { order: ['whale'] } },
    { puzzle: 'bridge-course', action: 'plot', payload: { order: ['whale', 'comb'] } },
    { puzzle: 'bridge-course', action: 'plot', payload: { order: ['whale', 'comb', 'unicorn'] } },

    { puzzle: 'bridge-memory', action: 'slide' },
    { puzzle: 'bridge-memory', action: 'take' },
    { puzzle: 'bridge-memory', action: 'insert', payload: { slot: 0, wave: 'triangle' } },
    { puzzle: 'bridge-memory', action: 'insert', payload: { slot: 1, wave: 'sine' } },
    { puzzle: 'bridge-memory', action: 'insert', payload: { slot: 2, wave: 'square' } },

    { puzzle: 'bridge-launch', action: 'cover', payload: { i: 0 } },
    { puzzle: 'bridge-launch', action: 'cover', payload: { i: 1 } },
    { puzzle: 'bridge-launch', action: 'cover', payload: { i: 2 } },
    { puzzle: 'bridge-launch', action: 'cover', payload: { i: 3 } },
    { puzzle: 'bridge-launch', action: 'flip', payload: { i: 0 } },
    { puzzle: 'bridge-launch', action: 'flip', payload: { i: 1 } },
    { puzzle: 'bridge-launch', action: 'flip', payload: { i: 2 } },
    { puzzle: 'bridge-launch', action: 'flip', payload: { i: 3 } },
    { puzzle: 'bridge-launch', action: 'throttle', payload: { value: 100 } },
    { puzzle: 'bridge-launch', action: 'confirm' },
  ],
};
