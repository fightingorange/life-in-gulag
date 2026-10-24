'use strict';
// The wire. Two parts: getting through the fence, and three days on the ice.
// The plan screen says, in words, how each part stands tonight and what is missing.
// When the clock on a choice runs out (ui.js), the choice marked def is taken: here always the one
// that does not run: back to the bunk, the drift, the river, nothing on the table.

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
  let p = S.flags.blade ? .56 : S.flags.partner && !S.flags.senkaGone ? .52 : .14;
  if (S.today && S.today.blizzard) p += .2;
  if (S.eye >= 45) p -= .12;
  if (S.until.searches) p -= .1;
  return clamp(p, .03, .92);
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
  if (S.flags.rubber) p -= .1;   // Vaska's rubber boots on the ice
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
  if (S.flags.rubber) paras.push('And your feet. Three days on the ice in tyre rubber and rag: the river would have your toes by the second night.');
  if (S.flags.senkaDate && S.flags.partner && !S.flags.senkaGone) {   // Senka named the first of May (events.js)
    const left = S.flags.senkaDate - S.day;
    paras.push(left > 1 ? `Senka goes on the first of May, with you or without you. That is ${numberWord(left)} nights away.`
      : 'Senka goes tonight, or tomorrow night. He has not said which. He has stopped looking at you.');
  }
  show(paras, [
    { id: 'wait', label: 'Not tonight.', fn: () => go(endDay) },
    { id: 'go', label: 'Tonight.', hint: `the fence: ${oddsWord(f)}; the ice: ${oddsWord(i)}`, fn: escape },
  ], {
    frame: 'wire', amb: S.today.blizzard ? 'amb_blizzard' : 'amb_wind', sfx: 'searchlight',
    plan: { items, fence: oddsWord(f), ice: oddsWord(i), pFence: f, pIce: i, have: planItems() },
  });
}

