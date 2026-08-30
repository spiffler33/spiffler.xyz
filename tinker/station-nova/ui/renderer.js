// STATION NOVA — renderer: scenes, camera, hotspots, close-ups, PIP, hints, HUD.
//
// This file is GENERIC. It knows nothing about any particular puzzle. Everything specific
// to a module arrives as data on that module's barrel (engine/modules/<id>.js) plus that
// module's bespoke widgets in ui/closeups/<id>.js. P4/P5/P6 never edit this file.
//
// ===========================================================================================
// WHAT A MODULE BARREL DECLARES FOR THE UI
// ===========================================================================================
// The barrel is the one seam. The engine reads `id`, `puzzles` and `script` and ignores
// everything else, so the UI keys hang off the same object — no new imports anywhere.
//
//   // engine/modules/cargo.js
//   import { HINTS, BARKS } from '../script/cargo.js';
//   export default {
//     id: 'cargo',
//     puzzles: [...], script: {...}, walkthrough: [...],   // engine's half (unchanged)
//
//     hints: HINTS,          // { [puzzleId]: [nudge, hint, answer] }  — exactly three strings
//     items: { fuse: 'Fuse', 'shard-1': 'Memory shard' },  // optional inventory labels
//
//     scene: {
//       svg: 'assets/cargo.svg',       // panorama, viewBox="0 0 3600 1000"  (or `markup:` inline)
//       palette: { bg, accent, glow }, // optional — PLAN decision 9 defaults are built in
//       intro: ['line', {speaker,text,pose}],  // optional, played on FIRST arrival.
//                                      //  greenhouse/bridge should use the engine's
//                                      //  script['module:greenhouse'] key instead; only
//                                      //  cargo needs `intro`, since no flag fires for it.
//       hotspots: [ ... ],             // see below
//     },
//   };
//
// ---- The panorama SVG ---------------------------------------------------------------------
//   viewBox="0 0 3600 1000". Three optional top-level groups drive the parallax:
//     <g id="layer-back">   moves at 0.55x  (far wall, starfield, depth)
//     <g id="layer-mid">    moves at 1.00x  (the room — everything interactive lives here)
//     <g id="layer-front">  moves at 1.06x  (near-field decoration: crate corners, pipe edges)
//   Art outside those groups just rides the mid rate.
//
// ---- HOW MUCH OF EACH LAYER THE CAMERA CAN ACTUALLY REACH (read this before placing art) ---
//   The camera pans camX from 0 to (3600 − visW)/1.06, where visW is how many SCENE units of
//   width the window shows:  visW = stageWidthPx / scale,  scale = max(stageH/1000, stageW/3600).
//   A point at scene x on a layer of rate R is on screen when  camX*R ≤ x ≤ camX*R + visW,
//   so the furthest x that layer can EVER show is:
//       front (1.06):  3600                        — the whole panorama, exactly. 0 lost.
//       mid   (1.00):  3396.2 + 0.0566*visW
//       back  (0.55):  1867.9 + 0.4811*visW        — the back layer loses a LOT
//   Measured (visW = w/scale), rounded:
//       1440×813   visW 1771 → mid 3496 (last  104 units unreachable) · back 2720 (last 880)
//       1440×900   visW 1600 → mid 3487 (last  113)                   · back 2638 (last 962)
//       1280×800   visW 1600 → mid 3487 (last  113)                   · back 2638 (last 962)
//       1440×600   visW 2400 → mid 3532 (last   68)                   · back 3023 (last 577)
//   A taller/narrower window shrinks visW and makes mid AND back worse.
//   **SAFE RULE: mid/front hotspot x ≤ 3400 · back hotspot x ≤ 2400.** Keep the far-right
//   ~200 units of mid and the right third of back decorative. The renderer logs a one-time
//   console.warn naming any hotspot that is unreachable at the current window size — but a
//   warning only appears on the size you happened to test at, so honour the rule above.
//
// ---- A hotspot ----------------------------------------------------------------------------
//   {
//     id:      'locker',                        // unique within the module
//     label:   'Supply locker',                 // hover caption; also the accessible name
//     shape:   { type:'rect', x, y, w, h, r? }  // scene units. r = corner radius (default 18)
//            | { type:'circle', cx, cy, r }
//            | { type:'poly', points:[[x,y], ...] },
//     layer:   'mid',                           // 'back' | 'mid' | 'front'. default 'mid'
//     puzzle:  'cargo-torch',                   // optional — click opens that close-up
//     dispatch:{ puzzle, action, payload },     // optional — click dispatches (safely) instead
//     bark:    'That locker has seen things.',  // optional — string or string[]; PIP says it
//     sound:   'clunk',                         // optional — one of the 12 names.
//                                               //   omitted  → 'click', but ONLY when the
//                                               //     hotspot does not dispatch (a dispatching
//                                               //     hotspot's sound belongs to the puzzle's
//                                               //     `emits`, or it double-fires)
//                                               //   false    → silent, always
//     sparkle: true,                            // optional — rainbow burst. REWARD MOMENTS ONLY
//     enabled: (state) => bool,                 // optional — hidden and inert while false.
//                                               //   `state` is game.state; re-read every event
//   }
//   `puzzle` and `dispatch` are mutually exclusive; with both, `puzzle` wins.
//   Every hotspot glints on pointerenter and shows its label — no pixel-hunting, no dead clicks.
//
// ---- scene.effects — per-frame scene behaviour (torch beam, retracting vines, mood light) ---
//   scene.effects: [{ id?: 'torch-beam', mount(world, fx) { …; return () => teardown; } }]
//   Mounted right after the panorama, torn down on module change and on destroy(), exactly as
//   hard as everything else. `world` is the .nv-world div that holds the panorama SVG (append
//   your own <svg>/<div> to it, or reach into the panorama with world.querySelector('#id')).
//
//   fx = {
//     world,                       the same element
//     pointer()   -> { x, y, inside }   LIVE cursor in SCENE units, mid-layer coordinates.
//                                       For another layer add fx.layerOffset(rate) to x.
//                                       `inside` is false while the cursor is off the stage.
//     camera()    -> { x, maxX, scale, visibleWidth }
//     layerOffset(rate) -> number       the shift this layer currently carries
//     flags() hasFlag(name) state() isSolved(id)    — never cache these
//     on(type, fn)      engine events while mounted: 'sound'|'dialogue'|'flag'|'*'
//     onFrame(fn)       fn(dtSeconds) once per rAF frame, dt already clamped. Use this instead
//                       of your own rAF: one loop, and it is cancelled for you at teardown.
//     loadSVG(path)     cached, resolves null, never rejects
//     play(name, opts)  one of the 12 sound names
//   }
//   Both `on` and `onFrame` are dropped for you at teardown; still return a teardown for your
//   own DOM/listeners. A throwing mount is caught and skipped; a throwing frame hook is logged
//   once and dropped, and the game keeps running.
//
// ---- pure-CSS hooks on the world element (no JS effect needed) -----------------------------
//   Every truthy flag becomes a class on .nv-world:  `nv-flag-<name>` for a `true` flag,
//   `nv-flag-<name>-<value>` for a string flag, plus `nv-module-<id>` for the current module.
//   A <style> block INSIDE your panorama SVG is document-scoped, so this works with no JS:
//       <style>#amber-strips { opacity:.15 } .nv-flag-crane-powered #amber-strips { opacity:1 }</style>
//   The live cursor is also published as custom properties on .nv-world, in scene units:
//       --nv-px / --nv-py   (and --nv-cam, the camera x) — enough for a cursor-following
//       radial-gradient mask in pure CSS. They update only while the cursor is over the stage.
//
// ===========================================================================================
// WHAT ui/closeups/<module>.js EXPORTS
// ===========================================================================================
//   export default {
//     'cargo-torch': {
//       title: 'Hand-crank torch',   // optional caption in the overlay header
//       closeOnSolve: true,          // default true — the overlay backs out ~1.6 s after solve.
//                                    // set false when the widget wants to play its own payoff,
//                                    // then call api.close() itself
//       mount(container, api) { ...; return () => { /* teardown */ }; },
//     },
//   };
// The full `api` contract is repeated at the top of each closeups file — that is the copy
// P4/P5/P6 read. See there. Beyond the obvious members it carries:
//    api.dispatchTo(puzzleId, action, payload)   one device driving several puzzle ids
//    api.present({ title, escapable, onClose })  a FULL-SCREEN surface above everything
//                                                (P5's tube ride, P6's certificate)
//
// ===========================================================================================
// HOUSE RULES BAKED IN HERE
// ===========================================================================================
//  * Every dispatch the UI makes goes through ONE safe boundary (createSafeDispatch). The
//    engine is a pure state machine and throws on bad input by design; a throw must never
//    blank the screen or kill the frame loop. This game has no fail states.
//  * dt is clamped everywhere time is pumped — an unclamped first frame yields NaN, which the
//    engine rejects by throwing.
//  * glint fires on pointerenter, never pointermove.
//  * ambient(module) is called here on module change; nothing in ui/audio.js watches for it.
//  * Rainbow (hue sweep) appears only in sparkle() and the solve flourish. Never in chrome.
//  * HINTS ARE READ OFF THE BARREL — `barrel.hints[puzzleId] = [nudge, hint, answer]`. The
//    strings may physically live in engine/script/<module>.js, but the renderer only ever
//    looks at the barrel, so the barrel must re-export them. Nothing here imports script files.
//
// ---- the z stack (one place, so nothing buries anything else) -------------------------------
//    40  hotspot caption
//    50  close-up overlay + panel
//    55  PIP + speech bubble + hint badge · clock · inventory strip
//        DELIBERATELY ABOVE THE OVERLAY: api.say() is the widget feedback channel, PIP is the
//        only way to reach a hint, and picking an item up mid-puzzle is how P4's fuse and P6's
//        shards work. The overlay reserves a bottom band so the panel never sits under them.
//    60  carried-item ghost
//    70  full-screen presentation surface (api.present)
//    75  rainbow ribbon        80  sparkles        90  title screen (index.html)

import { play, ambient } from './audio.js';

export const SCENE_W = 3600;
export const SCENE_H = 1000;
export const LAYER_RATE = Object.freeze({ back: 0.55, mid: 1, front: 1.06 });

const TYPE_CPS = 30;              // speech bubble characters per second (locked decision 8)
export const STUCK_MS = 180000;   // unprompted-nudge dwell (locked decision 8)

// ---- FEEL KNOBS ---------------------------------------------------------------------------
// The whole camera feel is these five numbers. spiff judges it at P9; nudging it should be a
// one-line edit here, never a hunt through the file.
const CAM_EASE = 9;               // how hard the rendered camera chases its goal, per second
const CAM_FRICTION = 4;           // momentum decay, per second. Coast distance = vel/FRICTION
const FLICK_GAIN = 0.55;          // fraction of the release velocity that becomes momentum
export const FLICK_MAX_COAST = 700;  // scene units a flick may coast (~19% of the panorama).
                                     // stepCamera integrates forward-Euler, so the measured
                                     // coast lands a few percent over this: ~722 at 60 fps.
