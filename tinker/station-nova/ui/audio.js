// STATION NOVA — WebAudio synth kit.
//
// 100% synthesized: no audio files, no network, no dependencies.
// Zero side effects at module load — SOUNDS and AMBIENT are plain serialisable data and
// every browser API touch (AudioContext, window) lives inside initAudio() or a playback
// call. That keeps this file importable under bare `node` so the param table is testable.
//
// ---- Voice format (one shape for one-shots, arpeggio notes, ambient beds and textures)
//   src:     'tone' | 'noise'
//   osc:     oscillator type (tone only)
//   freq:    Hz. freqEnd, if present, is an exponential glide target over the voice's life
//   detune:  cents (optional)
//   start:   seconds after trigger (optional, defaults to 0)
//   attack / decay / release: seconds. Total voice length = attack + decay + release
//   sustain: 0-1 — the level the decay lands on before the release tail
//   gain:    0-1 peak
//   filter:  optional BiquadFilter recipe { type, freq, freqEnd?, q }
//   lfo:     ambient beds only — { freq, depth } slow gain breathing so a bed is not a
//            dead test tone
//
// Voicing notes: everything is layered (a transient plus a body), envelopes are
// exponential, and the sub-bass layers are doubled an octave up because laptop speakers
// roll off below ~150 Hz. Nothing here should read as a default beep.

