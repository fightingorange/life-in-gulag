'use strict';
// A day: reveille, count, bread, work, noon, the gate, dinner, night, and the account at the end.

function blankToday() {
  return {
    startStrength: S.strength, startBread: S.bread, startTobacco: S.tobacco, startBrigade: S.brigade, startEye: S.eye,
    cells: false, bowl: false, quota: true, lost: false, tobaccoGain: false, warm: false, inside: false,
    wood: false, blizzard: false, gave: false, ate: 0, notes: [],
  };
}

function nextDay() {
  S.day++;
  if (STORE) STORE.save(S);
  startDay();
}

// The daily cost of being alive here: more in the cold, and a little more every month.
function drain() {
  const cold = Math.max(0, -S.temp - 20) / 3.2;
  return Math.round(6.4 + cold + S.day / 40 + (S.until.nojacket ? 3 : 0));
}

function startDay() {
  S.today = blankToday();
  for (const k in S.until) if (S.until[k] < S.day) delete S.until[k];
  if (S.day >= ICE_OUT_DAY) return spring();
  S.temp = S.day === 1 ? -27 : rollTemp(S.day);   // the first day always marches out
  const before = S.strength;
  adj(-drain());
  eye(S.eye > 30 ? -2 : -1);   // the eye forgets, slowly
  if (S.brigade > 0) brig(-Math.round(S.brigade / 15));  // the brigade remembers what you did lately
  levDaily();
  kuzmaDaily();
  if (S.dead) return die();
  if (before >= 30 && S.strength < 30) stopRun('You are going. Something has to change.');
  const beat = beatFor('morning');
  if (beat) return runBeat(beat);
  if (S.lev.alive && S.lev.health <= 0) return levDeath();
  if (S.flags.pendingCells) {
    S.flags.pendingCells = false;
    return cellsDay(S.flags.cellsWhy || 'The inspector checked the sheet. Your name was on it.');
  }
  reveille();
}

function levDaily() {
  if (!S.lev.alive) return;
  const was = levWord();
  S.lev.health -= S.temp <= -35 ? 5 : 3;
  if (S.lev.health > 0 && levWord() !== was) note(`Lev is ${levWord()} now.`, S.lev.health <= 35);
}
function kuzmaDaily() {
  const k = S.kuzma;
  if (k.here && k.coughDay && !k.helped && S.day >= k.coughDay + 9) {
    k.here = false; k.diedOn = fmtDate(S.day);
    note('Kuzma did not get up this morning. They carry him out before the count, under his own jacket.', true);
    stopRun('');
  }
}

// ---------- morning ----------
const MORNINGS = [
  { t: 'In the bunk above, Senka\'s boots hang by your face. Pasha the foreman is already up, which means the brigade is going somewhere it does not want to go.', when: () => !S.flags.senkaGone },
  { t: 'Pasha the foreman is already up, which means the brigade is going somewhere it does not want to go.' },
  { t: 'Somebody\'s foot cloths have frozen to the wall where he hung them. He works them loose with his thumbs, carefully, like a man taking off a bandage.' },
  { t: 'The man in the bunk below has coughed the same way for a week. This morning he does not, and everyone listens to him not coughing.' },
  { t: 'The Latvians are already dressed. The Latvians are always already dressed.' },
  { t: 'The orderly carries the latrine tub out between two poles, and the cold comes in where it goes out.' },
  { t: 'Kuzma is telling the stove a story. The stove has heard it.', when: () => S.kuzma.here },
  { t: 'Senka sleeps with his hands inside his jacket, like a man guarding something.', when: () => !S.flags.senkaGone },
  { t: 'Someone has stolen someone\'s spoon. There is a short, quiet, terrible argument, and then the spoon is found.' },
  { t: 'Your felt boots are where you left them, under your head. You check twice anyway.' },
  { t: 'The hut smells of wet felt and smoke and two hundred men. You stopped smelling it in the second week. This morning, for some reason, you smell it.' },
  { t: 'Lev is already sitting up, with his blanket round his shoulders, reading the inside of his own eyelids.', when: () => S.lev.alive },
];
const availableLines = list => list.filter(x => !x.when || x.when()).map(x => x.t);

