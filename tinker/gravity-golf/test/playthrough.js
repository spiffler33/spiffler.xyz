/* The renderers only run when a body of that kind is on screen, so a typo in one
   is a runtime crash, not a syntax error. This stubs canvas + audio + DOM, loads
   BOTH scripts, and plays real holes through the real pointer handlers.
   Usage: node test/playthrough.js [holes] [path/to/index.html] */
const fs = require('fs'), path = require('path');
const N = Number(process.argv[2] || 40);
const PAGE = process.argv[3] || path.join(__dirname, '..', 'index.html');
const page = fs.readFileSync(PAGE, 'utf8');
const grab = id => page.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'))[1];

/* ---- the smallest DOM that lets the game boot ---- */
const NOOP_2D = ['save','restore','translate','rotate','scale','beginPath','closePath','moveTo',
  'lineTo','arc','arcTo','rect','fill','stroke','fillRect','strokeRect','clearRect','setLineDash',
  'drawImage','setTransform','clip','quadraticCurveTo','bezierCurveTo','fillText'];
let ctxCalls = 0;
const listeners = new Map();

function mkEl(tag) {
  const e = { tagName: tag, style: {}, textContent: '', innerHTML: '', className: '',
    onclick: null, width: 0, height: 0,
    classList: { _s: new Set(), add(x) { this._s.add(x); }, remove(x) { this._s.delete(x); },
                 contains(x) { return this._s.has(x); } },
    addEventListener(t, fn) { if (!listeners.has(e)) listeners.set(e, {}); (listeners.get(e)[t] ||= []).push(fn); },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 810 }) };
  return e;
}
function mkCanvas() {
  const el = mkEl('canvas');
  const grad = { addColorStop() {} };
  const cx = { canvas: el, globalAlpha: 1, globalCompositeOperation: '', fillStyle: '',
               strokeStyle: '', lineWidth: 1, lineCap: '', font: '',
               createRadialGradient: () => grad, createLinearGradient: () => grad };
  for (const m of NOOP_2D) cx[m] = () => { ctxCalls++; };
  el.getContext = () => cx;
  return el;
}
const els = {};
for (const id of ['cv','hHole','hPar','hStr','hTot','hint','toast','card','panel','bRestart','bMute','bNext','bAgain'])
  els[id] = id === 'cv' ? mkCanvas() : mkEl('div');
const document = {
  getElementById: id => els[id] || (els[id] = mkEl('div')),
  createElement: t => (t === 'canvas' ? mkCanvas() : mkEl(t)),
  addEventListener() {}, documentElement: mkEl('html'), body: mkEl('body')
};
let rafCb = null, audioT = 0;
const P = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
const NODE = () => ({ connect() {}, disconnect() {}, start() {}, stop() {} });
const window = {
  innerWidth: 1440, innerHeight: 810, devicePixelRatio: 2,
  addEventListener() {}, requestAnimationFrame: fn => { rafCb = fn; return 1; },
  AudioContext: function () {
    return { state: 'running', sampleRate: 44100, destination: {}, resume() {},
      get currentTime() { return audioT; },
      createGain: () => Object.assign(NODE(), { gain: P() }),
      createOscillator: () => Object.assign(NODE(), { type: '', frequency: P(), detune: P() }),
      createBiquadFilter: () => Object.assign(NODE(), { type: '', Q: P(), frequency: P(), gain: P() }),
      createBufferSource: () => Object.assign(NODE(), { buffer: null, loop: false, playbackRate: P() }),
      createBuffer: (ch, n) => ({ getChannelData: () => new Float32Array(n) }) };
  }
};
const GG = new Function('document', 'window', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'navigator',
  grab('core') + '\n' + grab('app') + '\n; return GG;'
)(document, window, window.requestAnimationFrame, () => 0, () => {}, { userAgent: 'node' });

