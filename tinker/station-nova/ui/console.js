// STATION NOVA — the Bridge terminal.  (P6 owns this file.)
//
// ONE mounted terminal drives FOUR puzzle ids through api.dispatchTo(): bridge-boot,
// bridge-password, bridge-course and bridge-launch. It is mounted once, by the bridge-boot
// close-up in ui/closeups/bridge.js, and its scrollback lives in this module so backing out
// to read the portrait and coming back does not wipe what she has already typed.
//
// ===========================================================================================
// PARSING — locked decision 7, and a hard fence
// ===========================================================================================
// Split the line on whitespace. Lower-case the tokens. Look them up in a FIXED command table
// by exact string equality. That is the whole parser.
//
//   * No regular expressions of any kind, anywhere in this file: no constructed matcher, no
//     pattern literal, none of the string methods that take one.
//   * No keyword heuristics, no word lists, no "does it contain", no natural-language handling.
//   * The ONLY fuzziness allowed is a Levenshtein edit distance <= 2 "did you mean" hint for
//     an unrecognised first token. It never executes anything; it only prints a suggestion.
//
// The table below is the complete set of commands. Nothing else exists, and the phase test
// asserts that list character for character.

import { LOGS, CASE_LABEL } from '../engine/script/bridge.js';
import { passwordMatches } from '../engine/puzzles/bridge-password.js';

// ===========================================================================================
// THE FIXED COMMAND TABLE
// ===========================================================================================

/** `words` are matched token-for-token by exact equality after lower-casing. `arg` names the
 *  single trailing token a command takes (none, for the rest). */
export const COMMANDS = Object.freeze([
  Object.freeze({ name: 'help', words: Object.freeze(['help']), usage: 'help', blurb: 'this list' }),
  Object.freeze({ name: 'scan', words: Object.freeze(['scan']), usage: 'scan', blurb: 'station systems report' }),
  Object.freeze({ name: 'look', words: Object.freeze(['look']), usage: 'look', blurb: 'look around the bridge' }),
  Object.freeze({ name: 'play log', words: Object.freeze(['play', 'log']), usage: 'play log 1|2|3', blurb: 'play a crew log', arg: 'n' }),
  Object.freeze({ name: 'unlock nav', words: Object.freeze(['unlock', 'nav']), usage: 'unlock nav <password>', blurb: 'unlock the nav computer', arg: 'password' }),
  Object.freeze({ name: 'chart', words: Object.freeze(['chart']), usage: 'chart', blurb: 'open the course plotter' }),
  Object.freeze({ name: 'launch confirm', words: Object.freeze(['launch', 'confirm']), usage: 'launch confirm', blurb: 'commit to launch' }),
]);

/** The table's names, in table order. The phase test pins this list. */
export const COMMAND_NAMES = Object.freeze(COMMANDS.map((c) => c.name));

/** Whitespace split, nothing more. Returns the raw tokens (case preserved — the password
 *  echoes back the way she typed it) with empty runs dropped. */
export function tokenize(line) {
  if (typeof line !== 'string') return [];
  const flat = line.split('\t').join(' ').split('\n').join(' ');
  return flat.split(' ').filter((token) => token.length > 0);
}

/** Exact lookup: the whole line must BE a table entry, word for word, plus at most the one
 *  argument token that entry declares. `chart me` is not `chart`; `scan the room` is not
 *  `scan`. Trailing junk makes the line unknown, which submit() answers the way it answers
 *  any other unknown input. The longest matching word list wins, so `launch confirm` can
 *  never be read as `launch` plus an argument. Returns { command, args } or null. */
export function matchCommand(rawTokens) {
  const tokens = rawTokens.map((token) => token.toLowerCase());
  let best = null;
  for (const command of COMMANDS) {
    const words = command.words;
    const extra = tokens.length - words.length;
    if (extra < 0 || extra > (command.arg ? 1 : 0)) continue;
    let hit = true;
    for (let i = 0; i < words.length; i += 1) {
      if (tokens[i] !== words[i]) { hit = false; break; }
    }
    if (hit && (best === null || words.length > best.command.words.length)) {
      best = { command, args: rawTokens.slice(words.length) };
    }
  }
  return best;
}

/** Plain Wagner-Fischer edit distance. */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = [];
  for (let j = 0; j <= b.length; j += 1) prev.push(j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = row;
  }
  return prev[b.length];
}