export const SOUNDS = {
  // Every UI tick in the game. Noise transient for the "tock", short warm body under it.
  click: {
    layers: [
      { src: 'noise', start: 0, attack: 0.001, decay: 0.012, sustain: 0.1, release: 0.012, gain: 0.06,
        filter: { type: 'highpass', freq: 2400, q: 0.6 } },
      { src: 'tone', osc: 'triangle', freq: 880, freqEnd: 660, start: 0,
        attack: 0.001, decay: 0.03, sustain: 0.12, release: 0.035, gain: 0.1,
        filter: { type: 'lowpass', freq: 3000, q: 0.7 } },
    ],
  },

  // Heavy latch / drawer / hatch. Low thump, wooden knock, air.
  // Sits well under `solve`: a hatch is a big mechanical event, but the celebration has to
  // be unmistakably the biggest thing in the game (see the margin test).
  clunk: {
    layers: [
      { src: 'tone', osc: 'sine', freq: 120, freqEnd: 52, start: 0,
        attack: 0.001, decay: 0.09, sustain: 0.14, release: 0.15, gain: 0.165 },
      { src: 'noise', start: 0, attack: 0.002, decay: 0.07, sustain: 0.08, release: 0.1, gain: 0.14,
        filter: { type: 'lowpass', freq: 420, freqEnd: 160, q: 0.8 } },
      { src: 'tone', osc: 'triangle', freq: 220, freqEnd: 150, start: 0,
        attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.06, gain: 0.07,
        filter: { type: 'bandpass', freq: 320, q: 1.6 } },
    ],
  },

  // Hover shimmer. Fires constantly, so it stays airy and very quiet.
  glint: {
    layers: [
      { src: 'tone', osc: 'sine', freq: 2093, freqEnd: 2793, detune: 6, start: 0,
        attack: 0.004, decay: 0.06, sustain: 0.2, release: 0.09, gain: 0.045 },
      { src: 'tone', osc: 'sine', freq: 3136, detune: -8, start: 0.01,
        attack: 0.006, decay: 0.05, sustain: 0.15, release: 0.1, gain: 0.028 },
      { src: 'noise', start: 0, attack: 0.004, decay: 0.05, sustain: 0.1, release: 0.07, gain: 0.018,
        filter: { type: 'highpass', freq: 5000, q: 0.5 } },
    ],
  },

  // Ratchet tooth. progressPitch: play('crank', { progress }) picks the pitch between
  // freq and freqEnd instead of gliding, so the torch crank rises turn by turn.
  crank: {
    progressPitch: true,
    layers: [
      { src: 'noise', start: 0, attack: 0.002, decay: 0.03, sustain: 0.08, release: 0.035, gain: 0.14,
        filter: { type: 'bandpass', freq: 900, freqEnd: 2000, q: 4 } },
      { src: 'tone', osc: 'sawtooth', freq: 150, freqEnd: 420, start: 0,
        attack: 0.003, decay: 0.05, sustain: 0.1, release: 0.05, gain: 0.09,
        filter: { type: 'lowpass', freq: 1200, freqEnd: 2600, q: 1.2 } },
    ],
  },

  // Membrane key: hollow body through a lowpass plus a fingernail tick.
  keypad: {
    layers: [
      { src: 'tone', osc: 'square', freq: 700, freqEnd: 640, start: 0,
        attack: 0.002, decay: 0.035, sustain: 0.15, release: 0.035, gain: 0.115,
        filter: { type: 'lowpass', freq: 1800, q: 1 } },
      { src: 'noise', start: 0, attack: 0.001, decay: 0.008, sustain: 0.06, release: 0.01, gain: 0.055,
        filter: { type: 'highpass', freq: 3000, q: 0.6 } },
    ],
  },

  // Gentle by design — this game has no fail states. A soft descending minor third with
  // a warm bed under it: "not quite", never a buzzer. Slow attacks, no click, low gain.
  wrong: {
    layers: [
      { src: 'tone', osc: 'triangle', freq: 392, start: 0,
        attack: 0.02, decay: 0.12, sustain: 0.35, release: 0.22, gain: 0.128,
        filter: { type: 'lowpass', freq: 1600, q: 0.6 } },
      { src: 'tone', osc: 'triangle', freq: 329.63, start: 0.13,
        attack: 0.025, decay: 0.14, sustain: 0.3, release: 0.3, gain: 0.12,
        filter: { type: 'lowpass', freq: 1400, q: 0.6 } },
      { src: 'tone', osc: 'sine', freq: 164.81, start: 0.13,
        attack: 0.03, decay: 0.2, sustain: 0.2, release: 0.34, gain: 0.075 },
    ],
  },

  // The rainbow arpeggio — the celebration sound. C5 E5 G5 B5 D6 E6 over a low bloom,
  // with a noise shimmer sweeping up behind it. The biggest moment in the game: it is
  // deliberately ~1.5x the loudest mechanical sound, and still lands just under the
  // limiter's threshold (peak * master 0.85 < the -6 dBFS knee) so the extra size is
  // actually heard instead of being compressed straight back down.
  solve: {
    layers: [
      { src: 'tone', osc: 'sine', freq: 130.81, start: 0,
        attack: 0.03, decay: 0.3, sustain: 0.34, release: 0.6, gain: 0.15 },
      { src: 'tone', osc: 'triangle', freq: 523.25, start: 0,
        attack: 0.012, decay: 0.14, sustain: 0.42, release: 0.42, gain: 0.225 },
      { src: 'tone', osc: 'triangle', freq: 659.25, start: 0.085,
        attack: 0.012, decay: 0.14, sustain: 0.42, release: 0.42, gain: 0.225 },
      { src: 'tone', osc: 'triangle', freq: 783.99, start: 0.17,
        attack: 0.012, decay: 0.14, sustain: 0.42, release: 0.44, gain: 0.23 },
      { src: 'tone', osc: 'sine', freq: 987.77, start: 0.255,
        attack: 0.01, decay: 0.15, sustain: 0.42, release: 0.48, gain: 0.23 },
      { src: 'tone', osc: 'sine', freq: 1174.66, start: 0.34,
        attack: 0.01, decay: 0.16, sustain: 0.42, release: 0.52, gain: 0.235 },
      { src: 'tone', osc: 'sine', freq: 1318.51, start: 0.425,
        attack: 0.01, decay: 0.18, sustain: 0.42, release: 0.6, gain: 0.245 },
      { src: 'noise', start: 0.1, attack: 0.06, decay: 0.25, sustain: 0.2, release: 0.35, gain: 0.075,
        filter: { type: 'highpass', freq: 2000, freqEnd: 8000, q: 0.7 } },
    ],
  },

  // Item into inventory: a rising fifth with a sparkle on top.
  pickup: {
    layers: [
      { src: 'tone', osc: 'sine', freq: 587.33, start: 0,
        attack: 0.004, decay: 0.06, sustain: 0.2, release: 0.09, gain: 0.12 },
      { src: 'tone', osc: 'sine', freq: 880, start: 0.07,
        attack: 0.004, decay: 0.09, sustain: 0.25, release: 0.2, gain: 0.13 },
      { src: 'tone', osc: 'triangle', freq: 1760, detune: 5, start: 0.07,
        attack: 0.004, decay: 0.05, sustain: 0.12, release: 0.14, gain: 0.05 },
      { src: 'noise', start: 0, attack: 0.002, decay: 0.04, sustain: 0.1, release: 0.06, gain: 0.025,
        filter: { type: 'highpass', freq: 4000, q: 0.6 } },
    ],
  },

  // Camera moves, tube rides, doors sliding. Bandpass sweep plus low air for weight.
  whoosh: {
    layers: [
      { src: 'noise', start: 0, attack: 0.09, decay: 0.14, sustain: 0.55, release: 0.3, gain: 0.17,
        filter: { type: 'bandpass', freq: 300, freqEnd: 3000, q: 0.9 } },
      { src: 'noise', start: 0, attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.35, gain: 0.08,
        filter: { type: 'lowpass', freq: 900, freqEnd: 300, q: 0.6 } },
    ],
  },

  // Station shudder. Sub for the good speakers, 110 Hz double so laptops hear it at all.
  // The 55 Hz sub is trimmed hardest: on a laptop it is felt as headroom, not heard, and
  // the launch rumble must not read as big as a solve.
  rumble: {
    layers: [
      { src: 'noise', start: 0, attack: 0.14, decay: 0.5, sustain: 0.55, release: 0.5, gain: 0.2,
        filter: { type: 'lowpass', freq: 260, freqEnd: 120, q: 0.8 } },
      { src: 'tone', osc: 'sine', freq: 55, start: 0,
        attack: 0.1, decay: 0.5, sustain: 0.6, release: 0.6, gain: 0.1 },
      { src: 'tone', osc: 'triangle', freq: 110, detune: -8, start: 0,
        attack: 0.15, decay: 0.5, sustain: 0.4, release: 0.55, gain: 0.075,
        filter: { type: 'lowpass', freq: 500, q: 0.7 } },
    ],
  },

  // A real bell, not a beep: fundamental plus the inharmonic 2.76x partial that makes
  // struck metal sound struck.
  chime: {
    layers: [
      { src: 'tone', osc: 'sine', freq: 880, start: 0,
        attack: 0.003, decay: 0.35, sustain: 0.25, release: 0.7, gain: 0.13 },
      { src: 'tone', osc: 'sine', freq: 2429, start: 0,
        attack: 0.003, decay: 0.2, sustain: 0.12, release: 0.5, gain: 0.05 },
      { src: 'tone', osc: 'sine', freq: 4400, start: 0,
        attack: 0.002, decay: 0.12, sustain: 0.06, release: 0.3, gain: 0.022 },
      { src: 'tone', osc: 'triangle', freq: 1760, detune: 4, start: 0,
        attack: 0.004, decay: 0.25, sustain: 0.15, release: 0.55, gain: 0.045 },
    ],
  },

  // Hinges, and the unicorn plush. Rubbery up-bend, then a smaller one coming back down.
  squeak: {
    layers: [
      { src: 'tone', osc: 'triangle', freq: 1100, freqEnd: 1750, start: 0,
        attack: 0.008, decay: 0.05, sustain: 0.4, release: 0.06, gain: 0.128,
        filter: { type: 'bandpass', freq: 1600, q: 3 } },
      { src: 'tone', osc: 'sawtooth', freq: 550, freqEnd: 880, start: 0,
        attack: 0.01, decay: 0.05, sustain: 0.35, release: 0.07, gain: 0.06,
        filter: { type: 'lowpass', freq: 2600, q: 1.4 } },
      { src: 'tone', osc: 'triangle', freq: 1750, freqEnd: 1150, start: 0.12,
        attack: 0.006, decay: 0.05, sustain: 0.25, release: 0.06, gain: 0.085,
        filter: { type: 'bandpass', freq: 1500, q: 3 } },
    ],
  },
};