function reveille() {
  const t = -S.temp;
  const feel = t >= 40 ? 'The cold has a sound today: the nails in the roof.'
    : t >= 30 ? 'The window has two fingers of ice on the inside.'
    : t >= 15 ? 'Not the worst morning. You distrust it.'
    : 'Water drips somewhere in the roof. You had forgotten that water could do that.';
  const paras = [`Reveille. Somebody hits the rail outside the staff hut with a hammer. ${tempWords()}. ${feel}`];
  paras.push(S.day === 1 ? MORNINGS[0].t : pick(availableLines(MORNINGS.slice(1))));
  if (S.brigade <= -30 && chance(.3)) {
    paras.push('On the way to the latrine someone\'s shoulder takes you into the door frame, and then a knee. Nobody looks.');
    adj(-10);
    note('The brigade has decided something about you.', true);
  }
  const ch = [
    { id: 'up', label: 'Get up.', fn: () => go(count) },
    { id: 'lie', habit: false, label: 'Five more minutes under the jacket.', hint: 'warm, if Lubimov is counting someone else', fn: lieIn },
  ];
  if (S.strength < 40) ch.push({ id: 'sick', habit: false, label: 'Lie still. Report sick.', hint: 'the medic takes two a day', fn: reportSick });
  show(paras, ch, { frame: 'hut_morning', amb: 'amb_hut', sfx: 'rail', routine: 'morning' });
}
function lieIn() {
  if (chance(.3)) return cellsDay('Warder Lubimov. He does not shout. He writes your number in a book, and that is worse than shouting. "Three days. With work." You get one of them today.', 'lubimov_cells');
  adj(3);
  note('Five minutes. Nobody came.');
  go(count);
}
function reportSick() {
  if (chance(.5)) return sickDay();
  adj(-4);
  note('The medic takes two a day. You were the third. Thirty-seven and four tenths is not a temperature in here.');
  go(count);
}
function cellsDay(why, voice) {
  S.today.cells = true;
  S.today.inside = true;
  S.stats.cells++;
  adj(-22);
  show([why,
    'The cells. A box of planks on bare ground, three hundred grams, hot food every third day. You sit on the edge of the bunk because the bunk is nailed up in daytime. You think about nothing, carefully, for a long time.',
  ], [{ label: 'Let the day go.', fn: () => go(endDay) }], { frame: 'cells', amb: 'amb_cells', sfx: 'door', voice });
}
function sickDay() {
  adj(14); brig(-4);
  S.today.warm = true; S.today.inside = true;
  show([
    'The medic looks at your tongue and writes you off work. The hut is empty all day. It is warm in a way it is never warm at night, and it is quiet, and you sleep like a man being paid for it.',
    'Tomorrow the quota will have been short by one man, and the brigade will remember who.',
  ], [{ label: 'Sleep.', fn: () => go(endDay) }], { frame: 'hut_night', amb: 'amb_hut' });
}

