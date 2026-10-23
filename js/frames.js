'use strict';
// Frames: the linocut stills. Two layers crossfade; a frame that is not drawn yet shows its stand-in;
// the living overlay (fx.js) follows whichever picture is actually on screen.
const FRAME = (() => {
  const box = document.getElementById('frame');
  const layers = [...box.querySelectorAll('img')];
  let front = 0, wanted = null, shown = null;
  const missing = {};
  if (window.FX) FX.mount(box);

  function sources(name) {
    const names = [name];
    if (ASSETS.fallback[name]) names.push(ASSETS.fallback[name]);
    return names.filter(n => !missing[n]).flatMap(n => [[n, `assets/frames/web/${n}.jpg`, false], [n, `assets/frames/${n}.png`, true]]);
  }
  function put(n, src) {
    if (shown === n) return;
    shown = n;
    const back = layers[1 - front];
    back.src = src;
    const swap = () => {
      if (wanted === null) return;
      back.classList.add('on');
      layers[front].classList.remove('on');
      front = 1 - front;
      if (window.FX) FX.set(n);
    };
    if (back.decode) back.decode().then(swap, swap); else swap();
  }
  function set(name) {
    if (!name || name === wanted) return;
    wanted = name;
    const list = sources(name);
    (function next(i) {
      if (wanted !== name) return;
      if (i >= list.length) return;
      const [n, src, last] = list[i];
      const probe = new Image();
      probe.onload = () => { if (wanted === name) put(n, src); };
      probe.onerror = () => { if (last) missing[n] = true; next(i + 1); };
      probe.src = src;
    })(0);
  }
  return { set, shown: () => shown };
})();