// ---- Ambient loops --------------------------------------------------------------------
// `beds` are continuous voices that fade in with the loop. `textures` are one-shots
// re-triggered at a random interval inside `everyMs`, so no loop turns into a metronome.
export const AMBIENT = {
  // A big dark hold: low hum, a metal tick, something settling far away.
  cargo: {
    beds: {
      hum: { src: 'tone', osc: 'sine', freq: 55, gain: 0.055,
        filter: { type: 'lowpass', freq: 180, q: 0.4 }, lfo: { freq: 0.07, depth: 0.35 } },
      body: { src: 'tone', osc: 'triangle', freq: 110, detune: -6, gain: 0.018,
        filter: { type: 'lowpass', freq: 320, q: 0.5 }, lfo: { freq: 0.11, depth: 0.5 } },
      air: { src: 'noise', gain: 0.012,
        filter: { type: 'lowpass', freq: 500, q: 0.4 }, lfo: { freq: 0.05, depth: 0.4 } },
    },
    textures: {
      tick: {
        everyMs: [5000, 12000],
        layers: [
          { src: 'noise', start: 0, attack: 0.001, decay: 0.02, sustain: 0.08, release: 0.025, gain: 0.05,
            filter: { type: 'bandpass', freq: 2600, q: 6 } },
          { src: 'tone', osc: 'triangle', freq: 1850, freqEnd: 1700, start: 0,
            attack: 0.001, decay: 0.04, sustain: 0.1, release: 0.05, gain: 0.03,
            filter: { type: 'bandpass', freq: 1900, q: 4 } },
        ],
      },
      clank: {
        everyMs: [14000, 26000],
        layers: [
          { src: 'tone', osc: 'sine', freq: 140, freqEnd: 90, start: 0,
            attack: 0.002, decay: 0.18, sustain: 0.12, release: 0.2, gain: 0.045,
            filter: { type: 'lowpass', freq: 400, q: 0.7 } },
          { src: 'noise', start: 0, attack: 0.002, decay: 0.1, sustain: 0.08, release: 0.12, gain: 0.02,
            filter: { type: 'lowpass', freq: 900, freqEnd: 300, q: 0.7 } },
        ],
      },
    },
  },

  // Warm and alive: an F-major pad breathing, water finding its way down, crickets.
  greenhouse: {
    beds: {
      pad: { src: 'tone', osc: 'triangle', freq: 174.61, detune: 5, gain: 0.035,
        filter: { type: 'lowpass', freq: 700, q: 0.6 }, lfo: { freq: 0.06, depth: 0.4 } },
      third: { src: 'tone', osc: 'triangle', freq: 261.63, detune: -7, gain: 0.024,
        filter: { type: 'lowpass', freq: 900, q: 0.5 }, lfo: { freq: 0.045, depth: 0.5 } },
      shine: { src: 'tone', osc: 'sine', freq: 349.23, detune: 9, gain: 0.014,
        filter: { type: 'lowpass', freq: 1400, q: 0.5 }, lfo: { freq: 0.08, depth: 0.6 } },
      air: { src: 'noise', gain: 0.01,
        filter: { type: 'lowpass', freq: 1200, q: 0.4 }, lfo: { freq: 0.03, depth: 0.5 } },
    },
    textures: {
      drip: {
        everyMs: [3000, 8000],
        layers: [
          { src: 'tone', osc: 'sine', freq: 1600, freqEnd: 620, start: 0,
            attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.11, gain: 0.06,
            filter: { type: 'bandpass', freq: 1100, q: 1.4 } },
          { src: 'noise', start: 0, attack: 0.001, decay: 0.01, sustain: 0.06, release: 0.015, gain: 0.02,
            filter: { type: 'highpass', freq: 3000, q: 0.6 } },
        ],
      },
      // Three fast pulses — a chirp is a rhythm, not a tone.
      cricket: {
        everyMs: [4000, 11000],
        layers: [
          { src: 'tone', osc: 'square', freq: 3800, start: 0,
            attack: 0.001, decay: 0.012, sustain: 0.08, release: 0.01, gain: 0.022,
            filter: { type: 'bandpass', freq: 4000, q: 12 } },
          { src: 'tone', osc: 'square', freq: 3800, start: 0.035,
            attack: 0.001, decay: 0.012, sustain: 0.08, release: 0.01, gain: 0.022,
            filter: { type: 'bandpass', freq: 4000, q: 12 } },
          { src: 'tone', osc: 'square', freq: 3700, start: 0.07,
            attack: 0.001, decay: 0.014, sustain: 0.08, release: 0.012, gain: 0.018,
            filter: { type: 'bandpass', freq: 3900, q: 12 } },
        ],
      },
    },
  },

  // Clean and awake: a steady hum, quiet HVAC, consoles talking to themselves.
  bridge: {
    beds: {
      hum: { src: 'tone', osc: 'sine', freq: 98, gain: 0.04,
        filter: { type: 'lowpass', freq: 260, q: 0.4 }, lfo: { freq: 0.05, depth: 0.25 } },
      body: { src: 'tone', osc: 'triangle', freq: 196, detune: 4, gain: 0.016,
        filter: { type: 'lowpass', freq: 520, q: 0.5 }, lfo: { freq: 0.09, depth: 0.4 } },
      air: { src: 'noise', gain: 0.008,
        filter: { type: 'lowpass', freq: 2000, q: 0.3 }, lfo: { freq: 0.04, depth: 0.4 } },
    },
    textures: {
      blip: {
        everyMs: [3500, 9000],
        layers: [
          { src: 'tone', osc: 'square', freq: 1480, start: 0,
            attack: 0.001, decay: 0.03, sustain: 0.1, release: 0.025, gain: 0.035,
            filter: { type: 'bandpass', freq: 1600, q: 6 } },
          { src: 'tone', osc: 'square', freq: 2220, start: 0.06,
            attack: 0.001, decay: 0.025, sustain: 0.1, release: 0.025, gain: 0.022,
            filter: { type: 'bandpass', freq: 2300, q: 6 } },
        ],
      },
    },
  },
};

