'use strict';
// Frames: the linocut stills. Two layers crossfade; a frame that is not drawn yet shows its stand-in;
// the living overlay (fx.js) and the moving figures (sprites.js) follow whichever picture is actually on screen.
// Over the winter a place is seen from different angles: each frame moves to another of its
// drawings every day. The page tints the prints by month, and darkens them as the body fails.
// A screen can also run a short sequence of pictures (ASSETS.sequences). The camera is locked, except for
// the few pictures that have a move of their own (ASSETS.cams).
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
  // the names a frame may show, itself first and then its stand-ins
  function chain(name) {
    const names = [name];
    for (let n = ASSETS.fallback[name]; n && !names.includes(n); n = ASSETS.fallback[n]) names.push(n);
    return names;
  }
  // which drawings it shows today: its own variant, and for a stand-in listed in ASSETS.inherit, the
  // variant of the place it stands in for (the night hut's panorama shows the hut's drawing of the day)
  function variantsOf(name) {
    const inherit = ASSETS.inherit && ASSETS.inherit.includes(name);
    const out = new Map();
    chain(name).forEach((n, i) => { const v = (i === 0 || inherit) ? variantOf(n) : null; if (v !== null) out.set(n, v); });
    return out;
  }
  const vtag = name => [...variantsOf(name)].map(([n, v]) => n + v).join(',');
  function sources(name) {
    // a drawing named outright ('hut_night-02', from a round): the master when it is the selected one
    const mv = /^(.+)-0(\d)$/.exec(name);
    if (mv && ASSETS.variants[mv[1]]) {
      const base = mv[1], v = +mv[2], sel = ASSETS.variants[base].selected;
      return v === sel ? [[base, `assets/frames/web/${base}.jpg`, false]] : [[name, `assets/frames/web/variants/${name}.jpg`, false]];
    }
    const out = [], vs = variantsOf(name);
    for (const n of chain(name)) {
      const v = vs.has(n) ? vs.get(n) : null, sel = ASSETS.variants[n] && ASSETS.variants[n].selected;
      if (v !== null && v !== sel) out.push([`${n}-0${v}`, `assets/frames/web/variants/${n}-0${v}.jpg`, false]);
      // a plate with moving figures (sprites.js) stands in for the master drawing when it exists
      for (const p of window.SPRITES ? SPRITES.plates(n) : []) if (!missing[p]) out.push([p, `assets/frames/web/${p}.jpg`, false], [p, `assets/frames/${p}.png`, true]);
      if (!missing[n]) out.push([n, `assets/frames/web/${n}.jpg`, false], [n, `assets/frames/${n}.png`, true]);
    }
    return out;
  }
  // which picture a frame name will actually show today: [key, src], or null if nothing loads.
  // Remembered, so a sequence knows at once whether its steps are different pictures.
  const resolved = {};
  function resolve(name) {
    const id = name + '@' + vtag(name);
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
  // warm(names): fetch, ahead of time, the file each name would show today (its stand-ins and its
  // variant of the day resolved as set() does), so the print is in the cache before its screen comes.
  // Only the latest call's images are held, so the browser does not drop them half-loaded.
  let warmth = new Set();
  function warm(names) {
    const held = new Set();
    warmth = held;
    for (const name of new Set((names || []).filter(Boolean))) resolve(name).then(r => {
      if (!r || warmth !== held) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = r[1];
      held.add(img);
    });
  }
  function put(key, src, fade) {
    if (shown === key) return;
    shown = key;
    const id = ++putId;
    stage.style.setProperty('--fade', (fade || 1.1) + 's');
    const back = layers[1 - front];
    back.style.objectPosition = '';      // a wide picture may have been panned
    back.src = src;
    const swap = () => {
      if (id !== putId) return;          // a newer picture was asked for while this one decoded
      back.classList.add('on');
      layers[front].classList.remove('on');
      front = 1 - front;
      if (window.FX) FX.set(key);
      if (window.SPRITES) SPRITES.set(key);
      aim(key, fade || 1.1);     // the new picture's camera move, blended in under the crossfade
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
  // Locked by default: the picture holds still, zoomed in a touch so its edges never show. A camera
  // that moves on every screen is not how the man sees; he looks at things. A few pictures have a move
  // of their own (ASSETS.cams, or the screen's o.cam), played once and then held until the screen changes:
  //   lean  one slow lean over the bowl, and he stays bent over the food (supper, breakfast)
  //   pano  a slow look round a wide picture, like turning your head (the night hut's panorama)
  // A move belongs to the picture actually on screen, not to the name asked for, so a stand-in stays locked.
  // A pose is a zoom s, a pan x and y in % of the print, and for wide pictures where the eye is along
  // the picture (pan, 0..1) and how far the head is turned (turn, degrees). A new picture blends into its
  // move during the crossfade; every pose stays inside room(), so the camera never shows an edge.
  // It runs here, frame by frame, so the living print (glframe.js) knows exactly where it is.
  const LOCK = { s: 1.04, x: 0, y: 0, pan: .5, turn: 0 };
  const cam = { ...LOCK };
  const room = s => (s - 1) / (2 * s) * 100 * .92;      // how far it can pan at this zoom, in %
  const smooth = k => (k = clamp(k, 0, 1), k * k * k * (k * (k * 6 - 15) + 10));   // eases in and out, no kinks
  // a pan that brings the subject (f, fractions of the print) amt of the way to the middle, softly limited
  function toward(f, amt, s) {
    const lim = room(s);
    const soft = v => lim ? lim * Math.tanh(v / lim) : 0;
    return f ? { x: soft((.5 - f[0]) * 100 * amt), y: soft((.5 - f[1]) * 100 * amt) } : { x: 0, y: 0 };
  }
  // the moves: (t seconds since the move began, f the subject or null) -> pose
  const MOVES = {
    still: () => ({ ...LOCK }),
    // a beat, then seven seconds bending over the bowl, then held there
    lean: (t, f) => {
      const k = smooth((t - .8) / 7), s = 1.04 + .055 * k, c = toward(f, .7 * k, s);
      return { s, x: c.x, y: c.y, pan: .5, turn: 0 };
    },
    // a wide picture (about 3:1) seen through the 16:9 window: the eye starts near the left end, waits,
    // and turns slowly to the right end over fifty seconds, then stays. The head's turn shows as a slight
    // perspective, strongest at the two ends and none in the middle.
    pano: t => {
      const pan = .08 + .84 * smooth((t - 3) / 50);
      return { s: 1.055, x: 0, y: 0, pan, turn: 2.6 * (pan - .5) };
    },
  };
  // which move the picture on screen has: its own (the key without its variant), else locked
  function camOf(key) {
    const base = String(key || '').replace(/-0\d$/, '');
    return (ASSETS.cams && (ASSETS.cams[key] || ASSETS.cams[base])) || 'still';
  }
  // where the eye goes in the picture on screen: placed by hand, or the fire or the lamp (fx.js)
  function focusFor(key, name) {
    const base = key && key.replace(/-0\d$/, '');
    return (ASSETS.focus && (ASSETS.focus[key] || (key === base && ASSETS.focus[base])))
      || (key && window.FX && FX.focusOf(key))
      || (ASSETS.focus && (ASSETS.focus[base] || ASSETS.focus[name])) || null;
  }
  const BLEND = 1400;   // ms from one move into the next when the picture stays (a new picture: its fade)
  let mv = null, clock = performance.now(), manual = false, lastNow = 0, camWish = null, panImg = null, lastTf = '';
  function poseOf(m, now) {
    if (m.fixed) return { ...m.fixed };
    const p = MOVES[m.name]((now - m.t0) / 1000, m.focus);
    const r = room(p.s);
    p.x = clamp(p.x, -r, r); p.y = clamp(p.y, -r, r);
    if (m.prev) {
      const k = (now - m.t0) / m.blend;
      if (k >= 1) m.prev = null;
      // (not the pan along a wide picture: that belongs to the new picture alone, and starts where its move does)
      else { const q = poseOf(m.prev, now), e = smooth(k); for (const a of ['s', 'x', 'y', 'turn']) p[a] = q[a] + (p[a] - q[a]) * e; }
    }
    return p;
  }
  function begin(name, key, blend = BLEND) {
    if (!MOVES[name]) name = 'still';
    panImg = name === 'pano' && !still() ? layers[front] : null;
    if (still()) { mv = { name, key, fixed: { ...LOCK } }; Object.assign(cam, LOCK); apply(); return; }
    // blend from where the camera is: from the old move as it goes on, but never more than one deep
    let prev = mv && !mv.fixed ? mv : { fixed: { ...cam } };
    if (prev.prev) prev.prev = { fixed: poseOf(prev.prev, clock) };
    mv = { name, key, t0: clock, blend, focus: focusFor(key, wantedName), prev };
  }
  // the picture on screen has changed (or the screen asked for another move): start its move, unless
  // it is already playing on this picture
  function aim(key, fade) {
    const name = camWish || camOf(key);
    if (mv && mv.name === name && (mv.key === key || name === 'still')) return;
    begin(name, key, fade ? fade * 1000 : BLEND);
  }
  function apply() {
    const turn = Math.abs(cam.turn) > .001 ? `perspective(${Math.max(900, stage.clientWidth * 2)}px) rotateY(${cam.turn.toFixed(3)}deg) ` : '';
    const tf = `${turn}scale(${cam.s.toFixed(4)}) translate(${cam.x.toFixed(3)}%, ${cam.y.toFixed(3)}%)`;
    if (tf !== lastTf) { stage.style.transform = lastTf = tf; }
    if (panImg) panImg.style.objectPosition = `${(cam.pan * 100).toFixed(2)}% 50%`;
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
  // While a screen with o.seq is up, the picture goes through the steps of ASSETS.sequences[o.seq],
  // crossfading, and each step may sound as it begins. A sequence loops, unless it reaches a step
  // marked stay: there it stops, and the picture stays until the screen changes.
  let seq = null;
  function stepsOf(s, name) {
    if (s === 'round') return roundOf(name);
    const steps = Array.isArray(s) ? s : s && ASSETS.sequences && ASSETS.sequences[s];
    return steps && steps.length ? steps : null;
  }
  // 'round': the place's own drawings one after another, the day's first, a quarter of a minute each,
  // with long fades: a montage of the place rather than one still. Only for a place drawn more than once.
  function roundOf(name) {
    let base = name;
    for (const n of chain(name)) if (ASSETS.variants[n] && ASSETS.variants[n].all.length > 1 && !ASSETS.fixed.includes(n)) { base = n; break; }
    const v = ASSETS.variants[base];
    if (!v || v.all.length < 2) return null;
    const first = variantOf(base), order = [first, ...v.all.filter(k => k !== first)];
    return order.map((k, i) => ({ frame: `${base}-0${k}`, hold: i === 0 ? 16 : 13, fade: 3.5 }));
  }
  function sound(name) { if (name && typeof AUDIO !== 'undefined') AUDIO.snd(name); }   // a missing file is skipped there
  function startSeq(steps, name, g) {
    Promise.all(steps.map(st => resolve(st.frame))).then(rs => {
      if (g !== gen) return;
      const keys = rs.map(r => r && r[0]);
      // every step the same picture (none drawn yet): keep the screen's own frame, keep only the sounds
      const pictures = keys.some(k => k !== keys[0]);
      if (pictures && rs[0]) show(rs[0][0], rs[0][1], steps[0].fade);
      else picture(name, g);
      if (frozen()) return;
      seq = { steps, rs, pictures, i: 0, until: steps[0].stay ? Infinity : clock + (steps[0].hold || 4) * 1000, g, log: [] };
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
    if (s.pictures && r) show(r[0], r[1], st.fade);      // the same picture as now: nothing changes
    s.until = st.stay ? Infinity : clock + (st.hold || 4) * 1000;
    play(s.i);
  }
  function stopSeq() { seq = null; }

  // ---------- a screen's picture ----------
  // set(name, { cam, seq }): the frame, the camera move (else the picture's own), a sequence (else none).
  let wantedName = null;
  // put a resolved picture on screen; if it is already there, only see that the camera has the right move
  function show(key, src, fade) {
    if (key === shown) aim(key);
    else put(key, src, fade);
  }
  function picture(name, g) {
    resolve(name).then(r => { if (g !== gen) return; if (r) show(r[0], r[1]); });
  }
  function set(name, opts = {}) {
    box.dataset.dark = (ASSETS.dark || []).includes(name) ? '1' : '';   // a daylight print on a night screen
    if (!name) return;
    const steps = stepsOf(opts.seq, name);
    camWish = opts.cam || null;
    const key = name + '@' + vtag(name) + (steps ? '#' + (typeof opts.seq === 'string' ? opts.seq : 'seq') : '');
    if (key === wanted) { if (shown) aim(shown); return; }
    wanted = key; wantedName = name;
    const g = ++gen;
    stopSeq();
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
  begin('still', null);
  requestAnimationFrame(tick);
  return {
    set, screen, warm, mood, room, moves: Object.keys(MOVES), camOf,
    aim: name => begin(name || (mv && mv.name) || 'still', shown),
    // step(now): move the camera (and any sequence) to this moment by hand; the page stops doing it itself
    step: now => { manual = true; step(now); }, auto: () => { manual = false; },
    pose: (name, t, focus = null) => MOVES[name](t, focus),
    cam: () => ({ ...cam }), move: () => mv && { name: mv.name, focus: mv.focus, blending: !!mv.prev },
    seq: () => seq && { i: seq.i, n: seq.steps.length, pictures: seq.pictures, keys: seq.rs.map(r => r && r[0]), log: seq.log.slice() },
    shown: () => shown, variant: v => { force = v; wanted = null; },
  };
})();
