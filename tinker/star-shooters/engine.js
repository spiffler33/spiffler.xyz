// Star Shooters - engine.js
// Pure geometry / zones / shot solver / strike meter / save judge. No globals, no DOM.
// Coordinates (shooter's perspective, both halves): goal mouth plane at z=0;
// x in [-3.66, +3.66] m between posts (- = left), y in [0, 2.44] m ground -> bar,
// penalty spot at (0, 0, 11).
(function () {
  'use strict';

  // speed m/s at power 0 -> 1 (flightTime = 11/speed); arc = peak extra height.
  var SHOT_TYPES = {
    laser:     { speed: [19, 30], curl: 0,   arc: 0.0,  wobble: 0,   scuffSensitivity: 1.2 },
    curler:    { speed: [15, 22], curl: 1.6, arc: 0.3,  wobble: 0,   scuffSensitivity: 0.8 },
    chip:      { speed: [9, 12],  curl: 0,   arc: 1.4,  wobble: 0,   scuffSensitivity: 0.6 },
    knuckle:   { speed: [17, 26], curl: 0,   arc: 0.2,  wobble: 0.6, scuffSensitivity: 1.0 },
    lowrocket: { speed: [20, 28], curl: 0,   arc: -0.5, wobble: 0,   scuffSensitivity: 1.1 }
  };

  // ---- mouth geometry (metres) ---------------------------------------------
  var POST_X = 3.66;          // |x| of each post
  var BAR_Y = 2.44;           // crossbar height
  var SPOT_Z = 11;            // penalty spot distance from the goal plane
  var FRAME_BAND = 0.12;      // an impact this close to a post/bar clips the frame
  var SAMPLES = 49;           // flight samples (contract: >= 30; odd, so one lands at mid-flight)
  var SCUFF_METRES = 1.4;     // scuff * scuffSensitivity * this = metres of displacement
  var WOBBLE_SHARE = 0.6;     // knuckle lands within wobble * this metres of the aim
  var LOWROCKET_MAX_Y = 1.0;  // lowrocket hugs the ground: its aim is clamped to this

  // Distance from the middle of the mouth to a corner - the cornerness normaliser.
  var CORNER_SPAN = Math.sqrt(POST_X * POST_X + (BAR_Y / 2) * (BAR_Y / 2));

  // ---- tuning (P9 tunes these numbers, never the structure) ----------------
  // Both blocks stay UNEXPORTED: an exported table is live module state any caller could
  // rewrite, which would break the lifetime invariant and a seeded replay with it. Callers
  // read the meter through meterWindow and the judge through resolveShot.
  // Strike meter. meterWindow reads this table.
  var METER = { sweet: 0.12, pressureSweetMul: 0.7, wobbleAmp: 0.06 };

  // Save judge: base by dive vs impact zone, then the multiplier chain.
  var JUDGE = {
    adjacent: 0.35,        // dive one zone away, x reach
    stayCentre: 1.1,       // 'stay' vs a centre-column impact, x reach
    stayChip: 0.85,        // 'stay' vs a chip in any column, flat (not scaled by reach)
    weakPower: 0.5,        // below this power a wrong-way keeper can scramble back...
    weakRescue: 0.6,       // ...to this flat base, centre column only
    cornerPenalty: 0.85,   // x (1 - cornerness * this)
    scuffBonus: 0.9,       // x (1 + scuff * this)
    paceRef: 0.55,         // x clamp(flightTime / paceRef, paceMin, paceMax)
    paceMin: 0.6,
    paceMax: 1.0,
    timingSlack: 0.5,      // |timing| beyond this means the keeper committed way early/late...
    timingPenalty: 0.5,    // ...and halves the chance
    catchPower: 0.65,      // a save below this power is caught, at or above it is parried
    stance: { cheatMatch: 1.15, cheatWrong: 0.7, staybigDive: 0.8, staybigStay: 1.3 }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // Standard mulberry32. Real in P0 (not a stub) because P2/P3 need a seeded rng before P1 lands.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function rng() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 3 cols x 2 rows -> 0..5. Cols are the even thirds of the mouth (boundaries at +/-1.22).
  // Real in P0 for the same reason as mulberry32.
  function zoneOf(x, y) {
    var col = x < -1.22 ? 0 : (x < 1.22 ? 1 : 2);
    var row = y < 1.22 ? 0 : 1;
    return col + 3 * row;
  }

  // { type, aim:{x,y}, power, strike, rng, boost? }
  //   -> { flight, impact, flightTime, scuff, frame, wide }
  //
  // `boost` is the signature move's optional { scuffMul, curlMul, rise }. It is read HERE, inside
  // the one solver, and not applied by a caller after the fact: the scuff multiplier changes the
  // landing point, the curl multiplier changes the shape of the path, and the dip rise changes
  // the arc - all three live in the middle of the solve. A second solver, or a post-process on
  // the returned flight, would be a second definition of the shot (invariant 1) and would desync
  // the recorded samples a replay re-renders (invariant 6).
  //
  // With no boost every one of the three is exactly a x1 or a +0, so the unboosted path is
  // bit-for-bit the path it was before any of this existed. The boosted engine tests hold that.
  function solveShot(shot) {
    var T = SHOT_TYPES[shot.type];
    var B = shot.boost;
    var scuffMul = B && B.scuffMul > 0 ? B.scuffMul : 1;
    var curlMul = B && B.curlMul > 0 ? B.curlMul : 1;
    var rise = B && B.rise > 0 ? B.rise : 0;
    var rng = shot.rng;
    var power = clamp(shot.power || 0, 0, 1);
    var aimX = shot.aim.x;
    // lowrocket hugs the ground: clamp its aim to 1.0 m BEFORE solving, so aim-is-destination
    // is measured against the CLAMPED aim (pinned).
    var aimY = shot.type === 'lowrocket' ? Math.min(shot.aim.y, LOWROCKET_MAX_Y) : shot.aim.y;

    var speed = T.speed[0] + (T.speed[1] - T.speed[0]) * power;
    var flightTime = SPOT_Z / speed;
    // +POWER's scuff multiplier lands here, before anything reads the scuff: one boosted number
    // then feeds BOTH the metres the ball is thrown off by and the judge's scuff bonus, so the
    // boost has exactly one meaning. The clamp still caps it at a whole scuff.
    var scuff = clamp(Math.abs(shot.strike || 0) * scuffMul, 0, 1);

    // rng draws, in this fixed order: knuckle wobble (only for a type that wobbles), then the
    // scuff direction (only for an imperfect strike). Nothing else in here touches rng.
    var ix = aimX;
    var iy = aimY;
    if (T.wobble > 0) {
      var wr = WOBBLE_SHARE * T.wobble * rng();   // <= 0.6 * wobble m off the aim, even when perfect
      var wa = 2 * Math.PI * rng();
      ix += wr * Math.cos(wa);
      iy += wr * Math.sin(wa);
    }
    if (scuff > 0) {
      var sd = scuff * T.scuffSensitivity * SCUFF_METRES;
      var sa = 2 * Math.PI * rng();
      ix += sd * Math.cos(sa);
      iy += sd * Math.sin(sa);
    }

    // Vertical shape: a parabolic bump, zero at both ends, so the path lands exactly on impact.
    // Positive arc peaks `arc` m ABOVE the landing height (so a chip always loops that far over
    // it, whatever it is aimed at); negative arc sags toward the ground, capped at a quarter of
    // the landing height, which is exactly the deepest sag that never digs below y = 0.
    // +DIP's rise simply adds to whatever arc the base type already has, because `arc` is
    // already "peak height above the landing height": a laser (arc 0) then flies at aim.y + 0.5
    // and drops onto the aim, which is the pinned sentence word for word, and a type with an arc
    // of its own keeps it and gains the rise on top. A lowrocket's -0.5 sag plus a 0.5 rise is
    // exactly 0, so a dipped lowrocket flies flat and its samples still never pass y = 1.0.
    var arc = T.arc + rise;
    var amp = arc > 0
      ? arc + Math.max(0, iy / 2)
      : (arc < 0 ? -Math.min(-arc, Math.max(0, iy / 4)) : 0);
    // Curl bows the path off the straight chord and back onto it, away from the target side
    // first, so the ball looks like it swerves in late.
    var curlAmp = T.curl * curlMul * (ix <= 0 ? 1 : -1);

    var flight = new Array(SAMPLES);
    for (var i = 0; i < SAMPLES; i++) {
      var u = i / (SAMPLES - 1);
      var bump = 4 * u * (1 - u);   // 1 at mid-flight, exactly 0 at both ends
      flight[i] = {
        t: u * flightTime,
        x: ix * u + curlAmp * bump,
        y: iy * u + amp * bump,
        z: SPOT_Z * (1 - u)
      };
    }

    // Classification runs on the POST-scuff landing point, never on the aim.
    // The bar only spans the mouth and the posts only stand on the ground, so each band is
    // bounded by the frame's real extent. A clipped top corner reads as the bar.
    var onBar = Math.abs(ix) <= POST_X + FRAME_BAND && iy >= 0 &&
                Math.abs(iy - BAR_Y) <= FRAME_BAND;
    var onPost = iy >= 0 && iy <= BAR_Y + FRAME_BAND &&
                 Math.abs(Math.abs(ix) - POST_X) <= FRAME_BAND;
    var frame = onBar ? 'bar' : (onPost ? 'post' : null);
    var inMouth = Math.abs(ix) <= POST_X && iy >= 0 && iy <= BAR_Y;

    return {
      flight: flight,
      impact: { x: ix, y: iy },
      flightTime: flightTime,
      scuff: scuff,
      frame: frame,
      wide: frame === null && !inMouth
    };
  }

  // { pressure } -> { sweet, wobbleAmp }
  function meterWindow(opts) {
    var pressure = opts && opts.pressure ? 1 : 0;
    return {
      sweet: pressure ? METER.sweet * METER.pressureSweetMul : METER.sweet,
      wobbleAmp: pressure ? METER.wobbleAmp : 0
    };
  }

  // 0 in the middle of the mouth, 1 in a corner: the distance to the NEAREST corner, normalised
  // by the centre-to-corner distance. Only ever asked about an impact inside the mouth, where it
  // lands in [0, 1].
  function cornerness(x, y) {
    var dx = POST_X - Math.abs(x);
    var dy = Math.min(y, BAR_Y - y);
    return 1 - Math.sqrt(dx * dx + dy * dy) / CORNER_SPAN;
  }

  // Shares a col or a row edge in the 3x2 grid. Diagonals are NOT adjacent.
  function adjacent(a, b) {
    var dc = Math.abs((a % 3) - (b % 3));
    var dr = Math.abs(Math.floor(a / 3) - Math.floor(b / 3));
    return dc + dr === 1;
  }

  // Cheating to a side pays off only when the ball goes to that side; everywhere else the
  // keeper is leaning the wrong way.
  function stanceMul(stance, keeperZone, impactCol) {
    if (stance === 'staybig') {
      return keeperZone === 'stay' ? JUDGE.stance.staybigStay : JUDGE.stance.staybigDive;
    }
    if (stance === 'cheat-l') {
      return impactCol === 0 ? JUDGE.stance.cheatMatch : JUDGE.stance.cheatWrong;
    }
    if (stance === 'cheat-r') {
      return impactCol === 2 ? JUDGE.stance.cheatMatch : JUDGE.stance.cheatWrong;
    }
    return 1;   // 'balanced'
  }

  // (shotResult, keeper, rng) -> { outcome, saveChance }  -- the one and only judge (invariant 1)
  function resolveShot(shotResult, keeper, rng) {
    // Pinned precedence: wide, then frame, then the judge. Both early exits return WITHOUT
    // drawing from rng - the judge's roll is the only draw in here.
    if (shotResult.wide) return { outcome: 'miss', saveChance: 0 };
    if (shotResult.frame) return { outcome: 'post', saveChance: 0 };

    // reach comes from TEAMS[team].goalie.reach; P4/P5 merge it into the dive object.
    var reach = keeper.reach;
    if (!(reach >= 0)) throw new Error('resolveShot: keeper.reach is required');
    // solveShot returns neither of these - the caller composes them onto its result before
    // judging. Missing type silently loses the chip rule; missing power silently loses the
    // weak-shot rescue AND turns every catch into a parry, so both fail loudly instead.
    if (typeof shotResult.type !== 'string') throw new Error('resolveShot: shot.type is required');
    if (!(shotResult.power >= 0)) throw new Error('resolveShot: shot.power is required');

    var ix = shotResult.impact.x;
    var iy = shotResult.impact.y;
    var zone = zoneOf(ix, iy);
    var col = zone % 3;

    var base;
    if (keeper.zone === 'stay') {
      // A chip over a keeper who stayed is punished in every column, so the chip rule wins
      // over the centre-column rule when both apply.
      if (shotResult.type === 'chip') base = JUDGE.stayChip;
      else base = col === 1 ? reach * JUDGE.stayCentre : 0;
    } else if (keeper.zone === zone) {
      base = reach;
    } else if (adjacent(keeper.zone, zone)) {
      base = reach * JUDGE.adjacent;
    } else {
      base = 0;
    }
    // Weak-shot rescue: a keeper who went the wrong way (base 0) still scrambles back for a
    // soft centre shot.
    if (base === 0 && shotResult.power < JUDGE.weakPower && col === 1) base = JUDGE.weakRescue;

    var saveChance = base *
      (1 - cornerness(ix, iy) * JUDGE.cornerPenalty) *
      (1 + shotResult.scuff * JUDGE.scuffBonus) *
      clamp(shotResult.flightTime / JUDGE.paceRef, JUDGE.paceMin, JUDGE.paceMax) *
      (Math.abs(keeper.timing) > JUDGE.timingSlack ? JUDGE.timingPenalty : 1) *
      stanceMul(keeper.stance, keeper.zone, col);
    saveChance = clamp(saveChance, 0, 1);

    if (rng() < saveChance) {
      return {
        outcome: shotResult.power < JUDGE.catchPower ? 'save' : 'parry',
        saveChance: saveChance
      };
    }
    return { outcome: 'goal', saveChance: saveChance };
  }

  var Engine = {
    SHOT_TYPES: SHOT_TYPES,
    mulberry32: mulberry32,
    zoneOf: zoneOf,
    // Exported for P7's replay trigger ("a goal with cornerness >= 0.8"). The front end asks the
    // engine rather than deriving a zone-based lookalike of its own - a second definition of the
    // same idea is exactly what invariant 1 exists to forbid.
    cornerness: cornerness,
    solveShot: solveShot,
    meterWindow: meterWindow,
    resolveShot: resolveShot
  };

  globalThis.StarShooters = globalThis.StarShooters || {};
  globalThis.StarShooters.Engine = Engine;
  if (typeof module !== 'undefined') module.exports = Engine;
})();
