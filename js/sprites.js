'use strict';
// Moving figures. Some pictures are composited: a background plate (the place without its people) and
// cut-out figures, drawn on plain paper, that move over it. The figures are laid on with multiply, so
// their paper disappears and only the ink stays, as if printed on the plate. They sit above the print
// and below the light and shade (fx.js), so the weather and the light fall on them too.
//
// Figures are drawn only when the picture on screen is the plate itself: if the plate is not drawn yet,
// frames.js shows a stand-in, its key is not the plate's, and nothing moves over it.
//
// CONF: { <plate key>: [figure, ...] }, a figure being
//   img     'name' or ['name', 'name2', ...]: assets/frames/figures/<name>.png; several drawings are
//           cycled (two poses of men hauling), one every `every` seconds (default .6)
//   w       width as a fraction of the frame's width (the height follows the drawing)
//   anchor  [ax, ay]: the point of the drawing that walks the path, as fractions of it (default [.5, 1], the feet)
//   path    [[x, y], ...]: where the anchor goes, as fractions of the frame (one point: it stays there)
//   secs    how long the path takes; ease 'inout' (default), 'linear', 'in', 'out'
//   loop    true: when it gets there it fades out, waits `rest` seconds and starts again (fade: seconds, default 1.5);
//           false: it gets there and holds
//   delay   seconds before it first moves (it waits at the start)
//   bob     how far it dips with each step (fraction of the frame's height); step: steps a second (default 1)
//   sway    how far it rocks with each step, in degrees, about the anchor
//   scale   [s0, s1]: its size along the path (going away up the bank: [1, .9])
//   flip    true: mirrored
//   sfx     a sound (assets/sfx/<name>.mp3) played each time it starts moving; skipped if the file is missing
const SPRITES = (() => {
  const CONF = {
    // The working example, built from site_timber_1: the two men and their log cut out of the drawing,
    // the plate patched with snow. Open ?test&frame=test_timber_plate to see it. Not used by the game.
    test_timber_plate: [
      // drawn where they stand at the middle of the path (.506, .798); they come up from lower down the bank
      { img: 'test_haulers', w: .4862, anchor: [.5, 1], path: [[.44, .835], [.5063, .7981], [.56, .768]], secs: 30, ease: 'linear',
        loop: true, rest: 3, fade: 2.5, bob: .003, step: .8, sway: .4, scale: [1.03, .97], sfx: 'log_drag' },
    ],
  };

  const reduced = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]still\b/.test(location.search);
  const EASE = {
    linear: k => k,
    in: k => k * k,
    out: k => 1 - (1 - k) * (1 - k),
    inout: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
  };
  let stage = null, canvas = null, g = null, W = 0, H = 0, dpr = 1;
  let key = null, figs = [], t = 0, raf = null, last = 0;
  const cache = {}, sounds = {};

  function mount() {
    if (canvas) return true;
    stage = document.querySelector('#frame .stage');
    if (!stage) return false;
    canvas = document.createElement('canvas');
    canvas.id = 'sprites';
    g = canvas.getContext('2d');
    place();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (figs.length) start(); });
    resize();
    return true;
  }
  // above the print (and its twin), below fx.js's layers
  function place() {
    const before = stage.querySelector('#fx-cut') || stage.querySelector('#fx-shade') || stage.querySelector('#fx');
    if (canvas.nextSibling !== before || canvas.parentNode !== stage) stage.insertBefore(canvas, before);
  }
  function resize() {
    if (!stage || !stage.clientWidth) return;
    W = stage.clientWidth; H = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }

  // A figure drawn on cream paper is levelled so its paper is pure white (white does nothing under
  // multiply), with a soft knee so the grain of the paper goes too, and its edges fade to white so the
  // edge of the drawing never shows. If the page is opened from disk the pixels cannot be read, and
  // the drawing is used as it is.
  function load(name) {
    if (cache[name]) return cache[name];
    const rec = cache[name] = { name, ready: false, failed: false, el: null, w: 0, h: 0 };
    const im = new Image();
    im.onload = () => { rec.el = level(im); rec.w = im.naturalWidth; rec.h = im.naturalHeight; rec.ready = true; draw(); };
    im.onerror = () => { rec.failed = true; };
    im.src = `assets/frames/figures/${name}.png`;
    return rec;
  }
  function level(im) {
    const c = document.createElement('canvas'), w = c.width = im.naturalWidth, h = c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    let d;
    try { d = x.getImageData(0, 0, w, h); } catch (e) { return im; }
    const p = d.data, hist = new Uint32Array(256);
    for (let i = 0; i < p.length; i += 4) hist[(p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) | 0]++;
    let n = 0, cut = 255;                       // the paper: the brightest sixth of the drawing
    for (let v = 255; v >= 0; v--) { n += hist[v]; if (n > p.length / 4 / 6) { cut = v; break; } }
    let r = 0, gg = 0, b = 0, m = 0;
    for (let i = 0; i < p.length; i += 4) {
      const l = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      if (l >= cut - 4) { r += p[i]; gg += p[i + 1]; b += p[i + 2]; m++; }
    }
    const pr = r / m || 255, pg = gg / m || 255, pb = b / m || 255;
    const edge = Math.max(4, Math.round(Math.min(w, h) * .04));
    for (let y = 0, i = 0; y < h; y++) for (let xx = 0; xx < w; xx++, i += 4) {
      let R = Math.min(255, p[i] * 255 / pr), G = Math.min(255, p[i + 1] * 255 / pg), B = Math.min(255, p[i + 2] * 255 / pb);
      const l = R * .3 + G * .59 + B * .11;
      let k = l > 200 ? Math.min(1, (l - 200) / 45) : 0;                  // the knee: near-paper goes to white
      const e = Math.min(xx, y, w - 1 - xx, h - 1 - y);
      if (e < edge) k = Math.max(k, 1 - e / edge);                         // the edges fade out
      p[i] = R + (255 - R) * k; p[i + 1] = G + (255 - G) * k; p[i + 2] = B + (255 - B) * k; p[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  function sound(name) {
    if (!name || !window.AUDIO || reduced()) return;
    if (sounds[name] === false) return;
    const play = () => { try { AUDIO.snd(name); } catch (e) {} };
    if (sounds[name] === true) return play();
    fetch(`assets/sfx/${name}.mp3`, { method: 'HEAD', cache: 'no-cache' })
      .then(r => { sounds[name] = r.ok; if (r.ok) play(); })
      .catch(() => { sounds[name] = false; });
  }

  function set(k) {
    if (!mount()) return;
    place();
    if (k === key) return;
    key = k;
    const conf = (k && CONF[k]) || null;
    figs = conf ? conf.map(f => ({ f, imgs: [].concat(f.img).map(load), runs: -1 })) : [];
    t = 0;
    if (figs.length) { canvas.classList.add('on'); draw(); if (!reduced()) start(); else stop(); }
    else { canvas.classList.remove('on'); stop(); setTimeout(() => { if (!figs.length) g.clearRect(0, 0, canvas.width, canvas.height); }, 1200); }
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = (now - last) / 1000;
    if (dt < 1 / 32) return;
    last = now; t += Math.min(dt, .1);
    draw();
  }

  // where a figure is at time t: how far along its path (k, 0..1), how visible, and whether it moves
  function phase(f, tt) {
    const delay = f.delay || 0, secs = f.secs || 10;
    if (reduced() || tt < delay) return { k: 0, a: 1, run: -1, moving: false };
    const u = tt - delay;
    if (!f.loop) return { k: Math.min(1, u / secs), a: 1, run: 0, moving: u < secs };
    const fade = f.fade === undefined ? 1.5 : f.fade, rest = f.rest || 0, cycle = secs + rest;
    const run = Math.floor(u / cycle), v = u - run * cycle;
    if (v >= secs) return { k: 1, a: 0, run, moving: false };          // gone, waiting to come round again
    const a = Math.min(1, fade ? v / fade : 1, fade ? (secs - v) / fade : 1);
    return { k: v / secs, a, run, moving: true };
  }
  function along(path, k) {
    if (path.length === 1) return path[0];
    const seg = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) { const l = Math.hypot((path[i][0] - path[i - 1][0]) * 16, (path[i][1] - path[i - 1][1]) * 9); seg.push(l); total += l; }
    let d = k * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) {
        const u = seg[i] ? Math.min(1, d / seg[i]) : 0, a = path[i], b = path[i + 1];
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      }
      d -= seg[i];
    }
    return path[path.length - 1];
  }
  function draw() {
    if (!g || !W) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'multiply';        // figures overlapping each other: ink on ink
    for (const F of figs) {
      const f = F.f, ph = phase(f, t);
      if (ph.run !== F.runs && ph.moving) { F.runs = ph.run; sound(f.sfx); }
      if (ph.a <= 0) continue;
      const imgs = F.imgs.filter(r => r.ready);
      if (!imgs.length) continue;
      const rec = imgs.length > 1 ? imgs[Math.floor(t / (f.every || .6)) % imgs.length] : imgs[0];
      const k = (EASE[f.ease] || EASE.inout)(ph.k);
      const [px, py] = along(f.path, k);
      const sc = f.scale ? f.scale[0] + (f.scale[1] - f.scale[0]) * k : 1;
      const w = (f.w || .2) * W * sc, h = w * rec.h / rec.w;
      const [ax, ay] = f.anchor || [.5, 1];
      const walk = ph.moving ? t * (f.step || 1) : 0;
      const bob = f.bob ? -Math.abs(Math.sin(Math.PI * walk)) * f.bob * H : 0;
      const rot = f.sway ? Math.sin(Math.PI * walk) * f.sway * Math.PI / 180 : 0;
      g.save();
      g.globalAlpha = ph.a;
      g.translate(px * W, py * H + bob);
      if (rot) g.rotate(rot);
      if (f.flip) g.scale(-1, 1);
      g.drawImage(rec.el, -ax * w, -ay * h, w, h);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // for looking at it without waiting: at(seconds) shows the figures as they are that long after the
  // plate appeared, and stops the clock
  function at(secs) { stop(); t = secs; draw(); }
  function advance(secs) { at(t + secs); }

  return { set, at, advance, conf: CONF, state: () => ({ key, figures: figs.length, ready: figs.map(F => F.imgs.map(r => r.ready)), t: +t.toFixed(2), running: !!raf }) };
})();
window.SPRITES = SPRITES;
