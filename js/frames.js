'use strict';
// Frames: the linocut stills. Two layers crossfade; a frame that is not drawn yet shows its stand-in;
// the living overlay (fx.js) follows whichever picture is actually on screen.
// Over the winter a place is seen from different angles: each frame moves to another of its
// drawings every few days. The page tints the prints by month, and darkens them as the body fails.
const FRAME = (() => {
  const box = document.getElementById('frame');
  const stage = box.querySelector('.stage');
  const layers = [...stage.querySelectorAll('img')];
  let front = 0, wanted = null, shown = null, force = null;
  const missing = {};
  if (window.FX) FX.mount(stage);

  // which drawing of this place today; the same all day, a different one every ASSETS.every days
  function variantOf(name) {
    const v = ASSETS.variants[name];
    if (!v || ASSETS.fixed.includes(name)) return null;
    if (force !== null) return v.all.includes(force) ? force : v.selected;
    const day = (typeof S !== 'undefined' && S && S.day) || 1;
    if (day <= ASSETS.every || v.all.length < 2) return v.selected;
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
    if (back.decode) back.decode().then(swap, swap); else swap();
  }
  function set(name) {
    if (!name) return;
    const key = name + '@' + variantOf(name);
    if (key === wanted) return;
    wanted = key;
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
  return { set, mood, shown: () => shown, variant: v => { force = v; wanted = null; } };
})();
