'use strict';
// Frames: the linocut stills. Two layers crossfade; a frame that is not drawn yet shows its stand-in;
// the living overlay (fx.js) follows whichever picture is actually on screen.
// Over the winter a place is seen from different angles: each frame moves to another of its
// drawings every day. The page tints the prints by month, and darkens them as the body fails.
// With WebGL the print itself is drawn by glframe.js (ink boil, parallax); the <img> layers stay as the fallback.
const FRAME = (() => {
  const box = document.getElementById('frame');
  const stage = box.querySelector('.stage');
  const layers = [...stage.querySelectorAll('img')];
  let front = 0, wanted = null, shown = null, force = null;
  const missing = {};
  if (window.FX) FX.mount(stage);
  const living = GLFRAME.mount(stage);     // the WebGL print; without it, the plain <img> layers show
  if (living) box.classList.add('living');

  // Motion loops: a few drawings may also exist as short looping films (assets/frames/motion/<key>.mp4,
  // listed in list.json). When the camera shows that exact drawing, the film plays over the print.
  let MOTION = new Set();
  fetch('assets/frames/motion/list.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(l => { MOTION = new Set(l); if (shown) loop(shown); }).catch(() => {});
  const film = document.createElement('video');
  film.id = 'loop'; film.muted = true; film.loop = true; film.playsInline = true; film.preload = 'auto';
  stage.insertBefore(film, stage.querySelector('#fx'));
  function loop(key) {
    const want = MOTION.has(key) && !still() ? `assets/frames/motion/${key}.mp4` : null;
    if (!want) { film.classList.remove('on'); setTimeout(() => { if (!film.classList.contains('on')) film.pause(); }, 1200); return; }
    if (!film.src.endsWith(want)) { film.src = want; film.currentTime = 0; }
    film.play().then(() => film.classList.add('on')).catch(() => film.classList.remove('on'));
  }

  // which drawing of this place today; the same all day, a different one every ASSETS.every days
  function variantOf(name) {
    const v = ASSETS.variants[name];
    if (!v || ASSETS.fixed.includes(name)) return null;
    if (force !== null) return v.all.includes(force) ? force : v.selected;
    const day = (typeof S !== 'undefined' && S && S.day) || 1;
    if (day === 1 || v.all.length < 2) return v.selected;          // the first day shows the masters
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const order = [v.selected, ...v.all.filter(k => k !== v.selected)];
    return order[(Math.floor((day - 1) / ASSETS.every) + h) % order.length];
  }
  function sources(name) {
    const out = [];
    const v = variantOf(name);
    const sel = ASSETS.variants[name] && ASSETS.variants[name].selected;
    if (v !== null && v !== sel) out.push([`${name}-0${v}`, `assets/frames/web/variants/${name}-0${v}.jpg`, false]);
    const names = [name];
    if (ASSETS.fallback[name]) names.push(ASSETS.fallback[name]);
    for (const n of names.filter(n => !missing[n])) out.push([n, `assets/frames/web/${n}.jpg`, false], [n, `assets/frames/${n}.png`, true]);
    return out;
  }
  function put(key, src) {
    if (shown === key) return;
    shown = key;
    const back = layers[1 - front];
    back.src = src;
    const swap = () => {
      if (wanted === null) return;
      back.classList.add('on');
      layers[front].classList.remove('on');
      front = 1 - front;
      if (window.FX) FX.set(key);
    };
    if (living) GLFRAME.show(key, src);
    loop(key);
    focus = (ASSETS.focus && ASSETS.focus[key]) || (window.FX && FX.focusOf(key)) || null;
    if (back.decode) back.decode().then(swap, swap); else swap();
  }
  // ---------- the camera ----------
  // A slow, continuous pan and zoom over the print, like a camera held by someone patient. It runs here,
  // frame by frame, so the living print (glframe.js) knows exactly where it is and can show depth.
  // Each scene has a point of interest (the stove door, Lev at his desk, the walker on the ice): a new
  // picture begins with a slow push towards it, and after that the camera alternates between close on it
  // and wide. Moves blend from wherever the camera is, so it never jumps, and it never shows an edge.
  const still = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || /[?&]still\b/.test(location.search);
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const cam = { s: 1.04, x: 0, y: 0 };
  let move = null, close = false, focus = null;
  const room = s => (s - 1) / (2 * s) * 100 * .92;      // how far it can pan at this zoom, in %
  // gentle: the print should feel held, not moved. A push of a few percent towards the subject, then
  // an even slower settle back; light and weather (fx.js) carry the life of the picture.
  function target(near) {
    const s = near ? 1.06 + Math.random() * .015 : 1.035 + Math.random() * .01;
    const m = room(s) * .6;
    let x, y;
    if (focus && near) { x = (.5 - focus[0]) * 100; y = (.5 - focus[1]) * 100; }      // bring the subject towards the middle
    else if (focus) { x = (.5 - focus[0]) * 30 + (Math.random() - .5) * m; y = (Math.random() - .5) * m * .5; }
    else { x = -Math.sign(cam.x || (Math.random() - .5)) * m * (.55 + Math.random() * .45); y = (Math.random() * 2 - 1) * m * .6; }
    return { s, x: clamp(x, -m, m), y: clamp(y, -m * .9, m * .9) };
  }
  function aim(opening) {
    if (still()) { move = null; Object.assign(cam, { s: 1.04, x: 0, y: 0 }); apply(); return; }
    close = opening ? true : !close;
    const to = target(close);
    const secs = opening ? 26 + Math.random() * 6 : 32 + Math.random() * 10;
    move = { from: { ...cam }, to, t0: performance.now(), ms: secs * 1000 };
  }
  function apply() {
    stage.style.transform = `scale(${cam.s.toFixed(4)}) translate(${cam.x.toFixed(3)}%, ${cam.y.toFixed(3)}%)`;
  }
  let last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 15) return;
    last = now;
    step(now);
  }
  function step(now) {
    if (move) {
      const k = Math.min(1, (now - move.t0) / move.ms), e = ease(k);
      for (const p of ['s', 'x', 'y']) cam[p] = move.from[p] + (move.to[p] - move.from[p]) * e;
      if (k >= 1) aim(false);
      apply();
    }
    GLFRAME.draw(cam, now);
  }
  // after the page has been in the background, start a fresh move from where the camera is
  document.addEventListener('visibilitychange', () => { if (!document.hidden) aim(false); });

  function set(name) {
    if (!name) return;
    const key = name + '@' + variantOf(name);
    if (key === wanted) return;
    wanted = key;
    setTimeout(() => aim(true), 60);   // after the picture's subject is known
    const list = sources(name);
    (function next(i) {
      if (wanted !== key || i >= list.length) return;
      const [k, src, last] = list[i];
      const probe = new Image();
      probe.onload = () => { if (wanted === key) put(k, src); };
      probe.onerror = () => { if (last) missing[k] = true; next(i + 1); };
      probe.src = src;
    })(0);
  }
  // the month and the body, on the print
  const TINT = ['jan', 'feb', 'mar', 'apr', 'may'];
  function mood(day, strength) {
    box.dataset.month = TINT[Math.min(4, monthOf(day))];
    box.style.setProperty('--weak', clamp((45 - strength) / 40, 0, 1).toFixed(2));
  }
  aim(false);
  requestAnimationFrame(tick);
  return { set, mood, aim, step, cam: () => ({ ...cam }), move: () => move && { ...move }, shown: () => shown, variant: v => { force = v; wanted = null; } };
})();
