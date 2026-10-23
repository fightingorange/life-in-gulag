'use strict';
// Sound: ambient beds that crossfade, one-shots, voice lines, and the body as a mixer.
// A fixed pool of audio elements, reused. Browsers cap media players per page (~75),
// so creating one per sound would silence the game after a few hundred scenes.
const AUDIO = (() => {
  const web = location.protocol !== 'file:' && window.AudioContext; // file:// cannot route media through Web Audio
  let ctx = null, lowpass = null;
  let on = true;
  try { on = localStorage.getItem('ten-years-sound') !== 'off'; } catch (e) {}
  const missing = {};
  const AMB_VOL = 0.45, SFX_VOL = 0.8, VOICE_VOL = 0.9;
  let ambName = null, muff = 1;
  let queue = [], speakingId = 0;

  function el(loop) {
    const a = new Audio();
    a.loop = !!loop; a.preload = 'auto';
    a.onerror = () => { if (a.dataset.path) missing[a.dataset.path] = true; };
    return a;
  }
  const ambs = [el(true), el(true)]; let ambIdx = 0;   // two beds, alternating, for crossfades
  const sfx = Array.from({ length: 6 }, () => el(false)); let sfxIdx = 0;
  const voice = el(false);
  const pulse = el(true); pulse.dataset.path = 'assets/sfx/pulse.mp3'; pulse.src = pulse.dataset.path;
  const all = [...ambs, ...sfx, voice, pulse];

  function unlock() {
    if (web && !ctx) {
      ctx = new AudioContext();
      lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 20000;
      lowpass.connect(ctx.destination);
      all.forEach(a => { try { ctx.createMediaElementSource(a).connect(lowpass); } catch (e) {} });
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  function load(a, path) { if (a.dataset.path !== path) { a.dataset.path = path; a.src = path; } }
  function fade(a, to, ms, then) {
    const from = a.volume, t0 = performance.now(), token = (a._fade = (a._fade || 0) + 1);
    (function step() {
      if (a._fade !== token) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = clamp(from + (to - from) * k, 0, 1);
      if (k < 1) requestAnimationFrame(step); else if (then) then();
    })();
  }
  // a new screen: let what the last one was saying trail off
  function scene(o) {
    if (!o.voice && !voice.paused) { ++speakingId; queue = []; fade(voice, 0, 1200, () => voice.pause()); }
    for (const a of sfx) {
      if (a.paused || !a.duration) continue;
      if (a.duration - a.currentTime > 2.5) fade(a, 0, 1500, () => a.pause());
    }
  }
  function ambient(name) {
    if (name === ambName) return;
    ambName = name;
    const old = ambs[ambIdx];
    fade(old, 0, 2500, () => old.pause());
    if (!name) return;
    const path = `assets/sfx/${name}.mp3`;
    if (missing[path]) return;
    ambIdx = 1 - ambIdx;
    const a = ambs[ambIdx];
    load(a, path);
    a.volume = 0; a.currentTime = 0;
    a.play().then(() => fade(a, on ? AMB_VOL * muff : 0, 2500)).catch(() => {});
  }
  function snd(name) {
    if (!on || !name) return;
    const path = `assets/sfx/${name}.mp3`;
    if (missing[path]) return;
    const a = sfx[sfxIdx]; sfxIdx = (sfxIdx + 1) % sfx.length;
    a._fade = (a._fade || 0) + 1;   // cancel a fade-out still running on this slot
    load(a, path);
    a.volume = SFX_VOL * (0.4 + 0.6 * muff); a.currentTime = 0;
    a.play().catch(() => {});
  }
  function say(ids) {
    if (!ids) return;
    queue = [].concat(ids).filter(Boolean);
    voice.pause();
    nextLine();
  }
  function nextLine() {
    if (!on || !queue.length) return;
    const id = queue.shift();
    const path = `assets/voice/${id}.mp3`;
    if (missing[path]) return nextLine();
    const token = ++speakingId;
    voice._fade = (voice._fade || 0) + 1;
    load(voice, path);
    voice.volume = VOICE_VOL; voice.currentTime = 0;
    voice.onended = () => { if (speakingId === token) nextLine(); };
    voice.onerror = () => { missing[path] = true; if (speakingId === token) nextLine(); };
    setTimeout(() => { if (speakingId === token) voice.play().catch(() => { if (speakingId === token) nextLine(); }); }, 400);
  }
  // the body as a mixer: as strength drops the world muffles and a pulse comes up
  function body(strength) {
    muff = clamp((strength - 8) / 55, 0.2, 1);
    if (lowpass) lowpass.frequency.setTargetAtTime(250 + Math.pow(muff, 2) * 18000, ctx.currentTime, 0.8);
    const a = ambs[ambIdx];
    if (ambName && !a.paused) a.volume = on ? AMB_VOL * muff : 0;
    const wantPulse = strength < 25 && !missing[pulse.dataset.path];
    if (wantPulse) {
      pulse.volume = on ? clamp((25 - strength) / 25, 0, 1) * 0.7 : 0;
      if (pulse.paused) pulse.play().catch(() => {});
    } else if (!pulse.paused) pulse.pause();
  }
  function toggle() {
    on = !on;
    try { localStorage.setItem('ten-years-sound', on ? 'on' : 'off'); } catch (e) {}
    ambs.forEach(a => { a.volume = on && a === ambs[ambIdx] ? AMB_VOL * muff : 0; });
    if (!on) { voice.pause(); queue = []; pulse.pause(); }
    return on;
  }
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  return { ambient, snd, say, body, scene, toggle, unlock, isOn: () => on };
})();

