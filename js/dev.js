'use strict';
// The dev panel: test the game without playing it. Open index.html?dev, or press ` (backtick).
// The same tools work from the console: DEV.walk(), DEV.sim('smart', 200), DEV.skip(60), DEV.jump('event:lev_barrow').
const DEV = (() => {
  let panel = null, out = null;
  const NUMS = ['day', 'strength', 'bread', 'tobacco', 'brigade', 'eye'];
  const FLAGS = ['blade', 'partner', 'river', 'map', 'baptist', 'informer', 'betrayed', 'bootmakers', 'senkaGone'];
  const print = msg => { if (out) out.textContent = msg; console.log(msg); return msg; };
  // the dev tools never touch the player's save
  const testing = () => { STORE.testMode(); AUDIO.testMode(); if (typeof UI !== 'undefined') { UI.keepLabel(); UI.refreshSound(); } };

  function readState() {
    if (!panel) return;
    for (const k of NUMS) { const v = panel.querySelector(`[name=${k}]`).value; if (v !== '') S[k] = Number(v); }
    for (const f of FLAGS) S.flags[f] = panel.querySelector(`[name=f_${f}]`).checked;
    S.lev.health = Number(panel.querySelector('[name=levh]').value || S.lev.health);
    S.lev.alive = panel.querySelector('[name=leva]').checked;
  }
  function fillState() {
    if (!panel || !S) return;
    for (const k of NUMS) panel.querySelector(`[name=${k}]`).value = S[k];
    for (const f of FLAGS) panel.querySelector(`[name=f_${f}]`).checked = !!S.flags[f];
    panel.querySelector('[name=levh]').value = S.lev.health;
    panel.querySelector('[name=leva]').checked = S.lev.alive;
  }

  function jump(name) {
    testing();
    const sc = TESTKIT.scenes()[name];
    if (!sc) return print('no scene ' + name);
    if (!S || S.flags.title) TESTKIT.fresh();
    if (!S.today) S.today = blankToday();
    S.flags.title = false;
    readState();
    if (sc.setup) sc.setup();
    FLOW.auto = null; FLOW.stop = null;
    drive(sc.run);
    fillState();
  }
  // play on, headlessly, with a bot, until the given day; then show where it stopped
  function skip(day, bot = 'smart') {
    testing();
    if (!S || S.flags.title) { TESTKIT.fresh(); drive(startDay); }
    const prev = RENDER;
    let scr = FLOW.screen, n = 0;
    RENDER = s => { scr = s; };
    try { while (scr && !scr.o.ending && S.day < day && n++ < 30000) choose(TESTKIT.BOTS[bot](scr) || scr.choices[0]); }
    finally { RENDER = prev; }
    if (scr) RENDER(scr);
    fillState();
    return print(`skipped to day ${S.day} (${fmtDate(S.day)}), playing ${bot}${scr && scr.o.ending ? ': the winter ended (' + scr.o.ending + ')' : ''}`);
  }
  // does every screen fit the window? Renders every scene and the heaviest screens of 42 winters,
  // and reports any that overflow and how far the page had to shrink. Resize the window and run again.
  function fit() {
    testing();
    const shots = TESTKIT.walk().seen.map(x => ({ name: x.scene, scr: x.scr, state: null }));
    const heavy = [], prevR = RENDER, prevS = S;
    RENDER = s => heavy.push({ name: 'day ' + S.day, scr: s, state: JSON.stringify(S),
      size: JSON.stringify([s.paras, s.notes, s.choices.map(c => c.label + (c.hint || '')), s.o.ledger, s.o.plan, s.o.record, s.run && s.run.days.length]).length });
    try {
      for (const bot of ['smart', 'escaper', 'careful']) for (let r = 0; r < 14; r++) {
        seed(900 + r * 13); FLOW.auto = null; drive(title);
        let n = 0;
        while (FLOW.screen && !FLOW.screen.o.ending && n++ < 3000) choose(TESTKIT.BOTS[bot](FLOW.screen) || FLOW.screen.choices[0]);
      }
    } finally { unseed(); RENDER = prevR; }
    heavy.sort((a, b) => b.size - a.size);
    const all = shots.concat(heavy.slice(0, 120));
    const right = document.getElementById('right'), left = document.getElementById('left');
    let shrunk = 0, low = 1;
    const over = [];
    for (const x of all) {
      S = x.state ? JSON.parse(x.state) : newState();
      if (!S.today) S.today = blankToday();
      UI.present(x.scr);
      const [kl, kr] = (document.body.dataset.fit || '1 1').split(' ').map(Number);
      const o = Math.max(right.scrollHeight - right.clientHeight, left.scrollHeight - left.clientHeight, document.documentElement.scrollHeight - innerHeight);
      if (kl < 1 || kr < 1) shrunk++;
      low = Math.min(low, kl, kr);
      if (o > 6) over.push(`${x.name}: ${o}px over at ${Math.round(Math.min(kl, kr) * 100)}%`);
    }
    S = prevS;
    if (FLOW.screen) UI.present(FLOW.screen);
    return print(`fit at ${innerWidth}×${innerHeight}: ${all.length} screens, ${shrunk} shrunk (smallest ${Math.round(low * 100)}%), ${over.length} overflow`
      + (over.length ? '\n  ' + [...new Set(over)].slice(0, 12).join('\n  ') : ''));
  }
  const walk = () => { testing(); return print(TESTKIT.walk().report); };
  // the thirty seconds on a choice: on or off (?notimer starts with it off); it waits while this panel is open
  const timer = on => print(`timer ${UI.timer(on) ? 'on: 30 s, then the default' : 'off'}`);
  const sim = (bot, n) => { testing(); return print(TESTKIT.sim(bot, n).report); };
  function dump() {
    testing();
    const text = TESTKIT.dump();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'script.txt';
    a.click();
    return print(`script.txt: ${text.split('\n').length} lines`);
  }

  function build() {
    const st = document.createElement('style');
    st.textContent = `
#dev{position:fixed;left:0;right:0;bottom:0;z-index:9;background:#1b1813;color:#d6cdb8;font:12px/1.5 ui-monospace,Menlo,monospace;padding:8px 12px;border-top:2px solid #8b2a1a;max-height:46vh;overflow:auto}
#dev .row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-bottom:6px}
#dev label{display:inline-flex;gap:4px;align-items:center;color:#9a917c}
#dev input[type=number]{width:54px;background:#0f0e0c;color:#d6cdb8;border:1px solid #4a4538;padding:1px 4px;font:inherit}
#dev select,#dev button{background:#0f0e0c;color:#d6cdb8;border:1px solid #4a4538;padding:2px 8px;font:inherit;cursor:pointer}
#dev button:hover{border-color:#c9a16a;color:#c9a16a}
#dev pre{margin:4px 0 0;white-space:pre-wrap;color:#9a917c}
#dev b{color:#c9a16a;font-weight:500}`;
    document.head.appendChild(st);
    panel = document.createElement('div');
    panel.id = 'dev';
    panel.innerHTML = `
<div class="row"><b>dev</b>
  <select name="scene">${Object.keys(TESTKIT.scenes()).map(k => `<option>${k}</option>`).join('')}</select>
  <button data-a="jump">jump</button>
  <label>skip to day <input type="number" name="skipto" value="60"></label><button data-a="skip">skip</button>
  <button data-a="read">← read state</button>
  <span style="flex:1"></span>
  <button data-a="walk">walk</button>
  <button data-a="random">random ×100</button>
  <button data-a="careful">careful ×100</button>
  <button data-a="smart">smart ×100</button>
  <button data-a="escaper">escaper ×100</button>
  <button data-a="dump">dump script</button>
  <button data-a="fit">does it fit?</button>
  <button data-a="timer">timer</button>
  <button data-a="close">close</button>
</div>
<div class="row">${NUMS.map(k => `<label>${k} <input type="number" name="${k}"></label>`).join('')}
  <label>lev <input type="number" name="levh"></label><label><input type="checkbox" name="leva">alive</label></div>
<div class="row">${FLAGS.map(f => `<label><input type="checkbox" name="f_${f}">${f}</label>`).join('')}</div>
<pre></pre>`;
    document.body.appendChild(panel);
    out = panel.querySelector('pre');
    panel.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      const run = {
        jump: () => jump(panel.querySelector('[name=scene]').value),
        skip: () => skip(Number(panel.querySelector('[name=skipto]').value)),
        read: fillState, walk, dump, fit, timer,
        random: () => sim('random', 100), careful: () => sim('careful', 100), smart: () => sim('smart', 100), escaper: () => sim('escaper', 100),
        close: toggle,
      }[a];
      if (run) setTimeout(run, 0);
    });
    panel.addEventListener('keydown', e => e.stopPropagation());
    fillState();
  }
  function toggle() {
    testing();
    if (!panel) return build();
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
    if (panel.style.display === '') fillState();
  }
  document.addEventListener('keydown', e => { if (e.key === '`') toggle(); });
  // deep links: ?dev opens the panel; ?seed=7 fixes the dice; ?skip=60 plays on to day 60;
  // ?scene=event:lev_barrow opens a scene; ?state={"strength":20} sets state first; ?still turns animation off;
  // ?notimer: no clock on the choices (ui.js reads it)
  const q = new URLSearchParams(location.search);
  if (q.has('still')) { const st = document.createElement('style'); st.textContent = '*{animation:none !important;transition:none !important}'; document.head.appendChild(st); }
  if (q.has('seed')) seed(Number(q.get('seed')) || 1);
  setTimeout(() => {
    if (q.has('skip')) skip(Number(q.get('skip')) || 30, q.get('bot') || 'smart');
    if (q.has('scene')) {
      if (!S || S.flags.title) TESTKIT.fresh();
      if (q.has('state')) { try { const o = JSON.parse(q.get('state')); for (const k in o) { if (typeof o[k] === 'object' && S[k]) Object.assign(S[k], o[k]); else S[k] = o[k]; } } catch (e) { print('bad state: ' + e.message); } }
      S.today = S.today || blankToday();
      const sc = TESTKIT.scenes()[q.get('scene')];
      if (sc) { if (sc.setup) sc.setup(); FLOW.auto = null; drive(sc.run); } else print('no scene ' + q.get('scene'));
    }
    if (q.has('variant')) FRAME.variant(Number(q.get('variant')));
    if (q.has('frame')) FRAME.set(q.get('frame'));   // look at one frame, with its living overlay
    // ?glpair: after the picture has loaded, render the living print with the camera panned left and
    // right (same zoom, same boil state) and put both renders in the page, for checking parallax headlessly
    if (q.has('glpair')) setTimeout(() => {
      const c = document.getElementById('gl');
      if (!c || !GLFRAME.active()) { document.body.insertAdjacentHTML('beforeend', '<pre id="glpair">no webgl</pre>'); return; }
      const shots = [];
      for (const x of [-6, 6]) { GLFRAME.draw({ s: 1.16, x, y: 0 }, 0); shots.push(c.toDataURL('image/png')); }
      for (const t of [125, 250]) { GLFRAME.draw({ s: 1.16, x: -6, y: 0 }, t); shots.push(c.toDataURL('image/png')); }   // the other boil states
      const cam = [];
      document.body.insertAdjacentHTML('beforeend', `<pre id="glpair">${shots.join('\n')}\nCAM ${JSON.stringify(FRAME.cam())}</pre>`);
    }, 3500);
    // ?frame=x&fxcheck: after three seconds, write the overlay's coverage as a 6×4 grid into the page,
    // for checking effects without eyes (headless Chrome --dump-dom). Each cell: mean alpha, and how many warm pixels.
    if (q.has('fxcheck')) setTimeout(() => {
      const c = document.getElementById('fx'), g = c.getContext('2d'), cols = 6, rows = 4, grid = [];
      for (let r = 0; r < rows; r++) {
        const line = [];
        for (let k = 0; k < cols; k++) {
          const w = Math.floor(c.width / cols), h = Math.floor(c.height / rows);
          const d = g.getImageData(k * w, r * h, w, h).data;
          let a = 0, warm = 0;
          for (let i = 0; i < d.length; i += 4) { a += d[i + 3]; if (d[i] > d[i + 2] + 40 && d[i + 3] > 8) warm++; }
          line.push(`${(a / (d.length / 4)).toFixed(1)}/${warm}`.padStart(9));
        }
        grid.push(line.join(' '));
      }
      const st = FX.state(), pre = document.createElement('pre');
      pre.id = 'fxcheck';
      pre.textContent = `FXCHECK ${st.name} ${Math.round(st.W)}x${Math.round(st.H)} snow ${st.snow} puffs ${st.puffs} t ${st.t}\n` + grid.join('\n') + '\nEND';
      document.body.appendChild(pre);
    }, 3000);
    if (q.has('dev')) toggle();
  }, 0);

  return { walk, sim, dump, jump, skip, toggle, fit, timer, scenes: () => Object.keys(TESTKIT.scenes()) };
})();
window.DEV = DEV;
