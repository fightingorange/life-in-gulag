'use strict';
// The wire. Two parts: getting through the fence, and three days on the ice.
// The plan screen says, in words, how each part stands tonight and what is missing.

function breadForPlan() { return S.bread + (S.flags.partner && S.flags.senkaBread ? 300 : 0); }
function planHas() {
  return {
    blade: !!S.flags.blade,
    bread: breadForPlan() >= 600,
    partner: !!S.flags.partner && !S.flags.senkaGone,
    route: !!(S.flags.river || S.flags.map),
  };
}
function planItems() { const h = planHas(); return Object.values(h).filter(Boolean).length; }
function planHint() {
  const n = planItems();
  const tonight = S.today && S.today.blizzard ? '; a blizzard tonight' : '';
  return n === 0 ? `you have nothing it needs${tonight}` : `${numberWord(n)} of four things${tonight}`;
}

function fenceOdds() {
  let p = .12;
  if (S.flags.blade) p += .38;
  if (S.today && S.today.blizzard) p += .2;
  if (S.eye >= 45) p -= .12;
  if (S.until.searches) p -= .1;
  return clamp(p, .02, .9);
}
function iceOdds() {
  let p = .08;
  if (S.flags.river || S.flags.map) p += .22;
  if (S.flags.river && S.flags.map) p += .06;
  if (S.flags.partner && !S.flags.senkaGone) p += .12;
  const b = breadForPlan();
  p += b >= 600 ? .22 : b / 600 * .12;
  if (S.temp <= -35) p -= .15; else if (S.temp > -20) p += .08;
  if (S.day >= THAW_DAY) p -= .3;
  if (S.strength < 40) p -= .1;
  return clamp(p, .02, .85);
}
function oddsWord(p) {
  return p < .1 ? 'almost certain death' : p < .25 ? 'a bad chance' : p < .45 ? 'a poor chance' : p < .6 ? 'an even chance' : 'a fair chance';
}

function plan() {
  const h = planHas(), f = fenceOdds(), i = iceOdds();
  const items = [
    { have: h.blade, name: 'A blade, for the wire',
      where: 'There is steel at the settlement site, for a man who works where the carpenters work. The blacksmith\'s man sells things, for tobacco.' },
    { have: h.bread, name: `Bread for three days: ${breadForPlan()} of 600 g`,
      where: S.flags.baptist ? 'Half a ration a day, under Alyoshka\'s boards.' : 'Half a ration a day, sewn into the lining, if Lubimov does not find it.' },
    { have: h.partner, name: 'Someone who has done it before',
      where: S.flags.senkaGone ? 'Senka went without you.' : 'Senka walked out of a German camp in \'43. He does not talk. He draws.' },
    { have: h.route, name: 'The way',
      where: S.flags.map ? 'Lev\'s map, and Kuzma\'s river.' : 'Kuzma knows the river. Men in the office have maps.' },
  ];
  const paras = ['The wire. You lie on your back and count what you have.'];
  paras.push(S.today.blizzard ? 'Tonight there is a blizzard. The towers are blind.' : 'Tonight the towers can see. A blizzard would blind them.');
  if (S.temp <= -35) paras.push('It is too cold for the ice. Men freeze on the river at this temperature with bread in their pockets.');
  if (S.day >= THAW_DAY) paras.push('The ice is going bad. Kuzma said after the tenth it would not hold a man.');
  show(paras, [
    { id: 'wait', label: 'Not tonight.', fn: () => go(endDay) },
    { id: 'go', label: 'Tonight.', hint: `the fence: ${oddsWord(f)}; the ice: ${oddsWord(i)}`, fn: escape },
  ], {
    frame: 'wire', amb: S.today.blizzard ? 'amb_blizzard' : 'amb_wind', sfx: 'searchlight',
    plan: { items, fence: oddsWord(f), ice: oddsWord(i), pFence: f, pIce: i, have: planItems() },
  });
}

function escape() {
  S.flags.tried = true;
  if (!chance(fenceOdds())) {
    if (S.flags.partner && !S.flags.senkaGone && chance(.35)) return senkaShot();
    if (chance(.55)) return finish('shot');
    return caught('At the wire. The searchlight finds you with one leg through. They do not shoot, which is somehow worse: they want you for the commandant.');
  }
  if (!chance(iceOdds())) {
    if (chance(.55)) return finish('frozen');
    return caught('Two days on the ice. On the second, the dogs. They do not hurry.');
  }
  finish('escaped');
}
function caught(how) {
  S.extra += SENTENCE;
  S.strength = 15; S.eye = 100; brig(10);
  S.flags.blade = false; S.bread = 0; S.flags.senkaBread = false;
  S.today.cells = true; S.stats.cells++;
  S.flags.caught = true;
  show([how,
    'The guards bring you back in a lorry, and the whole camp is turned out at the gate to look at you, so that everyone can see what a man looks like who tried.',
    'Ten more years, read out at the count. You are no longer counting. The brigade, for some reason, thinks more of you.',
  ], [{ label: 'Let the day go.', fn: () => go(endDay) }], { frame: 'gate', amb: 'amb_march', sfx: 'lorry', voice: 'lubimov_tenmore' });
}
function senkaShot() {
  S.flags.partner = false; S.flags.senkaGone = true; S.flags.senkaBread = false;
  eye(20); adj(-5);
  show([
    'Senka goes first through the gap. The light finds him, not you. You are back in your bunk before the count, with your heart going like a man who ran.',
    'Senka is laid by the gate for three days so that the column can see what a man looks like who tried. On the fourth day there is a thaw, and they move him.',
  ], [{ label: 'Say nothing. Ever.', fn: () => go(endDay) }], { frame: 'gate', amb: 'amb_hut', sfx: 'shot' });
}
