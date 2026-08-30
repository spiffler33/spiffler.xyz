// STATION NOVA — every word the Cargo Bay says.
//
// Lines marked [pinned] are verbatim payload from PLAN.md. They are pasted character for
// character and must never be rewritten, paraphrased, re-punctuated or "improved".
// Double quotes are used for the pinned strings so no apostrophe ever needs escaping.
//
// Nothing here touches a browser global: the barrel imports it and the barrel runs under
// bare node.

// ---- [pinned] the opening, after the dock clunk ------------------------------------------
export const OPENING = [
  "Oh! A person! I'm PIP. I think. The nameplate's scuffed.",
  "Solar flare hit us. The crew's safe at the rendezvous — but the station locked herself up tight.",
  "Help me wake her up, Commander? I'd do it myself, but… no thumbs.",
];

// ---- [pinned] beats ------------------------------------------------------------------------
export const SHARD_1 = "That's — mine? A memory shard! I knew I was forgetting something. Probably lots of somethings.";
export const GASP_1 = "A hatch?! That crate's been parked there since before my warranty!";
export const PLUSH = "That's not standard station equipment. I love it.";
export const TAKLU_NOTE = "Charged the torch. Fed the fish. Combed nothing. — T.";

// ---- [pinned] hints, three tiers per puzzle: nudge / hint / answer --------------------------
export const HINTS = {
  'cargo-torch': [
    "Dark in here. My lamp's tiny — the lockers might do better.",
    "That torch has a crank. Cranks like circles.",
    "Drag in circles on the crank until the bulb glows.",
  ],
  'cargo-keypad': [
    "Your beam makes some paint glow. Sweep the big crate wall.",
    "Four glowing numbers, four little circled marks. The marks are the order.",
    "Type 2947.",
  ],
  'cargo-power': [
    "The battery's dead socket wants that fuse you found.",
    "Turn the pipes so power can walk from battery to crane. Corners turn, straights don't.",
    "Rotate each connecting tile until the line is unbroken left to right.",
  ],
  'cargo-crane': [
    "The crane's awake. What's the one crate you could never see behind?",
    "Grab the big wall crate and set it down anywhere else.",
    "Grab, lift, move left once, drop — then look at the wall.",
  ],
};

// ---- PIP's own lines (not pinned; written to decision 11's voice) ---------------------------

// Fires with the 'torch-charged' flag. It has to teach the beam, because nothing else does.
export const TORCH_LIT = 'Light! Sweep it about, Commander — this room has been hiding things.';

// Fires with the 'crate-open' flag, after the pinned shard line.
export const FUSE_FOUND = 'And a fuse. A whole undamaged fuse. Today is going well.';

// Fires with the 'crane-powered' flag.
export const POWER_UP = "Power's walking! Strips, crane, everything. I feel taller.";

// Said straight after the pinned gasp, so the wheel is never a hunt.
export const WHEEL_NUDGE = "There's a wheel on it. Wheels want turning.";

// Fires with the 'hatch-open' flag — P7 hangs the crawl-through to the greenhouse off it.
export const HATCH_OPEN = "It's open. Smells green through there. After you, Commander.";

// A wrong keypad code. No penalty, no reset, no scolding — the pad just forgets and waits.
export const KEYPAD_WRONG = "Not that one. No harm done — the crate's just picky.";

// A fifth digit onto a full pad. Not a mistake, just a pad with four little windows.
export const KEYPAD_FULL = "That's four in already. Press OK to try it, or CLR to start over.";

// Any crane control, before the conduit run is carrying power. Warm, and it points at the fix.
export const CRANE_DEAD = "That crane's got no power yet. It just hangs there being heavy.";

// The socket with no fuse anywhere in the inventory yet.
export const NO_FUSE = 'That socket is empty and sad. We need a fuse from somewhere.';

// She owns the fuse but is not carrying it — the HUD strip is the missing step.
export const FUSE_NOT_HELD = 'The fuse is down in your strip. Pick it up first, then tap the socket.';

// ---- object barks — decision 8: no dead clicks ---------------------------------------------
export const BARKS = {
  airlock: "That's your shuttle hatch, sealed up snug behind you. Cosy.",
  note: [
    "A sticky note. That's Taklu Uncle's handwriting — nobody else scrawls like that.",
    { speaker: 'Taklu Uncle', text: TAKLU_NOTE },
  ],
  crates: 'Crates. Stacked by somebody who really cared about stacking.',
  netting: 'Ceiling netting. It holds things up there. Mostly.',
  glowpaint: 'Glow paint! Somebody tagged the crate wall. Four bits of it, I count.',
  rail: 'The crane rides that rail. Well — it will, once it has power.',
  lockerShut: 'This bay is latched shut. Nothing rattles inside. I did check.',
  wallCrates: 'More crates, shoved right up against the wall. Somebody was thorough.',
  crateTower: 'That one goes up and up. I would not lean on it, Commander.',
};