/** The nearest command to an unrecognised first token, or null past distance 2. */
export function suggest(token) {
  if (typeof token !== 'string' || token.length === 0) return null;
  const word = token.toLowerCase();
  let best = null;
  let bestDistance = 3;                       // strictly less than 3 == "edit distance <= 2"
  for (const command of COMMANDS) {
    const distance = levenshtein(word, command.words[0]);
    if (distance < bestDistance) { bestDistance = distance; best = command; }
  }
  return best ? best.usage : null;
}

// ===========================================================================================
// SCREEN COPY
// ===========================================================================================

const BANNER = [
  'NOVA STATION // CAPTAIN\'S CONSOLE',
  'memory core warm. one operator detected.',
  'type  help  and press enter.',
];

const LOOK_LINES = [
  'FORWARD WINDOW  one planet, turning slowly, minding its own business.',
  "CAPTAIN'S CHAIR empty. Warm, somehow.",
  'PORTRAIT        Cmdr. Taklu. Still supervising.',
  `DISPLAY CASE    ${CASE_LABEL}`,
  'CHARGING DOCK   one small robot. three empty slots.',
];

function navStatus(flags) {
  if (flags['course-locked'] === true) return 'COURSE LOCKED IN';
  if (flags['nav-unlocked'] === true) return 'UNLOCKED';
  return 'LOCKED';
}

function launchStatus(flags) {
  if (flags.WIN === true) return 'COMMITTED';
  if (flags['memory-restored'] === true) return 'ARMED';
  return 'OFFLINE';
}

// Scrollback survives closing and reopening the close-up: the terminal is a place, not a modal.
const backlog = [];

// ===========================================================================================
// THE WIDGET
// ===========================================================================================