// ---------- the count, and searches ----------
const COUNTS = [
  'Count. Four hundred and some men in fives, in the dark, in the wind off the river. They count twice because the first time comes out wrong. It always comes out wrong the first time.',
  'Count. The fives shuffle into place. Lubimov counts with his lips moving, the way some men read.',
  'Count. Your feet stop hurting at about the second count, which is not a good sign.',
  'Count. The wind comes off the river with nothing in its way for four hundred kilometres.',
  'Count. Someone at the end of the line is held up by the two men beside him. The number comes out right.',
];
function searchChance(where) {
  let p = where === 'count' ? .18 : .3;
  if (S.eye >= 45) p += .2;
  if (S.eye >= 70) p += .2;
  if (S.until.searches) p += .3;
  return clamp(p, 0, .9);
}
function search(lead) {
  const out = [lead];
  let found = false, hoard = false;
  if (S.bread > 0 && !S.flags.baptist && chance(.5)) {
    out.push(`Your ${S.bread} grams, from the lining. He weighs it in his hand and puts it in his pocket. "Hoarding."`);
    S.stats.lost += S.bread; S.bread = 0;
    eye(8); found = hoard = true; S.today.lost = true;
    note('Lubimov took the bread from your lining.', true);
  }
  if (S.flags.blade && chance(.25)) {
    out.push('The blade. He holds it up so the column can see what a blade looks like. Then he looks at you for a long time, so that he will know you tomorrow.');
    S.flags.blade = false; S.flags.pendingCells = true;
    S.flags.cellsWhy = 'Three days for the blade. They give you one of them now and owe you the others.';
    eye(30); found = true; S.today.lost = true;
    note('They found the blade. The cells tomorrow.', true);
  }
  if (!found) out.push(pick([
    'He finds nothing, because there is nothing, or because he is cold.',
    'His hands go over you like a man checking a horse. Nothing.',
    'Nothing. He moves on to the next man, who is shaking.',
  ]));
  return { out, found, hoard };
}
function count() {
  const paras = [S.day === 1 ? COUNTS[0] : pick(COUNTS)];
  let found = false, voice = S.day === 1 || chance(.2) ? 'lubimov_count' : null;
  if (chance(searchChance('count'))) {
    const r = search('Lubimov walks the line opening jackets.');
    paras.push(...r.out); found = r.found;
    if (r.hoard) voice = 'lubimov_hoarding';
  } else paras.push('Lubimov walks the line looking at faces. You keep yours the way you keep it.');
  if (S.temp <= -41) paras.push('The thermometer by the gate says forty-one. Below forty-one they do not march you out. Nobody trusts the thermometer, but today it is on your side.');
  show(paras, [{ label: S.temp <= -41 ? 'Back to the hut.' : 'Stand.', fn: () => go(breakfast) }],
    { frame: 'count', amb: 'amb_wind', sfx: 'boots', voice, routine: found ? null : true });
}

// ---------- bread ----------
// a jacket lining hides about seven hundred grams; Alyoshka's boards a little more
function breadCap() { return S.flags.baptist ? 900 : 700; }
function ration() { return S.until.inspection ? 650 : (S.flags.cutBread || S.until.cut) ? 400 : 550; }
const BREAKFASTS = [
  'Breakfast. The skilly is the colour of the bowl.',
  'Breakfast. There is a fish eye in the skilly, looking at you. You eat it.',
  'Breakfast. Somebody says the cook was a professor once. Of what, nobody knows. Not of soup.',
  'Breakfast. You eat the skilly the way you learned in the second week: slowly, from the top, so the warmth lasts.',
];
function breakfast() {
  const g = ration();
  S.flags.cutBread = false;
  const paras = [];
  if (S.day === 1) paras.push('Breakfast: skilly. Hot water with a memory of cabbage, and the fish bones at the bottom, which you chew. And bread, your five hundred and fifty grams, under weight as always, still warm from the bakery sledge.');
  else paras.push(`${pick(BREAKFASTS)} ${g === 400 ? 'Four hundred grams of bread today. Everyone knows why.' : g === 650 ? 'Six hundred and fifty grams of bread today, for the commission. Nobody trusts it, and everybody eats it.' : 'And the bread: five hundred and fifty grams, or so the bread-cutter says.'}`);
  if (S.lev.alive) paras.push(S.lev.health > 60 ? 'Lev is at the end of the table. He has colour in his face, for once.'
    : S.lev.health > 35 ? 'Lev is at the end of the table, not eating yet. His bread is in front of him. He is looking at it the way you look at something that belongs to someone else.'
    : 'Lev is at the end of the table. He has eaten his bread already, all of it, in the dark, and now he is looking at yours.');
  const keepLabel = S.flags.baptist ? 'Eat half. Give the other half to Alyoshka to keep.' : 'Eat half. Sew the other half into your jacket lining.';
  const ch = [
    { id: 'eat', label: 'Eat all of it. Now, while it is yours.', hint: 'warm for an hour', fn: () => {
      adj(g / 45); S.today.ate += g; cue('bread'); go(afterBreakfast);
    } },
    { id: 'half', label: keepLabel,
      hint: S.bread >= breadCap() ? 'there is no room left to hide it' : breadForPlan() >= 600 ? 'you already have enough for the ice' : 'bread for later, or for the wire',
      fn: () => {
        const keep = Math.min(Math.round(g / 2), Math.max(0, breadCap() - S.bread));
        adj((g - keep) / 45); S.bread += keep; S.today.ate += g - keep; cue('bread');
        if (keep < Math.round(g / 2)) note(S.flags.baptist ? 'Alyoshka\'s hiding place is full. You ate the rest.' : 'The lining is full. Any more would show. You ate the rest.');
        go(afterBreakfast);
      } },
  ];
  if (S.lev.alive) ch.push({ id: 'lev', label: 'Break off a crust for Lev.', hint: `Lev is ${levWord()}`, fn: () => {
    const give = 120;
    adj((g - give) / 45);
    S.lev.health = Math.min(100, S.lev.health + 14); S.lev.helped++;
    S.stats.breadGiven += give; S.today.ate += g - give; S.today.gave = true;
    brig(2); cue('bread');
    if (S.lev.helped === 1) note('Lev ate it slowly, so it would last.');
    go(afterBreakfast);
  } });
  show(paras, ch, { frame: 'table', amb: 'amb_queue', routine: 'bread' });
}
function afterBreakfast() {
  if (S.temp <= -41) return barracksDay();
  if (S.until.infirmary) return infirmary();
  work();
}

