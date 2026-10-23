'use strict';
// The page. It renders finished screens: the status bar, the winter strip, the frame, the text,
// the cards (the night's account, the wire, the camp record) and the choices. It never changes the game.

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// typographer's quotes and apostrophes
const typeset = s => String(s).replace(/"([^"]*)"/g, '“$1”').replace(/'/g, '’');
const tx = s => esc(typeset(s));   // typeset, then escape

const UI = (() => {
  const top = $('#top'), text = $('#text'), cards = $('#cards'), choicesEl = $('#choices'), snd = $('#snd'), keep = $('#keep');
  let current = null, last = {}, lockUntil = 0, held = false, holdId = 0;

  // ---------- status ----------
  function meter(key, label, pct, word, tip) {
    const v = Math.round(clamp(pct, 0, 100));
    const d = last[key] === undefined ? 0 : v - last[key];
    last[key] = v;
    const cls = d < -1 ? ' down' : d > 1 ? ' up' : '';
    return `<span class="m${cls}" title="${esc(tip)}"><i>${label}</i><span class="bar"><b style="width:${v}%"></b></span><em>${esc(word)}</em></span>`;
  }
  function thing(key, label, value, tip) {
    const d = last[key] === undefined ? 0 : value - last[key];
    last[key] = value;
    return `<span class="t${d < 0 ? ' down' : d > 0 ? ' up' : ''}" title="${esc(tip)}">${label} <b>${esc(value)}${key === 'bread' ? ' g' : ''}</b></span>`;
  }
  const MONTH_STARTS = [[1, 'Jan'], [30, 'Feb'], [58, 'Mar'], [89, 'Apr']];
  function renderTop(o) {
    if (o.title || !S || S.flags.title) { top.classList.add('bare'); $('#idline').innerHTML = ''; last = {}; return; }
    top.classList.remove('bare');
    const h = planHas();
    const pip = (k, t) => `<i class="${h[k] ? 'on' : ''}" title="${esc(t)}${h[k] ? ': yes' : ': not yet'}"></i>`;
    $('#idline').innerHTML = `<b>${NUMBER}</b> · ${fmtDate(S.day)} 1951 · <b>${tempShort()}</b>${S.extra ? ' · <span class="red">ten more years</span>' : ''}`;
    $('#meters').innerHTML = [
      meter('body', 'body', S.strength, bodyWord(), 'Your strength. Bread, soup, warmth and sleep put it back; cold, work and the cells take it.'),
      meter('brigade', 'brigade', S.brigade + 50, brigadeWord(), 'What the brigade thinks of you. Men they like get second bowls and help.'),
      meter('eye', 'the eye', S.eye, eyeWord(), 'How much the warders notice you. The more they notice, the more they search.'),
      thing('bread', 'kept', S.bread, 'Bread kept back. Food for a bad day, or for three days on the ice.'),
      thing('tobacco', 'tobacco', S.tobacco, 'The camp\'s money.'),
      `<span class="t wire" title="The wire: what an escape needs">the wire <span class="pips">${pip('blade', 'a blade')}${pip('bread', '600 g of bread')}${pip('partner', 'someone who has done it')}${pip('route', 'the way')}</span></span>`,
    ].join('');
    const hist = {};
    for (const d of S.history) hist[d.day] = d.v;
    let cells = '';
    for (let d = 1; d <= ICE_OUT_DAY; d++) cells += `<i class="${hist[d] ? 'd-' + hist[d] : ''}${d === S.day ? ' now' : ''}"></i>`;
    $('#strip').innerHTML = cells;
    $('#months').innerHTML = MONTH_STARTS.map(([d, m]) => `<span style="left:${((d - 1) / ICE_OUT_DAY * 100).toFixed(2)}%">${m}</span>`).join('')
      + '<span class="end"><span class="long">May · the ice goes out</span><span class="short">ice out</span></span>';
  }

  // ---------- text ----------
  function paraHtml(p, i) {
    const st = `style="--i:${i}"`;
    if (p.startsWith('# ')) return `<h1 ${st}>${esc(p.slice(2))}</h1>`;
    if (p.startsWith('~ ')) return `<p class="small" ${st}>${tx(p.slice(2))}</p>`;
    if (p.startsWith('> ')) return `<p class="q" ${st}>${tx(p.slice(2))}</p>`;
    if (p.startsWith('" ')) {
      const [q, who] = p.slice(2).split(' || ');
      return `<blockquote class="ep" ${st}>${tx(q)}<cite>${esc(who || '')}</cite></blockquote>`;
    }
    return `<p ${st}>${tx(p)}</p>`;
  }
  function runHtml(r) {
    if (!r) return '';
    const n = r.days.length, lines = [];
    if (n) {
      lines.push(`${numberWord(n, true)} ${plural(n, 'day passes', 'days pass')}, lived the way you lived the last.`);
      const b0 = bodyWord(r.fromStrength), b1 = bodyWord();
      if (b0 !== b1) lines.push(`Body: ${b0} → ${b1}.`);
      if (S.bread !== r.fromBread) lines.push(`Kept: ${r.fromBread} → ${S.bread} g of bread.`);
      if (S.tobacco !== r.fromTobacco) lines.push(`Tobacco: ${r.fromTobacco} → ${S.tobacco}.`);
    }
    const notes = [...new Set(r.days.flatMap(d => d.notes))].slice(-5);
    if (!n && !r.reason) return '';
    return `<div class="run" style="--i:0">`
      + (n ? `<div class="marks">${r.days.map(d => `<i class="d-${d.v}" title="${esc(fmtDate(d.day))}: ${esc(VERDICTS[d.v])}"></i>`).join('')}</div>` : '')
      + lines.map(l => `<p>${esc(l)}</p>`).join('')
      + (notes.length ? `<ul>${notes.map(t => `<li>${tx(t)}</li>`).join('')}</ul>` : '')
      + (r.reason ? `<p class="reason">${tx(r.reason)}</p>` : '')
      + '</div>';
  }
  function ledgerHtml(l) {
    return `<div class="card ledger" style="--i:0"><div class="hd"><span>${esc(l.date)} 1951</span><span>day ${l.day}</span></div>`
      + `<ul>${l.lines.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`
      + (l.good && l.good.length ? `<div class="good"><span>What was good</span><ul>${l.good.map(x => `<li>${tx(x)}</li>`).join('')}</ul></div>` : '')
      + `<div class="v v-${l.kind}">${esc(l.verdict)}</div></div>`;
  }
  function planHtml(p) {
    return `<div class="card plan" style="--i:1"><div class="hd"><span>The wire</span><span>${p.have} of 4</span></div><ul>`
      + p.items.map(it => `<li class="${it.have ? 'have' : ''}"><b>${it.have ? '☒' : '☐'}</b>${tx(it.name)}<small>${tx(it.where)}</small></li>`).join('')
      + `</ul><div class="odds"><span>The fence: <em>${esc(p.fence)}</em></span><span>The ice: <em>${esc(p.ice)}</em></span></div></div>`;
  }
  function offerHtml() {
    return `<div class="card keep-offer" style="--i:1"><p>Keep your place in this browser? Then you can close the page and come back to the same morning. It stays on this computer.</p>`
      + `<div class="opts"><button type="button" data-keep="browser">Keep my place</button><button type="button" data-keep="tab">Only while this tab is open</button></div></div>`;
  }
  function recordHtml(r) {
    return `<div class="card record record-${r.kind}" style="--i:0"><div class="hd"><span>Лагерное дело · camp record</span><span>${esc(NUMBER)}</span></div>`
      + `<dl>${r.fields.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
      + `<div class="outcome">${esc(r.outcome)}</div><div class="stamp">${esc(r.stamp)}</div></div>`;
  }
  function unsaidHtml(r, i) {
    return `<div class="unsaid" style="--i:${i}"><div class="sub">What the record does not say</div><ul>${r.unsaid.map(u => `<li>${tx(u)}</li>`).join('')}</ul></div>`;
  }

  // ---------- a screen ----------
  function present(scr) {
    current = scr;
    lockUntil = performance.now() + 140;
    const o = scr.o;
    document.body.classList.toggle('title', !!o.title);
    document.body.classList.toggle('ending', !!o.ending);
    renderTop(o);
    AUDIO.scene(o);
    if (S && !o.title) FRAME.mood(S.day, S.strength);
    FRAME.screen(o);   // the picture, its camera move (o.cam) and any sequence (o.seq)
    if ('amb' in o) AUDIO.ambient(o.amb, o.scape);   // o.scape: the place's layers, when not the ambience's own
    if (o.sfx) AUDIO.snd(o.sfx);
    for (const c of scr.cues || []) AUDIO.snd(c);
    // a story screen holds its choices until the voice has finished, or for a short reading time
    const story = !!(o.story && !o.routine);
    const chars = scr.paras.join(' ').length;
    const minHold = story ? clamp(chars * 13, 1100, 4200) : 0;
    const id = ++holdId;
    held = story;
    const t0 = performance.now();
    let voiced = !o.voice;
    const release = () => {
      if (id !== holdId || !held) return;
      const wait = minHold - (performance.now() - t0);
      if (!voiced || wait > 0) return void setTimeout(release, Math.max(60, wait));
      held = false;
      choicesEl.classList.remove('held');
    };
    if (o.voice) AUDIO.say(o.voice, () => { voiced = true; release(); });
    if (story) setTimeout(release, minHold);
    setTimeout(() => { voiced = true; release(); }, 45000);   // never wait forever
    if (S) AUDIO.body(S.strength);

    // documents go under the picture: what the days that ran left behind, the record, the night's account, the wire
    const docs = [];
    if (scr.run) docs.push(runHtml(scr.run));
    if (o.record) docs.push(recordHtml(o.record));
    if (o.ledger) docs.push(ledgerHtml(o.ledger));
    if (o.ledger && STORE.mode() === null && S.day <= 3) docs.push(offerHtml());
    if (o.plan) docs.push(planHtml(o.plan));
    for (const el of [...flow.querySelectorAll(':scope > .moved')]) el.remove();   // last screen's documents
    cards.innerHTML = docs.join('');
    // the prose goes beside it
    const parts = [];
    let i = 0;
    for (const n of scr.notes || []) parts.push(`<p class="note" style="--i:${i++}">${tx(n)}</p>`);
    const paras = scr.paras.slice();
    const quote = o.record && paras.length && paras[paras.length - 1].startsWith('" ') ? paras.pop() : null;
    for (const p of paras) parts.push(paraHtml(p, i++));
    if (o.record) parts.push(unsaidHtml(o.record, i++));
    if (quote) parts.push(paraHtml(quote, i++));
    text.innerHTML = parts.join('');

    choicesEl.classList.toggle('held', held);
    choicesEl.innerHTML = scr.choices.map((c, k) =>
      `<button type="button" data-k="${k}" class="${c.id === 'go' ? 'danger' : ''}" style="--i:${k}"><span class="k">${k + 1}</span>`
      + `<span class="l">${tx(c.label)}${c.hint ? `<small>${tx(c.hint)}</small>` : ''}</span></button>`).join('');
    window.scrollTo(0, 0);
    fit();
  }

  // ---------- every screen fits the window on a desktop ----------
  // Two columns fill the window. The picture gives up height to the documents under it; if a column
  // still does not fit, its contents are scaled down a little at a time, to no less than 70%.
  const left = $('#left'), right = $('#right'), flow = $('#flow');
  const wide = () => matchMedia('(min-width: 960px) and (min-height: 560px)').matches;
  function shrink(box, inner) {
    inner.style.zoom = '';
    if (!wide()) return 1;
    let k = 1;
    while (box.scrollHeight > box.clientHeight + 6 && k > .8) { k = Math.round((k - .04) * 100) / 100; inner.style.zoom = k; }
    return k;
  }
  // The documents start under the picture. If that column is crowded and the prose column has room,
  // they move across one at a time, above the prose (the summary first, then the offer, then the
  // night's account), before anything is shrunk.
  const MOVABLE = ['.run', '.keep-offer', '.ledger'];
  // lay out, shrinking where needed; report how far it overflows and how small it had to get
  function measure() {
    const kr = shrink(right, flow), kl = shrink(left, cards);
    const over = Math.max(0, right.scrollHeight - right.clientHeight - 6) + Math.max(0, left.scrollHeight - left.clientHeight - 6);
    return { kl, kr, over, low: Math.min(kl, kr) };
  }
  const better = (a, b) => a.over !== b.over ? a.over < b.over : a.low > b.low;
  function fit() {
    for (const el of [...flow.querySelectorAll(':scope > .moved')]) { el.classList.remove('moved'); cards.appendChild(el); }
    let best = measure(), bestMoved = 0;
    const docs = MOVABLE.map(sel => cards.querySelector(':scope > ' + sel)).filter(Boolean);
    if (wide() && (best.over || best.low < 1) && docs.length) {
      // try moving the first one, then the first two, and so on; keep the best arrangement
      for (let k = 1; k <= docs.length; k++) {
        const el = docs[k - 1];
        el.classList.add('moved');
        flow.insertBefore(el, text);
        const m = measure();
        if (better(m, best)) { best = m; bestMoved = k; }
      }
      for (let k = docs.length; k > bestMoved; k--) { const el = docs[k - 1]; el.classList.remove('moved'); cards.appendChild(el); }
      best = measure();
    }
    document.body.dataset.fit = `${best.kl} ${best.kr}`;
  }
  addEventListener('resize', () => { clearTimeout(fit.t); fit.t = setTimeout(fit, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  function pickChoice(k) {
    if (!current || held || performance.now() < lockUntil) return;
    const ch = current.choices[k];
    if (ch) choose(ch);
  }
  choicesEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (b) pickChoice(+b.dataset.k);
  });
  document.addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { e.preventDefault(); pickChoice(n - 1); }
    else if (e.key === 'Enter' && current && current.choices.length === 1 && !(e.target && e.target.tagName === 'BUTTON')) pickChoice(0);
  });
  // ---------- keeping your place ----------
  const KEEP_LABEL = {
    browser: ['saving: this browser', 'Your place is kept in this browser at the start of each day. Click to keep it only while this tab is open.'],
    tab: ['saving: this tab', 'Your place is kept only while this tab is open. Click to keep it in this browser, so you can come back later.'],
    test: ['test mode: nothing saved', 'Opened with a dev link or the dev panel, so this page reads and writes no saves.'],
  };
  function keepLabel() {
    const m = STORE.mode() || 'tab';
    keep.textContent = KEEP_LABEL[m][0];
    keep.title = KEEP_LABEL[m][1];
    keep.classList.toggle('test', m === 'test');
  }
  function setKeep(m) {
    STORE.setMode(m);
    keepLabel();
  }
  keep.addEventListener('click', () => { const m = STORE.mode(); if (m !== 'test') setKeep(m === 'browser' ? 'tab' : 'browser'); });
  cards.addEventListener('click', e => {
    const b = e.target.closest('button[data-keep]');
    if (!b) return;
    setKeep(b.dataset.keep);
    b.closest('.keep-offer').innerHTML = `<p>${b.dataset.keep === 'browser'
      ? 'Kept in this browser. You can close the page and come back.'
      : 'Kept only while this tab is open.'} You can change this at the top of the page.</p>`;
  });
  keepLabel();

  const sndLabel = () => { snd.textContent = AUDIO.isOn() ? 'sound on' : 'sound off'; };
  snd.addEventListener('click', () => { AUDIO.unlock(); AUDIO.toggle(); sndLabel(); });
  sndLabel();

  return { present, keepLabel, fit, refreshSound: sndLabel, refresh: () => current && present(current) };
})();
RENDER = UI.present;
