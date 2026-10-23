'use strict';
// Moving figures. Some pictures are composited: a background plate (the place without its people) and
// cut-out figures, drawn on plain paper, that move over it. The figures are laid on with multiply, so
// their paper disappears and only the ink stays, as if printed on the plate. They sit above the print
// and below the light and shade (fx.js), so the weather and the light fall on them too.
//
// A plate stands in for a picture ('over'): when the game asks for site_timber_1 and a plate for it
// exists, frames.js shows the plate instead (it asks plates(name) before the picture itself, after the
// day's other drawing of the place, so a plate only ever replaces the master). Figures are drawn only
// when the picture on screen is the plate itself: if no plate is drawn yet, the game shows the picture,
// its key is not the plate's, and nothing moves over it. A picture may also carry figures itself (the
// night hut's panorama has an empty bunk drawn in it).
//
// CONF: { <plate or picture key>: { over: 'picture', figures: [figure, ...] } }
//   over    the picture this plate stands in for (omit for a picture that carries figures itself).
//           Several plates may stand in for one picture: the first listed that exists wins.
// A figure:
//   img     'name' or ['name', 'name2', ...]: assets/frames/figures/<name>.png; several drawings are
//           cycled (two poses of men hauling), one every `every` seconds (default .6)
//   poses   [{ img, hold, sfx }, ...] instead of img: drawings cut between in turn, each held `hold`
//           seconds (default `every`), each with its own sound as it comes (a pick strike, an axe blow,
//           a creak); a missing pose is skipped
//   blend   seconds of crossfade from one pose into the next (default 0: a cut, like a block recut)
//   offset  seconds into its pose cycle at the start (two figures that should not strike together)
//   or      a drawing shown while none of its own exist yet (the test cut-out); it does not cycle
//   w       width as a fraction of the picture's width (the height follows the drawing)
//   anchor  [ax, ay]: the point of the drawing that walks the path, as fractions of it (default [.5, 1], the feet)
//   anchors { imageName: [ax, ay] }: measured contact points when pose drawings have different paper margins
//   path    [[x, y], ...]: where the anchor goes, as fractions of the picture (one point: it stays there
//           and only changes pose, like a man digging)
//   secs    how long the path takes; ease 'inout' (default), 'linear', 'in', 'out'
//   loop    true: when it gets there it fades out, waits `rest` seconds and starts again (fade: seconds, default 1.5);
//           false: it gets there and holds
//   delay   seconds before it first moves (it waits at the start)
//   bob     how far it dips with each step (fraction of the frame's height); step: steps a second (default 1)
//   sway    how far it rocks with each step, in degrees, about the anchor
//   scale   [s0, s1]: its size along the path (going away up the bank: [1, .9])
//   flip    true: mirrored
//   sfx     a sound played each time it starts along its path; skipped if the file is missing
//   vol     how loud its sounds are, 0..1 (default .35)
//   mouth   [[x, y, dir], ...]: the men's mouths on the drawing (fractions of it), so fx.js's breath follows
//           them (an fx config with breath: 'figures'); dir 1: facing right, -1: left; mouthAt: the same as fractions of the picture,
//           for a figure that stays where it is
// Positions are fractions of the picture as it is fitted in the frame (for a 16:9 drawing, the frame);
// a wide picture panned by the camera (the 3:1 panorama) carries its figures with it.
const SPRITES = (() => {
  // the haulers dragging their log up the bank (site_timber_1): drawn where they stand at the middle of
  // the path (.506, .798) and brought up from lower down the bank, thirty seconds, then round again
  const HAUL = { anchor: [.5, .92], path: [[.44, .835], [.5063, .7981], [.56, .768]], secs: 30, ease: 'linear',
    loop: true, rest: 3, fade: 2.5, bob: .003, step: .8, sway: .4, scale: [1.03, .97], sfx: 'log_drag' };
  // Mouths and feet measured on the production haulers cutout, including its paper margin.
  const HAUL_MOUTHS = [[.35, .31], [.90, .18]];
  // Stages two and three: the same two men a little smaller, the log at the same place on the bank.
  const HAUL_LATER = { ...HAUL, w: .50, path: [[.44, .81], [.5, .775], [.555, .745]] };
  const DIG_FEET = { digger_a: [.45634, .93943], digger_b: [.45559, .90755] };
  const SHOVEL_FEET = { shoveller_a: [.46950, .87779], shoveller_b: [.47936, .87885] };
  const BRICK_FEET = { bricklayer_a: [.45410, .91817], bricklayer_b: [.45395, .91817] };
  const CONF = {
    // ---- the timber bank. Stand-ins: test_timber_plate (site_timber_1 with the two haulers removed by
    // hand) and test_haulers (the men cut out). Codex's plates and two-pose figures take over when they come.
    site_timber_plate_1: { over: 'site_timber_1', figures: [
      { ...HAUL, poses: [{ img: 'haulers_a', hold: .9 }, { img: 'haulers_b', hold: .9 }], or: 'test_haulers', w: .54, mouth: HAUL_MOUTHS },
      // The axeman trims a log beside the stacks, to the right.
      { poses: [{ img: 'axeman_a', hold: 1.1 }, { img: 'axeman_b', hold: .7, sfx: 'spot_axe' }], w: .23, anchor: [.36, .92], path: [[.79, .62]] },
    ] },
    test_timber_plate: { over: 'site_timber_1', figures: [
      { ...HAUL, anchor: [.5, 1], img: 'test_haulers', w: .4862, mouth: [[.3, .36], [.945, .1]] },
    ] },
    site_timber_plate_2: { over: 'site_timber_2', figures: [
      { ...HAUL_LATER, poses: [{ img: 'haulers_a', hold: .9 }, { img: 'haulers_b', hold: .9 }], or: 'test_haulers', mouth: HAUL_MOUTHS },
      { poses: [{ img: 'axeman_a', hold: 1.1 }, { img: 'axeman_b', hold: .7, sfx: 'spot_axe' }], w: .21, anchor: [.36, .92], path: [[.82, .58]] },
    ] },
    site_timber_plate_3: { over: 'site_timber_3', figures: [
      { ...HAUL_LATER, poses: [{ img: 'haulers_a', hold: .9 }, { img: 'haulers_b', hold: .9 }], or: 'test_haulers', mouth: HAUL_MOUTHS },
      { poses: [{ img: 'axeman_a', hold: 1.1 }, { img: 'axeman_b', hold: .7, sfx: 'spot_axe' }], w: .21, anchor: [.36, .92], path: [[.82, .58]] },
    ] },
    // ---- the settlement: the nearest digger (left, feet at .12, .765) and a man shovelling the spoil
    // beside the man with the raised pick; they stay where they are and swing, each blow heard
    ...stages('site_settlement', [
      { poses: [{ img: 'digger_a', hold: 1.3 }, { img: 'digger_b', hold: .8, sfx: 'spot_pick' }], w: .49, anchors: DIG_FEET, path: [[.125, .765]] },
      { poses: [{ img: 'shoveller_a', hold: 1.4, sfx: 'spot_shovel' }, { img: 'shoveller_b', hold: 1 }], w: .18, anchors: SHOVEL_FEET, path: [[.545, .55]], offset: .9 },
    ]),
    // ---- the power station: the nearest bricklayer, on the scaffold in the middle, bending to the
    // mortar and setting a brick; his planks are higher at each stage
    ...stages('site_power', [
      [{ poses: [{ img: 'bricklayer_a', hold: 1.8, sfx: 'spot_trowel' }, { img: 'bricklayer_b', hold: 1.6, sfx: 'spot_brick' }], w: .23, anchors: BRICK_FEET, path: [[.485, .49]] }],
      [{ poses: [{ img: 'bricklayer_a', hold: 1.8, sfx: 'spot_trowel' }, { img: 'bricklayer_b', hold: 1.6, sfx: 'spot_brick' }], w: .23, anchors: BRICK_FEET, path: [[.49, .29]] }],
      [{ poses: [{ img: 'bricklayer_a', hold: 1.8, sfx: 'spot_trowel' }, { img: 'bricklayer_b', hold: 1.6, sfx: 'spot_brick' }], w: .23, anchors: BRICK_FEET, path: [[.48, .32]] }],
    ]),
    // ---- noon: the crouching men as one figure on the plate, hands to the fire and a moment later
    // shifted; slow, so it reads as men settling, not as a flicker. Their mouths for the breath.
    noon_plate: { over: 'noon', figures: [
      { poses: [{ img: 'noon_men_a', hold: 5.5 }, { img: 'noon_men_b', hold: 3.5 }], blend: .35, w: .52, anchor: [.5, .89], path: [[.495, .865]],
        mouthAt: [[.372, .556, 1], [.612, .584, -1]] },
    ] },
    // ---- the night hut at its true size: one man on the empty lower bunk in the near right third,
    // turning in his sleep about every half minute, with a creak. The paper margin sits above the berth.
    hut_night_pano: { figures: [
      { poses: [{ img: 'sleeper_turn_a', hold: 31 }, { img: 'sleeper_turn_b', hold: 27, sfx: 'spot_creak' }, { img: 'sleeper_turn_c', hold: 34, sfx: 'spot_creak' }],
        w: .18, path: [[.85, .755]], vol: .25 },
    ] },
  };
  // a plate for each of a place's three stages: <place>_plate_1/2/3 over <place>_1/2/3. figs is one list
  // for all three, or a list per stage
  function stages(place, figs) {
    const out = {};
    for (const i of [1, 2, 3]) out[`${place}_plate_${i}`] = { over: `${place}_${i}`, figures: Array.isArray(figs[0]) ? figs[i - 1] : figs };
    return out;
  }

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
  // where the picture lies in the frame: object-fit cover, and the camera's pan of a wide picture
  function pictureRect() {
    const im = stage && [...stage.querySelectorAll('img.on')].find(i => !i.classList.contains('twin'));
    if (!im || !im.naturalWidth) return { x: 0, y: 0, w: W, h: H };
    const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    const pos = (im.style.objectPosition || '').match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
    const px = pos ? +pos[1] / 100 : .5, py = pos ? +pos[2] / 100 : .5;
    return { x: (W - w) * px, y: (H - h) * py, w, h };
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

  // A figure's sounds come again and again (every blow), so they cannot go through AUDIO.snd, which plays
  // a sound once per screen. AUDIO.spot (the soundscapes' one-shots) is used if audio.js offers it;
  // otherwise a small player of our own, heard only when the game's sound is on (never in test mode).
  const players = [];
  function sound(name, vol) {
    if (!name || typeof AUDIO === 'undefined' || reduced()) return;     // AUDIO is a const: not on window
    if (!(AUDIO.isOn ? AUDIO.isOn() : true)) return;
    if (sounds[name] === false || sounds[name] === 'probing') return;
    const play = () => {
      try {
        if (AUDIO.spot) return AUDIO.spot(name, vol);
        let a = players.find(p => p.paused || p.ended);
        if (!a) { if (players.length >= 4) return; a = new Audio(); players.push(a); }
        a.src = `assets/sfx/${name}.mp3`; a.volume = Math.max(0, Math.min(1, vol)); a.play().catch(() => {});
      } catch (e) {}
    };
    if (sounds[name] === true) return play();
    sounds[name] = 'probing';
    fetch(`assets/sfx/${name}.mp3`, { method: 'HEAD', cache: 'no-cache' })
      .then(r => { sounds[name] = r.ok; if (r.ok) play(); })
      .catch(() => { sounds[name] = false; });
  }

  // which plates may stand in for a picture, in order (frames.js tries them before the picture itself)
  function plates(name) { return Object.keys(CONF).filter(k => CONF[k].over === name); }
  function figuresOf(k) { const c = k && CONF[k]; return c ? (Array.isArray(c) ? c : c.figures || []) : []; }

  function set(k) {
    if (!mount()) return;
    place();
    if (k === key) return;
    key = k;
    const conf = figuresOf(k);
    figs = conf.map(f => {
      const poses = f.poses ? f.poses.map(p => ({ rec: load(p.img), hold: p.hold || f.every || .6, sfx: p.sfx }))
        : [].concat(f.img || []).map(n => ({ rec: load(n), hold: f.every || .6 }));
      return { f, poses, or: f.or ? load(f.or) : null, runs: -1, pose: -1 };
    });
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
  // which drawing a figure shows at time t: [[rec, alpha], ...] (two while it blends), and the pose index.
  // Only drawings that exist take part; with none, the stand-in ('or'); with nothing, nothing.
  function poseAt(F, tt) {
    const live = F.poses.filter(p => p.rec.ready);
    if (!live.length) return { draw: F.or && F.or.ready ? [[F.or, 1]] : [], i: -1, stand: true };
    if (live.length === 1 || reduced()) return { draw: [[live[0].rec, 1]], i: F.poses.indexOf(live[0]) };
    const total = live.reduce((a, p) => a + p.hold, 0);
    let u = ((tt + (F.f.offset || 0)) % total + total) % total, j = 0;
    while (u >= live[j].hold) { u -= live[j].hold; j++; }
    const cur = live[j], blend = F.f.blend || 0, left = cur.hold - u;
    const out = { draw: [[cur.rec, 1]], i: F.poses.indexOf(cur) };
    if (blend && left < blend) out.draw.push([live[(j + 1) % live.length].rec, 1 - left / blend]);
    return out;
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
  // where each figure is drawn now, in the frame's pixels: for drawing it, and for its mouths
  function layout(F, R) {
    const f = F.f, ph = phase(f, t), ps = poseAt(F, t);
    const rec = ps.draw.length ? ps.draw[0][0] : null;
    if (!rec) return { ph, ps, rec };
    const k = (EASE[f.ease] || EASE.inout)(ph.k);
    const [px, py] = along(f.path, k);
    const sc = f.scale ? f.scale[0] + (f.scale[1] - f.scale[0]) * k : 1;
    const w = (f.w || .2) * R.w * sc, h = w * rec.h / rec.w;
    const walk = ph.moving ? t * (f.step || 1) : 0;
    const bob = f.bob ? -Math.abs(Math.sin(Math.PI * walk)) * f.bob * R.h : 0;
    const rot = f.sway ? Math.sin(Math.PI * walk) * f.sway * Math.PI / 180 : 0;
    return { ph, ps, rec, x: R.x + px * R.w, y: R.y + py * R.h + bob, w, h, rot };
  }
  function draw() {
    if (!g || !W) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'multiply';        // figures overlapping each other: ink on ink
    const R = pictureRect();
    for (const F of figs) {
      const f = F.f, L = layout(F, R), ph = L.ph;
      if (ph.run !== F.runs && ph.moving) { F.runs = ph.run; sound(f.sfx, f.vol || .35); }
      if (L.ps.i !== F.pose) {                       // a new pose: its blow, its creak
        const first = F.pose === -1;
        F.pose = L.ps.i;
        const p = F.poses[L.ps.i];
        if (!first && p && p.sfx && ph.a > .5) sound(p.sfx, f.vol || .35);
      }
      if (ph.a <= 0 || !L.rec) continue;
      g.save();
      g.translate(L.x, L.y);
      if (L.rot) g.rotate(L.rot);
      if (f.flip) g.scale(-1, 1);
      for (const [rec, a] of L.ps.draw) {
        const [ax, ay] = (f.anchors && f.anchors[rec.name]) || f.anchor || [.5, 1];
        g.globalAlpha = ph.a * a;
        g.drawImage(rec.el, -ax * L.w, -ay * L.h, L.w, L.h);
      }
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // the men's mouths now, as fractions of the frame, with how visible they are: fx.js breathes there
  function mouths() {
    if (!W || !figs.length) return [];
    const R = pictureRect(), out = [];
    for (const F of figs) {
      const f = F.f;
      if (!f.mouth && !f.mouthAt) continue;
      const L = layout(F, R);
      if (!L.rec || L.ph.a <= 0) continue;
      if (f.mouthAt) { for (const [mx, my, dir] of f.mouthAt) out.push({ x: (R.x + mx * R.w) / W, y: (R.y + my * R.h) / H, a: L.ph.a, dir: dir || 1 }); continue; }
      const [ax, ay] = (f.anchors && f.anchors[L.rec.name]) || f.anchor || [.5, 1];
      for (const [mx, my, dir] of f.mouth) {
        let dx = (mx - ax) * L.w * (f.flip ? -1 : 1), dy = (my - ay) * L.h;
        const c = Math.cos(L.rot || 0), s = Math.sin(L.rot || 0);
        out.push({ x: (L.x + dx * c - dy * s) / W, y: (L.y + dx * s + dy * c) / H, a: L.ph.a, dir: (dir || 1) * (f.flip ? -1 : 1) });
      }
    }
    return out;
  }
  // for looking at it without waiting: at(seconds) shows the figures as they are that long after the
  // plate appeared, and stops the clock
  function at(secs) { stop(); t = secs; draw(); }
  function advance(secs) { at(t + secs); }

  return { set, at, advance, plates, mouths, conf: CONF,
    state: () => ({ key, figures: figs.length, ready: figs.map(F => F.poses.map(p => p.rec.ready)), stand: figs.map(F => !!(F.or && F.or.ready)), poses: figs.map(F => F.pose), t: +t.toFixed(2), running: !!raf }) };
})();
window.SPRITES = SPRITES;
