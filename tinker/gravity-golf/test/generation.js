/* Every hole the generator can produce must be fair and finite.
   Usage: node test/generation.js [holes] [path/to/index.html]

   Works by pulling the #core <script> straight out of the page and running it as
   plain JS - #core is DOM-free on purpose, so no browser is involved. */
const fs = require('fs'), path = require('path');
const N = Number(process.argv[2] || 60);
const PAGE = process.argv[3] || path.join(__dirname, '..', 'index.html');
const MAX_BODIES = 26;                       // must match MAXP in #core

const src = fs.readFileSync(PAGE, 'utf8').match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const GG = new Function(src + '; return GG;')();
const DT = GG.DT, MAXSTEP = Math.round(GG.FLIGHT_MAX * 240);

/* Independent re-check of the generator's own claim: sinkable from the tee in one
   shot. Deliberately not the same code path as solvable(). */
function sweepSolve(c, need) {
  const base = Math.atan2(c.hole.y - c.tee.y, c.hole.x - c.tee.x);
  const s = { x: 0, y: 0, vx: 0, vy: 0, warped: 0, bounced: 0 };
  let found = 0;
  for (let ai = 0; ai < 240; ai++) {
    const half = (ai + 1) >> 1;
    const ang = base + ((ai & 1) ? half : -half) * (Math.PI * 2 / 240);
    for (let pi = 0; pi < 12; pi++) {
      const sp = GG.MAX_SPEED * (0.18 + 0.82 * pi / 11);
      s.x = c.tee.x; s.y = c.tee.y; s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      let e = null;
      for (let k = 0; k < MAXSTEP; k++) {
        e = GG.substep(c, s, k * DT);
        if (!isFinite(s.x) || !isFinite(s.y) || !isFinite(s.vx) || !isFinite(s.vy))
          throw new Error(`NaN on hole ${c.n} at step ${k}`);
        if (e) break;
      }
      if (e && e.type === 'sink' && ++found >= need) return found;
    }
  }
  return found;
}

let worst = 0, worstN = 0, bodiesMax = 0, parSum = 0, fails = [];
const tally = { rep: 0, orb: 0, belt: 0, warp: 0, bump: 0, drift: 0 };
const t0 = Date.now();

for (let n = 1; n <= N; n++) {
  const g0 = Date.now();
  const c = GG.genHole(n);
  const gms = Date.now() - g0;
  if (gms > worst) { worst = gms; worstN = n; }

  // the generator has a deterministic fallback course; reaching it means it gave up
  if (c.tee.x === GG.W * 0.14 && c.hole.x === GG.W * 0.86) fails.push(`hole ${n}: SAFETY NET`);
  if (c.planets.length > MAX_BODIES) fails.push(`hole ${n}: ${c.planets.length} bodies > ${MAX_BODIES}`);
  bodiesMax = Math.max(bodiesMax, c.planets.length);

  // substep() only loops the front of the array for gravity, so the sort must hold
  for (let i = 0; i < c.planets.length; i++) {
    const isGrav = c.planets[i].mu !== 0;
    if (i < c.gravN && !isGrav) fails.push(`hole ${n}: body ${i} inside gravN has mu 0`);
    if (i >= c.gravN && isGrav) fails.push(`hole ${n}: body ${i} past gravN still has mass`);
  }

  // a wormhole that spits you out inside a planet is an unearned death
  for (const w of c.warps) {
    const exitR = GG.WARP_R + GG.BALL_R + 4;
    for (const p of c.planets) {
      for (const [mx, my] of [[w.ax, w.ay], [w.bx, w.by]]) {
        const gap = Math.hypot(mx - p.ox, my - p.oy) - exitR - (p.r + p.orbR);
        if (gap < GG.BALL_R) fails.push(`hole ${n}: warp exit can land in a body (gap ${gap.toFixed(1)})`);
      }
    }
  }

  if (sweepSolve(c, 2) < 2) fails.push(`hole ${n}: fewer than 2 ways in`);

  // the aiming line is only honest if the previewed path IS the flown path
  const A = { x: c.tee.x, y: c.tee.y, vx: 300, vy: -220, warped: 0, bounced: 0 };
  let ea = null;
  for (let k = 0; k < 240; k++) { ea = GG.substep(c, A, k * DT); if (ea) break; }
  const pv = GG.preview(c, c.tee.x, c.tee.y, 300, -220, 0, 240);
  const lx = pv.pts[(pv.n - 1) << 1], ly = pv.pts[((pv.n - 1) << 1) + 1];
  const wx = ea ? ea.x : A.x, wy = ea ? ea.y : A.y;
  if (lx !== wx || ly !== wy) fails.push(`hole ${n}: preview drifted from the flown path`);

  for (const k of Object.keys(tally)) {
    const flag = 'has' + k[0].toUpperCase() + k.slice(1);
    if (c[flag]) tally[k]++;
  }
  parSum += c.par;
}

console.log(`holes 1-${N}  ${Date.now() - t0} ms total   slowest genHole ${worst} ms (hole ${worstN})`);
console.log(`max bodies ${bodiesMax}/${MAX_BODIES}   avg par ${(parSum / N).toFixed(2)}`);
console.log('feature spread:', JSON.stringify(tally));
if (fails.length) {
  console.log(`\nFAIL (${fails.length}):`);
  fails.slice(0, 25).forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log('\nALL CHECKS PASS');