// ---- Runtime --------------------------------------------------------------------------
// Nothing below runs until initAudio() is called from the page.

const GESTURES = ['pointerdown', 'keydown', 'touchstart'];
const FLOOR = 0.0005;      // exponential ramps cannot reach zero
const TAIL = 0.03;         // grace before a finished voice is stopped
const AMBIENT_FADE = 1.6;  // crossfade seconds
const NOISE_SECONDS = 2;   // length of the one shared white-noise buffer

let ctx = null;
let master = null;
let noiseBuffer = null;
let loop = null;           // the ambient loop currently faded in

/** Create the AudioContext and resume it on a user gesture. A second call is a no-op; in
 *  a non-browser context it does nothing at all.
 *
 *  The gesture listeners stay armed for the whole session on purpose. A context does not
 *  only start suspended — a backgrounded tab, a closed laptop lid, an audio-device change
 *  or an iOS interruption puts a *running* context back to `suspended`, and play() is
 *  silent whenever it is. Dropping the listeners after the first successful resume would
 *  make the game permanently mute until a reload; keeping them means any later click
 *  brings the sound back. When the context is already running they cost one comparison. */
export function initAudio() {
  if (ctx) return;
  if (typeof window === 'undefined') return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (typeof Ctor !== 'function') return;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
    return;
  }

  master = ctx.createGain();
  master.gain.setValueAtTime(0.85, ctx.currentTime);
  // One limiter so a solve arpeggio landing on top of ambience never clips.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-6, ctx.currentTime);
  limiter.knee.setValueAtTime(4, ctx.currentTime);
  limiter.ratio.setValueAtTime(12, ctx.currentTime);
  limiter.attack.setValueAtTime(0.003, ctx.currentTime);
  limiter.release.setValueAtTime(0.12, ctx.currentTime);
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const onGesture = () => {
    if (!ctx || ctx.state === 'running') return;
    try {
      // A legacy webkitAudioContext has no resume(), and a blocked resume() rejects.
      // Neither may escape: this also runs synchronously below, inside page boot.
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* nothing to resume — a later gesture will try again */ }
  };
  GESTURES.forEach((g) => window.addEventListener(g, onGesture, { passive: true }));
  onGesture();
}