// ---------- work ----------
const SITES = [
  { key: 'power', text: 'Wall-laying at the power station, second storey, the mortar freezing as it leaves the trowel. You have to work fast or the mortar is a stone. You have to work fast anyway.' },
  { key: 'settlement', blade: true, text: 'The Socialist Way of Life settlement: a field of holes in frozen ground where somebody has decided a town will be. The ground has decided otherwise. A pick goes in two centimetres a swing. The carpenters have a shed at the edge of it.' },
  { key: 'timber', text: 'Timber from the river bank. Two men to a log, up the bank, to the sledge. The log does not care which two.' },
];
const FOREMAN = [
  'Pasha counts heads and does not say anything. The quota is the quota.',
  'Pasha walks the line once and says nothing, which from Pasha is a speech.',
  'Pasha has the work sheet inside his jacket, against his chest, like a letter from home.',
];
function work() {
  if (S.flags.bootmakers) {
    return show(['The bootmakers\' shop. Indoors, a stove, the smell of glue and wet felt. The work is nothing. The other men in the shop do not talk to you, and after a while you understand that they do not talk to each other either. Everyone in here paid for the chair.'],
      [{ label: 'Work.', fn: () => { adj(-3); S.today.inside = true; S.today.warm = true; go(noon); } }],
      { frame: 'hut_night', amb: 'amb_cells', routine: true });
  }
  const site = pick(SITES);
  const paras = [site.text, S.until.inspection
    ? 'The commission may come to the site. Pasha has the brigade working like a picture in a newspaper.'
    : (S.day === 1 ? FOREMAN[0] : pick(FOREMAN))];
  show(paras, [
    { id: 'proper', label: 'Work. Properly.', hint: 'hard on the body; the brigade sees it', fn: () => {
      adj(-11); brig(4);
      if (site.blade && !S.flags.blade && chance(.14)) return go(foundBlade);
      go(noon);
    } },
    { id: 'enough', label: 'Work enough to be seen working.', hint: 'easier; the quota may come up short', fn: () => {
      adj(-7); brig(-4);
      if (chance(S.until.inspection ? .5 : .3)) {
        S.today.quota = false; S.flags.cutBread = true; brig(-8);
        note('The brigade came up short. Tomorrow\'s bread is cut, and everyone knows whose it was.', true);
      }
      go(noon);
    } },
    { id: 'stove', label: 'Find the stove in the lean-to and stay by it.', hint: 'warm; someone is always watching', fn: () => {
      adj(-2); brig(-8); S.today.warm = true;
      if (chance(.35)) { eye(15); note('The site foreman found you by the stove. He has a notebook.', true); }
      else note('Nobody saw. Pasha knows anyway.');
      go(noon);
    } },
  ], { frame: 'site', amb: 'amb_site', voice: S.day === 1 ? 'pasha_quota' : null, routine: 'work' });
}
function foundBlade() {
  show(['In the sawdust by the carpenters\' shed, half a hacksaw blade. Fifteen centimetres of steel. In here it is worth more than you are. It is also three years, if it is found on you.'], [
    { id: 'take', label: 'Take it. Into the boot, under the foot cloth.', hint: 'the wire needs a blade', fn: () => { S.flags.blade = true; eye(5); note('The blade is in your boot. You walk differently. You must stop walking differently.', true); go(noon); } },
    { id: 'leave', label: 'Kick sawdust over it.', fn: () => go(noon) },
  ], { frame: 'site' });
}
function barracksDay() {
  S.today.inside = true; S.today.warm = true;
  const paras = ['Too cold to march. The stove is allowed to be lit. Men mend boots, sew numbers, pick lice, lie with their eyes open.'];
  if (S.kuzma.here) paras.push('Kuzma tells the story about the priest and the tax collector again, and it is still funny, which is a kind of miracle.');
  show(paras, [
    { id: 'sleep', label: 'Sleep all day. Store it up.', fn: () => { adj(8); go(noon); } },
    { id: 'mend', label: 'Mend boots for the Latvians. They pay in tobacco.', fn: () => { adj(2); tob(1); S.stats.mended++; go(noon); } },
  ], { frame: 'stove', amb: 'amb_hut', sfx: S.kuzma.here ? 'humming' : null, routine: true });
}
function infirmary() {
  S.today.inside = true; S.today.warm = true;
  show(['Floors. The water is warm when you start and cold when you finish. Men die in the beds around you, politely, without much noise. The orderly gives you the end of somebody\'s soup.'],
    [{ label: 'Work.', fn: () => { adj(6); go(noon); } }], { frame: 'hut_morning', amb: 'amb_cells', routine: true });
}