const EDGE_ZONE = 0.11;           // fraction of the stage width that pans on hover
const EDGE_ACCEL = 2600;          // scene units / s^2 at the very edge
// -------------------------------------------------------------------------------------------

const KEY_ACCEL = 3400;
const DRAG_SLOP = 6;              // px of movement that turns a click into a pan
const GLINT_GAP = 140;            // ms between two glints from the same hotspot
const SOLVE_CLOSE_MS = 1600;
const CELEBRATE_MS = 2200;        // how long PIP stays pleased when no line follows a solve

// PLAN decision 9, per module. A barrel's scene.palette overrides any of these.
const PALETTES = {
  cargo: { bg: 'oklch(18% 0.03 60)', accent: 'oklch(75% 0.15 70)', glow: 'oklch(88% 0.09 75)' },
  greenhouse: { bg: 'oklch(20% 0.05 160)', accent: 'oklch(70% 0.15 170)', glow: 'oklch(70% 0.18 320)' },
  bridge: { bg: 'oklch(22% 0.03 250)', accent: 'oklch(80% 0.16 150)', glow: 'oklch(92% 0.02 250)' },
};
const DEFAULT_PALETTE = { bg: 'oklch(16% 0.02 250)', accent: 'oklch(78% 0.12 250)', glow: 'oklch(90% 0.03 250)' };

// ------------------------------------------------------------------------------------------
// Pure helpers. Exported because they are the parts worth testing under bare node.
// ------------------------------------------------------------------------------------------

/** The first-frame guard. `(now - last)/1000` with `last` undefined is NaN, and the engine
 *  rejects a NaN payload by throwing. Anything not a sane frame length becomes 0. */
export function clampDt(dt) {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return dt > 0.1 ? 0.1 : dt;
}

/** How far the camera may travel, in scene units, so the fastest layer stays covered. */
export function maxCameraX(visibleWidth) {
  const span = SCENE_W - Math.max(0, visibleWidth);
  if (!(span > 0)) return 0;
  return span / Math.max(1, LAYER_RATE.front);
}

/** A layer's own horizontal shift, applied INSIDE the panorama on top of the camera. */
export function layerOffset(camX, rate) {
  return camX * (1 - rate);
}

/** The scene-x window a layer can ever show, over the camera's whole travel.
 *  A point at `x` on that layer is visible at some pan iff min <= x <= max.
 *  front reaches 3600 exactly; mid loses ~100 units; BACK LOSES ~880 — see the header. */
export function layerReach(visibleWidth, rate) {
  const visW = Math.max(0, Math.min(SCENE_W, visibleWidth || 0));
  const r = rate || 0;
  const maxX = maxCameraX(visW);
  return { min: 0, max: maxX * r + visW };
}

/** A hotspot shape's horizontal extent in scene units. */
export function shapeXRange(shape) {
  const s = shape || {};
  if (s.type === 'circle') return [s.cx - s.r, s.cx + s.r];
  if (s.type === 'poly') {
    const xs = (s.points || []).map((p) => p[0]);
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0];
  }
  return [s.x, s.x + s.w];
}

/** The hotspots that no pan can ever bring on screen at this window width. Three module
 *  phases are authoring scenes against a camera they cannot see; a back-layer hotspot at
 *  x=3400 is simply never reachable, and nothing else would ever tell them. */
export function unreachableHotspots(list, visibleWidth) {
  const out = [];
  for (const spot of list || []) {
    if (!spot || !spot.shape) continue;
    const rate = LAYER_RATE[spot.layer] === undefined ? LAYER_RATE.mid : LAYER_RATE[spot.layer];
    const reach = layerReach(visibleWidth, rate);
    const [x0, x1] = shapeXRange(spot.shape);
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) continue;
    if (x0 > reach.max) out.push({ id: spot.id, layer: spot.layer || 'mid', x: x0, max: reach.max });
  }
  return out;
}

/** How much of a drag's release velocity survives as momentum. Capped so a hard flick coasts
 *  at most FLICK_MAX_COAST scene units (coast distance = |vel| / CAM_FRICTION), which is what
 *  keeps a pan feeling weighty instead of frictionless. */
export function flickVelocity(raw) {
  if (!Number.isFinite(raw)) return 0;
  const cap = FLICK_MAX_COAST * CAM_FRICTION;
  const v = raw * FLICK_GAIN;
  return Math.max(-cap, Math.min(cap, v));
}

/** One camera step. `cam` is { x, goal, vel, maxX }; the returned object replaces it.
 *  While dragging, the pointer owns `goal` outright; otherwise `goal` coasts on `vel`
 *  (momentum) plus whatever `push` the edge-hover or the arrow keys are applying. The
 *  rendered `x` always eases toward `goal`, which is what gives the pan its weight. */
export function stepCamera(cam, dt, input = {}) {
  const d = clampDt(dt);
  const maxX = Math.max(0, cam.maxX || 0);
  let goal = cam.goal;
  let vel = cam.vel || 0;

  if (input.dragging) {
    goal = input.goal;
    vel = Number.isFinite(input.vel) ? input.vel : 0;
  } else {
    if (Number.isFinite(input.push) && input.push !== 0) vel += input.push * d;
    goal += vel * d;
    vel *= Math.exp(-CAM_FRICTION * d);
    if (Math.abs(vel) < 1) vel = 0;
  }

  if (!Number.isFinite(goal)) goal = cam.x;
  if (goal < 0) { goal = 0; vel = 0; }
  if (goal > maxX) { goal = maxX; vel = 0; }

  const x = cam.x + (goal - cam.x) * (1 - Math.exp(-CAM_EASE * d));
  return { x: Number.isFinite(x) ? x : goal, goal, vel, maxX };
}

