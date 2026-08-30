// Star Shooters - shootout.js
// Pure match state machine: alternation (Ved always first), early end, sudden death,
// summary / "what the keeper noticed", signature-move once-per-match flag.
(function () {
  'use strict';

  var REGULATION_KICKS = 5; // best of 5 each, then unlimited sudden death
  var ZONES = 6;

  // Whose kick it is, derived from state alone. Ved leads every round - regulation and
  // sudden death (invariant 7) - so Ved kicks whenever the sides are level on kicks taken.
  // There is no other branch: the ordering cannot be flipped by a caller.
  function turnOf(m) {
    return m.vedKicks === m.cpuKicks ? 'ved' : 'cpu';
  }

  // Regulation kicks a side still has in hand.
  function regulationLeft(taken) {
    return Math.max(0, REGULATION_KICKS - taken);
  }

  // The match is over the moment the trailing side cannot draw level with the kicks it
  // has left - checked after every kick, both directions, mid-round included.
  // In sudden death neither side has regulation kicks left, so a round is decided only
  // once BOTH kicks are in and they differ.
  function isDecided(m) {
    var vLeft = regulationLeft(m.vedKicks);
    var cLeft = regulationLeft(m.cpuKicks);
    if (vLeft > 0 || cLeft > 0) {
      return m.ved > m.cpu + cLeft || m.cpu > m.ved + vLeft;
    }
    return m.vedKicks === m.cpuKicks && m.ved !== m.cpu;
  }

  // Regulation: kicks still in hand. Sudden death: the kicks left in the CURRENT round -
  // Ved's is spent the moment he takes it, the CPU always still owes its reply.
  // A finished match owes nobody a kick.
  function remaining(m) {
    if (m.done) return { ved: 0, cpu: 0 };
    var vLeft = regulationLeft(m.vedKicks);
    var cLeft = regulationLeft(m.cpuKicks);
    if (vLeft > 0 || cLeft > 0) return { ved: vLeft, cpu: cLeft };
    return { ved: turnOf(m) === 'ved' ? 1 : 0, cpu: 1 };
  }

  // Ved's two most-used zones, count-descending, ties broken by the lower zone index so
  // the same match always reads back the same list. CPU kicks never count. Zones Ved
  // never used are left out rather than reported as zero.
  function topVedZones(m) {
    var seen = [];
    for (var z = 0; z < ZONES; z++) {
      if (m.vedZones[z] > 0) seen.push({ zone: z, count: m.vedZones[z] });
    }
    seen.sort(function (a, b) { return b.count - a.count || a.zone - b.zone; });
    return seen.slice(0, 2);
  }

  // { teamId, seed } -> match. The match object is the only state this file has.
  function createMatch(opts) {
    return {
      teamId: opts.teamId,
      seed: opts.seed,
      ved: 0,
      cpu: 0,
      vedKicks: 0,
      cpuKicks: 0,
      vedZones: [0, 0, 0, 0, 0, 0],
      signatureUsed: false,
      done: false
    };
  }

  // m -> { phase, round, suddenDeath, pressure }
  // Pure query: advances nothing, mutates nothing. Safe to call every frame.
  function next(m) {
    var round = m.done
      ? Math.max(m.vedKicks, m.cpuKicks) // the round the match ended in
      : Math.min(m.vedKicks, m.cpuKicks) + 1; // the round now being played
    return {
      phase: m.done ? 'done' : (turnOf(m) === 'ved' ? 'ved-kick' : 'cpu-kick'),
      round: round,
      suddenDeath: round > REGULATION_KICKS,
      pressure: round >= REGULATION_KICKS ? 1 : 0
    };
  }

  // (m, { kicker, outcome, aimZone }) -> advances; early-end + sudden death live in here.
  // The only mutator. Only 'goal' scores.
  function record(m, kick) {
    if (m.done) {
      throw new Error('Shootout.record: the match is already done - no more kicks');
    }
    var turn = turnOf(m);
    if (kick.kicker !== turn) {
      throw new Error('Shootout.record: out of turn - expected ' + turn + ', got ' + kick.kicker);
    }
    if (turn === 'ved') {
      m.vedKicks++;
      if (kick.outcome === 'goal') m.ved++;
      if (m.vedZones[kick.aimZone] !== undefined) m.vedZones[kick.aimZone]++;
    } else {
      m.cpuKicks++;
      if (kick.outcome === 'goal') m.cpu++;
    }
    if (isDecided(m)) m.done = true;
  }

  // m -> { ved, cpu, kicksLeft:{ved,cpu} }
  function score(m) {
    return { ved: m.ved, cpu: m.cpu, kicksLeft: remaining(m) };
  }

  // m -> { winner, ved, cpu, rounds, noticed:[{zone,count}...] }
  // Requires a finished match: a half-built winner is worse than a loud failure.
  function summary(m) {
    if (!m.done) {
      throw new Error('Shootout.summary: match is not finished - call it once next(m).phase is "done"');
    }
    return {
      winner: m.ved > m.cpu ? 'ved' : 'cpu',
      ved: m.ved,
      cpu: m.cpu,
      rounds: Math.max(m.vedKicks, m.cpuKicks),
      noticed: topVedZones(m)
    };
  }

  // m -> bool; true exactly once per match, false on every later call.
  function useSignature(m) {
    if (m.signatureUsed) return false;
    m.signatureUsed = true;
    return true;
  }

  var Shootout = {
    createMatch: createMatch,
    next: next,
    record: record,
    score: score,
    summary: summary,
    useSignature: useSignature
  };

  globalThis.StarShooters = globalThis.StarShooters || {};
  globalThis.StarShooters.Shootout = Shootout;
  if (typeof module !== 'undefined') module.exports = Shootout;
})();