// ---------- noon ----------
const QUIET = [
  { t: 'Noon. The soup cart does not come. Nothing happens. In here that is an event, and not a bad one.' },
  { t: 'Noon. Someone has found a bit of wire and is making a needle of it, slowly, with a stone. Six men watch him as if he were a surgeon.' },
  { t: 'Noon. The sun comes out for eleven minutes. Every face in the brigade turns to it, the way plants do.' },
  { t: 'Noon. A raven lands on the half-built wall and looks at the brigade with professional interest.' },
  { t: 'Noon. The Estonian with the good boots tells you, in careful Russian, about the sea at Pärnu. You have never seen the sea. You let him tell it twice.' },
  { t: 'Noon. Two men argue about whether it is Tuesday. It matters to neither of them. They argue anyway, because it is something to own.' },
  { t: 'Noon. Kuzma sings half a song, stops, and says he has forgotten the rest. He has not. The rest is about a woman.', when: () => S.kuzma.here },
  { t: 'Noon. Lev explains to nobody in particular how a steam engine works. The brigade listens. It is better than thinking.', when: () => S.lev.alive },
  { t: 'Noon. The soup comes, and there is a piece of potato in yours. You look at it for a while before you eat it.' },
  { t: 'Noon. The guard on the corner tower is a boy of about nineteen. He waves, then remembers, then looks away.' },
  { t: 'Noon. A man from the second brigade has frostbite in two fingers. He looks at them the way you look at a letter you do not want to open.' },
  { t: 'Noon. You count the days on your fingers, then stop, because your fingers are cold and the number is the same as yesterday, plus one.' },
];
function noon() {
  const beat = beatFor('noon');
  if (beat) return runBeat(beat);
  const ev = pickEvent();
  if (ev) return runEvent(ev);
  quietNoon();
}
function quietNoon() {
  show([pick(availableLines(QUIET))], [{ label: 'Go on.', fn: afterNoon }],
    { frame: S.today.inside ? 'stove' : 'noon', amb: S.today.inside ? 'amb_hut' : 'amb_wind', routine: true });
}
function afterNoon() { go(S.today.inside ? dinner : eveningGate); }

