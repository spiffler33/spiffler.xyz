// STATION NOVA — bespoke close-up widgets for the CARGO BAY module.  (P4 owns this file.)
//
// ui/renderer.js is generic and never learns about a specific puzzle. Everything that needs
// custom interaction — a crank you drag in circles, a keypad, a rotatable conduit grid,
// arrow-button crane controls — lives here. P4 never edits ui/renderer.js.
//
// ===========================================================================================
// SHAPE OF THIS FILE
// ===========================================================================================
//   export default {
//     '<puzzle-id>': {
//       title: 'Hand-crank torch',   // optional caption in the overlay header
//       closeOnSolve: true,          // default true: the overlay backs out ~1.6 s after the
//                                    // solve arpeggio. Set false when the widget wants to
//                                    // play its own payoff, then call api.close() itself.
//       mount(container, api) {
//         // `container` is an empty <div> inside the overlay. Build into it.
//         // Return a teardown function (or nothing).
//         return () => { /* cancel rAF/timers, remove window listeners */ };
//       },
//     },
//   };
//
// A puzzle id with no entry here still opens — the overlay shows a "not built yet" card
// instead of crashing. A `mount` that throws is caught and shows the same card (but read the
// leak caveat under RULES below before you install a window listener).
//
// ===========================================================================================
// WHAT THIS MODULE'S BARREL DECLARES — engine/modules/<id>.js
// ===========================================================================================
// The barrel is the ONE seam between this phase and the renderer. `createGame` reads only
// `id` / `puzzles` / `script` and ignores the rest, so the UI's keys ride the same object —
// no new imports anywhere, and this phase never edits ui/renderer.js.
//
//   export default {
//     id, puzzles, script, walkthrough,             // the engine's half (see engine/state.js)
//
//     hints: { [puzzleId]: [nudge, hint, answer] }, // EXACTLY three strings. PLAN pins them.
//                                                   // HINTS LIVE HERE, on the barrel — not in
//                                                   // engine/script/<module>.js as the plan
//                                                   // originally said. The renderer reads the
//                                                   // barrel and nothing else. The strings may
//                                                   // be authored in engine/script/<module>.js
//                                                   // and imported, but the barrel must
//                                                   // re-export them or PIP has no hint.
//     items: { fuse: 'Fuse' },                      // optional inventory chip labels
//
//     scene: {
//       svg: 'assets/<module>.svg',   // panorama, viewBox="0 0 3600 1000"  (or `markup:` inline)
//       palette: { bg, accent, glow },// optional — PLAN decision 9 defaults are built in
//       intro: ['line' | {speaker,text,pose}],
//                                     // FIRST arrival only, and skipped on a restored save or
//                                     // once any puzzle here is solved. CARGO ONLY: greenhouse
//                                     // and bridge arrive via a flag, so their opening lines
//                                     // belong on the engine script key 'module:<id>'.
//       hotspots: [ ... ],            // see below
//       effects:  [ ... ],            // see below
//     },
//   };
//
// ---- THE PANORAMA SVG ----------------------------------------------------------------------
//   viewBox="0 0 3600 1000". Three optional top-level groups drive the parallax:
//     <g id="layer-back">   moves at 0.55x   <g id="layer-mid"> 1.00x   <g id="layer-front"> 1.06x
//   Art outside those groups rides the mid rate.
//
//   HOW MUCH OF EACH LAYER THE CAMERA CAN REACH — read this before placing anything.
//   The camera pans 0 … (3600 − visW)/1.06, where visW is the scene width the window shows.
//   The furthest x a layer can EVER bring on screen:
//       front (1.06):  3600                    — the whole panorama, exactly. Nothing lost.
//       mid   (1.00):  3396.2 + 0.0566*visW
//       back  (0.55):  1867.9 + 0.4811*visW    — the back layer loses a LOT
//   Measured, rounded:
//       1440x813  visW 1771 → mid 3496 (last 104 units unreachable) · back 2720 (last 880 = 24%)
//       1440x900  visW 1600 → mid 3487 (last 113)                   · back 2638 (last 962)
//       1280x800  visW 1600 → mid 3487 (last 113)                   · back 2638 (last 962)
//       1440x600  visW 2400 → mid 3532 (last  68)                   · back 3023 (last 577)
//   A taller/narrower window shrinks visW and makes mid AND back worse.
//   **SAFE RULE: mid/front hotspot x <= 3400 · back hotspot x <= 2400.** Keep the far-right
//   ~200 units of mid and the right third of back decorative. The renderer console.warns once
//   per unreachable hotspot — but only at the window size you happened to test, so honour the
//   rule rather than the warning.
//
// ---- A HOTSPOT -----------------------------------------------------------------------------
//   {
//     id:      'locker',                        // unique within the module
//     label:   'Supply locker',                 // hover caption; also the accessible name
//     shape:   { type:'rect', x, y, w, h, r? }  // scene units. r = corner radius (default 18)
//            | { type:'circle', cx, cy, r }
//            | { type:'poly', points:[[x,y], ...] },
//     layer:   'mid',                           // 'back' | 'mid' | 'front'. default 'mid'
//     puzzle:  'cargo-torch',                   // click opens that close-up
//     dispatch:{ puzzle, action, payload },     // OR click dispatches (safely). `puzzle` wins.
//     bark:    'That locker has seen things.',  // string or string[]; PIP says it.
//                                               //   decision 8: NO DEAD CLICKS — give every
//                                               //   non-puzzle object a bark.
//     sound:   'clunk',                         // one of the 12 names.
//                                               //   omitted → 'click', but ONLY when the
//                                               //     hotspot does NOT dispatch. A dispatching
//                                               //     hotspot's sound belongs to the puzzle's
//                                               //     `emits`, or it double-fires.
//                                               //   false   → genuinely silent, always.
//     sparkle: true,                            // rainbow burst. REWARD MOMENTS ONLY.
//     enabled: (state) => bool,                 // hidden + inert while false; re-read on every
//                                               //   engine event. `state` is game.state.
//   }
//   Every hotspot glints on pointerenter and shows its label. No pixel-hunting.
//
// ---- scene.effects — PER-FRAME SCENE BEHAVIOUR ----------------------------------------------
//   The hook for a torch beam that follows the cursor, vines that retract, lights that come up.
//     scene.effects: [{ id?: 'torch-beam', mount(world, fx) { …; return () => teardown; } }]
//   Mounted right after the panorama; torn down on module change and on destroy(), as hard as
//   everything else. `world` is the .nv-world div holding the panorama SVG — append your own
//   <svg>/<div>, or reach into the panorama with world.querySelector('#some-id').
//
//   fx = {
//     world,                          the same element
//     pointer() -> {x, y, inside}     LIVE cursor in SCENE units, mid-layer coordinates. For
//                                     another layer add fx.layerOffset(rate) to x. `inside` is
//                                     false while the cursor is off the stage.
//     camera()  -> {x, maxX, scale, visibleWidth}
//     layerOffset(rate) -> number     the shift that layer currently carries
//     flags() hasFlag(name) state() isSolved(id)     — NEVER cache these
//     on(type, fn)      engine events while mounted: 'sound'|'dialogue'|'flag'|'*'
//     onFrame(fn)       fn(dtSeconds) once per rAF frame, dt already clamped. Use this instead
//                       of your own rAF: one loop, cancelled for you at teardown. Poll
//                       pointer() from here, not from a pointermove listener — otherwise the
//                       beam freezes while the camera coasts under a still cursor.
//     loadSVG(path)     cached, resolves null, never rejects
//     play(name, opts)  one of the 12 sound names
//   }
//   `on` and `onFrame` are dropped for you at teardown; still return a teardown for your own
//   DOM and listeners. A throwing mount is caught and skipped; a throwing frame hook is logged
//   once and dropped, and the game keeps running.
//   A worked example — a cursor-following radial light mask that lifts on a flag — is
//   `beamEffect` in ui/renderer.js. Copy its shape.
//
// ---- PURE-CSS SCENE HOOKS (no effect needed) ------------------------------------------------
//   Every truthy flag becomes a class on .nv-world: `nv-flag-<name>` for a true flag,
//   `nv-flag-<name>-<value>` for a string flag, plus `nv-module-<id>`. A <style> block INSIDE
//   your panorama SVG is document-scoped, so this needs no JS at all:
//       <style>#amber-strips{opacity:.15} .nv-flag-crane-powered #amber-strips{opacity:1}</style>
//   The live cursor is published as custom properties on .nv-world, in scene units:
//       --nv-px / --nv-py  (and --nv-cam, the camera x)
//   — enough for a cursor-following radial-gradient mask in pure CSS. They update only while
//   the cursor is over the stage.
//
// ===========================================================================================
// THE api OBJECT — the whole contract. Nothing else is available; nothing else is needed.
// ===========================================================================================
//   api.puzzleId                  string — this widget's puzzle id
//
//   --- reading the world.  NEVER cache these: the engine REPLACES containers on write, so a
//       cached flags/inventory/slice object goes stale silently. Re-call every time.
//   api.getState()                this puzzle's slice, deep-frozen
//   api.isSolved()                this puzzle's once-only solved latch
//   api.flags()                   the frozen flag map
//   api.inventory()               the frozen inventory array
//   api.hasItem(name)             convenience for inventory().includes(name)
//
//   --- the carried item.  The HUD strip lists inventory; clicking a chip picks it up and a
//       ghost label follows the cursor. The strip sits ABOVE the close-up overlay, so she can
//       pick an item up WITHOUT closing your widget — that is how "drag the fuse to the
//       socket" and "drop the shard in the slot" work.
//   api.held()                    the item currently carried, or null
//   api.useHeld()                 consume the carry: returns the item name (or null) and
//                                 clears it. Call it when your socket/slot accepts the item.
//
//   --- changing the world
//   api.dispatch(action, payload) SAFE. Never throws, whatever the engine does with it.
//                                 Returns true when the change landed, false when the engine
//                                 rejected it (bad payload, unknown action — logged once).
//                                 This is the ONLY way a widget changes state.
//   api.dispatchTo(puzzleId, action, payload)
//                                 Same never-throws guarantee, aimed at ANOTHER puzzle id.
//                                 For one device that drives several puzzles — the bridge
//                                 terminal is one mounted widget driving bridge-boot,
//                                 bridge-password, bridge-course and bridge-launch without
//                                 losing its scrollback. Prefer api.dispatch() otherwise.
//   api.on(type, fn)              subscribe to engine events while mounted:
//                                 'sound' | 'dialogue' | 'flag' | '*'. Returns an unsubscribe;
//                                 every subscription is dropped for you at unmount anyway.
//
//   --- output
//   api.play(name, opts)          one of the 12 sound names. See "who owns the sound" below.
//   api.say(text, {pose,speaker}) PIP speaks a line. pose: 'idle' | 'talk' | 'celebrate'.
//                                 The bubble sits ABOVE the overlay, so this is your feedback
//                                 channel for a wrong answer while the close-up is open.
//                                 A speaker other than 'pip' renders as a captioned bubble
//                                 with PIP's mouth still (P6's Taklu voice logs).
//   api.shake(el)                 gentle no-fail feedback. The renderer ALREADY shakes the
//                                 whole panel whenever the engine emits 'wrong' — only call
//                                 this to shake one sub-element instead.
//   api.sparkle(x, y)             rainbow burst at viewport coords. REWARD MOMENTS ONLY:
//                                 rainbow is reserved (plush, bloom, course arc, tube trail,
//                                 certificate). Never decoration, never chrome.
//   api.loadSVG(path)             Promise<SVGElement|null>, cached, NEVER rejects. Use it for
//                                 assets/closeups/*.svg. Handle null by drawing a fallback:
//                                 a missing asset must not end the game.
//   api.present({title, escapable, onClose}) -> { el, close }
//                                 A FULL-SCREEN surface above the whole game — the home for a
//                                 scripted ride or a certificate, neither of which fits in an
//                                 880px close-up. `el` is an empty full-bleed div; build into
//                                 it and draw your own back/again control, then call
//                                 handle.close(). Esc closes too unless escapable:false.
//                                 Only one exists at a time; opening a second closes the
//                                 first, and the renderer tears it down in destroy(). It
//                                 deliberately SURVIVES a module change, so a transition ride
//                                 can play across one. Never hand-roll document.body +
//                                 z-index against the renderer's private class names.
//   api.close()                   back out of the overlay (the X button and Esc do this too)
//
// ===========================================================================================
// RULES THAT WILL BITE YOU
// ===========================================================================================
//  * WHO OWNS THE SOUND. If the puzzle declares `emits: { crank: 'crank' }` AND this widget
//    also calls api.play('crank'), it fires twice per tooth. Pick one owner per interaction.
//    The widget owns it only when the sound needs a live parameter the engine does not have —
//    the torch crank's rising pitch, play('crank', { progress }), is why that exception exists.
//    (The example below owns the crank sound, so cargo-torch must NOT declare emits.crank.)
//  * CLAMP dt. Anything pumping time into the engine must clamp:
//    `dt = Math.min(0.1, Math.max(0, (t - last) / 1000))`, with `last` seeded on the first
//    frame. An unclamped first frame is NaN, and the engine rejects NaN by throwing.
//  * THE ENGINE OWNS NO TIMER. A decaying gauge only decays because a widget dispatches every
//    rAF frame. Drive it yourself, and cancel the rAF in your teardown.
//  * isSolved IS ONLY EVALUATED DURING A DISPATCH AT THAT PUZZLE. A puzzle gated on an
//    external flag will not latch when that flag flips — dispatch some action at it.
//  * A THROWING mount() IS ONLY HALF-CAUGHT. The renderer catches the throw, shows the card
//    and drops every api.on() subscription — but a raw window/document listener you installed
//    BEFORE the throw leaks for the rest of the session and survives destroy(), because the
//    renderer never saw it and got no teardown function back. So: install raw listeners LAST,
//    after everything that can throw, or wrap your own mount body in a try/catch.
//  * NO FAIL STATES. A wrong answer is a soft sound, a shake and a PIP line. Never a reset,
//    never a penalty, never a dead end.
//  * Re-read state after every dispatch: api.getState() returns a NEW frozen object.

