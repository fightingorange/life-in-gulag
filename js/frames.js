'use strict';
// Frames: the linocut stills. Two layers crossfade; a frame that is not drawn yet shows its stand-in;
// the living overlay (fx.js) and the moving figures (sprites.js) follow whichever picture is actually on screen.
// Over the winter a place is seen from different angles: each frame moves to another of its
// drawings every day. The page tints the prints by month, and darkens them as the body fails.
// A screen can also run a short sequence of pictures (ASSETS.sequences), and each picture has its own
// camera move (ASSETS.cams).
// With WebGL the print itself is drawn by glframe.js (ink boil, parallax); the <img> layers stay as the fallback.
const FRAME = (() => {
  const box = document.getElementById('frame');
  const stage = box.querySelector('.stage');
  const layers = [...stage.querySelectorAll('img')];
  let front = 0, wanted = null, shown = null, force = null, gen = 0, putId = 0;
  const missing = {};
  if (window.FX) FX.mount(stage);
  const living = GLFRAME.mount(stage);     // the WebGL print; without it, the plain <img> layers show
  if (living) box.classList.add('living');
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const frozen = () => /[?&]still\b/.test(location.search);          // the test link: no animation at all
  const still = () => reduced() || frozen();                          // no camera movement

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
    for (let n = ASSETS.fallback[name]; n && !names.includes(n); n = ASSETS.fallback[n]) names.push(n);
    for (const n of names.filter(n => !missing[n])) out.push([n, `assets/frames/web/${n}.jpg`, false], [n, `assets/frames/${n}.png`, true]);
    return out;
  }
  // which picture a frame name will actually show today: [key, src], or null if nothing loads.
  // Remembered, so a sequence knows at once whether its steps are different pictures.
  const resolved = {};
  function resolve(name) {
    const id = name + '@' + variantOf(name);
    if (resolved[id]) return resolved[id];
    const list = sources(name);
    return resolved[id] = new Promise(done => (function next(i) {
      if (i >= list.length) { delete resolved[id]; return done(null); }
      const [k, src, last] = list[i];
      const probe = new Image();
      probe.onload = () => done([k, src]);
      probe.onerror = () => { if (last) missing[k] = true; next(i + 1); };
      probe.src = src;
    })(0));
  }
  function put(key, src, fade) {
    if (shown === key) return;
    shown = key;
    const id = ++putId;
    stage.style.setProperty('--fade', (fade || 1.1) + 's');
    const back = layers[1 - front];
    back.src = src;
    const swap = () => {
      if (id !== putId) return;          // a newer picture was asked for while this one decoded
      back.classList.add('on');
      layers[front].classList.remove('on');
      front = 1 - front;
      if (window.FX) FX.set(key);
      if (window.SPRITES) SPRITES.set(key);
    };
    if (living) GLFRAME.show(key, src);
    loop(key);
    alternate(key, src);
    if (back.decode) back.decode().then(swap, swap); else swap();
  }
  // ---------- two-picture motion ----------
  // If a picture has a twin that differs only in a hand or a spoon (ASSETS.alternate), the page fades
  // slowly to the twin and back, holding each a few seconds, so the hand seems to move.
  let altTimer = null;
  function alternate(key, src) {
    clearTimeout(altTimer);
    stage.classList.remove('alt');
    const twin = ASSETS.alternate && ASSETS.alternate[key];
    let el = stage.querySelector('img.twin');
    if (!twin || still()) { if (el) el.classList.remove('on'); return; }
    const tsrc = `assets/frames/web/${twin}.jpg`;
    const probe = new Image();
    probe.onload = () => {
      if (shown !== key) return;
      if (!el) { el = document.createElement('img'); el.className = 'twin'; el.alt = ''; stage.insertBefore(el, stage.querySelector('#fx-shade')); }
      el.src = tsrc;
      let up = false;
      const flip = () => { if (shown !== key) { el.classList.remove('on'); return; } up = !up; el.classList.toggle('on', up); altTimer = setTimeout(flip, (up ? 2.2 : 3.5 + Math.random() * 3) * 1000); };
      altTimer = setTimeout(flip, 2500);
    };
    probe.src = tsrc;
  }

  // ---------- the camera ----------
  // Each picture has a named move (ASSETS.cams, or the screen's o.cam): a slow, smooth loop that fits
  // what the man is doing. A move is a pose for every moment (zoom s, pan x and y in % of the print);
  // a new move blends from wherever the camera is over several seconds, so it never jumps, and every
  // pose stays inside room(), so the camera never shows an edge of the print.
  // It runs here, frame by frame, so the living print (glframe.js) knows exactly where it is.
  const cam = { s: 1.04, x: 0, y: 0 };
  const room = s => (s - 1) / (2 * s) * 100 * .92;      // how far it can pan at this zoom, in %
  const smooth = k => (k = clamp(k, 0, 1), k * k * k * (k * (k * 6 - 15) + 10));   // eases in and out, no kinks
  const wave = (t, period, phase = 0) => Math.sin(2 * Math.PI * t / period + phase);
  // a closed loop of segments [seconds, from, to]: a level 0..1 that moves smoothly and holds
  function cycle(t, segs) {
    const total = segs.reduce((a, g) => a + g[0], 0);
    let u = ((t % total) + total) % total;
    for (const [d, a, b] of segs) { if (u < d) return a + (b - a) * smooth(u / d); u -= d; }
    return segs[segs.length - 1][2];
  }
  // a pan that brings the subject (f, fractions of the print) amt of the way to the middle, softly
  // limited so that `spare` % of room is left for the move's small motions
  function toward(f, amt, s, spare) {
    const lim = Math.max(0, room(s) - spare);
    const soft = v => lim ? lim * Math.tanh(v / lim) : 0;
    return f ? { x: soft((.5 - f[0]) * 100 * amt), y: soft((.5 - f[1]) * 100 * amt) } : { x: 0, y: 0 };
  }
  // the moves: (t seconds since the move began, f the subject or null, ph a random phase) -> pose
  const LEAN = [[2.5, 0, 0], [12, 0, 1], [6, 1, 1], [12, 1, 0], [5.5, 0, 0]];   // in over the bowl, eat, straighten
  const LOOK = [[22, 0, 1], [24, 1, 1], [22, 1, 0], [8, 0, 0]];                 // push in, hold, ease back
  const WALK = [[34, 0, 1], [6, 1, 1], [36, 1, 0], [4, 0, 0]];                  // drift forward, and back very slowly
  const WORK = [[2.5, 0, 1], [13, 1, 1], [2.5, 1, 0], [6, 0, 0]];               // strokes, then a rest
  const MOVES = {
    still: (t, f, ph) => ({ s: 1.032 + .003 * wave(t, 37, ph), x: .2 * wave(t, 53, ph * 2), y: .12 * wave(t, 43, ph * 3) }),
    stand: (t, f, ph) => {
      const s = 1.046 + .0025 * wave(t, 5.2), c = toward(f, .25, s, .5);
      return { s, x: c.x + .35 * wave(t, 11, ph), y: c.y + .12 * wave(t, 5.2, .8) };
    },
    lean: (t, f, ph) => {
      const k = cycle(t, LEAN), s = 1.035 + .06 * k + .002 * wave(t, 5, ph), c = toward(f, .1 + .65 * k, s, .3);
      return { s, x: c.x + .12 * wave(t, 13, ph), y: c.y + .1 * wave(t, 5, ph + .8) };
    },
    look: (t, f, ph) => {
      const k = cycle(t, LOOK), s = 1.04 + .05 * k + .0015 * wave(t, 6, ph), c = toward(f, .2 + .6 * k, s, .3);
      return { s, x: c.x + .15 * wave(t, 29, ph), y: c.y + .1 * wave(t, 23, ph + 1) };
    },
    walk: (t, f, ph) => {
      const k = cycle(t, WALK), s = 1.035 + .055 * k, c = toward(f, .5 * k, s, .45);
      return { s, x: c.x + .3 * wave(t, 3.4, ph), y: c.y + .1 * wave(t, 1.7, ph) };
    },
    work: (t, f, ph) => {
      const e = cycle(t, WORK), stroke = e * (1 - Math.cos(2 * Math.PI * t / 3.2)) / 2;
      const s = 1.05 + .004 * stroke, c = toward(f, .3, 1.05, .7);
      return { s, x: c.x + .45 * wave(t, 41, ph), y: c.y - .25 * stroke };
    },
  };
  // which move a frame name uses: its own, then its stand-in's, then 'look'
  function camFor(name) {
    for (let n = name, i = 0; n && i < 12; n = ASSETS.fallback[n], i++) if (ASSETS.cams && ASSETS.cams[n]) return ASSETS.cams[n];
    const base = String(name).replace(/_\w+$/, '');      // site_power_2 -> site
    return (ASSETS.cams && ASSETS.cams[base]) || 'look';
  }
  // where the eye goes in the picture on screen: placed by hand, or the fire or the lamp (fx.js)
  function focusFor(key, name) {
    const base = key && key.replace(/-0\d$/, '');
    return (ASSETS.focus && (ASSETS.focus[key] || (key === base && ASSETS.focus[base])))
      || (key && window.FX && FX.focusOf(key))
      || (ASSETS.focus && (ASSETS.focus[base] || ASSETS.focus[name])) || null;
  }
  const BLEND = 7000;   // ms from one move into the next
  let mv = null, clock = performance.now(), manual = false, lastNow = 0, camWanted = null;
  function poseOf(m, now) {
    if (m.fixed) return m.fixed;
    const p = MOVES[m.name]((now - m.t0) / 1000, m.focus, m.ph);
    const r = room(p.s);
    p.x = clamp(p.x, -r, r); p.y = clamp(p.y, -r, r);
    if (m.prev) {
      const k = (now - m.t0) / BLEND;
      if (k >= 1) m.prev = null;
      else { const q = poseOf(m.prev, now), e = smooth(k); for (const a of ['s', 'x', 'y']) p[a] = q[a] + (p[a] - q[a]) * e; }
    }
    return p;
  }
  function begin(name, focus) {
    if (!MOVES[name]) name = 'look';
    if (still()) { mv = { name, fixed: { s: 1.04, x: 0, y: 0 } }; Object.assign(cam, mv.fixed); apply(); return; }
    // blend from where the camera is: from the old move as it goes on, but never more than one deep
    let prev = mv && !mv.fixed ? mv : { fixed: { ...cam } };
    if (prev.prev) prev.prev = { fixed: poseOf(prev.prev, clock) };
    mv = { name, t0: clock, focus: focus === undefined ? focusFor(shown, wantedName) : focus, ph: Math.random() * 6.28, prev };
  }
  function apply() {
    stage.style.transform = `scale(${cam.s.toFixed(4)}) translate(${cam.x.toFixed(3)}%, ${cam.y.toFixed(3)}%)`;
  }
  // the clock stops while the page is hidden: a long gap shifts every start time, so nothing jumps
  function shift(ms) {
    for (let m = mv; m; m = m.prev) if (m.t0 !== undefined) m.t0 += ms;
    if (seq) seq.until += ms;
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (manual || now - lastNow < 15) return;
    step(now);
  }
  function step(now) {
    if (lastNow && now - lastNow > 250) shift(now - lastNow - 16);
    lastNow = clock = now;
    if (seq && now >= seq.until) advance();
    if (mv) {
      Object.assign(cam, poseOf(mv, now));
      apply();
    }
    GLFRAME.draw(cam, now);
  }

  // ---------- picture sequences ----------
  // While a screen with o.seq is up, the picture cycles through the steps of ASSETS.sequences[o.seq],
  // crossfading, and each step may sound as it begins. The camera goes on through the steps.
  let seq = null;
  function stepsOf(s) {
    const steps = Array.isArray(s) ? s : s && ASSETS.sequences && ASSETS.sequences[s];
    return steps && steps.length ? steps : null;
  }
  function sound(name) { if (name && typeof AUDIO !== 'undefined') AUDIO.snd(name); }   // a missing file is skipped there
  function startSeq(steps, name, g) {
    Promise.all(steps.map(st => resolve(st.frame))).then(rs => {
      if (g !== gen) return;
      const keys = rs.map(r => r && r[0]);
      // every step the same picture (none drawn yet): keep the screen's own frame, keep only the sounds
      const pictures = keys.some(k => k !== keys[0]);
      if (pictures && rs[0]) { put(rs[0][0], rs[0][1], steps[0].fade); cameraNow(); }
      else picture(name, g);
      if (frozen()) return;
      seq = { steps, rs, pictures, i: 0, until: clock + (steps[0].hold || 4) * 1000, g, log: [] };
      play(0);
    });
  }
  function play(i) {
    const st = seq.steps[i];
    seq.log.push({ i, frame: seq.pictures && seq.rs[i] ? seq.rs[i][0] : null, sfx: st.sfx || null, at: Math.round(clock) });   // frame null: the picture stays
    if (seq.log.length > 40) seq.log.shift();
    sound(st.sfx);
  }
  function advance() {
    const s = seq;
    s.i = (s.i + 1) % s.steps.length;
    const st = s.steps[s.i], r = s.rs[s.i];
    if (s.pictures && r) put(r[0], r[1], st.fade);      // the same picture as now: put() does nothing
    s.until = clock + (st.hold || 4) * 1000;
    play(s.i);
  }
  function stopSeq() { seq = null; }

  // ---------- a screen's picture ----------
  // set(name, { cam, seq }): the frame, the camera move (else the frame's own), a sequence (else none).
  let wantedName = null;
  function cameraNow() { if (camWanted) { const c = camWanted; camWanted = null; begin(c); } }
  function picture(name, g) {
    resolve(name).then(r => { if (g !== gen) return; if (r) put(r[0], r[1]); cameraNow(); });
  }
  function set(name, opts = {}) {
    if (!name) return;
    const steps = stepsOf(opts.seq);
    const move = opts.cam || camFor(name);
    const key = name + '@' + variantOf(name) + (steps ? '#' + (typeof opts.seq === 'string' ? opts.seq : 'seq') : '');
    if (key === wanted) { if (!mv || mv.name !== move) begin(move); return; }
    wanted = key; wantedName = name;
    const g = ++gen;
    stopSeq();
    camWanted = move;
    setTimeout(() => { if (g === gen) cameraNow(); }, 900);   // if the picture is slow, move anyway
    if (steps) startSeq(steps, name, g);
    else picture(name, g);
  }
  // a screen without a picture of its own stops any sequence, and keeps the last picture and move
  function screen(o) {
    if (o && o.frame) set(o.frame, { cam: o.cam, seq: o.seq });
    else if (seq) { stopSeq(); wanted = null; }
  }
  // the month and the body, on the print
  const TINT = ['jan', 'feb', 'mar', 'apr', 'may'];
  function mood(day, strength) {
    box.dataset.month = TINT[Math.min(4, monthOf(day))];
    box.style.setProperty('--weak', clamp((45 - strength) / 40, 0, 1).toFixed(2));
  }
  begin('still');
  requestAnimationFrame(tick);
  return {
    set, screen, mood, room, moves: Object.keys(MOVES), camFor,
    aim: name => begin(name || (mv && mv.name) || 'look'),
    // step(now): move the camera (and any sequence) to this moment by hand; the page stops doing it itself
    step: now => { manual = true; step(now); }, auto: () => { manual = false; },
    pose: (name, t, focus = null, ph = 0) => MOVES[name](t, focus, ph),
    cam: () => ({ ...cam }), move: () => mv && { name: mv.name, focus: mv.focus, blending: !!mv.prev },
    seq: () => seq && { i: seq.i, n: seq.steps.length, pictures: seq.pictures, keys: seq.rs.map(r => r && r[0]), log: seq.log.slice() },
    shown: () => shown, variant: v => { force = v; wanted = null; },
  };
})();