/** MM:SS, counting up. */
export function formatClock(ms) {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Which of PIP's lines survive a module change or a hush. The line on screen counts as read
 *  once it has finished typing, so only a line cut off mid-word comes with her; everything
 *  still queued has never been seen at all and always does. `keep` filters further — the
 *  finale uses it to drop the one line its own surface is speaking aloud.
 *  Pure, so the rule that stops a transition eating pinned payload is provable under node. */
export function survivingLines(line, shown, queue = [], keep = () => true) {
  const out = [];
  if (line && shown < line.text.length && keep(line)) out.push(line);
  for (const l of queue) if (keep(l)) out.push(l);
  return out;
}

/** The crawlway's door rule, as a value. PIP's send-off can be two or three lines behind the
 *  flag that opens the hatch, so the door waits for him to stop typing plus a beat to read —
 *  but never past `maxMs`, or a backed-up queue would hold it shut forever. `now` is injected
 *  so the floor, the read beat and the ceiling are all testable without waiting nine seconds. */
export function createDoorWait({ minMs = 0, readMs = 0, maxMs = Infinity, now = Date.now } = {}) {
  const start = now();
  let settledSince = 0;
  return {
    /** `settled` is renderer.dialogueSettled(). True once the door may open. */
    ready(settled) {
      const t = now();
      if (!settled) settledSince = 0;
      else if (!settledSince) settledSince = t;
      const waited = t - start;
      if (waited < minMs) return false;
      if (waited >= maxMs) return true;
      return Boolean(settledSince) && t - settledSince >= readMs;
    },
  };
}

/** Locked decision 8: after 180 s focused on one unsolved puzzle, PIP offers the nudge
 *  unprompted. `now` is injected so this is testable without waiting three minutes. */
export function createStuckTimer({ afterMs = STUCK_MS, now = Date.now } = {}) {
  let current = null;
  let since = 0;
  let fired = false;
  return {
    get current() { return current; },
    /** Point the timer at a puzzle. Re-focusing the same puzzle does not restart it. */
    focus(puzzleId) {
      if (puzzleId === current) return;
      current = puzzleId || null;
      since = now();
      fired = false;
    },
    /** Progress happened — she is not stuck. */
    reset() { since = now(); fired = false; },
    clear() { current = null; fired = false; },
    /** The puzzle id, ONCE, when the dwell has elapsed. null otherwise. */
    due() {
      if (!current || fired) return null;
      if (now() - since < afterMs) return null;
      fired = true;
      return current;
    },
  };
}

/** The safe-dispatch boundary. The engine throws on bad input by design; the UI's job is to
 *  swallow that, log it once, and keep playing. Returns true when the change landed —
 *  including a SubscriberError, which means the change committed and a listener blew up
 *  afterwards, so retrying it would double-apply. */
export function createSafeDispatch(game, onError) {
  const seen = new Set();
  const report = (err, where) => {
    const key = `${where}|${(err && err.message) || String(err)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (onError) onError(err, where);
    else console.warn(`[station-nova] ${where}:`, err);
  };
  return {
    dispatch(puzzleId, action, payload) {
      try {
        game.dispatch(puzzleId, action, payload);
        return true;
      } catch (err) {
        report(err, `dispatch ${puzzleId}.${action}`);
        return err && err.committed === true;
      }
    },
    setFlag(name, value) {
      try {
        game.setFlag(name, value);
        return true;
      } catch (err) {
        report(err, `setFlag ${name}`);
        return err && err.committed === true;
      }
    },
  };
}

// ------------------------------------------------------------------------------------------
// DOM + asset helpers
// ------------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, cls, parent) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (parent) parent.appendChild(node);
  return node;
}

function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const key of Object.keys(attrs || {})) node.setAttribute(key, attrs[key]);
  return node;
}

const svgText = new Map();

/** Fetch an SVG file once and hand back a FRESH detached <svg> each call. Never rejects:
 *  a missing or broken asset resolves to null so a widget degrades instead of dying. */
export function loadSVG(path) {
  if (!svgText.has(path)) {
    const pending = fetch(path)
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);
    svgText.set(path, pending);
  }
  return svgText.get(path).then((text) => {
    if (!text) return null;
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName === 'parsererror' || root.getElementsByTagName('parsererror').length) return null;
    return document.importNode(root, true);
  });
}

function hotspotShape(shape) {
  const s = shape || {};
  if (s.type === 'circle') return svgNode('circle', { cx: s.cx, cy: s.cy, r: s.r });
  if (s.type === 'poly') {
    return svgNode('polygon', { points: (s.points || []).map((p) => `${p[0]},${p[1]}`).join(' ') });
  }
  return svgNode('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: s.r === undefined ? 18 : s.r });
}

function prettyItem(id) {
  return id.split('-').join(' ');
}

// A stand-in panorama so the camera, hotspots and parallax are visible and testable before
// P4/P5/P6 author the real scenes. A barrel with a `scene` never sees this.
function placeholderScene(moduleId, palette) {
  const back = [];
  const mid = [];
  const front = [];
  for (let i = 0; i < 26; i += 1) {
    const x = 40 + i * 138;
    back.push(`<rect x="${x}" y="${180 + (i % 4) * 40}" width="96" height="${420 - (i % 3) * 60}" rx="14" fill="${palette.bg}" opacity="0.75"/>`);
  }
  for (let i = 0; i < 12; i += 1) {
    const x = 120 + i * 296;
    mid.push(`<rect x="${x}" y="${540 + (i % 3) * 34}" width="210" height="${230 + (i % 2) * 60}" rx="20" fill="${palette.accent}" opacity="0.16"/>`);
    mid.push(`<rect x="${x + 16}" y="${556 + (i % 3) * 34}" width="178" height="26" rx="13" fill="${palette.accent}" opacity="0.22"/>`);
  }
  for (let i = 0; i < 7; i += 1) {
    front.push(`<circle cx="${260 + i * 520}" cy="${940}" r="${70 + (i % 3) * 22}" fill="${palette.glow}" opacity="0.08"/>`);
  }
  return {
    markup:
      `<svg xmlns="${SVG_NS}" viewBox="0 0 ${SCENE_W} ${SCENE_H}">` +
      `<rect width="${SCENE_W}" height="${SCENE_H}" fill="${palette.bg}"/>` +
      `<g id="layer-back">${back.join('')}</g>` +
      `<g id="layer-mid"><rect x="0" y="800" width="${SCENE_W}" height="200" fill="${palette.accent}" opacity="0.1"/>${mid.join('')}</g>` +
      `<g id="layer-front">${front.join('')}</g>` +
      '</svg>',
    hotspots: [
      { id: 'placeholder-a', label: `${moduleId}: a crate`, shape: { type: 'rect', x: 420, y: 540, w: 210, h: 260 }, bark: 'A crate. The scene for this module has not been authored yet.' },
      { id: 'placeholder-b', label: `${moduleId}: a light`, shape: { type: 'circle', cx: 2340, cy: 320, r: 120 }, sound: 'chime', bark: 'A light. Pan around — drag, or push the pointer at an edge.' },
    ],
    effects: [beamEffect],
  };
}

// ===========================================================================================
// WORKED EXAMPLE of scene.effects — the cursor-following light mask P4's torch needs.
//
// It is wired into the placeholder scene so it is live in the browser right now: pan the stub
// room and the beam follows the cursor; set the flag it watches and the room lights up. A real
// barrel declares the same shape:  scene: { …, effects: [torchBeam] }.
//
// The two things worth copying: pointer() is polled from onFrame (NOT from a pointermove
// listener) so the beam keeps up while the camera coasts under a still cursor; and the flag it
// cares about is read through fx.hasFlag() on an 'flag' event, never cached.
// ===========================================================================================
const beamEffect = {
  id: 'beam',
  /** @param {HTMLElement} world @param {*} fx */
  mount(world, fx) {
    const mask = document.createElement('div');
    // The scene is 3600x1000 units laid out in a world div of scaled px, so position in %.
    // The radius must be a LENGTH: `circle <pct>` is invalid CSS and computes to `none`, which
    // silently paints nothing at all — the mask disappears rather than erroring.
    mask.style.cssText =
      'position:absolute;inset:0;pointer-events:none;transition:opacity .8s ease;' +
      'background:radial-gradient(circle 340px at var(--bx) var(--by), transparent 0%, ' +
      'rgb(2 4 8 / .55) 45%, rgb(2 4 8 / .93) 78%);';
    mask.style.setProperty('--bx', '50%');
    mask.style.setProperty('--by', '50%');
    world.appendChild(mask);

    const lit = () => fx.hasFlag('lights-on');
    const paint = () => { mask.style.opacity = lit() ? '0' : '1'; };
    paint();
    fx.on('flag', paint);

    fx.onFrame(() => {
      const p = fx.pointer();
      if (!p.inside) return;
      mask.style.setProperty('--bx', `${((p.x / SCENE_W) * 100).toFixed(2)}%`);
      mask.style.setProperty('--by', `${((p.y / SCENE_H) * 100).toFixed(2)}%`);
    });

    return () => mask.remove();
  },
};

// ------------------------------------------------------------------------------------------
// Styles — one sheet, injected once, so no module phase ever edits index.html for chrome.
// ------------------------------------------------------------------------------------------

const STYLE = `
.nv * { box-sizing: border-box; }
.nv-stage {
  position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none;
  background: var(--nv-bg); user-select: none; -webkit-user-select: none;
}
.nv-stage.nv-drag { cursor: grabbing; }
.nv-world { position: absolute; left: 0; top: 0; will-change: transform; transition: filter .3s ease; }
.nv-world > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.nv-hotlayer { pointer-events: none; overflow: visible; }
.nv-hotlayer .nv-hot { pointer-events: all; cursor: pointer; }
.nv-hot > * {
  fill: var(--nv-accent); fill-opacity: 0; stroke: var(--nv-glow); stroke-width: 4;
  stroke-opacity: 0; transition: stroke-opacity .18s ease, fill-opacity .18s ease;
}
.nv-hot > * { animation: nv-idleglint 5.5s ease-in-out infinite; }
.nv-hot:hover > *, .nv-hot.nv-lit > * {
  stroke-opacity: .8; fill-opacity: .12; animation: nv-glint 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 14px var(--nv-glow));
}
.nv-hot.nv-off { display: none; }
@keyframes nv-idleglint { 0%,88%,100% { stroke-opacity: 0 } 94% { stroke-opacity: .16 } }
@keyframes nv-glint { 0%,100% { stroke-opacity: .55 } 50% { stroke-opacity: 1 } }
.nv-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 45%, transparent 40%, rgb(0 0 0 / .55) 100%);
  transition: opacity .3s ease;
}
.nv-stage.nv-dim .nv-world { filter: brightness(.42) saturate(.7); }
.nv-caption {
  position: fixed; z-index: 40; pointer-events: none; padding: 5px 11px; border-radius: 999px;
  font: 500 12.5px/1.2 system-ui, sans-serif; letter-spacing: .02em; white-space: nowrap;
  color: oklch(96% 0.01 250); background: rgb(8 12 20 / .82); border: 1px solid var(--nv-accent);
  box-shadow: 0 6px 22px rgb(0 0 0 / .45); opacity: 0; transform: translate(-50%, -160%) scale(.94);
  transition: opacity .13s ease, transform .13s ease;
}
.nv-caption.nv-on { opacity: 1; transform: translate(-50%, -140%) scale(1); }

/* ---- close-up overlay ----
   The bottom band is reserved: PIP, the speech bubble and the inventory strip sit ABOVE this
   overlay (z 55) so she can reach a hint, read api.say() and pick an item up mid-puzzle. The
   panel is kept out of that band so they overlap the scrim, not the puzzle.
   176px = PIP's 156px + the dock's 14px bottom offset + 6px of air. Keep it >= the dock's
   real height or the panel's bottom-left corner disappears under PIP. */
.nv-overlay {
  position: fixed; inset: 0; z-index: 50; display: none; place-items: center;
  padding: 3vh 3vw calc(3vh + var(--nv-dockband, 176px));
  background: rgb(4 7 13 / .72); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
  opacity: 0; transition: opacity .22s ease;
}
/* The scrim stays mounted for 240 ms after a close so it can fade out, and it keeps
   hit-testing for that whole window. It used to drop out of hit-testing the instant the close
   began, so as not to swallow a click — but then a double-click on the ✕ (140 ms apart, which
   is just how a child clicks) fired whichever hotspot sat behind the ✕ while the scrim was
   still at ~0.9 opacity, and she got a puzzle she never aimed at. The tail of a double-click
   is not a click she meant, and a click she does mean is further away than the fade. A
   backdrop click still cannot leak: pointerdown lands on the scrim and pointerup on the
   scene, so the click event resolves to their common ancestor, never to a hotspot. */
.nv-overlay.nv-shown { display: grid; }
.nv-overlay.nv-on { opacity: 1; }
.nv-closeup {
  width: min(880px, 94vw);
  max-height: min(92vh, calc(100vh - 6vh - var(--nv-dockband, 176px)));
  display: flex; flex-direction: column;
  border-radius: 22px; overflow: hidden; border: 1px solid color-mix(in oklch, var(--nv-accent) 45%, transparent);
  background: linear-gradient(180deg, oklch(24% 0.03 250 / .97), oklch(15% 0.02 250 / .97));
  box-shadow: 0 30px 90px rgb(0 0 0 / .6), inset 0 0 60px color-mix(in oklch, var(--nv-accent) 8%, transparent);
  transform: translate(var(--nv-ox, 0px), var(--nv-oy, 0px)) scale(.35); opacity: 0;
  transition: transform .3s cubic-bezier(.2,.9,.25,1), opacity .22s ease;
}
.nv-overlay.nv-on .nv-closeup { transform: none; opacity: 1; }
.nv-closeup.nv-shake { animation: nv-shake .42s ease; }
@keyframes nv-shake {
  0%,100% { transform: translateX(0) } 15% { transform: translateX(-9px) }
  32% { transform: translateX(8px) } 50% { transform: translateX(-6px) }
  68% { transform: translateX(4px) } 85% { transform: translateX(-2px) }
}
.nv-shake-el { animation: nv-shake .42s ease; }
.nv-closeup-head {
  display: flex; align-items: center; gap: 12px; padding: 13px 16px;
  border-bottom: 1px solid color-mix(in oklch, var(--nv-accent) 22%, transparent);
}
.nv-closeup-title {
  flex: 1; margin: 0; font: 600 11px/1.3 system-ui, sans-serif; letter-spacing: .22em;
  text-transform: uppercase; color: var(--nv-accent);
}
.nv-x {
  width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font: 600 17px/1 system-ui, sans-serif;
  color: oklch(94% 0.01 250); background: rgb(255 255 255 / .06);
  border: 1px solid color-mix(in oklch, var(--nv-accent) 35%, transparent);
  transition: background .15s ease, transform .12s ease;
}
.nv-x:hover { background: rgb(255 255 255 / .14); }
.nv-x:active { transform: scale(.92); }
.nv-closeup-body { padding: 18px; overflow: auto; flex: 1; min-height: 0; }
.nv-stub { padding: 30px; text-align: center; color: oklch(72% 0.02 250); font: 400 14px/1.6 system-ui, sans-serif; }

/* ---- PIP + dialogue ----
   The dock is a 582x156 flex box pinned to the bottom-left corner, and most of it is empty
   air around PIP and a bubble that is usually invisible. Left hit-testable it swallows every
   click in that corner — a hotspot panned under it is simply dead, measured at 0/9 reachable.
   So the box is transparent to the pointer and the three things that must stay clickable opt
   back in: PIP (the entire hint system), his hint badge (inside the button), and the bubble
   while it is actually on screen (click-to-skip). */