import {
  ROWS, COLS, KINDS, connections, poweredCells,
} from '../../engine/puzzles/cargo-power.js';
import { SLOTS, HOME_SLOT, WHEEL_TURNS } from '../../engine/puzzles/cargo-crane.js';
import { FUSE_NOT_HELD } from '../../engine/script/cargo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function node(tag, attrs, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k of Object.keys(attrs || {})) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function html(tag, css, parent) {
  const n = document.createElement(tag);
  if (css) n.style.cssText = css;
  if (parent) parent.appendChild(n);
  return n;
}

const CAPTION = 'flex:0 0 auto;margin:14px 0 0;text-align:center;font:400 14px/1.5 system-ui,sans-serif;color:oklch(74% .02 250)';

// Every widget below is a flex column that shrinks, and the tall SVG inside it shrinks with it.
// `container` IS the overlay's scrolling body, whose height the renderer caps at
// min(92vh, 100vh - 6vh - dockband) — 356px of usable content on a 1152x720 laptop. Art sized
// in fixed vh pushed the instruction caption up to 84px past the bottom edge of that box, and
// the body scrolls with no scrollbar and no peek, so "Drag the handle around in ci…" on the
// FIRST puzzle of the game was simply not there. Same fix the greenhouse uses: nothing is sized
// in fixed pixels, and the viewBox'd SVGs scale into whatever is left.
const SHELL = 'box-sizing:border-box;flex:1 1 auto;min-height:0;display:flex;flex-direction:column';