// ---------- evening ----------
const GATES = [
  'The column back. At the gate the warders search, because the gate is where things cross. Jackets open in the wind, hands up.',
  'The column back, in the dark, in fives, faster than it went out. The gate is where the day is decided.',
  'Back through the gate. Somebody ahead of you turns his pockets out before he is told to, which is how you know he is new.',
];
function eveningGate() {
  const paras = [pick(GATES)];
  let found = false, voice = null;
  if (S.today.wood) {
    if (chance(.35 + (S.eye >= 45 ? .2 : 0))) {
      paras.push('The warder at the gate takes your stick of wood without a word and throws it on the guards\' pile. Their stove is warmer than yours.');
      S.today.wood = false; eye(3);
      note('The guards took your wood at the gate.');
    } else {
      paras.push('The stick of wood goes through under your arm. Nobody looks at it. In the hut it goes into the stove, and the brigade remembers who brought it.');
      brig(4); adj(3); S.today.warm = true;
    }
  }
  if (chance(searchChance('gate'))) {
    const r = search(pick(['Your turn. Jacket open, arms out.', 'Lubimov is on the gate tonight. Your turn.']));
    paras.push(...r.out); found = r.found;
    if (r.hoard) voice = 'lubimov_hoarding';
  } else paras.push(pick(['The warders are cold too. The line goes through.', 'The search is quick tonight. Somebody important is waiting for the guards\' dinner.']));
  show(paras, [{ label: 'Into the zone.', fn: () => go(dinner) }],
    { frame: 'gate', amb: 'amb_march', sfx: 'boots', voice, routine: found ? null : true });
}
const DINNERS = [
  'Dinner: skilly again, and a ladle of groats if the cook\'s hand does not shake. The queue has its own law, and the law has a ladle.',
  'Dinner. The mess hut is full of steam, so that you find your bowl by feel, like a blind man finding his own face.',
  'Dinner. The cook\'s helper bangs the ladle on the pot rim between bowls, to knock off what might have been yours.',
];
function dinner() {
  const ch = [
    { id: 'bowl', label: 'Eat your bowl and get out.', hint: 'one bowl, certain', fn: () => { adj(9); S.stats.bowls++; go(night); } },
    { id: 'queue', label: 'Work the queue for a second bowl.', hint: S.brigade >= 10 ? 'Pasha\'s man is on the ladle tonight' : 'nobody here owes you anything yet', fn: () => {
      if (S.brigade >= 10 && chance(.6)) {
        adj(16); S.today.bowl = true; S.stats.bowls += 2;
        note('A second bowl slid across the counter. Nobody saw.');
      } else {
        adj(5); cue('ladle'); S.stats.bowls++;
        note('The cook\'s ladle, flat, across the knuckles. The queue laughed. You still got your one bowl, colder.');
      }
      go(night);
    } },
  ];
  if (S.tobacco > 0) ch.push({ id: 'trade', label: 'A cigarette to the cook for a bowl from the bottom.', hint: 'the thick part, where the groats sink', fn: () => {
    tob(-1); adj(14); S.today.bowl = true; S.stats.bowls++; go(night);
  } });
  show([S.day === 1 ? DINNERS[0] : pick(DINNERS)], ch, { frame: 'table', amb: 'amb_queue', routine: 'dinner' });
}

