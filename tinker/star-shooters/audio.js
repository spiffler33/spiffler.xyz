// Star Shooters - audio.js
// Web Audio synth SFX + crowd bed. Touches AudioContext ONLY inside init().
// Sound names: kick, clang, swish, catchball, whistle, goalRoar, saveRoar, aww, fanfare, click, drum
(function () {
  'use strict';

  var MASTER_LEVEL = 0.6;
  var NOISE_SECONDS = 2;
  var CROWD_EASE = 0.8;   // seconds crowd(level) takes to reach its target
  // The crowd bed is one looping source that plays for the whole session. It still gets an
  // explicit stop() so no voice is ever started without a scheduled end.
  var CROWD_SESSION_CAP = 3 * 3600;

  var ctx = null;         // AudioContext - assigned only inside init()
  var ready = false;      // true only once the WHOLE graph exists; gates every entry point
  var master = null;      // the single GainNode every voice routes through
  var noiseBuf = null;    // one white-noise buffer, shared by every noise voice
  var crowdGain = null;   // crowd bed level - created once in init(), never rebuilt
  var crowdLevel = 0;     // the bed's RESTING level: the last target handed to crowd()
  var bedCurve = [{ t: 0, v: 0 }];  // the automation we wrote on the bed, as linear breakpoints
  var bumpUntil = 0;      // a roar owns the bed until this time
  var noisePos = 0;       // rotating read offset so repeated bursts are not identical
  var muted = false;
  var gainBeforeMute = MASTER_LEVEL;

  // Deterministic white noise (mulberry32 body) - no Math.random in shipped logic.
  function whiteNoise(n) {
    var data = new Float32Array(n);
    var s = 0x9e3779b9;
    for (var i = 0; i < n; i++) {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      data[i] = ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
    }
    return data;
  }

  // AudioContextClass -> builds the context + master gain. The only place AudioContext is touched.
  // All-or-nothing: `ready` flips only once the whole graph stands, so a context that dies
  // half-way leaves the module silent (never poisoned) and a later init can still build it.
  function init(AudioContextClass) {
    if (ready || !AudioContextClass) return;
    try {
      var c = new AudioContextClass();

      var m = c.createGain();
      m.gain.value = MASTER_LEVEL;
      m.connect(c.destination);

      var n = Math.floor(c.sampleRate * NOISE_SECONDS);
      var buf = c.createBuffer(1, n, c.sampleRate);
      buf.copyToChannel(whiteNoise(n), 0);

      var bed = c.createBufferSource();
      bed.buffer = buf;
      bed.loop = true;
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 850;
      var bedGain = c.createGain();
      bedGain.gain.value = 0;
      bed.connect(lp);
      lp.connect(bedGain);
      bedGain.connect(m);
      bed.start(c.currentTime);
      bed.stop(c.currentTime + CROWD_SESSION_CAP);

      ctx = c;
      master = m;
      noiseBuf = buf;
      crowdGain = bedGain;
      crowdLevel = 0;
      bedCurve = [{ t: c.currentTime, v: 0 }];
      bumpUntil = 0;
      noisePos = 0;
      gainBeforeMute = MASTER_LEVEL;
      muted = false;
      ready = true;
    } catch (e) {
      // A broken or exhausted AudioContext must never crash the game that asked for sound.
      ctx = null;
      master = null;
      noiseBuf = null;
      crowdGain = null;
      ready = false;
    }
  }

  // Attack-then-decay gain, wired straight into master. Every voice ends here.
  function envelope(t0, dur, peak, attack) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(master);
    return g;
  }

  function tone(type, freq, t0, dur, peak, attack) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.connect(envelope(t0, dur, peak, attack === undefined ? 0.005 : attack));
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function burst(t0, dur, peak, filterType, fromHz, toHz, q) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(fromHz, t0);
    f.frequency.linearRampToValueAtTime(toHz, t0 + dur);
    src.connect(f);
    f.connect(envelope(t0, dur, peak, Math.min(0.02, dur * 0.25)));
    noisePos = (noisePos + 0.37) % NOISE_SECONDS;
    src.start(t0, noisePos);
    src.stop(t0 + dur + 0.02);
  }

  // --- the crowd bed's automation ------------------------------------------------------
  // crowd() and the roar bumps write the same param, so they share one model of the curve
  // they scheduled: linear breakpoints, holding the last value. Anything taking the bed
  // over starts from where the bed REALLY is, never from where it was heading.

  function bedValueAt(t) {
    if (t <= bedCurve[0].t) return bedCurve[0].v;
    for (var i = 1; i < bedCurve.length; i++) {
      var a = bedCurve[i - 1], b = bedCurve[i];
      if (t < b.t) return a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t));
    }
    return bedCurve[bedCurve.length - 1].v;
  }

  // Takes the bed over from t0: anchors on its real current value, then ramps through points.
  function bedRewrite(t0, points) {
    var g = crowdGain.gain;
    var v0 = bedValueAt(t0);
    g.cancelScheduledValues(t0);
    g.setValueAtTime(v0, t0);
    bedCurve = [{ t: t0, v: v0 }];
    for (var i = 0; i < points.length; i++) {
      g.linearRampToValueAtTime(points[i].v, points[i].t);
      bedCurve.push(points[i]);
    }
  }

  // Hangs one more ramp off the end of what is already scheduled - cancels nothing.
  function bedAppend(v, t) {
    crowdGain.gain.linearRampToValueAtTime(v, t);
    var last = bedCurve.length - 1;
    if (bedCurve[last].t === t) bedCurve[last] = { t: t, v: v };
    else bedCurve.push({ t: t, v: v });
  }

  // Roars lift the bed above its resting level, then settle back to it on their own.
  function crowdBump(t0, amount, dur) {
    bedRewrite(t0, [
      { t: t0 + 0.15, v: Math.min(1, crowdLevel + amount) },
      { t: t0 + dur, v: crowdLevel }
    ]);
    bumpUntil = t0 + dur;
  }

  var GOLD_TRIAD = [440, 554.37, 659.25];

  var VOICES = {
    kick: function (t) {
      tone('sine', 60, t, 0.08, 0.9);
      burst(t, 0.03, 0.35, 'highpass', 1600, 1600, 0.7);
    },
    clang: function (t) {
      tone('square', 400, t, 0.35, 0.22);
      tone('square', 407, t, 0.35, 0.22);
    },
    swish: function (t) {
      burst(t, 0.18, 0.3, 'bandpass', 1800, 600, 1.2);
    },
    catchball: function (t) {
      burst(t, 0.12, 0.45, 'lowpass', 900, 260, 0.9);
    },
    whistle: function (t) {
      tone('triangle', 2200, t, 0.14, 0.2);
      tone('triangle', 2200, t + 0.2, 0.14, 0.2);
    },
    goalRoar: function (t) {
      burst(t, 1.5, 0.5, 'bandpass', 300, 800, 0.8);
      crowdBump(t, 0.5, 1.5);
    },
    saveRoar: function (t) {
      burst(t, 1.5, 0.45, 'bandpass', 300, 800, 0.8);
      crowdBump(t, 0.4, 1.5);
    },
    aww: function (t) {
      burst(t, 1.2, 0.32, 'bandpass', 800, 220, 0.8);
    },
    fanfare: function (t) {
      for (var i = 0; i < 6; i++) {
        tone('square', GOLD_TRIAD[i % 3], t + i * 0.14, 0.14, 0.2);
      }
    },
    click: function (t) {
      tone('square', 1400, t, 0.005, 0.14, 0.001);
    },
    drum: function (t) {
      for (var i = 0; i < 4; i++) tone('sine', 55, t + i * 0.18, 0.16, 0.85);
    }
  };

  // name -> plays one synthesized SFX
  function play(name) {
    if (!ready || !Object.prototype.hasOwnProperty.call(VOICES, name)) return;
    VOICES[name](ctx.currentTime);
  }

  // level 0..1 -> eases the crowd bed gain
  function crowd(level) {
    if (!ready) return;
    var target = Math.min(1, Math.max(0, Number(level) || 0));
    if (target === crowdLevel) return;   // already resting there: own nothing, cancel nothing
    crowdLevel = target;
    var t = ctx.currentTime;
    // A roar owns the bed until bumpUntil - let it finish, then ease to the new resting level.
    if (t < bumpUntil) bedAppend(target, bumpUntil + CROWD_EASE);
    else bedRewrite(t, [{ t: t + CROWD_EASE, v: target }]);
  }

  // -> muted
  function toggleMute() {
    if (!ready) return muted;
    muted = !muted;
    if (muted) {
      gainBeforeMute = master.gain.value;
      master.gain.value = 0;
    } else {
      master.gain.value = gainBeforeMute;
    }
    return muted;
  }

  var GameAudio = {
    init: init,
    play: play,
    crowd: crowd,
    toggleMute: toggleMute
  };

  globalThis.StarShooters = globalThis.StarShooters || {};
  globalThis.StarShooters.GameAudio = GameAudio;
  if (typeof module !== 'undefined') module.exports = GameAudio;
})();
