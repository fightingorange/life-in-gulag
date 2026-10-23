'use strict';
// The dev panel: test the game without playing it. Open index.html?dev, or press ` (backtick).
// The same tools work from the console: DEV.walk(), DEV.sim('smart', 200), DEV.skip(60), DEV.jump('event:lev_barrow').
const DEV = (() => {
  let panel = null, out = null;
  const NUMS = ['day', 'strength', 'bread', 'tobacco', 'brigade', 'eye'];
  const FLAGS = ['blade', 'partner', 'river', 'map', 'baptist', 'informer', 'betrayed', 'bootmakers', 'senkaGone'];
  const print = msg => { if (out) out.textContent = msg; console.log(msg); return msg; };

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
  const walk = () => print(TESTKIT.walk().report);
  const sim = (bot, n) => print(TESTKIT.sim(bot, n).report);
  function dump() {
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
  <button data-a="clear">clear save</button>
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
        read: fillState, walk, dump,
        random: () => sim('random', 100), careful: () => sim('careful', 100), smart: () => sim('smart', 100), escaper: () => sim('escaper', 100),
        clear: () => { STORE.clear(); print('save cleared'); },
        close: toggle,
      }[a];
      if (run) setTimeout(run, 0);
    });
    panel.addEventListener('keydown', e => e.stopPropagation());
    fillState();
  }
  function toggle() {
    if (!panel) return build();
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
    if (panel.style.display === '') fillState();
  }
  document.addEventListener('keydown', e => { if (e.key === '`') toggle(); });
  // deep links: ?dev opens the panel; ?seed=7 fixes the dice; ?skip=60 plays on to day 60;
  // ?scene=event:lev_barrow opens a scene; ?state={"strength":20} sets state first; ?still turns animation off
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
    if (q.has('dev')) toggle();
  }, 0);

  return { walk, sim, dump, jump, skip, toggle, scenes: () => Object.keys(TESTKIT.scenes()) };
})();
window.DEV = DEV;
