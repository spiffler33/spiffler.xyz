/* Bumpers and wormholes are the only things that change the ball mid-flight, so
   they are the only things that can trap it, teleport it into a rock, or feed it
   free energy. This fires thousands of shots at every hole that has one.
   Usage: node test/mechanics.js [holes] [path/to/index.html] */
const fs = require('fs'), path = require('path');
const N = Number(process.argv[2] || 60);
const PAGE = process.argv[3] || path.join(__dirname, '..', 'index.html');

const src = fs.readFileSync(PAGE, 'utf8').match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const GG = new Function(src + '; return GG;')();
const DT = GG.DT, MAXS = Math.round(GG.FLIGHT_MAX * 240);

let bumpHoles = 0, warpHoles = 0, totBounce = 0, totWarp = 0;
let timeouts = 0, trials = 0, peak = 0;
const fails = [];

for (let n = 1; n <= N; n++) {
  const c = GG.genHole(n);
  if (!c.hasBump && !c.hasWarp) continue;
  const bumpers = c.planets.filter(p => p.bump);
  const base = Math.atan2(c.hole.y - c.tee.y, c.hole.x - c.tee.x);
  const s = { x: 0, y: 0, vx: 0, vy: 0, warped: 0, bounced: 0 };
  let hb = 0, hw = 0;

  for (let ai = 0; ai < 240; ai += 3) {
    const half = (ai + 1) >> 1;
    const ang = base + ((ai & 1) ? half : -half) * (Math.PI * 2 / 240);
    for (let pi = 0; pi < 12; pi += 2) {
      const sp = GG.MAX_SPEED * (0.18 + 0.82 * pi / 11);
      s.x = c.tee.x; s.y = c.tee.y; s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      s.warped = 0; s.bounced = 0;
      trials++;
      let e = null;
      for (let k = 0; k < MAXS; k++) {
        e = GG.substep(c, s, k * DT);
        const v = Math.hypot(s.vx, s.vy);
        if (v > peak) peak = v;
        if (v > GG.MAX_SPEED * 12) { fails.push(`hole ${n}: speed ran away to ${v.toFixed(0)}`); break; }

        if (s.bounced) {                        // must be left OUTSIDE the bumper
          s.bounced = 0; hb++; totBounce++;
          for (const b of bumpers) {
            const bx = GG.planetX(b, k * DT), by = GG.planetY(b, k * DT);
            if (Math.hypot(s.x - bx, s.y - by) < b.r + GG.BALL_R - 0.01)
              fails.push(`hole ${n}: ball left inside a bumper`);
          }
        }
        if (s.warped) {                         // must not re-enter, must not land in a body
          s.warped = 0; hw++; totWarp++;
          for (const w of c.warps)
            if (Math.hypot(s.x - w.ax, s.y - w.ay) < GG.WARP_R ||
                Math.hypot(s.x - w.bx, s.y - w.by) < GG.WARP_R)
              fails.push(`hole ${n}: warp exit landed back in a mouth`);
          for (const p of c.planets) {
            const px = GG.planetX(p, k * DT), py = GG.planetY(p, k * DT);
            if (Math.hypot(s.x - px, s.y - py) < p.r + GG.BALL_R)
              fails.push(`hole ${n}: warp exit landed inside a body`);
          }
        }
        if (e) break;
      }
      if (!e) timeouts++;
    }
  }
  // a mechanic that silently stops firing is a regression the other checks miss
  if (c.hasBump) { bumpHoles++; if (!hb) fails.push(`hole ${n}: has a bumper, nothing ever bounced`); }
  if (c.hasWarp) { warpHoles++; if (!hw) fails.push(`hole ${n}: has a wormhole, nothing ever warped`); }
}

console.log(`holes 1-${N}: ${bumpHoles} with bumpers, ${warpHoles} with wormholes`);
console.log(`${trials} trajectories -> ${totBounce} bounces, ${totWarp} warps`);
console.log(`still alive at ${GG.FLIGHT_MAX} s: ${timeouts} (${(100 * timeouts / trials).toFixed(1)}%)`);
console.log(`peak speed ${peak.toFixed(0)} (launch max ${GG.MAX_SPEED})`);
if (fails.length) {
  console.log('\nFAIL:');
  [...new Set(fails)].slice(0, 15).forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log('\nBOUNCE + WARP INVARIANTS HOLD');
