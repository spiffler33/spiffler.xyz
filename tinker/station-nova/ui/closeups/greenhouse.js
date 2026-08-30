// STATION NOVA — bespoke close-up widgets for the GREENHOUSE module.  (P5 owns this file.)
//
// ui/renderer.js is generic and never learns about a specific puzzle. Everything that needs
// custom interaction — three 0-10 detented lamp sliders, valve toggles on a pipe diagram,
// a pannable telescope with a reticle, a press-and-hold pressure gauge, and the 6-second
// tube ride (api.present) — lives here. P5 never edits ui/renderer.js.
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

import { clampDt } from '../renderer.js';
import { LAMPS, RECIPE, MAX_DETENT } from '../../engine/puzzles/green-bloom.js';
import { VALVES } from '../../engine/puzzles/green-valves.js';
import { CONSTELLATIONS, FIELD, TOLERANCE } from '../../engine/puzzles/green-stars.js';
import { BAND, inBand } from '../../engine/puzzles/green-tube.js';
import { PINNED, NUDGES } from '../../engine/script/green.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function node(tag, attrs, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k of Object.keys(attrs || {})) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function div(parent, css, text) {
  const d = document.createElement('div');
  if (css) d.style.cssText = css;
  if (text !== undefined) d.textContent = text;
  if (parent) parent.appendChild(d);
  return d;
}

function button(parent, text, css) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.style.cssText =
    'appearance:none;border:1px solid oklch(70% .15 170);border-radius:999px;cursor:pointer;' +
    'background:oklch(30% .06 165);color:oklch(94% .04 160);letter-spacing:.16em;' +
    'font:600 14px/1 system-ui,sans-serif;padding:13px 26px;transition:background .16s ease;' +
    (css || '');
  b.addEventListener('pointerenter', () => { b.style.background = 'oklch(38% .08 168)'; });
  b.addEventListener('pointerleave', () => { b.style.background = 'oklch(30% .06 165)'; });
  if (parent) parent.appendChild(b);
  return b;
}

// One <style> per widget, removed with it. Keyframe names are namespaced: the sheet is
// document-scoped, so an un-prefixed name would collide with the renderer's own.
function sheet(parent, css) {
  const tag = document.createElement('style');
  tag.textContent = css;
  parent.appendChild(tag);
  return tag;
}

const centreOf = (el) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};

const CAPTION = 'flex:0 0 auto;margin:12px 0 0;text-align:center;font:400 13.5px/1.55 system-ui,sans-serif;color:oklch(74% .02 250)';

// EVERY widget in here is a flex column that shrinks, and every tall thing inside it is a flex
// item that can shrink with it. `container` IS the overlay's scrolling body, whose height the
// renderer caps at min(92vh, 100vh - 6vh - dockband) — 356px of usable content on a 1152x720
// laptop. A fixed-size widget silently falls off the bottom of that (the telescope's CHART
// button did, at every laptop size), so nothing here is sized in fixed pixels: the growable
// element carries `flex: 1 1 <comfortable>px` over a small `min-height` floor, and the SVGs —
// which have viewBoxes, and therefore scale into any box — do the rest.
const SHELL = 'box-sizing:border-box;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;' +
  'padding:18px 22px 20px';

/** That cap is real but it is not a DEFINITE height, so `height: 100%` inside the body resolves
 *  to auto (measured: a 505px widget sitting in a 356px body, its last 149px unreachable). Flex
 *  sizing does not care: make the body a column and its used height becomes the budget every
 *  SHELL below is laid out against. Restored on unmount — the renderer reuses this one element
 *  for every close-up in the game, and cargo's and the bridge's widgets expect it plain. */
function fitToPanel(container) {
  const had = container.getAttribute('style');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  return () => {
    if (had === null) container.removeAttribute('style');
    else container.setAttribute('style', had);
  };
}

// A tiny deterministic generator, so the sky and the tube ride look the same every visit.
function minstd(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
}

// ===========================================================================================
// green-bloom — three lamp faders over the vault-flower.
// The engine owns the per-detent click (emits.setLamp), so this widget never plays one.
// ===========================================================================================

const LAMP_LOOK = {
  sun: { label: 'SUN', colour: 'oklch(84% 0.16 90)' },
  leaf: { label: 'LEAF', colour: 'oklch(75% 0.16 165)' },
  moon: { label: 'MOON', colour: 'oklch(80% 0.10 265)' },
};