.nv-dock { position: fixed; left: 18px; bottom: 14px; z-index: 55; display: flex; align-items: flex-end; gap: 12px; pointer-events: none; }
.nv-pip { position: relative; width: 136px; height: 156px; flex: none; cursor: pointer; background: none; border: 0; padding: 0; pointer-events: auto; }
.nv-pip svg { width: 100%; height: 100%; display: block; overflow: visible; }
.nv-pip #pip-float { animation: nv-bob 3.4s ease-in-out infinite; transform-origin: 100px 120px; }
.nv-pip.nv-talk #pip-float { animation: nv-bob 1.5s ease-in-out infinite; }
.nv-pip.nv-talk #pip-mouth { animation: nv-yap .26s steps(2, end) infinite; transform-origin: 100px 86px; }
.nv-pip.nv-talk #pip-antenna-bulb { animation: nv-blip .5s ease-in-out infinite; transform-origin: 100px 20px; }
.nv-pip.nv-celebrate #pip-float { animation: nv-hop .6s cubic-bezier(.3,1.4,.5,1) 2; transform-origin: 100px 200px; }
.nv-pip.nv-celebrate #pip-eye-l, .nv-pip.nv-celebrate #pip-eye-r { transform: scaleY(.42); transform-box: fill-box; transform-origin: center; }
.nv-pip.nv-bounce { animation: nv-bounce .55s cubic-bezier(.3,1.5,.5,1) 3; }
.nv-pip:active { transform: scale(.97); }
@keyframes nv-bob { 0%,100% { transform: translateY(0) rotate(-1deg) } 50% { transform: translateY(-7px) rotate(1deg) } }
@keyframes nv-yap { 0% { transform: scaleY(.4) } 100% { transform: scaleY(1.25) } }
@keyframes nv-blip { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
@keyframes nv-hop { 0% { transform: translateY(0) } 45% { transform: translateY(-26px) rotate(8deg) } 100% { transform: translateY(0) } }
@keyframes nv-bounce { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-16px) } }
.nv-hintbadge {
  position: absolute; right: 2px; top: 6px; width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center; font: 700 14px/1 system-ui, sans-serif; color: oklch(18% 0.03 250);
  background: var(--nv-glow); box-shadow: 0 0 0 3px rgb(8 12 20 / .7), 0 0 16px var(--nv-glow);
  opacity: 0; transform: scale(.5); transition: opacity .25s ease, transform .25s cubic-bezier(.3,1.5,.5,1);
}
.nv-pip.nv-canhint .nv-hintbadge { opacity: 1; transform: scale(1); animation: nv-pulse 2.6s ease-in-out infinite; }
@keyframes nv-pulse { 0%,100% { box-shadow: 0 0 0 3px rgb(8 12 20 / .7), 0 0 10px var(--nv-glow) } 50% { box-shadow: 0 0 0 3px rgb(8 12 20 / .7), 0 0 26px var(--nv-glow) } }
/* The shard counter (setPipBadge). Deliberately quiet: a small plate low on PIP's left, the
   opposite corner from the hint badge, so it reads as part of him and never competes. */
.nv-pipbadge {
  position: absolute; left: 0; bottom: 8px; padding: 3px 8px; border-radius: 999px;
  font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em;
  color: oklch(92% 0.02 250); background: rgb(8 12 20 / .78);
  border: 1px solid color-mix(in oklch, var(--nv-accent) 45%, transparent);
  opacity: 0; transform: translateY(4px); transition: opacity .35s ease, transform .35s ease;
}
.nv-pipbadge.nv-on { opacity: 1; transform: none; }
.nv-bubble {
  position: relative; max-width: min(560px, 58vw); margin-bottom: 34px; padding: 14px 18px;
  border-radius: 18px 18px 18px 4px; cursor: pointer;
  font: 400 16px/1.5 system-ui, sans-serif; color: oklch(96% 0.01 250);
  background: linear-gradient(180deg, oklch(28% 0.03 250 / .96), oklch(19% 0.02 250 / .96));
  border: 1px solid color-mix(in oklch, var(--nv-glow) 40%, transparent);
  box-shadow: 0 14px 40px rgb(0 0 0 / .5);
  opacity: 0; transform: translateY(10px) scale(.96); pointer-events: none;
  transition: opacity .2s ease, transform .2s cubic-bezier(.2,.9,.25,1);
}
.nv-bubble.nv-on { opacity: 1; transform: none; pointer-events: all; }
.nv-speaker { display: none; margin-bottom: 7px; font: 700 10px/1 system-ui, sans-serif;
  letter-spacing: .24em; text-transform: uppercase; color: var(--nv-accent); }
.nv-bubble.nv-other .nv-speaker { display: block; }
.nv-bubble.nv-other { border-color: var(--nv-accent); border-radius: 18px; }
.nv-caret { display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px;
  background: var(--nv-glow); animation: nv-caret .7s steps(1) infinite; }
@keyframes nv-caret { 0%,50% { opacity: 1 } 51%,100% { opacity: 0 } }