function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// One buffer is shared by every noise voice, so playing it from 0 every time makes each
// rumble and whoosh the *same* sample all session — it starts reading as mechanical. A
// random start point stays inside the buffer for the voice's whole life, tail included.
function noiseOffset(dur) {
  return Math.random() * Math.max(0, NOISE_SECONDS - dur - TAIL);
}

// progress !== null replaces the freq->freqEnd glide with a fixed point along it.
function pick(from, to, progress) {
  if (progress === null || typeof to !== 'number') return from;
  return from + (to - from) * progress;
}

// Math.min/Math.max propagate NaN, and a NaN AudioParam value throws
// "The provided float value is non-finite" — which, through attachTo, the engine
// rethrows and the game dies. A widget computing turns/target before target exists
// hands us NaN; treat it as "no progress yet". +/-Infinity clamps on its own.
function clampProgress(p) {
  return Number.isNaN(p) ? 0 : Math.min(1, Math.max(0, p));
}

function envelope(param, spec, t0) {
  const peak = Math.max(spec.gain, FLOOR * 2);
  const held = Math.max(peak * spec.sustain, FLOOR);
  const a = t0 + spec.attack;
  const d = a + spec.decay;
  const r = d + spec.release;
  param.setValueAtTime(FLOOR, t0);
  param.exponentialRampToValueAtTime(peak, a);
  param.exponentialRampToValueAtTime(held, d);
  param.exponentialRampToValueAtTime(FLOOR, r);
  param.setValueAtTime(0, r);
}