/** That cap is real but it is not a DEFINITE height, so `height:100%` inside the body resolves
 *  to auto. Flex sizing does not care: make the body a column and its used height becomes the
 *  budget every SHELL is laid out against. Restored on unmount — the renderer reuses this one
 *  element for every close-up in the game, and the other rooms expect it plain. */
function fitToPanel(container) {
  const had = container.getAttribute('style');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  return () => {
    if (had === null) container.removeAttribute('style');
    else container.setAttribute('style', had);
  };
}
const BUTTON =
  'appearance:none;border:1px solid oklch(52% .03 250);border-radius:13px;background:oklch(30% .03 250);' +
  'color:oklch(93% .02 250);font:600 15px/1 system-ui,sans-serif;padding:13px 15px;min-width:72px;cursor:pointer;' +
  'transition:background .14s ease,transform .1s ease';

function button(label, row, onClick) {
  const b = html('button', BUTTON, row);
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('pointerenter', () => { b.style.background = 'oklch(38% .04 250)'; });
  b.addEventListener('pointerleave', () => { b.style.background = 'oklch(30% .03 250)'; });
  b.addEventListener('click', onClick);
  return b;
}

/** Circular drag on `el` — the torch crank and the hatch wheel are the same gesture.
 *  `onMove(radians, turns)` fires on every move, `onTooth(turns)` once per tooth crossed.
 *  `turns` is |accumulated| so wiggling back and forth nets out instead of counting twice.
 *  Window listeners exist only while a drag is live, and the returned teardown drops them. */