/* ---- drive it ---- */
const DT = GG.DT;
const scale = Math.min(1440 / GG.W, 810 / GG.H);
const offX = (1440 - GG.W * scale) / 2, offY = (810 - GG.H * scale) / 2;
const fire = (type, x, y) => {
  for (const f of (listeners.get(els.cv) || {})[type] || [])
    f({ clientX: x * scale + offX, clientY: y * scale + offY, pointerId: 1, button: 0,
        isPrimary: true, preventDefault() {} });
};

/* The game advances physics off its own accumulator. Mirror the identical float
   arithmetic so we know which step a shot will actually start on - the moving
   holes make that difference matter. */
let now = 0, acc = 0, simStep = 0;
function tick(ms) {
  let dt = ms / 1000; if (dt > 0.25) dt = 0.25;
  acc += dt;
  let guard = 0;
  while (acc >= DT && guard < 900) { acc -= DT; simStep++; guard++; }
  now += ms; audioT += dt;
  rafCb(now);
}
const resetClock = () => { acc = 0; simStep = 0; };          // prepHole() zeroes both

function solveAt(c, step0) {
  const base = Math.atan2(c.hole.y - c.tee.y, c.hole.x - c.tee.x);
  const s = { x: 0, y: 0, vx: 0, vy: 0, warped: 0, bounced: 0 };
  const MAXS = Math.round(GG.FLIGHT_MAX * 240);
  for (let ai = 0; ai < 240; ai++) {
    const half = (ai + 1) >> 1;
    const ang = base + ((ai & 1) ? half : -half) * (Math.PI * 2 / 240);
    for (let pi = 0; pi < 12; pi++) {
      const sp = GG.MAX_SPEED * (0.18 + 0.82 * pi / 11);
      s.x = c.tee.x; s.y = c.tee.y; s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      let e = null;
      for (let k = 0; k < MAXS; k++) { e = GG.substep(c, s, (step0 + k) * DT); if (e) break; }
      if (e && e.type === 'sink') return { ang, pull: (sp / GG.MAX_SPEED) * GG.MAX_DRAG };
    }
  }
  return null;
}

let shots = 0, sunk = 0;
const problems = [];
const t0 = Date.now();
resetClock();
tick(16);                                        // first frame after boot's prepHole(1)

for (let hole = 1; hole <= N; hole++) {
  if (Number(els.hHole.textContent) !== hole) {
    problems.push(`expected hole ${hole}, HUD says ${els.hHole.textContent}`);
    break;
  }
  const c = GG.genHole(hole);
  let done = false;
  for (let attempt = 0; attempt < 14 && !done; attempt++) {
    const sol = solveAt(c, simStep + 1);
    if (!sol) { problems.push(`hole ${hole}: no solution at step ${simStep + 1}`); break; }
    const ex = c.tee.x - Math.cos(sol.ang) * sol.pull, ey = c.tee.y - Math.sin(sol.ang) * sol.pull;
    fire('pointerdown', c.tee.x, c.tee.y);
    fire('pointermove', ex, ey);
    tick(1000 / 240);                            // one frame so the aim latches its velocity
    fire('pointerup', ex, ey);
    shots++;
    for (let f = 0; f < 1400 && !done; f++) {
      tick(1000 / 240);
      if (els.bNext.onclick) done = true;        // a card is up, so the hole went in
    }
  }
  if (!done) { problems.push(`hole ${hole}: never sank after 14 attempts`); break; }
  sunk++;
  els.bNext.onclick();
  els.bNext.onclick = null;
  resetClock();
  tick(16);
}

console.log(`played ${sunk}/${N} holes in ${shots} shots, ${Date.now() - t0} ms`);
console.log(`canvas ops ${ctxCalls.toLocaleString()}   HUD total ${els.hTot.textContent}`);
if (problems.length) {
  console.log('\nPROBLEMS:');
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('\nNO RUNTIME ERRORS - every renderer and flow path executed');