const bloom = {
  title: 'Vault-flower lamps',
  closeOnSolve: false,        // the rainbow sweep is the reward — let it finish first
  mount(container, api) {
    const root = div(container, SHELL);
    sheet(root, `
      @keyframes gh-bloom-rainbow { from { filter: hue-rotate(0deg) } to { filter: hue-rotate(360deg) } }
      @media (prefers-reduced-motion: reduce) { .gh-bloom-win { animation: none !important } }
    `);

    // the recipe card, clipped to the pot
    const card = div(root,
      'flex:0 0 auto;margin:0 auto 14px;max-width:430px;padding:11px 18px;border-radius:10px;text-align:center;' +
      'background:oklch(92% .04 100);color:oklch(32% .05 90);box-shadow:0 8px 24px rgb(0 0 0/.35);' +
      'font:600 15px/1.5 system-ui,sans-serif;letter-spacing:.02em');
    div(card, 'font:700 10px/1 system-ui,sans-serif;letter-spacing:.24em;opacity:.6;margin-bottom:6px', 'RECIPE CARD');
    div(card, '', PINNED.recipeCard);

    const row = div(root,
      'flex:1 1 300px;min-height:150px;display:flex;gap:26px;align-items:center;justify-content:center');

    // ---- the flower ----
    const art = node('svg', { viewBox: '0 0 260 300' }, row);
    art.style.cssText = 'flex:0 1 auto;display:block;height:100%;width:auto;max-width:260px;min-height:0';
    const defs = node('defs', {}, art);
    defs.innerHTML =
      '<radialGradient id="gh-b-halo" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="oklch(70% .18 320)" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="oklch(70% .18 320)" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="gh-b-petal" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="oklch(92% .11 330)"/><stop offset="100%" stop-color="oklch(66% .19 318)"/></linearGradient>';
    const halo = node('circle', { cx: 130, cy: 120, r: 120, fill: 'url(#gh-b-halo)', opacity: '0.25' }, art);
    node('path', { d: 'M92 300h76l10-42H82z', fill: 'oklch(38% .05 300)' }, art);
    node('rect', { x: 86, y: 208, width: 88, height: 56, rx: 12, fill: 'oklch(30% .05 300)' }, art);
    node('path', { d: 'M130 214 122 190 130 120 138 190z', fill: 'oklch(48% .11 168)' }, art);

    const petals = node('g', { opacity: '0' }, art);
    for (let i = 0; i < 7; i += 1) {
      node('ellipse', {
        cx: 130, cy: 74, rx: 25, ry: 48,
        fill: 'url(#gh-b-petal)',
        transform: `rotate(${(360 / 7) * i} 130 122)`,
      }, petals);
    }
    node('circle', { cx: 130, cy: 122, r: 24, fill: 'oklch(92% .14 96)' }, petals);
    node('circle', { cx: 130, cy: 122, r: 14, fill: 'oklch(80% .16 60)' }, petals);
    petals.style.cssText = 'transform-box:fill-box;transform-origin:50% 78%;transition:opacity .5s ease,transform .7s cubic-bezier(.2,.9,.25,1)';

    const bud = node('g', {}, art);
    node('path', { d: 'M130 66c26 0 44 33 44 69s-19 62-44 62-44-26-44-62 18-69 44-69z', fill: 'oklch(50% .12 300)' }, bud);
    node('path', { d: 'M130 66c-14 0-24 17-28 42 8-10 18-16 28-16z', fill: 'oklch(74% .14 305)', opacity: '0.55' }, bud);
    node('path', { d: 'M110 120c8 22 32 25 40 0', fill: 'none', stroke: 'oklch(30% .08 300)', 'stroke-width': '3.4', opacity: '.6' }, bud);
    bud.style.cssText = 'transition:opacity .6s ease';

    // ---- the three faders ----
    const faders = div(row,
      'flex:1 1 340px;min-width:280px;min-height:0;display:flex;flex-direction:column;gap:10px');
    const knobs = {};

    LAMPS.forEach((lamp) => {
      const look = LAMP_LOOK[lamp];
      const wrap = div(faders, 'flex:1 1 auto;min-height:42px;display:flex;flex-direction:column');
      const head = div(wrap, 'flex:0 0 auto;display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px');
      div(head, `font:700 11px/1 system-ui,sans-serif;letter-spacing:.22em;color:${look.colour}`, look.label);
      const read = div(head, 'font:600 13px/1 ui-monospace,monospace;color:oklch(86% .03 160)', '50%');

      const track = div(wrap,
        'position:relative;flex:1 1 38px;min-height:22px;max-height:38px;border-radius:19px;cursor:pointer;' +
        'touch-action:none;background:oklch(24% .03 200);border:1px solid oklch(40% .04 200)');
      for (let i = 0; i <= MAX_DETENT; i += 1) {
        div(track,
          `position:absolute;top:26%;bottom:26%;width:2px;border-radius:1px;pointer-events:none;` +
          `left:calc(${(i / MAX_DETENT) * 100}% - 1px);background:oklch(58% .03 200);opacity:${i % 5 === 0 ? '.85' : '.4'}`);
      }
      const fill = div(track,
        `position:absolute;left:3px;top:3px;bottom:3px;border-radius:16px;pointer-events:none;` +
        `background:${look.colour};opacity:.25;transition:width .12s ease`);
      // top/bottom rather than a fixed height: the track shrinks on a short laptop panel and the
      // knob has to shrink with it, or it overhangs into the fader below.
      const knob = div(track,
        `position:absolute;top:-5px;bottom:-5px;width:32px;border-radius:14px;pointer-events:none;` +
        `background:${look.colour};box-shadow:0 4px 14px rgb(0 0 0/.5);transition:left .12s ease`);
      knobs[lamp] = { read, fill, knob, track };

      const setFromPointer = (e) => {
        const r = track.getBoundingClientRect();
        if (r.width <= 0) return;
        const t = (e.clientX - r.left) / r.width;
        api.dispatch('setLamp', { lamp, value: t * MAX_DETENT });
        paint();
      };
      let dragging = false;
      const onMove = (e) => { if (dragging) setFromPointer(e); };
      const onUp = () => {
        dragging = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      track.addEventListener('pointerdown', (e) => {
        dragging = true;
        setFromPointer(e);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
      knobs[lamp].release = onUp;
    });

    const note = document.createElement('p');
    note.style.cssText = CAPTION;
    note.textContent = 'Slide each lamp to the notch the card asks for.';
    root.appendChild(note);

    let closeTimer = 0;
    let won = false;

    function paint() {
      const s = api.getState() || {};
      let error = 0;
      LAMPS.forEach((lamp) => {
        const value = typeof s[lamp] === 'number' ? s[lamp] : 0;
        error += Math.abs(value - RECIPE[lamp]);
        const k = knobs[lamp];
        const pct = (value / MAX_DETENT) * 100;
        k.read.textContent = `${value * 10}%`;
        k.fill.style.width = `calc(${pct}% - 6px)`;
        k.knob.style.left = `calc(${pct}% - 16px)`;
      });
      // Warmth, not an oracle: the bud only leans open, and never far, until it is right.
      const close = Math.max(0, 1 - error / 12);
      if (!won) {
        halo.setAttribute('opacity', String(0.2 + close * 0.35));
        petals.style.opacity = String(close * 0.4);
        petals.style.transform = `scale(${0.45 + close * 0.25})`;
      }
    }

    // `live` is the moment it happens. Coming back to look at it again is lovely, but it is
    // not a reward moment: no sparkle, no rainbow, no backing out from under her.
    function celebrate(live) {
      if (won) return;
      won = true;
      bud.style.opacity = '0';
      petals.style.opacity = '1';
      petals.style.transform = 'none';
      halo.setAttribute('opacity', '0.85');
      note.textContent = 'The vault-flower is open. Something brass is sitting in it.';
      if (!live) return;
      petals.classList.add('gh-bloom-win');
      petals.style.animation = 'gh-bloom-rainbow 6s linear 1';
      const [x, y] = centreOf(art);
      api.sparkle(x, y);
      closeTimer = window.setTimeout(() => api.close(), 3400);
    }

    api.on('flag', (e) => { if (e.name === 'vault-open') celebrate(true); });
    paint();
    if (api.isSolved()) celebrate(false);
    const unfit = fitToPanel(container);

    return () => {
      unfit();
      if (closeTimer) clearTimeout(closeTimer);
      LAMPS.forEach((lamp) => knobs[lamp].release());
    };
  },
};

// ===========================================================================================
// green-valves — the manifold, drawn plainly. A tree, never a maze.
// The engine owns every sound here (squeak / clunk / wrong) and every warning line.
// ===========================================================================================

// x, y of each valve wheel on the 900x420 diagram.
const VALVE_AT = {
  A: [250, 64], B: [430, 140], C: [250, 240], D: [430, 240], E: [530, 186], F: [250, 372],
};

// Every pipe run, and which flags have to be open for water to be in it.
const SEGMENTS = [
  { d: 'M114 240 150 240', needs: [] },
  { d: 'M150 64 150 372', needs: [] },
  { d: 'M150 64 250 64', needs: [] },
  { d: 'M250 64 700 64', needs: ['A'] },
  { d: 'M330 64 330 140 430 140', needs: ['A'] },
  { d: 'M430 140 700 140', needs: ['A', 'B'] },
  { d: 'M150 240 250 240', needs: [] },
  { d: 'M250 240 430 240', needs: ['C'] },
  { d: 'M430 240 700 240', needs: ['C', 'D'] },
  { d: 'M580 240 580 306 700 306', needs: ['C', 'D'] },
  { d: 'M490 240 490 186 530 186', needs: ['C', 'D'] },
  { d: 'M530 186 700 186', needs: ['C', 'D', 'E'] },
  { d: 'M150 372 250 372', needs: [] },
  { d: 'M250 372 700 372', needs: ['F'] },
];

const valves = {
  title: 'Irrigation manifold',
  mount(container, api) {
    const root = div(container, SHELL);
    sheet(root, `
      @keyframes gh-flow { to { stroke-dashoffset: -44 } }
      .gh-v-flow { stroke-dasharray: 20 24; animation: gh-flow 1.1s linear infinite; }
      @keyframes gh-zap { 0%,100% { opacity: 1 } 25%,75% { opacity: .25 } }
      .gh-v-zap { animation: gh-zap .5s ease 2; }
      @keyframes gh-socket { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
      .gh-v-wants { animation: gh-socket 1.4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .gh-v-flow, .gh-v-zap, .gh-v-wants { animation: none } }
    `);

    const svg = node('svg', { viewBox: '0 0 900 420' }, root);
    svg.style.cssText = 'flex:1 1 380px;min-height:170px;width:100%;display:block;touch-action:none';

    node('rect', { x: 34, y: 194, width: 80, height: 92, rx: 14, fill: 'oklch(46% .04 220)' }, svg);
    node('rect', { x: 46, y: 206, width: 56, height: 44, rx: 8, fill: 'oklch(66% .10 215)' }, svg);
    node('text', { x: 74, y: 302, 'text-anchor': 'middle', fill: 'oklch(80% .03 200)',
      style: 'font:600 13px/1 system-ui,sans-serif;letter-spacing:.14em' }, svg).textContent = 'SOURCE';

    // pipes: a dull steel run with a live water run painted over it
    const dry = node('g', { fill: 'none', stroke: 'oklch(44% .02 220)', 'stroke-width': '15', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const wet = node('g', { fill: 'none', stroke: 'oklch(76% .12 210)', 'stroke-width': '9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const flows = SEGMENTS.map((seg) => {
      node('path', { d: seg.d }, dry);
      const live = node('path', { d: seg.d, opacity: '0', class: 'gh-v-flow' }, wet);
      return { seg, live };
    });

    // destinations
    const beds = [
      { y: 40, name: 'PLANTER 1', seg: ['A'] },
      { y: 216, name: 'PLANTER 2', seg: ['C', 'D'] },
      { y: 282, name: 'PLANTER 3', seg: ['C', 'D'] },
      { y: 348, name: 'PLANTER 4', seg: ['F'] },
    ];
    const bedNodes = beds.map((bed) => {
      const g = node('g', {}, svg);
      node('rect', { x: 700, y: bed.y, width: 170, height: 48, rx: 12, fill: 'oklch(30% .05 60)' }, g);
      const leaf = node('path', {
        d: `M726 ${bed.y + 36}c0-18 14-30 30-30 0 18-12 30-30 30zM764 ${bed.y + 36}c0-22 16-34 34-34 0 20-14 34-34 34z`,
        fill: 'oklch(48% .10 168)',
      }, g);
      node('text', { x: 856, y: bed.y + 31, 'text-anchor': 'end', fill: 'oklch(84% .05 160)',
        style: 'font:600 12px/1 system-ui,sans-serif;letter-spacing:.1em' }, g).textContent = bed.name;
      return { bed, leaf };
    });

    const boxG = node('g', {}, svg);
    node('rect', { x: 700, y: 116, width: 170, height: 92, rx: 12, fill: 'oklch(70% .15 95)' }, boxG);
    node('rect', { x: 710, y: 126, width: 150, height: 72, rx: 8, fill: 'oklch(22% .03 95)' }, boxG);
    node('path', { d: 'M770 138 748 176h16l-7 24 26-36h-17z', fill: 'oklch(88% .16 96)' }, boxG);
    node('text', { x: 850, y: 194, 'text-anchor': 'end', fill: 'oklch(84% .12 95)',
      style: 'font:600 11px/1 system-ui,sans-serif;letter-spacing:.14em' }, boxG).textContent = 'ELECTRICS';

    // the socket the brass handle drops into
    const socket = node('g', { style: 'cursor:pointer' }, svg);
    node('path', { d: 'M150 14 176 29 176 59 150 74 124 59 124 29z', fill: 'oklch(48% .06 85)' }, socket);
    const socketPin = node('path', { d: 'M150 26 166 35 166 53 150 62 134 53 134 35z', fill: 'oklch(24% .03 85)' }, socket);
    const socketRing = node('path', { d: 'M150 14 176 29 176 59 150 74 124 59 124 29z', fill: 'none',
      stroke: 'oklch(80% .13 88)', 'stroke-width': '4', opacity: '0', class: 'gh-v-wants' }, socket);
    node('text', { x: 196, y: 50, fill: 'oklch(80% .09 88)',
      style: 'font:600 12px/1 system-ui,sans-serif;letter-spacing:.16em' }, socket).textContent = 'HANDLE SOCKET';

    // the six wheels
    const wheels = VALVES.map((name) => {
      const [x, y] = VALVE_AT[name];
      const g = node('g', { style: 'cursor:pointer' }, svg);
      node('circle', { cx: x, cy: y, r: 26, fill: 'transparent' }, g);       // fat target
      const rim = node('circle', { cx: x, cy: y, r: 18, fill: 'oklch(40% .03 220)', stroke: 'oklch(62% .04 220)', 'stroke-width': '3' }, g);
      const spokes = node('g', { stroke: 'oklch(74% .10 88)', 'stroke-width': '5', 'stroke-linecap': 'round' }, g);
      node('path', { d: `M${x - 13} ${y} ${x + 13} ${y}` }, spokes);
      node('path', { d: `M${x} ${y - 13} ${x} ${y + 13}` }, spokes);
      spokes.style.cssText = 'transform-box:fill-box;transform-origin:50% 50%;transition:transform .25s ease,opacity .25s ease';
      node('circle', { cx: x, cy: y, r: 5, fill: 'oklch(30% .02 220)' }, g);
      node('text', { x, y: y - 30, 'text-anchor': 'middle', fill: 'oklch(88% .04 160)',
        style: 'font:700 15px/1 system-ui,sans-serif;letter-spacing:.08em' }, g).textContent = name;
      g.addEventListener('click', () => {
        const before = api.getState();
        api.dispatch('toggle', { valve: name });
        const after = api.getState();
        if (after === before && before.handleOn) {
          boxG.classList.remove('gh-v-zap');
          void boxG.getBoundingClientRect();
          boxG.classList.add('gh-v-zap');
        }
        paint();
      });
      return { name, rim, spokes };
    });

    // Every branch here makes a sound and says something. The socket keeps `cursor:pointer`
    // after the handle is fitted, so a click on it must never be silent — silence reads as
    // "nothing happened" and sends her looking for a bug instead of a valve.
    socket.addEventListener('click', () => {
      const s = api.getState();
      if (s.handleOn) {
        api.play('clunk');
        api.say(NUDGES.handleAlreadyOn);
      } else if (api.held() === 'valve-handle') {
        api.dispatch('attachHandle');
        if (api.getState().handleOn) api.useHeld();
      } else if (api.hasItem('valve-handle')) {
        api.play('click');
        api.say(NUDGES.handleInKit);
      } else {
        api.dispatch('attachHandle');       // lets the engine give its own sound and line
      }
      paint();
    });

    const note = document.createElement('p');
    note.style.cssText = CAPTION;
    root.appendChild(note);

    function paint() {
      const s = api.getState() || {};
      const open = s.open || {};
      const on = s.handleOn === true;

      socketRing.setAttribute('opacity', on || !api.hasItem('valve-handle') ? '0' : '1');
      socketPin.setAttribute('fill', on ? 'oklch(78% .12 88)' : 'oklch(24% .03 85)');

      for (const w of wheels) {
        const isOpen = open[w.name] === true;
        w.rim.setAttribute('fill', isOpen ? 'oklch(46% .09 168)' : 'oklch(40% .03 220)');
        w.spokes.style.opacity = on ? '1' : '0.25';
        w.spokes.style.transform = isOpen ? 'rotate(45deg)' : 'none';
      }
      for (const f of flows) {
        f.live.setAttribute('opacity', f.seg.needs.every((v) => open[v] === true) ? '1' : '0');
      }
      for (const b of bedNodes) {
        const fed = b.bed.seg.every((v) => open[v] === true);
        b.leaf.setAttribute('fill', fed ? 'oklch(80% .16 166)' : 'oklch(44% .07 168)');
      }
      // State, then goal — never the goal dressed up as the state. Claiming "every planter
      // watered" the moment the handle goes on reads as "solved" and backs her out of an
      // untouched puzzle.
      if (api.isSolved()) note.textContent = 'Every planter watered. The electrics box stays dry.';
      else if (on) note.textContent = 'Water all four planters. Keep the electrics box dry.';
      else note.textContent = 'The wheels have no handle on them. There is a socket at the top.';
    }

    api.on('flag', paint);
    paint();
    const unfit = fitToPanel(container);
    return unfit;
  },
};

// ===========================================================================================
// green-stars — the dome telescope. Drag the sky, centre the reticle, press CHART.
// The sky pans by rewriting the viewBox, so nothing here depends on the window size.
// ===========================================================================================

const VIEW = { w: 900, h: 630 };
const MAX_PAN = { x: FIELD.w - VIEW.w, y: FIELD.h - VIEW.h };

// Each constellation squashed into a 90x56 plaque box, uniformly, so the plaque and the sky
// really are the same shape.
function plaqueShape(c) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of c.stars) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const s = Math.min(90 / Math.max(1, maxX - minX), 56 / Math.max(1, maxY - minY));
  return c.stars.map(([x, y]) => [(x - minX) * s + 8, (y - minY) * s + 10]);
}

const stars = {
  title: 'Dome telescope',
  mount(container, api) {
    const root = div(container, SHELL);
    const row = div(root,
      'flex:1 1 380px;min-height:0;display:flex;gap:16px;align-items:stretch');

    // ---- the eyepiece ----
    // No aspect-ratio: this box takes whatever the panel can spare in BOTH axes, and the two
    // SVGs inside it fill it with `slice`, which is a uniform scale — so the reticle overlay
    // and the sky stay exactly registered whatever shape the box ends up.
    const eye = div(row,
      'position:relative;flex:1 1 auto;min-width:220px;min-height:170px;border-radius:18px;' +
      'overflow:hidden;cursor:grab;touch-action:none;background:oklch(10% .04 265);' +
      'border:1px solid oklch(46% .04 220);box-shadow:inset 0 0 60px rgb(0 0 0/.7)');

    const sky = node('svg', { viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, preserveAspectRatio: 'xMidYMid slice' }, eye);
    sky.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const rnd = minstd(20260825);
    const dust = node('g', { fill: 'oklch(92% .02 250)' }, sky);
    for (let i = 0; i < 220; i += 1) {
      node('circle', {
        cx: (rnd() * FIELD.w).toFixed(1),
        cy: (rnd() * FIELD.h).toFixed(1),
        r: (0.9 + rnd() * 1.7).toFixed(2),
        opacity: (0.25 + rnd() * 0.5).toFixed(2),
      }, dust);
    }
    const marks = CONSTELLATIONS.map((c) => {
      const g = node('g', {}, sky);
      const link = node('path', {
        d: c.lines.map(([a, b]) => `M${c.stars[a][0]} ${c.stars[a][1]} ${c.stars[b][0]} ${c.stars[b][1]}`).join(''),
        fill: 'none', stroke: 'oklch(80% .14 170)', 'stroke-width': '2.5', opacity: '0',
      }, g);
      for (const [x, y] of c.stars) {
        node('circle', { cx: x, cy: y, r: 7, fill: 'oklch(88% .10 250)', opacity: '0.18' }, g);
        node('circle', { cx: x, cy: y, r: 3.2, fill: 'oklch(97% .02 250)' }, g);
      }
      return { c, link };
    });

    const overlay = node('svg', { viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, preserveAspectRatio: 'xMidYMid slice' }, eye);
    overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    const ret = node('g', { stroke: 'oklch(80% .15 170)', fill: 'none', 'stroke-width': '2' }, overlay);
    node('circle', { cx: VIEW.w / 2, cy: VIEW.h / 2, r: TOLERANCE, 'stroke-dasharray': '10 12', opacity: '.7' }, ret);
    node('circle', { cx: VIEW.w / 2, cy: VIEW.h / 2, r: 5 }, ret);
    node('path', {
      d: `M${VIEW.w / 2 - 46} ${VIEW.h / 2} ${VIEW.w / 2 - 14} ${VIEW.h / 2}` +
         `M${VIEW.w / 2 + 14} ${VIEW.h / 2} ${VIEW.w / 2 + 46} ${VIEW.h / 2}` +
         `M${VIEW.w / 2} ${VIEW.h / 2 - 46} ${VIEW.w / 2} ${VIEW.h / 2 - 14}` +
         `M${VIEW.w / 2} ${VIEW.h / 2 + 14} ${VIEW.w / 2} ${VIEW.h / 2 + 46}`,
    }, ret);

    // ---- the plaques, copied from the door ----
    // Three equal shares of whatever height the row has: at 880x419 (a 1152x720 laptop) that is
    // ~60px each, and the minis scale into it instead of stacking 480px of card off the bottom.
    const side = div(row, 'flex:0 0 176px;min-height:0;display:flex;flex-direction:column;gap:8px');
    const plaques = CONSTELLATIONS.map((c) => {
      const cardEl = div(side,
        'position:relative;flex:1 1 0;min-height:50px;display:flex;flex-direction:column;' +
        'border-radius:12px;padding:7px 10px 6px;background:oklch(68% .10 86);' +
        'box-shadow:0 6px 18px rgb(0 0 0/.4);transition:filter .4s ease');
      div(cardEl, 'flex:0 0 auto;font:700 11px/1 system-ui,sans-serif;letter-spacing:.16em;color:oklch(30% .05 85)', c.name.toUpperCase());
      const miniBox = div(cardEl, 'flex:1 1 auto;min-height:0;position:relative;margin-top:4px');
      const mini = node('svg', { viewBox: '0 0 106 76' }, miniBox);
      mini.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      const pts = plaqueShape(c);
      node('path', {
        d: c.lines.map(([a, b]) => `M${pts[a][0]} ${pts[a][1]} ${pts[b][0]} ${pts[b][1]}`).join(''),
        fill: 'none', stroke: 'oklch(34% .06 85)', 'stroke-width': '2',
      }, mini);
      for (const [x, y] of pts) node('circle', { cx: x, cy: y, r: 4, fill: 'oklch(30% .06 85)' }, mini);
      const tick = div(cardEl,
        'position:absolute;right:9px;top:7px;width:22px;height:22px;border-radius:50%;display:grid;' +
        'place-items:center;background:oklch(62% .16 150);color:oklch(18% .04 150);opacity:0;' +
        'font:700 13px/1 system-ui,sans-serif;transition:opacity .3s ease', '✓');
      return { c, cardEl, tick };
    });

    const bar = div(root, 'flex:0 0 auto;display:flex;gap:14px;align-items:center;justify-content:center;margin-top:12px');
    const chart = button(bar, 'CHART');
    const note = document.createElement('p');
    note.style.cssText = CAPTION;
    root.appendChild(note);

    // ---- panning ----
    const slice = api.getState() || {};
    const at = Array.isArray(slice.at) ? slice.at : [FIELD.w / 2, FIELD.h / 2];
    let pan = {
      x: Math.min(MAX_PAN.x, Math.max(0, at[0] - VIEW.w / 2)),
      y: Math.min(MAX_PAN.y, Math.max(0, at[1] - VIEW.h / 2)),
    };
    let dragging = false;
    let from = { x: 0, y: 0, px: 0, py: 0 };

    const reticle = () => [pan.x + VIEW.w / 2, pan.y + VIEW.h / 2];
    const paintSky = () => { sky.setAttribute('viewBox', `${pan.x.toFixed(1)} ${pan.y.toFixed(1)} ${VIEW.w} ${VIEW.h}`); };

    function paint() {
      const s = api.getState() || {};
      const done = s.charted || [];
      for (const p of plaques) {
        const got = done.includes(p.c.id);
        p.tick.style.opacity = got ? '1' : '0';
        p.cardEl.style.filter = got ? 'saturate(.55) brightness(1.08)' : 'none';
      }
      for (const m of marks) m.link.setAttribute('opacity', done.includes(m.c.id) ? '1' : '0');
      note.textContent = done.length === CONSTELLATIONS.length
        ? 'All three charted. The star chart is in your kit.'
        : `Drag the sky. Put a plaque's shape inside the ring, then press CHART. (${done.length}/3)`;
    }

    // Sky units per screen pixel. `slice` scales uniformly by the LARGER of the two ratios, so
    // this is right whatever shape the panel leaves the eyepiece — a drag of n pixels always
    // moves the sky the same distance under the reticle.
    const skyPerPx = (r) => 1 / Math.max(r.width / VIEW.w, r.height / VIEW.h);

    const onMove = (e) => {
      if (!dragging) return;
      const r = eye.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const k = skyPerPx(r);
      pan.x = Math.min(MAX_PAN.x, Math.max(0, from.px - (e.clientX - from.x) * k));
      pan.y = Math.min(MAX_PAN.y, Math.max(0, from.py - (e.clientY - from.y) * k));
      paintSky();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      eye.style.cursor = 'grab';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const [x, y] = reticle();
      api.dispatch('aim', { to: [x, y] });
    };

    chart.addEventListener('click', () => {
      const [x, y] = reticle();
      api.dispatch('aim', { to: [x, y] });
      api.dispatch('chart');
      paint();
    });

    paintSky();
    paint();

    // Raw listeners last: a throw above this line must not leak one.
    eye.addEventListener('pointerdown', (e) => {
      dragging = true;
      eye.style.cursor = 'grabbing';
      from = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
    const unfit = fitToPanel(container);

    return () => {
      unfit();
      dragging = true;      // so onUp actually unbinds
      onUp();
    };
  },
};

// ===========================================================================================
// green-tube — press and hold, seal in the green, then gasp #2.
// THE ENGINE OWNS NO TIMER: the gauge only decays because this rAF dispatches `settle` every
// frame with a clamped dt. hold/settle emit nothing (they would fire 60x a second), so the
// pump sound belongs to this widget.
// ===========================================================================================

const GAUGE = { x: 40, y: 30, w: 78, h: 300 };
const pctY = (p) => GAUGE.y + GAUGE.h * (1 - p / 100);

// ui/renderer.js types the speech bubble at this rate (its TYPE_CPS, which it does not export).
// Only used to work out how long to hold the tube ride back so the pinned line can be read.
const BUBBLE_CPS = 30;

const tube = {
  title: 'Tube pressure pump',
  closeOnSolve: false,        // this widget backs out itself, then plays the ride
  mount(container, api) {
    const root = div(container, SHELL);
    sheet(root, `
      @keyframes gh-t-band { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
      .gh-t-near { animation: gh-t-band 1.2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .gh-t-near { animation: none; opacity: 1 } }
    `);

    const row = div(root,
      'flex:1 1 300px;min-height:150px;display:flex;gap:30px;align-items:center;justify-content:center');

    const svg = node('svg', { viewBox: '0 0 200 360' }, row);
    svg.style.cssText = 'flex:0 1 auto;display:block;height:100%;width:auto;max-width:180px;min-height:0';
    node('rect', { x: GAUGE.x - 10, y: GAUGE.y - 10, width: GAUGE.w + 20, height: GAUGE.h + 20, rx: 22, fill: 'oklch(30% .03 220)' }, svg);
    node('rect', { x: GAUGE.x, y: GAUGE.y, width: GAUGE.w, height: GAUGE.h, rx: 14, fill: 'oklch(17% .03 210)' }, svg);

    const bandTop = pctY(BAND.hi);
    const band = node('rect', {
      x: GAUGE.x, y: bandTop, width: GAUGE.w, height: pctY(BAND.lo) - bandTop,
      fill: 'oklch(70% .18 150)', opacity: '.35',
    }, svg);
    const column = node('rect', { x: GAUGE.x + 6, y: pctY(0), width: GAUGE.w - 12, height: 0, rx: 8, fill: 'oklch(72% .12 210)' }, svg);
    const needle = node('g', {}, svg);
    node('path', { d: `M${GAUGE.x + GAUGE.w + 4} 0 ${GAUGE.x + GAUGE.w + 20} -9 ${GAUGE.x + GAUGE.w + 20} 9z`, fill: 'oklch(92% .05 200)' }, needle);
    node('rect', { x: GAUGE.x - 4, y: -2.5, width: GAUGE.w + 8, height: 5, rx: 2.5, fill: 'oklch(92% .05 200)' }, needle);

    for (let p = 0; p <= 100; p += 25) {
      node('text', { x: GAUGE.x - 14, y: pctY(p) + 5, 'text-anchor': 'end', fill: 'oklch(70% .02 220)',
        style: 'font:600 11px/1 ui-monospace,monospace' }, svg).textContent = String(p);
    }
    const readout = node('text', { x: GAUGE.x + GAUGE.w / 2, y: 352, 'text-anchor': 'middle', fill: 'oklch(90% .04 200)',
      style: 'font:700 19px/1 ui-monospace,monospace' }, svg);

    const controls = div(row, 'flex:0 1 340px;min-height:0;display:flex;flex-direction:column;gap:16px;align-items:center');
    const pump = button(controls, 'HOLD TO PUMP',
      'padding:30px 34px;font-size:15px;border-radius:26px;background:oklch(34% .07 200);border-color:oklch(72% .11 210)');
    pump.style.touchAction = 'none';
    const seal = button(controls, 'SEAL', 'padding:15px 44px');

    const note = document.createElement('p');
    note.style.cssText = CAPTION;
    note.textContent = 'Hold to fill. Let go and it settles. Seal while the needle is in the green.';
    root.appendChild(note);

    let raf = 0;
    let last = 0;
    let holding = false;
    let wasIn = false;
    let done = false;
    let rideTimer = 0;
    let rode = false;

    function paint() {
      const s = api.getState() || { pressure: 0 };
      const p = Math.max(0, Math.min(100, s.pressure || 0));
      const top = pctY(p);
      column.setAttribute('y', String(top));
      column.setAttribute('height', String(pctY(0) - top));
      needle.setAttribute('transform', `translate(0 ${top})`);
      readout.textContent = `${p.toFixed(0)}%`;
      const green = inBand(p);            // the same predicate the engine seals on
      band.setAttribute('opacity', green ? '.85' : String(0.3 + Math.max(0, 1 - Math.abs(p - BAND.lo) / 30) * 0.35));
      if (p > BAND.lo - 22 && !green) band.classList.add('gh-t-near');
      else band.classList.remove('gh-t-near');
      if (green !== wasIn) {
        wasIn = green;
        if (green) api.play('chime');
      }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = clampDt(last ? (t - last) / 1000 : 0);
      last = t;
      if (dt <= 0 || done) return;
      api.dispatch(holding ? 'hold' : 'settle', { dt });
      paint();
    }

    const grab = (e) => {
      if (done) return;
      holding = true;
      pump.style.background = 'oklch(48% .10 205)';
      api.play('rumble');
      if (e && e.preventDefault) e.preventDefault();
    };
    const release = () => {
      if (!holding) return;
      holding = false;
      pump.style.background = 'oklch(34% .07 200)';
      api.play('clunk');
    };

    // The pinned line lands on the `tube-sealed` flag and the renderer types it into the bubble
    // at 30 characters a second. That bubble is z-55 — ABOVE this overlay, so she can read it
    // right here — but the ride's presentation surface is z-70 and buries it, and P7's module
    // swap then wipes the queue. So the ride waits for the line: type time plus a beat to read.
    // The wait is owned by the widget, and the teardown below hands the ride straight over
    // rather than dropping it, so backing out early costs her the wait, never the ride.
    const RIDE_WAIT_MS = Math.round(1000 + (PINNED.tube.length / BUBBLE_CPS) * 1000);

    function startRide() {
      if (rideTimer) { clearTimeout(rideTimer); rideTimer = 0; }
      if (rode) return;
      rode = true;
      api.close();
      playRide(api);
    }

    function win() {
      if (done) return;
      done = true;
      release();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      note.textContent = 'Sealed. The door is opening.';
      seal.disabled = true;
      seal.textContent = 'SEALED';
      rideTimer = window.setTimeout(startRide, RIDE_WAIT_MS);
    }

    seal.addEventListener('click', () => {
      api.dispatch('seal');
      paint();
      if (api.isSolved()) win();
    });

    api.on('flag', (e) => { if (e.name === 'tube-sealed') win(); });
    paint();
    if (api.isSolved()) {
      // Already done — she came back to look. Show it sealed and pump nothing.
      done = true;
      seal.disabled = true;
      seal.textContent = 'SEALED';
      note.textContent = 'Sealed. The tube is holding pressure.';
    } else {
      raf = requestAnimationFrame(frame);
    }

    // Raw listeners last.
    pump.addEventListener('pointerdown', grab);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    const unfit = fitToPanel(container);

    return () => {
      unfit();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      // Sealed, but the wait had not elapsed: she pressed Esc, or destroy() came through.
      // Either way the ride is owed. Starting it here keeps the surface inside the renderer's
      // teardown order — destroy() closes the closeup first and the presentation right after,
      // so a ride begun on this line is torn down on the very next statement.
      if (rideTimer) { clearTimeout(rideTimer); rideTimer = 0; if (!rode) { rode = true; playRide(api); } }
    };
  },
};

// ===========================================================================================
// GASP #2 — the exterior tube ride. Six seconds, on api.present (the full-screen z-70 surface,
// which survives a module change, which is exactly why P7 can switch her to the bridge under
// it). Never hand-rolled on document.body.
// ===========================================================================================

const RIDE_MS = 6000;

function playRide(api) {
  const timers = [];
  const later = (fn, ms) => timers.push(window.setTimeout(fn, ms));
  let closed = false;

  const handle = api.present({
    title: 'Transit tube',
    // Not escapable, exactly like the crawlway: this surface is the COVER the bridge is
    // swapped in under. Esc used to lift it a second early and turn the seam the ride exists
    // to hide into the most visible cut in the game. Six seconds, then it lifts itself.
    escapable: false,
    onClose: () => {
      closed = true;
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
    },
  });

  // The sheet goes in FIRST: the stage's inline animation names these keyframes, and an
  // element that starts at clip-path circle(0%) with no keyframes yet is invisible.
  sheet(handle.el, `
    @keyframes gh-r-iris  { to { clip-path: circle(150% at 50% 50%) } }
    @keyframes gh-r-pan   { from { transform: translateX(0) } to { transform: translateX(-52%) } }
    @keyframes gh-r-hue   { from { filter: hue-rotate(0deg) } to { filter: hue-rotate(360deg) } }
    @keyframes gh-r-bob   { 0%,100% { transform: translateY(-50%) } 50% { transform: translateY(calc(-50% - 16px)) } }
    @keyframes gh-r-rib   { from { transform: translateX(0) } to { transform: translateX(-240px) } }
    @keyframes gh-r-fade  { 0% { opacity: 0 } 12% { opacity: 1 } 88% { opacity: 1 } 100% { opacity: 0 } }
    .gh-r-rib { animation: gh-r-rib 1.1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gh-r-rib, .gh-r-pod, .gh-r-trail, .gh-r-far, .gh-r-near, .gh-r-hull { animation: none !important }
      .gh-r-stage { clip-path: none !important; animation: none !important }
    }
  `);

  const stage = div(handle.el,
    'position:absolute;inset:0;overflow:hidden;background:radial-gradient(120% 100% at 50% 40%,' +
    'oklch(22% .06 265) 0%,oklch(9% .04 265) 70%);clip-path:circle(0% at 50% 50%);' +
    'animation:gh-r-iris .85s cubic-bezier(.3,0,.2,1) forwards');
  stage.classList.add('gh-r-stage');

  // --- stars, two parallax bands ---
  const rnd = minstd(1971);
  const bands = [
    { cls: 'gh-r-far', speed: 13, count: 150, size: 1.6, alpha: 0.55 },
    { cls: 'gh-r-near', speed: 6.2, count: 70, size: 2.8, alpha: 0.95 },
  ];
  for (const b of bands) {
    const layer = div(stage,
      `position:absolute;inset:0;width:208%;animation:gh-r-pan ${b.speed}s linear infinite`);
    layer.classList.add(b.cls);
    for (let i = 0; i < b.count; i += 1) {
      div(layer,
        `position:absolute;left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 100).toFixed(2)}%;` +
        `width:${b.size}px;height:${b.size}px;border-radius:50%;background:oklch(97% .02 250);` +
        `opacity:${(b.alpha * (0.4 + rnd() * 0.6)).toFixed(2)}`);
    }
  }

  // --- the planet, drifting ---
  div(stage,
    'position:absolute;left:12%;top:14%;width:230px;height:230px;border-radius:50%;' +
    'background:radial-gradient(circle at 34% 30%,oklch(72% .13 220),oklch(38% .11 250) 62%,oklch(20% .07 260));' +
    'box-shadow:0 0 90px oklch(60% .12 240 / .45);animation:gh-r-fade 6s ease both');

  // --- the station hull sliding past ---
  const hullWrap = div(stage, 'position:absolute;inset:0;width:210%;animation:gh-r-pan 6.4s linear infinite');
  hullWrap.classList.add('gh-r-hull');
  const hull = node('svg', { viewBox: '0 0 2400 800', preserveAspectRatio: 'xMidYMid slice' }, hullWrap);
  hull.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;opacity:.9';
  const hullG = node('g', { fill: 'oklch(34% .02 235)' }, hull);
  node('rect', { x: 0, y: 620, width: 2400, height: 180 }, hullG);
  node('rect', { x: 120, y: 470, width: 420, height: 200, rx: 40 }, hullG);
  node('rect', { x: 700, y: 430, width: 300, height: 240, rx: 60 }, hullG);
  node('rect', { x: 1240, y: 486, width: 520, height: 190, rx: 44 }, hullG);
  node('rect', { x: 1900, y: 440, width: 360, height: 230, rx: 50 }, hullG);
  const panels = node('g', { fill: 'oklch(44% .07 250)', opacity: '.85' }, hull);
  for (let i = 0; i < 6; i += 1) {
    node('rect', { x: 260 + i * 380, y: 250, width: 200, height: 120, rx: 8 }, panels);
    node('rect', { x: 350 + i * 380, y: 370, width: 14, height: 110 }, panels);
  }
  const lights = node('g', { fill: 'oklch(86% .13 90)' }, hull);
  for (let i = 0; i < 26; i += 1) {
    node('circle', { cx: 80 + i * 92, cy: 660 + (i % 3) * 28, r: 7, opacity: (0.35 + (i % 4) * 0.2).toFixed(2) }, lights);
  }

  // --- the glass tube she is inside ---
  const tubeTop = div(stage,
    'position:absolute;left:0;right:0;top:calc(50% - 132px);height:26px;' +
    'background:linear-gradient(180deg,oklch(84% .05 200 / .55),oklch(60% .04 210 / .18))');
  const tubeBot = div(stage,
    'position:absolute;left:0;right:0;top:calc(50% + 106px);height:26px;' +
    'background:linear-gradient(0deg,oklch(84% .05 200 / .55),oklch(60% .04 210 / .18))');
  tubeTop.style.borderRadius = '13px';
  tubeBot.style.borderRadius = '13px';
  div(stage,
    'position:absolute;left:0;right:0;top:calc(50% - 132px);height:264px;pointer-events:none;' +
    'background:linear-gradient(180deg,oklch(80% .06 200 / .16),transparent 30%,transparent 70%,oklch(80% .06 200 / .12))');
  const ribs = div(stage, 'position:absolute;left:-240px;right:-240px;top:calc(50% - 132px);height:264px;pointer-events:none');
  ribs.classList.add('gh-r-rib');
  for (let i = 0; i < 24; i += 1) {
    div(ribs, `position:absolute;left:${i * 120}px;top:0;bottom:0;width:9px;border-radius:5px;` +
      'background:linear-gradient(180deg,oklch(78% .05 200 / .5),oklch(52% .04 210 / .12),oklch(78% .05 200 / .5))');
  }

  // --- the rainbow light-trail, then her pod. Rainbow is a reward colour: this is one. ---
  const trail = div(stage,
    'position:absolute;left:0;width:52%;height:26px;top:50%;transform:translateY(-50%);' +
    'border-radius:0 999px 999px 0;filter:blur(1px);animation:gh-r-hue 2.6s linear infinite;' +
    'background:linear-gradient(90deg,transparent,#ff5f6d 18%,#ffc371 38%,#6ee7b7 58%,#67e8f9 74%,#a78bfa 88%,#f472b6)');
  trail.classList.add('gh-r-trail');

  const pod = div(stage,
    'position:absolute;left:calc(52% - 46px);top:50%;transform:translateY(-50%);' +
    'animation:gh-r-bob 2.2s ease-in-out infinite');
  pod.classList.add('gh-r-pod');
  const podSvg = node('svg', { viewBox: '0 0 240 130', width: '240' }, pod);
  podSvg.style.cssText = 'display:block;overflow:visible';
  node('ellipse', { cx: 116, cy: 66, rx: 92, ry: 40, fill: 'oklch(84% .04 230)' }, podSvg);
  node('ellipse', { cx: 116, cy: 60, rx: 92, ry: 34, fill: 'oklch(93% .03 230)' }, podSvg);
  node('path', { d: 'M150 44a46 30 0 0 1 0 44 46 30 0 0 0 0-44z', fill: 'oklch(70% .06 230)' }, podSvg);
  node('ellipse', { cx: 150, cy: 62, rx: 40, ry: 26, fill: 'oklch(38% .09 245)' }, podSvg);
  node('ellipse', { cx: 142, cy: 54, rx: 16, ry: 9, fill: 'oklch(88% .06 235)', opacity: '.55' }, podSvg);
  node('circle', { cx: 156, cy: 64, r: 12, fill: 'oklch(74% .13 60)' }, podSvg);          // Nandini
  node('path', { d: 'M144 74a12 12 0 0 0 24 0z', fill: 'oklch(60% .16 25)' }, podSvg);
  // PIP, keeping up
  const pip = node('g', { transform: 'translate(28 6)' }, podSvg);
  node('circle', { cx: 0, cy: 0, r: 20, fill: 'oklch(80% .04 240)' }, pip);
  node('circle', { cx: 0, cy: 0, r: 14, fill: 'oklch(46% .10 245)' }, pip);
  node('circle', { cx: -5, cy: -3, r: 4, fill: 'oklch(96% .03 240)' }, pip);
  node('circle', { cx: 6, cy: -3, r: 4, fill: 'oklch(96% .03 240)' }, pip);
  node('path', { d: 'M-6 6a7 7 0 0 0 12 0z', fill: 'oklch(96% .03 240)' }, pip);
  node('path', { d: 'M0 -20 0 -32', stroke: 'oklch(80% .04 240)', 'stroke-width': '3' }, pip);
  node('circle', { cx: 0, cy: -35, r: 4, fill: 'oklch(78% .16 320)' }, pip);

  // --- sound: whoosh into it, a swell coming out ---
  api.play('whoosh');
  later(() => { if (!closed) api.play('rumble'); }, 140);
  later(() => { if (!closed) api.play('whoosh'); }, 2900);
  later(() => { if (!closed) api.play('chime'); }, 4700);
  later(() => { if (!closed) api.play('chime'); }, 5250);
  later(() => { if (!closed) handle.close(); }, RIDE_MS);

  return handle;
}

export default {
  'green-bloom': bloom,
  'green-valves': valves,
  'green-stars': stars,
  'green-tube': tube,
};
