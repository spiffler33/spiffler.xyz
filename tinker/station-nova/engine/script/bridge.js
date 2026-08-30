// STATION NOVA — the Bridge module's authored text.  (P6 owns this file.)
//
// Pure data. No DOM, no engine import, no logic — engine/puzzles/bridge-*.js and the barrel
// import from here, and so do the Bridge's UI widgets (ui/console.js prints the logs on the
// terminal screen while the engine speaks them).
//
// Everything PLAN.md marks [pinned] is verbatim payload: copied character for character,
// never paraphrased, never "improved", never re-punctuated. The unpinned PIP lines below are
// new, and follow decision 11's voice: short sentences, earnest, curious, slightly forgetful,
// never sarcastic at Nandini's expense, calls her Commander.

// ---- [pinned] the three crew logs -----------------------------------------------------------
// `speaker` reaches the UI: a speaker other than 'pip' renders as a captioned bubble with
// PIP's mouth still, which is how Taklu gets a voice without a second sprite.
export const LOGS = Object.freeze({
  1: Object.freeze({
    speaker: 'Crew log 1',
    text: "Evac's tidy, station's asleep. Someone will come wake her.",
  }),
  2: Object.freeze({
    speaker: 'Crew log 2',
    text: 'Reminder: the Commander changed the nav password AGAIN.',
  }),
  3: Object.freeze({
    speaker: 'Cmdr. Taklu',
    text: "New password's easy — it's what everyone calls me. Like I'd forget THAT.",
  }),
});

// ---- [pinned] log 4, auto-played at the memory-restore payoff --------------------------------
export const LOG_4 = Object.freeze({
  speaker: 'Cmdr. Taklu',
  text: "If you're hearing this, you woke my station and my little robot. Knew you could. Come home, Commander. Dinner's waiting. — Taklu Uncle.",
});

// ---- [pinned] objects that carry text --------------------------------------------------------
export const PLAQUE = 'Cmdr. TAKLU — a head above the rest.';
export const PHOTO_CAPTION = 'Home run: the Whale, then the Comb, then the Unicorn. Every time. — T.';
export const CASE_LABEL = "Commander Taklu's comb. Mint condition. Never once used.";
export const STICKY_NOTE = 'If the new pilot is reading this: the chair is yours. — T.';
export const NAMEPLATE = 'PIP — Property of Cmdr. Taklu.';
export const RADIO_CLEARANCE = 'UNICORN-1, you are cleared for home.';
export const BOOT_LINE = "I'm not allowed in here. Well. WASN'T.";

// ---- [pinned] PIP's memory-restore lines -----------------------------------------------------
export const MEMORY_LINES = Object.freeze([
  'Taklu Uncle built me. Taklu Uncle built half this station.',
  'He used to say: puzzles are just doors being shy.',
]);

// ---- [pinned] certificate wording ------------------------------------------------------------
export const CERTIFICATE = Object.freeze({
  station: 'STATION NOVA',
  title: 'CERTIFICATE OF ESCAPE',
  name: 'COMMANDER NANDINI',
  witness: 'witnessed by PIP',
});

// ---- [pinned] the twelve hint strings, nudge -> hint -> answer --------------------------------
// The barrel re-exports this: the renderer reads hints off the barrel and nothing else.
export const HINTS = Object.freeze({
  'bridge-password': Object.freeze([
    'The console wants the nav password. The crew left three logs — play them.',
    "It's what everyone calls the Commander. His portrait has a name on it.",
    'Type: unlock nav TAKLU',
  ]),
  'bridge-course': Object.freeze([
    'The chart knows your three constellations. Something on this bridge knows the order.',
    'The framed photo names the order: Whale, Comb, Unicorn.',
    'Drag the line Whale → Comb → Unicorn.',
  ]),
  'bridge-memory': Object.freeze([
    'I feel… three-thirds empty. My dock has three slots.',
    'You have two shards. The Commander kept everything important near his portrait.',
    'Slide the portrait, take the shard, match wave shapes to slots.',
  ]),
  'bridge-launch': Object.freeze([
    "Everything's unlocked. Launch checklists start with the guarded switches.",
    'Covers up, switches on — all four — then throttle, then tell the console.',
    'Flip all 4, throttle to full, type: launch confirm',
  ]),
});

// ---- new PIP lines (not pinned; decision 11 voice) --------------------------------------------
export const PIP = Object.freeze({
  arrival: Object.freeze([
    'The bridge. She kept the lights on for us.',
    "That console is the whole station's brain. Also its diary.",
  ]),
  dockedIn: "Screen's awake. Type help on it — I'll wait. I'm very good at waiting.",
  tryScan: "Good. Now try scan. Let's see what she's still got.",
  online: 'She reads us! Three logs, one locked nav, one very asleep launch board.',
  wrongPassword: "Nope. The console just blinked at me. Nothing's broken — try another.",
  badLog: 'There are three logs, Commander. One, two, three.',
  navOpen: 'NAV is ours. Somewhere on this bridge is the way home.',
  navLocked: 'The plotter lives inside NAV, and NAV is still locked. The crew were very chatty about the password.',
  noChart: 'The chart memory is empty. We never wrote the stars down — the dome, Commander. The telescope.',
  courseWrong: "That leg won't hold. Start the line again — nothing's lost.",
  coursePlotted: 'Course locked. That is a very pretty line.',
  portrait: "There's something behind him. There's always something behind him.",
  tookShard: "That's a piece of me. He kept it behind his own face. Of course he did.",
  wrongSlot: "Different shape. Try the shard on another slot — I can't feel a thing, so guess freely.",
  needShard3: 'Two in, one missing. The Commander kept things safe, not far.',
  launchAsleep: "The launch board is still asleep. I think it's waiting on me.",
  coverFirst: 'Cover first. Those switches are guarded for a reason. A fun reason.',
  throttleLocked: "The throttle's stiff. All four switches first, I think.",
  needSwitches: 'Not yet — four switches, then throttle, then tell me again.',
  needThrottle: 'Switches are good. The throttle is not at full.',
  win: "That's the whole checklist. GO, Commander!",
  certificate: "It says Commander Nandini. It's official now. I'd salute harder if I had a shoulder.",
  window: 'That planet turns whether anyone watches. I watch anyway.',
  crewStation: 'Somebody left their chair warm. Metaphorically. It has been months.',
  pipDock: 'That is my dock. Three slots. Three holes in me. Related, I suspect.',
  navDisplay: 'The nav display. This is where the way home gets drawn. It has been blank a long time.',
  captainsChair: "That is the captain's chair. The note says it's yours now, Commander. I checked twice.",
  consoleDesk: 'Under this desk: two pens, a spanner, and one extremely old biscuit. I keep an inventory.',
});
