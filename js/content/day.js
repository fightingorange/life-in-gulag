'use strict';
// A day: reveille, count, bread, work, noon, the gate, dinner, night, and the account at the end.

function blankToday() {
  return {
    startStrength: S.strength, startBread: S.bread, startTobacco: S.tobacco, startBrigade: S.brigade, startEye: S.eye,
    cells: false, bowl: false, quota: true, lost: false, tobaccoGain: false, warm: false, inside: false,
    wood: false, blizzard: false, gave: false, ate: 0, notes: [], mercies: [],
    site: null,      // the day's work site key ('power' | 'settlement' | 'timber'), null when inside
    causes: {},      // what the body gained and lost today, by cause (the account says it in words)
  };
}
// A change to the body, remembered by its cause for the night's account.
function cost(d, why) { S.today.causes[why] = (S.today.causes[why] || 0) + d; adj(d); }
// The day's work site, or null on a day inside (events.js and lines.js read it).
function todaySite() { return SITES.find(s => s.key === (S.today && S.today.site)) || null; }

function nextDay() {
  S.day++;
  if (STORE) STORE.save(S);
  startDay();
}

// The daily cost of being alive here: more in the cold, and a little more every month.
function drain() {
  const cold = Math.max(0, -S.temp - 20) / 3.2;
  const feet = S.flags.rubber ? (S.temp <= -35 ? 2 : S.temp <= -15 ? 1 : 0) : 0;   // Vaska's tyre-rubber boots (arrival.js)
  const ribs = S.until.ribs ? 2 : 0;   // the boots fight (arrival.js)
  const door = S.flags.door ? 1 : 0;   // the bunk by the door (events.js, brigade_door)
  return Math.round(6.4 + cold + S.day / 40 + (S.until.nojacket ? 3 : 0) + feet + ribs + door);
}