// ---------- the escape, played ----------
// Four stages. Each choice moves the odds; the plan screen's words are the average of them.
// S.esc holds the attempt: who is with you, what you carry, how far you got, and how it ended.
function newEscape() {
  return { partner: !!S.flags.partner && !S.flags.senkaGone, bread: breadForPlan(), blade: !!S.flags.blade,
    route: !!(S.flags.river || S.flags.map), map: !!S.flags.map, temp: S.temp, blizzard: !!(S.today && S.today.blizzard),
    thaw: S.day >= THAW_DAY, strength: S.strength, rubber: !!S.flags.rubber, days: 0, cause: null, gave: null };
}
// every stage can be entered directly (dev jumps, tests): it sets up the attempt if there is none
function attempt() { if (!S.esc) S.esc = newEscape(); return S.esc; }
function escape() {
  S.flags.tried = true;
  FLOW.story = true;
  S.esc = newEscape();
  const E = S.esc;
  const paras = [E.blizzard
    ? 'You get up at two, when the hut is deepest asleep. Outside the blizzard has taken the towers away entirely. The searchlights are on, and they light only snow.'
    : 'You get up at two, when the hut is deepest asleep. Outside the searchlights go round, and round, and round, as they have every night since you came.'];
  if (E.partner) paras.push('Senka is already by the door, with his boots in his hand. He does not look surprised.');
  const ch = [];
  if (E.partner) ch.push({ id: 'post', label: 'The rotten post Senka showed you.', hint: 'he has done this before', fn: () => fence('post') });
  if (E.blade) ch.push({ id: 'cut', label: 'Behind the carpenters\' shed. Cut the wire.', hint: 'the blade; the shed hides you from the tower', fn: () => fence('cut') });
  ch.push({ id: 'gap', label: 'The gap under the wire by the latrine.', hint: 'everyone knows it; so do the guards', fn: () => fence('gap') });
  ch.push({ id: 'back', def: true, label: 'Go back to your bunk.', hint: 'nobody has seen anything yet', fn: () => { S.esc = null; go(endDay); } });
  show(paras, ch, { frame: 'wire', amb: S.today.blizzard ? 'amb_blizzard' : 'amb_wind', sfx: 'searchlight', story: true, escape: 'fence' });
}
function fenceChance(route) {
  const E = attempt();
  let p = route === 'post' ? .52 : route === 'cut' ? .56 : .14;
  if (E.blizzard) p += .2;
  if (S.eye >= 45) p -= .12;
  if (S.until.searches) p -= .1;
  return clamp(p, .03, .92);
}
function fence(route) {
  const E = attempt();
  E.fenceRoute = route;
  if (!chance(fenceChance(route))) {
    if (E.partner && route === 'post' && chance(.45)) return senkaShot();
    if (chance(.55)) { E.cause = route; return finish('shot'); }
    return caught('At the wire. The searchlight finds you with one leg through. They do not shoot, which is somehow worse: they want you for the commandant.');
  }
  const how = route === 'post'
    ? 'Senka puts his shoulder to the post and it goes over without a sound, like a tired man lying down. You step over the wire. Nobody shoots.'
    : route === 'cut'
      ? 'The blade goes through the first wire and the second, slowly, a strand at a time, with your mitten round it so it does not sing. The shed is between you and the tower the whole time. Nobody shoots.'
      : 'You go under the wire on your back, in the trough the others have worn, with the snow going down your collar. The searchlight passes over you twice and does not stop. Nobody shoots.';
  E.days = 1;
  show([how, 'Then the bank, and then the river: flat, white, and as wide as the sky. You walk until the camp lights are a smudge behind you, and then until they are gone.'],
    [{ label: 'Keep walking.', fn: bank }], { frame: 'river', amb: 'amb_wind', story: true, escape: 'over' });
}
// The bank: the dogs follow a trail along the near bank; on the ice they lose it, and the far bank is a
// long way across in the dark.
function bank() {
  const E = attempt();
  const paras = ['The river is wider than it looked from the camp. On this side the bank is low and the going is easy, and the dogs, when they come, will come along it. The far bank is a line of black trees, a long way across the ice.'];
  if (E.thaw) paras.push('In the middle, where the current runs under it, the ice is grey. Kuzma said it does not like to hold a man there.');
  show(paras, [
    { id: 'near', def: true, label: 'Keep to the near bank. Save your legs.', hint: E.partner ? 'Senka shakes his head' : 'the dogs will come this way', fn: () => { E.far = false; firstNight(); } },
    { id: 'far', label: 'Cross to the far bank, on the ice.', hint: 'the dogs lose a trail on ice; an hour across, in the open', fn: () => {
      E.far = true;
      adj(-4);
      if (E.thaw && chance(.2)) { E.cause = 'ice'; return finish('frozen'); }
      show(['An hour on the open ice with the wind across it and nothing to hide behind, and the camp a line of lights behind you that does not get smaller for a long time. Then the far bank, and the trees, and the dark under them.'],
        [{ label: 'Go on.', fn: firstNight }], { frame: 'river', amb: 'amb_wind', story: true, escape: 'bank' });
    } },
  ], { frame: 'river', amb: 'amb_wind', story: true, escape: 'bank' });
}
function firstNight() {
  const E = attempt();
  const cold = E.temp <= -35 ? 'It is so cold that the snow squeaks like a door.' : E.temp <= -25 ? 'The cold is the ordinary cold: the kind that kills you slowly instead of quickly.' : 'It is mild, for the river. Your breath does not freeze on your collar.';
  const paras = ['The first night on the ice. ' + cold];
  if (E.thaw) paras.push('Under your feet the ice talks: long, low creaks, and once a crack like a rifle a long way off. Kuzma said after the tenth it would not hold a man.');
  if (!E.route) paras.push('You do not know the river. In the dark every bend looks like every other bend.');
  if (E.rubber) paras.push('Your feet in the rubber boots stopped hurting an hour ago. You know what that means, and you keep walking anyway.');
  show(paras, [
    { id: 'walk', label: 'Walk through the night. Distance is everything.', hint: 'the dogs start at the count', fn: () => night1('walk') },
    { id: 'drift', def: true, label: 'Dig into a drift under the bank and sleep till grey light.', hint: E.partner ? 'Senka will keep watch' : 'men sleep in the snow and do not wake', fn: () => night1('drift') },
  ], { frame: 'river', amb: 'amb_wind', story: true, escape: 'night' });
}
function night1(how) {
  const E = attempt();
  E.night = how;
  const guard = (E.partner ? .5 : 1) * (E.rubber ? 1.6 : 1);   // rubber boots freeze faster than felt
  if (E.thaw && chance(how === 'walk' ? .3 : .15)) { E.cause = 'ice'; return finish('frozen'); }
  if (how === 'walk') {
    adj(-14);
    if (E.temp <= (E.rubber ? -28 : -35) && chance(.22 * guard)) { E.cause = 'walk'; return finish('frozen'); }
  } else {
    adj(-6);
    if (E.temp <= (E.rubber ? -24 : -30) && chance(.2 * guard)) { E.cause = 'sat'; return finish('frozen'); }
  }
  // the dogs: worse if they noticed you, if you slept, if they were already searching
  let dogs = how === 'walk' ? .1 : .22;
  if (S.eye >= 45) dogs += .1;
  if (S.until.searches) dogs += .1;
  if (E.blizzard) dogs -= .08;
  if (E.far) dogs -= .08;   // the trail ends at the ice
  E.days = 2;
  if (chance(clamp(dogs, .02, .5))) return caught('On the second day, the dogs. You hear them a long time before you see them, and then you see them, and they do not hurry.', 2);
  const paras = [how === 'walk'
    ? 'You walk all night. Towards morning you are asleep on your feet, and you wake falling, and get up, and walk.'
    : E.partner
      ? 'You sleep in the snow with your back against Senka\'s back. Twice he shakes you awake, hard, for no reason he can tell you. Both times you were dreaming you were warm.'
      : 'You sleep in the snow in a hole like a dog\'s. You wake twice, so cold you cannot feel the cold, and the second time you do not want to get up. You get up.'];
  paras.push('The second day. Late in the afternoon there is smoke on the bank ahead: one hut, a fisherman\'s, with a boat turned over beside it and nets on poles.');
  const ch = [
    { id: 'hut', label: 'Go to the hut.', hint: 'a stove, food; a man who might talk', fn: () => day2('hut') },
    { id: 'river', def: true, label: 'Keep to the river. Keep walking.', hint: `${breadLeft()} g of bread left`, fn: () => day2('river') },
  ];
  show(paras, ch, { frame: 'ice_out', amb: 'amb_wind', story: true, escape: 'day2' });
}
function breadLeft() { const E = attempt(); return Math.max(0, E.bread - (E.days - 1) * 200); }
function day2(how) {
  const E = attempt();
  E.day2 = how;
  E.days = 3;
  if (how === 'hut') {
    adj(16);
    if (chance(E.partner ? .2 : .3)) return caught('The fisherman gives you fish soup, and a place by the stove, and while you sleep he walks two hours to the next post. He is not a bad man. There is a reward, and he has children.', 3);
    const paras = ['The fisherman looks at your jacket and your boots and the number on your back, and says nothing at all. He gives you fish soup, and a place by the stove for the night, and in the morning a frozen fish wrapped in newspaper.',
      '"I never saw you," he says. "Downstream. Keep to the left bank."'];
    E.bread += 200; E.route = true;
    return show(paras, [{ label: 'Go on.', fn: settlement }], { frame: 'stove', amb: 'amb_hut', story: true, escape: 'hut' });
  }
  const left = breadLeft();
  let risk = left >= 200 ? .08 : .3;
  if (!E.route) risk += .25;
  if (E.night === 'walk') risk += .06;
  if (chance(clamp(risk * (E.partner ? .6 : 1), .02, .7))) { E.cause = E.route ? 'hunger' : 'lost'; return finish('frozen'); }
  show([left >= 200
    ? 'You eat a little, walking. The bread is hard as wood and you hold it in your mouth until it is bread again. That night you sleep again in the snow, and in the morning you are still alive.'
    : 'There is no bread left. You eat snow, which does nothing, and walk, which is all there is. That night you sleep in the snow, and in the morning, for no reason you can name, you are still alive.'],
    [{ label: 'Go on.', fn: settlement }], { frame: 'river', amb: 'amb_wind', story: true, escape: 'river' });
}
function settlement() {
  const E = attempt();
  E.days = 4;
  const paras = ['On the fourth day you see the smoke Kuzma talked about: a settlement of the free ones. Released men, in a place they cannot leave. Six huts, a store, a pole with a wire on it.',
    'A man in a quilted jacket like yours, without the number, sees you coming up from the river. He looks at your boots for a long time. Then he takes you inside, and sits you down, and gives you soup, and stands with his back against the wall where the telephone is.'];
  const ch = [];
  if (E.blade) ch.push({ id: 'blade', label: 'Put the blade on the table.', hint: 'fifteen centimetres of steel is worth more than you are', fn: () => give('blade', .78) });
  if (E.partner) ch.push({ id: 'senka', label: 'Let Senka talk to him, with his hands.', hint: 'two men who have been where he has been', fn: () => give('senka', .72) });
  if (S.tobacco >= 2) ch.push({ id: 'tobacco', label: 'Give him your tobacco.', hint: `${numberWord(S.tobacco)} pinches`, fn: () => give('tobacco', .58 + Math.min(.12, S.tobacco * .02)) });
  if (S.flags.money) ch.push({ id: 'money', label: 'Put Nina\'s roubles on the table.', hint: 'twenty-five roubles; out here money is money again', fn: () => give('money', .55) });
  if (breadLeft() > 0) ch.push({ id: 'bread', label: 'Give him what is left of the bread.', hint: `${breadLeft()} g`, fn: () => give('bread', .52) });
  ch.push({ id: 'nothing', def: true, label: 'Give him nothing. Eat the soup, and look at him.', hint: 'he was in a camp once too', fn: () => give('nothing', .36) });
  show(paras, ch, { frame: 'table', amb: 'amb_hut', story: true, escape: 'settlement' });
}
function give(what, p) {
  const E = attempt();
  E.gave = what;
  if (chance(p)) return finish('escaped');
  const first = what === 'senka'
    ? 'He watches Senka\'s hands for a long time, and nods, and goes out, and you hear the handle of the telephone turning.'
    : what === 'nothing'
      ? 'He watches you eat. When you have finished he takes the bowl, and goes out, and you hear the handle of the telephone turning.'
      : 'He takes what you give him, and thanks you, and goes out, and you hear the handle of the telephone turning.';
  caught(`${first} When the soldiers come you are still at his table. You finished the soup. You are glad, later, that you finished the soup.`, 4);
}
function caught(how, days = 0) {
  S.extra += SENTENCE;
  S.day = Math.min(ICE_OUT_DAY - 1, S.day + days);   // the days on the ice are days served
  S.esc = null;
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
  S.flags.partner = false; S.flags.senkaGone = true; S.flags.senkaGoneDay = S.day; S.flags.senkaBread = false;
  eye(20); adj(-5);
  show([
    'Senka goes first through the gap. The light finds him, not you. You are back in your bunk before the count, with your heart going like a man who ran.',
    'Senka is laid by the gate for three days so that the column can see what a man looks like who tried. On the fourth day there is a thaw, and they move him.',
  ], [{ label: 'Say nothing. Ever.', fn: () => go(endDay) }], { frame: 'gate', amb: 'amb_hut', sfx: 'shot' });
}