function makeFilter(spec, t0, dur, progress) {
  const f = ctx.createBiquadFilter();
  f.type = spec.filter.type;
  f.frequency.setValueAtTime(pick(spec.filter.freq, spec.filter.freqEnd, progress), t0);
  if (progress === null && typeof spec.filter.freqEnd === 'number') {
    f.frequency.exponentialRampToValueAtTime(spec.filter.freqEnd, t0 + dur);
  }
  f.Q.setValueAtTime(spec.filter.q ?? 0.7, t0);
  return f;
}

// One finite voice: builds its own little chain, and tears the whole chain down on
// `ended` so 40 minutes of clicking cannot strand a node.
function voice(spec, t0, dest, progress) {
  const dur = spec.attack + spec.decay + spec.release;
  const nodes = [];
  let src;
  let offset = 0;
  if (spec.src === 'noise') {
    src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    offset = noiseOffset(dur);
  } else {
    src = ctx.createOscillator();
    src.type = spec.osc;
    src.frequency.setValueAtTime(pick(spec.freq, spec.freqEnd, progress), t0);
    if (progress === null && typeof spec.freqEnd === 'number') {
      src.frequency.exponentialRampToValueAtTime(spec.freqEnd, t0 + dur);
    }
    if (spec.detune) src.detune.setValueAtTime(spec.detune, t0);
  }
  nodes.push(src);

  let node = src;
  if (spec.filter) {
    const f = makeFilter(spec, t0, dur, progress);
    node.connect(f);
    nodes.push(f);
    node = f;
  }

  const g = ctx.createGain();
  envelope(g.gain, spec, t0);
  node.connect(g);
  nodes.push(g);
  g.connect(dest);

  src.onended = () => nodes.forEach((n) => n.disconnect());
  // Only a buffer source takes an offset; an oscillator has nothing to seek into.
  if (spec.src === 'noise') src.start(t0, offset);
  else src.start(t0);
  src.stop(t0 + dur + TAIL);
}

function playLayers(layers, dest, progress) {
  const now = ctx.currentTime;
  for (const spec of layers) voice(spec, now + (spec.start || 0), dest, progress);
}

/** Play a synthesized sound by name. `opts.progress` (0-1) is honoured by sounds that
 *  declare progressPitch (crank) and ignored everywhere else. Silent no-op before
 *  initAudio(), before the context has been resumed, and for an unknown name. Never throws. */
export function play(name, opts) {
  if (!ctx || !master || ctx.state !== 'running') return;
  // hasOwn, not a plain lookup: play('constructor') would otherwise find
  // Object.prototype and hand playLayers something that is not a layer list.
  if (!Object.hasOwn(SOUNDS, name)) return;
  const spec = SOUNDS[name];
  const progress = spec.progressPitch && opts && typeof opts.progress === 'number'
    ? clampProgress(opts.progress)
    : null;
  playLayers(spec.layers, master, progress);
}