function startDay() {
  FLOW.story = false;
  S.today = blankToday();
  for (const k in S.until) if (S.until[k] < S.day) delete S.until[k];
  if (S.day >= ICE_OUT_DAY) return spring();
  S.temp = S.day === 1 ? -27 : rollTemp(S.day);   // the first day always marches out
  const before = S.strength;
  const ribs = S.until.ribs ? 2 : 0, door = S.flags.door ? 1 : 0;
  cost(-(drain() - ribs - door), 'the cold');
  if (ribs) cost(-ribs, 'the ribs');
  if (door) { cost(-door, 'the door'); S.stats.doorNights = (S.stats.doorNights || 0) + 1; }
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
  if (S.flags.levOffice) { if (S.lev.health < 60) S.lev.health++; }   // the office: a stove, a kettle, a chair
  else S.lev.health -= S.temp <= -35 ? 3 : 2;
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

// ---------- which picture ----------
// The picture follows what is happening: the month's light at reveille, the size of the ration,
// which work site and how far it has got. Pictures not drawn yet show their stand-ins (js/assets.js).
function morningFrame() { const m = monthOf(S.day); return m <= 1 ? 'hut_morning_dark' : m === 2 ? 'hut_morning_grey' : 'hut_morning_sun'; }
function breakfastFrame(g) { return g <= 400 ? 'breakfast_400' : g >= 650 ? 'breakfast_650' : 'breakfast_550'; }
function siteStage() { return S.day < 40 ? 1 : S.day < 90 ? 2 : 3; }
function siteFrame(site) { return `site_${site ? site.key : 'settlement'}_${siteStage()}`; }

// ---------- morning ----------

function reveille() {
  const t = -S.temp;
  const feel = t >= 40 ? 'The cold has a sound today: the nails in the roof.'
    : t >= 30 ? 'The window has two fingers of ice on the inside.'
    : t >= 15 ? 'Not the worst morning. You distrust it.'
    : 'Water drips somewhere in the roof. You had forgotten that water could do that.';
  if (t < 15) cue('drip');
  const paras = [`Reveille. Somebody hits the rail outside the staff hut with a hammer. ${tempWords()}. ${feel} ${L('light')}`.trim()];
  paras.push(S.day === 1
    ? `${S.flags.metSenka ? 'In the bunk above, Senka\'s boots hang by your face.' : 'In the bunk above, a pair of boots hangs by your face. When their owner swings down you see whose they are: the big man from the march.'} Pasha the foreman is already up, which means the brigade is going somewhere it does not want to go.`
    : L('morning'));
  if (S.brigade <= -30 && chance(.3)) {
    paras.push('On the way to the latrine someone\'s shoulder takes you into the door frame, and then a knee. Nobody looks.');
    cost(-10, 'the brigade');
    note('The brigade has decided something about you.', true);
  }
  const ch = [
    { id: 'up', label: 'Get up.', fn: () => go(count) },
    { id: 'lie', habit: false, label: 'Five more minutes under the jacket.', hint: 'warm, if Lubimov is counting someone else', fn: lieIn },
  ];
  if (S.strength < 40) ch.push({ id: 'sick', habit: false, label: 'Lie still. Report sick.', hint: 'the medic takes two a day', fn: reportSick });
  show(paras, ch, { frame: 'reveille', seq: 'reveille', amb: 'amb_hut_morning', sfx: 'rail', routine: 'morning' });   // the rail, then the man standing
}
function lieIn() {
  if (chance(.3)) return cellsDay('Warder Lubimov. He does not shout. He writes your number in a book, and that is worse than shouting. "Three days. With work." You get one of them today.', 'lubimov_cells');
  cost(3, 'the warm');
  note('Five minutes. Nobody came.');
  mercy('Five minutes more under the jacket.', 0);
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
  cost(-14, 'the cells');
  show([why,
    'The cells. A box of planks on bare ground, three hundred grams, hot food every third day. You sit on the edge of the bunk because the bunk is nailed up in daytime. You think about nothing, carefully, for a long time.',
  ], [{ label: 'Let the day go.', fn: () => go(cellsNight) }], { frame: 'cells', amb: 'amb_cells', sfx: 'door', voice });
}
// The night in the cells: no stove, no Kuzma, and the bread, if it came in with you.
// Alyoshka's boards are a hut away, so bread he keeps for you stays there.
function cellsNight() {
  const kept = S.bread > 0 && !S.flags.baptist;
  const bread = kept ? `Your ${S.bread} grams are still in the lining. Nobody looked, or nobody bothered.`
    : S.bread > 0 ? 'Your bread is under Alyoshka\'s boards, a hut away, which is the only reason it is still yours.'
    : 'There is nothing in the lining. You feel for it anyway.';
  const ch = [{ id: 'sleep', def: true, label: 'Lie down on the plank.', fn: () => go(endDay) }];
  if (kept) ch.push({ id: 'stash', habit: false, label: `Eat the ${S.bread} g you have kept.`, hint: 'bread in the stomach cannot be stolen',
    fn: () => { cost(S.bread / 40, 'bread'); S.today.ate += S.bread; S.bread = 0; go(endDay); } });
  show([`Night in the cells. The cold comes up through the planks of the floor and in through the planks of the wall, and meets in the middle, where you are. At lights out the warder lets the bunk down on its chain. It is a plank too. ${bread}`],
    ch, { frame: 'cells', amb: 'amb_cells', routine: 'night' });
}
function sickDay() {
  cost(12, 'the warm'); brig(-4);
  S.today.warm = true; S.today.inside = true;
  mercy('A whole day in the warm.', 0);
  show([
    L('sick'),
    'Tomorrow the quota will have been short by one man, and the brigade will remember who.',
  ], [{ label: 'Sleep.', fn: () => go(endDay) }], { frame: morningFrame(), amb: 'amb_cells' });   // the hut empty all day
}

// ---------- the count, and searches ----------
const FIRST_COUNT = 'Count. The first count inside the wire: four hundred and some men in the dark, in the wind off the river. It comes out wrong the first time, as Kuzma said it would, and they count again.';
// Lev in the office knows the warders' evenings (events.js, lev_warn and lev_quiet).
function searchChance(where) {
  if (S.until.noSearch >= S.day) return 0;
  if (where === 'gate' && S.flags.warnedDay === S.day) return .9;
  let p = where === 'count' ? .12 : .22;
  if (S.eye >= 20) p += .1;
  if (S.eye >= 45) p += .2;
  if (S.eye >= 70) p += .2;
  if (S.until.searches) p += .3;
  return clamp(p, 0, .9);
}
function search(lead) {
  const out = [lead];
  let found = false, hoard = false;
  if (S.bread > 0 && !S.flags.baptist && chance(S.bread >= 300 ? .35 : .2)) {
    out.push(`Your ${S.bread} grams, from the lining. He weighs it in his hand and puts it in his pocket. "Hoarding."`);
    S.stats.lost += S.bread; S.bread = 0;
    eye(8); found = hoard = true; S.today.lost = true;
    remember('Lubimov took the bread from your lining.', true);
  }
  if (S.flags.blade && chance(.25)) {
    out.push('The blade. He holds it up so the column can see what a blade looks like. Then he looks at you for a long time, so that he will know you tomorrow.');
    S.flags.blade = false; S.flags.pendingCells = true;
    S.flags.cellsWhy = 'Three days for the blade. They give you one of them now and owe you the others.';
    eye(30); found = true; S.today.lost = true;
    remember('They found the blade. The cells tomorrow.', true);
  }
  if (!found) out.push(L('searchNone'));
  return { out, found, hoard };
}
function count() {
  const paras = [S.day === 1 ? FIRST_COUNT : L('count')];
  let found = false, voice = S.day === 1 || chance(.2) ? 'lubimov_count' : null;
  if (chance(searchChance('count'))) {
    const r = search('Lubimov walks the line opening jackets.');
    paras.push(...r.out); found = r.found;
    if (r.hoard) voice = 'lubimov_hoarding';
  } else paras.push(L('countQuiet'));
  if (S.temp <= -41) paras.push('The thermometer by the gate says forty-one. Below forty-one they do not march you out. Nobody trusts the thermometer, but today it is on your side.');
  show(paras, [{ label: S.temp <= -41 ? 'Back to the hut.' : 'Stand.', fn: () => go(breakfast) }],
    { frame: 'count_camp', amb: 'amb_wind', scape: 'count', sfx: 'boots', voice, routine: found ? null : true });
}

// ---------- bread ----------
// a jacket lining hides about seven hundred grams; Alyoshka's boards a little more
function breadCap() { return S.flags.baptist ? 900 : 700; }
function ration() { return (S.until.inspection || S.until.bonus) ? 650 : (S.flags.cutBread || S.until.cut) ? 400 : 550; }   // bonus: the percentage you wrote (events.js, measure)
function breakfast() {
  const g = ration();
  S.flags.cutBread = false;
  const paras = [];
  if (S.day === 1) paras.push('Breakfast: the same skilly as last night, and this time bread with it. Your five hundred and fifty grams, under weight as always, still warm from the bakery sledge.');
  else paras.push(`${L('breakfast')} ${g === 400 ? 'Four hundred grams of bread today. Everyone knows why.' : g === 650 ? 'Six hundred and fifty grams of bread today, for the commission. Nobody trusts it, and everybody eats it.' : 'And the bread: five hundred and fifty grams, or so the bread-cutter says.'}`);
  const levAway = S.flags.levOffice && S.lev.alive;   // Lev works in the office now (events.js, lev_repay)
  if (levAway) paras.push('Lev eats at the office table now, with the trusties. He looks across once, and nods, and does not look again.');
  else if (S.lev.alive) paras.push(S.lev.health > 60 ? 'Lev is at the end of the table. He has colour in his face, for once.'
    : S.lev.health > 35 ? 'Lev is at the end of the table, not eating yet. His bread is in front of him. He is looking at it the way you look at something that belongs to someone else.'
    : 'Lev is at the end of the table. He has eaten his bread already, all of it, in the dark, and now he is looking at yours.');
  const keepLabel = S.flags.baptist ? 'Eat half. Give the other half to Alyoshka to keep.' : 'Eat half. Sew the other half into your jacket lining.';
  const ch = [
    { id: 'eat', label: 'Eat all of it. Now, while it is yours.', hint: 'warm for an hour', fn: () => {
      cost(g / 45, 'bread'); S.today.ate += g; cue('bread'); go(afterBreakfast);
    } },
    { id: 'half', label: keepLabel,
      hint: S.bread >= breadCap() ? 'there is no room left to hide it' : breadForPlan() >= 600 ? 'you already have enough for the ice' : 'bread for later, or for the wire',
      fn: () => {
        const keep = Math.min(Math.round(g / 2), Math.max(0, breadCap() - S.bread));
        cost((g - keep) / 45, 'bread'); S.bread += keep; S.today.ate += g - keep; cue('bread');
        if (keep < Math.round(g / 2)) note(S.flags.baptist ? 'Alyoshka\'s hiding place is full. You ate the rest.' : 'The lining is full. Any more would show. You ate the rest.');
        go(afterBreakfast);
      } },
  ];
  if (S.lev.alive && !levAway) ch.push({ id: 'lev', label: 'Break off a crust for Lev.', hint: `Lev is ${levWord()}`, fn: () => {
    const give = 120;
    cost((g - give) / 45, 'bread');
    S.lev.health = Math.min(100, S.lev.health + 14); S.lev.helped++;
    S.stats.breadGiven += give; S.today.ate += g - give; S.today.gave = true;
    brig(2); cue('bread');
    if (S.lev.helped === 1) note('Lev ate it slowly, so it would last.');
    mercy('Lev, eating slowly.', 0);
    go(afterBreakfast);
  } });
  show(paras, ch, { frame: breakfastFrame(g), amb: 'amb_queue', routine: 'bread' });
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
function work() {
  if (S.flags.bootmakers) {
    return show(['The bootmakers\' shop. Indoors, a stove, the smell of glue and wet felt. The work is nothing. The other men in the shop do not talk to you, and after a while you understand that they do not talk to each other either. Everyone in here paid for the chair.'],
      [{ label: 'Work.', fn: () => { cost(-3, 'the work'); S.today.inside = true; S.today.warm = true; go(noon); } }],
      { frame: 'hut_night', amb: 'amb_cells', routine: true });
  }
  const site = pick(SITES);
  S.today.site = site.key;
  const season = S.day === 1 ? '' : L('site');
  const paras = [season ? `${site.text} ${season}` : site.text, S.until.inspection
    ? 'The commission may come to the site. Pasha has the brigade working like a picture in a newspaper.'
    : (S.day === 1 ? 'Pasha counts heads and does not say anything. The quota is the quota.' : L('foreman'))];
  if (S.flags.measurer) paras.push('The board and the tape are yours today. Pasha does not look at them. That is the point of giving them to you.');
  else if (S.flags.door) paras.push(site.key === 'timber' ? 'You get the end of the log that goes into the water. Nobody says why. Nobody needs to.'
    : site.key === 'power' ? 'You get the wind side of the wall, and the mortar to carry up to it. Nobody says why. Nobody needs to.'
    : 'You get the shovel with the split handle and the pit with the water in it. Nobody says why. Nobody needs to.');
  show(paras, [
    { id: 'proper', label: 'Work. Properly.', hint: S.temp <= -35 ? 'in this cold, sweat freezes in the clothes' : 'hard on the body; the brigade sees it', fn: () => {
      cost(S.temp <= -35 ? -15 : -11, 'the work'); brig(4);
      if (S.until.ribs) cost(-2, 'the ribs');
      if (S.temp <= -35 && chance(.25)) note('Sweat froze in your shirt at the noon break. You will feel it in the night.');
      if (site.blade && !S.flags.blade && chance(.14)) return go(foundBlade);
      go(noon);
    } },
    { id: 'enough', label: 'Work enough to be seen working.', hint: 'easier; the quota may come up short', fn: () => {
      cost(-7, 'the work'); brig(-4);
      if (chance(S.until.inspection ? .5 : .3)) {
        S.today.quota = false; S.flags.cutBread = true; brig(-8);
        note('The brigade came up short. Tomorrow\'s bread is cut, and everyone knows whose it was.', true);
      }
      go(noon);
    } },
    { id: 'stove', label: 'Find the stove in the lean-to and stay by it.', hint: 'warm; someone is always watching', fn: () => {
      cost(-2, 'the stove'); brig(-8); S.today.warm = true;
      if (chance(.35)) { eye(15); note('The site foreman found you by the stove. He has a notebook.', true); }
      else note('Nobody saw. Pasha knows anyway.');
      go(noon);
    } },
  ], { frame: siteFrame(site), amb: 'amb_site', scape: 'site_' + site.key, voice: S.day === 1 ? 'pasha_quota' : null, routine: 'work' });
}
function foundBlade() {
  show(['In the sawdust by the carpenters\' shed, half a hacksaw blade. Fifteen centimetres of steel. In here it is worth more than you are. It is also three years, if it is found on you.'], [
    { id: 'take', label: 'Take it. Into the boot, under the foot cloth.', hint: 'the wire needs a blade', fn: () => { S.flags.blade = true; S.flags.bladeDay = S.day; eye(5); note('The blade is in your boot. You walk differently. You must stop walking differently.', true); go(noon); } },
    { id: 'leave', def: true, label: 'Kick sawdust over it.', fn: () => go(noon) },
  ], { frame: siteFrame(SITES[1]) });
}
function barracksDay() {
  S.today.inside = true; S.today.warm = true;
  mercy('A day too cold to march.', 0);
  const paras = ['Too cold to march. The stove is allowed to be lit. Men mend boots, sew numbers, pick lice, lie with their eyes open.'];
  if (S.kuzma.here) paras.push('Kuzma tells the story about the priest and the tax collector again, and it is still funny, which is a kind of miracle.');
  show(paras, [
    { id: 'sleep', label: 'Sleep all day. Store it up.', fn: () => { cost(8, 'the warm'); go(noon); } },
    { id: 'mend', label: 'Mend boots for the Latvians. They pay in tobacco.', fn: () => { cost(2, 'the warm'); tob(1); S.stats.mended++; go(noon); } },
  ], { frame: 'stove', amb: 'amb_hut', sfx: S.kuzma.here ? 'humming' : null, routine: true });
}
function infirmary() {
  S.today.inside = true; S.today.warm = true;
  show(['Floors. The water is warm when you start and cold when you finish. Men die in the beds around you, politely, without much noise. The orderly gives you the end of somebody\'s soup.'],
    [{ label: 'Work.', fn: () => { cost(5, 'the warm'); mercy('Warm water, and the end of somebody\'s soup.', 0); go(noon); } }], { frame: morningFrame(), amb: 'amb_cells', routine: true });
}

// ---------- noon ----------
function noon() {
  const beat = beatFor('noon');
  if (beat) return runBeat(beat);
  const ev = pickEvent();
  if (ev) return runEvent(ev);
  quietNoon();
}
function quietNoon() {
  show([L('quiet')], [{ label: 'Go on.', fn: afterNoon }],
    { frame: S.today.inside ? 'stove' : 'noon', amb: S.today.inside ? 'amb_hut' : 'amb_wind', sfx: S.today.inside ? null : 'ru_site_smoke', routine: true });
}
function afterNoon() { FLOW.story = false; go(S.today.inside ? dinner : eveningGate); }

// ---------- evening ----------
function eveningGate() {
  const paras = [L('gate')];
  let found = false, voice = null;
  if (S.today.wood) {
    if (chance(.35 + (S.eye >= 45 ? .2 : 0))) {
      paras.push('The warder at the gate takes your stick of wood without a word and throws it on the guards\' pile. Their stove is warmer than yours.');
      S.today.wood = false; eye(3);
      remember('The guards took your wood at the gate.');
    } else {
      paras.push('The stick of wood goes through under your arm. Nobody looks at it. In the hut it goes into the stove, and the brigade remembers who brought it.');
      brig(4); cost(3, 'the wood'); S.today.warm = true;
      mercy('Your stick of wood in the stove.', 0);
    }
  }
  if (chance(searchChance('gate'))) {
    const r = search(L('searchLead'));
    paras.push(...r.out); found = r.found;
    if (r.hoard) voice = 'lubimov_hoarding';
  } else paras.push(L('gateQuiet'));
  show(paras, [{ label: 'Into the zone.', fn: () => go(dinner) }],
    { frame: 'gate', seq: 'gate_search', amb: 'amb_march', sfx: 'boots', voice, routine: found ? null : true });
}
function dinner() {
  const ch = [
    { id: 'bowl', label: 'Eat your bowl and get out.', hint: 'one bowl, certain', fn: () => { cost(9, 'the bowl'); S.stats.bowls++; go(night); } },
    { id: 'queue', label: 'Work the queue for a second bowl.', hint: S.brigade >= 10 ? 'Pasha\'s man is on the ladle tonight' : 'nobody here owes you anything yet', fn: () => {
      if (S.brigade >= 10 && chance(.6)) {
        cost(14, 'the bowl'); S.today.bowl = true; S.stats.bowls += 2;
        note('A second bowl slid across the counter. Nobody saw.');
        mercy('A second bowl.', 0);
      } else {
        cost(5, 'the bowl'); cue('ladle'); S.stats.bowls++;
        note('The cook\'s ladle, flat, across the knuckles. The queue laughed. You still got your one bowl, colder.');
      }
      go(night);
    } },
  ];
  if (S.tobacco > 0) ch.push({ id: 'trade', label: 'A cigarette to the cook for a bowl from the bottom.', hint: 'the thick part, where the groats sink', fn: () => {
    tob(-1); cost(13, 'the bowl'); S.today.bowl = true; S.stats.bowls++;
    mercy('The thick part, from the bottom of the pot.', 0);
    go(night);
  } });
  const paras = [S.day === 1 ? LINES.dinner[0].t : L('dinner')];
  if (S.flags.door) paras.push('You eat by the door, where the cold comes in with every man who comes in, and the ladle reaches you last and scrapes.');
  else if (S.brigade >= 30) paras.push('You eat at the end of the bench by the stove, where Pasha\'s men eat. Nobody moved up to make room. There was room.');
  show(paras, ch, { frame: 'supper', amb: 'amb_queue', routine: 'dinner' });
}

// ---------- night ----------
function night() {
  const beat = beatFor('night');   // a night beat replaces the night (the boots, arrival.js)
  if (beat) return runBeat(beat);
  const m = monthOf(S.day);
  S.today.blizzard = m <= 2 ? chance(.11) : m === 3 ? chance(.05) : false;
  const paras = [L('night')];
  if (S.today.blizzard) paras.push(L('blizzard'));
  if (S.flags.baptist && S.bread > 0 && S.until.searches && chance(.25)) {
    paras.push('A barracks search, at midnight, with lamps. They lift the floorboards by Alyoshka\'s bunk. Your bread goes into a sack with his.');
    S.stats.lost += S.bread; S.bread = 0;
    note('The night search found the bread under Alyoshka\'s boards.', true);
  }
  const ch = [{ id: 'sleep', label: 'Sleep.', fn: () => go(endDay) }];
  if (S.tobacco > 0) ch.push({ id: 'smoke', label: 'Smoke.', hint: 'a little warmth; one pinch less to trade', fn: () => { tob(-1); cost(3, 'the smoke'); mercy('A smoke, in the dark, slowly.'); go(endDay); } });
  ch.push({ id: 'mend', label: 'Mend boots for the Latvians.', hint: 'a pinch of tobacco, if the thread holds', fn: mend });
  if (S.bread > 0) ch.push({ id: 'stash', habit: false, label: `Eat the ${S.bread} g you have kept.`,
    hint: breadForPlan() >= 600 ? 'that is your three days on the ice' : 'bread in the stomach cannot be stolen',
    fn: () => { cost(S.bread / 40, 'bread'); S.today.ate += S.bread; S.bread = 0; go(endDay); } });
  ch.push({ id: 'wire', habit: false, label: 'Think about the wire.', hint: planHint(), fn: plan });
  if (S.today.blizzard && (S.flags.blade || planItems() >= 2)) stopRun('A blizzard. From the window you cannot see the towers.');
  // the hut's own sound tonight: quieter after Kuzma's paper, draughtier by the door (js/soundscapes.js)
  const scape = S.today.blizzard ? undefined : S.kuzma.here && S.flags.kuzmaHeld && S.day - S.flags.kuzmaHeld <= 6 ? 'hut_quiet' : S.flags.door ? 'hut_door' : undefined;
  show(paras, ch, {
    frame: S.today.blizzard ? 'blizzard' : 'hut_night_pano', amb: S.today.blizzard ? 'amb_blizzard' : 'amb_hut', scape,
    sfx: !S.today.blizzard && chance(.25) ? 'dogs' : null, routine: 'night',
  });
}
function mend() {
  adj(-2); S.stats.mended++;
  if (chance(.5)) { tob(1); note('Two pairs, by the light of the stove door. The Latvian paid: a pinch of tobacco, as agreed.'); mercy('The Latvian paid, as agreed.', 0); }
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
  p += Math.min(3, t.mercies.length);
  if (!t.mercies.length) p = Math.min(p, 5);   // no day without something good in it is a good day
  return p >= 8 ? 'good' : p >= 6 ? 'ok' : p >= 3 ? 'day' : 'bad';
}
function ledgerLines() {
  const t = S.today, L = [], seen = new Set();
  // the important notes first, then the rest; the account keeps to eight lines in all
  const notes = [...t.notes.filter(n => n.major), ...t.notes.filter(n => !n.major)];
  for (const n of notes) if (!seen.has(n.t)) { seen.add(n.t); L.push(n.t); }
  L.splice(4);
  if (t.ate) L.push(`Ate ${t.ate} g of bread${t.bowl ? ', and a second bowl' : ''}.`);
  const b0 = bodyWord(t.startStrength), b1 = bodyWord(), d = S.strength - t.startStrength;
  L.push(b0 !== b1 ? `Body: ${b0} → ${b1}.` : `Body: ${b1}, ${d > 2 ? 'a little better' : d < -2 ? 'a little worse' : 'no worse'}.`);
  const why = causesLine();
  if (why) L.push(why);
  const sign = (a, b) => `${a > b ? '+' : '−'}${Math.abs(a - b)}`;
  if (S.bread !== t.startBread) L.push(`Kept: ${S.bread} g of bread (${sign(S.bread, t.startBread)}).`);
  if (S.tobacco !== t.startTobacco) L.push(`Tobacco: ${S.tobacco} (${sign(S.tobacco, t.startTobacco)}).`);
  if (brigadeWord(t.startBrigade) !== brigadeWord()) L.push(`The brigade: ${brigadeWord(t.startBrigade)} → ${brigadeWord()}.`);
  else if (S.brigade - t.startBrigade >= 8) L.push('The brigade thinks a little better of you.');
  else if (S.brigade - t.startBrigade <= -8) L.push('The brigade thinks a little worse of you.');
  if (eyeWord(t.startEye) !== eyeWord()) L.push(`The eye: ${eyeWord(t.startEye)} → ${eyeWord()}.`);
  return L.slice(0, 8);
}
// What the day took out of the body and what it put back, in words: the two biggest losses, the biggest gain.
function causesLine() {
  const c = Object.entries((S.today && S.today.causes) || {});
  const took = c.filter(([, v]) => v <= -1).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);
  const gave = c.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).slice(0, 1).map(([k]) => k);
  const out = [];
  if (took.length) out.push(`What took: ${took.join(', then ')}.`);
  if (gave.length) out.push(`What gave: ${gave[0]}.`);
  return out.join(' ') || null;
}
// One line of advice, in the camp's own voice, when something is going wrong.
function tipLine() {
  const t = tipText();
  if (!t) return null;
  S.tips = S.tips || {};
  if (S.tips[t] && S.day - S.tips[t] < 5) return null;
  S.tips[t] = S.day;
  return t;
}
function tipText() {
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
  // once, in the first fortnight, when a new man is going: Kuzma's half loaf (lines.js remembers it)
  if (S.day <= 14 && S.strength < 18 && S.kuzma.here && !S.flags.kuzmaHalf && !t.cells) {   // not through the cell wall
    S.flags.kuzmaHalf = S.day;
    cost(12, 'Kuzma');
    mercy('Kuzma\'s half loaf, in the dark.');
    remember('Kuzma broke his bread and gave you half.', true);
    t.notes.unshift(t.notes.pop());   // first in the account
    t.kuzmaHalf = 'In the dark Kuzma breaks his bread in two and puts half of it in your hand without a word. When you try to say something he says, "Thin men are bad luck in a brigade. Eat." Then, while you eat, he tells the stove about the priest and the tax collector, the whole of it, to the end.';
    stopRun('Kuzma\'s half loaf.');
  }
  if (!t.mercies.length && chance(.4)) {
    const m = L('mercy');
    mercy(m);
    if (m.startsWith('You found a crust')) S.bread += 60;
  }
  const kind = verdict();
  S.history.push({ day: S.day, v: kind, notes: t.notes.filter(n => n.major).map(n => n.t), good: t.mercies.slice() });
  if (kind === 'good') S.stats.good = (S.stats.good || 0) + 1;
  const lines = ledgerLines();
  const gained = planNews();
  if (gained.includes('bread')) lines.push('Six hundred grams kept: three days on the ice.');
  if (gained.length) stopRun(gained.includes('bread') ? 'Six hundred grams of bread kept.' : 'Something on the wire has come into reach.');
  if (FLOW.auto && S.day - FLOW.auto.from + 1 >= RUN_CAP) stopRun(`${numberWord(RUN_CAP, true)} days.`);
  const total = SENTENCE + S.extra, ice = ICE_OUT_DAY - S.day;
  const paras = [];
  if (t.kuzmaHalf) paras.push(t.kuzmaHalf);   // the half loaf, as a paragraph above the account
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
    frame: 'hut_night_pano', amb: t.blizzard ? 'amb_blizzard' : 'amb_hut', sfx: 'pencil', routine: true, voice: t.kuzmaHalf ? 'kuzma_half' : null,
    ledger: { date: fmtDate(S.day), day: S.day, lines, good: t.mercies.slice(), verdict: VERDICTS[kind], kind },
  });
}