// ---------- night ----------
const NIGHTS = [
  'Night. Two hundred men breathing in a hut built for a hundred. The stove is embers.',
  'Night. Somebody is crying, very quietly, the way men learn to here. Nobody says anything. That is the kindness.',
  'Night. The Latvians are praying in Latvian. It sounds like counting.',
  'Night. Lice, and the stove ticking, and somebody\'s boots drying on the pipe, and the smell of them.',
  'Night. You lie on your back and do the thing you do instead of thinking about home: you count the planks above you.',
];
function night() {
  const m = monthOf(S.day);
  S.today.blizzard = m <= 2 ? chance(.11) : m === 3 ? chance(.05) : false;
  const paras = [pick(NIGHTS)];
  if (S.today.blizzard) paras.push('A blizzard. The hut shakes like a cart. From the window you cannot see the towers, which means the towers cannot see you.');
  if (S.flags.baptist && S.bread > 0 && S.until.searches && chance(.25)) {
    paras.push('A barracks search, at midnight, with lamps. They lift the floorboards by Alyoshka\'s bunk. Your bread goes into a sack with his.');
    S.stats.lost += S.bread; S.bread = 0;
    note('The night search found the bread under Alyoshka\'s boards.', true);
  }
  const ch = [{ id: 'sleep', label: 'Sleep.', fn: () => go(endDay) }];
  if (S.tobacco > 0) ch.push({ id: 'smoke', label: 'Smoke.', hint: 'a little warmth; one pinch less to trade', fn: () => { tob(-1); adj(4); go(endDay); } });
  ch.push({ id: 'mend', label: 'Mend boots for the Latvians.', hint: 'a pinch of tobacco, if the thread holds', fn: mend });
  if (S.bread > 0) ch.push({ id: 'stash', habit: false, label: `Eat the ${S.bread} g you have kept.`,
    hint: breadForPlan() >= 600 ? 'that is your three days on the ice' : 'bread in the stomach cannot be stolen',
    fn: () => { adj(S.bread / 40); S.today.ate += S.bread; S.bread = 0; go(endDay); } });
  ch.push({ id: 'wire', habit: false, label: 'Think about the wire.', hint: planHint(), fn: plan });
  if (S.today.blizzard && (S.flags.blade || planItems() >= 2)) stopRun('A blizzard. From the window you cannot see the towers.');
  show(paras, ch, {
    frame: S.today.blizzard ? 'blizzard' : 'hut_night', amb: S.today.blizzard ? 'amb_blizzard' : 'amb_hut',
    sfx: !S.today.blizzard && chance(.25) ? 'dogs' : null, routine: 'night',
  });
}
function mend() {
  adj(-2); S.stats.mended++;
  if (chance(.5)) { tob(1); note('Two pairs, by the light of the stove door. The Latvian paid: a pinch of tobacco, as agreed.'); }
  else note('The thread ran out halfway through the second pair. The Latvian took his boots back and paid nothing.');
  go(endDay);
}

