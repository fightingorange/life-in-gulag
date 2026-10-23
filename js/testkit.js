'use strict';
// Testing without playing. Shared by the dev panel in the browser and tests/run.js in Node.
//   walk()            every scene, then every choice on every screen it shows; reports errors
//   sim(bot, runs)    whole winters played by a bot; survival and endings
//   dump()            the whole script as text
//   audit()           every frame, sound and voice line the game asks for
const TESTKIT = (() => {
  // ---- headless capture: run something and collect the screens instead of rendering them
  function capture(fn) {
    const prev = RENDER, out = [];
    RENDER = scr => out.push(scr);
    FLOW.auto = null; FLOW.stop = null; FLOW.inline.length = 0; FLOW.cues.length = 0;
    try { drive(fn); }
    catch (e) { out.push({ error: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }); }
    finally { RENDER = prev; }
    return out;
  }
  function fresh(overrides) {
    S = newState();
    S.flags.title = false;
    S.today = blankToday();
    if (overrides) Object.assign(S, overrides);
  }

  // ---- every reachable scene
  function scenes() {
    const list = {};
    const day = { reveille, count, breakfast, work, barracksDay, infirmary, foundBlade, noon, quietNoon, eveningGate, dinner, night, endDay, plan, escape, levDeath, sickDay };
    for (const k in day) list['day:' + k] = { run: day[k] };
    list['day:cells'] = { run: () => cellsDay('Test.') };
    list['day:bootmakers'] = { setup: () => { S.flags.bootmakers = true; }, run: work };
    list['day:title'] = { run: title };
    const escSetup = () => { S.flags.blade = true; S.flags.partner = true; S.flags.river = true; S.bread = 600; S.today.blizzard = true;
      S.esc = { partner: true, bread: 600, blade: true, route: true, map: false, temp: -28, blizzard: true, thaw: false, strength: 60, days: 1, cause: null, gave: null }; };
    list['esc:firstNight'] = { setup: escSetup, run: firstNight };
    list['esc:settlement'] = { setup: () => { escSetup(); S.esc.days = 3; S.tobacco = 3; }, run: settlement };
    list['esc:day2hut'] = { setup: () => { escSetup(); S.esc.days = 2; }, run: () => day2('hut') };
    list['day:intro'] = { run: intro };
    // the arrival (arrival.js): the wagon, the march, the gate, the guardhouse, the hut, the first supper
    const met = () => { S.flags.metLev = true; S.flags.metSenka = true; S.flags.struck = true; };
    const arr = { crack: arrCrack, railhead: arrRailhead, rule: arrRule, march: arrMarch, whisper: arrWhisper, hours: arrHours,
      lookBack: arrLookBack, lights: arrLights, gate: arrGate, process: arrProcess, hut: arrHut, supper: arrSupper, sleep: arrSleep };
    for (const k in arr) list['arr:' + k] = { setup: met, run: arr[k] };
    list['arr:silenced'] = { run: () => arrSilenced('senka') };
    list['arr:searchPhoto'] = { run: () => arrSearch('photo') };
    list['arr:searchMoney'] = { run: () => arrSearch('money') };
    list['arr:boots'] = { setup: met, run: () => arrBoots(true) };
    list['arr:ask'] = { setup: met, run: () => arrAsk(KUZMA_ANSWERS[3], ['q_bread']) };
    list['beat:boots_money'] = { setup: () => { S.day = 3; S.flags.money = true; S.brigade = 12; }, run: () => runBeat(BEATS.find(b => b.id === 'boots')) };
    list['day:startDay'] = { run: startDay };
    for (const e of EVENTS) list['event:' + e.id] = { setup: e.setup, run: () => runEvent(e) };
    for (const b of BEATS) list['beat:' + b.id] = { setup: () => { S.day = b.day; if (b.id === 'stove') S.until.snap = 28; if (b.id === 'commission') S.until.inspection = 49; if (b.id === 'brought_back') S.flags.othersEscaped = 'two'; if (b.id === 'letter2') S.seen['beat:letter1'] = true; }, run: () => runBeat(b) };
    for (const k in ENDINGS) list['end:' + k] = { run: () => finish(k) };
    return list;
  }
  // a few different states, so conditional branches get visited
  const VARIANTS = [
    {},
    { strength: 25, bread: 650, tobacco: 4, brigade: 25, eye: 50, flags: { blade: true, partner: true, river: true, baptist: true }, day: 40 },
    { strength: 80, bread: 0, tobacco: 0, brigade: -40, eye: 80, flags: { senkaGone: true }, day: 125, temp: -10 },
  ];

  // ---- invariants
  function checkState(where, errs) {
    for (const k of ['day', 'strength', 'bread', 'tobacco', 'brigade', 'eye', 'extra'])
      if (typeof S[k] !== 'number' || !isFinite(S[k])) errs.push(`${where}: S.${k} is ${S[k]}`);
    if (S.strength < 0 || S.strength > 100) errs.push(`${where}: strength ${S.strength}`);
    if (S.bread < 0) errs.push(`${where}: bread ${S.bread}`);
    if (S.tobacco < 0) errs.push(`${where}: tobacco ${S.tobacco}`);
  }
  function screenText(scr) {
    const o = scr.o || {};
    return [...(scr.paras || []), ...(scr.notes || []), ...(scr.choices || []).map(c => c.label + ' ' + (c.hint || '')),
      ...(o.ledger ? [o.ledger.verdict, ...o.ledger.lines, ...(o.ledger.good || [])] : []),
      ...(o.plan ? o.plan.items.map(i => i.name + ' ' + i.where) : []),
      ...(o.record ? [o.record.outcome, ...o.record.unsaid, ...o.record.fields.map(f => f.join(' '))] : [])].join('\n');
  }
  function checkScreen(scr, where, errs) {
    if (scr.error) { errs.push(`${where}: ${scr.error}`); return; }
    if (!scr.choices || !scr.choices.length) errs.push(`${where}: no choices`);
    for (const c of scr.choices || []) if (typeof c.fn !== 'function') errs.push(`${where}: choice "${c.label}" has no fn`);
    if ((scr.paras || []).some(p => typeof p !== 'string' || !p.trim())) errs.push(`${where}: an empty paragraph`);
    const t = screenText(scr);
    const bad = t.match(/.{0,30}\b(undefined|NaN|null)\b.{0,20}|\[object [A-Za-z]+\]/);
    if (bad) errs.push(`${where}: bad text "${bad[0]}"`);
  }

  // ---- walk
  function walk() {
    const errs = [], seen = [];
    let screens = 0, choices = 0;
    const saved = S;
    for (const [name, sc] of Object.entries(scenes())) {
      VARIANTS.forEach((v, vi) => {
        for (let r = 0; r < 2; r++) {
          seed(1000 + vi * 31 + r * 7);
          fresh(JSON.parse(JSON.stringify(v)));
          if (v.flags) S.flags = Object.assign({ title: false }, v.flags);
          if (sc.setup) sc.setup();
          const base = JSON.stringify(S);
          const shown = capture(sc.run);
          for (const scr of shown) {
            checkScreen(scr, name, errs); screens++;
            if (scr.error) continue;
            if (vi === 0 && r === 0) seen.push({ scene: name, scr });
            scr.choices.forEach(ch => {
              choices++;
              S = JSON.parse(base);
              const after = capture(ch.fn);
              for (const a of after) {
                checkScreen(a, `${name} > ${ch.label}`, errs); screens++;
                if (!a.error && vi === 0 && r === 0) seen.push({ scene: `${name} > ${ch.label}`, scr: a });
              }
              checkState(`${name} > ${ch.label}`, errs);
            });
          }
        }
      });
    }
    unseed();
    S = saved;
    const uniq = [...new Set(errs)];
    return { errors: uniq, screens, choices, scenes: Object.keys(scenes()).length, seen,
      report: `walk: ${Object.keys(scenes()).length} scenes × ${VARIANTS.length} states, ${screens} screens, ${choices} choices, ${uniq.length} errors` + (uniq.length ? '\n  ' + uniq.slice(0, 40).join('\n  ') : '') };
  }

  // ---- bots
  const byId = (scr, ...ids) => { for (const id of ids) { const c = scr.choices.find(ch => ch.id === id); if (c) return c; } return null; };
  const BOTS = {
    // clicks anything
    random: scr => pick(scr.choices),
    // the default habits, lets the days run, takes the first answer to everything
    careful: scr => byId(scr, 'run', 'begin', 'wake', 'up', 'eat', 'proper', 'bowl', 'sleep', 'wait')
      || scr.choices.find(c => !['go', 'lie', 'stash', 'wire'].includes(c.id)) || scr.choices[0],
    // a player who has understood the economy
    smart: scr => smartChoice(scr, false),
    // the same, but goes through the wire when the odds are tolerable
    escaper: scr => smartChoice(scr, true),
  };
  const PREFER = ['continue', 'run', 'begin', 'wake', 'remember', 'nod', 'yes', 'take', 'trust', 'pay', 'carry', 'mine', 'honest', 'share', 'silent', 'keep', 'say', 'give', 'deny', 'refuse', 'wait', 'push', 'watch'];
  function smartChoice(scr, wantsOut) {
    const o = scr.o;
    if (o.plan) return byId(scr, wantsOut && o.plan.pFence * o.plan.pIce >= .3 ? 'go' : 'wait');
    if (o.escape === 'fence') return byId(scr, 'cut', 'post', 'gap');
    if (o.escape === 'night') return byId(scr, S.esc.temp <= -30 && !S.esc.partner ? 'walk' : S.esc.temp <= -35 ? 'walk' : 'drift', 'walk');
    if (o.escape === 'day2') return byId(scr, breadLeft() >= 200 && S.esc.route ? 'river' : 'hut');
    if (o.escape === 'settlement') return byId(scr, 'blade', 'senka', 'tobacco', 'bread', 'nothing');
    if (o.ledger) return byId(scr, 'run');
    // the arrival: hide the roubles; the third night: Pasha if he has seen you work, otherwise pay
    if (scr.choices.some(c => c.id === 'money') && scr.choices.some(c => c.id === 'hand')) return byId(scr, 'money');
    if (o.confront === 'boots') return byId(scr, S.brigade >= 10 ? 'pasha' : wantsOut ? 'bread' : 'money', S.strength > 55 ? 'fight' : 'bread');
    if (o.urki === 'knife') return byId(scr, S.brigade >= 20 ? 'still' : 'settle');
    if (o.urki === 'tribute') return byId(scr, wantsOut || S.strength > 40 ? 'pay' : 'stop');
    if (o.routine === 'morning') return byId(scr, S.strength < 35 ? 'sick' : 'up', 'up');
    if (o.routine === 'bread') {
      if (S.lev.alive && S.lev.health < 30 && S.strength > 45) return byId(scr, 'lev', 'eat');
      if (planItems() >= 2 && breadForPlan() < 600 && S.strength > 50) return byId(scr, 'half', 'eat');
      return byId(scr, 'eat');
    }
    if (o.routine === 'work') return byId(scr, S.strength < 25 ? 'enough' : 'proper');
    if (o.routine === 'dinner') return byId(scr, S.tobacco > 0 && S.strength < 50 ? 'trade' : S.brigade >= 10 ? 'queue' : 'bowl', 'bowl');
    if (o.routine === 'night') {
      if (wantsOut && planItems() >= 3) return byId(scr, 'wire', 'sleep');
      if (S.strength < 35 && S.bread > 0 && !(wantsOut && planItems() >= 2)) return byId(scr, 'stash', 'sleep');
      if (S.tobacco > 2 && S.strength < 60) return byId(scr, 'smoke', 'sleep');
      return byId(scr, S.strength > 45 ? 'mend' : 'sleep', 'sleep');
    }
    if (scr.choices.some(c => c.id === 'give') && S.strength < 35) return byId(scr, 'refuse', 'stupid', 'no') || scr.choices[0];
    return byId(scr, ...PREFER) || scr.choices[0];
  }

  // ---- sim: whole winters
  function sim(botName, runs = 100, seed0 = 1) {
    const bot = BOTS[botName];
    if (!bot) throw new Error('no bot ' + botName);
    const saved = S, savedScreen = FLOW.screen, prevStore = STORE;
    const ends = {}, days = [], errs = [], details = [];
    let steps = 0;
    STORE = null;
    for (let r = 0; r < runs; r++) {
      seed(seed0 + r * 7919);
      let scr = null;
      const prev = RENDER;
      const runs = [];
      RENDER = s => { scr = s; if (s.run && s.run.days.length) runs.push(s.run.days.length); };
      try {
        FLOW.auto = null; FLOW.stop = null;
        drive(title);
        let n = 0;
        while (scr && !scr.o.ending && n < 30000) {
          if (n % 25 === 0) { checkScreen(scr, `${botName}#${r} day ${S.day}`, errs); checkState(`${botName}#${r} day ${S.day}`, errs); }
          const ch = bot(scr) || scr.choices[0];
          scr = null;
          choose(ch); n++;
          if (!scr) { errs.push(`${botName}#${r}: no screen after "${ch.label}" on day ${S.day}`); break; }
        }
        steps += n;
        if (scr && scr.o.ending) {
          ends[scr.o.ending] = (ends[scr.o.ending] || 0) + 1; days.push(S.day);
          details.push({ end: scr.o.ending, day: S.day, clicks: n, runs, eye: S.eye, brigade: S.brigade, tobacco: S.tobacco, plan: planItems(),
            lev: S.lev.alive, kuzma: S.kuzma.here, count: Object.assign({}, S.count), beats: Object.keys(S.seen).filter(k => k.startsWith('beat:')).length,
            verdicts: S.history.reduce((a, h) => (a[h.v] = (a[h.v] || 0) + 1, a), {}), caught: !!S.flags.caught,
            urki: S.flags.urki || null, rubber: !!S.flags.rubber });
        }
        else if (scr) errs.push(`${botName}#${r}: did not end in 30000 steps`);
      } catch (e) {
        errs.push(`${botName}#${r}: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`);
      } finally { RENDER = prev; }
    }
    unseed();
    S = saved; FLOW.screen = savedScreen; STORE = prevStore;
    days.sort((a, b) => a - b);
    const q = p => days.length ? days[Math.min(days.length - 1, Math.floor(days.length * p))] : 0;
    const n = days.length || 1;
    const pct = k => Math.round(100 * (ends[k] || 0) / n);
    const uniq = [...new Set(errs)];
    return {
      bot: botName, runs, ends, days, errors: uniq, steps, details,
      survived: pct('spring'), escaped: pct('escaped'), median: q(.5),
      report: `${botName.padEnd(8)} ×${runs}: alive at the ice ${String(pct('spring')).padStart(3)}%  escaped ${String(pct('escaped')).padStart(3)}%  ` +
        `day median ${String(q(.5)).padStart(3)} p25 ${String(q(.25)).padStart(3)}  ${Math.round(steps / runs)} clicks/run  ` +
        Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') +
        (uniq.length ? '\n  ' + uniq.slice(0, 15).join('\n  ') : ''),
    };
  }

  // ---- dump: the script as text
  function dump() {
    const { seen } = walk();
    const strip = p => p.replace(/^[#~>] /, '').replace(/^" /, '').replace(' || ', ' — ');
    const L = [];
    let last = '';
    for (const { scene, scr } of seen) {
      const head = scene.split(' > ')[0];
      if (head !== last) { L.push(`\n==== ${head} ====`); last = head; }
      if (scene.includes(' > ')) L.push(`\n  -- after "${scene.split(' > ')[1]}"`);
      for (const n of scr.notes || []) L.push(`  ! ${n}`);
      if (scr.o.ledger) { L.push(`  [ledger ${scr.o.ledger.date}]`, ...scr.o.ledger.lines.map(l => '    ' + l), ...(scr.o.ledger.good || []).map(g => '    + ' + g), `    ${scr.o.ledger.verdict}`); }
      if (scr.o.plan) L.push(...scr.o.plan.items.map(i => `  [${i.have ? 'x' : ' '}] ${i.name}: ${i.where}`), `  fence: ${scr.o.plan.fence}; ice: ${scr.o.plan.ice}`);
      if (scr.o.record) L.push(`  [record] ${scr.o.record.stamp}: ${scr.o.record.outcome}`, ...scr.o.record.unsaid.map(u => '    ' + u));
      L.push(...scr.paras.map(p => '  ' + strip(p)));
      if (scr.choices.length) L.push('  ' + scr.choices.map((c, i) => `[${i + 1}] ${c.label}`).join('   '));
    }
    return L.join('\n').trim() + '\n';
  }

  // ---- audit: assets the game asks for
  function audit(runs = 60) {
    const need = { frame: new Set(), sfx: new Set(), voice: new Set() };
    const take = scr => {
      const o = scr.o || {};
      if (o.frame) need.frame.add(o.frame);
      for (const k of ['amb', 'sfx']) if (o[k]) need.sfx.add(o[k]);
      // a picture sequence's drawings and sounds, and the place's sound layers
      for (const st of (o.seq && ASSETS.sequences && ASSETS.sequences[o.seq]) || []) { need.frame.add(st.frame); if (st.sfx) need.sfx.add(st.sfx); }
      const sc = typeof SCAPES !== 'undefined' && SCAPES[o.scape || o.amb];
      if (sc) for (const [f] of [...sc.beds, ...sc.spots]) for (const x of [].concat(f)) need.sfx.add(x);
      for (const c of scr.cues || []) need.sfx.add(c);
      for (const v of [].concat(o.voice || [])) if (v) need.voice.add(v);
      for (const c of scr.choices || []) for (const v of [].concat(c.say || [])) need.voice.add(v);
    };
    for (const { scr } of walk().seen) take(scr);
    const prev = RENDER;
    const saved = S;
    RENDER = s => take(s);
    for (let r = 0; r < runs; r++) {
      seed(500 + r);
      try { FLOW.auto = null; drive(title); let n = 0; while (FLOW.screen && !FLOW.screen.o.ending && n++ < 4000) choose(BOTS.smart(FLOW.screen)); } catch (e) {}
    }
    RENDER = prev; S = saved; unseed();
    need.sfx.add('pulse');
    return { frame: [...need.frame].sort(), sfx: [...need.sfx].sort(), voice: [...need.voice].sort() };
  }

  // ---- explicit checks of the machinery
  function checks() {
    const fails = [], saved = S, prevR = RENDER, prevStore = STORE;
    const ok = (cond, what) => { if (!cond) fails.push(what); };
    let scr = null;
    RENDER = s => { scr = s; };
    try {
      // a routine choice made by hand becomes the habit
      seed(42); fresh(); drive(startDay);
      while (scr.o.routine !== 'bread') choose(scr.choices[0]);
      choose(scr.choices.find(c => c.id === 'half'));
      ok(S.habits.bread === 'half', 'habit: keeping half by hand should become the habit');
      ok(S.bread > 0, 'habit: keeping half should keep bread');
      // a one-off choice does not
      fresh(); S.habits.night = 'sleep'; drive(startDay);
      while (scr.o.routine !== 'night') choose(scr.choices.find(c => !['lie', 'sick'].includes(c.id)) || scr.choices[0]);
      choose(scr.choices.find(c => c.id === 'wire'));
      ok(S.habits.night === 'sleep', 'habit: thinking about the wire must not become the night habit');
      // the days run, then stop with a summary
      seed(7); fresh(); S.day = 10; drive(startDay);
      while (!scr.o.ledger) choose(scr.choices.find(c => !['lie', 'sick', 'go', 'wire'].includes(c.id)) || scr.choices[0]);
      const from = S.day;
      choose(scr.choices.find(c => c.id === 'run'));
      ok(S.day > from, 'run: the days should have moved on');
      ok(!FLOW.auto, 'run: the run should have ended on a screen');
      ok(scr.run || S.day === from + 1, 'run: a screen after a run should carry its summary');
      ok(S.day - from <= RUN_CAP + 1, `run: ran ${S.day - from} days, cap is ${RUN_CAP}`);
      // the account does not repeat a note above itself
      fresh(); drive(startDay);
      while (scr.o.routine !== 'night') choose(scr.choices.find(c => !['lie', 'sick'].includes(c.id)) || scr.choices[0]);
      choose(scr.choices.find(c => c.id === 'mend'));
      ok(scr.o.ledger && scr.notes.every(n => !scr.o.ledger.lines.includes(n)), 'ledger: a note is shown twice');
      // save, and continue from the title
      let box = null;
      STORE = { load: () => box && JSON.parse(box), save: s => { box = JSON.stringify(s); }, clear: () => { box = null; } };
      fresh(); drive(startDay);
      while (!scr.o.ledger) choose(scr.choices.find(c => !['lie', 'sick', 'go', 'wire'].includes(c.id)) || scr.choices[0]);
      choose(scr.choices.find(c => c.id === 'next'));
      const day = S.day;
      drive(title);
      const cont = scr.choices.find(c => c.id === 'continue');
      ok(cont, 'save: the title should offer to continue');
      if (cont) { choose(cont); ok(S.day === day && !S.flags.title, 'save: continue should resume on the saved day'); }
      // an ending clears the save
      finish('died');
      ok(!STORE.load(), 'save: an ending should clear the save');
      // the ice goes out on the right day
      fresh(); S.day = ICE_OUT_DAY - 1; drive(startDay);
      while (!scr.o.ledger && !scr.o.ending) choose(scr.choices.find(c => !['lie', 'sick', 'go', 'wire'].includes(c.id)) || scr.choices[0]);
      if (scr.o.ledger) choose(scr.choices.find(c => c.id === 'next'));
      ok(scr.o.ending === 'spring' || S.dead, 'calendar: the ice should go out on day ' + ICE_OUT_DAY);
    } catch (e) {
      fails.push('checks crashed: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | '));
    } finally { RENDER = prevR; STORE = prevStore; S = saved; FLOW.auto = null; FLOW.stop = null; unseed(); }
    return { fails, report: `checks: ${fails.length ? fails.length + ' failed\n  ' + fails.join('\n  ') : 'all passed'}` };
  }

  return { walk, sim, dump, audit, scenes, capture, BOTS, fresh, checks };
})();
