// STATION NOVA — bespoke close-up widgets for the BRIDGE module.  (P6 owns this file.)
//
// ui/renderer.js is generic and never learns about a specific puzzle. Everything that needs
// custom interaction — a drag-to-plot course line, memory-shard slots, four guarded switches
// and a throttle, and the certificate screen (api.present) — lives here. The terminal itself
// lives in ui/console.js. P6 never edits ui/renderer.js.
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
//    (A fully worked example of one of these widgets — pointer maths, tooth detection,
//    live-pitch sound, teardown — is the torch crank in ui/closeups/cargo.js. Copy its shape.)
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

import { mountConsole } from '../console.js';
import { COURSE_ORDER, isCoursePrefix } from '../../engine/puzzles/bridge-course.js';
import { SLOT_WAVES, SHARD_WAVES } from '../../engine/puzzles/bridge-memory.js';
import { SWITCH_COUNT, FULL_THROTTLE } from '../../engine/puzzles/bridge-launch.js';
import { NAMEPLATE, RADIO_CLEARANCE, CERTIFICATE, PIP } from '../../engine/script/bridge.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function node(tag, attrs, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k of Object.keys(attrs || {})) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function box(cls, parent, tag = 'div') {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
}

const STYLE_ID = 'nv-bridge-closeup-style';
const STYLE = `
/* ---- fitting inside the panel -------------------------------------------------------------
   .nv-closeup is min(92vh, 100vh - 6vh - dockband) tall, of which a 62px header and 36px of
   body padding are not ours. Its body scrolls, but macOS Chrome draws no scrollbar until you
   already scrolled, so a control below the fold is a control that does not exist — this build
   has shipped that bug twice already. So the tall part of every widget (the board/plot/dock
   drawing) is capped to what is left after its own other rows, and the drawing scales down
   instead of being cut off. --nvb-rows is those other rows plus the flex gaps; --nvb-ar is the
   drawing's aspect ratio, which keeps the capped box hugging the art instead of letterboxing.
   Checked in a real browser at 1152x720, 1280x800 and 1440x900. */
.nvb-wrap, .nvc {
  --nvb-body: calc(min(92vh, 100vh - 6vh - var(--nv-dockband, 176px)) - 98px);
}
.nvb-fit {
  display: block; margin: 0 auto; width: 100%; height: auto;
  --nvb-cap: max(150px, calc(var(--nvb-body) - var(--nvb-rows, 0px)));
  max-height: var(--nvb-cap);
  max-width: calc(var(--nvb-cap) * var(--nvb-ar, 1.6471));
}
.nvb-wrap { display: flex; flex-direction: column; gap: 12px; }
.nvb-note { margin: 0; text-align: center; font: 400 13.5px/1.55 system-ui, sans-serif; color: oklch(74% 0.02 250); }
.nvb-btn {
  align-self: center; padding: 9px 20px; border-radius: 999px; cursor: pointer;
  font: 600 13.5px/1 system-ui, sans-serif; letter-spacing: .02em;
  color: oklch(92% 0.02 250); background: oklch(32% 0.04 250);
  border: 1px solid oklch(52% 0.05 250); transition: background .16s ease, transform .16s ease;
}
.nvb-btn:hover { background: oklch(40% 0.05 250); transform: translateY(-1px); }
.nvb-hidden { display: none !important; }
.nvb-tray { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.nvb-shard {
  display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;
  padding: 9px 13px 7px; border-radius: 13px; background: oklch(30% 0.05 200);
  border: 2px solid oklch(48% 0.08 200); transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  font: 600 11.5px/1 system-ui, sans-serif; color: oklch(90% 0.04 200); letter-spacing: .04em;
}
.nvb-shard:hover { transform: translateY(-2px); }
.nvb-shard.nvb-on { border-color: oklch(84% 0.15 190); box-shadow: 0 0 22px oklch(84% 0.15 190 / .5); }
.nvb-shard.nvb-gone { opacity: .28; pointer-events: none; }
.nvb-shard.nvb-locked { opacity: .4; border-style: dashed; cursor: default; }
.nvb-mark { font: 500 9.5px/1 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; opacity: .62; }
.nvb-sweep {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(100deg, transparent 38%, oklch(92% 0.02 250 / .55) 50%, transparent 62%);
}
.nvb-sweep.nvb-go { animation: nvb-sweep 1.5s ease-in-out 2; }
@keyframes nvb-sweep { from { opacity: 1; transform: translateX(-100%) } to { opacity: 1; transform: translateX(100%) } }

/* ---- the launch surface (api.present) ---- */
.nvb-fin { position: absolute; inset: 0; display: grid; place-items: center; background: oklch(14% 0.03 262); overflow: hidden; }
/* The sky is the backdrop and nothing else: it is built after the caption strip, so without
   an explicit order the starfield paints over the very lines this surface exists to show. */
.nvb-fin-sky { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.nvb-count {
  z-index: 2;
  position: relative; text-align: center; font: 700 clamp(64px, 14vw, 190px)/1 ui-monospace, monospace;
  color: oklch(92% 0.02 250); text-shadow: 0 0 60px oklch(80% 0.16 150 / .6); letter-spacing: .04em;
}
.nvb-count small { display: block; font: 500 clamp(13px, 2vw, 20px)/1.6 system-ui, sans-serif; letter-spacing: .22em; color: oklch(80% 0.16 150); }
.nvb-shakes { animation: nvb-shake .32s ease-in-out infinite; }
@keyframes nvb-shake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(2px,-2px) } 50% { transform: translate(-2px,1px) } 75% { transform: translate(1px,2px) } }
.nvb-cert-wrap { z-index: 2; position: relative; width: min(680px, 92vw); padding: 7px; border-radius: 26px; animation: nvb-hue 9s linear infinite; }
.nvb-cert-wrap::before {
  content: ''; position: absolute; inset: 0; border-radius: 26px;
  background: conic-gradient(from 0deg, oklch(78% .19 20), oklch(84% .18 90), oklch(82% .19 150), oklch(76% .18 250), oklch(74% .19 320), oklch(78% .19 20));
}
.nvb-cert {
  position: relative; border-radius: 20px; padding: 34px 30px 26px; text-align: center;
  background: oklch(20% 0.03 250); border: 1px solid oklch(40% 0.04 250);
  font-family: system-ui, sans-serif; color: oklch(94% 0.02 250);
}
.nvb-cert h1 { margin: 0; font-size: clamp(20px, 3.4vw, 30px); letter-spacing: .3em; font-weight: 700; }
.nvb-cert h2 { margin: 8px 0 20px; font-size: clamp(12px, 1.8vw, 15px); letter-spacing: .26em; font-weight: 500; color: oklch(78% 0.03 250); }
.nvb-cert .nvb-name { margin: 0; font-size: clamp(26px, 5vw, 46px); letter-spacing: .06em; font-weight: 700; color: oklch(88% 0.14 150); }
.nvb-cert .nvb-time { margin: 14px 0 0; font: 600 clamp(15px, 2.4vw, 20px)/1.4 ui-monospace, monospace; letter-spacing: .16em; }
.nvb-cert .nvb-wit { margin: 6px 0 0; font-size: 14px; letter-spacing: .08em; color: oklch(76% 0.02 250); }
/* The dialogue bubble is z55; the present surface is an opaque z70 sheet over inset:0.
   Anything said into the bubble during the finale — the pinned radio line, PIP's certificate
   line — is behind the starfield and is never seen. These land on top of it instead. */
.nvb-say {
  z-index: 3;
  position: absolute; left: 50%; bottom: 5vh; transform: translateX(-50%);
  width: min(660px, 88vw); padding: 14px 20px; border-radius: 18px; text-align: center;
  font: 400 clamp(14px, 1.7vw, 18px)/1.5 system-ui, sans-serif; color: oklch(96% 0.01 250);
  background: oklch(20% 0.03 250 / .93); border: 1px solid oklch(60% 0.06 250 / .55);
  box-shadow: 0 14px 40px rgb(0 0 0 / .5);
  opacity: 0; transition: opacity .3s ease;
}
.nvb-say.nvb-on { opacity: 1; }
.nvb-say-who {
  display: block; margin-bottom: 7px; font: 700 10px/1 system-ui, sans-serif;
  letter-spacing: .24em; text-transform: uppercase; color: oklch(80% 0.16 150);
}
.nvb-row { display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
.nvb-again {
  padding: 7px 18px; border-radius: 999px; cursor: pointer;
  font: 500 12.5px/1 system-ui, sans-serif; letter-spacing: .06em;
  color: oklch(80% 0.02 250); background: transparent; border: 1px solid oklch(46% 0.04 250);
}
.nvb-again:hover { color: oklch(96% 0.02 250); border-color: oklch(70% 0.05 250); }
@keyframes nvb-hue { from { filter: hue-rotate(0deg) } to { filter: hue-rotate(360deg) } }
@media (prefers-reduced-motion: reduce) {
  .nvb-shakes, .nvb-cert-wrap, .nvb-sweep.nvb-go { animation: none }
}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = STYLE;
  document.head.appendChild(tag);
}

// ===========================================================================================
// bridge-course — the plotting screen, drawn on the console's own nav display.
// Reached by typing `chart`; the terminal hides itself and hands the panel over.
// ===========================================================================================

const NODES = {
  // PLAN P5 placed them: Unicorn upper-left, Comb centre-right, Whale lower-middle.
  unicorn: { x: 128, y: 92, label: 'The Unicorn', stars: [[-44, 14], [-16, -22], [10, -34], [34, -6], [46, 30]] },
  comb: { x: 432, y: 138, label: 'The Comb', stars: [[-36, -18], [-12, -22], [12, -20], [34, -14]] },
  whale: { x: 262, y: 258, label: 'The Whale', stars: [[-58, 6], [-28, -14], [4, -18], [34, -4], [52, 14], [18, 20]] },
};

function mountPlot(host, api, onBack) {
  const wrap = box('nvb-wrap', host);
  wrap.style.setProperty('--nvb-rows', '99px');   // note + button + two 12px gaps, plus slack
  const svg = node('svg', { viewBox: '0 0 560 340', width: '100%', class: 'nvb-fit' }, wrap);
  svg.style.cssText = 'border-radius:14px;background:oklch(17% 0.03 262);touch-action:none;';

  const defs = node('defs', {}, svg);
  const grad = node('linearGradient', { id: 'nvb-course-rainbow', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
  [['0%', 'oklch(78% 0.19 20)'], ['33%', 'oklch(84% 0.18 90)'], ['66%', 'oklch(82% 0.19 150)'], ['100%', 'oklch(76% 0.18 300)']]
    .forEach(([offset, color]) => node('stop', { offset, 'stop-color': color }, grad));

  for (let i = 0; i < 70; i += 1) {
    const x = (i * 197) % 552 + 4;
    const y = (i * 131) % 330 + 5;
    node('circle', { cx: x, cy: y, r: (i % 4) * 0.45 + 0.7, fill: 'oklch(92% 0.02 250)', opacity: 0.16 + (i % 5) * 0.08 }, svg);
  }

  const line = node('polyline', {
    points: '', fill: 'none', stroke: 'oklch(80% 0.16 150)', 'stroke-width': '5',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }, svg);
  const band = node('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: 'oklch(80% 0.16 150)', 'stroke-width': '3', 'stroke-dasharray': '7 8', opacity: '0' }, svg);

  const groups = {};
  Object.keys(NODES).forEach((name) => {
    const spec = NODES[name];
    const g = node('g', { style: 'cursor:pointer' }, svg);
    node('circle', { cx: spec.x, cy: spec.y, r: 62, fill: 'oklch(80% 0.16 150)', 'fill-opacity': '0.05' }, g);
    const ring = node('circle', {
      cx: spec.x, cy: spec.y, r: 54, fill: 'none',
      stroke: 'oklch(80% 0.16 150)', 'stroke-width': '2', 'stroke-opacity': '0.35',
    }, g);
    const shape = node('polyline', {
      points: spec.stars.map(([dx, dy]) => `${spec.x + dx},${spec.y + dy}`).join(' '),
      fill: 'none', stroke: 'oklch(92% 0.02 250)', 'stroke-width': '1.6', 'stroke-opacity': '0.4',
    }, g);
    spec.stars.forEach(([dx, dy], i) => {
      node('circle', { cx: spec.x + dx, cy: spec.y + dy, r: i === 0 ? 4.4 : 3.2, fill: 'oklch(96% 0.02 250)' }, g);
    });
    node('text', {
      x: spec.x, y: spec.y + 78, 'text-anchor': 'middle', fill: 'oklch(84% 0.02 250)',
      'font-family': 'system-ui, sans-serif', 'font-size': '13', 'letter-spacing': '1.5',
    }, g).textContent = spec.label;
    groups[name] = { g, ring, shape };
  });

  const readout = box('nvb-note', wrap, 'p');
  const back = box('nvb-btn', wrap, 'button');
  back.type = 'button';
  back.textContent = '← back to the console';

  // `picked` mirrors bridge-course.order rather than reading it back, and has to: this widget
  // rides the TERMINAL's api (puzzleId 'bridge-boot'), and api.getState() only ever returns
  // the mounted puzzle's own slice — the contract has no read for another id, only
  // dispatchTo. isCoursePrefix is the single shared rule both sides apply, so they cannot
  // disagree; it guards Array.isArray and cannot throw.
  let picked = [];
  let dragging = false;

  const locked = () => api.flags()['course-locked'] === true;

  function paint() {
    const done = locked();
    const pts = picked.map((name) => `${NODES[name].x},${NODES[name].y}`).join(' ');
    line.setAttribute('points', pts);
    line.setAttribute('stroke', done ? 'url(#nvb-course-rainbow)' : 'oklch(80% 0.16 150)');
    line.setAttribute('stroke-width', done ? '8' : '5');
    Object.keys(groups).forEach((name) => {
      const on = picked.includes(name);
      groups[name].ring.setAttribute('stroke-opacity', on ? '0.95' : '0.35');
      groups[name].shape.setAttribute('stroke-opacity', on ? '0.9' : '0.4');
    });
    readout.textContent = done
      ? 'Course locked. Whale, Comb, Unicorn — all the way home.'
      : `Course: ${picked.length ? picked.map((n) => NODES[n].label).join(' → ') : '(nothing plotted yet)'}`;
  }

  function pick(name) {
    if (locked()) return;
    if (picked.includes(name)) return;
    const attempt = [...picked, name];
    api.dispatchTo('bridge-course', 'plot', { order: attempt });
    picked = isCoursePrefix(attempt) ? attempt : [];
    if (picked.length === COURSE_ORDER.length) {
      const r = svg.getBoundingClientRect();
      api.sparkle(r.left + r.width / 2, r.top + r.height / 2);
    }
    paint();
  }

  function scenePoint(e) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 560, y: ((e.clientY - r.top) / r.height) * 340 };
  }

  function onMove(e) {
    if (!dragging || picked.length === 0 || locked()) return;
    const p = scenePoint(e);
    const last = NODES[picked[picked.length - 1]];
    band.setAttribute('x1', last.x);
    band.setAttribute('y1', last.y);
    band.setAttribute('x2', p.x);
    band.setAttribute('y2', p.y);
    band.setAttribute('opacity', '0.7');
  }

  function endDrag() {
    dragging = false;
    band.setAttribute('opacity', '0');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }

  Object.keys(groups).forEach((name) => {
    groups[name].g.addEventListener('pointerdown', () => {
      dragging = true;
      pick(name);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });
    // Dragging THROUGH a constellation picks it — that is the "drag the course line" verb.
    groups[name].g.addEventListener('pointerenter', () => { if (dragging) pick(name); });
  });

  back.addEventListener('click', () => { api.play('click'); onBack(); });
  api.on('flag', paint);
  paint();

  return {
    destroy() { endDrag(); wrap.remove(); },
  };
}

// ===========================================================================================
// bridge-boot — the terminal. One mounted widget, four puzzle ids, one scrollback.
// ===========================================================================================

const terminal = {
  title: "Captain's console",
  // The terminal solves bridge-boot on `scan` and must NOT back out from under her: everything
  // that follows — the logs, the password, the plotter, `launch confirm` — is typed right here.
  closeOnSolve: false,
  mount(container, api) {
    ensureStyle();
    const termHost = box('', container);
    const plotHost = box('nvb-hidden', container);
    let plot = null;

    const term = mountConsole(termHost, api, {
      onChart() {
        term.setActive(false);
        plotHost.classList.remove('nvb-hidden');
        if (!plot) plot = mountPlot(plotHost, api, backToTerminal);
      },
      // `launch confirm` typed again after the launch. The certificate is the only thing in
      // the game she may want a second look at — to show someone — and the first commit
      // tells her this is how.
      onCertificate() { showCertificateAgain(api); },
    });

    function backToTerminal() {
      plotHost.classList.add('nvb-hidden');
      term.setActive(true);
    }

    api.dispatch('dock');
    armFinale(api);

    return () => {
      term.destroy();
      if (plot) plot.destroy();
    };
  },
};

// ===========================================================================================
// bridge-memory — three shards, three slots. Trivially easy on purpose.
// ===========================================================================================

const WAVE_PATH = {
  sine: 'M2 12q5.5-10 11 0t11 0t11 0',
  square: 'M2 20v-16h10v16h10v-16h10v16h8',
  triangle: 'M2 20l8-16 8 16 8-16 8 16',
};

// The HUD chips, if P4/P5 named them this way. The tray works regardless — a shard she is
// carrying is a bonus route into the slot, never the only one.
const HELD_WAVES = { 'shard-1': 'sine', 'shard-2': 'square', 'shard-3': 'triangle' };

// Which HUD chip each tray shard mirrors. 1 and 2 are real inventory items (cargo-keypad and
// green-bloom hand them over); 3 has no chip, because the engine has no mid-puzzle
// add-to-inventory API — it is recorded on bridge-memory's own slice when she takes it off
// the wall. The tray reads both so it shows the same world the HUD does. Availability is
// gated only on shard 3: refusing 1 and 2 on a missing chip would make the room unsolvable
// if the hand-over ever failed, and this game has no fail states.
const SHARD_ITEMS = Object.freeze({ 1: 'shard-1', 2: 'shard-2' });

function waveSvg(kind, colour) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 24');
  svg.setAttribute('width', '44');
  svg.setAttribute('height', '24');
  node('path', {
    d: WAVE_PATH[kind], fill: 'none', stroke: colour, 'stroke-width': '3',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }, svg);
  return svg;
}

/** PIP's nameplate wipes clean. assets/pip.svg publishes these ids for exactly this beat. */
function restorePipSprite() {
  const text = document.getElementById('pip-nameplate-text');
  if (text) {
    text.textContent = NAMEPLATE;
    text.setAttribute('font-size', '6.4');
    text.setAttribute('letter-spacing', '0');
    text.setAttribute('textLength', '68');
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    text.setAttribute('fill', '#2f3849');
  }
  for (const id of ['pip-nameplate-scuff', 'pip-core-crack']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.transition = 'opacity 1.6s ease';
    el.style.opacity = '0';
  }
}

const dock = {
  title: "PIP's charging dock",
  closeOnSolve: false,          // the reboot sweep and the nameplate wipe play in here first
  mount(container, api) {
    ensureStyle();
    armFinale(api);
    const wrap = box('nvb-wrap', container);
    wrap.style.setProperty('--nvb-rows', '124px');  // tray + note + two 12px gaps, plus slack
    const stage = box('', wrap);
    stage.style.position = 'relative';

    const svg = node('svg', { viewBox: '0 0 560 300', width: '100%', class: 'nvb-fit' }, stage);
    svg.style.cssText = 'border-radius:14px;background:oklch(21% 0.03 250);--nvb-ar:1.8667;';
    const sweep = box('nvb-sweep', stage);
    sweep.style.borderRadius = '14px';

    node('rect', { x: 40, y: 34, width: 480, height: 232, rx: 20, fill: 'oklch(26% 0.035 250)' }, svg);
    node('rect', { x: 40, y: 34, width: 480, height: 232, rx: 20, fill: 'none', stroke: 'oklch(44% 0.045 250)', 'stroke-width': 5 }, svg);
    node('text', {
      x: 280, y: 70, 'text-anchor': 'middle', fill: 'oklch(80% 0.02 250)',
      'font-family': 'ui-monospace, monospace', 'font-size': 15, 'letter-spacing': 3,
    }, svg).textContent = 'MEMORY DOCK';

    const slotUi = SLOT_WAVES.map((wave, i) => {
      const x = 96 + i * 148;
      const g = node('g', { style: 'cursor:pointer' }, svg);
      const bay = node('rect', {
        x, y: 104, width: 116, height: 132, rx: 16,
        fill: 'oklch(28% 0.05 205)', stroke: 'oklch(56% 0.08 200)', 'stroke-width': 3,
      }, g);
      const glow = node('rect', { x, y: 104, width: 116, height: 132, rx: 16, fill: 'oklch(84% 0.15 190)', opacity: 0 }, g);
      const etch = node('path', {
        d: WAVE_PATH[wave], fill: 'none', stroke: 'oklch(80% 0.10 190)', 'stroke-width': 3.4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.62,
        transform: `translate(${x + 36} 152) scale(1.05)`,
      }, g);
      const chip = node('path', {
        d: `M${x + 58} 118l40 34-40 34-40-34z`, fill: 'oklch(84% 0.15 190)', opacity: 0,
      }, g);
      g.addEventListener('click', () => tryInsert(i));
      return { g, bay, glow, etch, chip, wave };
    });

    const tray = box('nvb-tray', wrap);
    const note = box('nvb-note', wrap, 'p');

    let selected = null;
    const shardUi = [1, 2, 3].map((num) => {
      const wave = SHARD_WAVES[num];
      const el = box('nvb-shard', tray, 'button');
      el.type = 'button';
      el.appendChild(waveSvg(wave, 'oklch(88% 0.14 190)'));
      const label = box('', el, 'span');
      label.textContent = `SHARD ${num}`;
      const mark = box('nvb-mark', el, 'span');
      el.addEventListener('click', () => {
        if (el.classList.contains('nvb-locked') || el.classList.contains('nvb-gone')) return;
        selected = selected === wave ? null : wave;
        api.play('click');
        paint();
      });
      return { el, wave, num, mark };
    });

    function slotFilled(i) {
      const slots = (api.getState() || {}).slots || [];
      return Boolean(slots[i]);
    }

    /** True while she is actually holding this tray shard. Shard 3 has to be taken off the
     *  wall first — that is what the pinned hint means by "take the shard". */
    function shardInHand(num) {
      const item = SHARD_ITEMS[num];
      if (item) return api.hasItem(item);
      return (api.getState() || {}).taken === true;
    }

    function tryInsert(i) {
      // A shard carried in from the HUD strip drops straight into the slot; otherwise the
      // selected tray shard goes in.
      const held = api.held();
      const heldWave = held ? HELD_WAVES[held] : null;
      const wave = heldWave || selected;
      if (!wave) {
        api.play('click');
        note.textContent = 'Pick a shard first — then a slot.';
        return;
      }
      const landed = api.dispatchTo('bridge-memory', 'insert', { slot: i, wave });
      if (landed && slotFilled(i) && heldWave) api.useHeld();
      selected = null;
      paint();
    }

    function paint() {
      const state = api.getState() || {};
      const slots = state.slots || [];
      slotUi.forEach((ui, i) => {
        const full = Boolean(slots[i]);
        ui.chip.setAttribute('opacity', full ? '1' : '0');
        ui.glow.setAttribute('opacity', full ? '0.14' : '0');
        ui.etch.setAttribute('opacity', full ? '0.2' : '0.62');
        ui.bay.setAttribute('stroke', full ? 'oklch(84% 0.15 190)' : 'oklch(56% 0.08 200)');
      });
      shardUi.forEach((ui) => {
        const gone = (slots || []).includes(ui.wave);
        const locked = ui.num === 3 && !shardInHand(3);
        ui.el.classList.toggle('nvb-gone', gone);
        ui.el.classList.toggle('nvb-locked', !gone && locked);
        ui.el.classList.toggle('nvb-on', !gone && selected === ui.wave);
        // Only ever a positive claim: a blank mark on a chip she can still click says
        // nothing, where "not yet" on a clickable chip would be a lie.
        ui.mark.textContent = gone ? 'in PIP' : (shardInHand(ui.num) ? 'in hand' : '');
      });
      if (api.flags()['memory-restored'] === true) {
        note.textContent = 'All of me, back where it goes.';
      } else if (!shardInHand(3)) {
        note.textContent = state.portraitOpen === true
          ? "It's right there behind his portrait, Commander. Take it."
          : 'Two shards here. The third is somewhere on this bridge.';
      } else {
        note.textContent = 'Match each shard to the wave etched on its slot.';
      }
    }

    let closeTimer = 0;
    api.on('flag', (e) => {
      if (e.name !== 'memory-restored' || e.value !== true) return;
      sweep.classList.add('nvb-go');
      restorePipSprite();
      const r = stage.getBoundingClientRect();
      api.sparkle(r.left + r.width / 2, r.top + r.height / 2);
      closeTimer = setTimeout(() => api.close(), 5200);
      paint();
    });
    api.on('*', paint);
    paint();

    return () => { if (closeTimer) clearTimeout(closeTimer); };
  },
};

// ===========================================================================================
// bridge-launch — four guarded switches in any order, then the throttle.
// The confirm itself is typed at the terminal.
// ===========================================================================================

const launch = {
  title: 'Launch board',
  mount(container, api) {
    ensureStyle();
    armFinale(api);
    const wrap = box('nvb-wrap', container);
    wrap.style.setProperty('--nvb-rows', '53px');   // readout + one 12px gap, plus slack
    const svg = node('svg', { viewBox: '0 0 560 340', width: '100%', class: 'nvb-fit' }, wrap);
    svg.style.cssText = 'border-radius:14px;background:oklch(23% 0.03 250);touch-action:none;';

    node('rect', { x: 24, y: 24, width: 512, height: 292, rx: 18, fill: 'oklch(27% 0.035 250)' }, svg);

    const bays = [];
    for (let i = 0; i < SWITCH_COUNT; i += 1) {
      const x = 52 + i * 92;
      const g = node('g', { style: 'cursor:pointer' }, svg);
      node('rect', { x, y: 66, width: 74, height: 168, rx: 12, fill: 'oklch(31% 0.04 250)' }, g);
      node('rect', { x: x + 22, y: 140, width: 30, height: 74, rx: 15, fill: 'oklch(20% 0.03 250)' }, g);
      const lever = node('rect', { x: x + 24, y: 142, width: 26, height: 34, rx: 13, fill: 'oklch(62% 0.06 250)' }, g);
      const lamp = node('circle', { cx: x + 37, cy: 106, r: 9, fill: 'oklch(45% 0.03 250)' }, g);
      const cover = node('rect', {
        x: x + 8, y: 60, width: 58, height: 168, rx: 12,
        fill: 'oklch(76% 0.14 65)', opacity: 0.92,
      }, g);
      node('text', {
        x: x + 37, y: 258, 'text-anchor': 'middle', fill: 'oklch(80% 0.02 250)',
        'font-family': 'ui-monospace, monospace', 'font-size': 13,
      }, g).textContent = `S${i + 1}`;
      g.addEventListener('click', () => {
        const state = api.getState() || {};
        if (!(state.covers || [])[i]) api.dispatch('cover', { i });
        else api.dispatch('flip', { i });
        paint();
      });
      bays.push({ cover, lever, lamp });
    }

    // throttle
    node('rect', { x: 432, y: 60, width: 84, height: 220, rx: 20, fill: 'oklch(20% 0.03 250)' }, svg);
    const fill = node('rect', { x: 440, y: 268, width: 68, height: 4, rx: 6, fill: 'oklch(80% 0.16 150)', opacity: 0.5 }, svg);
    const knob = node('rect', { x: 428, y: 244, width: 92, height: 34, rx: 16, fill: 'oklch(66% 0.07 250)', style: 'cursor:grab' }, svg);
    node('text', {
      x: 474, y: 306, 'text-anchor': 'middle', fill: 'oklch(80% 0.02 250)',
      'font-family': 'ui-monospace, monospace', 'font-size': 13, 'letter-spacing': 2,
    }, svg).textContent = 'THROTTLE';

    const readout = box('nvb-note', wrap, 'p');

    const TOP = 62;
    const BOTTOM = 244;
    let dragging = false;
    let lastSent = -1;

    function paint() {
      const state = api.getState() || {};
      const covers = state.covers || [];
      const switches = state.switches || [];
      bays.forEach((bay, i) => {
        bay.cover.setAttribute('opacity', covers[i] ? '0' : '0.92');
        bay.lever.setAttribute('y', switches[i] ? '196' : '142');
        bay.lever.setAttribute('fill', switches[i] ? 'oklch(84% 0.16 150)' : 'oklch(62% 0.06 250)');
        bay.lamp.setAttribute('fill', switches[i] ? 'oklch(84% 0.16 150)' : 'oklch(45% 0.03 250)');
      });
      const value = typeof state.throttle === 'number' ? state.throttle : 0;
      const y = BOTTOM - (value / FULL_THROTTLE) * (BOTTOM - TOP);
      knob.setAttribute('y', y);
      fill.setAttribute('y', y + 30);
      fill.setAttribute('height', Math.max(4, 278 - (y + 30)));
      const on = switches.filter(Boolean).length;
      readout.textContent = api.flags().WIN === true
        ? 'Clamps released. Go well, Commander.'
        : `Switches ${on}/${SWITCH_COUNT} · throttle ${value}%` +
          (on === SWITCH_COUNT && value >= FULL_THROTTLE ? ' · now type  launch confirm  at the console' : '');
    }

    function valueAt(clientY) {
      const r = svg.getBoundingClientRect();
      const local = ((clientY - r.top) / r.height) * 340;
      const raw = ((BOTTOM - local) / (BOTTOM - TOP)) * FULL_THROTTLE;
      return Math.max(0, Math.min(FULL_THROTTLE, Math.round(raw / 10) * 10));
    }

    function onMove(e) {
      if (!dragging) return;
      const value = valueAt(e.clientY);
      if (value === lastSent) return;
      lastSent = value;
      // The widget owns this sound: the pitch rides the throttle, which `emits` cannot express.
      api.play('crank', { progress: value / FULL_THROTTLE });
      api.dispatch('throttle', { value });
      paint();
    }

    function endDrag() {
      dragging = false;
      knob.setAttribute('style', 'cursor:grab');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    }

    knob.addEventListener('pointerdown', (e) => {
      const state = api.getState() || {};
      if (!(state.switches || []).every(Boolean)) {
        api.dispatch('throttle', { value: FULL_THROTTLE });   // blocked: PIP says why
        return;
      }
      dragging = true;
      lastSent = -1;
      knob.setAttribute('style', 'cursor:grabbing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      onMove(e);
    });

    api.on('flag', paint);
    paint();

    return () => endDrag();
  },
};

// ===========================================================================================
// THE FINALE — countdown, undock, certificate. api.present() is the full-screen surface;
// never hand-roll one against the renderer's z-stack.
//
// Once the sequence starts it owns itself: the close-up underneath may be torn down (Esc
// closes it even while this is up) and the countdown must not die with it. Every step checks
// that its own DOM is still connected instead.
//
// The surface is OPAQUE and sits at z70, above the z55 dialogue bubble — so api.say() during
// the finale is speech into a box nobody can see. Every line this sequence speaks, including
// the pinned radio call, goes through `caption()` and lands on the surface itself.
//
// `launch confirm` typed again after WIN brings the certificate back (showCertificateAgain):
// it is the only thing in the game she may want a second look at, and it used to be
// unrecoverable the moment she pressed "back to the bridge".
// ===========================================================================================

// ---- arming: the finale belongs to the ROOM, not to whichever panel happens to be open ----
// It used to be registered with api.on() inside the terminal's mount, and api.on() drops every
// subscription at unmount. `launch confirm` is typed at the console today, so the console
// happened to be up when WIN landed — but that is a fact about the current flow, not a
// guarantee: reach WIN with the launch board open instead (where the switches and the throttle
// live) and the game reached its ending with no countdown, no radio call, no certificate and
// no error. Nothing happened at all, silently, at the one moment the whole game is for.
//
// So the listener is taken out AT THE GAME, exactly once, by whichever bridge close-up mounts
// first — and every action on the way to WIN is performed inside one, so it is always armed
// before it can be needed. It then survives every unmount, and being a singleton it cannot
// double-fire when the terminal is the panel that is open. The captured `api` is only used for
// present/play/sparkle, which belong to the renderer and outlive the widget that handed them
// over.
let finale = null;    // { game, off } — at most one listener, ever

function novaGame() {
  const nova = typeof window === 'undefined' ? null : window.stationNova;
  return nova && nova.game && typeof nova.game.subscribe === 'function' ? nova.game : null;
}

function disarmFinale() {
  if (!finale) return;
  const { off } = finale;
  finale = null;
  off();
}

function armFinale(api) {
  const game = novaGame();
  if (!game) return;                            // no handle published yet — nothing to arm at
  if (finale && finale.game === game) return;   // already armed for this game
  disarmFinale();                               // a rebooted game: move the listener to it
  const off = game.subscribe((e) => {
    if (!e || e.type !== 'flag') return;
    // The bridge is the last room; leaving it means the game restarted underneath us.
    if (e.name === 'module' && e.value !== 'bridge') { disarmFinale(); return; }
    if (e.name !== 'WIN' || e.value !== true) return;
    disarmFinale();                             // WIN latches: this runs once and is then done
    // A raw game.subscribe has none of the renderer's guard rails, and a throw here would come
    // back at whoever dispatched as a SubscriberError. Nothing the finale does may make the
    // command she typed look like it failed.
    try { runFinale(api); } catch (err) { console.warn('[station-nova] finale', err); }
  });
  finale = { game, off };
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function readElapsed() {
  const nova = typeof window === 'undefined' ? null : window.stationNova;
  const renderer = nova && nova.renderer;
  const ms = renderer && typeof renderer.elapsed === 'function' ? renderer.elapsed() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function pipSaluting(parent) {
  const svg = node('svg', { viewBox: '0 0 120 120', width: '92', height: '92' }, parent);
  node('ellipse', { cx: 60, cy: 108, rx: 30, ry: 6, fill: 'oklch(92% 0.02 250)', opacity: 0.12 }, svg);
  node('rect', { x: 24, y: 34, width: 72, height: 62, rx: 24, fill: 'oklch(72% 0.03 250)' }, svg);
  node('rect', { x: 33, y: 45, width: 54, height: 34, rx: 15, fill: 'oklch(26% 0.04 250)' }, svg);
  node('circle', { cx: 49, cy: 62, r: 6.5, fill: 'oklch(84% 0.16 150)' }, svg);
  node('circle', { cx: 71, cy: 62, r: 6.5, fill: 'oklch(84% 0.16 150)' }, svg);
  node('path', { d: 'M52 76q8 7 16 0', stroke: 'oklch(84% 0.16 150)', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, svg);
  node('path', { d: 'M60 34V20', stroke: 'oklch(72% 0.03 250)', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
  node('circle', { cx: 60, cy: 15, r: 7, fill: 'oklch(84% 0.16 150)' }, svg);
  // the salute
  node('path', { d: 'M96 62l18-22', stroke: 'oklch(72% 0.03 250)', 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }, svg);
  node('path', { d: 'M22 66l-14 14', stroke: 'oklch(72% 0.03 250)', 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }, svg);
  return svg;
}

/** The surface, its teardown discipline, and the caption strip that puts a line ON TOP of it.
 *  api.say() during a presentation goes to the z55 bubble, which is underneath this opaque
 *  z70 sheet — three authored lines, one of them pinned, were invisible 100% of the time. */
function openFinale(api, { escapable }) {
  ensureStyle();
  const timers = [];
  let stopped = false;
  const surface = api.present({
    title: 'Launch',
    escapable,
    onClose() { stopped = true; timers.forEach(clearTimeout); },
  });
  const root = box('nvb-fin', surface.el);
  const alive = () => !stopped && root.isConnected;
  // Every timer is tracked AND gated: onClose cancels them, and a late one that slipped
  // through still checks that this surface is the one still on screen.
  const at = (ms, fn) => { timers.push(setTimeout(() => { if (alive()) fn(); }, ms)); };

  const line = box('nvb-say', root);
  line.setAttribute('role', 'status');
  line.setAttribute('aria-live', 'polite');
  const who = box('nvb-say-who', line, 'span');
  const what = box('nvb-say-text', line, 'span');
  const caption = (text, speaker) => {
    who.textContent = speaker || '';
    who.style.display = speaker ? '' : 'none';
    what.textContent = text;
    line.classList.add('nvb-on');
  };

  return { surface, root, at, caption };
}

/** Where the planet ends up once UNICORN-1 has left. */
const DEPARTED = 'translate(-900px, 260px) scale(0.55)';

/** The starfield and the planet. `departed` draws them already streaked and swung away, so
 *  the certificate looks the same when she asks for it again later. */
function buildSky(root, departed) {
  const sky = node('svg', { viewBox: '0 0 1200 700', preserveAspectRatio: 'xMidYMid slice' }, root);
  sky.setAttribute('class', 'nvb-fin-sky');
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    const x = (i * 271) % 1190 + 5;
    const y = (i * 163) % 690 + 5;
    const star = node('rect', {
      x, y, width: 3, height: 2, rx: 1, fill: 'oklch(96% 0.02 250)', opacity: 0.2 + (i % 5) * 0.14,
    }, sky);
    // CSS transforms work on SVG elements everywhere; animating the width attribute does not.
    star.style.cssText = 'transform-box:fill-box;transform-origin:center;transition:transform 2.4s ease-in';
    if (departed) star.style.transform = `scaleX(${8 + (i % 5) * 7})`;
    stars.push(star);
  }
  const planet = node('g', {}, sky);
  node('circle', { cx: 600, cy: 470, r: 300, fill: 'oklch(44% 0.11 262)' }, planet);
  node('circle', { cx: 520, cy: 400, r: 96, fill: 'oklch(56% 0.09 210)', opacity: 0.4 }, planet);
  node('ellipse', { cx: 600, cy: 470, rx: 430, ry: 70, fill: 'none', stroke: 'oklch(78% 0.08 90)', 'stroke-width': 12, opacity: 0.32, transform: 'rotate(-12 600 470)' }, planet);
  planet.style.transition = 'transform 3.4s cubic-bezier(.4,0,.2,1)';
  if (departed) planet.style.transform = DEPARTED;
  return { stars, planet };
}

function runFinale(api) {
  const { surface, root, at, caption } = openFinale(api, { escapable: false });
  const { stars, planet } = buildSky(root, false);

  const count = box('nvb-count', root, 'div');
  const big = box('', count, 'span');
  const sub = box('', count, 'small');
  sub.textContent = 'UNICORN-1 · LAUNCH SEQUENCE';

  // PIP is talking to her through the bubble she cannot see, so he says it up here too.
  caption(PIP.win, 'PIP');

  for (let t = 10; t >= 1; t -= 1) {
    at((10 - t) * 1000, () => {
      big.textContent = `T-${t}`;
      api.play(t > 4 ? 'click' : 'rumble');
      if (t <= 4) count.classList.add('nvb-shakes');
    });
  }
  // [pinned] the radio crackle
  at(4200, () => caption(RADIO_CLEARANCE, 'Radio'));

  at(10000, () => {
    big.textContent = 'GO';
    api.play('whoosh');
    planet.style.transform = DEPARTED;
    stars.forEach((star, i) => { star.style.transform = `scaleX(${8 + (i % 5) * 7})`; });
  });

  at(12200, () => {
    count.classList.remove('nvb-shakes');
    count.remove();
    api.play('chime');
    showCertificate(root, api, surface, at, caption);
  });
}

/** `launch confirm` typed again after WIN. Same certificate, same sky, no countdown — and
 *  escapable, because nothing is being interrupted this time. */
function showCertificateAgain(api) {
  const { surface, root, at, caption } = openFinale(api, { escapable: true });
  buildSky(root, true);
  api.play('chime');
  showCertificate(root, api, surface, at, caption);
}

function showCertificate(root, api, surface, at, caption) {
  const wrap = box('nvb-cert-wrap', root);
  const cert = box('nvb-cert', wrap);
  const h1 = box('', cert, 'h1');
  h1.textContent = CERTIFICATE.station;
  const h2 = box('', cert, 'h2');
  h2.textContent = CERTIFICATE.title;
  const name = box('nvb-name', cert, 'p');
  name.textContent = CERTIFICATE.name;
  const time = box('nvb-time', cert, 'p');
  time.textContent = `TIME ${formatClock(readElapsed())}`;
  const pipRow = box('', cert);
  pipRow.style.cssText = 'display:flex;justify-content:center;margin-top:14px;';
  pipSaluting(pipRow);
  const wit = box('nvb-wit', cert, 'p');
  wit.textContent = CERTIFICATE.witness;
  // The surface is deliberately not Esc-closable — nothing may interrupt a launch — so the
  // certificate carries its own way out as well as the way round again.
  const row = box('nvb-row', cert);
  const again = box('nvb-again', row, 'button');
  again.type = 'button';
  again.textContent = 'play again';
  // A bare reload lands on the title screen with Continue offering the FINISHED game back —
  // "play again" visibly not playing again. P7's glue owns the real restart (drop the save,
  // then reboot); the reload stays as the fallback if the handle is not there.
  again.addEventListener('click', () => {
    const nova = typeof window === 'undefined' ? null : window.stationNova;
    if (nova && typeof nova.playAgain === 'function') { nova.playAgain(); return; }
    window.location.reload();
  });
  const stay = box('nvb-again', row, 'button');
  stay.type = 'button';
  stay.textContent = 'back to the bridge';
  stay.addEventListener('click', () => surface.close());

  const r = wrap.getBoundingClientRect();
  api.sparkle(r.left + r.width * 0.5, r.top + 20);
  // Tracked and gated like every other step: "back to the bridge" inside 700 ms used to make
  // PIP say the certificate line at her on the bridge.
  at(700, () => caption(PIP.certificate, 'PIP'));
}

export default {
  'bridge-boot': terminal,
  'bridge-memory': dock,
  'bridge-launch': launch,
};
