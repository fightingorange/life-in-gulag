'use strict';
// Dev panel: test the game without playing it.
// Open index.html?dev or press ` (backtick). Also usable from the console: DEV.walk(), DEV.sim('random', 200), DEV.dump().
const DEV = (() => {
  const api = { silent: false, onShow: null };

  // every scene, with the setup it needs to be reachable
  const SCENES = {
    title: () => title(), intro: () => intro(), reveille: () => reveille(),
    cells: () => cellsDay('The inspector checked the sheet. Your name was on it.'),
    sickDay: () => sickDay(), count: () => count(), breakfast: () => breakfast(), barracksDay: () => barracksDay(),
    work: () => work(), bootmakers: () => { S.flags.bootmakers = true; work(); }, foundBlade: () => foundBlade(),
    midday: () => midday(),
    evFomin: () => evFomin(), evLevBread: () => evLevBread(), evTufta: () => evTufta(), evParcel: () => evParcel(),
    evSenka: () => evSenka(), evKuzma: () => evKuzma(), evLetter: () => evLetter(),
    evName: () => { S.flags.informer = true; evName(); }, evFoundOut: () => { S.flags.informer = true; evFoundOut(); },
    evLevQuote: () => { S.lev.helped = 2; evLevQuote(); }, evLevDeath: () => { S.lev.refused = 2; evLevDeath(); },
    eveningGate: () => eveningGate(), dinner: () => dinner(), night: () => night(),
    plan: () => { if (!planItems()) S.flags.river = true; plan(); },
    escape: () => { if (!planItems()) S.flags.river = true; escape(); },
    endDay: () => endDay(), die: () => die(),
  };

  function fresh() {
    if (!S || S.flags.title) S = newState();
    if (S.today.startStrength === undefined) S.today = { startStrength: S.strength, cells: false, bowl: false, quota: true, lost: false, tobaccoGain: false };
  }
  const snap = () => JSON.stringify(S);
  const restore = j => { S = JSON.parse(j); };

  // ---- capture: run a scene with show() recording instead of rendering
  function capture(fn) {
    const out = [];
    api.onShow = (paras, choices, o) => { out.push({ paras, choices, o: o || {} }); return true; };
    try { fn(); } catch (e) { out.push({ error: e && e.stack ? e.stack.split('\n')[0] : String(e) }); }
    api.onShow = null;
    return out;
  }

  // ---- walk: every scene, then every choice on every screen it produced
  function walk(log = true) {
    const errors = [], seen = [];
    let screens = 0, choices = 0;
    const start = snap();
    for (const [name, fn] of Object.entries(SCENES)) {
      restore(start); fresh();
      const base = snap();
      const shown = capture(fn);
      for (const sc of shown) {
        if (sc.error) { errors.push(`${name}: ${sc.error}`); continue; }
        screens++;
        seen.push({ scene: name, paras: sc.paras, labels: sc.choices.map(c => c.label), o: sc.o });
        sc.choices.forEach((ch, i) => {
          choices++;
          restore(base); fresh();
          const after = capture(() => ch.fn());
          for (const a of after) {
            if (a.error) errors.push(`${name} > "${ch.label}": ${a.error}`);
            else { screens++; seen.push({ scene: `${name} > ${ch.label}`, paras: a.paras, labels: a.choices.map(c => c.label), o: a.o }); }
          }
        });
      }
    }
    restore(start);
    api.onShow = null;
    const report = `walk: ${Object.keys(SCENES).length} scenes, ${screens} screens, ${choices} choices, ${errors.length} errors` + (errors.length ? '\n' + errors.join('\n') : '');
    if (log) print(report);
    return { report, seen, errors };
  }

  // ---- sims: bots clicking the real buttons, with rendering but no sound or frames
  const CAREFUL = ['Get up.', 'Stand.', 'Back to the hut', 'Eat all of it', 'Work. Properly.', 'Into the zone', 'Work the queue', 'Eat your bowl', 'Sleep.', 'Go on.',
    'Remember it', 'Look away', 'Carry it. Take nothing', "I don't notice", 'Look at the barrow', 'Put my name', "Don't write", 'Let the day go', 'Sit.', 'Eat.',
    'Kick sawdust', 'Eat it.', 'Say nothing', 'Begin.', 'Wake.', 'Again.'];
  function sim(kind = 'random', runs = 100, log = true) {
    const was = snap();
    api.silent = true;
    S = newState(); title();
    const days = [], ends = {}; let errs = [], clicks = 0;
    const onerr = e => errs.push(String(e.message || e));
    window.addEventListener('error', onerr);
    try {
      while (days.length < runs && clicks < 400000) {
        const bs = [...document.querySelectorAll('#choices button')];
        if (!bs.length) { errs.push('no buttons at click ' + clicks); break; }
        let b = null;
        if (kind === 'careful') { for (const p of CAREFUL) { b = bs.find(x => x.textContent.includes(p)); if (b) break; } }
        if (!b) b = bs[Math.floor(Math.random() * bs.length)];
        if (b.textContent.includes('Again.')) {
          const k = document.querySelector('#text').innerText.split('\n')[0].slice(0, 34);
          ends[k] = (ends[k] || 0) + 1; days.push(S.day);
        }
        b.click(); clicks++;
      }
    } finally {
      window.removeEventListener('error', onerr);
      api.silent = false;
      restore(was);
      if (S.flags.title) title(); else status();
    }
    days.sort((a, b) => a - b);
    const q = p => days[Math.min(days.length - 1, Math.floor(days.length * p))] || 0;
    const report = `${kind} x${days.length}: days min ${days[0] || 0}, median ${q(.5)}, p90 ${q(.9)}, max ${days[days.length - 1] || 0}, ${clicks} clicks\n` +
      Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${String(v).padStart(4)}  ${k}`).join('\n') +
      (errs.length ? `\nerrors:\n${errs.slice(0, 10).join('\n')}` : '');
    if (log) print(report);
    return { days, ends, errs, report };
  }

  // ---- dump: the whole script as text, for reading without playing
  function dump() {
    const { seen, errors } = walk(false);
    const strip = p => p.replace(/^[#~>"] /, '').replace(' || ', ' — ');
    const lines = [];
    let last = '';
    for (const s of seen) {
      const head = s.scene.split(' > ')[0];
      if (head !== last) { lines.push(`\n==== ${head} ====`); last = head; }
      if (s.scene.includes(' > ')) lines.push(`\n  -- after "${s.scene.split(' > ')[1]}"`);
      lines.push(...s.paras.map(p => '  ' + strip(p)));
      if (s.labels.length) lines.push('  ' + s.labels.map((l, i) => `[${i + 1}] ${l}`).join('   '));
    }
    if (errors.length) lines.push('\n==== errors ====', ...errors);
    const text = lines.join('\n').trim() + '\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'script.txt'; a.click();
    print(`dump: ${seen.length} screens written to script.txt`);
    return text;
  }

  // ---- jump to a scene with the state from the panel
  function jump(name) {
    fresh();
    readState();
    S.flags.title = false;
    SCENES[name]();
  }

  // ---- panel
  let panel, out;
  const FLAGS = ['blade', 'partner', 'river', 'informer', 'betrayed', 'bootmakers'];
  const NUMS = ['day', 'strength', 'bread', 'tobacco', 'brigade', 'eye'];
  function print(msg) { if (out) { out.textContent = msg; } console.log(msg); }
  function readState() {
    for (const k of NUMS) { const v = panel.querySelector(`[name=${k}]`).value; if (v !== '') S[k] = Number(v); }
    for (const f of FLAGS) S.flags[f] = panel.querySelector(`[name=f_${f}]`).checked;
    S.lev.helped = Number(panel.querySelector('[name=helped]').value || 0);
    S.lev.refused = Number(panel.querySelector('[name=refused]').value || 0);
    if (S.flags.informer && S.flags.informerDay === undefined) S.flags.informerDay = 0;
  }
  function fillState() {
    if (!S) return;
    for (const k of NUMS) panel.querySelector(`[name=${k}]`).value = S[k];
    for (const f of FLAGS) panel.querySelector(`[name=f_${f}]`).checked = !!S.flags[f];
    panel.querySelector('[name=helped]').value = S.lev.helped;
    panel.querySelector('[name=refused]').value = S.lev.refused;
  }
  function build() {
    const st = document.createElement('style');
    st.textContent = `
#dev{position:fixed;left:0;right:0;bottom:0;z-index:9;background:#1b1813;color:#d6cdb8;font:12px/1.5 ui-monospace,Menlo,monospace;padding:8px 12px;border-top:2px solid #8b2a1a;max-height:45vh;overflow:auto}
#dev .row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-bottom:6px}
#dev label{display:inline-flex;gap:4px;align-items:center;color:#9a917c}
#dev input[type=number]{width:52px;background:#0f0e0c;color:#d6cdb8;border:1px solid #4a4538;padding:1px 4px;font:inherit}
#dev select,#dev button{background:#0f0e0c;color:#d6cdb8;border:1px solid #4a4538;padding:2px 8px;font:inherit;cursor:pointer}
#dev button:hover{border-color:#c9a16a;color:#c9a16a}
#dev pre{margin:4px 0 0;white-space:pre-wrap;color:#9a917c}
#dev b{color:#c9a16a;font-weight:500}`;
    document.head.appendChild(st);
    panel = document.createElement('div'); panel.id = 'dev';
    panel.innerHTML = `
<div class="row"><b>dev</b>
  <select name="scene">${Object.keys(SCENES).map(k => `<option>${k}</option>`).join('')}</select>
  <button data-a="jump">jump</button>
  <button data-a="read">← read state</button>
  <span style="flex:1"></span>
  <button data-a="walk">walk all scenes</button>
  <button data-a="random">random ×200</button>
  <button data-a="careful">careful ×50</button>
  <button data-a="dump">dump script</button>
  <button data-a="close">close</button>
</div>
<div class="row">${NUMS.map(k => `<label>${k} <input type="number" name="${k}"></label>`).join('')}
  <label>lev helped <input type="number" name="helped"></label><label>refused <input type="number" name="refused"></label></div>
<div class="row">${FLAGS.map(f => `<label><input type="checkbox" name="f_${f}">${f}</label>`).join('')}</div>
<pre></pre>`;
    document.body.appendChild(panel);
    out = panel.querySelector('pre');
    panel.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      ({ jump: () => jump(panel.querySelector('[name=scene]').value), read: fillState, walk: () => walk(),
         random: () => sim('random', 200), careful: () => sim('careful', 50), dump, close: toggle })[a]();
    });
    panel.addEventListener('keydown', e => e.stopPropagation());   // number keys in the inputs must not pick choices
    fillState();
  }
  function toggle() {
    if (!panel) build();
    else { panel.style.display = panel.style.display === 'none' ? '' : 'none'; if (panel.style.display === '') fillState(); }
  }
  document.addEventListener('keydown', e => { if (e.key === '`') toggle(); });
  if (/[?&]dev\b/.test(location.search)) toggle();

  return Object.assign(api, { walk, sim, dump, jump, capture, scenes: Object.keys(SCENES), toggle });
})();
window.DEV = DEV;