function circularDrag(el, { teeth, onMove, onTooth }) {
  let dragging = false;
  let prevAngle = 0;
  let total = 0;
  let toothAt = 0;

  const angleOf = (e) => {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const a = angleOf(e);
    let d = a - prevAngle;
    while (d > Math.PI) d -= Math.PI * 2;      // unwrap across the -pi/+pi seam
    while (d < -Math.PI) d += Math.PI * 2;
    prevAngle = a;
    total += d;
    const turns = Math.abs(total) / (Math.PI * 2);
    const tooth = Math.floor(turns * teeth);
    if (tooth !== toothAt) {
      toothAt = tooth;
      if (onTooth) onTooth(turns);
    }
    if (onMove) onMove(total, turns);
  };

  const onUp = () => {
    dragging = false;
    el.style.cursor = 'grab';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  const onDown = (e) => {
    dragging = true;
    prevAngle = angleOf(e);
    el.style.cursor = 'grabbing';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    e.preventDefault();
  };

  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', onDown);

  return () => {
    onUp();
    el.removeEventListener('pointerdown', onDown);
  };
}

// ===========================================================================================
// WORKED EXAMPLE — cargo-torch. This is the pattern; the other widgets copy its shape.
//
// PLAN: "in close-up, circular drag >= 3 full turns charges it (crank sound pitch rises)".
// It assumes the puzzle exposes an action `crank` taking `{ turns }` — P4 owns that truth and
// should adjust the two dispatch lines below, or replace the widget wholesale. Everything
// around them (pointer maths, tooth detection, live-pitch sound, teardown) is reusable.
// Because this widget owns the crank sound (it needs live `progress`), cargo-torch must NOT
// declare `emits: { crank: 'crank' }` — that would double-fire it.
// ===========================================================================================

const TURNS_NEEDED = 3;
const TEETH_PER_TURN = 12;

const torch = {
  title: 'Hand-crank torch',
  mount(container, api) {
    const root = html('div', SHELL, container);
    const svg = node('svg', { viewBox: '0 0 560 300' }, root);
    svg.style.cssText = 'flex:1 1 auto;min-height:140px;width:100%;display:block;touch-action:none';

    node('defs', {}, svg).innerHTML =
      '<radialGradient id="ct-beam" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#fff3d4"/><stop offset="55%" stop-color="#ffc46b" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="#ffc46b" stop-opacity="0"/></radialGradient>';

    // torch body + bulb
    const glow = node('circle', { cx: 132, cy: 150, r: 96, fill: 'url(#ct-beam)', opacity: '0' }, svg);
    node('rect', { x: 150, y: 122, width: 150, height: 56, rx: 22, fill: '#8b98a9' }, svg);
    node('rect', { x: 150, y: 122, width: 150, height: 22, rx: 11, fill: '#aab6c6' }, svg);
    node('path', { d: 'M150 118 108 96v108l42-22z', fill: '#c3ceda' }, svg);
    const bulb = node('circle', { cx: 132, cy: 150, r: 24, fill: '#5a5142' }, svg);

    // crank dial
    const dial = node('g', { style: 'cursor:grab' }, svg);
    node('circle', { cx: 410, cy: 150, r: 96, fill: '#2f3849' }, dial);
    node('circle', { cx: 410, cy: 150, r: 84, fill: '#3f4a5e' }, dial);
    for (let i = 0; i < TEETH_PER_TURN; i += 1) {
      const a = (i / TEETH_PER_TURN) * Math.PI * 2;
      node('circle', {
        cx: 410 + Math.cos(a) * 84, cy: 150 + Math.sin(a) * 84, r: 5,
        fill: '#59657c',
      }, dial);
    }
    const arm = node('g', {}, dial);
    node('rect', { x: 404, y: 74, width: 12, height: 80, rx: 6, fill: '#aab6c6' }, arm);
    node('circle', { cx: 410, cy: 72, r: 20, fill: '#ffc46b' }, arm);
    node('circle', { cx: 404, cy: 66, r: 6, fill: '#fff3d4' }, arm);
    node('circle', { cx: 410, cy: 150, r: 16, fill: '#8b98a9' }, dial);

    const hint = html('p', CAPTION, root);
    hint.textContent = 'Drag the handle around in circles.';

    let spun = 0;   // signed accumulated radians, for painting the arm

    const paint = () => {
      const slice = api.getState() || {};
      const turns = typeof slice.turns === 'number' ? slice.turns : Math.abs(spun) / (Math.PI * 2);
      const charge = Math.min(1, turns / TURNS_NEEDED);
      arm.setAttribute('transform', `rotate(${(spun * 180) / Math.PI} 410 150)`);
      glow.setAttribute('opacity', String(charge));
      bulb.setAttribute('fill', charge > 0.98 ? '#fff3d4' : `rgb(${90 + charge * 165} ${81 + charge * 162} ${66 + charge * 130})`);
      hint.textContent = charge > 0.98
        ? 'That is a torch. Take it and go looking.'
        : 'Drag the handle around in circles.';
    };

    const stopDrag = circularDrag(dial, {
      teeth: TEETH_PER_TURN,
      onMove: (radians) => { spun = radians; paint(); },
      onTooth: (turns) => {
        // The widget owns this sound: the pitch rises with charge, which the engine's
        // static `emits` table cannot express.
        api.play('crank', { progress: Math.min(1, turns / TURNS_NEEDED) });
        api.dispatch('crank', { turns: Math.min(TURNS_NEEDED, Number(turns.toFixed(3))) });
      },
    });

    paint();
    const unfit = fitToPanel(container);
    return () => { stopDrag(); unfit(); };
  },
};

// ===========================================================================================
// cargo-keypad — the locked crate. Code 2947, taught by the circled marks on the glow paint.
// Every sound belongs to the puzzle's `emits`; this widget plays nothing of its own.
// ===========================================================================================

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['CLR', '0', 'OK'],
];

