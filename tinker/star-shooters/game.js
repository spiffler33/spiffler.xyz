// Star Shooters - game.js
// All rendering, screens, input, replays. Everything external arrives injected via Game.create,
// so the whole game runs headless under the node stubs (invariant 5): no document / window /
// Image / AudioContext / requestAnimationFrame anywhere in here - not at load, not in create,
// not in step / onKey / onPointer.
(function () {
  'use strict';

  var W = 960, H = 600;

  // Camera behind the penalty spot, looking down the pitch. Engine coordinates, shooter's
  // perspective: goal plane z = 0, spot z = 11, x +/-3.66 between posts, y 0 -> 2.44.
  // The camera NEVER moves - the whole static scene is pre-rendered against it (invariant 8).
  var CAM = { x: 0, y: 1.9, z: 19 };
  var FOCAL = 1400;
  var HORIZON = 150;            // screen y of eye level at infinity
  var CX = W / 2;
  var PX = FOCAL / CAM.z;       // metres -> px in the goal plane (z = 0)

  // The keep camera looks the other way: from just behind the goal line, out at the striker.
  // x is deliberately NOT mirrored - world -x stays on the LEFT of the screen in BOTH halves of
  // the match. So "left" means one single thing all game: the left arrow, the cheat-left stance
  // and column 0 are the same side of the screen whether Ved is shooting or keeping. That is a
  // mirror of what a real keeper sees, and nothing in the scene is asymmetric enough to give it
  // away - whereas a flipped keep screen would make the glance tell mean the opposite thing in
  // each half, which is the one confusion this game cannot afford.
  var KCAM = { x: 0, y: 1.45, z: -5 };
  var KFOCAL = 560;
  var KHORIZON = 300;

  // The replay camera: a THIRD fixed camera, behind the goal and above the bar, looking back up
  // the pitch. Fixed for exactly the same reason as the other two - its backdrop is pre-rendered
  // once in create, so animating it would desync everything drawn over it (invariant 8).
  var RCAM = { x: 1.0, y: 3.4, z: -7.5 };
  var RFOCAL = 620;
  var RHORIZON = 210;

  var POST_X = 3.66, BAR_Y = 2.44, SPOT_Z = 11, BALL_R = 0.11;
  var TAU = Math.PI * 2;

  // night-neon palette, PLAN.md. EVERY hue in this file is declared here - the per-team neon
  // accents are the only others, and they come from AI.TEAMS, never copied in as a literal.
  var INK = '#050510', DEEP = '#0A0A2A', CYAN = '#00F0FF', GOLD = '#FEBE10', WHITE = '#FFFFFF';
  // The near-blacks the pitch and the crowd silhouettes are built from, and the one cool off-white
  // the players are drawn in. Named rather than scattered as literals so the palette block above
  // stays the single place a hue is decided.
  var CROWD_INK = '#070713', HEAD_A = '#0C0C1E', HEAD_B = '#101026', PITCH_INK = '#04040C';
  var SHADOW = '#0E1030', BONE = '#E8ECFF';
  var FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  var METER_SPEED = 1.2;        // meter sweep speed, units/sec across [-1, 1]
  var BANNER_HOLD = 900;        // ms the outcome banner holds before it takes SPACE
  var POWER_RATE = 1400;        // ms of held arrow to sweep power end to end
  var WOBBLE_MS = 120;          // period/2pi of the pressure wobble, ms - a ~1.3 Hz nervous sway

  // ---- the replay (P9 tunes these) ---------------------------------------------------------
  var REPLAY_RATE = 0.35;       // pinned: the replay runs at 0.35x
  var REPLAY_TAIL = 250;        // replay-clock ms the last frame holds before handing back
  var REPLAY_SAMPLES = 25;      // keeper positions recorded across the flight
  var CORNER_SCREAMER = 0.8;    // pinned: cornerness at or above this, with...
  var CLEAN_STRIKE = 0.2;       // ...scuff below this, is a goal worth showing again
  var HARD_SHOT = 0.7;          // pinned: a save Ved makes off this power or more is too
  var CONFETTI = 400;           // pinned cap; the pool is allocated ONCE and reused forever

  // ---- keeping (P9 tunes these) ------------------------------------------------------------
  // The judge reads `timing` as -1..1 with 0 at the strike, so this is the number of seconds
  // early that counts as fully early. |timing| > 0.5 costs the keeper half his chance, so a
  // commit more than 0.225 s before the strike is punished - and EARLY_DIVE at 0.15 s is inside
  // that, on purpose: showing your hand early is seen by a sharp striker BEFORE it costs you.
  var TIMING_WINDOW = 0.45;     // seconds; the full scale of the timing reading
  var EARLY_DIVE = 0.15;        // seconds before the strike that an elite striker can react to
  var RUNUP_MS = 1500;          // ms of CPU run-up: the whole window Ved has to read and commit
  var TELL_AT = 0.40;           // fraction of the run-up at which the glance tell starts
  var DIVE_MS = 260;            // ms for the gloves to travel once he commits
  var SD_FLASH = 2200;          // ms the SUDDEN DEATH banner stays up

  // Pinned by the engine - the judge matches these four strings exactly.
  var STANCES = ['balanced', 'cheat-l', 'cheat-r', 'staybig'];
  var STANCE_LABEL = ['BALANCED', 'CHEAT LEFT', 'CHEAT RIGHT', 'STAY BIG'];
  var STANCE_HINT = ['NO GUESS', 'LEAN LEFT', 'LEAN RIGHT', 'DO NOT DIVE'];

  // Zone 0..5 in words a nine-year-old reads at a glance.
  var ZONE_NAME = ['LOW LEFT', 'LOW MIDDLE', 'LOW RIGHT', 'UP LEFT', 'UP MIDDLE', 'UP RIGHT'];
  // Column edges in metres, for the glance-tell band.
  var COL_EDGE = [[-POST_X, -1.22], [-1.22, 1.22], [1.22, POST_X]];

  var TYPE_LABEL = {
    laser: 'LASER', curler: 'CURLER', chip: 'CHIP',
    knuckle: 'KNUCKLE', lowrocket: 'LOW ROCKET'
  };
  var TYPE_HINT = {
    laser: 'FAST + FLAT', curler: 'BENDS IN', chip: 'LOOPS OVER',
    knuckle: 'WOBBLY', lowrocket: 'HUGS THE GRASS'
  };
  var DIGIT_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

  // Ved's XI, his list verbatim. DISPLAY ONLY, and deliberately so: the shirt he sends up is a
  // ritual before the kick and reaches nothing that solves, judges or keeps a shot. Whoever
  // takes it, the kick plays out identically.
  var SQUAD = ['KRISHNANO RONALDO', 'LIONEL MESSI', 'PELE', 'RONALDINHO', 'BECKHAM',
    'BUFFON (GK)', 'VAN DIJK', 'ROBERTO CARLOS', 'CAFU', 'MALDINI', 'RODRI'];
  var SQUAD_COLS = 3;

  // ---- the signature move --------------------------------------------------------------------
  // The three pinned boosts. `shot` is handed to the solver VERBATIM as its `boost`, so the only
  // place these numbers mean anything is inside engine.solveShot. `floor` is the odd one out and
  // deliberately lives outside that object: a power floor has to reach the JUDGE as well as the
  // solver, so commitKick applies it once and hands that single number to both. Splitting it
  // across two call sites would be two definitions of one boost (invariant 1).
  var BOOSTS = [
    { id: '+POWER', hint: 'ALWAYS A ROCKET, HARDER TO TIME', floor: 0.85, shot: { scuffMul: 1.2 } },
    { id: '+BEND', hint: 'THE CURLER SWERVES HALF AGAIN', floor: 0, shot: { curlMul: 1.5 } },
    // +DIP's hint names the LOW ROCKET for the same reason +BEND's names the CURLER: the boost
    // adds its rise to the base type's own arc, and the low rocket's -0.5 sag cancels it exactly,
    // so that one pairing flies dead flat. The arc arithmetic is right - the card just has to say
    // so, rather than promising a nine-year-old a climb the ball will not make.
    { id: '+DIP', hint: 'FLIES HIGH — NOT THE LOW ROCKET', floor: 0, shot: { rise: 0.5 } }
  ];
  var SIG_NAME_MAX = 12;             // pinned: a typed name is at most 12 characters
  var SIG_DEFAULT = 'THE VED SPECIAL';   // pinned: what ENTER on its own accepts
  // Key code -> letter, as a closed lookup table built once and matched exactly, exactly the way
  // DIGIT_CODES already is. Nothing here picks an input string apart.
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var LETTER_CODES = [];
  for (var li = 0; li < LETTERS.length; li++) LETTER_CODES.push('Key' + LETTERS.charAt(li));

  // Zone centres in metres, for the keeper's dive target.
  var ZONE_X = [-2.44, 0, 2.44];
  var ZONE_Y = [0.61, 1.83];
  var KEEPER_Y = 0.86;   // body centre when he is stood on his line

  // The complete pinned line set from PLAN.md, verbatim. No copy outside this table.
  var BANNERS = {
    goal: 'GOOOOAL!',
    unstoppable: 'UNSTOPPABLE!',    // a Ved goal that screamed into a corner
    save: 'WHAT A SAVE!',
    parry: 'THE KEEPER READ IT!',
    post: 'OFF THE POST!',
    bar: 'OFF THE BAR!',
    miss: 'SO CLOSE — GO AGAIN!',
    gloves: 'GLOVES OF GOLD!',      // Ved himself made the save
    ice: 'VED. ICE. VEINS.',        // he stood up and they blazed it over
    champion: 'CHAMPION!',
    rematch: 'REMATCH?',
    sudden: 'SUDDEN DEATH!'
  };

  // NaN must never survive a clamp. `v < lo` and `v > hi` are BOTH false for NaN, so the naive
  // form passes it straight through: one junk pointer coordinate would give aim {NaN, NaN},
  // zoneOf would answer 5, and the keeper would spend the rest of the match learning a habit
  // Ved never had - silently, with no throw and no visible symptom. Testing the other way round
  // sends anything that will not compare (NaN included) to `lo`.
  function clamp(v, lo, hi) { return v > lo ? (v < hi ? v : hi) : lo; }

  // '#RRGGBB' + alpha -> 'rgba(...)'. Fixed six-digit format, our own constants plus TEAMS.color.
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // world -> screen. s is the metres-to-px scale at that depth.
  function proj(x, y, z) {
    var dz = CAM.z - z;
    if (dz < 0.5) dz = 0.5;
    var s = FOCAL / dz;
    return { x: CX + (x - CAM.x) * s, y: HORIZON + (CAM.y - y) * s, s: s };
  }

  // Same, from the goal line looking out. Depth runs the other way (the pitch is at z > KCAM.z)
  // and x keeps its sign, for the reason spelled out at KCAM.
  function projK(x, y, z) {
    var dz = z - KCAM.z;
    if (dz < 0.5) dz = 0.5;
    var s = KFOCAL / dz;
    return { x: CX + (x - KCAM.x) * s, y: KHORIZON + (KCAM.y - y) * s, s: s };
  }

  // And from behind the bar, for the replay. Depth runs the same way as projK's; the camera sits
  // off to one side and above, which is the only reason a replay looks like a different angle
  // rather than the keep screen again.
  function projR(x, y, z) {
    var dz = z - RCAM.z;
    if (dz < 0.5) dz = 0.5;
    var s = RFOCAL / dz;
    return { x: CX + (x - RCAM.x) * s, y: RHORIZON + (RCAM.y - y) * s, s: s };
  }

  // Index into a recorded sample list at fraction u of the flight. Both tracks the replay walks
  // - the ball's and the keeper's - step through this, so they cannot drift apart.
  function span(list, u) {
    var i = (u > 0 ? (u < 1 ? u : 1) : 0) * (list.length - 1);
    var lo = Math.floor(i);
    return { a: list[lo], b: list[Math.min(list.length - 1, lo + 1)], g: i - lo };
  }

  function mix(a, b, g) { return a + (b - a) * g; }

  // { canvas, createCanvas, engine, shootout, ai, audio, rng } -> game
  // game.step(dtMs) ; game.onKey(code, isDown) ; game.onPointer({x, y, type}) ; game.screen
  function create(deps) {
    var ctx = deps.canvas.getContext('2d');
    var makeCanvas = deps.createCanvas;
    var engine = deps.engine, shootout = deps.shootout, ai = deps.ai, audio = deps.audio;
    var rng = deps.rng;

    // Decoration draws from its OWN stream: stars and crowd dots must never move the match rng,
    // or a seeded replay would depend on how the backdrop was drawn (invariant 4).
    var deco = engine.mulberry32(0x5A11);

    var types = Object.keys(engine.SHOT_TYPES);
    var teamIds = Object.keys(ai.TEAMS);
    // Difficulty stars are derived from the shipped goalie reach, so re-tuning TEAMS can never
    // leave a card claiming a difficulty that no longer exists.
    var byReach = teamIds.slice().sort(function (a, b) {
      return ai.TEAMS[a].goalie.reach - ai.TEAMS[b].goalie.reach;
    });

    var st = {
      t: 0,
      held: {},
      muted: false,
      tally: { w: 0, l: 0 },   // session-only W-L, bumped when the result screen is dismissed
      pick: 0,
      taker: 0,                // cursor on the lineup screen
      takerName: null,         // the shirt sent up for the kick now being played
      used: [],                // shirt indices already sent up THIS match
      teamId: null, team: null,
      match: null, goalie: null, striker: null, cards: null,
      log: [],                 // this session's kicks - shootout.js keeps no history
      sig: null,               // the signature move built for THIS match; dies with it
      toldAim: false,
      sdShown: false, sdT: -1, // SUDDEN DEATH is announced once per match; sdT < 0 = not showing
      res: null, confettiOn: false,
      replay: null,            // the recorded samples the replay screen re-renders
      k: null                  // per-kick state; null unless a kick or a keep is live
    };

    // The stadium wears the whole palette plus the three team accents - never a team colour
    // copied in as a literal, which would go stale the moment TEAMS is retuned.
    var crowdDots = [CYAN, GOLD, WHITE].concat(teamIds.map(function (id) {
      return ai.TEAMS[id].color;
    }));

    // ---- pre-rendered sprites: built ONCE, here, never inside step (invariant 8) -------------

    function makeGlow(color) {
      var size = 64, r = size / 2;
      var c = makeCanvas(size, size);
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, rgba(color, 0.95));
      grad.addColorStop(0.35, rgba(color, 0.45));
      grad.addColorStop(1, rgba(color, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }

    function makeBackdrop() {
      var c = makeCanvas(W, H);
      var g = c.getContext('2d');

      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, INK);
      sky.addColorStop(1, DEEP);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // stars
      for (var i = 0; i < 150; i++) {
        var sx = deco() * W, sy = deco() * (HORIZON - 96), sr = deco() < 0.15 ? 2 : 1;
        g.globalAlpha = 0.25 + deco() * 0.6;
        g.fillStyle = WHITE;
        g.fillRect(sx, sy, sr, sr);
      }
      g.globalAlpha = 1;

      // floodlight cones
      var lamps = [120, 360, 600, 840];
      for (var l = 0; l < lamps.length; l++) {
        var lx = lamps[l];
        var cone = g.createLinearGradient(0, 0, 0, HORIZON + 150);
        cone.addColorStop(0, 'rgba(200,225,255,0.075)');
        cone.addColorStop(1, 'rgba(200,225,255,0)');
        g.fillStyle = cone;
        g.beginPath();
        g.moveTo(lx - 16, 0);
        g.lineTo(lx + 16, 0);
        g.lineTo(lx + 210, HORIZON + 150);
        g.lineTo(lx - 210, HORIZON + 150);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(235,245,255,0.85)';
        g.fillRect(lx - 13, 0, 26, 7);
      }

      // crowd: dark silhouette rows above the horizon, scattered neon pixels
      g.fillStyle = CROWD_INK;
      g.fillRect(0, HORIZON - 96, W, 104);
      for (var row = 0; row < 7; row++) {
        var ry = HORIZON - 92 + row * 14;
        for (var hx = 0; hx < W; hx += 9) {
          g.fillStyle = deco() < 0.5 ? HEAD_A : HEAD_B;
          g.beginPath();
          g.arc(hx + deco() * 4, ry + 6, 4.5, Math.PI, TAU);
          g.fill();
        }
      }
      for (var d = 0; d < 190; d++) {
        g.fillStyle = crowdDots[(deco() * crowdDots.length) | 0];
        g.globalAlpha = 0.35 + deco() * 0.55;
        g.fillRect(deco() * W, HORIZON - 92 + deco() * 96, 2, 2);
      }
      g.globalAlpha = 1;

      // pitch
      g.fillStyle = PITCH_INK;
      g.fillRect(0, HORIZON + 4, W, H - HORIZON - 4);
      var lit = g.createRadialGradient(CX, HORIZON + 150, 30, CX, HORIZON + 150, 520);
      lit.addColorStop(0, 'rgba(0,240,255,0.055)');
      lit.addColorStop(1, 'rgba(0,240,255,0)');
      g.fillStyle = lit;
      g.fillRect(0, HORIZON, W, H - HORIZON);

      function line3(x1, y1, z1, x2, y2, z2, width, alpha) {
        var a = proj(x1, y1, z1), b = proj(x2, y2, z2);
        g.strokeStyle = rgba(CYAN, alpha);
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }

      // neon pitch lines: the goal line, two depth markers, and lanes running to the goal
      line3(-24, 0, 0, 24, 0, 0, 7, 0.14);
      line3(-24, 0, 0, 24, 0, 0, 2.5, 0.75);
      line3(-24, 0, 5.5, 24, 0, 5.5, 2, 0.30);
      line3(-24, 0, SPOT_Z, 24, 0, SPOT_Z, 2, 0.22);
      var lanes = [-POST_X, -1.22, 1.22, POST_X];
      for (var n = 0; n < lanes.length; n++) line3(lanes[n], 0, 0, lanes[n], 0, 17, 2, 0.16);

      // net: faint cyan mesh across the mouth, plus depth lines back to a smaller rear frame
      var f0 = proj(-POST_X, BAR_Y, 0), f1 = proj(POST_X, 0, 0);
      var r0 = proj(-POST_X, BAR_Y, -2), r1 = proj(POST_X, 0, -2);
      g.strokeStyle = rgba(CYAN, 0.16);
      g.lineWidth = 1;
      g.beginPath();
      for (var mx = 0; mx <= 24; mx++) {
        var vx = f0.x + (f1.x - f0.x) * (mx / 24);
        g.moveTo(vx, f0.y); g.lineTo(vx, f1.y);
      }
      for (var my = 0; my <= 9; my++) {
        var vy = f0.y + (f1.y - f0.y) * (my / 9);
        g.moveTo(f0.x, vy); g.lineTo(f1.x, vy);
      }
      g.stroke();
      g.strokeStyle = rgba(CYAN, 0.22);
      g.beginPath();
      g.moveTo(r0.x, r0.y); g.lineTo(r1.x, r0.y); g.lineTo(r1.x, r1.y); g.lineTo(r0.x, r1.y);
      g.closePath();
      g.moveTo(f0.x, f0.y); g.lineTo(r0.x, r0.y);
      g.moveTo(f1.x, f0.y); g.lineTo(r1.x, r0.y);
      g.moveTo(f0.x, f1.y); g.lineTo(r0.x, r1.y);
      g.moveTo(f1.x, f1.y); g.lineTo(r1.x, r1.y);
      g.stroke();

      // goal frame - the only shadowBlur in the whole scene, and it is paid for once, here
      g.shadowColor = WHITE;
      g.shadowBlur = 22;
      g.strokeStyle = WHITE;
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(f0.x, f1.y); g.lineTo(f0.x, f0.y); g.lineTo(f1.x, f0.y); g.lineTo(f1.x, f1.y);
      g.stroke();
      g.shadowBlur = 0;

      // penalty spot
      g.fillStyle = rgba(WHITE, 0.5);
      var sp = proj(0, 0, SPOT_Z);
      g.beginPath();
      g.ellipse(sp.x, sp.y, 0.11 * sp.s, 0.04 * sp.s, 0, 0, TAU);
      g.fill();

      return c;
    }

    // The keep view is a whole second scene, so it gets a whole second pre-rendered backdrop.
    // Both cameras are fixed for the same reason (invariant 8): everything drawn per frame is
    // projected against them, so animating either would desync the sprite from the scene.
    function makeKeepdrop() {
      var c = makeCanvas(W, H);
      var g = c.getContext('2d');

      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, INK);
      sky.addColorStop(1, DEEP);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      for (var i = 0; i < 150; i++) {
        g.globalAlpha = 0.25 + deco() * 0.6;
        g.fillStyle = WHITE;
        g.fillRect(deco() * W, deco() * (KHORIZON - 124), deco() < 0.15 ? 2 : 1, 1);
      }
      g.globalAlpha = 1;

      var lamps = [140, 480, 820];
      for (var l = 0; l < lamps.length; l++) {
        var lx = lamps[l];
        var cone = g.createLinearGradient(0, 0, 0, KHORIZON + 120);
        cone.addColorStop(0, 'rgba(200,225,255,0.08)');
        cone.addColorStop(1, 'rgba(200,225,255,0)');
        g.fillStyle = cone;
        g.beginPath();
        g.moveTo(lx - 18, 0);
        g.lineTo(lx + 18, 0);
        g.lineTo(lx + 250, KHORIZON + 120);
        g.lineTo(lx - 250, KHORIZON + 120);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(235,245,255,0.85)';
        g.fillRect(lx - 14, 0, 28, 8);
      }

      g.fillStyle = CROWD_INK;
      g.fillRect(0, KHORIZON - 122, W, 128);
      for (var row = 0; row < 8; row++) {
        var ry = KHORIZON - 118 + row * 15;
        for (var hx = 0; hx < W; hx += 10) {
          g.fillStyle = deco() < 0.5 ? HEAD_A : HEAD_B;
          g.beginPath();
          g.arc(hx + deco() * 5, ry + 7, 5, Math.PI, TAU);
          g.fill();
        }
      }
      for (var d = 0; d < 220; d++) {
        g.fillStyle = crowdDots[(deco() * crowdDots.length) | 0];
        g.globalAlpha = 0.35 + deco() * 0.55;
        g.fillRect(deco() * W, KHORIZON - 118 + deco() * 122, 2, 2);
      }
      g.globalAlpha = 1;

      g.fillStyle = PITCH_INK;
      g.fillRect(0, KHORIZON + 4, W, H - KHORIZON - 4);
      var lit = g.createRadialGradient(CX, KHORIZON + 70, 40, CX, KHORIZON + 70, 640);
      lit.addColorStop(0, 'rgba(0,240,255,0.06)');
      lit.addColorStop(1, 'rgba(0,240,255,0)');
      g.fillStyle = lit;
      g.fillRect(0, KHORIZON, W, H - KHORIZON);

      function kline(x1, z1, x2, z2, width, alpha) {
        var a = projK(x1, 0, z1), b = projK(x2, 0, z2);
        g.strokeStyle = rgba(CYAN, alpha);
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      kline(-26, 0, 26, 0, 6, 0.45);            // the line Ved is standing on
      kline(-26, 5.5, 26, 5.5, 2, 0.26);
      kline(-26, SPOT_Z, 26, SPOT_Z, 2, 0.20);
      kline(-26, 26, 26, 26, 2, 0.12);
      var lanes = [-POST_X, -1.22, 1.22, POST_X];
      for (var n = 0; n < lanes.length; n++) kline(lanes[n], 0, lanes[n], 30, 2, 0.14);

      var sp = projK(0, 0, SPOT_Z);
      g.fillStyle = rgba(WHITE, 0.55);
      g.beginPath();
      g.ellipse(sp.x, sp.y, 0.11 * sp.s, 0.045 * sp.s, 0, 0, TAU);
      g.fill();

      // The frame Ved is defending, wrapping the edges of his view. Paid for once, here.
      var f0 = projK(-POST_X, BAR_Y, 0), f1 = projK(POST_X, 0, 0);
      g.shadowColor = WHITE;
      g.shadowBlur = 22;
      g.strokeStyle = WHITE;
      g.lineWidth = 9;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(f0.x, f1.y);
      g.lineTo(f0.x, f0.y);
      g.lineTo(f1.x, f0.y);
      g.lineTo(f1.x, f1.y);
      g.stroke();
      g.shadowBlur = 0;

      return c;
    }

    // The third scene, behind the goal, for the replay. Same rule as the other two: built here,
    // once, against a camera that never moves.
    function makeReplaydrop() {
      var c = makeCanvas(W, H);
      var g = c.getContext('2d');

      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, INK);
      sky.addColorStop(1, DEEP);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      for (var i = 0; i < 130; i++) {
        g.globalAlpha = 0.25 + deco() * 0.6;
        g.fillStyle = WHITE;
        g.fillRect(deco() * W, deco() * (RHORIZON - 112), deco() < 0.15 ? 2 : 1, 1);
      }
      g.globalAlpha = 1;

      g.fillStyle = CROWD_INK;
      g.fillRect(0, RHORIZON - 110, W, 116);
      for (var row = 0; row < 7; row++) {
        var ry = RHORIZON - 106 + row * 15;
        for (var hx = 0; hx < W; hx += 10) {
          g.fillStyle = deco() < 0.5 ? HEAD_A : HEAD_B;
          g.beginPath();
          g.arc(hx + deco() * 5, ry + 7, 5, Math.PI, TAU);
          g.fill();
        }
      }
      for (var d = 0; d < 200; d++) {
        g.fillStyle = crowdDots[(deco() * crowdDots.length) | 0];
        g.globalAlpha = 0.35 + deco() * 0.55;
        g.fillRect(deco() * W, RHORIZON - 106 + deco() * 110, 2, 2);
      }
      g.globalAlpha = 1;

      g.fillStyle = PITCH_INK;
      g.fillRect(0, RHORIZON + 4, W, H - RHORIZON - 4);
      var lit = g.createRadialGradient(CX, RHORIZON + 180, 40, CX, RHORIZON + 180, 620);
      lit.addColorStop(0, 'rgba(0,240,255,0.06)');
      lit.addColorStop(1, 'rgba(0,240,255,0)');
      g.fillStyle = lit;
      g.fillRect(0, RHORIZON, W, H - RHORIZON);

      function rline(x1, z1, x2, z2, width, alpha) {
        var a = projR(x1, 0, z1), b = projR(x2, 0, z2);
        g.strokeStyle = rgba(CYAN, alpha);
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      rline(-26, 0, 26, 0, 5, 0.45);
      rline(-26, 5.5, 26, 5.5, 2, 0.26);
      rline(-26, SPOT_Z, 26, SPOT_Z, 2, 0.20);
      var lanes = [-POST_X, -1.22, 1.22, POST_X];
      for (var n = 0; n < lanes.length; n++) rline(lanes[n], 0, lanes[n], 26, 2, 0.14);

      var f0 = projR(-POST_X, BAR_Y, 0), f1 = projR(POST_X, 0, 0);
      g.strokeStyle = rgba(CYAN, 0.18);
      g.lineWidth = 1;
      g.beginPath();
      for (var mx = 0; mx <= 22; mx++) {
        var vx = f0.x + (f1.x - f0.x) * (mx / 22);
        g.moveTo(vx, f0.y); g.lineTo(vx, f1.y);
      }
      for (var my = 0; my <= 8; my++) {
        var vy = f0.y + (f1.y - f0.y) * (my / 8);
        g.moveTo(f0.x, vy); g.lineTo(f1.x, vy);
      }
      g.stroke();

      g.shadowColor = WHITE;
      g.shadowBlur = 22;
      g.strokeStyle = WHITE;
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(f0.x, f1.y); g.lineTo(f0.x, f0.y); g.lineTo(f1.x, f0.y); g.lineTo(f1.x, f1.y);
      g.stroke();
      g.shadowBlur = 0;

      return c;
    }

    // Only the colours blob() actually draws get a sprite. A sprite for a colour nothing draws
    // is work for a phase that has not happened yet; the phase that wants one adds it then.
    var glowSprites = {};
    glowSprites[WHITE] = makeGlow(WHITE);
    glowSprites[GOLD] = makeGlow(GOLD);
    var backdrop = makeBackdrop();
    var keepdrop = makeKeepdrop();
    var replaydrop = makeReplaydrop();
    var DROPS = { keep: keepdrop, replay: replaydrop };

    // The confetti pool: CONFETTI objects, allocated HERE and never again. A win re-seeds these
    // same objects in place - nothing on the result screen ever allocates a particle.
    var confetti = new Array(CONFETTI);
    for (var ci = 0; ci < CONFETTI; ci++) {
      confetti[ci] = { x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, c: WHITE };
    }

    // ---- small canvas helpers ---------------------------------------------------------------
    // shadowBlur / globalAlpha / composite are always reset EXPLICITLY rather than through
    // save+restore: the headless stub does not restore state, and the budget must hold there too.

    function glow(color, blur, draw) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      draw();
      ctx.shadowBlur = 0;
    }

    function text(s, x, y, size, color, align) {
      ctx.fillStyle = color;
      ctx.font = '700 ' + size + 'px ' + FONT;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s, x, y);
    }

    function circle(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    // Chunky rounded neon card. The outline is a wide dim stroke under a thin bright one -
    // neon without spending the per-frame shadowBlur budget.
    function card(x, y, w, h, accent, on) {
      roundRect(x, y, w, h, 16);
      ctx.fillStyle = rgba(INK, on ? 0.9 : 0.78);
      ctx.fill();
      ctx.lineWidth = 7;
      ctx.strokeStyle = rgba(accent, on ? 0.34 : 0.14);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(accent, on ? 1 : 0.45);
      ctx.stroke();
    }

    function blob(color, x, y, size) {
      ctx.drawImage(glowSprites[color], x - size / 2, y - size / 2, size, size);
    }

    function starPath(x, y, r) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var rr = (i % 2) ? r * 0.45 : r;
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    // A simple gold crown stands in for BobVed FC's badge - never a real club's crest.
    function crownPath(cx, cy, w) {
      var h = w * 0.62, x0 = cx - w / 2, base = cy + h / 2;
      ctx.beginPath();
      ctx.moveTo(x0, base);
      ctx.lineTo(x0, cy - h * 0.10);
      ctx.lineTo(x0 + w * 0.22, cy + h * 0.14);
      ctx.lineTo(cx, cy - h * 0.50);
      ctx.lineTo(x0 + w * 0.78, cy + h * 0.14);
      ctx.lineTo(x0 + w, cy - h * 0.10);
      ctx.lineTo(x0 + w, base);
      ctx.closePath();
    }

    // ---- screens ----------------------------------------------------------------------------

    function go(name) {
      game.screen = name;
      // An abandoned kick OR keep leaves nothing behind: no stored outcome, no timers, no
      // half-made dive. Nothing is recorded and nothing advances until the ball has landed.
      st.k = null;
      st.res = null;
      st.confettiOn = false;
      // The replay screen is handed its samples immediately after this call - it is the one
      // screen that survives on state a finished kick left behind, so it is cleared here first.
      st.replay = null;
      // A key whose keyup the browser swallowed (cmd-tab away mid-hold) must not outlive the
      // screen it was pressed on, or the next kick's power bar drifts on its own. The shell
      // releases held keys on blur too - this is the second line of defence, not the first.
      st.held = {};
      if (name === 'kick') startKick();
      else if (name === 'keep') startKeep();
      else if (name === 'result') startResult();
      else if (name === 'lineup') startLineup();
    }

    function chooseTeam(i) {
      st.pick = i;
      st.teamId = teamIds[i];
      st.team = ai.TEAMS[st.teamId];
      st.match = shootout.createMatch({ teamId: st.teamId, seed: (rng() * 0x100000000) >>> 0 });
      st.goalie = ai.createGoalie(st.team);
      st.striker = ai.createStriker(st.team);   // takes the team OBJECT, never the id
      st.cards = ai.scoutCards(st.team, rng);
      st.log = [];
      // A signature belongs to ONE match: built here, spent at most once inside it, gone the
      // moment a new opponent is picked. `signatureUsed` lives on the match object for the same
      // reason, so the two cannot get out of step.
      st.sig = { base: types[0], boost: 0, typed: '' };
      // The team sheet belongs to ONE match too: everybody is fresh again for a new opponent.
      st.used = [];
      st.taker = 0;
      st.takerName = null;
      st.sdShown = false;
      st.sdT = -1;
      audio.play('click');
      go('signature');
    }

    // What the move is called: whatever Ved typed, or the pinned default if he typed nothing.
    // Every letter that can be typed is already upper case, so the name is upper case by
    // construction. It is DISPLAY ONLY - it never reaches solveShot, the judge or the keeper.
    function sigName() {
      var n = st.sig.typed.trim();
      return n === '' ? SIG_DEFAULT : n;
    }

    // INVARIANT 1, at the seam. Both halves of the match compose the judge's two arguments HERE
    // and nowhere else: the shot is `solveShot`'s result plus the type and power that produced
    // it, the keeper is a dive plus the reach of whoever is in goal. Two call sites composing
    // those shapes separately would be a second definition of the judge's input in all but
    // name, which is exactly what invariant 1 exists to forbid.
    function judge(type, power, solved, keeper, reach) {
      return engine.resolveShot(
        Object.assign({ type: type, power: power }, solved),
        Object.assign({ reach: reach }, keeper),
        rng);
    }

    function selectCardRect(i) {
      return { x: 60 + i * 290, y: 190, w: 260, h: 250 };
    }

    function selectHit(x, y) {
      for (var i = 0; i < teamIds.length; i++) {
        var r = selectCardRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      }
      return -1;
    }

    // ---- the lineup: who takes this one -------------------------------------------------------
    // A pure front-end step in front of every Ved kick. It sets ONE display string and nothing
    // else: no shot, no keeper, no rng draw, so a match plays out identically whoever is picked.

    function lineupCardRect(i) {
      var row = Math.floor(i / SQUAD_COLS), col = i % SQUAD_COLS;
      // A short last row is centred rather than left-hanging, so the sheet reads as a team.
      var inRow = Math.min(SQUAD_COLS, SQUAD.length - row * SQUAD_COLS);
      var w = 280, gap = 20;
      var x0 = (W - (inRow * w + (inRow - 1) * gap)) / 2;
      return { x: x0 + col * (w + gap), y: 134 + row * 86, w: w, h: 74 };
    }

    function lineupHit(x, y) {
      for (var i = 0; i < SQUAD.length; i++) {
        var r = lineupCardRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
      }
      return -1;
    }

    // The next shirt that can still be sent up, walking `step` at a time from `from`. Spent shirts
    // are stepped OVER rather than merely refused, so the arrows never park the cursor on a name
    // SPACE will not take. Both step sizes are coprime with 11, so this reaches every shirt.
    function nextTaker(from, step) {
      var n = SQUAD.length;
      for (var i = 1; i <= n; i++) {
        var j = ((from + step * i) % n + n) % n;
        if (st.used.indexOf(j) < 0) return j;
      }
      return from;
    }

    function startLineup() {
      // Eleven shirts and five kicks, so nobody takes two in regulation. Sudden death can outrun
      // the squad; when it does the whole XI comes back rather than the screen running out.
      if (st.used.length >= SQUAD.length) st.used = [];
      st.taker = nextTaker(-1, 1);
    }

    function chooseTaker(i) {
      if (st.used.indexOf(i) >= 0) return;
      st.taker = i;
      st.takerName = SQUAD[i];
      st.used.push(i);
      audio.play('click');
      go('kick');
    }

    // ---- the kick ---------------------------------------------------------------------------

    function startKick() {
      st.k = {
        side: 'kick',
        stage: 'aim',            // aim -> runup -> flight -> banner
        type: types[0],
        aim: { x: 0, y: 1.0 },
        power: 0.7,
        meterPos: -1, meterDir: 1, meterT: 0,
        strike: 0,
        aimZone: 0,
        sig: null,               // { boost, name } once S has armed the signature on THIS kick
        solved: null, dive: null, result: null,   // computed ONCE, at the strike
        flightT: 0, landed: false,
        screamer: false, replay: null,
        banner: '', bannerT: 0
      };
      audio.play('whistle');
    }

    // Where the marker ACTUALLY is. At pressure 1 the meter picks up a sinusoidal wobble on top
    // of its sweep, on the kick's own clock so idling before the run-up cannot change it. The
    // drawing and the strike both read this one function: what Ved sees is what he hits, and at
    // pressure 0 wobbleAmp is 0 so it is exactly the sweep.
    function meterAt(k, win) {
      return clamp(k.meterPos + win.wobbleAmp * Math.sin(k.meterT / WOBBLE_MS), -1, 1);
    }

    // Arming the signature. `useSignature` is a MUTATOR that returns true exactly once per match,
    // so it is called here - at the instant Ved presses S - and never to ask whether he still
    // can. Asking would spend it. Availability is read straight off `match.signatureUsed`, which
    // is the only non-consuming view of the same fact.
    //
    // Once armed it is SPENT, even if that kick is never struck. Deliberate: there is no way off
    // the kick screen except by taking the kick, so this costs a player nothing, and it keeps
    // "armed" and "spent" one fact instead of two that can drift apart.
    function armSignature() {
      var k = st.k;
      if (k.sig || st.match.signatureUsed) return;
      if (!shootout.useSignature(st.match)) return;
      k.sig = { boost: BOOSTS[st.sig.boost], name: sigName() };
      k.type = st.sig.base;   // the signature IS its base card
      audio.play('click');
    }

    // The power this kick will ACTUALLY be struck with. +POWER's floor is applied in this one
    // function, which the power bar, the solver and the judge all read - so the bar Ved is
    // looking at is the number that gets struck, the same promise the strike meter makes.
    function shotPower(k) {
      return k.sig ? Math.max(k.power, k.sig.boost.floor) : k.power;
    }

    // The strike. Everything that decides this kick happens here, exactly once: the meter is
    // read, the shot is solved, the keeper commits, and the judge rules. The outcome is STORED -
    // recomputing it per frame would burn the rng stream and could change the answer.
    function commitKick() {
      var k = st.k;
      if (!k || k.stage !== 'runup') return;

      var win = engine.meterWindow({ pressure: shootout.next(st.match).pressure });
      var pos = meterAt(k, win);
      var over = Math.abs(pos) - win.sweet;
      k.strike = over <= 0 ? 0
        : (pos < 0 ? -1 : 1) * Math.min(1, over / (1 - win.sweet));

      // aimZone is where Ved AIMED, not where a scuffed ball ends up: the same value goes to the
      // keeper's memory and to the match record.
      k.aimZone = engine.zoneOf(k.aim.x, k.aim.y);

      // The signature's boost goes into the ONE solver as an argument - there is no second
      // solver and nothing post-processes the flight, or the replay would re-render a path the
      // kick never took. The floored power is composed once, here, and handed to BOTH the solver
      // and the judge.
      var power = shotPower(k);
      var solved = engine.solveShot({
        type: k.type, aim: k.aim, power: power, strike: k.strike, rng: rng,
        boost: k.sig ? k.sig.boost.shot : null
      });
      // Invariant 2: the keeper is handed the visible shot type and the rng, and nothing else.
      // Ved's aim, power, meter and signature are not in scope at this call.
      var dive = ai.goalieDive(st.goalie, { shotType: k.type, rng: rng });
      var result = judge(k.type, power, solved, dive, st.goalie.reach);

      k.solved = solved;
      k.dive = dive;
      k.result = result;
      k.stage = 'flight';
      st.toldAim = true;
      if (k.sig) audio.play('fanfare');
      audio.play('kick');
    }

    // The same outcome reads differently from each end of the pitch: a save is the opponent
    // keeper's when Ved shoots, and Ved's own when he keeps. Every line is from the pinned set.
    function bannerFor(k) {
      var o = k.result.outcome;
      // The frame is the frame from either end - the ball hit the woodwork, and which piece of it
      // is a fact about the ball, not about who was watching.
      if (o === 'post') return k.solved.frame === 'bar' ? BANNERS.bar : BANNERS.post;
      if (k.side === 'keep') {
        if (o === 'save' || o === 'parry') return BANNERS.gloves;
        // The best thing that can happen to a keeper is the striker blazing it over. Falling
        // through to the shooter-side consolation line would hand Ved the game's LOSS copy for
        // the one moment he did everything right, so the keeper's half gets its own line.
        if (o === 'miss') return BANNERS.ice;
        return BANNERS.goal;   // conceded - never UNSTOPPABLE!, which would be rubbing it in
      }
      if (o === 'goal') return k.screamer ? BANNERS.unstoppable : BANNERS.goal;
      return BANNERS[o];
    }

    // Everything the replay will ever need, captured here while the kick object still exists:
    // the flight samples solveShot returned AT THE STRIKE, and the keeper's track walked once.
    // The replay owns no match state and asks the engine nothing (invariant 6).
    function recordReplay(k) {
      var track = new Array(REPLAY_SAMPLES);
      for (var i = 0; i < REPLAY_SAMPLES; i++) {
        var u = i / (REPLAY_SAMPLES - 1);
        track[i] = k.side === 'keep' ? vedKeeperAt(k, u) : keeperPosAt(k, u);
      }
      return {
        flight: k.solved.flight,
        flightTime: k.solved.flightTime,
        keeper: track,
        accent: k.side === 'keep' ? ai.VED.kit : st.team.color,
        trail: k.sig ? GOLD : WHITE,   // recorded, like everything else the replay re-renders
        t: 0
      };
    }

    // Gold is for the thing Ved wanted to happen. Shooting, that is a goal; keeping, it is
    // anything but.
    function goodForVed(k) {
      return k.side === 'keep' ? k.result.outcome !== 'goal' : k.result.outcome === 'goal';
    }

    function playOutcome(outcome) {
      if (outcome === 'goal') { audio.play('swish'); audio.play('goalRoar'); return; }
      if (outcome === 'save' || outcome === 'parry') {
        audio.play('catchball'); audio.play('saveRoar'); return;
      }
      if (outcome === 'post') { audio.play('clang'); audio.play('aww'); return; }
      audio.play('aww');
    }

    // The ball has arrived. The keeper learns, the match advances - each exactly once.
    function landKick() {
      var k = st.k;
      if (k.landed) return;
      k.landed = true;

      // Whose kick it is comes from the state machine, never from a local guess: record throws
      // on an out-of-turn kicker and on a done match, and that crash is the point.
      var kicker = shootout.next(st.match).phase === 'ved-kick' ? 'ved' : 'cpu';
      // Invariant 2: the keeper's habit model is VED's kick history and nothing else. P5 sends
      // CPU kicks down this very path, and a keeper that studied its own team's shots would be
      // learning from the wrong striker entirely.
      if (kicker === 'ved') {
        ai.goalieObserve(st.goalie, { aimZone: k.aimZone, shotType: k.type });
      }
      shootout.record(st.match, {
        kicker: kicker, outcome: k.result.outcome, aimZone: k.aimZone
      });
      st.log.push({ kicker: kicker, outcome: k.result.outcome });

      // The pinned replay trigger, read ONCE here off the STORED outcome: a clean goal that
      // screamed into a corner, or a save Ved himself made off a shot with real pace behind it.
      // Deciding it once is what keeps a lingering player from re-arming it and a kick that has
      // already been replayed from being replayed again.
      k.screamer = k.result.outcome === 'goal' &&
        engine.cornerness(k.solved.impact.x, k.solved.impact.y) >= CORNER_SCREAMER &&
        k.solved.scuff < CLEAN_STRIKE;
      var vedSave = k.side === 'keep' && k.power >= HARD_SHOT &&
        (k.result.outcome === 'save' || k.result.outcome === 'parry');
      k.replay = (k.screamer || vedSave) ? recordReplay(k) : null;

      k.banner = bannerFor(k);
      k.bannerT = 0;
      k.stage = 'banner';
      playOutcome(k.result.outcome);
    }

    // ---- the keep ---------------------------------------------------------------------------
    // Same object, same stages, same landing path as a kick - because it IS the same kick, seen
    // from the other end. Only who chooses what changes: the CPU picks the shot, Ved picks the
    // stance and the dive.

    function startKeep() {
      st.k = {
        side: 'keep',
        stage: 'stance',         // stance -> runup -> flight -> banner
        stance: null,
        plan: null,              // the FIRST plan; its tell is the one Ved gets to read
        runT: 0,
        diveCol: null,           // null until an arrow says otherwise - null means centre
        diveHigh: false,
        commitT: null,           // ms into the run-up; null means he never moved
        aimZone: null,           // a CPU kick: Ved aimed at nothing this time
        power: 0,                // the CPU's, copied off the plan that actually took the kick
        solved: null, result: null,
        flightT: 0, landed: false,
        screamer: false, replay: null,
        banner: '', bannerT: 0
      };
      audio.play('whistle');
    }

    function pickStance(i) {
      var k = st.k;
      k.stance = STANCES[i];
      k.stage = 'runup';
      k.runT = 0;
      // Planned NOW, before the glance, because the glance is a read of THIS plan. If an early
      // dive later makes the striker re-plan, the tell Ved already saw goes stale - and that
      // staleness is precisely what "sharp eyes: they spot an early dive and switch" feels like
      // from the goal line.
      k.plan = ai.strikerPlan(st.striker, {
        pressure: shootout.next(st.match).pressure, earlyDive: null, rng: rng
      });
      audio.play('click');
      audio.play('drum');
    }

    // One dive, built from however many arrows he presses; the FIRST of them is the commit, and
    // the commit is what the striker can see and what the judge times.
    function setDive(col, high) {
      var k = st.k;
      if (col !== null) k.diveCol = col;
      if (high !== null) k.diveHigh = high;
      if (k.commitT === null) {
        k.commitT = k.runT;
        audio.play('swish');
      }
    }

    // No arrow at all before the strike means he never moved: the 'stay' pseudo-zone. That is
    // deliberate - freezing is a real choice, and it is the ONLY way to reach the judge's
    // staybig-plus-stay bonus, since the CPU goalie's stance is always 'balanced'.
    function diveZone(k) {
      if (k.commitT === null) return 'stay';
      return (k.diveCol === null ? 1 : k.diveCol) + (k.diveHigh ? 3 : 0);
    }

    // The strike, from the other side. Everything that decides this CPU kick happens here,
    // exactly once, and the outcome is STORED.
    function commitKeep() {
      var k = st.k;
      var zone = diveZone(k);
      // Seconds between the commit and the strike, on the judge's -1..1 scale. A keeper who
      // never moved has nothing to be early or late about.
      var timing = k.commitT === null ? 0
        : clamp((k.commitT - RUNUP_MS) / 1000 / TIMING_WINDOW, -1, 1);

      var plan = k.plan;
      if (k.commitT !== null && (RUNUP_MS - k.commitT) / 1000 > EARLY_DIVE) {
        // He showed his hand early enough to be seen, so the striker looks again. Whether he
        // ACTUALLY switches is the team's redirectOnEarly, and that coin is flipped inside
        // strikerPlan - the second plan reports back whether it really took Ved's zone off the
        // table. When it did not, the striker stays on the shot he had already picked. Adopting
        // it unconditionally would make every team switch 100% of the time and turn Rookie
        // Robots' "they hardly ever switch" into a lie. The probability lives in ai.js and
        // nowhere else; a second coin here would drift from it.
        var replan = ai.strikerPlan(st.striker, {
          pressure: shootout.next(st.match).pressure, earlyDive: { zone: zone }, rng: rng
        });
        if (replan.redirected) plan = replan;
        // Either way the tell Ved read stays the first plan's - so a real switch leaves the
        // glance he acted on out of date, which IS the "sharp eyes" mechanic.
      }

      var solved = engine.solveShot({
        type: plan.type, aim: plan.aim, power: plan.power, strike: plan.strike, rng: rng
      });
      var keeper = { zone: zone, timing: timing, stance: k.stance };

      k.power = plan.power;
      k.solved = solved;
      k.result = judge(plan.type, plan.power, solved, keeper, ai.VED_KEEPER.reach);
      k.stage = 'flight';
      audio.play('kick');
    }

    function updateKeep(dt) {
      var k = st.k;
      if (k.stage !== 'runup') return;   // 'stance' waits on a key and advances nothing
      k.runT += dt;
      if (k.runT >= RUNUP_MS) commitKeep();
    }

    function updateKick(dt) {
      var k = st.k;
      if (!k) return;
      // Flight and banner are identical whichever way the ball is going, so both halves share
      // them - and share landKick with them.
      if (k.stage === 'flight') {
        k.flightT += dt;
        if (k.flightT >= k.solved.flightTime * 1000) landKick();
      } else if (k.stage === 'banner') {
        k.bannerT += dt;
      } else if (k.side === 'keep') {
        updateKeep(dt);
      } else if (k.stage === 'aim') {
        if (st.held.ArrowUp) k.power = clamp(k.power + dt / POWER_RATE, 0.2, 1);
        if (st.held.ArrowDown) k.power = clamp(k.power - dt / POWER_RATE, 0.2, 1);
      } else if (k.stage === 'runup') {
        k.meterT += dt;
        k.meterPos += k.meterDir * METER_SPEED * dt / 1000;
        if (k.meterPos >= 1) { k.meterPos = 1; k.meterDir = -1; }
        else if (k.meterPos <= -1) { k.meterPos = -1; k.meterDir = 1; }
      }
    }

    // The replay clock runs at REPLAY_RATE - it re-renders recorded samples and nothing else, so
    // slowing it down cannot change a single thing about the kick it is showing.
    function updateReplay(dt) {
      st.replay.t += dt * REPLAY_RATE;
      if (st.replay.t >= st.replay.flightTime * 1000 + REPLAY_TAIL) nextScreen();
    }

    // ---- the round flow ----------------------------------------------------------------------

    // The banner has been dismissed. If the kick earned a replay it plays HERE, between the
    // outcome and the next screen - the match has already been told, so nothing about the kick
    // can move while it is being shown again.
    function advance() {
      audio.play('click');
      if (st.k && st.k.replay) {
        var rp = st.k.replay;
        go('replay');
        st.replay = rp;
        return;
      }
      nextScreen();
    }

    // The state machine - never a local guess - says what comes next: the other side's kick, or
    // the end of the match. A skipped replay and a replay watched to the end both land here, so
    // skipping cannot leave the match anywhere different.
    function nextScreen() {
      var nx = shootout.next(st.match);
      if (nx.phase === 'done') { go('result'); return; }
      if (nx.suddenDeath && !st.sdShown) {
        st.sdShown = true;
        st.sdT = 0;
        audio.play('drum');
      }
      // Ved's kicks go through the team sheet; the CPU's do not - he picks nobody, and the keep
      // screen is reached exactly as it always was.
      go(nx.phase === 'cpu-kick' ? 'keep' : 'lineup');
    }

    function startResult() {
      // summary throws until the match is done, which is the only way this screen is reached.
      st.res = shootout.summary(st.match);
      st.confettiOn = st.res.winner === 'ved';
      if (st.confettiOn) seedConfetti();
      audio.play('whistle');
      if (st.res.winner === 'ved') audio.play('fanfare');
    }

    // Re-seeds the pool IN PLACE - no particle is ever allocated after create. Confetti runs on
    // the DECORATION stream, like every other cosmetic: the match rng belongs to the match
    // (invariant 4), and the replay depends on that staying true.
    function seedConfetti() {
      var colors = [GOLD, CYAN, WHITE, st.team.color];
      for (var i = 0; i < CONFETTI; i++) {
        var p = confetti[i];
        p.x = deco() * W;
        p.y = -deco() * H * 1.2;
        p.vx = (deco() - 0.5) * 70;
        p.vy = 90 + deco() * 190;
        p.w = 4 + deco() * 6;
        p.h = 6 + deco() * 8;
        p.c = colors[(deco() * colors.length) | 0];
      }
    }

    function updateConfetti(dt) {
      if (!st.confettiOn) return;
      var s = dt / 1000;
      for (var i = 0; i < CONFETTI; i++) {
        var p = confetti[i];
        p.x += p.vx * s;
        p.y += p.vy * s;
        if (p.y > H + 12) { p.y = -12; p.x = deco() * W; }
      }
    }

    // ---- input ------------------------------------------------------------------------------

    function kickKey(code) {
      var k = st.k;
      if (!k) return;
      if (k.stage === 'aim') {
        // S arms the signature on the AIM stage only - not during the run-up, not in the meter,
        // not mid-flight. Ved has to decide before he starts running.
        if (code === 'KeyS') { armSignature(); return; }
        var d = DIGIT_CODES.indexOf(code);
        if (d >= 0 && d < types.length) {
          // An armed signature locks its card: the move he built is the move he takes.
          if (!k.sig) { k.type = types[d]; audio.play('click'); }
          return;
        }
        if (code === 'Space') {
          k.stage = 'runup';
          k.meterPos = -1;
          k.meterDir = 1;
          audio.play('drum');
        }
        return;
      }
      if (k.stage === 'runup') {
        if (code === 'Space') commitKick();
        return;
      }
      if (k.stage === 'banner' && code === 'Space' && k.bannerT > BANNER_HOLD) advance();
    }

    function keepKey(code) {
      var k = st.k;
      if (!k) return;
      if (k.stage === 'stance') {
        var s = DIGIT_CODES.indexOf(code);
        if (s >= 0 && s < STANCES.length) pickStance(s);
        return;
      }
      if (k.stage === 'runup') {
        // Column from left/right, row from up/down. Anything he does not say defaults: centre
        // column, low row. Saying nothing at all is 'stay' - see diveZone.
        if (code === 'ArrowLeft') setDive(0, null);
        else if (code === 'ArrowRight') setDive(2, null);
        else if (code === 'ArrowUp') setDive(null, true);
        else if (code === 'ArrowDown') setDive(null, false);
        return;
      }
      if (k.stage === 'banner' && code === 'Space' && k.bannerT > BANNER_HOLD) advance();
    }

    // The builder screen. Letters are tested FIRST - ahead of every other key on this screen and,
    // in onKey, ahead of the global mute key - because otherwise M is the one letter Ved cannot
    // put in his own move's name. Mute is one screen away in either direction; the name is not.
    function sigKey(code) {
      var s = st.sig;
      var i = LETTER_CODES.indexOf(code);
      if (i >= 0) {
        if (s.typed.length < SIG_NAME_MAX) { s.typed += LETTERS.charAt(i); audio.play('click'); }
        return;
      }
      if (code === 'Space') {
        // No leading space, so a habitual SPACE on a fresh name does nothing rather than
        // silently starting it with a blank.
        if (s.typed.length > 0 && s.typed.length < SIG_NAME_MAX) s.typed += ' ';
        return;
      }
      if (code === 'Backspace') { s.typed = s.typed.slice(0, -1); audio.play('click'); return; }
      var d = DIGIT_CODES.indexOf(code);
      if (d >= 0 && d < types.length) { s.base = types[d]; audio.play('click'); return; }
      if (code === 'ArrowLeft') {
        s.boost = (s.boost + BOOSTS.length - 1) % BOOSTS.length;
        audio.play('click');
        return;
      }
      if (code === 'ArrowRight') {
        s.boost = (s.boost + 1) % BOOSTS.length;
        audio.play('click');
        return;
      }
      if (code === 'Enter') { audio.play('click'); go('scout'); }
    }

    function resultKey(code) {
      if (code !== 'Space') return;
      audio.play('click');
      if (st.res.winner === 'ved') st.tally.w += 1; else st.tally.l += 1;
      go('title');
    }

    function onKey(code, isDown) {
      if (!isDown) { st.held[code] = false; return; }
      st.held[code] = true;

      // BEFORE the mute key, deliberately: on the builder screen every key is a letter first.
      if (game.screen === 'signature') { sigKey(code); return; }

      if (code === 'KeyM') { st.muted = audio.toggleMute(); return; }

      if (game.screen === 'title') {
        if (code === 'Space') { audio.play('click'); go('select'); }
        return;
      }
      if (game.screen === 'select') {
        if (code === 'ArrowLeft') {
          st.pick = (st.pick + teamIds.length - 1) % teamIds.length;
          audio.play('click');
        } else if (code === 'ArrowRight') {
          st.pick = (st.pick + 1) % teamIds.length;
          audio.play('click');
        } else if (code === 'Space') {
          chooseTeam(st.pick);
        }
        return;
      }
      if (game.screen === 'scout') {
        if (code === 'Space') { audio.play('click'); go('lineup'); }
        return;
      }
      if (game.screen === 'lineup') {
        if (code === 'ArrowLeft') { st.taker = nextTaker(st.taker, -1); audio.play('click'); }
        else if (code === 'ArrowRight') { st.taker = nextTaker(st.taker, 1); audio.play('click'); }
        else if (code === 'ArrowUp') { st.taker = nextTaker(st.taker, -SQUAD_COLS); audio.play('click'); }
        else if (code === 'ArrowDown') { st.taker = nextTaker(st.taker, SQUAD_COLS); audio.play('click'); }
        else if (code === 'Space' || code === 'Enter') chooseTaker(st.taker);
        return;
      }
      if (game.screen === 'replay') {
        // Skipping goes through the SAME exit the replay takes when it runs out, so a nine-year-
        // old who is bored of it lands in exactly the state a patient one would have.
        if (code === 'Space') { audio.play('click'); nextScreen(); }
        return;
      }
      if (game.screen === 'kick') kickKey(code);
      else if (game.screen === 'keep') keepKey(code);
      else if (game.screen === 'result') resultKey(code);
    }

    function onPointer(p) {
      if (game.screen === 'select') {
        var i = selectHit(p.x, p.y);
        if (i < 0) return;
        if (p.type === 'move') st.pick = i;
        else if (p.type === 'down') chooseTeam(i);
        return;
      }
      if (game.screen === 'lineup') {
        var j = lineupHit(p.x, p.y);
        if (j < 0) return;
        // `chooseTaker` is the ONE place a spent shirt is refused, so the click just asks it.
        // The hover is held back here as well, so the cursor never lights up a shirt the click
        // would then turn down - but that is a second statement of the highlight, not of the rule.
        if (p.type === 'move') { if (st.used.indexOf(j) < 0) st.taker = j; }
        else if (p.type === 'down') chooseTaker(j);
        return;
      }
      if (game.screen === 'kick' && st.k && st.k.stage === 'aim' && p.type !== 'up') {
        // The aim dot never leaves the mouth, so zoneOf always reads a clean 0..5.
        st.k.aim.x = clamp((p.x - CX) / PX + CAM.x, -3.40, 3.40);
        st.k.aim.y = clamp(CAM.y - (p.y - HORIZON) / PX, 0.15, 2.30);
      }
    }

    // ---- drawing ----------------------------------------------------------------------------

    // Where the opponent keeper is at fraction u of the flight. Pure arithmetic on the STORED
    // dive: the live screen asks for u = now, and the replay recorder walks the whole flight
    // through the same function at land time so both see one keeper, not two.
    function keeperPosAt(k, u) {
      // A keeper who committed early (negative timing) is already moving at the strike.
      var start = clamp(0.08 + k.dive.timing * 0.25, 0, 0.7);
      var p = clamp((u - start) / 0.5, 0, 1);
      p = 1 - (1 - p) * (1 - p);
      var stay = k.dive.zone === 'stay';
      var tx = stay ? 0 : ZONE_X[k.dive.zone % 3];
      var ty = stay ? 0.95 : ZONE_Y[(k.dive.zone / 3) | 0];
      return { x: tx * p, y: KEEPER_Y + (ty - KEEPER_Y) * p, p: p, stay: stay };
    }

    function keeperPos() {
      var k = st.k;
      if (!k || !k.dive) return { x: 0.12 * Math.sin(st.t / 600), y: KEEPER_Y, p: 0, stay: false };
      return keeperPosAt(k, clamp(k.flightT / (k.solved.flightTime * 1000), 0, 1));
    }

    // Ved's own dive, in the same world-space shape, so the replay draws ONE keeper whichever
    // end of the pitch the kick came from. The live keep screen sees only his gloves, from the
    // inside; the replay is watching him from behind the bar.
    function vedKeeperAt(k, u) {
      var zone = diveZone(k);
      var stay = zone === 'stay';
      var p = divePhaseAt(k, u);
      var tx = stay ? 0 : ZONE_X[zone % 3];
      var ty = stay ? 1.05 : ZONE_Y[(zone / 3) | 0];
      return { x: tx * p, y: KEEPER_Y + (ty - KEEPER_Y) * p, p: p, stay: stay };
    }

    function keeperAt(track, u) {
      var s = span(track, u);
      return {
        x: mix(s.a.x, s.b.x, s.g), y: mix(s.a.y, s.b.y, s.g),
        p: mix(s.a.p, s.b.p, s.g), stay: s.a.stay
      };
    }

    // P is whichever camera is looking at him, so the same figure is drawn from behind the spot
    // live and from behind the bar in the replay.
    function drawKeeper(P, pos, accent) {
      var c = P(pos.x, pos.y, 0);
      var s = c.s;
      var bw = 0.44 * s, bh = 0.80 * s;
      var spread = 0.40 + 0.55 * pos.p + (pos.stay ? 0.30 : 0);

      ctx.lineCap = 'round';
      ctx.lineWidth = 0.15 * s;
      ctx.strokeStyle = SHADOW;
      ctx.beginPath();
      ctx.moveTo(c.x - bw * 0.22, c.y + bh * 0.38);
      ctx.lineTo(c.x - bw * 0.42, c.y + bh * 1.00);
      ctx.moveTo(c.x + bw * 0.22, c.y + bh * 0.38);
      ctx.lineTo(c.x + bw * 0.42, c.y + bh * 1.00);
      ctx.stroke();

      ctx.lineWidth = 0.14 * s;
      ctx.strokeStyle = BONE;
      ctx.beginPath();
      ctx.moveTo(c.x - bw * 0.34, c.y - bh * 0.22);
      ctx.lineTo(c.x - spread * s, c.y - bh * 0.58);
      ctx.moveTo(c.x + bw * 0.34, c.y - bh * 0.22);
      ctx.lineTo(c.x + spread * s, c.y - bh * 0.58);
      ctx.stroke();

      ctx.fillStyle = GOLD;
      circle(c.x - spread * s, c.y - bh * 0.58, 0.10 * s);
      circle(c.x + spread * s, c.y - bh * 0.58, 0.10 * s);

      ctx.fillStyle = accent;
      roundRect(c.x - bw / 2, c.y - bh / 2, bw, bh, 0.12 * s);
      ctx.fill();

      ctx.fillStyle = BONE;
      circle(c.x, c.y - bh / 2 - 0.17 * s, 0.15 * s);
    }

    function ballAt(flight, u) {
      var s = span(flight, u);
      return {
        x: mix(s.a.x, s.b.x, s.g), y: mix(s.a.y, s.b.y, s.g), z: mix(s.a.z, s.b.z, s.g)
      };
    }

    // The ball and its additive trail, drawn from a list of RECORDED flight samples. P is
    // whichever camera is looking at it: the same samples solveShot returned at the strike render
    // from behind the spot, from the goal line, and from behind the bar in the replay - three
    // cameras, one path, never re-solved (invariant 6).
    // `trail` is the glow colour behind the ball - gold on a signature kick, white otherwise. The
    // ball itself stays white whatever is streaming off it.
    function drawTrail(P, flight, u, trail) {
      var glowInk = trail || WHITE;
      ctx.globalCompositeOperation = 'lighter';
      for (var j = 8; j >= 1; j--) {
        var uu = u - j * 0.035;
        if (uu <= 0) continue;
        var q = ballAt(flight, uu);
        var pq = P(q.x, q.y, q.z);
        ctx.globalAlpha = 0.40 * (1 - j / 9);
        blob(glowInk, pq.x, pq.y, BALL_R * pq.s * (5.5 - j * 0.3));
      }
      ctx.globalAlpha = 1;

      var b = ballAt(flight, u);
      var pb = P(b.x, b.y, b.z);
      blob(glowInk, pb.x, pb.y, BALL_R * pb.s * 6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = WHITE;
      circle(pb.x, pb.y, BALL_R * pb.s);
    }

    function drawBallInFlight(P) {
      var k = st.k;
      drawTrail(P, k.solved.flight, clamp(k.flightT / (k.solved.flightTime * 1000), 0, 1),
        k.sig ? GOLD : WHITE);
      if (k.flightT < 130) {
        // the flash left behind on the spot, for the instant after the boot
        var sp = P(0, BALL_R, SPOT_Z);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - k.flightT / 130;
        blob(GOLD, sp.x, sp.y, 220);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function drawBallOnSpot(P) {
      var b = P(0, BALL_R, SPOT_Z);
      ctx.globalCompositeOperation = 'lighter';
      blob(WHITE, b.x, b.y, BALL_R * b.s * 6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = WHITE;
      circle(b.x, b.y, BALL_R * b.s);
    }

    function drawAimTarget() {
      var a = proj(st.k.aim.x, st.k.aim.y, 0);
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 15, 0, TAU);
      ctx.moveTo(a.x - 23, a.y); ctx.lineTo(a.x - 7, a.y);
      ctx.moveTo(a.x + 7, a.y); ctx.lineTo(a.x + 23, a.y);
      ctx.moveTo(a.x, a.y - 23); ctx.lineTo(a.x, a.y - 7);
      ctx.moveTo(a.x, a.y + 7); ctx.lineTo(a.x, a.y + 23);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawShotCards() {
      var k = st.k;
      var w = 166, gap = 10, x0 = 24, y = 512, h = 74;   // ends clear of the mute icon
      for (var i = 0; i < types.length; i++) {
        var x = x0 + i * (w + gap);
        var on = types[i] === k.type;
        card(x, y, w, h, on ? GOLD : CYAN, on);
        text(String(i + 1), x + 20, y + 20, 17, rgba(GOLD, on ? 1 : 0.55));
        text(TYPE_LABEL[types[i]], x + w / 2, y + 30, 21, on ? WHITE : rgba(WHITE, 0.72));
        text(TYPE_HINT[types[i]], x + w / 2, y + 55, 13, rgba(CYAN, on ? 0.95 : 0.5));
      }
    }

    function drawPower() {
      var x = 884, y = 250, w = 44, h = 230;
      var k = st.k;
      // The bar shows shotPower, not the raw slider: with +POWER armed the floor is real, so the
      // bar jumps to it and stays there. Drawing the slider instead would show Ved one number
      // and strike another.
      var p = shotPower(k);
      card(x, y, w, h, CYAN, false);
      var fh = (h - 16) * p;
      ctx.fillStyle = p > 0.8 ? GOLD : CYAN;
      roundRect(x + 8, y + h - 8 - fh, w - 16, fh, 8);
      ctx.fill();
      text('POWER', x + w / 2, y - 18, 16, rgba(WHITE, 0.8));
      text('↑↓', x + w / 2, y + h + 20, 18, rgba(WHITE, 0.6));
    }

    function drawMeter() {
      var k = st.k;
      var win = engine.meterWindow({ pressure: shootout.next(st.match).pressure });
      var w = 460, x = CX - w / 2, y = 466, h = 30;

      card(x, y, w, h, CYAN, false);
      var sw = win.sweet * (w / 2);   // the meter spans strike -1 .. 1 across its full width
      ctx.fillStyle = rgba(GOLD, 0.85);
      roundRect(CX - sw, y + 5, sw * 2, h - 10, 6);
      ctx.fill();

      // The SAME meterAt the strike reads. Drawing the bare sweep here would put the marker up to
      // a whole wobble from the value SPACE is about to score - on a pressure kick that is worth
      // most of the gold band, so a marker sitting in the gold would come back scuffed with
      // nothing on screen to explain it. The travel is inset by the marker's own width, so at
      // either end of the sweep it still sits clear of the card edge.
      var mx = CX + meterAt(k, win) * (w / 2 - 6);
      ctx.fillStyle = WHITE;
      roundRect(mx - 3, y - 6, 6, h + 12, 3);
      ctx.fill();
      text('SPACE IN THE GOLD!', CX, y - 24, 20, rgba(WHITE, 0.9));
    }

    function drawDots(who, cx, y, color) {
      var taken = [];
      for (var i = 0; i < st.log.length; i++) {
        if (st.log[i].kicker === who) taken.push(st.log[i].outcome === 'goal');
      }
      var slots = Math.max(5, taken.length);
      var gap = 20, x0 = cx - (slots - 1) * gap / 2;
      for (var j = 0; j < slots; j++) {
        var x = x0 + j * gap;
        if (j < taken.length) {
          ctx.fillStyle = taken[j] ? color : rgba(WHITE, 0.16);
          circle(x, y, 7);
        }
        ctx.strokeStyle = rgba(WHITE, 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, TAU);
        ctx.stroke();
      }
    }

    function drawHud() {
      var sc = shootout.score(st.match);
      var nx = shootout.next(st.match);
      text(ai.VED.name.toUpperCase(), 150, 26, 20, GOLD);
      text(String(sc.ved), 44, 30, 34, WHITE);
      drawDots('ved', 176, 54, GOLD);

      text(st.team.name.toUpperCase(), 790, 26, 20, st.team.color);
      text(String(sc.cpu), 916, 30, 34, WHITE);
      drawDots('cpu', 764, 54, st.team.color);

      text('ROUND ' + nx.round, CX, 30, 22, rgba(WHITE, 0.75));
      if (nx.suddenDeath) text('SUDDEN DEATH', CX, 56, 18, GOLD);
    }

    function drawBanner() {
      var k = st.k;
      var pop = clamp(k.bannerT / 160, 0, 1);
      var size = 40 + 30 * pop;
      // The name Ved typed, over the outcome line, on the kick he spent his signature on. Drawn
      // WITHOUT a glow: the per-frame shadowBlur budget is invariant 8, and this line does not
      // need to spend any of it to be read.
      if (k.sig) text(k.sig.name, CX, 172, 30, GOLD);
      glow(GOLD, 26, function () {
        text(k.banner, CX, 236, size, goodForVed(k) ? GOLD : WHITE);
      });
      if (k.bannerT > BANNER_HOLD) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 260);
        text('PRESS SPACE', CX, 320, 24, WHITE);
        ctx.globalAlpha = 1;
      }
    }

    // ---- the keep screen ---------------------------------------------------------------------

    // The striker jogs in from an angle and straightens onto the ball. His sprite is drawn a
    // little larger than true perspective: at 11 m from a camera 5 m behind the line he is only
    // 60 px tall, and his glance has to be readable by a nine-year-old.
    function drawStriker() {
      var k = st.k;
      var u = k.stage === 'stance' ? 0 : (k.stage === 'runup' ? clamp(k.runT / RUNUP_MS, 0, 1) : 1);
      var f = projK(-0.85 * (1 - u), 0, SPOT_Z + 2.4 - 1.9 * u);
      var s = f.s * 1.3;
      var hip = f.y - 0.92 * s, sh = f.y - 1.52 * s;
      var stride = (k.stage === 'runup' ? Math.sin(st.t / 70) : 0) * 0.26 * s;
      var accent = st.team.color;

      ctx.lineCap = 'round';
      ctx.lineWidth = 0.16 * s;
      ctx.strokeStyle = SHADOW;
      ctx.beginPath();
      ctx.moveTo(f.x, hip); ctx.lineTo(f.x - stride, f.y);
      ctx.moveTo(f.x, hip); ctx.lineTo(f.x + stride, f.y);
      ctx.stroke();

      ctx.fillStyle = accent;
      roundRect(f.x - 0.28 * s, sh, 0.56 * s, hip - sh, 0.12 * s);
      ctx.fill();

      ctx.lineWidth = 0.13 * s;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(f.x - 0.24 * s, sh + 0.10 * s); ctx.lineTo(f.x + stride * 0.8, sh + 0.55 * s);
      ctx.moveTo(f.x + 0.24 * s, sh + 0.10 * s); ctx.lineTo(f.x - stride * 0.8, sh + 0.55 * s);
      ctx.stroke();

      ctx.fillStyle = BONE;
      var headY = sh - 0.19 * s;
      circle(f.x, headY, 0.17 * s);
      return { x: f.x, y: headY, s: s };
    }

    // ONLY tell.col is ever drawn. tell.honest is metadata: showing it would hand Ved the bluff
    // and there would be no read-the-keeper game left at all.
    function drawTell(head) {
      var col = st.k.plan.tell.col;
      var a = 0.35 + 0.45 * Math.abs(Math.sin(st.t / 85));
      var lo = projK(COL_EDGE[col][0], 0, 0), hi = projK(COL_EDGE[col][1], BAR_Y, 0);
      ctx.fillStyle = rgba(st.team.color, a * 0.22);
      ctx.fillRect(lo.x, hi.y, hi.x - lo.x, lo.y - hi.y);

      ctx.globalAlpha = a;
      ctx.fillStyle = GOLD;
      circle(head.x + (col - 1) * 0.10 * head.s, head.y - 0.02 * head.s, 0.055 * head.s);
      ctx.globalAlpha = 1;
    }

    // How far into his dive he is at fraction u of the flight - the form the replay recorder
    // walks. Before he commits: nowhere.
    function divePhaseAt(k, u) {
      if (k.commitT === null) return 0;
      var p = clamp(((RUNUP_MS - k.commitT) + u * k.solved.flightTime * 1000) / DIVE_MS, 0, 1);
      return 1 - (1 - p) * (1 - p);
    }

    // The same dive, now. During the run-up the ball has not left yet, so it is timed off the
    // run-up clock instead.
    function divePhase(k) {
      if (k.commitT === null) return 0;
      if (k.stage === 'runup') {
        var p = clamp((k.runT - k.commitT) / DIVE_MS, 0, 1);
        return 1 - (1 - p) * (1 - p);
      }
      return divePhaseAt(k, k.flightT / (k.solved.flightTime * 1000));
    }

    // First person: the only part of himself Ved sees is his gloves, coming up from below.
    function drawGloves() {
      var k = st.k;
      var p = divePhase(k);
      var zone = diveZone(k);
      var stay = zone === 'stay';
      var home = projK(0, KEEPER_Y, 0);
      var tgt = stay ? projK(0, 1.05, 0) : projK(ZONE_X[zone % 3], ZONE_Y[(zone / 3) | 0], 0);
      var cx = home.x + (tgt.x - home.x) * p;
      var cy = home.y + (tgt.y - home.y) * p;
      var spread = (0.55 + (stay ? 0.85 : 0.35) * p) * home.s;
      var r = 0.20 * home.s;

      ctx.lineCap = 'round';
      ctx.lineWidth = 0.17 * home.s;
      ctx.strokeStyle = BONE;
      ctx.beginPath();
      ctx.moveTo(CX - 1.0 * home.s, H + 60); ctx.lineTo(cx - spread, cy);
      ctx.moveTo(CX + 1.0 * home.s, H + 60); ctx.lineTo(cx + spread, cy);
      ctx.stroke();

      ctx.fillStyle = GOLD;
      circle(cx - spread, cy, r);
      circle(cx + spread, cy, r);
      ctx.fillStyle = rgba(WHITE, 0.85);
      circle(cx - spread, cy - r * 0.35, r * 0.45);
      circle(cx + spread, cy - r * 0.35, r * 0.45);
    }

    function drawStanceCards() {
      var w = 210, gap = 12, x0 = 24, y = 498, h = 78;
      for (var i = 0; i < STANCES.length; i++) {
        var x = x0 + i * (w + gap);
        card(x, y, w, h, CYAN, false);
        text(String(i + 1), x + 22, y + 22, 17, rgba(GOLD, 0.7));
        text(STANCE_LABEL[i], x + w / 2, y + 32, 22, WHITE);
        text(STANCE_HINT[i], x + w / 2, y + 58, 14, rgba(CYAN, 0.75));
      }
      text('PICK YOUR STANCE — THEN WATCH THEIR EYES', CX, 462, 22, rgba(WHITE, 0.9));
    }

    function drawKeep() {
      var k = st.k;
      var head = drawStriker();
      if (k.stage === 'runup' && k.runT >= TELL_AT * RUNUP_MS) drawTell(head);
      drawGloves();
      if (k.stage === 'flight' || k.stage === 'banner') drawBallInFlight(projK);
      else drawBallOnSpot(projK);
      if (k.stage === 'stance') drawStanceCards();
      else if (k.stage === 'runup') {
        text('← → ↑ ↓ TO DIVE   —   OR FREEZE AND STAY BIG', CX, 556, 22, rgba(WHITE, 0.9));
      }
      drawHud();
      if (k.stage === 'banner') drawBanner();
    }

    // ---- the replay ----------------------------------------------------------------------------

    // A pure re-render (invariant 6). Everything on this screen comes out of the samples recorded
    // when the ball landed: no rng, no solver, no judge, and nothing that can touch the match.
    function drawReplay() {
      var r = st.replay;
      var u = clamp(r.t / (r.flightTime * 1000), 0, 1);
      drawKeeper(projR, keeperAt(r.keeper, u), r.accent);
      drawTrail(projR, r.flight, u, r.trail);
      drawHud();
      glow(GOLD, 22, function () { text('REPLAY', CX, 118, 42, GOLD); });
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('SPACE TO SKIP', CX, 556, 22, WHITE);
      ctx.globalAlpha = 1;
    }

    // ---- the result screen --------------------------------------------------------------------

    function trophyPath(cx, cy, w) {
      var h = w * 0.95;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy - h / 2);
      ctx.lineTo(cx + w * 0.26, cy + h * 0.10);
      ctx.lineTo(cx + w * 0.10, cy + h * 0.10);
      ctx.lineTo(cx + w * 0.10, cy + h * 0.32);
      ctx.lineTo(cx + w * 0.34, cy + h * 0.50);
      ctx.lineTo(cx - w * 0.34, cy + h * 0.50);
      ctx.lineTo(cx - w * 0.10, cy + h * 0.32);
      ctx.lineTo(cx - w * 0.10, cy + h * 0.10);
      ctx.lineTo(cx - w * 0.26, cy + h * 0.10);
      ctx.closePath();
    }

    // Axis-aligned on purpose: no ctx.rotate() anywhere in this file, because the headless stub
    // does not restore state and nothing here may lean on save()/restore().
    function drawConfetti() {
      for (var i = 0; i < CONFETTI; i++) {
        var p = confetti[i];
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // "You went LOW LEFT 4 times - I was waiting..." straight off summary().noticed, which holds
    // one or two entries and can be empty. An empty list draws nothing at all rather than a
    // heading with a hole under it.
    function noticedLine(n) {
      return 'YOU WENT ' + ZONE_NAME[n.zone] + ' ' + n.count +
        (n.count === 1 ? ' TIME' : ' TIMES') + ' — I WAS WAITING…';
    }

    function drawResult() {
      scrim();
      var r = st.res;
      var won = r.winner === 'ved';
      if (st.confettiOn) drawConfetti();
      if (won) {
        ctx.fillStyle = GOLD;
        glow(GOLD, 24, function () { trophyPath(CX, 96, 96); ctx.fill(); });
      }

      glow(GOLD, 26, function () {
        text(won ? BANNERS.champion : BANNERS.miss, CX, won ? 186 : 150,
          won ? 62 : 52, won ? GOLD : WHITE);
      });

      text(String(r.ved), CX - 96, 264, 66, GOLD);
      text('—', CX, 264, 34, rgba(WHITE, 0.55));
      text(String(r.cpu), CX + 96, 264, 66, st.team.color);
      text(ai.VED.name.toUpperCase(), CX - 96, 312, 18, rgba(WHITE, 0.7));
      text(st.team.name.toUpperCase(), CX + 96, 312, 18, rgba(WHITE, 0.7));

      if (r.noticed.length > 0) {
        text('WHAT THE KEEPER NOTICED', CX, 370, 24, GOLD);
        for (var i = 0; i < r.noticed.length; i++) {
          text(noticedLine(r.noticed[i]), CX, 410 + i * 34, 22, WHITE);
        }
      }

      if (!won) text(BANNERS.rematch, CX, 498, 30, GOLD);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('PRESS SPACE', CX, 546, 26, WHITE);
      ctx.globalAlpha = 1;
    }

    function drawFlash() {
      if (st.sdT < 0 || st.sdT > SD_FLASH) return;
      ctx.globalAlpha = st.sdT > SD_FLASH - 320 ? (SD_FLASH - st.sdT) / 320 : 1;
      glow(GOLD, 26, function () { text(BANNERS.sudden, CX, 150, 56, GOLD); });
      ctx.globalAlpha = 1;
    }

    // The signature, on the HUD, from the moment the kick opens until the ball leaves - so the
    // armed state is on screen BEFORE the run-up starts, which is the whole point of it.
    // Nothing in here is a filled path in the strike meter's gold or in white, so the meter is
    // still the only gold band and the only white bar on a run-up frame.
    function drawSigHud() {
      var k = st.k;
      var x = 24, y = 80, w = 306, h = 46;
      if (k.sig) {
        card(x, y, w, h, GOLD, true);
        text(k.sig.name, x + w / 2, y + 17, 20, GOLD);
        text('ARMED  ' + k.sig.boost.id, x + w / 2, y + 34, 14, rgba(WHITE, 0.85));
        return;
      }
      // The OFFER is gated on the stage the key actually works in. kickKey arms on 'aim' alone,
      // so a prompt still showing during the run-up would be asking for a press the game has
      // already stopped listening for. The ARMED card above is deliberately not gated with it -
      // that one stays up through the whole run-up, which is the point of drawing it at all.
      // Availability is READ off the match flag. Asking Shootout.useSignature would spend it.
      if (k.stage !== 'aim' || st.match.signatureUsed) return;
      card(x, y, w, h, CYAN, false);
      text('S — ' + sigName(), x + w / 2, y + 17, 20, rgba(WHITE, 0.9));
      text(BOOSTS[st.sig.boost].id + '  ' + TYPE_LABEL[st.sig.base],
        x + w / 2, y + 34, 14, rgba(CYAN, 0.8));
    }

    // Who Ved sent up, kept on screen under the signature card so the pick is visibly HIS kick.
    // Nothing reads this string back - it is the whole of what choosing a taker changes.
    function drawTaker() {
      if (!st.takerName) return;
      text(st.takerName, 24, 148, 20, rgba(GOLD, 0.92), 'left');
    }

    function drawKick() {
      var k = st.k;
      drawKeeper(proj, keeperPos(), st.team ? st.team.color : CYAN);
      if (k.stage === 'aim') drawAimTarget();
      if (k.stage === 'flight' || k.stage === 'banner') drawBallInFlight(proj);
      else drawBallOnSpot(proj);
      if (k.stage === 'aim') {
        drawShotCards();
        drawPower();
        if (!st.toldAim) {
          text('THE KEEPER CANNOT SEE YOUR AIM — HE STUDIES YOUR PAST', CX, 420, 19, rgba(CYAN, 0.9));
        }
        text('SPACE TO RUN UP', CX, 466, 22, rgba(WHITE, 0.85));
      }
      if (k.stage === 'runup') drawMeter();
      if (k.stage === 'aim' || k.stage === 'runup') { drawSigHud(); drawTaker(); }
      drawHud();
      if (k.stage === 'banner') drawBanner();
    }

    function scrim() {
      ctx.fillStyle = rgba(INK, 0.62);
      ctx.fillRect(0, 0, W, H);
    }

    function drawTitle() {
      scrim();
      ctx.fillStyle = GOLD;
      glow(GOLD, 24, function () { crownPath(CX, 132, 118); ctx.fill(); });
      glow(CYAN, 26, function () { text('STAR SHOOTERS', CX, 250, 74, WHITE); });
      text(ai.VED.name.toUpperCase(), CX, 312, 26, GOLD);
      text('WON ' + st.tally.w + '   LOST ' + st.tally.l, CX, 372, 24, rgba(WHITE, 0.8));
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('PRESS SPACE', CX, 462, 30, WHITE);
      ctx.globalAlpha = 1;
      text('M MUTES', CX, 528, 17, rgba(WHITE, 0.45));
    }

    function drawSelect() {
      scrim();
      glow(CYAN, 20, function () { text('CHOOSE YOUR OPPONENT', CX, 96, 44, WHITE); });
      for (var i = 0; i < teamIds.length; i++) {
        var t = ai.TEAMS[teamIds[i]];
        var r = selectCardRect(i);
        var on = i === st.pick;
        card(r.x, r.y, r.w, r.h, t.color, on);
        ctx.fillStyle = t.color;
        roundRect(r.x + 22, r.y + 24, r.w - 44, 30, 8);
        ctx.fill();
        text(t.name.toUpperCase(), r.x + r.w / 2, r.y + 98, 25, on ? WHITE : rgba(WHITE, 0.78));
        var n = byReach.indexOf(teamIds[i]) + 1;
        for (var s = 0; s < 3; s++) {
          starPath(r.x + r.w / 2 + (s - 1) * 44, r.y + 158, 18);
          if (s < n) { ctx.fillStyle = GOLD; ctx.fill(); }
          else { ctx.strokeStyle = rgba(WHITE, 0.3); ctx.lineWidth = 2; ctx.stroke(); }
        }
        text('KEEPER REACH ' + Math.round(t.goalie.reach * 100),
          r.x + r.w / 2, r.y + 212, 16, rgba(WHITE, 0.55));
      }
      text('← → TO LOOK    SPACE TO PLAY    OR CLICK', CX, 496, 24, rgba(WHITE, 0.85));
    }

    // The builder: five base cards, three boosts, and a name. Skippable - ENTER on its own takes
    // the default, which is the name already showing in the box.
    function drawSignature() {
      scrim();
      var s = st.sig;
      glow(CYAN, 20, function () { text('BUILD YOUR SIGNATURE MOVE', CX, 62, 40, WHITE); });

      text('1–5   YOUR SHOT', CX, 118, 17, rgba(WHITE, 0.7));
      for (var i = 0; i < types.length; i++) {
        var x = 45 + i * 176;
        var on = types[i] === s.base;
        card(x, 136, 166, 76, on ? GOLD : CYAN, on);
        text(String(i + 1), x + 20, 156, 17, rgba(GOLD, on ? 1 : 0.55));
        text(TYPE_LABEL[types[i]], x + 83, 166, 21, on ? WHITE : rgba(WHITE, 0.72));
        text(TYPE_HINT[types[i]], x + 83, 192, 13, rgba(CYAN, on ? 0.95 : 0.5));
      }

      text('← →   YOUR POWER-UP', CX, 240, 17, rgba(WHITE, 0.7));
      for (var b = 0; b < BOOSTS.length; b++) {
        var bx = 59 + b * 286;
        var bon = b === s.boost;
        card(bx, 258, 270, 86, bon ? GOLD : CYAN, bon);
        text(BOOSTS[b].id, bx + 135, 288, 28, bon ? GOLD : rgba(WHITE, 0.72));
        text(BOOSTS[b].hint, bx + 135, 320, 14, rgba(CYAN, bon ? 0.95 : 0.5));
      }

      card(240, 380, 480, 84, CYAN, false);
      text('TYPE A NAME — 12 LETTERS', CX, 404, 16, rgba(WHITE, 0.6));
      text(sigName(), CX, 438, 32, GOLD);

      text('PRESS S IN THE MATCH TO FIRE IT — ONCE PER MATCH', CX, 496, 19, rgba(CYAN, 0.9));
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('ENTER TO PLAY', CX, 548, 26, WHITE);
      ctx.globalAlpha = 1;
    }

    function drawScout() {
      scrim();
      glow(st.team.color, 20, function () { text('SCOUTING REPORT', CX, 90, 44, WHITE); });
      text(st.team.name.toUpperCase(), CX, 146, 28, st.team.color);
      for (var i = 0; i < st.cards.length; i++) {
        var y = 200 + i * 120;
        card(90, y, 780, 96, st.team.color, true);
        text(st.cards[i], CX, y + 48, 24, WHITE);
      }
      text('THEY SHOOT LATER — YOU SHOOT FIRST', CX, 476, 20, rgba(CYAN, 0.85));
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('SPACE TO TAKE YOUR KICK', CX, 528, 26, WHITE);
      ctx.globalAlpha = 1;
    }

    // The team sheet. Spent shirts stay on it, greyed - Ved can see who has already gone up, and
    // the arrows and the mouse both refuse them, so the screen and the rules agree.
    function drawLineup() {
      scrim();
      glow(CYAN, 20, function () { text('WHO TAKES THIS ONE?', CX, 90, 40, WHITE); });
      for (var i = 0; i < SQUAD.length; i++) {
        var r = lineupCardRect(i);
        var spent = st.used.indexOf(i) >= 0;
        var on = i === st.taker && !spent;
        card(r.x, r.y, r.w, r.h, spent ? WHITE : (on ? GOLD : CYAN), on);
        text(SQUAD[i], r.x + r.w / 2, r.y + r.h / 2, 22,
          spent ? rgba(WHITE, 0.26) : (on ? GOLD : rgba(WHITE, 0.8)));
      }
      text('EACH STAR TAKES ONE KICK', CX, 502, 19, rgba(CYAN, 0.85));
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(st.t / 300);
      text('SPACE TO SEND HIM UP', CX, 548, 26, WHITE);
      ctx.globalAlpha = 1;
      drawHud();
    }

    function drawMute() {
      var x = 934, y = 570;
      ctx.fillStyle = st.muted ? rgba(WHITE, 0.3) : GOLD;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 4);
      ctx.lineTo(x - 4, y - 4);
      ctx.lineTo(x + 2, y - 11);
      ctx.lineTo(x + 2, y + 11);
      ctx.lineTo(x - 4, y + 4);
      ctx.lineTo(x - 9, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (st.muted) {
        ctx.moveTo(x - 12, y + 12);
        ctx.lineTo(x + 8, y - 12);
      } else {
        ctx.arc(x + 5, y, 6, -0.9, 0.9);
        ctx.moveTo(x + 13, y - 8);
        ctx.arc(x + 5, y, 11, -0.8, 0.8);
      }
      ctx.stroke();
    }

    function render() {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      ctx.drawImage(DROPS[game.screen] || backdrop, 0, 0);
      if (game.screen === 'kick') drawKick();
      else if (game.screen === 'keep') drawKeep();
      else if (game.screen === 'replay') drawReplay();
      else if (game.screen === 'result') drawResult();
      else if (game.screen === 'select') drawSelect();
      else if (game.screen === 'signature') drawSignature();
      else if (game.screen === 'scout') drawScout();
      else if (game.screen === 'lineup') drawLineup();
      else drawTitle();
      drawFlash();
      drawMute();
    }

    // The crowd bed rests louder while a kick is live, and louder again once the match is on the
    // line (pressure 1 = round 5 and every sudden-death round). This only ever sets a RESTING
    // level: goalRoar and saveRoar bump the bed above it and settle back by themselves, and a
    // crowd() call cannot cut a roar short - so there is nothing here to unwind.
    // crowd() at the level it is already resting at schedules nothing, so this is safe per frame.
    function crowdLevel() {
      if (game.screen === 'result') return 0.5;
      if (game.screen === 'replay') return 0.35;
      if ((game.screen !== 'kick' && game.screen !== 'keep') || !st.k) return 0.16;
      var hot = shootout.next(st.match).pressure ? 0.22 : 0;
      if (st.k.stage === 'runup' || st.k.stage === 'flight') return 0.45 + hot;
      return 0.3 + hot;
    }

    function step(dtMs) {
      st.t += dtMs;
      if (st.sdT >= 0) st.sdT += dtMs;
      if (game.screen === 'kick' || game.screen === 'keep') updateKick(dtMs);
      else if (game.screen === 'replay') updateReplay(dtMs);
      else if (game.screen === 'result') updateConfetti(dtMs);
      audio.crowd(crowdLevel());
      render();
    }

    var game = {
      step: step,
      onKey: onKey,
      onPointer: onPointer,
      screen: 'title'
    };
    return game;
  }

  var Game = { create: create };

  globalThis.StarShooters = globalThis.StarShooters || {};
  globalThis.StarShooters.Game = Game;
  if (typeof module !== 'undefined') module.exports = Game;
})();