/* ---- HUD ---- */
.nv-hud { position: fixed; right: 16px; top: 14px; z-index: 55; display: flex; gap: 8px; align-items: center; }
.nv-clock {
  padding: 6px 12px; border-radius: 999px; font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .14em; color: oklch(88% 0.02 250); background: rgb(8 12 20 / .55);
  border: 1px solid color-mix(in oklch, var(--nv-accent) 28%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.nv-savewarn {
  padding: 6px 12px; border-radius: 999px; cursor: default;
  font: 500 11px/1 system-ui, sans-serif; letter-spacing: .1em; color: oklch(82% 0.07 70);
  background: rgb(8 12 20 / .55); border: 1px solid oklch(60% 0.09 70 / .55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.nv-savewarn[hidden] { display: none; }
.nv-inv { position: fixed; right: 16px; bottom: 16px; z-index: 55; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 42vw; }
.nv-item {
  display: flex; align-items: center; gap: 7px; padding: 7px 13px 7px 9px; border-radius: 999px; cursor: pointer;
  font: 500 12px/1 system-ui, sans-serif; letter-spacing: .04em; color: oklch(92% 0.02 250);
  background: rgb(8 12 20 / .62); border: 1px solid color-mix(in oklch, var(--nv-accent) 30%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  transition: border-color .15s ease, transform .12s ease, background .15s ease;
  animation: nv-itemin .4s cubic-bezier(.2,1.3,.4,1);
}
@keyframes nv-itemin { from { opacity: 0; transform: translateY(12px) scale(.9) } }
.nv-item:hover { border-color: var(--nv-accent); transform: translateY(-2px); }
.nv-item.nv-held { border-color: var(--nv-glow); background: color-mix(in oklch, var(--nv-glow) 20%, rgb(8 12 20 / .7)); }
.nv-item i { width: 9px; height: 9px; border-radius: 50%; background: var(--nv-accent); box-shadow: 0 0 10px var(--nv-accent); }
.nv-ghost {
  position: fixed; z-index: 60; pointer-events: none; padding: 6px 12px; border-radius: 999px;
  font: 500 12px/1 system-ui, sans-serif; color: oklch(96% 0.01 250); background: rgb(8 12 20 / .85);
  border: 1px solid var(--nv-glow); box-shadow: 0 0 22px var(--nv-glow);
  transform: translate(-50%, -50%); display: none;
}

/* ---- full-screen presentation surface (api.present): tube ride, certificate ----
   Visible the moment it exists: the fade-in is an ANIMATION, not a class flipped from inside
   a double requestAnimationFrame. Chrome freezes a background tab after ~5 minutes and runs
   no frames in it, so the rAF version left a fully TRANSPARENT surface sitting over a
   normal-looking room, eating every click until the tab thawed.
   And a surface on its way out must not take a click either: .nv-off carries
   pointer-events:none for the whole 480 ms fade, which is where the dead-click window after
   every close came from. */
.nv-present {
  position: fixed; inset: 0; z-index: 70; background: var(--nv-bg);
  transition: opacity .45s ease; animation: nv-presentin .45s ease;
}
.nv-present.nv-off { opacity: 0; pointer-events: none; }
@keyframes nv-presentin { from { opacity: 0 } }
.nv-present-body { position: relative; width: 100%; height: 100%; overflow: hidden; }

/* ---- reward-only rainbow ---- */
.nv-spark { position: fixed; z-index: 80; width: 9px; height: 9px; border-radius: 50%; pointer-events: none;
  background: currentColor; box-shadow: 0 0 12px currentColor; }
.nv-ribbon {
  position: fixed; left: 0; right: 0; top: 0; height: 4px; z-index: 75; pointer-events: none; opacity: 0;
  background: linear-gradient(90deg, #ff5f6d, #ffc371, #6ee7b7, #67e8f9, #a78bfa, #f472b6, #ff5f6d);
  background-size: 300% 100%;
}
.nv-ribbon.nv-on { animation: nv-ribbon 1.5s ease-in-out; }
@keyframes nv-ribbon {
  0% { opacity: 0; background-position: 0% 0 } 18% { opacity: 1 }
  75% { opacity: 1 } 100% { opacity: 0; background-position: 220% 0 }
}
@media (prefers-reduced-motion: reduce) {
  .nv-pip #pip-float, .nv-hot > *, .nv-hintbadge { animation: none !important; }
}
`;

function injectStyle() {
  if (document.getElementById('nv-style')) return;
  const tag = document.createElement('style');
  tag.id = 'nv-style';
  tag.textContent = STYLE;
  document.head.appendChild(tag);
}

// ------------------------------------------------------------------------------------------
// The renderer
// ------------------------------------------------------------------------------------------

/**
 * createRenderer({ game, modules, closeups, mounts, now, onError, restored })
 *   game     — from createGame()
 *   modules  — the barrel array (engine/walkthrough.js exports MODULES)
 *   closeups — { cargo: <ui/closeups/cargo.js default>, greenhouse: …, bridge: … }
 *   mounts   — { scene, overlay, dialogue, hud } DOM elements
 *   now      — injectable clock (ms). Defaults to Date.now. Used by the stuck timer and clock.
 *   restored — true when the game came back from a save. Suppresses the arrival intro of the
 *              module she resumes into: Continue must not replay the opening dialogue.
 *   onItemUse(name) — optional. Called when an inventory chip is clicked. Return true to say
 *              "handled" and suppress the normal pick-up-and-carry; anything else falls
 *              through to carrying. P7's star chart is readable from the strip in any module
 *              this way, and the renderer still knows nothing about any particular item.
 */
export function createRenderer({ game, modules = [], closeups = {}, mounts, now = Date.now, onError, restored = false, onItemUse } = {}) {
  injectStyle();

  // Deduped exactly like createSafeDispatch: a hotspot whose enabled() throws would otherwise
  // warn on every engine event for the whole session, which is a P8 gate ("no console.error
  // paths in normal play") losing to noise.
  const reported = new Set();
  const report = (err, where) => {
    const key = `${where}|${(err && err.message) || String(err)}`;
    if (reported.has(key)) return;
    reported.add(key);
    if (onError) onError(err, where);
    else console.warn(`[station-nova] ${where}:`, err);
  };
  const safe = createSafeDispatch(game, report);

  // Audio is cosmetic and must never be able to swallow the functional half of an
  // interaction. play() is documented as never throwing, but a click that silently fails to
  // open its puzzle because a WebAudio node objected is exactly the worst outcome in this
  // build, so every sound the renderer makes goes through the same one-line boundary.
  const sfx = (name, opts) => { try { play(name, opts); } catch (err) { report(err, `play ${name}`); } };
  const bed = (moduleId) => { try { ambient(moduleId); } catch (err) { report(err, `ambient ${moduleId}`); } };

  const byId = new Map();
  const hints = new Map();
  const itemLabels = new Map();
  for (const mod of modules) {
    if (!mod || !mod.id) continue;
    byId.set(mod.id, mod);
    for (const [id, tiers] of Object.entries(mod.hints || {})) hints.set(id, tiers);
    for (const [id, label] of Object.entries(mod.items || {})) itemLabels.set(id, label);
  }

  // ---- shell -----------------------------------------------------------------------------
  const root = mounts.scene;
  root.classList.add('nv');
  const stage = el('div', 'nv-stage', root);
  const world = el('div', 'nv-world', stage);
  el('div', 'nv-vignette', stage);
  const caption = el('div', 'nv-caption', document.body);

  const overlayHost = mounts.overlay;
  overlayHost.classList.add('nv');
  const overlay = el('div', 'nv-overlay', overlayHost);
  const closeup = el('div', 'nv-closeup', overlay);
  const head = el('div', 'nv-closeup-head', closeup);
  const closeupTitle = el('h2', 'nv-closeup-title', head);
  const closeBtn = el('button', 'nv-x', head);
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Back out');
  const closeupBody = el('div', 'nv-closeup-body', closeup);

  const dock = el('div', 'nv-dock', mounts.dialogue);
  mounts.dialogue.classList.add('nv');
  const bubble = el('div', 'nv-bubble', dock);
  const speakerEl = el('div', 'nv-speaker', bubble);
  const bubbleText = el('span', '', bubble);
  const caret = el('span', 'nv-caret', bubble);
  const pipBtn = el('button', 'nv-pip', dock);
  pipBtn.type = 'button';
  pipBtn.setAttribute('aria-label', 'PIP — click for a hint');
  const hintBadge = el('div', 'nv-hintbadge', pipBtn);
  hintBadge.textContent = '?';
  const pipBadge = el('div', 'nv-pipbadge', pipBtn);
  dock.insertBefore(pipBtn, bubble);
  // PIP on the left, bubble to its right and above.
  dock.style.alignItems = 'flex-end';

  mounts.hud.classList.add('nv');
  const hud = el('div', 'nv-hud', mounts.hud);
  // Owner doctrine: a backup that is not happening must be VISIBLE. Quiet, not scary — this
  // game has no fail states and a lost save is not one either; she just cannot Continue later.
  const saveWarn = el('div', 'nv-savewarn', hud);
  saveWarn.hidden = true;
  saveWarn.textContent = 'saving is off';
  saveWarn.title = 'This browser will not store progress (private window, or storage is full). '
    + 'The game plays fine — but Continue will not be there next time.';
  const clockEl = el('div', 'nv-clock', hud);
  clockEl.textContent = '00:00';
  const inv = el('div', 'nv-inv', mounts.hud);
  const ghost = el('div', 'nv-ghost', document.body);
  const ribbon = el('div', 'nv-ribbon', document.body);

  loadSVG('assets/pip.svg').then((node) => {
    if (node) pipBtn.insertBefore(node, hintBadge);
    else pipBtn.insertBefore(fallbackPip(), hintBadge);
  });

  function fallbackPip() {
    const s = svgNode('svg', { viewBox: '0 0 200 230' });
    const g = svgNode('g', { id: 'pip-float' });
    g.appendChild(svgNode('circle', { cx: 100, cy: 120, r: 62, fill: '#c3ceda' }));
    g.appendChild(svgNode('circle', { cx: 100, cy: 112, r: 34, fill: '#232c3c' }));
    s.appendChild(g);
    return s;
  }

  // ---- camera ----------------------------------------------------------------------------
  let cam = { x: 0, goal: 0, vel: 0, maxX: 0 };
  let scale = 1;
  let push = 0;
  let dragging = false;
  let dragStartClient = 0;
  let dragStartGoal = 0;
  let dragDist = 0;
  let dragVel = 0;
  let suppressClick = false;
  let lastMoveX = 0;
  let lastMoveT = 0;
  let keyPush = 0;
  let worldTop = 0;
  let visibleWidth = SCENE_W;
  let stageRect = { left: 0, top: 0, width: 0, height: 0 };

  function layout() {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    scale = Math.max(h / SCENE_H, w / SCENE_W);
    const worldW = SCENE_W * scale;
    const worldH = SCENE_H * scale;
    world.style.width = `${worldW}px`;
    world.style.height = `${worldH}px`;
    worldTop = (h - worldH) / 2;
    world.style.top = `${worldTop}px`;
    visibleWidth = w / scale;
    stageRect = stage.getBoundingClientRect();
    cam.maxX = maxCameraX(visibleWidth);
    if (cam.goal > cam.maxX) cam.goal = cam.maxX;
    if (cam.x > cam.maxX) cam.x = cam.maxX;
    paintCamera();
    warnUnreachable();
  }

  // The cursor, in mid-layer SCENE units. Stored as client px and converted on demand, so it
  // stays correct while the camera coasts under a stationary cursor.
  const ptr = { cx: 0, cy: 0, inside: false };
  function scenePointer() {
    return {
      x: cam.x + (ptr.cx - stageRect.left) / scale,
      y: (ptr.cy - stageRect.top - worldTop) / scale,
      inside: ptr.inside,
    };
  }

  let panoLayers = { back: null, front: null };
  let hotLayers = { back: null, front: null };

  function paintCamera() {
    world.style.transform = `translate3d(${-cam.x * scale}px,0,0)`;
    const dBack = layerOffset(cam.x, LAYER_RATE.back);
    const dFront = layerOffset(cam.x, LAYER_RATE.front);
    if (panoLayers.back) panoLayers.back.setAttribute('transform', `translate(${dBack} 0)`);
    if (panoLayers.front) panoLayers.front.setAttribute('transform', `translate(${dFront} 0)`);
    if (hotLayers.back) hotLayers.back.setAttribute('transform', `translate(${dBack} 0)`);
    if (hotLayers.front) hotLayers.front.setAttribute('transform', `translate(${dFront} 0)`);
  }

  // No setPointerCapture: a captured pointer retargets the follow-up `click` at the capture
  // element in some engines, which would swallow every hotspot click. Window listeners for
  // the drag lifetime do the same job and also survive the pointer leaving the stage.
  function onDragMove(e) {
    ptr.cx = e.clientX;
    ptr.cy = e.clientY;
    ptr.inside = true;
    const moved = e.clientX - dragStartClient;
    dragDist = Math.max(dragDist, Math.abs(moved));
    cam.goal = dragStartGoal - moved / scale;
    const t = now();
    const dt = clampDt((t - lastMoveT) / 1000);
    if (dt > 0) {
      const v = -((e.clientX - lastMoveX) / scale) / dt;
      dragVel = dragVel * 0.6 + v * 0.4;            // EMA: the throw velocity on release
    }
    lastMoveX = e.clientX;
    lastMoveT = t;
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('nv-drag');
    // A pan must not also count as a click — but the verdict has to expire, or a click that
    // never went through the stage's pointerdown (keyboard activation, a press that started
    // on another element) would stay dead for the rest of the session.
    suppressClick = dragDist > DRAG_SLOP;
    if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
    cam.vel = flickVelocity(dragVel);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || openPuzzle) return;
    dragging = true;
    dragDist = 0;
    dragVel = 0;
    dragStartClient = e.clientX;
    dragStartGoal = cam.goal;
    lastMoveX = e.clientX;
    lastMoveT = now();
    stage.classList.add('nv-drag');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  });

  stage.addEventListener('pointermove', (e) => {
    ptr.cx = e.clientX;
    ptr.cy = e.clientY;
    ptr.inside = true;
    if (dragging) return;
    const rect = stage.getBoundingClientRect();
    const f = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
    if (f < EDGE_ZONE) push = -EDGE_ACCEL * (1 - f / EDGE_ZONE);
    else if (f > 1 - EDGE_ZONE) push = EDGE_ACCEL * (1 - (1 - f) / EDGE_ZONE);
    else push = 0;
    if (captionOn) moveCaption(e.clientX, e.clientY);
  });

  stage.addEventListener('pointerleave', () => { push = 0; ptr.inside = false; hideCaption(); });

  // The carried-item ghost follows the pointer everywhere, overlay included.
  function onGhostMove(e) { if (ghostHeld) moveGhost(e.clientX, e.clientY); }
  window.addEventListener('pointermove', onGhostMove);

  // ---- caption ---------------------------------------------------------------------------
  let captionOn = false;
  function showCaption(text, x, y) {
    caption.textContent = text;
    caption.classList.add('nv-on');
    captionOn = true;
    moveCaption(x, y);
  }
  function moveCaption(x, y) {
    caption.style.left = `${x}px`;
    caption.style.top = `${y}px`;
  }
  function hideCaption() {
    caption.classList.remove('nv-on');
    captionOn = false;
  }

  // ---- dialogue --------------------------------------------------------------------------
  const queue = [];
  let line = null;      // { text, pose, speaker }
  let shown = 0;        // characters revealed
  let holdUntil = 0;

  let celebrateTimer = null;

  function setPose(pose) {
    pipBtn.classList.toggle('nv-talk', pose === 'talk');
    pipBtn.classList.toggle('nv-celebrate', pose === 'celebrate');
  }

  /** A solve whose flag has no script line leaves nothing to say, and the pose used to stick
   *  for the rest of the session — PIP squinting happily at nothing. Any line that arrives
   *  first sets its own pose, so this only fires when the celebration really is over. */
  function celebrate() {
    setPose('celebrate');
    if (celebrateTimer) clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      celebrateTimer = null;
      if (!line) setPose('idle');
    }, CELEBRATE_MS);
  }

  /** Drop everything queued and stop mid-line. Used on a module change: lines from the room
   *  she just left must not keep typing themselves out in the new one. */
  function clearDialogue() {
    queue.length = 0;
    line = null;
    shown = 0;
    holdUntil = 0;
    bubbleText.textContent = '';
    bubble.classList.remove('nv-on');
    setPose('idle');
  }

  /** Keep only the lines `keep` accepts (default: everything unread) and drop the rest. A
   *  module change used to call clearDialogue() outright: on the canonical path the queue is
   *  empty and that cost nothing, but under any stress it destroyed pinned payload — the
   *  greenhouse's send-off frozen half-typed under the tube ride, or the tail of a backed-up
   *  queue at the crawlway's ceiling. A line she has already read still goes. */
  function reduceDialogue(keep) {
    const rest = survivingLines(line, shown, queue, keep);
    clearDialogue();
    for (const l of rest) queue.push(l);
    if (queue.length) nextLine();
  }

  /** `speaker` defaults to 'pip'. Anything else — P6's Taklu voice logs, a crew recording —
   *  is captioned with the speaker's name and does NOT move PIP's mouth: he is listening
   *  too. The engine's dialogue events already carry the field; this is where it lands. */
  function say(text, opts) {
    if (typeof text !== 'string' || !text) return;
    queue.push({
      text,
      pose: (opts && opts.pose) || 'talk',
      speaker: (opts && opts.speaker) || 'pip',
    });
    if (!line) nextLine();
  }

  function sayOne(l, opts) {
    if (typeof l === 'string') say(l, opts);
    else if (l && typeof l.text === 'string') {
      say(l.text, {
        pose: l.pose || (opts && opts.pose),
        speaker: l.speaker || (opts && opts.speaker),
      });
    }
  }

  function sayAll(lines, opts) {
    if (Array.isArray(lines)) lines.forEach((l) => sayOne(l, opts));
    else sayOne(lines, opts);
  }

  function nextLine() {
    line = queue.shift() || null;
    shown = 0;
    if (!line) {
      bubble.classList.remove('nv-on');
      setPose('idle');
      return;
    }
    bubbleText.textContent = '';
    caret.style.display = '';
    bubble.classList.add('nv-on');
    const other = line.speaker !== 'pip';
    bubble.classList.toggle('nv-other', other);
    speakerEl.textContent = other ? line.speaker : '';
    setPose(other ? 'idle' : line.pose);
  }

  function completeLine() {
    if (!line) return;
    shown = line.text.length;
    bubbleText.textContent = line.text;
    caret.style.display = 'none';
    holdUntil = now() + Math.min(6000, 1100 + line.text.length * 42);
  }

  function tickTyping(dt) {
    if (!line) return;
    // A full-screen present surface (z70) is opaque and sits over the bubble (z55), so a line
    // typed out behind it is burned: she never sees a character of it. The bubble therefore
    // WAITS while a surface is up. That is what lets P7 swap the module underneath the tube
    // ride — the bridge's arrival lines are still unread when the ride lifts — instead of
    // spending them on an audience of nobody. Pushing holdUntil along with the pause is what
    // makes it a real pause: a line that had finished typing before the surface went up is
    // still on screen to read afterwards, instead of expiring behind it.
    if (presentHost) { holdUntil = now() + 1200; return; }
    if (shown < line.text.length) {
      shown = Math.min(line.text.length, shown + dt * TYPE_CPS);
      bubbleText.textContent = line.text.slice(0, Math.floor(shown));
      if (shown >= line.text.length) completeLine();
      return;
    }
    if (queue.length && now() >= holdUntil) nextLine();
    else if (!queue.length && now() >= holdUntil + 1400) nextLine();
  }

  bubble.addEventListener('click', advance);
  function advance() {
    if (!line) return;
    if (shown < line.text.length) completeLine();
    else nextLine();
  }

  // ---- hints -----------------------------------------------------------------------------
  const stuck = createStuckTimer({ now });
  const tier = new Map();
  let focusPuzzle = null;

  /** The puzzle PIP will talk about. Explicit focus (she opened a close-up) wins; otherwise
   *  the first unsolved puzzle of this module that HAS hints. Without this fallback, clicking
   *  PIP on arrival in a room does nothing and the 180 s stuck timer never starts — which is
   *  exactly the player the mechanism exists for: the one who cannot find the first puzzle. */
  function firstUnsolved() {
    const mod = byId.get(mountedModule);
    const list = (mod && mod.puzzles) || [];
    let anyUnsolved = null;
    for (const p of list) {
      const id = p && p.id;
      if (!id || game.isSolved(id)) continue;
      if (anyUnsolved === null) anyUnsolved = id;
      if (hints.has(id)) return id;
    }
    return anyUnsolved;
  }

  function effectiveFocus() {
    if (focusPuzzle && !game.isSolved(focusPuzzle)) return focusPuzzle;
    return firstUnsolved();
  }

  /** Point the stuck timer and the badge at whatever is currently in play. Safe to call on
   *  every event: re-focusing the same puzzle does not restart the dwell. */
  function syncFocus() {
    const id = effectiveFocus();
    if (id) stuck.focus(id);
    else stuck.clear();
    refreshHintBadge();
  }

  function setFocus(puzzleId) {
    focusPuzzle = puzzleId || null;
    syncFocus();
  }

  function refreshHintBadge() {
    const id = effectiveFocus();
    pipBtn.classList.toggle('nv-canhint', Boolean(id && hints.get(id)));
  }

  function speakHint(atLeast) {
    const id = effectiveFocus();
    const tiers = id && hints.get(id);
    if (!tiers || !tiers.length) return false;
    const next = Math.max(atLeast || 0, Math.min(tiers.length, (tier.get(id) || 0) + 1));
    tier.set(id, next);
    say(tiers[next - 1], { pose: 'talk' });
    sfx('chime');
    return true;
  }

  pipBtn.addEventListener('click', () => {
    if (line && shown < line.text.length) { advance(); return; }
    if (speakHint(0)) return;
    sfx('chime');
    pipBtn.classList.remove('nv-bounce');
    void pipBtn.offsetWidth;
    pipBtn.classList.add('nv-bounce');
  });

  function tickStuck() {
    const due = stuck.due();
    if (!due || due !== effectiveFocus()) return;
    if (game.isSolved(due)) return;
    pipBtn.classList.remove('nv-bounce');
    void pipBtn.offsetWidth;
    pipBtn.classList.add('nv-bounce');
    speakHint(1);
  }

  // ---- inventory -------------------------------------------------------------------------
  let held = null;
  let ghostHeld = false;
  let invSignature = '';
  const chips = new Map();

  function moveGhost(x, y) {
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  }

  function setHeld(name) {
    held = name || null;
    ghostHeld = Boolean(held);
    ghost.style.display = held ? 'block' : 'none';
    if (held) ghost.textContent = itemLabels.get(held) || prettyItem(held);
    paintHeld();
  }

  function paintHeld() {
    for (const [name, chip] of chips) chip.classList.toggle('nv-held', name === held);
  }

  // Rebuild only when the inventory itself changed — picking an item up must not re-run the
  // pop-in animation on every other chip.
  function paintInventory(force) {
    const items = game.state.inventory;
    const sig = items.join('|');
    if (!force && sig === invSignature) return;
    invSignature = sig;
    inv.textContent = '';
    chips.clear();
    for (const name of items) {
      const chip = el('button', 'nv-item', inv);
      chip.type = 'button';
      el('i', '', chip);
      el('span', '', chip).textContent = itemLabels.get(name) || prettyItem(name);
      chip.addEventListener('click', () => {
        sfx('click');
        if (onItemUse) {
          let handled = false;
          try { handled = onItemUse(name) === true; }
          catch (err) { report(err, `item ${name}`); }
          if (handled) return;
        }
        setHeld(held === name ? null : name);
      });
      chips.set(name, chip);
    }
    paintHeld();
  }

  // ---- reward flourishes -----------------------------------------------------------------
  function sparkle(x, y) {
    const hues = [0, 42, 96, 168, 214, 276, 320];
    for (let i = 0; i < 14; i += 1) {
      const dot = el('div', 'nv-spark', document.body);
      dot.style.color = `oklch(78% 0.2 ${hues[i % hues.length]})`;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const d = 46 + Math.random() * 74;
      dot.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 620 + Math.random() * 320, easing: 'cubic-bezier(.2,.8,.3,1)' },
      ).onfinish = () => dot.remove();
    }
  }

  function flourish() {
    ribbon.classList.remove('nv-on');
    void ribbon.offsetWidth;
    ribbon.classList.add('nv-on');
  }

  function shake(node) {
    const target = node || closeup;
    target.classList.remove('nv-shake', 'nv-shake-el');
    void target.offsetWidth;
    target.classList.add(target === closeup ? 'nv-shake' : 'nv-shake-el');
  }

  // ---- close-up overlay ------------------------------------------------------------------
  let openPuzzle = null;
  let unmountWidget = null;
  let widgetSubs = [];
  let closeTimer = null;
  let closeOnSolve = true;
  let openFrame = 0;

  function openCloseup(puzzleId, originX, originY) {
    if (openPuzzle === puzzleId) return;
    closeCloseup();
    const entry = (closeups[game.state.module] || {})[puzzleId];
    openPuzzle = puzzleId;
    closeOnSolve = !entry || entry.closeOnSolve !== false;
    closeupTitle.textContent = (entry && entry.title) || puzzleId;
    closeupBody.textContent = '';

    const rect = stage.getBoundingClientRect();
    closeup.style.setProperty('--nv-ox', `${(originX || rect.width / 2) - rect.width / 2}px`);
    closeup.style.setProperty('--nv-oy', `${(originY || rect.height / 2) - rect.height / 2}px`);

    overlay.classList.add('nv-shown');
    stage.classList.add('nv-dim');
    // Two frames: the first flushes `display: grid` so the scale-in actually transitions. The
    // handle is kept so a close inside those two frames can cancel it — otherwise nv-on lands
    // on an overlay that is already fading out, and the overlay is left resting with nv-on and
    // nothing open, which kills the scale-in on the NEXT open.
    if (openFrame) cancelAnimationFrame(openFrame);
    openFrame = requestAnimationFrame(() => {
      openFrame = requestAnimationFrame(() => { openFrame = 0; overlay.classList.add('nv-on'); });
    });
    sfx('whoosh');
    setFocus(puzzleId);

    if (entry && typeof entry.mount === 'function') {
      try {
        const off = entry.mount(closeupBody, makeApi(puzzleId));
        unmountWidget = typeof off === 'function' ? off : null;
      } catch (err) {
        report(err, `closeup ${puzzleId}.mount`);
        stubBody(puzzleId, 'This close-up hit a snag. Backing out is safe — nothing was lost.');
      }
    } else {
      stubBody(puzzleId, 'This close-up has not been built yet.');
    }
  }

  function stubBody(puzzleId, note) {
    closeupBody.textContent = '';
    const box = el('div', 'nv-stub', closeupBody);
    el('div', '', box).textContent = puzzleId;
    el('div', '', box).textContent = note;
  }

  function closeCloseup() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (!openPuzzle) return;
    for (const off of widgetSubs) { try { off(); } catch (err) { report(err, 'widget unsubscribe'); } }
    widgetSubs = [];
    if (unmountWidget) { try { unmountWidget(); } catch (err) { report(err, `closeup ${openPuzzle}.unmount`); } }
    unmountWidget = null;
    openPuzzle = null;
    // Focus is deliberately NOT cleared here. Backing out of an unsolved puzzle to go look
    // for a clue is the commonest thing she will do, and PIP staying ready to help with the
    // thing she was just working on is the point of the hint badge. Focus moves when she
    // opens another close-up, and clears on solve or on a module change.
    if (openFrame) { cancelAnimationFrame(openFrame); openFrame = 0; }
    overlay.classList.remove('nv-on');
    stage.classList.remove('nv-dim');
    setTimeout(() => { if (!openPuzzle) overlay.classList.remove('nv-shown'); }, 240);
    sfx('click');
  }

  closeBtn.addEventListener('click', closeCloseup);
  overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) closeCloseup(); });

  // The `api` handed to every close-up widget. Documented in full in ui/closeups/*.js.
  function makeApi(puzzleId) {
    return {
      puzzleId,
      getState: () => game.state.puzzles[puzzleId],
      isSolved: () => game.isSolved(puzzleId),
      flags: () => game.state.flags,
      inventory: () => game.state.inventory,
      hasItem: (name) => game.state.inventory.includes(name),
      held: () => held,
      useHeld: () => { const h = held; setHeld(null); return h; },
      // Deliberately does NOT reset the stuck timer. Locked decision 8 measures 180 s
      // "focused on one unsolved puzzle", not 180 s of not touching it — otherwise a player
      // happily mashing wrong keypad codes for five minutes postpones her own hint forever.
      dispatch: (action, payload) => safe.dispatch(puzzleId, action, payload),
      // One device, several puzzle ids — P6's terminal drives bridge-boot / -password /
      // -course / -launch from a single mounted widget without losing its scrollback.
      // Same never-throws guarantee as dispatch().
      dispatchTo: (id, action, payload) => safe.dispatch(id, action, payload),
      present: (opts) => present(opts),
      on: (type, fn) => {
        const off = game.subscribe((e) => {
          try { if (type === '*' || (e && e.type === type)) fn(e); }
          catch (err) { report(err, `widget listener ${puzzleId}`); }
        });
        widgetSubs.push(off);
        return off;
      },
      play: (name, opts) => sfx(name, opts),
      say: (text, opts) => say(text, opts),
      shake: (node) => shake(node),
      sparkle: (x, y) => sparkle(x, y),
      loadSVG: (path) => loadSVG(path),
      close: () => closeCloseup(),
    };
  }

  // ---- full-screen presentation surface --------------------------------------------------
  // A close-up is min(880px, 94vw) x 92vh — no home for P5's 6-second tube ride or P6's
  // certificate. This is that home: one full-screen layer above the whole game (z 70), torn
  // down by destroy() like everything else. A module change does NOT close it, deliberately:
  // the tube ride plays across the greenhouse -> bridge transition.
  let presentHost = null;
  let presentOnClose = null;
  let presentEscapable = true;

  /** present({ title, escapable = true, onClose }) -> { el, close }
   *  `el` is an empty full-bleed div — build the ride/certificate into it. Only one surface
   *  exists at a time; opening a second closes the first. Draw your own back/again button and
   *  call handle.close(); Esc also closes unless escapable is false. */
  function present(opts = {}) {
    closePresentation();
    const host = el('div', 'nv-present', document.body);
    if (opts.title) host.setAttribute('aria-label', opts.title);
    const body = el('div', 'nv-present-body', host);
    presentHost = host;
    presentOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
    presentEscapable = opts.escapable !== false;
    return { el: body, close: () => closePresentation() };
  }

  function closePresentation(immediate) {
    if (!presentHost) return;
    const host = presentHost;
    const cb = presentOnClose;
    presentHost = null;
    presentOnClose = null;
    host.classList.add('nv-off');   // fades AND stops taking clicks, in the same frame
    if (immediate === true) host.remove();
    else setTimeout(() => host.remove(), 480);
    if (cb) { try { cb(); } catch (err) { report(err, 'present onClose'); } }
  }

  // ---- scene mount -----------------------------------------------------------------------
  let hotspotNodes = [];
  let mountedModule = null;
  let destroyed = false;
  const introPlayed = new Set();
  let resumeMount = Boolean(restored);   // true only for the module a save resumes into

  // ---- scene effects (scene.effects) -------------------------------------------------------
  let effectOffs = [];     // teardown fns returned by each effect's mount
  let effectSubs = [];     // engine subscriptions taken out by effects
  let frameHooks = [];     // fx.onFrame callbacks

  function makeSceneApi(effectId) {
    return {
      world,
      pointer: scenePointer,
      camera: () => ({ x: cam.x, maxX: cam.maxX, scale, visibleWidth }),
      layerOffset: (rate) => layerOffset(cam.x, rate),
      flags: () => game.state.flags,
      hasFlag: (name) => game.hasFlag(name),
      state: () => game.state,
      isSolved: (id) => game.isSolved(id),
      on: (type, fn) => {
        const off = game.subscribe((e) => {
          try { if (type === '*' || (e && e.type === type)) fn(e); }
          catch (err) { report(err, `effect listener ${effectId}`); }
        });
        effectSubs.push(off);
        return off;
      },
      onFrame: (fn) => {
        const hook = { id: effectId, fn };
        frameHooks.push(hook);
        return () => { frameHooks = frameHooks.filter((h) => h !== hook); };
      },
      loadSVG: (path) => loadSVG(path),
      play: (name, opts) => sfx(name, opts),
    };
  }

  function mountEffects(list) {
    (list || []).forEach((effect, i) => {
      if (!effect || typeof effect.mount !== 'function') return;
      const id = effect.id || `effect-${i}`;
      try {
        const off = effect.mount(world, makeSceneApi(id));
        if (typeof off === 'function') effectOffs.push(off);
      } catch (err) {
        report(err, `effect ${id}.mount`);
      }
    });
  }

  function unmountEffects() {
    for (const off of effectSubs) { try { off(); } catch (err) { report(err, 'effect unsubscribe'); } }
    effectSubs = [];
    frameHooks = [];
    for (const off of effectOffs) { try { off(); } catch (err) { report(err, 'effect teardown'); } }
    effectOffs = [];
  }

  function tickEffects(dt) {
    if (!frameHooks.length) return;
    for (const hook of frameHooks.slice()) {
      try { hook.fn(dt); }
      catch (err) {
        report(err, `effect frame ${hook.id}`);
        frameHooks = frameHooks.filter((h) => h !== hook);   // logged once, then dropped
      }
    }
  }

  // Flag-driven classes + the live cursor as custom properties, both on .nv-world, so a scene
  // SVG can restyle itself in pure CSS with no effect at all. See the header.
  let flagClasses = [];
  function applyFlagClasses() {
    const flags = game.state.flags;
    const next = [`nv-module-${game.state.module}`];
    for (const [name, value] of Object.entries(flags)) {
      if (value === true) next.push(`nv-flag-${name}`);
      else if (typeof value === 'string' && value) next.push(`nv-flag-${name}-${value}`);
    }
    for (const cls of flagClasses) if (!next.includes(cls)) safeClass(cls, false);
    for (const cls of next) if (!flagClasses.includes(cls)) safeClass(cls, true);
    flagClasses = next;
  }

  function safeClass(cls, on) {
    // A flag name with a space in it is not a legal class token; classList would throw.
    try { world.classList.toggle(cls, on); } catch (err) { report(err, `flag class ${cls}`); }
  }

  let cursorVarX = null;
  let cursorVarY = null;
  function publishCursorVars() {
    if (!ptr.inside) return;
    const p = scenePointer();
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (x === cursorVarX && y === cursorVarY) return;
    cursorVarX = x;
    cursorVarY = y;
    world.style.setProperty('--nv-px', String(x));
    world.style.setProperty('--nv-py', String(y));
    world.style.setProperty('--nv-cam', String(Math.round(cam.x)));
  }

  // Three module phases are authoring 3600-unit scenes against a camera they cannot see. A
  // back-layer hotspot past ~2400 is unreachable at every pan and nothing else would say so.
  const warnedSpots = new Set();
  function warnUnreachable() {
    if (!visibleWidth || !hotspotNodes.length) return;
    const bad = unreachableHotspots(hotspotNodes.map((h) => h.spot), visibleWidth);
    for (const b of bad) {
      const key = `${mountedModule}/${b.id}`;
      if (warnedSpots.has(key)) continue;
      warnedSpots.add(key);
      report(
        new Error(`hotspot "${b.id}" (layer ${b.layer}) starts at x=${Math.round(b.x)}, but this `
          + `window can only pan the ${b.layer} layer out to x=${Math.round(b.max)} — it is `
          + 'unreachable at every pan offset. Safe rule: mid/front x <= 3400, back x <= 2400.'),
        `scene ${mountedModule}`,
      );
    }
  }

  function palette(mod) {
    const p = { ...(PALETTES[mod && mod.id] || DEFAULT_PALETTE), ...((mod && mod.scene && mod.scene.palette) || {}) };
    return p;
  }

  function applyPalette(p) {
    root.style.setProperty('--nv-bg', p.bg);
    root.style.setProperty('--nv-accent', p.accent);
    root.style.setProperty('--nv-glow', p.glow);
    for (const host of [overlayHost, mounts.dialogue, mounts.hud, document.body]) {
      host.style.setProperty('--nv-bg', p.bg);
      host.style.setProperty('--nv-accent', p.accent);
      host.style.setProperty('--nv-glow', p.glow);
    }
  }

  function mountModule(moduleId) {
    if (mountedModule === moduleId) return;
    mountedModule = moduleId;
    closeCloseup();
    onDragEnd();          // a pointer held through the door must not pan the room behind it
    unmountEffects();
    reduceDialogue();     // she keeps what she has not read; a finished line stays behind
    setHeld(null);        // and a carried item's ghost must not follow her through the door
    setFocus(null);

    const mod = byId.get(moduleId);
    const isResume = resumeMount;   // only the FIRST module mounted is the resumed-into one
    resumeMount = false;
    const p = palette(mod);
    applyPalette(p);
    const scene = (mod && mod.scene) || placeholderScene(moduleId, p);

    world.textContent = '';
    panoLayers = { back: null, front: null };
    hotLayers = { back: null, front: null };
    hotspotNodes = [];
    cam = { x: 0, goal: 0, vel: 0, maxX: cam.maxX };

    const install = (node) => {
      // She moved on — or the renderer was torn down — while the asset was still loading.
      if (destroyed || mountedModule !== moduleId) return;
      const pano = node || parseMarkup(scene.markup) || parseMarkup(placeholderScene(moduleId, p).markup);
      if (pano) {
        pano.removeAttribute('width');
        pano.removeAttribute('height');
        if (!pano.getAttribute('viewBox')) pano.setAttribute('viewBox', `0 0 ${SCENE_W} ${SCENE_H}`);
        pano.classList.add('nv-pano');
        world.appendChild(pano);
        panoLayers.back = pano.querySelector('#layer-back');
        panoLayers.front = pano.querySelector('#layer-front');
      }
      buildHotspots(scene.hotspots || []);
      applyFlagClasses();
      mountEffects(scene.effects);
      layout();
      refreshHotspots();
      syncFocus();          // PIP is ready to help the moment she arrives, before any click
      if (scene.intro && !introPlayed.has(moduleId) && !skipIntro(mod, isResume)) {
        introPlayed.add(moduleId);
        sayAll(scene.intro);
      }
      // Sound last: it is the cosmetic half, and nothing above may depend on it.
      bed(moduleId);
      sfx('whoosh');
    };

    if (scene.svg) loadSVG(scene.svg).then(install).catch(() => install(null));
    else install(null);
  }

  /** The arrival intro is a FIRST-arrival beat. Continue-ing into a mid-cargo save used to
   *  replay the whole opening — she is already there, and PIP re-introducing himself is the
   *  most obviously broken thing the renderer could do. Two guards: this is the module a
   *  restored save resumed into, or the module already has a solved puzzle. */
  function skipIntro(mod, isResume) {
    if (isResume) return true;
    const list = (mod && mod.puzzles) || [];
    return list.some((p) => p && p.id && game.isSolved(p.id));
  }

  function parseMarkup(markup) {
    if (!markup) return null;
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const node = doc.documentElement;
    if (!node || node.nodeName === 'parsererror' || node.getElementsByTagName('parsererror').length) return null;
    return document.importNode(node, true);
  }

  function buildHotspots(list) {
    const svg = svgNode('svg', { viewBox: `0 0 ${SCENE_W} ${SCENE_H}`, class: 'nv-hotlayer' });
    const groups = {
      back: svgNode('g', {}),
      mid: svgNode('g', {}),
      front: svgNode('g', {}),
    };
    svg.appendChild(groups.back);
    svg.appendChild(groups.mid);
    svg.appendChild(groups.front);
    hotLayers = { back: groups.back, front: groups.front };
    world.appendChild(svg);

    list.forEach((spot, i) => {
      if (!spot || !spot.id) return;
      const g = svgNode('g', { class: 'nv-hot', 'aria-label': spot.label || spot.id });
      const shape = hotspotShape(spot.shape);
      // A NEGATIVE delay so the idle shimmer starts staggered instead of every hotspot
      // blinking in unison — and so the hover pulse is never held back by a delay.
      shape.style.animationDelay = `-${((i * 1.3) % 5.5).toFixed(2)}s`;
      g.appendChild(shape);
      (groups[spot.layer] || groups.mid).appendChild(g);
      wireHotspot(g, spot);
      hotspotNodes.push({ node: g, spot });
    });
  }

  function wireHotspot(node, spot) {
    let lastGlint = 0;
    node.addEventListener('pointerenter', (e) => {
      // pointerenter, NEVER pointermove: per-move firing stacks a voice per pixel.
      const t = now();
      if (t - lastGlint > GLINT_GAP) { lastGlint = t; sfx('glint'); }
      showCaption(spot.label || spot.id, e.clientX, e.clientY);
    });
    node.addEventListener('pointerleave', hideCaption);
    const dispatches = Boolean(!spot.puzzle && spot.dispatch && spot.dispatch.puzzle);
    node.addEventListener('click', (e) => {
      if (suppressClick) return;           // that was a pan, not a click
      hideCaption();
      // Sound ownership, one rule: `false` is genuinely silent; a named sound always plays;
      // otherwise the default 'click' plays ONLY for a hotspot that does not dispatch — a
      // dispatching hotspot's sound belongs to the puzzle's `emits`, and playing both is the
      // double-fire the P2 review routed forward.
      if (spot.sound === false) { /* silent, on purpose */ }
      else if (spot.sound) sfx(spot.sound);
      else if (!dispatches) sfx('click');
      if (spot.sparkle) sparkle(e.clientX, e.clientY);
      if (spot.bark) sayAll(spot.bark);
      if (spot.puzzle) {
        const rect = stage.getBoundingClientRect();
        openCloseup(spot.puzzle, e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      if (dispatches) {
        const d = spot.dispatch;
        safe.dispatch(d.puzzle, d.action, d.payload);
      }
    });
  }

  function refreshHotspots() {
    const state = game.state;
    for (const { node, spot } of hotspotNodes) {
      let on = true;
      if (typeof spot.enabled === 'function') {
        try { on = Boolean(spot.enabled(state)); }
        catch (err) { report(err, `hotspot ${spot.id}.enabled`); on = true; }
      }
      node.classList.toggle('nv-off', !on);
    }
  }

  // ---- engine subscription ---------------------------------------------------------------
  const unsubscribe = game.subscribe((event) => {
    // A throwing subscriber becomes SubscriberError at whoever dispatched. Never leak.
    try {
      if (!event) return;
      if (event.type === 'dialogue') {
        say(event.text, { pose: event.pose, speaker: event.speaker });
      } else if (event.type === 'sound') {
        // 'wrong' names no puzzle either, but only one close-up is ever open, and a 'wrong'
        // while it is open effectively always came from it. Shaking is harmless either way.
        if (event.name === 'wrong' && openPuzzle) shake(closeup);
        if (event.name === 'solve') {
          celebrate();
          flourish();
          // A 'solve' event names no puzzle, so check the latch: some OTHER puzzle solving
          // (P7's glue dispatches while a close-up is open) must not back her out of this one.
          if (openPuzzle && closeOnSolve && game.isSolved(openPuzzle)) {
            const id = openPuzzle;
            closeTimer = setTimeout(() => { if (openPuzzle === id) closeCloseup(); }, SOLVE_CLOSE_MS);
          }
        }
      } else if (event.type === 'flag') {
        if (event.name === 'module') mountModule(event.value);
      }
      // Every event, not just flag events: a hotspot's `enabled` may read a puzzle slice, and
      // a dispatch that only emits a sound still changed that slice.
      refreshHotspots();
      applyFlagClasses();
      // Not just the badge: a solve retargets the hint (and the 180 s dwell) at the next
      // unsolved puzzle in this module.
      syncFocus();
      paintInventory(false);
    } catch (err) {
      report(err, 'renderer subscriber');
    }
  });

  // ---- keyboard --------------------------------------------------------------------------
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (presentHost && presentEscapable) { closePresentation(); e.preventDefault(); return; }
      if (openPuzzle) { closeCloseup(); e.preventDefault(); return; }
      if (held) { setHeld(null); e.preventDefault(); }
      return;
    }
    if (openPuzzle || presentHost) return;   // the widget owns the keyboard while it is open
    if (e.key === 'ArrowLeft') keyPush = -KEY_ACCEL;
    else if (e.key === 'ArrowRight') keyPush = KEY_ACCEL;
    else return;
    e.preventDefault();
  }
  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') keyPush = 0;
  }
  // A keyup that never comes: Cmd-Tab away mid-pan and the camera keeps accelerating into the
  // right-hand wall, so she comes back to a room scrolled hard right and still drifting.
  function releaseKeys() { keyPush = 0; push = 0; ptr.inside = false; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseKeys);
  document.addEventListener('visibilitychange', releaseKeys);

  const resizeObs = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
  if (resizeObs) resizeObs.observe(stage);
  else window.addEventListener('resize', layout);

  // ---- frame loop ------------------------------------------------------------------------
  let raf = 0;
  let lastFrame = 0;
  let clockStart = 0;
  let clockStopped = false;
  let clockStopAt = 0;
  let clockShown = '';

  function frame(t) {
    raf = requestAnimationFrame(frame);   // re-armed FIRST: nothing below can kill the loop
    try {
      const dt = lastFrame ? clampDt((t - lastFrame) / 1000) : 0;
      lastFrame = t;
      cam = stepCamera(cam, dt, {
        dragging,
        goal: cam.goal,
        vel: dragVel,
        push: openPuzzle ? 0 : push + keyPush,
      });
      paintCamera();
      publishCursorVars();
      tickEffects(dt);
      tickTyping(dt);
      tickStuck();
      if (clockStart && !clockStopped) {
        const text = formatClock(now() - clockStart);
        if (text !== clockShown) { clockShown = text; clockEl.textContent = text; }
      }
    } catch (err) {
      report(err, 'frame');
    }
  }

  return {
    /** Mount the current module and start the frame loop. */
    start() {
      if (!raf) raf = requestAnimationFrame(frame);
      layout();
      mountModule(game.state.module);
      paintInventory(true);
      if (!clockStart) clockStart = now();
    },
    /** The count-up clock (locked decision 8). It starts with the game — the click that
     *  dismissed the title — and P7's glue stops it on WIN, before the ~12 s finale runs.
     *  elapsed() has to honour that stop or the certificate prints the launch sequence into
     *  her time.
     *  `fromMs` is the time she has already played: the save carries it, so a game finished
     *  across two sittings prints both on the certificate instead of only the second. */
    startClock(fromMs) {
      const carried = Number.isFinite(fromMs) && fromMs > 0 ? fromMs : 0;
      clockStart = now() - carried;
      clockStopped = false;
      clockStopAt = 0;
    },
    stopClock() {
      if (!clockStopped) { clockStopped = true; clockStopAt = now(); }
      const total = clockStart ? clockStopAt - clockStart : 0;
      // The frame loop stops painting a stopped clock, so paint the final number here —
      // otherwise a finished game resumed from a save shows an empty HUD clock.
      const text = formatClock(total);
      if (text !== clockShown) { clockShown = text; clockEl.textContent = text; }
      return total;
    },
    elapsed() {
      if (!clockStart) return 0;
      return (clockStopped ? clockStopAt : now()) - clockStart;
    },
    /** True when PIP is saying nothing and nothing is open over the scene — the gate P7's
     *  idle barks wait on, so he never talks over a puzzle line or into a close-up. */
    isIdle() { return !line && !queue.length && !openPuzzle && !presentHost; },
    /** True when PIP has finished TYPING everything he has to say — the line may still be on
     *  screen being read. P7's crawlway waits on this: the hatch flag can land behind two or
     *  three lines she has not read yet, and a transition that eats them is a transition that
     *  eats PIP's send-off. Weaker than isIdle() on purpose — waiting for the bubble to clear
     *  as well would hold the door shut for another five seconds. */
    dialogueSettled() { return !queue.length && (!line || shown >= line.text.length); },
    /** Drop what PIP has queued, but only while a full-screen surface is up and speaking for
     *  itself. The finale captions its own lines onto the z70 sheet, including the one the
     *  engine also queues into the bubble; since the bubble now WAITS under a surface instead
     *  of burning its lines, that copy would otherwise be sitting there when she comes back
     *  from the certificate. Self-guarding: with no surface up this does nothing.
     *  `texts` are the exact lines the surface owns — everything else PIP still has to say
     *  survives, because she may have asked for a hint one click before she typed
     *  `launch confirm`. Omit it and the whole queue goes, which is the blunt version. */
    hushUnderPresentation(texts) {
      if (!presentHost) return false;
      if (texts === undefined) { clearDialogue(); return true; }
      const own = new Set(Array.isArray(texts) ? texts : [texts]);
      reduceDialogue((l) => !own.has(l.text));
      return true;
    },
    /** The shard counter (P7). `text` empty hides it; `label` is the accessible/hover text. */
    setPipBadge(text, label) {
      const on = Boolean(text);
      pipBadge.textContent = on ? String(text) : '';
      pipBadge.title = on ? String(label || text) : '';
      pipBadge.classList.toggle('nv-on', on);
    },
    /** The in-app "saving is off" marker (owner doctrine: a backup that is not happening must
     *  be visible). index.html wires this to attachAutosave's status callback. */
    setSaveWarning(on) { saveWarn.hidden = !on; },
    /** Escape hatches P7's transition glue needs; no module phase uses these. */
    say,
    sparkle,
    present,
    closePresentation,
    openCloseup,
    closeCloseup,
    setFocus,
    dispatch: safe.dispatch,
    setFlag: safe.setFlag,
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (celebrateTimer) { clearTimeout(celebrateTimer); celebrateTimer = null; }
      closeCloseup();
      closePresentation(true);
      unmountEffects();
      onDragEnd();
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseKeys);
      document.removeEventListener('visibilitychange', releaseKeys);
      window.removeEventListener('pointermove', onGhostMove);
      if (resizeObs) resizeObs.disconnect();
      else window.removeEventListener('resize', layout);
      caption.remove();
      ghost.remove();
      ribbon.remove();
      root.textContent = '';
      overlayHost.textContent = '';
      mounts.dialogue.textContent = '';
      mounts.hud.textContent = '';
    },
  };
}