const keypad = {
  title: 'Crate keypad',
  mount(container, api) {
    const root = html('div', SHELL, container);
    const svg = node('svg', { viewBox: '0 0 560 470' }, root);
    svg.style.cssText = 'flex:1 1 auto;min-height:200px;width:100%;display:block;touch-action:none';

    node('rect', { x: 96, y: 12, width: 368, height: 96, rx: 18, fill: '#2f3849' }, svg);
    const slots = [];
    for (let i = 0; i < 4; i += 1) {
      const x = 124 + i * 84;
      node('rect', { x, y: 28, width: 64, height: 64, rx: 12, fill: '#161d29' }, svg);
      const t = node('text', {
        x: x + 32, y: 62, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': 'system-ui, sans-serif', 'font-size': 38, 'font-weight': 700, fill: '#ffc46b',
      }, svg);
      slots.push(t);
    }

    KEYPAD_ROWS.forEach((row, r) => {
      row.forEach((label, c) => {
        const x = 130 + c * 112;
        const y = 132 + r * 80;
        const g = node('g', { style: 'cursor:pointer' }, svg);
        const face = node('rect', { x, y, width: 96, height: 64, rx: 14, fill: '#3f4a5e' }, g);
        node('text', {
          x: x + 48, y: y + 33, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-family': 'system-ui, sans-serif', 'font-size': label.length > 1 ? 22 : 30,
          'font-weight': 700, fill: label === 'OK' ? '#ffc46b' : '#dbe3ee',
        }, g).textContent = label;
        g.addEventListener('pointerenter', () => face.setAttribute('fill', '#4d5a72'));
        g.addEventListener('pointerleave', () => face.setAttribute('fill', '#3f4a5e'));
        g.addEventListener('click', () => {
          if (label === 'CLR') api.dispatch('clear');
          else if (label === 'OK') api.dispatch('submit');
          else api.dispatch('digit', { digit: label });
          paint();
        });
      });
    });

    const hint = html('p', CAPTION, root);

    function paint() {
      const slice = api.getState() || {};
      const entry = typeof slice.entry === 'string' ? slice.entry : '';
      const open = slice.opened === true;
      for (let i = 0; i < slots.length; i += 1) {
        slots[i].textContent = open ? 'OPEN'.charAt(i) : (entry.charAt(i) || '-');
        slots[i].setAttribute('fill', open ? '#9ff5b8' : '#ffc46b');
      }
      svg.style.opacity = open ? '0.65' : '1';
      hint.textContent = open
        ? 'The lid is off. Have a rummage.'
        : 'Four digits, then OK. CLR wipes it.';
    }

    api.on('*', paint);
    paint();
    return fitToPanel(container);
  },
};

// ===========================================================================================
// cargo-power — battery, 2x3 conduit grid, crane socket. The grid maths lives in the puzzle
// module and is imported, so the panel lights exactly the run the engine believes in.
// ===========================================================================================

const CELL = 120;
const GAP = 14;
const GRID_X = 168;
const GRID_Y = 66;
const PIPE_LIVE = '#ffc46b';
const PIPE_DEAD = '#6b7688';