// A continuous ambient voice. Beds are never stopped by their own envelope; stopBed()
// ends them and disconnects the chain.
function startBed(spec, dest, t0) {
  const nodes = [];
  let src;
  if (spec.src === 'noise') {
    src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
  } else {
    src = ctx.createOscillator();
    src.type = spec.osc;
    src.frequency.setValueAtTime(spec.freq, t0);
    if (spec.detune) src.detune.setValueAtTime(spec.detune, t0);
  }
  nodes.push(src);

  let node = src;
  if (spec.filter) {
    const f = makeFilter(spec, t0, 0, null);
    node.connect(f);
    nodes.push(f);
    node = f;
  }

  const g = ctx.createGain();
  const swing = spec.lfo ? (spec.gain * spec.lfo.depth) / 2 : 0;
  g.gain.setValueAtTime(spec.gain - swing, t0);
  node.connect(g);
  nodes.push(g);
  g.connect(dest);

  let lfo = null;
  if (spec.lfo) {
    lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(spec.lfo.freq, t0);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(swing, t0);
    lfo.connect(depth);
    depth.connect(g.gain);
    nodes.push(lfo, depth);
    lfo.start(t0);
  }

  src.start(t0);
  return { src, lfo, nodes };
}

function stopBed(bed, tEnd, after) {
  bed.src.onended = () => {
    bed.nodes.forEach((n) => n.disconnect());
    after();
  };
  bed.src.stop(tEnd);
  if (bed.lfo) bed.lfo.stop(tEnd);
}

function scheduleTexture(active, tex) {
  const [min, max] = tex.everyMs;
  const id = setTimeout(() => {
    active.timers.delete(id);
    if (active.stopped) return;
    // Timers are wall-clock but ctx.currentTime freezes while suspended: scheduling into
    // a stopped clock would stack every missed texture into one burst on resume.
    if (ctx.state === 'running') playLayers(tex.layers, active.out, null);
    scheduleTexture(active, tex);
  }, min + Math.random() * (max - min));
  active.timers.add(id);
}

function stopLoop(active, t0) {
  active.stopped = true;
  active.timers.forEach((id) => clearTimeout(id));
  active.timers.clear();

  const tEnd = t0 + AMBIENT_FADE;
  // cancelAndHold keeps whatever the fade-in had actually reached at t0. Plain
  // cancelScheduledValues would delete the fade-in's own setValueAtTime as well, and
  // `.value` then reads the un-rendered default 1.0 — so two ambient() calls in the same
  // tick (boot: default loop, then the restored module) would fade the abandoned bus
  // down from FULL gain instead of from silence.
  const g = active.out.gain;
  if (typeof g.cancelAndHoldAtTime === 'function') {
    g.cancelAndHoldAtTime(t0);
  } else {
    g.cancelScheduledValues(t0);
    g.setValueAtTime(Math.max(g.value, FLOOR), t0);
  }
  g.exponentialRampToValueAtTime(FLOOR, tEnd);

  // The bus goes away only once every bed under it has actually ended.
  let live = active.beds.length;
  const done = () => {
    if (--live <= 0) active.out.disconnect();
  };
  active.beds.forEach((bed) => stopBed(bed, tEnd + 0.05, done));
}

/** Start, or crossfade to, one of the three ambient loops: 'cargo', 'greenhouse',
 *  'bridge'. Calling it again with the module already playing is a no-op — one loop
 *  plays, never two. Silent no-op before initAudio() or for an unknown module. */
export function ambient(moduleName) {
  if (!ctx || !master) return;
  if (!Object.hasOwn(AMBIENT, moduleName)) return;   // see play(): not an inherited key
  const spec = AMBIENT[moduleName];
  if (loop && loop.module === moduleName) return;

  const t0 = ctx.currentTime;
  if (loop) stopLoop(loop, t0);

  const out = ctx.createGain();
  out.gain.setValueAtTime(FLOOR, t0);
  out.gain.exponentialRampToValueAtTime(1, t0 + AMBIENT_FADE);
  out.connect(master);

  loop = { module: moduleName, out, beds: [], timers: new Set(), stopped: false };
  for (const bed of Object.values(spec.beds)) loop.beds.push(startBed(bed, out, t0));
  for (const tex of Object.values(spec.textures)) scheduleTexture(loop, tex);
}

/** Play every `sound` event the engine emits. Consumes only the pinned event shape
 *  ({ type: 'sound', name }) — this file never imports the engine. Returns unsubscribe. */
export function attachTo(game) {
  return game.subscribe((e) => {
    if (e && e.type === 'sound') play(e.name);
  });
}