const STYLE_ID = 'nv-console-style';
const STYLE = `
.nvc { display: flex; flex-direction: column; gap: 12px; }
.nvc-screen {
  position: relative; border-radius: 14px; padding: 16px 18px 14px;
  background: linear-gradient(180deg, oklch(24% 0.04 160) 0%, oklch(18% 0.03 160) 100%);
  border: 1px solid oklch(46% 0.09 150 / .55);
  box-shadow: inset 0 0 60px oklch(80% 0.16 150 / .07), 0 10px 34px rgb(0 0 0 / .45);
  font: 400 14.5px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: oklch(80% 0.16 150); overflow: hidden;
}
.nvc-screen::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .35;
  background: repeating-linear-gradient(180deg, oklch(80% 0.16 150 / .05) 0 1px, transparent 1px 3px);
}
/* The scrollback is the tall part of this widget, so it gives way first: --nvb-body is the
   close-up panel's usable height (defined next to the other bridge widgets in
   ui/closeups/bridge.js), and 97px is everything else in here — screen padding, the input
   row, the gap and the footer. Without this the console overflows the panel at 720px. */
.nvc-out {
  height: min(316px, calc(var(--nvb-body, 460px) - 97px));
  overflow-y: auto; overscroll-behavior: contain; white-space: pre-wrap;
}
.nvc-out::-webkit-scrollbar { width: 8px; }
.nvc-out::-webkit-scrollbar-thumb { background: oklch(52% 0.10 150 / .5); border-radius: 4px; }
.nvc-l { margin: 0; }
.nvc-echo { color: oklch(92% 0.10 150); text-shadow: 0 0 10px oklch(80% 0.16 150 / .55); }
.nvc-dim { color: oklch(62% 0.07 150); }
.nvc-good { color: oklch(88% 0.16 150); text-shadow: 0 0 12px oklch(80% 0.16 150 / .5); }
.nvc-warn { color: oklch(80% 0.13 85); }
.nvc-log { color: oklch(86% 0.06 90); }
.nvc-in { display: flex; gap: 8px; margin-top: 10px; align-items: baseline; }
.nvc-prompt { color: oklch(70% 0.12 150); }
.nvc-typed { color: oklch(94% 0.11 150); text-shadow: 0 0 8px oklch(80% 0.16 150 / .45); word-break: break-all; }
.nvc-in.nvc-hit .nvc-typed { text-shadow: 0 0 20px oklch(85% 0.18 150 / .95); }
.nvc-caret {
  display: inline-block; width: 9px; height: 1.05em; translate: 0 2px; border-radius: 1px;
  background: oklch(85% 0.17 150); animation: nvc-blink 1.05s steps(1, end) infinite;
}
@keyframes nvc-blink { 0%, 55% { opacity: 1 } 56%, 100% { opacity: .12 } }
.nvc-foot { margin: 0; text-align: center; font: 400 13px/1.5 system-ui, sans-serif; color: oklch(72% 0.02 250); }
@media (prefers-reduced-motion: reduce) { .nvc-caret { animation: none } }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = STYLE;
  document.head.appendChild(tag);
}

/**
 * Mount the terminal into `host`.
 *
 * @param {HTMLElement} host
 * @param {*} api          the close-up api (bridge-boot's)
 * @param {{onChart?: () => void, onCertificate?: () => void}} opts
 *        onChart       hand the panel over to the course plotter
 *        onCertificate `launch confirm` typed again after WIN — put the certificate back up
 * @returns {{destroy: () => void, setActive: (on: boolean) => void, print: (t: string, tone?: string) => void}}
 */
export function mountConsole(host, api, opts = {}) {
  ensureStyle();

  const root = document.createElement('div');
  root.className = 'nvc';
  const screen = document.createElement('div');
  screen.className = 'nvc-screen';
  const out = document.createElement('div');
  out.className = 'nvc-out';
  out.setAttribute('role', 'log');
  out.setAttribute('aria-live', 'polite');
  screen.appendChild(out);

  const inputRow = document.createElement('div');
  inputRow.className = 'nvc-in';
  const prompt = document.createElement('span');
  prompt.className = 'nvc-prompt';
  prompt.textContent = '>';
  const typed = document.createElement('span');
  typed.className = 'nvc-typed';
  const caret = document.createElement('span');
  caret.className = 'nvc-caret';
  inputRow.append(prompt, typed, caret);
  screen.appendChild(inputRow);

  const foot = document.createElement('p');
  foot.className = 'nvc-foot';
  foot.textContent = 'Just type — the keyboard is already listening.';

  root.append(screen, foot);
  host.appendChild(root);

  let buffer = '';
  let active = true;
  let hitTimer = 0;

  function paintInput() {
    typed.textContent = buffer;
  }

  function draw(entry) {
    const p = document.createElement('p');
    p.className = `nvc-l nvc-${entry.tone}`;
    p.textContent = entry.text;
    out.appendChild(p);
  }

  function print(text, tone = 'dim') {
    const entry = { text, tone };
    backlog.push(entry);
    if (backlog.length > 240) backlog.shift();
    draw(entry);
    out.scrollTop = out.scrollHeight;
  }

  function printAll(lines, tone) {
    for (const line of lines) print(line, tone);
  }

  // ---- the seven responses ----------------------------------------------------------------

  function doHelp() {
    api.dispatchTo('bridge-boot', 'help');           // the puzzle owns the sound
    print('COMMANDS', 'good');
    const width = Math.max(...COMMANDS.map((c) => c.usage.length));
    for (const command of COMMANDS) {
      print(`  ${command.usage.padEnd(width + 3, ' ')}${command.blurb}`, 'dim');
    }
  }

  function doScan() {
    api.dispatchTo('bridge-boot', 'scan');
    const flags = api.flags();
    print('SCAN COMPLETE', 'good');
    print(`  NAV ............ ${navStatus(flags)}`, 'dim');
    print('  CREW LOGS ...... 3 STORED', 'dim');
    print(`  LAUNCH ......... ${launchStatus(flags)}`, 'dim');
  }

  function doLook() {
    api.play('click');                                // nothing dispatches, so the console pays
    print('BRIDGE', 'good');
    printAll(LOOK_LINES.map((line) => `  ${line}`), 'dim');
  }

  function doPlayLog(args) {
    if (args.length === 0) { usage('play log 1|2|3'); return; }
    // Three exact comparisons, in the same spirit as the command table: `0x2` and `1.0` are
    // not log numbers, they are strangers. Number() would have read both.
    const asked = args[0];
    const n = asked === '1' ? 1 : asked === '2' ? 2 : asked === '3' ? 3 : 0;
    api.dispatchTo('bridge-password', 'playLog', { n });
    const log = LOGS[n];
    if (!log) { print(`NO LOG ${asked} ON FILE.`, 'warn'); return; }
    print(`▶ LOG ${n} · ${log.speaker.toUpperCase()}`, 'good');
    print(`  "${log.text}"`, 'log');
  }

  function doUnlockNav(args) {
    if (args.length === 0) { usage('unlock nav <password>'); return; }
    // Answer THIS attempt, not the flag: once NAV is open, a wrong password must still read
    // as wrong instead of congratulating her while PIP says the console blinked at him.
    const ok = passwordMatches(args[0]);
    api.dispatchTo('bridge-password', 'unlock', { password: args[0] });
    if (ok) {
      print('NAV: ACCESS GRANTED.', 'good');
      print('  course plotter available — type  chart', 'dim');
    } else {
      print('NAV: ACCESS DENIED. Nothing locked, nothing lost. Try another.', 'warn');
    }
  }

  function doChart() {
    api.dispatchTo('bridge-course', 'open');
    const flags = api.flags();
    if (flags['nav-unlocked'] !== true) {
      print('NAV: LOCKED.', 'warn');
      print('  the plotter lives behind the nav computer. the crew logs know the password.', 'dim');
      return;
    }
    if (flags.charted !== true) {
      print('CHART MEMORY: EMPTY.', 'warn');
      print('  no constellations on file.', 'dim');
      return;
    }
    print('PLOTTER ONLINE.', 'good');
    print('  drag the course through your charted stars.', 'dim');
    if (typeof opts.onChart === 'function') opts.onChart();
  }

  function doLaunchConfirm() {
    // Typed again after the launch, this is how she gets her certificate back: it is the
    // command the table already has, and the first commit tells her so.
    const already = api.flags().WIN === true;
    api.dispatchTo('bridge-launch', 'confirm');
    if (api.flags().WIN !== true) {
      print('LAUNCH: HOLD. Checklist incomplete.', 'warn');
      return;
    }
    if (already) {
      print('CERTIFICATE: ON SCREEN.', 'good');
      if (typeof opts.onCertificate === 'function') opts.onCertificate();
      return;
    }
    print('LAUNCH: COMMITTED.', 'good');
    print('  undocking clamps releasing.', 'good');
    print('  (type  launch confirm  again any time to see your certificate.)', 'dim');
  }

  function usage(text) {
    api.play('wrong');
    print(`usage: ${text}`, 'warn');
  }

  const RUN = {
    help: doHelp,
    scan: doScan,
    look: doLook,
    'play log': doPlayLog,
    'unlock nav': doUnlockNav,
    chart: doChart,
    'launch confirm': doLaunchConfirm,
  };

  function submit(raw) {
    const rawTokens = tokenize(raw);
    print(`> ${raw}`, 'echo');
    if (rawTokens.length === 0) return;
    const hit = matchCommand(rawTokens);
    if (!hit) {
      api.play('wrong');
      // The whole line, not just its first word: `chart me` is unknown, and naming only
      // `chart` next to "did you mean chart?" would read as nonsense.
      print(`unknown command: ${rawTokens.join(' ')}`, 'warn');
      const near = suggest(rawTokens[0]);
      if (near) print(`  did you mean  ${near}  ?`, 'dim');
      else print('  type  help  for the list.', 'dim');
      return;
    }
    RUN[hit.command.name](hit.args);
  }

  // ---- keyboard ---------------------------------------------------------------------------

  function flashKey() {
    inputRow.classList.add('nvc-hit');
    if (hitTimer) clearTimeout(hitTimer);
    hitTimer = setTimeout(() => inputRow.classList.remove('nvc-hit'), 110);
  }

  function onKeyDown(e) {
    if (!active) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') {
      const raw = buffer.trim();
      buffer = '';
      paintInput();
      e.preventDefault();
      if (raw.length > 0) submit(raw);
      return;
    }
    if (e.key === 'Backspace') {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
        paintInput();
        api.play('keypad');
        flashKey();
      }
      e.preventDefault();
      return;
    }
    if (e.key.length !== 1) return;                 // arrows, F-keys, Escape: not ours
    if (buffer.length >= 64) { e.preventDefault(); return; }
    buffer += e.key;
    paintInput();
    api.play('keypad');
    flashKey();
    e.preventDefault();
  }

  // ---- first paint -------------------------------------------------------------------------

  if (backlog.length === 0) {
    for (const line of BANNER) print(line, 'dim');
    print(' ', 'dim');
  } else {
    for (const entry of backlog) draw(entry);
    out.scrollTop = out.scrollHeight;
  }
  paintInput();

  // Nothing above can throw now, so the raw listener goes on LAST — one installed before a
  // throw would outlive the widget and never be removed.
  window.addEventListener('keydown', onKeyDown);

  return {
    print,
    setActive(on) {
      active = Boolean(on);
      root.style.display = active ? '' : 'none';
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      if (hitTimer) clearTimeout(hitTimer);
      root.remove();
    },
  };
}
