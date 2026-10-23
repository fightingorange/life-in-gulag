'use strict';
// Living stills: light canvas overlays on the frames. Snow, breath, smoke, embers,
// a searchlight sweep, dust in a shaft of light, and film grain. Everything is drawn
// in the print's own two inks (paper and black) except the embers, which are the
// only warm thing in the game. Positions are normalized to the frame (0..1).
const FX = (() => {
  const PAPER = '235,226,202', INK = '27,24,19', WARM = '214,160,90';
  const col = c => c === 'paper' ? PAPER : c === 'warm' ? WARM : INK;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const B = (x, y, color, scale) => ({ x, y, color: color || 'paper', scale: scale || 1 });
  const CONF = {
    title:       { snow: { n: 40, color: 'ink', wind: 35, speed: [18, 40], size: [.6, 1.3], streak: true } },
    hut_morning: { motes: { n: 14, region: [.55, .3, .4, .5] }, glow: [{ x: .727, y: .45, r: .09, color: 'paper', a: .10, flicker: .3 }] },
    count:       { snow: { n: 160, color: 'paper', wind: -45, speed: [35, 80], size: [.7, 1.9] },
                   breath: [B(.36, .62, 'paper', .8), B(.44, .62, 'paper', .8), B(.51, .62, 'paper', .8), B(.575, .62, 'paper', .8), B(.635, .62, 'paper', .8)],
                   glow: [{ x: .505, y: .525, r: .025, color: 'warm', a: .35, flicker: .6 }] },
    table:       { smoke: { x: .47, y: .30, color: 'ink', a: .08, r: [8, 26], life: 3, rate: .8, drift: [6, -22], spread: 30 } },
    site:        { snow: { n: 50, color: 'ink', wind: 25, speed: [15, 35], size: [.6, 1.2], streak: true },
                   smoke: { x: .92, y: .215, color: 'ink', a: .10, r: [6, 30], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 } },
    noon:        { snow: { n: 90, color: 'ink', wind: 70, speed: [35, 60], size: [.7, 1.5], streak: true },
                   ember: { x: .53, y: .775, r: .07, sparks: true },
                   smoke: { x: .53, y: .72, color: 'ink', a: .07, r: [8, 34], life: 4, rate: 1, drift: [18, -30], spread: 14 },
                   breath: [B(.375, .56, 'ink', .7), B(.625, .585, 'ink', .7)] },
    gate:        { snow: { n: 60, color: 'ink', wind: 20, speed: [18, 40], size: [.6, 1.3], streak: true },
                   sweep: { x: .835, y: .135, a0: 135, a1: 200, period: 11, len: .9, spread: 14, color: 'warm' } },
    hut_night:   { ember: { x: .73, y: .60, r: .05, floor: { x: .73, y: .735, rx: .12, ry: .03 } },
                   breath: [B(.235, .465, 'paper', .6)], motes: { n: 10, region: [.55, .35, .4, .4] } },
    cells:       { motes: { n: 16, region: [.44, .28, .12, .6] }, glow: [{ x: .50, y: .27, r: .05, color: 'paper', a: .08, flicker: .15 }] },
    wire:        { snow: { n: 70, color: 'paper', wind: -25, speed: [20, 45], size: [.6, 1.6] },
                   sweep: { x: .795, y: .52, a0: 185, a1: 235, period: 14, len: 1.0, spread: 9 } },
    river:       { snow: { n: 30, color: 'ink', wind: 40, speed: [12, 30], size: [.5, 1.1], streak: true },
                   smoke: { x: .82, y: .29, color: 'ink', a: .07, r: [4, 16], life: 5, rate: 1.4, drift: [30, -6], spread: 6 },
                   breath: [B(.31, .40, 'ink', .35)] },
    dead:        { motes: { n: 8, region: [.7, .2, .28, .6] }, glow: [{ x: .875, y: .215, r: .07, color: 'paper', a: .07, flicker: .1 }] },
    // the second set
    stove:       { ember: { x: .366, y: .545, r: .07, floor: { x: .40, y: .67, rx: .16, ry: .035 } },
                   motes: { n: 10, region: [.28, .3, .3, .35] } },
    blizzard:    { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.64, .225, .167, .305] },
                   glow: [{ x: .725, y: .38, r: .12, color: 'paper', a: .07, flicker: .2 }] },
    letter:      { motes: { n: 14, region: [.05, .08, .4, .5] }, glow: [{ x: .14, y: .06, r: .26, color: 'paper', a: .08, flicker: .05 }] },
    office:      { glow: [{ x: .34, y: .30, r: .2, color: 'warm', a: .12, flicker: .12 }], motes: { n: 10, region: [.28, .2, .2, .2] } },
    easter:      { ember: { x: .852, y: .62, r: .05, floor: { x: .83, y: .73, rx: .12, ry: .035 } } },
    inspection:  { snow: { n: 40, color: 'ink', wind: 25, speed: [14, 32], size: [.5, 1.1], streak: true },
                   breath: [B(.565, .25, 'ink', .45), B(.635, .25, 'ink', .45), B(.675, .25, 'ink', .45), B(.735, .27, 'ink', .45), B(.785, .22, 'ink', .45)] },
    ice_out:     { snow: { n: 25, color: 'ink', wind: 55, speed: [10, 24], size: [.5, 1], streak: true },
                   smoke: { x: .76, y: .23, color: 'ink', a: .06, r: [4, 14], life: 5, rate: 1.2, drift: [26, -5], spread: 6 } },
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
  let snow = [], puffs = [], sparks = [], motes = [], breathTimers = [], smokeAcc = 0, sparkAcc = 0;
  let raf = null, last = 0, t = 0, grain = [], grainIdx = 0, grainAt = 0;

  function mount(frameBox) {
    box = frameBox;
    canvas = document.createElement('canvas');
    canvas.id = 'fx';
    box.appendChild(canvas);
    ctx = canvas.getContext('2d');
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
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  }
  // the area snow falls in: the whole frame, or a clip region such as a window
  function area(c) { const [x, y, w, h] = c.clip || [0, 0, 1, 1]; return { x: x * W, y: y * H, w: w * W, h: h * H }; }
  function flake(c, anywhere) {
    const A = area(c);
    return { x: A.x + Math.random() * A.w, y: anywhere ? A.y + Math.random() * A.h : A.y - 4, vy: rnd(c.speed[0], c.speed[1]) * s, r: rnd(c.size[0], c.size[1]) * s, ph: rnd(0, 6.3), a: rnd(.5, 1) };
  }

  // A variant drawing ("noon-03") uses its own entry if there is one (merged over the master's);
  // otherwise it keeps only what does not depend on where things are in the picture.
  const PLACED = ['ember', 'glow', 'breath', 'sweep', 'smoke'];
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
    if (cfg) { resize(); start(); } else { stop(); if (ctx) ctx.clearRect(0, 0, W, H); }
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    let dt = (now - last) / 1000;
    if (dt < 1 / 32) return;           // ~30 fps is plenty for a print
    last = now; dt = Math.min(dt, .1); t += dt;
    if (!cfg || !W) return;
    ctx.clearRect(0, 0, W, H);
    if (cfg.sweep) drawSweep(cfg.sweep);
    if (cfg.glow) cfg.glow.forEach(drawGlow);
    if (cfg.ember) drawEmber(cfg.ember, dt);
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
    g.addColorStop(0, `rgba(${WARM},${.22 * f})`); g.addColorStop(.5, `rgba(${WARM},${.08 * f})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    if (e.floor) {
      const fl = e.floor, fx = fl.x * W, fy = fl.y * H;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, fl.ry / fl.rx);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, fl.rx * W);
      g2.addColorStop(0, `rgba(${WARM},${.10 * f})`); g2.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, fl.rx * W, 0, 6.3); ctx.fill(); ctx.restore();
    }
    if (e.sparks) {
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

  // ---- searchlight: a slow sweep from the tower
  function drawSweep(sw) {
    const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / sw.period);
    const ang = (sw.a0 + (sw.a1 - sw.a0) * k) * Math.PI / 180, half = sw.spread * Math.PI / 360;
    const x = sw.x * W, y = sw.y * H, L = sw.len * W;
    // over a dark sky the beam is paper light, screened in; over a light sky it is a
    // faint warm overprint, multiplied, the way a second plate would carry it
    const warm = sw.color === 'warm', c = warm ? WARM : PAPER, a0 = warm ? .34 : .30, a1 = warm ? .15 : .11;
    const g = ctx.createRadialGradient(x, y, 0, x, y, L);
    g.addColorStop(0, `rgba(${c},${a0})`); g.addColorStop(.55, `rgba(${c},${a1})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.save(); ctx.globalCompositeOperation = warm ? 'multiply' : 'screen'; ctx.fillStyle = g;
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

  return { mount, set, resize, state: () => ({ name, cfg: !!cfg, running: !!raf, W, H, snow: snow.length, puffs: puffs.length, t: Math.round(t) }) };
})();
window.FX = FX;