function pipePath(kind) {
  if (kind === 'straight') return 'M0 60H120';
  if (kind === 'corner') return 'M60 0V60H120';
  return 'M60 0V54';                       // decoy stub: one open end, joins nothing
}

const power = {
  title: 'Conduit panel',
  mount(container, api) {
    const root = html('div', SHELL, container);
    const svg = node('svg', { viewBox: '0 0 720 420' }, root);
    svg.style.cssText = 'flex:1 1 auto;min-height:190px;width:100%;display:block;touch-action:none';

    node('rect', { x: 8, y: 8, width: 704, height: 404, rx: 22, fill: '#232b38' }, svg);

    // --- backup battery, with the socket the fuse goes into ---
    const battery = node('g', { style: 'cursor:pointer' }, svg);
    node('rect', { x: 30, y: GRID_Y, width: 108, height: CELL, rx: 16, fill: '#3f4a5e' }, battery);
    node('rect', { x: 30, y: GRID_Y, width: 108, height: 26, rx: 13, fill: '#59657c' }, battery);
    const socketRing = node('circle', {
      cx: 84, cy: GRID_Y + 74, r: 26, fill: '#161d29',
      stroke: '#8b98a9', 'stroke-width': 5, 'stroke-dasharray': '9 8',
    }, battery);
    const fuse = node('g', { opacity: '0' }, battery);
    node('rect', { x: 66, y: GRID_Y + 54, width: 36, height: 40, rx: 10, fill: '#ffc46b' }, fuse);
    node('rect', { x: 72, y: GRID_Y + 62, width: 24, height: 8, rx: 4, fill: '#8a5a10' }, fuse);
    const batteryLamp = node('circle', { cx: 84, cy: GRID_Y + 18, r: 9, fill: '#4a4038' }, battery);
    node('text', {
      x: 84, y: GRID_Y + CELL + 26, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif',
      'font-size': 15, 'font-weight': 600, fill: '#8b98a9',
    }, svg).textContent = 'BATTERY';

    // --- crane socket ---
    const socketX = GRID_X + COLS * (CELL + GAP) + 16;
    const socketY = GRID_Y + (CELL + GAP);
    node('rect', { x: socketX, y: socketY, width: 96, height: CELL, rx: 16, fill: '#3f4a5e' }, svg);
    const craneLamp = node('circle', { cx: socketX + 48, cy: socketY + 60, r: 22, fill: '#4a4038' }, svg);
    node('text', {
      x: socketX + 48, y: socketY + CELL + 26, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif',
      'font-size': 15, 'font-weight': 600, fill: '#8b98a9',
    }, svg).textContent = 'CRANE';

    // --- the feed stubs on either side of the grid ---
    const feed = node('path', {
      d: `M138 ${GRID_Y + 60}H${GRID_X}`, stroke: PIPE_DEAD, 'stroke-width': 20, 'stroke-linecap': 'round',
    }, svg);
    const tail = node('path', {
      d: `M${GRID_X + COLS * (CELL + GAP) - GAP} ${socketY + 60}H${socketX}`,
      stroke: PIPE_DEAD, 'stroke-width': 20, 'stroke-linecap': 'round',
    }, svg);

    // --- the tiles ---
    const tiles = [];
    const spin = [];
    for (let r = 0; r < ROWS; r += 1) {
      spin.push([]);
      for (let c = 0; c < COLS; c += 1) {
        const x = GRID_X + c * (CELL + GAP);
        const y = GRID_Y + r * (CELL + GAP);
        const g = node('g', { transform: `translate(${x} ${y})`, style: 'cursor:pointer' }, svg);
        const face = node('rect', { width: CELL, height: CELL, rx: 16, fill: '#2f3849' }, g);
        const pipe = node('g', {}, g);
        node('rect', { width: CELL, height: CELL, fill: 'none' }, pipe);   // pins the rotation box
        const stroke = node('path', {
          d: pipePath(KINDS[r][c]), fill: 'none', stroke: PIPE_DEAD,
          'stroke-width': 22, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        }, pipe);
        pipe.style.transformBox = 'fill-box';
        pipe.style.transformOrigin = 'center';
        pipe.style.transition = 'transform .26s cubic-bezier(.3,.8,.3,1)';
        g.addEventListener('pointerenter', () => face.setAttribute('fill', '#3a465a'));
        g.addEventListener('pointerleave', () => face.setAttribute('fill', '#2f3849'));
        g.addEventListener('click', () => { api.dispatch('rotate', { row: r, col: c }); paint(); });
        tiles.push({ row: r, col: c, pipe, stroke });
        spin[r].push(null);
      }
    }

    const hint = html('p', CAPTION, root);

    function paint() {
      const slice = api.getState() || {};
      const rot = Array.isArray(slice.rot) ? slice.rot : KINDS.map((line) => line.map(() => 0));
      const lit = poweredCells(rot);
      const complete = api.isSolved();

      for (const tile of tiles) {
        // Spin forward only: 3 -> 0 must look like another quarter turn, not a rewind.
        const raw = Number((rot[tile.row] || [])[tile.col]);
        const want = Number.isFinite(raw) ? (((raw % 4) + 4) % 4) : 0;
        let shown = spin[tile.row][tile.col];
        if (shown === null) shown = want;
        while (((shown % 4) + 4) % 4 !== want) shown += 1;
        spin[tile.row][tile.col] = shown;
        tile.pipe.style.transform = `rotate(${shown * 90}deg)`;
        const on = lit.has(`${tile.row},${tile.col}`)
          && connections(KINDS[tile.row][tile.col], want).length > 1;
        tile.stroke.setAttribute('stroke', on ? PIPE_LIVE : PIPE_DEAD);
      }

      const fuseIn = slice.fuseIn === true;
      fuse.setAttribute('opacity', fuseIn ? '1' : '0');
      socketRing.setAttribute('stroke-dasharray', fuseIn ? '0' : '9 8');
      batteryLamp.setAttribute('fill', fuseIn ? '#ffc46b' : '#4a4038');
      feed.setAttribute('stroke', fuseIn ? PIPE_LIVE : PIPE_DEAD);
      tail.setAttribute('stroke', complete ? PIPE_LIVE : PIPE_DEAD);
      craneLamp.setAttribute('fill', complete ? '#9ff5b8' : '#4a4038');

      if (!fuseIn) hint.textContent = 'The socket is empty. Carry the fuse over and tap it in.';
      else if (complete) hint.textContent = 'Unbroken, battery to crane. Listen to that.';
      else hint.textContent = 'Tap a pipe to turn it. Corners turn, straights do not care.';
    }

    battery.addEventListener('click', () => {
      const slice = api.getState() || {};
      if (slice.fuseIn === true) return;
      if (api.held() === 'fuse') {
        if (api.dispatch('insert')) api.useHeld();
      } else if (api.hasItem('fuse')) {
        api.play('click');
        api.say(FUSE_NOT_HELD);
      } else {
        api.dispatch('insert');     // the puzzle owns the "no fuse yet" line
      }
      paint();
    });

    api.on('*', paint);
    paint();
    return fitToPanel(container);
  },
};

