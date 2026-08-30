// Star Shooters - ai.js
// Pure goalie habit model + dive chooser, CPU striker planner + tells, scout cards, TEAMS table.
// No DOM. Invariant 2: the goalie only ever sees kick history + the visible shot type at strike.
(function () {
  'use strict';

  var VED = { name: 'BobVed FC', kit: '#FFFFFF', gold: '#FEBE10', navy: '#00529F' };

  // Ved's own reach when HE is the keeper. A sibling of VED rather than a field on it: the
  // contract test deep-equals VED against the plan's exact four-key literal, so a fifth key
  // there would fail. Goalie profiles live in this file, which is where P9 tunes them.
  // 0.80 sits between Rookie Robots (0.72) and Thunder FC (0.84) - a starting value.
  var VED_KEEPER = { reach: 0.80 };

  // Opponent goalie + striker profiles, one neon colorway each.
  var TEAMS = {
    robots: {
      name: 'Rookie Robots', color: '#39FF14',
      goalie: { reach: 0.72, habitWeight: 0.35, stayProb: 0.06 },
      striker: { accuracy: 0.60, power: [0.5, 0.8], honestTell: 0.85, chipProb: 0.10, redirectOnEarly: 0.0 }
    },
    thunder: {
      name: 'Thunder FC', color: '#FFE135',
      goalie: { reach: 0.84, habitWeight: 0.55, stayProb: 0.08 },
      striker: { accuracy: 0.75, power: [0.6, 0.9], honestTell: 0.70, chipProb: 0.15, redirectOnEarly: 0.25 }
    },
    galaxy: {
      name: 'Galaxy XI', color: '#FF6EC7',
      goalie: { reach: 0.92, habitWeight: 0.75, stayProb: 0.10 },
      striker: { accuracy: 0.85, power: [0.7, 1.0], honestTell: 0.55, chipProb: 0.18, redirectOnEarly: 0.5 }
    }
  };

  // Aim boxes, metres, shooter's perspective. Posts at +/-3.66, bar at 2.44, zone boundaries at
  // +/-1.22 (col) and 1.22 (row). The CPU aims inside a safe inset so it never shells the crowd,
  // and it stays clear of the boundaries so its aim really is in the column its tell talks about.
  var AIM_COLS = [[-3.31, -1.30], [-1.10, 1.10], [1.30, 3.31]];
  var AIM_ROWS = [[0.15, 1.10], [1.34, 2.09]];

  // The type has to suit the row, because the engine clamps a lowrocket's aim to y <= 1.0 before
  // it solves. A lowrocket planned into the high row therefore arrives LOW, in a zone the striker
  // was not aiming at - so it is only ever offered for a low-row zone. `chip` is drawn on its own
  // coin in both rows, which keeps chipProb exactly as pinned.
  var ROW_TYPES = [
    ['laser', 'curler', 'knuckle', 'lowrocket'],  // low row: y <= 1.10, always inside the clamp
    ['laser', 'curler', 'knuckle']                // high row
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function between(rng, lo, hi) { return lo + rng() * (hi - lo); }

  // N(0, sigma) by Box-Muller. Consumes exactly two rng draws, always in this order.
  function gauss(rng, sigma) {
    var u1 = 1 - rng(); // (0, 1] so the log stays finite
    var u2 = rng();
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // One draw -> an index into weights, proportional to weight.
  function pick(rng, weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var r = rng() * total;
    for (i = 0; i < weights.length - 1; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  // team -> goalie. Per-match state only: it dies with this object and shares no structure with
  // TEAMS or with any other goalie, so a match can never teach the table anything.
  function createGoalie(team) {
    var p = team.goalie;
    return {
      reach: p.reach,
      habitWeight: p.habitWeight,
      stayProb: p.stayProb,
      zoneCounts: [0, 0, 0, 0, 0, 0], // Ved kicks only, this match only
      kicks: 0,
      chips: 0
    };
  }

  // (g, { aimZone, shotType }) -> records one VED kick. The CPU's own kicks never come through
  // here. shotType is optional; without it the chip counter simply does not move.
  function goalieObserve(g, obs) {
    // A real zone index or nothing at all. `null`, `false`, `true` and `[]` all slide through a
    // bare `>= 0 && <= 5` in JS, and one of those counts a kick that belongs to no zone - which
    // drags every frequency down and makes the keeper UNLEARN a habit it really saw. `null` is
    // the natural thing a caller passes for "wide shot, no zone", so this has to hold.
    var z = obs.aimZone;
    if (Number.isInteger(z) && z >= 0 && z <= 5) {
      g.zoneCounts[z] += 1;
      g.kicks += 1;
    }
    if (obs.shotType === 'chip') g.chips += 1;
  }

  // (g, { shotType, rng }) -> { zone: 0..5|'stay', timing: -1..1, stance: 'balanced' }
  // INVARIANT 2. The two reads below are the goalie's ENTIRE input surface. It cannot see Ved's
  // current aim, power, strike or meter because it never reads them off opts.
  function goalieDive(g, opts) {
    // shotType is what the keeper visibly sees at strike. The pinned chooser is history-driven,
    // so it steers nothing on its own; it is read here to keep the allowed surface visible.
    var shotType = opts.shotType;
    var rng = opts.rng;
    void shotType;

    // Fixed rng order, every call: 1) stay check, 2) zone (skipped when staying), 3) timing.
    var stayProb = g.chips >= 2 ? g.stayProb * 2 : g.stayProb;
    var zone;
    if (rng() < stayProb) {
      zone = 'stay';
    } else {
      var weights = [];
      for (var i = 0; i < 6; i++) {
        var freq = g.kicks > 0 ? g.zoneCounts[i] / g.kicks : 1 / 6;
        weights.push((1 - g.habitWeight) * (1 / 6) + g.habitWeight * freq);
      }
      zone = pick(rng, weights);
    }
    return { zone: zone, timing: clamp(gauss(rng, 0.25), -1, 1), stance: 'balanced' };
  }

  // team -> striker. Fresh numbers + a fresh power array, never an alias into TEAMS.
  function createStriker(team) {
    var p = team.striker;
    return {
      accuracy: p.accuracy,
      power: [p.power[0], p.power[1]],
      honestTell: p.honestTell,
      chipProb: p.chipProb,
      redirectOnEarly: p.redirectOnEarly
    };
  }

  // (s, { pressure, earlyDive, rng })
  //   -> { type, aim:{x,y}, power, strike, tell:{col,honest}, redirected }
  function strikerPlan(s, opts) {
    // `pressure` is accepted and INTENTIONALLY UNUSED. PLAN.md pins it: "v1 keeps CPU immune,
    // pressure affects VED's meter only". Do not make the CPU choke under pressure.
    var earlyDive = opts.earlyDive;
    var rng = opts.rng;

    // Fixed rng order: 1) redirect coin (only when the profile can redirect at all), 2) zone,
    // 3) chip coin, 4) type (skipped on a chip), 5) aim x, 6) aim y, 7) power,
    // 8) strike size (2 draws), 9) strike side, 10) tell.
    var avoid = null;
    if (earlyDive && s.redirectOnEarly > 0 && rng() < s.redirectOnEarly) avoid = earlyDive.zone;

    // Zone first, then a type that can actually reach it: the zone the striker picks here is the
    // zone the ball arrives in, so the redirect really does take that zone off the table.
    var open = [];
    for (var i = 0; i < 6; i++) if (i !== avoid) open.push(i);
    // Did the coin really take a zone off the table? This is the ONLY place redirectOnEarly is
    // ever drawn against, so it is also the only honest answer to "did he switch". A caller that
    // asks for a second plan on an early dive keeps its first one whenever this is false -
    // otherwise every early dive would be answered with a fresh shot and the profile's 0 / 0.25 /
    // 0.5 would all behave as 1. A keeper who froze ('stay') leaves all six zones open, so there
    // was nothing to redirect away from and this reads false.
    var redirected = open.length < 6;
    var zone = open[Math.floor(rng() * open.length)];
    var col = zone % 3;
    var row = (zone / 3) | 0;

    var pool = ROW_TYPES[row];
    var type = rng() < s.chipProb ? 'chip' : pool[Math.floor(rng() * pool.length)];

    var aim = {
      x: between(rng, AIM_COLS[col][0], AIM_COLS[col][1]),
      y: between(rng, AIM_ROWS[row][0], AIM_ROWS[row][1])
    };

    var power = between(rng, s.power[0], s.power[1]);
    var size = Math.min(1, (1 - s.accuracy) * Math.abs(gauss(rng, 0.5)));
    var strike = rng() < 0.5 ? -size : size;
    var honest = rng() < s.honestTell;

    return {
      type: type,
      aim: aim,
      power: power,
      strike: strike,
      tell: { col: honest ? col : 2 - col, honest: honest }, // bluff = mirrored col, 1 mirrors to 1
      redirected: redirected
    };
  }

  // Twelve kid-plain scout lines: a top / middle / bottom line for each numeric striker trait.
  // Which line fires is decided by the trait's NUMBER alone — never by reading any string, and
  // never by a coin — so a card can only ever say something TRUE about the striker in front of
  // you. A trait sitting in the middle of the pack says exactly that, honestly.
  var CARDS = {
    accuracy: {
      high: { text: 'Ice cold — {tendency}.', tendency: 'they almost never scuff' },
      mid: { text: 'Mostly clean — {tendency}.', tendency: 'the odd one slips' },
      low: { text: 'Not always clean — {tendency}.', tendency: 'scuffs more than most' }
    },
    chipProb: {
      high: { text: 'Watch for the {tendency}!', tendency: 'CHIP' },
      mid: { text: 'They do chip sometimes — {tendency}.', tendency: 'stay on your toes' },
      low: { text: 'Keeps it low — {tendency}.', tendency: 'the chip is rare' }
    },
    // Written against what the PLAYER sees, not the raw honestTell: a bluff mirrors the column
    // and the centre column mirrors onto itself, so a centre shot names the true column either
    // way. The glance is really right 90% / 80% / 70% of the time (robots / thunder / galaxy) —
    // no team's card may tell a nine-year-old to distrust a tell that is right most of the time.
    honestTell: {
      high: { text: 'Their eyes tell the truth — {tendency}.', tendency: 'trust that glance' },
      mid: { text: 'The glance is usually real — {tendency}.', tendency: 'but not every time' },
      low: { text: 'Glance is real most times — {tendency}.', tendency: 'but this one bluffs a lot' }
    },
    redirectOnEarly: {
      high: { text: 'Sharp eyes — {tendency}.', tendency: 'they spot an early dive and switch' },
      mid: { text: 'Careful — {tendency}.', tendency: 'they sometimes switch on an early dive' },
      low: { text: 'Dive early if you like — {tendency}.', tendency: 'they hardly ever switch' }
    }
  };
  var CARD_FIELDS = ['accuracy', 'chipProb', 'honestTell', 'redirectOnEarly'];

  // Each trait's span is measured across the shipped teams rather than written down twice, so
  // re-tuning TEAMS can never leave a card describing a number that no longer exists.
  var CARD_SPAN = {};
  (function () {
    var ids = Object.keys(TEAMS);
    for (var f = 0; f < CARD_FIELDS.length; f++) {
      var lo = Infinity, hi = -Infinity;
      for (var t = 0; t < ids.length; t++) {
        var v = TEAMS[ids[t]].striker[CARD_FIELDS[f]];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      CARD_SPAN[CARD_FIELDS[f]] = [lo, hi];
    }
  })();
  var CARD_EDGE = 0.25;   // within a quarter of an end reads as that end; everything else is middle

  // striker + trait -> the one line that is true of that number. No rng: scout the same team
  // twice and it says the same thing, so two players prepping together never disagree.
  function cardFor(striker, field) {
    var span = CARD_SPAN[field];
    var pos = clamp((striker[field] - span[0]) / (span[1] - span[0]), 0, 1);
    var card = CARDS[field][pos <= CARD_EDGE ? 'low' : (pos >= 1 - CARD_EDGE ? 'high' : 'mid')];
    return card.text.replace('{tendency}', card.tendency);
  }

  // (team, rng) -> [string, string]. rng decides WHICH two traits get talked about and nothing
  // else; two different traits, so always two different cards.
  function scoutCards(team, rng) {
    var left = CARD_FIELDS.slice();
    var out = [];
    for (var n = 0; n < 2; n++) {
      out.push(cardFor(team.striker, left.splice(Math.floor(rng() * left.length), 1)[0]));
    }
    return out;
  }

  var AI = {
    VED: VED,
    VED_KEEPER: VED_KEEPER,
    TEAMS: TEAMS,
    createGoalie: createGoalie,
    goalieObserve: goalieObserve,
    goalieDive: goalieDive,
    createStriker: createStriker,
    strikerPlan: strikerPlan,
    scoutCards: scoutCards
  };

  globalThis.StarShooters = globalThis.StarShooters || {};
  globalThis.StarShooters.AI = AI;
  if (typeof module !== 'undefined') module.exports = AI;
})();