// ---------- the account ----------
const VERDICTS = {
  good: 'A good day. Almost a happy one.',
  ok: 'Not a bad day.',
  day: 'A day. Another one struck off.',
  bad: 'A bad day. There will be others.',
};
function verdict() {
  const t = S.today;
  let p = 0;
  if (!t.cells) p++;
  if (t.bowl) p++;
  if (t.tobaccoGain) p++;
  if (t.quota) p++;
  if (!t.lost) p++;
  if (t.warm) p++;
  if (S.strength - t.startStrength >= 0) p++;
  return p >= 6 ? 'good' : p >= 4 ? 'ok' : p >= 2 ? 'day' : 'bad';
}
function ledgerLines() {
  const t = S.today, L = [], seen = new Set();
  for (const n of t.notes) if (!seen.has(n.t)) { seen.add(n.t); L.push(n.t); }
  if (t.ate) L.push(`Ate ${t.ate} g of bread${t.bowl ? ', and a second bowl' : ''}.`);
  const b0 = bodyWord(t.startStrength), b1 = bodyWord(), d = S.strength - t.startStrength;
  L.push(b0 !== b1 ? `Body: ${b0} → ${b1}.` : `Body: ${b1}, ${d > 2 ? 'a little better' : d < -2 ? 'a little worse' : 'no worse'}.`);
  const sign = (a, b) => `${a > b ? '+' : '−'}${Math.abs(a - b)}`;
  if (S.bread !== t.startBread) L.push(`Kept: ${S.bread} g of bread (${sign(S.bread, t.startBread)}).`);
  if (S.tobacco !== t.startTobacco) L.push(`Tobacco: ${S.tobacco} (${sign(S.tobacco, t.startTobacco)}).`);
  if (brigadeWord(t.startBrigade) !== brigadeWord()) L.push(`The brigade: ${brigadeWord(t.startBrigade)} → ${brigadeWord()}.`);
  else if (S.brigade - t.startBrigade >= 8) L.push('The brigade thinks a little better of you.');
  else if (S.brigade - t.startBrigade <= -8) L.push('The brigade thinks a little worse of you.');
  if (eyeWord(t.startEye) !== eyeWord()) L.push(`The eye: ${eyeWord(t.startEye)} → ${eyeWord()}.`);
  return L;
}
// One line of advice, in the camp's own voice, when something is going wrong.
function tipLine() {
  if (S.strength < 30) return S.bread > 0 ? 'You are thin. Bread kept is bread you can eat.' : 'You are thin. The medic takes two a day; men who work properly sometimes get a second bowl.';
  if (S.eye >= 45) return 'Lubimov knows your face now. Anything on you will be found.';
  if (S.brigade <= -10) return 'The brigade is watching you. In here the brigade is the only thing between a man and the cold.';
  if (S.day === 2 && planItems() === 0) return 'At night, think about the wire. It will tell you what you do not have.';
  return null;
}
const HABIT_WORDS = {
  bread: { eat: 'eat all your bread', half: 'keep half your bread', lev: 'share with Lev' },
  work: { proper: 'work properly', enough: 'work enough to be seen', stove: 'hide by the stove' },
  dinner: { bowl: 'one bowl', queue: 'work the queue', trade: 'a cigarette for the thick part' },
  night: { sleep: 'sleep', smoke: 'smoke', mend: 'mend boots' },
};
function habitsLine() {
  return ['bread', 'work', 'dinner', 'night'].map(k => HABIT_WORDS[k][S.habits[k]]).filter(Boolean).join(' · ');
}
// Something on the plan came into reach today.
function planNews() {
  const h = planHas(), was = S.flags.planHad || {}, gained = [];
  for (const k in h) if (h[k] && !was[k]) gained.push(k);
  S.flags.planHad = h;
  return gained;
}
function endDay() {
  if (S.dead) return die();
  const t = S.today;
  const kind = verdict();
  S.history.push({ day: S.day, v: kind, notes: t.notes.filter(n => n.major).map(n => n.t) });
  if (kind === 'good') S.stats.good = (S.stats.good || 0) + 1;
  const lines = ledgerLines();
  const gained = planNews();
  if (gained.includes('bread')) lines.push('Six hundred grams kept: three days on the ice.');
  if (gained.length) stopRun(gained.includes('bread') ? 'Six hundred grams of bread kept.' : 'Something on the wire has come into reach.');
  if (FLOW.auto && S.day - FLOW.auto.from + 1 >= RUN_CAP) stopRun(`${numberWord(RUN_CAP, true)} days.`);
  const total = SENTENCE + S.extra, ice = ICE_OUT_DAY - S.day;
  const paras = [];
  if (S.day === 1) {
    paras.push(`~ Day one of ${fmtInt(total)}. The three extra days are for the leap years.`);
    paras.push('~ From here the days can run on their own, the way you lived this one, until something happens.');
  } else {
    paras.push(`~ Day ${fmtInt(S.day)} of ${fmtInt(total)}. ${ice > 1 ? `The ice goes out in about ${ice} days.` : 'The ice is going out.'}`);
  }
  const tip = tipLine();
  if (tip) paras.push('~ ' + tip);
  show(paras, [
    { id: 'next', label: 'Sleep.', fn: nextDay },
    { id: 'run', label: 'Let the days run.', hint: habitsLine(), fn: () => { startRun(); nextDay(); } },
  ], {
    frame: 'hut_night', amb: t.blizzard ? 'amb_blizzard' : 'amb_hut', sfx: 'pencil', routine: true,
    ledger: { date: fmtDate(S.day), day: S.day, lines, verdict: VERDICTS[kind], kind },
  });
}