// ===========================================================================================
// cargo-crane — two beats in one close-up. Move the wall crate off its slot (gasp #1), then
// wind the hatch wheel. Arrow keys drive the same actions as the buttons; those listeners go
// in LAST, after everything that can throw, and come out in the teardown.
// ===========================================================================================

const WHEEL_TEETH = 8;

const crane = {
  title: 'Crane controls',
  mount(container, api) {
    const root = html('div', SHELL, container);

    // ---- beat one: the crane ----
    const rig = html('div', SHELL, root);
    const svg = node('svg', { viewBox: '0 0 640 330' }, rig);
    svg.style.cssText = 'flex:1 1 auto;min-height:130px;width:100%;display:block';

    node('rect', { x: 20, y: 34, width: 600, height: 22, rx: 11, fill: '#3f4a5e' }, svg);
    node('rect', { x: 20, y: 288, width: 600, height: 16, rx: 8, fill: '#3f4a5e' }, svg);
    const wall = node('g', {}, svg);
    node('rect', { x: 592, y: 56, width: 28, height: 232, fill: '#2f3849' }, wall);
    const hatchPeek = node('g', { opacity: '0' }, svg);
    node('rect', { x: 470, y: 132, width: 118, height: 156, rx: 18, fill: '#161d29' }, hatchPeek);
    node('rect', { x: 470, y: 132, width: 118, height: 156, rx: 18, fill: 'none', stroke: '#8b98a9', 'stroke-width': 7 }, hatchPeek);

    const trolley = node('g', {}, svg);
    node('rect', { x: -34, y: 12, width: 68, height: 34, rx: 12, fill: '#8b98a9' }, trolley);
    const cable = node('rect', { x: -3, y: 46, width: 6, height: 60, fill: '#8b98a9' }, trolley);
    const crate = node('g', {}, svg);
    node('rect', { x: -58, y: 0, width: 116, height: 96, rx: 14, fill: '#7a5334' }, crate);
    node('rect', { x: -58, y: 0, width: 116, height: 18, rx: 9, fill: '#ffffff', 'fill-opacity': 0.1 }, crate);
    node('rect', { x: -40, y: 34, width: 80, height: 10, rx: 5, fill: '#000000', 'fill-opacity': 0.22 }, crate);
    node('rect', { x: -40, y: 66, width: 80, height: 10, rx: 5, fill: '#000000', 'fill-opacity': 0.22 }, crate);
    crate.style.transition = 'transform .55s cubic-bezier(.3,.8,.3,1)';
    trolley.style.transition = 'transform .55s cubic-bezier(.3,.8,.3,1)';

    for (let i = 0; i < SLOTS; i += 1) {
      node('rect', {
        x: 92 + i * 132 - 60, y: 276, width: 120, height: 10, rx: 5,
        fill: '#3f4a5e', opacity: 0.7,
      }, svg);
    }

    const row = html('div', 'flex:0 0 auto;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px', rig);
    button('Grab', row, () => act('grab'));
    button('Lift', row, () => act('lift'));
    button('◀', row, () => act('move', { dir: 'left' }));
    button('▶', row, () => act('move', { dir: 'right' }));
    button('Drop', row, () => act('drop'));

    // ---- beat two: the hatch wheel ----
    const hatchBox = html('div', SHELL, root);
    hatchBox.style.display = 'none';
    const hsvg = node('svg', { viewBox: '0 0 560 330' }, hatchBox);
    hsvg.style.cssText = 'flex:1 1 auto;min-height:150px;width:100%;display:block;touch-action:none';
    node('rect', { x: 120, y: 14, width: 320, height: 302, rx: 26, fill: '#161d29' }, hsvg);
    node('rect', { x: 120, y: 14, width: 320, height: 302, rx: 26, fill: 'none', stroke: '#59657c', 'stroke-width': 12 }, hsvg);
    node('rect', { x: 142, y: 36, width: 276, height: 258, rx: 18, fill: '#3f4a5e' }, hsvg);
    const wheel = node('g', {}, hsvg);
    node('circle', { cx: 280, cy: 165, r: 96, fill: '#2f3849' }, wheel);
    node('circle', { cx: 280, cy: 165, r: 78, fill: 'none', stroke: '#8b98a9', 'stroke-width': 18 }, wheel);
    const spokes = node('g', { stroke: '#8b98a9', 'stroke-width': 18, 'stroke-linecap': 'round' }, wheel);
    node('path', { d: 'M280 87v156' }, spokes);
    node('path', { d: 'M202 165h156' }, spokes);
    node('path', { d: 'M225 110l110 110' }, spokes);
    node('path', { d: 'M335 110L225 220' }, spokes);
    node('circle', { cx: 280, cy: 165, r: 22, fill: '#aab6c6' }, wheel);
    wheel.style.transformBox = 'fill-box';
    wheel.style.transformOrigin = 'center';
    const gauge = node('circle', {
      cx: 280, cy: 165, r: 112, fill: 'none', stroke: '#ffc46b', 'stroke-width': 8,
      'stroke-linecap': 'round', 'stroke-dasharray': `0 ${Math.PI * 224}`,
      transform: 'rotate(-90 280 165)', opacity: 0.9,
    }, hsvg);

    const hint = html('p', CAPTION, root);

    let spun = 0;
    const stopWheel = circularDrag(wheel, {
      teeth: WHEEL_TEETH,
      onMove: (radians) => {
        spun = radians;
        wheel.style.transform = `rotate(${(spun * 180) / Math.PI}deg)`;
      },
      onTooth: (turns) => {
        api.dispatch('turn', { turns: Math.min(WHEEL_TURNS, Number(turns.toFixed(3))) });
      },
    });

    function act(action, payload) {
      api.dispatch(action, payload);
      paint();
    }

    function paint() {
      const s = api.getState() || {};
      const slot = typeof s.slot === 'number' ? s.slot : HOME_SLOT;
      const x = 92 + slot * 132;
      const lifted = s.lifted === true;
      const revealed = s.revealed === true;

      const top = lifted ? 92 : 180;
      trolley.style.transform = `translate(${x}px, 0px)`;
      cable.setAttribute('height', String(top - 46));   // the hook always reaches the lid
      crate.style.transform = `translate(${x}px, ${top}px)`;
      // The hatch shows itself the moment the crate is walked off its slot — the held beat
      // before she puts it down and PIP gasps. Once `revealed` the rig is hidden anyway.
      hatchPeek.setAttribute('opacity', slot === HOME_SLOT ? '0' : '1');

      rig.style.display = revealed ? 'none' : 'flex';
      hatchBox.style.display = revealed ? 'flex' : 'none';

      const turns = typeof s.wheel === 'number' ? s.wheel : 0;
      const arc = Math.PI * 224;
      const done = Math.min(1, turns / WHEEL_TURNS) * arc;
      gauge.setAttribute('stroke-dasharray', `${done.toFixed(1)} ${(arc - done).toFixed(1)}`);

      // The engine refuses every crane action until the conduit run is live; say so here
      // rather than let her press five buttons to find out.
      const powered = api.flags()['crane-powered'] === true;
      svg.style.opacity = powered ? '1' : '0.5';
      row.style.opacity = powered ? '1' : '0.5';

      if (!powered) {
        hint.textContent = 'Dead as a rock. That conduit panel has to carry power here first.';
      } else if (!revealed) {
        if (!s.grabbed) hint.textContent = 'Grab the crate, lift, then walk it one slot left.';
        else if (!lifted) hint.textContent = 'Got it. Lift.';
        else hint.textContent = 'Move it along the rail, then drop.';
      } else if (api.isSolved()) {
        hint.textContent = 'Unlatched. That is a whole other room through there.';
      } else {
        hint.textContent = 'Drag the wheel round and round. Twice should do it.';
      }
    }

    api.on('*', paint);
    paint();

    // LAST, after everything above that could throw: a listener installed before a throw
    // would leak for the rest of the session.
    const onKey = (e) => {
      const s = api.getState() || {};
      if (s.revealed === true) return;          // the wheel is a drag, not a key
      if (e.key === 'ArrowLeft') act('move', { dir: 'left' });
      else if (e.key === 'ArrowRight') act('move', { dir: 'right' });
      else if (e.key === 'ArrowUp') act('lift');
      else if (e.key === 'ArrowDown') act('drop');
      else if (e.key === 'Enter' || e.key === ' ') act('grab');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    const unfit = fitToPanel(container);

    return () => {
      window.removeEventListener('keydown', onKey);
      stopWheel();
      unfit();
    };
  },
};

export default {
  'cargo-torch': torch,
  'cargo-keypad': keypad,
  'cargo-power': power,
  'cargo-crane': crane,
};
