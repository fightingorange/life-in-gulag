'use strict';
// Living stills: the print stays still, and light and weather are composited over it.
// Three layers, each a canvas over the picture:
//   light     blended with 'screen', so it really brightens the print: window shafts, lamp cones,
//             searchlights, firelight and its spill, glows
//   shade     blended with 'multiply', so it really darkens it: cloud shadows drifting over the snow,
//             the dark of a room breathing with the fire, a warm overprint on light skies
//   particles drawn normally: snow, breath, smoke, sparks, dust, grain
// Everything is in the print's own two inks (paper and black) except firelight, the only warm
// thing in the game. Positions are fractions of the frame (0..1).
const FX = (() => {
  const PAPER = '235,226,202', INK = '27,24,19', WARM = '214,160,90';
  const col = c => c === 'paper' ? PAPER : c === 'warm' ? WARM : INK;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const B = (x, y, color, scale) => ({ x, y, color: color || 'paper', scale: scale || 1 });
  const CONF = {
    // ---- outside: snow, breath, smoke, and cloud shadows drifting over the snow
    title:       { snow: { n: 40, color: 'ink', wind: 35, speed: [18, 40], size: [.6, 1.3], streak: true },
                   clouds: { n: 3, a: .20, speed: 7 } },
    count:       { snow: { n: 160, color: 'paper', wind: -45, speed: [35, 80], size: [.7, 1.9] },
                   breath: [B(.36, .62, 'paper', .8), B(.44, .62, 'paper', .8), B(.51, .62, 'paper', .8), B(.575, .62, 'paper', .8), B(.635, .62, 'paper', .8)],
                   glow: [{ x: .505, y: .525, r: .03, color: 'warm', a: .5, flicker: .6 }],
                   sweep: { x: .82, y: .42, a0: 160, a1: 205, period: 16, len: 1.1, spread: 11, a: 1.6 } },
    site:        { snow: { n: 50, color: 'ink', wind: 25, speed: [15, 35], size: [.6, 1.2], streak: true },
                   smoke: { x: .92, y: .215, color: 'ink', a: .10, r: [6, 30], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 },
                   clouds: { n: 4, a: .19, speed: 10 } },
    noon:        { snow: { n: 90, color: 'ink', wind: 70, speed: [35, 60], size: [.7, 1.5], streak: true },
                   ember: { x: .53, y: .775, r: .08, sparks: true },
                   spill: { x: .53, y: .75, r: .26, a: .16 },
                   smoke: { x: .53, y: .72, color: 'ink', a: .07, r: [8, 34], life: 4, rate: 1, drift: [18, -30], spread: 14 },
                   breath: [B(.375, .56, 'ink', .7), B(.625, .585, 'ink', .7)],
                   clouds: { n: 3, a: .17, speed: 12 } },
    gate:        { snow: { n: 60, color: 'ink', wind: 20, speed: [18, 40], size: [.6, 1.3], streak: true },
                   sweep: { x: .835, y: .135, a0: 135, a1: 200, period: 11, len: .9, spread: 14, color: 'warm' },
                   clouds: { n: 3, a: .17, speed: 8 } },
    wire:        { snow: { n: 70, color: 'paper', wind: -25, speed: [20, 45], size: [.6, 1.6] },
                   sweep: { x: .795, y: .52, a0: 185, a1: 235, period: 14, len: 1.0, spread: 9 } },
    river:       { snow: { n: 30, color: 'ink', wind: 40, speed: [12, 30], size: [.5, 1.1], streak: true },
                   smoke: { x: .82, y: .29, color: 'ink', a: .07, r: [4, 16], life: 5, rate: 1.4, drift: [30, -6], spread: 6 },
                   breath: [B(.31, .40, 'ink', .35)],
                   clouds: { n: 4, a: .19, speed: 9 } },
    inspection:  { snow: { n: 40, color: 'ink', wind: 25, speed: [14, 32], size: [.5, 1.1], streak: true },
                   breath: [B(.565, .25, 'ink', .45), B(.635, .25, 'ink', .45), B(.675, .25, 'ink', .45), B(.735, .27, 'ink', .45), B(.785, .22, 'ink', .45)],
                   clouds: { n: 4, a: .18, speed: 9 } },
    ice_out:     { snow: { n: 25, color: 'ink', wind: 55, speed: [10, 24], size: [.5, 1], streak: true },
                   smoke: { x: .76, y: .23, color: 'ink', a: .06, r: [4, 14], life: 5, rate: 1.2, drift: [26, -5], spread: 6 },
                   clouds: { n: 4, a: .20, speed: 14 } },
    // ---- inside: light through the windows, the stove, the lamp
    hut_morning: { beam: { x: .727, y: .5, w: .07, angle: 96, spread: 26, len: .55, a: .32, pass: true, land: { x: .7, y: .78, rx: .16, ry: .06 } },
                   glow: [{ x: .727, y: .45, r: .07, color: 'paper', a: .22, flicker: .15 }],
                   motes: { n: 18, region: [.6, .48, .25, .4] } },
    hut_night:   { ember: { x: .73, y: .57, r: .06, floor: { x: .73, y: .7, rx: .14, ry: .035 } },
                   spill: { x: .72, y: .6, r: .3, a: .12 },
                   dark: { x: .72, y: .58, r: .45, a: .22 },
                   beam: { x: .655, y: .48, w: .06, angle: 100, spread: 22, len: .35, a: .16, pass: true },
                   breath: [B(.235, .465, 'paper', .6)], motes: { n: 10, region: [.55, .35, .4, .4] } },
    table:       { smoke: { x: .47, y: .30, color: 'ink', a: .08, r: [8, 26], life: 3, rate: .8, drift: [6, -22], spread: 30 },
                   pool: { x: .46, y: .36, r: .5, a: .3, swing: .05, period: 7.5, shade: true } },
    cells:       { beam: { x: .5, y: .17, w: .03, angle: 92, spread: 16, len: .75, a: .32, land: { x: .48, y: .78, rx: .13, ry: .05 } },
                   glow: [{ x: .50, y: .11, r: .05, color: 'paper', a: .18, flicker: .15 }],
                   motes: { n: 16, region: [.42, .2, .16, .6] } },
    dead:        { beam: { x: .86, y: .27, w: .07, angle: 128, spread: 26, len: .7, a: .34, pass: true, land: { x: .62, y: .72, rx: .16, ry: .06 } },
                   glow: [{ x: .87, y: .21, r: .07, color: 'paper', a: .16, flicker: .1 }],
                   motes: { n: 12, region: [.55, .25, .35, .5] } },
    stove:       { ember: { x: .366, y: .545, r: .08, floor: { x: .40, y: .67, rx: .16, ry: .035 } },
                   spill: { x: .37, y: .58, r: .36, a: .14 },
                   dark: { x: .38, y: .56, r: .5, a: .2 },
                   beam: { x: .56, y: .38, w: .06, angle: 100, spread: 20, len: .3, a: .08 },
                   motes: { n: 10, region: [.28, .3, .3, .35] } },
    blizzard:    { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.64, .225, .167, .305] },
                   beam: { x: .725, y: .52, w: .17, angle: 105, spread: 30, len: .5, a: .12, flicker: .35 },
                   glow: [{ x: .725, y: .38, r: .12, color: 'paper', a: .1, flicker: .3 }] },
    letter:      { beam: { x: .14, y: .1, w: .16, angle: 40, spread: 28, len: .9, a: .34, pass: true, land: { x: .5, y: .6, rx: .25, ry: .12 } },
                   motes: { n: 18, region: [.08, .1, .4, .5] } },
    office:      { beam: { x: .26, y: .3, w: .05, angle: 62, spread: 58, len: .38, a: .3, color: 'warm', flicker: .08, land: { x: .42, y: .58, rx: .2, ry: .07 } },
                   glow: [{ x: .265, y: .27, r: .06, color: 'warm', a: .3, flicker: .1 }],
                   motes: { n: 10, region: [.25, .25, .25, .25] } },
    easter:      { ember: { x: .852, y: .575, r: .07, floor: { x: .82, y: .66, rx: .16, ry: .04 } },
                   spill: { x: .84, y: .6, r: .3, a: .12 },
                   dark: { x: .84, y: .6, r: .55, a: .2 },
                   beam: { x: .23, y: .24, w: .05, angle: 95, spread: 18, len: .3, a: .08 } },
  };

  // effects placed by hand on the other drawings of each place (positions as fractions of the frame)
  const VARIANTS = {
    'hut_morning-02': { glow: [{ x: .245, y: .37, r: .08, color: 'paper', a: .10, flicker: .3 }] },
    'hut_morning-03': { glow: [{ x: .68, y: .45, r: .08, color: 'paper', a: .10, flicker: .3 }] },
    'table-02': { smoke: { x: .375, y: .42, color: 'ink', a: .08, r: [8, 24], life: 3, rate: .8, drift: [6, -22], spread: 26 } },
    'table-03': { smoke: { x: .56, y: .33, color: 'ink', a: .08, r: [8, 24], life: 3, rate: .8, drift: [6, -22], spread: 26 } },
    'site-01': { smoke: { x: .04, y: .13, color: 'ink', a: .10, r: [6, 28], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 } },
    'site-03': { smoke: { x: .965, y: .07, color: 'ink', a: .10, r: [6, 28], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 } },
    'noon-01': { ember: { x: .55, y: .72, r: .06, sparks: true }, smoke: { x: .55, y: .67, color: 'ink', a: .07, r: [8, 30], life: 4, rate: 1, drift: [18, -30], spread: 14 } },
    'noon-03': { ember: { x: .50, y: .71, r: .07, sparks: true }, smoke: { x: .50, y: .66, color: 'ink', a: .07, r: [8, 34], life: 4, rate: 1, drift: [18, -30], spread: 14 } },
    'gate-02': { sweep: { x: .80, y: .08, a0: 125, a1: 190, period: 11, len: .9, spread: 14, color: 'warm' } },
    'gate-03': { sweep: { x: .79, y: .25, a0: 140, a1: 205, period: 11, len: .9, spread: 14, color: 'warm' } },
    'hut_night-02': { ember: { x: .265, y: .60, r: .05, floor: { x: .27, y: .72, rx: .11, ry: .03 } } },
    'hut_night-03': { ember: { x: .665, y: .60, r: .05, floor: { x: .66, y: .72, rx: .11, ry: .03 } } },
    'cells-02': { glow: [{ x: .62, y: .22, r: .06, color: 'paper', a: .08, flicker: .15 }] },
    'cells-03': { glow: [{ x: .50, y: .26, r: .06, color: 'paper', a: .08, flicker: .15 }] },
    'wire-01': { sweep: { x: .75, y: .47, a0: 185, a1: 235, period: 14, len: 1.0, spread: 9 } },
    'stove-01': { ember: { x: .39, y: .53, r: .07, floor: { x: .40, y: .66, rx: .15, ry: .035 } } },
    'stove-02': { ember: { x: .594, y: .53, r: .07, floor: { x: .59, y: .66, rx: .15, ry: .035 } } },
    'letter-01': { glow: [{ x: .12, y: .08, r: .24, color: 'paper', a: .08, flicker: .05 }] },
    'letter-02': { glow: [{ x: .12, y: .08, r: .24, color: 'paper', a: .08, flicker: .05 }] },
    'blizzard-01': { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.645, .17, .19, .37] } },
    'blizzard-02': { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.225, .17, .18, .36] } },
    'office-01': { glow: [{ x: .86, y: .14, r: .2, color: 'warm', a: .12, flicker: .12 }] },
    'office-02': { glow: [{ x: .27, y: .17, r: .2, color: 'warm', a: .12, flicker: .12 }] },
    'easter-01': { ember: { x: .578, y: .64, r: .05, floor: { x: .56, y: .72, rx: .1, ry: .03 } } },
    'easter-03': { ember: { x: .69, y: .57, r: .05, floor: { x: .67, y: .66, rx: .1, ry: .03 } } },
  };

  let canvas, ctx, box, W = 0, H = 0, s = 1, cfg = null, name = null;
  let ctxP, ctxL, ctxS, layers = [];
  let clouds = [], passAt = 0, passT = -1;
  let snow = [], puffs = [], sparks = [], motes = [], breathTimers = [], smokeAcc = 0, sparkAcc = 0;
  let raf = null, last = 0, t = 0, grain = [], grainIdx = 0, grainAt = 0;

  function mount(frameBox) {
    box = frameBox;
    const layer = (id, blend) => {
      const c = document.createElement('canvas');
      c.id = id;
      if (blend) c.style.mixBlendMode = blend;
      box.appendChild(c);
      layers.push(c);
      return c.getContext('2d');
    };
    ctxS = layer('fx-shade', 'multiply');
    ctxL = layer('fx-light', 'screen');
    ctxP = layer('fx', null);
    canvas = layers[2];
    ctx = ctxP;
    for (let i = 0; i < 3; i++) grain.push(makeGrain());
    if (window.ResizeObserver) new ResizeObserver(resize).observe(box);
    else addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (cfg) start(); });
  }
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), im = g.createImageData(160, 160), d = im.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 27; d[i + 1] = 24; d[i + 2] = 19; d[i + 3] = Math.random() < .5 ? 0 : Math.random() * 70; }
    g.putImageData(im, 0, 0);
    return c;
  }
  function resize() {
    if (!box) return;
    const r = { width: box.clientWidth, height: box.clientHeight };   // layout size: the drift transform does not count
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height; s = W / 680;
    for (const [c, g] of [[layers[0], ctxS], [layers[1], ctxL], [layers[2], ctxP]]) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    seed();
  }
  function seed() {
    snow = []; motes = []; puffs = []; sparks = []; breathTimers = [];
    if (!cfg) return;
    if (cfg.snow) for (let i = 0; i < cfg.snow.n; i++) snow.push(flake(cfg.snow, true));
    if (cfg.motes) for (let i = 0; i < cfg.motes.n; i++) {
      const [rx, ry, rw, rh] = cfg.motes.region;
      motes.push({ x: (rx + Math.random() * rw) * W, y: (ry + Math.random() * rh) * H, vx: rnd(-3, 3), vy: rnd(-2, 2), ph: rnd(0, 6.3) });
    }
    if (cfg.breath) breathTimers = cfg.breath.map(() => rnd(.5, 3));
    clouds = [];
    if (cfg.clouds) for (let i = 0; i < cfg.clouds.n; i++) clouds.push(cloud(cfg.clouds, true));
    passAt = rnd(8, 20); passT = -1;
  }
  function cloud(c, anywhere) {
    const r = rnd(.25, .5) * W;
    return { x: anywhere ? rnd(-r, W + r) : -r * 1.2, y: rnd(-.1, 1.1) * H, r, sq: rnd(.35, .6), v: rnd(.6, 1.2) * (c.speed || 9) * s, a: rnd(.6, 1) };
  }
  // the area snow falls in: the whole frame, or a clip region such as a window
  function area(c) { const [x, y, w, h] = c.clip || [0, 0, 1, 1]; return { x: x * W, y: y * H, w: w * W, h: h * H }; }
  function flake(c, anywhere) {
    const A = area(c);
    return { x: A.x + Math.random() * A.w, y: anywhere ? A.y + Math.random() * A.h : A.y - 4, vy: rnd(c.speed[0], c.speed[1]) * s, r: rnd(c.size[0], c.size[1]) * s, ph: rnd(0, 6.3), a: rnd(.5, 1) };
  }

  // A variant drawing ("noon-03") uses its own entry if there is one (merged over the master's);
  // otherwise it keeps only what does not depend on where things are in the picture.
  const PLACED = ['ember', 'glow', 'breath', 'sweep', 'smoke', 'beam', 'spill', 'dark', 'pool'];
  function configFor(key) {
    if (CONF[key] && !key.includes('-0')) return CONF[key];
    const base = key.split('-0')[0], b = CONF[base] || {};
    const out = {};
    for (const k in b) if (!PLACED.includes(k) && !(k === 'snow' && b.snow.clip)) out[k] = b[k];
    return Object.assign(out, VARIANTS[key] || {});
  }
  function set(frameName) {
    name = frameName;
    cfg = frameName ? configFor(frameName) : null;   // an unconfigured frame still gets the grain
    if (reduced) cfg = null;
    if (cfg) { resize(); start(); } else { stop(); for (const g of [ctxP, ctxL, ctxS]) if (g) g.clearRect(0, 0, W, H); }
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    let dt = (now - last) / 1000;
    if (dt < 1 / 32) return;           // ~30 fps is plenty for a print
    last = now; dt = Math.min(dt, .1); t += dt;
    if (!cfg || !W) return;
    ctxP.clearRect(0, 0, W, H); ctxL.clearRect(0, 0, W, H); ctxS.clearRect(0, 0, W, H);
    // shade
    ctx = ctxS;
    if (cfg.clouds) drawClouds(cfg.clouds, dt);
    if (cfg.dark) drawDark(cfg.dark);
    if (cfg.pool && cfg.pool.shade) drawPool(cfg.pool);
    if (cfg.sweep && cfg.sweep.color === 'warm') drawSweep(cfg.sweep);
    // light
    ctx = ctxL;
    if (cfg.beam) [].concat(cfg.beam).forEach(b => drawBeam(b, dt));
    if (cfg.pool && !cfg.pool.shade) drawPool(cfg.pool);
    if (cfg.sweep && cfg.sweep.color !== 'warm') drawSweep(cfg.sweep);
    if (cfg.glow) cfg.glow.forEach(drawGlow);
    if (cfg.spill) drawSpill(cfg.spill);
    if (cfg.ember) drawEmber(cfg.ember, dt);
    // particles
    ctx = ctxP;
    if (cfg.ember && cfg.ember.sparks) drawSparks(cfg.ember, dt);
    if (cfg.smoke) stepSmoke(cfg.smoke, dt);
    if (cfg.breath) stepBreath(cfg.breath, dt);
    drawPuffs(dt);
    if (cfg.motes) drawMotes(dt);
    if (cfg.snow) drawSnow(cfg.snow, dt);
    drawGrain(now);
  }

  // ---- snow: paper flakes over dark skies, ink specks over light ones
  function drawSnow(c, dt) {
    const color = col(c.color), base = c.color === 'paper' ? .75 : .45, A = area(c);
    ctx.lineCap = 'round';
    if (c.clip) { ctx.save(); ctx.beginPath(); ctx.rect(A.x, A.y, A.w, A.h); ctx.clip(); }
    for (const f of snow) {
      const wob = Math.sin(t * 1.3 + f.ph) * 9 * s;
      f.y += f.vy * dt; f.x += (c.wind * s + wob) * dt;
      if (f.y > A.y + A.h + 4) { Object.assign(f, flake(c, false)); }
      if (f.x < A.x - 6) f.x += A.w + 12; else if (f.x > A.x + A.w + 6) f.x -= A.w + 12;
      ctx.globalAlpha = base * f.a;
      if (c.streak) {
        const vx = c.wind * s, vy = f.vy, L = (c.len || 3) * s;
        const n = Math.hypot(vx, vy) || 1;
        ctx.strokeStyle = `rgb(${color})`; ctx.lineWidth = f.r;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - vx / n * L, f.y - vy / n * L); ctx.stroke();
      } else {
        ctx.fillStyle = `rgb(${color})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (c.clip) ctx.restore();
  }

  // ---- puffs: breath, steam, chimney smoke
  function addPuff(x, y, color, a, r0, r1, life, dx, dy) {
    puffs.push({ x, y, color, a, r0, r1, life, age: 0, dx, dy, ph: rnd(0, 6.3) });
  }
  function stepBreath(list, dt) {
    list.forEach((b, i) => {
      breathTimers[i] -= dt;
      if (breathTimers[i] <= 0) {
        breathTimers[i] = rnd(2.6, 4.8);
        const k = b.scale, a = b.color === 'paper' ? .20 : .11;
        addPuff(b.x * W, b.y * H, b.color, a, 4 * k * s, 15 * k * s, 2.4, rnd(-4, 10) * k * s, -14 * k * s);
      }
    });
  }
  function stepSmoke(c, dt) {
    smokeAcc += dt * c.rate;
    while (smokeAcc >= 1) {
      smokeAcc -= 1;
      addPuff(c.x * W + rnd(-c.spread, c.spread) * s * .15, c.y * H, c.color, c.a, c.r[0] * s, c.r[1] * s, c.life, c.drift[0] * s + rnd(-c.spread, c.spread) * s * .3, c.drift[1] * s);
    }
  }
  function drawPuffs(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt;
      if (p.age >= p.life) { puffs.splice(i, 1); continue; }
      const k = p.age / p.life, env = Math.sin(Math.PI * Math.min(1, k * 1.15));
      const r = p.r0 + (p.r1 - p.r0) * k;
      const x = p.x + p.dx * p.age + Math.sin(t * 1.7 + p.ph) * 2 * s, y = p.y + p.dy * p.age;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col(p.color)},${p.a * env})`); g.addColorStop(1, `rgba(${col(p.color)},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    }
  }

  // ---- embers: the only warm light
  function flick(speed, depth) { return 1 - depth + depth * (0.5 + 0.5 * (Math.sin(t * speed) * 0.6 + Math.sin(t * speed * 2.7 + 1) * 0.3 + Math.sin(t * speed * 6.1 + 2) * 0.1)); }
  function drawEmber(e, dt) {
    const f = flick(6, .5), x = e.x * W, y = e.y * H, r = e.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${WARM},${.42 * f})`); g.addColorStop(.45, `rgba(${WARM},${.14 * f})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    if (e.floor) {
      const fl = e.floor, fx = fl.x * W, fy = fl.y * H;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, fl.ry / fl.rx);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, fl.rx * W);
      g2.addColorStop(0, `rgba(${WARM},${.22 * f})`); g2.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, fl.rx * W, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }
  function drawSparks(e, dt) {
    const x = e.x * W, y = e.y * H;
    {
      sparkAcc += dt * 1.6;
      while (sparkAcc >= 1) { sparkAcc -= 1; sparks.push({ x: x + rnd(-6, 6) * s, y: y - 4 * s, vx: rnd(-8, 14) * s, vy: rnd(-28, -14) * s, life: rnd(.8, 1.6), age: 0, ph: rnd(0, 6.3) }); }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.age += dt;
        if (p.age >= p.life) { sparks.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(t * 9 + p.ph) * 10 * s) * dt; p.y += p.vy * dt;
        ctx.globalAlpha = (1 - p.age / p.life) * .8;
        ctx.fillStyle = `rgb(${WARM})`; ctx.fillRect(p.x, p.y, 1.2 * s, 1.2 * s);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- glow: a window, a lantern, a slit of grey light
  function drawGlow(gl) {
    const f = gl.flicker ? flick(4, gl.flicker) : 1, x = gl.x * W, y = gl.y * H, r = gl.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col(gl.color)},${gl.a * f})`); g.addColorStop(1, `rgba(${col(gl.color)},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  }

  // ---- a shaft of light: from a window or a lamp, wider as it falls, soft at the edges.
  // It breathes slowly (clouds over the sun, the lamp flame), and if it comes through a window,
  // now and then a man walks past outside and it dims for a moment.
  function slow(seed) { return .5 + .5 * (Math.sin(t * .23 + seed) * .6 + Math.sin(t * .61 + seed * 2) * .4); }
  function drawBeam(b, dt) {
    let k = b.breathe === false ? 1 : .72 + .28 * slow(b.x * 10);
    if (b.flicker) k *= flick(5, b.flicker);
    if (b.pass) {
      passAt -= dt;
      if (passAt <= 0 && passT < 0) { passT = 0; passAt = rnd(18, 34); }
      if (passT >= 0) { passT += dt; const u = passT / 1.8; if (u >= 1) passT = -1; else k *= 1 - .65 * Math.sin(Math.PI * u); }
    }
    const x = b.x * W, y = b.y * H, w = (b.w || .04) * W, L = b.len * Math.hypot(W, H) * .6;
    const ang = b.angle * Math.PI / 180, half = (b.spread || 20) * Math.PI / 360;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const c = col(b.color || 'paper');
    // three nested passes, narrow to wide, for a soft edge
    for (const [sp, aa] of [[.55, .5], [.8, .3], [1, .2]]) {
      const h1 = half * sp, wide = w / 2 + Math.tan(h1) * L;
      const g = ctx.createLinearGradient(x, y, x + ux * L, y + uy * L);
      g.addColorStop(0, `rgba(${c},${b.a * aa * k})`); g.addColorStop(.6, `rgba(${c},${b.a * aa * k * .45})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + nx * w / 2, y + ny * w / 2);
      ctx.lineTo(x + ux * L + nx * wide, y + uy * L + ny * wide);
      ctx.lineTo(x + ux * L - nx * wide, y + uy * L - ny * wide);
      ctx.lineTo(x - nx * w / 2, y - ny * w / 2);
      ctx.closePath(); ctx.fill();
    }
    // where the shaft lands, a pool of light on the floor or the table
    if (b.land) {
      const lx = b.land.x * W, ly = b.land.y * H, rx = b.land.rx * W, ry = b.land.ry * H;
      ctx.save(); ctx.translate(lx, ly); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(${c},${b.a * .7 * k})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }
  // ---- firelight on everything near it: a wide, warm, flickering spill
  function drawSpill(sp) {
    const f = flick(5.5, .45), x = sp.x * W, y = sp.y * H, r = sp.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${WARM},${sp.a * f})`); g.addColorStop(.5, `rgba(${WARM},${sp.a * .4 * f})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- the dark of a firelit room, breathing against the fire: when it flares, the corners recede
  function drawDark(d) {
    const f = flick(5.5, .45), x = d.x * W, y = d.y * H, r = d.r * W;
    const g = ctx.createRadialGradient(x, y, r * .25, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${INK},${d.a * (1.25 - f * .5)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- a hanging lamp, just out of the picture, swinging a little: its pool of light moves
  function drawPool(p) {
    const sw = Math.sin(t * 2 * Math.PI / (p.period || 7)) * (p.swing || .03);
    const x = (p.x + sw) * W, y = p.y * H, r = p.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (p.shade) { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${INK},${p.a})`); }
    else { g.addColorStop(0, `rgba(${col(p.color || 'paper')},${p.a})`); g.addColorStop(1, `rgba(${col(p.color || 'paper')},0)`); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- cloud shadows drifting over the snow
  function drawClouds(c, dt) {
    for (let i = 0; i < clouds.length; i++) {
      const q = clouds[i];
      q.x += q.v * dt;
      if (q.x - q.r > W) clouds[i] = cloud(c, false);
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, q.sq);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r);
      g.addColorStop(0, `rgba(${INK},${c.a * q.a})`); g.addColorStop(.6, `rgba(${INK},${c.a * q.a * .5})`); g.addColorStop(1, `rgba(${INK},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }

  // ---- searchlight: a slow sweep from the tower
  function drawSweep(sw) {
    const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / sw.period);
    const ang = (sw.a0 + (sw.a1 - sw.a0) * k) * Math.PI / 180, half = sw.spread * Math.PI / 360;
    const x = sw.x * W, y = sw.y * H, L = sw.len * W;
    // over a dark sky the beam is paper light, screened in; over a light sky it is a
    // faint warm overprint, multiplied, the way a second plate would carry it
    const warm = sw.color === 'warm', c = warm ? WARM : PAPER, m = sw.a || 1, a0 = (warm ? .34 : .30) * m, a1 = (warm ? .15 : .11) * m;
    const g = ctx.createRadialGradient(x, y, 0, x, y, L);
    g.addColorStop(0, `rgba(${c},${a0})`); g.addColorStop(.55, `rgba(${c},${a1})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - half) * L, y + Math.sin(ang - half) * L);
    ctx.lineTo(x + Math.cos(ang + half) * L, y + Math.sin(ang + half) * L);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---- dust in a shaft of light
  function drawMotes(dt) {
    const [rx, ry, rw, rh] = cfg.motes.region;
    ctx.fillStyle = `rgb(${PAPER})`;
    for (const m of motes) {
      m.vx += rnd(-6, 6) * dt; m.vy += rnd(-6, 6) * dt;
      m.vx *= .98; m.vy *= .98;
      m.x += m.vx * s * dt; m.y += (m.vy + 1.5) * s * dt;
      if (m.x < rx * W) m.x = (rx + rw) * W; if (m.x > (rx + rw) * W) m.x = rx * W;
      if (m.y > (ry + rh) * H) m.y = ry * H; if (m.y < ry * H) m.y = (ry + rh) * H;
      ctx.globalAlpha = .18 + .14 * Math.sin(t * 2 + m.ph);
      ctx.fillRect(m.x, m.y, 1.1 * s, 1.1 * s);
    }
    ctx.globalAlpha = 1;
  }

  // ---- film grain, barely there
  function drawGrain(now) {
    if (now - grainAt > 90) { grainAt = now; grainIdx = (grainIdx + 1) % grain.length; }
    ctx.save(); ctx.globalAlpha = .18;
    ctx.fillStyle = ctx.createPattern(grain[grainIdx], 'repeat');
    ctx.translate((grainIdx * 37) % 160, (grainIdx * 53) % 160);
    ctx.fillRect(-160, -160, W + 320, H + 320); ctx.restore();
  }

  // where the eye goes in this picture: the first effect placed by hand on it (fire, lamp, window, tower)
  function focusOf(key) {
    const c = configFor(key);
    const e = c.ember || (c.glow && c.glow[0]) || c.sweep || c.smoke || (c.breath && c.breath[0]);
    return e ? [e.x, e.y] : null;
  }
  return { mount, set, resize, focusOf, state: () => ({ name, cfg: !!cfg, running: !!raf, W, H, snow: snow.length, puffs: puffs.length, t: Math.round(t) }) };
})();
window.FX = FX;
