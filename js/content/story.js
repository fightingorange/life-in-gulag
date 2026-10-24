'use strict';
// The frame of the story: the title, the opening, the endings, and the camp record.

const QUOTES = {
  creature: ['Man is a creature that can get used to anything, and I think that is the best definition of him.', 'Dostoevsky, The House of the Dead'],
  coined: ['Money is coined liberty, and so it is ten times dearer to a man who is deprived of freedom.', 'Dostoevsky, The House of the Dead'],
  lie: ['Above all, don\'t lie to yourself.', 'Dostoevsky, The Brothers Karamazov'],
  goal: ['Without some goal and some effort to reach it, no man can live.', 'Dostoevsky, The House of the Dead'],
  heart: ['Pain and suffering are always inevitable for a large intelligence and a deep heart.', 'Dostoevsky, Crime and Punishment'],
  hell: ['What is hell? I maintain that it is the suffering of being unable to love.', 'Dostoevsky, The Brothers Karamazov'],
  own: ['To go wrong in one\'s own way is better than to go right in someone else\'s.', 'Dostoevsky, Crime and Punishment'],
};
// The title's epigraph; the endings end on their own words.
const epigraph = q => `" ${q[0]} || ${q[1]}`;

function title() {
  S = newState(); S.flags.title = true;
  FLOW.auto = null; FLOW.stop = null;
  const saved = STORE && STORE.load();
  const ch = [{ id: 'begin', label: saved ? 'Begin again.' : 'Begin.', fn: intro }];
  if (saved) ch.unshift({ id: 'continue', label: `Continue: ${fmtDate(saved.day)}, day ${saved.day}.`, fn: () => { S = saved; startDay(); } });
  show(['# TEN YEARS', '~ Десять лет', epigraph(QUOTES.creature)], ch, { title: true, frame: 'title', amb: 'amb_wind' });
}
// The opening (the wagon, the march, the gate, the hut) is in arrival.js: intro().

// ---------- endings ----------
const spoonHand = () => S.kuzma.here ? 'Kuzma takes your spoon' : 'somebody takes your spoon';
const ENDINGS = {
  died: {
    stamp: 'УМЕР', outcome: 'Died in the barracks.', frame: 'dead', amb: 'amb_cells',
    voice: () => S.kuzma.here ? 'kuzma_spoon' : null,
    text: () => [
      'You do not get up at reveille. Lubimov hits the bunk with his stick, which is what you do, and then he looks, and then he goes to get the orderly.',
      `In the evening ${spoonHand()}. The dead do not need spoons, and the living do.`,
    ],
  },
  shot: {
    stamp: 'УБИТ ПРИ ПОБЕГЕ', outcome: 'Shot while attempting to escape.', frame: 'wire', amb: null, sfx: 'shot',
    text: () => {
      const r = S.esc && S.esc.cause;
      return [r === 'cut'
        ? 'The blade goes through the first wire and the second. The third is the one with the bell on it. The searchlight finds you four metres out. It is not even a decision for the man in the tower.'
        : r === 'post'
          ? 'The post goes over, and the wire with it, and something on the wire rings. The searchlight finds you before you are up. It is not even a decision for the man in the tower.'
          : 'The gap under the wire by the latrine is known. The searchlight finds you four metres out. It is not even a decision for the man in the tower.'];
    },
  },
  frozen: {
    stamp: 'УМЕР', outcome: 'Absconded. Found in the spring.', frame: 'river', amb: 'amb_wind',
    text: () => {
      const c = S.esc && S.esc.cause;
      if (c === 'ice') return ['The ice is grey now, and soft at the edges, and in the middle of the river, where it looked as strong as anywhere, it opens without a sound.', 'In the summer a fisherman finds a felt boot in his net. He hangs it on the fence, in case somebody comes for it.'];
      if (c === 'walk') return ['You walk all night, and some time before morning you stop feeling your feet, and then your hands, and then the cold, which is the dangerous one.', 'You sit down on the ice for a minute, only a minute. The minute is comfortable in a way nothing has been for a long time.', 'In the spring a surveyor finds the boots.'];
      if (c === 'lost') return ['Without the river in your head every bend is the same bend. On the third day you are walking upstream. On the fourth you understand it, and sit down.', 'Upriver there is nothing, Kuzma said. Nothing is better. He was right about the first part.'];
      if (c === 'hunger') return ['On the third day the bread is gone and the river is not. You walk, and then you sit, and then you lie down in the lee of a log, out of the wind, and the snow is soft, and you are so tired.', 'In the spring a surveyor finds the boots.'];
      return ['You sleep in the snow, under the bank, out of the wind. It is warmer than the hut. That is what everyone says, afterwards, about the ones who sleep in the snow: that they must have been warm.', 'In the spring a surveyor finds the boots.'];
    },
  },
  escaped: {
    stamp: 'В БЕГАХ', outcome: 'Absconded. Not found.', frame: 'river', amb: 'amb_wind',
    text: () => {
      const g = S.esc && S.esc.gave;
      const first = g === 'blade' ? 'He picks up the blade, weighs it, puts it in his pocket. He does not pick up the telephone.'
        : g === 'senka' ? 'Senka talks to him with his hands, for a long time. The man watches the hands, not the face. At the end he nods, once, and does not pick up the telephone.'
        : g === 'tobacco' ? 'He takes the tobacco and rolls one, and smokes it all the way down, looking at you. He does not pick up the telephone.'
        : g === 'grigory' ? 'He looks at you for a long time when you say the fisherman\'s name, and then at the telephone, and then he laughs, once, without any pleasure in it. "A net," he says. "He would." He does not pick up the telephone.'
        : g === 'money' ? 'He smooths the roubles out on the table, one by one, and folds them into his shirt. "Your wife\'s?" he asks. You nod, and he nods. He does not pick up the telephone.'
        : g === 'bread' ? 'He looks at the bread, hard and grey, and pushes it back across the table to you. "Keep it," he says. "You will need it more." He does not pick up the telephone.'
        : 'He looks at you while you eat. When you have finished he takes the bowl and fills it again. He does not pick up the telephone. Not today.';
      return [first,
        'In the morning he walks you to the edge of the settlement and points: south, along the winter road, to a railway town where nobody asks. He does not say good luck. Nobody here says good luck.',
        'Somewhere behind you a man in a quilted jacket goes back inside and sits by a telephone for a long time.'];
    },
  },
  spring: {
    stamp: 'ЖИВ', outcome: 'Alive at the breaking of the ice.', frame: 'ice_out', amb: 'amb_spring', sfx: 'ice_break',
    text: () => [
      'In the night the river makes a sound like artillery, a long way off. In the morning the ice is moving: grey plates the size of huts, turning, shouldering each other, going north to the sea.',
      'The whole column stops on the bank to watch, and the guards let it, because they are watching too.',
      ...springBank(),
      'The worst of it is over, the old men say. The old men said that last year.',
      `Tomorrow is day ${S.day + 1}. There are ${fmtInt(SENTENCE + S.extra - S.day)} to go.`,
    ],
  },
};

// Who is on the bank with you when the ice goes: the ending ends on the people, not the number.
function springBank() {
  const out = [];
  const f = S.flags;
  if (S.kuzma.here) out.push(f.kuzmaCalled
    ? 'Kuzma stands at the end of the five with the paper still inside his jacket, and watches the river go, and says, to nobody, "Well. It went." He has seen it go fifteen times. He counts this one.'
    : 'Kuzma stands at the end of the five and watches the river go, the way he has watched it go fifteen times, and says, to nobody, "Well. It went."');
  else if (f.betrayed) out.push('Kuzma is not on the bank. You know where he is not, and you do not know where he is.');
  else out.push('Kuzma is not on the bank. He would have known the day.');
  if (S.lev.alive) out.push(f.levOffice
    ? 'Lev has come out of the office to stand with the brigade, in the jacket with no number on the knee, and does not say anything about steam engines.'
    : 'Lev is beside you, thinner than the jacket, alive, looking at the water as if it were an argument he had won.');
  else out.push(f.levPencil ? 'Lev\'s pencil is in your boot. You do not take it out.' : 'Lev did not see it. You look at the water for him, which is nothing, and the only thing.');
  if (f.senkaFree) out.push('Senka is somewhere past where the river goes. Somebody says the railway town; somebody always says that. You decide to believe it, here, on the bank.');
  else if (f.senkaGone) out.push('Senka\'s boots are not above your face any more. You look at the river a long time, in case.');
  else if (f.partner) out.push('Senka is beside you, watching the ice go out as if it had been his idea and he had thought better of it. He does not look at you. That is his way of saying something.');
  if (f.door) out.push('You stand a little apart from the brigade, where a man by the door stands. Nobody moves you back. Nobody moves you further off.');
  else if (f.measurer) out.push('Pasha stands with the board under his arm, which is yours now, and does not look at the river. He is looking at the brigade, counting, as he does.');
  else if (f.pashaReply) out.push('Pasha stands with the brigade, with his daughter\'s letter inside his jacket, and watches the river go towards Vologda, which is the wrong way, and does not care.');
  else if (S.brigade >= 30) out.push('Pasha stands with the brigade and you stand with Pasha, which nobody decided and everybody knows.');
  return out;
}
function finish(kind) {
  const E = ENDINGS[kind];
  if (S.esc && S.esc.days) S.day = Math.min(ICE_OUT_DAY - 1, S.day + S.esc.days - 1);
  S.ended = kind;
  S.dead = kind !== 'escaped' && kind !== 'spring';
  FLOW.auto = null; FLOW.stop = null;
  if (STORE) STORE.clear();
  show(E.text(), [{ id: 'again', label: 'Again.', fn: title }], {
    frame: E.frame, amb: E.amb, sfx: E.sfx || null, voice: E.voice ? E.voice() : null,
    record: recordFor(kind), ending: kind, story: true, cam: 'still',
  });
}
function die() { finish('died'); }
function spring() { finish('spring'); }

function recordFor(kind) {
  const E = ENDINGS[kind], total = SENTENCE + S.extra;
  return {
    stamp: E.stamp, outcome: E.outcome, kind,
    fields: [
      ['Prisoner', NUMBER],
      ['Article', '58-10, anti-Soviet agitation'],
      ['Sentence', S.extra ? 'ten years, and ten more' : 'ten years'],
      ['Date', `${fmtDate(S.day)} 1951`],
      ['Days served', fmtInt(S.day)],
      ['Days remaining', kind === 'spring' || kind === 'escaped' ? fmtInt(total - S.day) : '—'],
    ],
    unsaid: unsaidLines(),
  };
}
function unsaidLines() {
  const st = S.stats, L = [];
  L.push(st.breadGiven ? `You gave away ${fmtInt(st.breadGiven)} grams of bread.` : 'You never gave anyone your bread. Nobody here could say you should have.');
  if (S.flags.betrayed) L.push('You gave the kum a name.');
  else if (S.flags.refusedName) L.push('You were asked for a name, and you did not give one.');
  if (S.lev.alive) L.push(S.day >= 100 ? 'Lev lived to see the spring.' : 'Lev was still alive.');
  else L.push(`Lev died on ${S.lev.diedOn}.`);
  if (!S.kuzma.here) L.push(S.flags.betrayed ? 'Kuzma was taken away with his bag.' : `Kuzma died on ${S.kuzma.diedOn}. Somebody else tells the stove stories now.`);
  else if (S.kuzma.helped) L.push('Kuzma\'s cough went the way it came.');
  if (S.flags.kuzmaCalled && S.kuzma.here) L.push('Kuzma\'s fifteen years ended on the first of May. He is still here.');
  if (S.flags.senkaDate && S.flags.senkaGone) L.push(S.flags.senkaFree ? 'Senka went on the first of May, without you. They did not find him.' : 'Senka went on the first of May, without you. They brought him back on the fourth day.');
  const boots = {
    gave: 'You gave Vaska Kosoi your boots on the third night.',
    fought: 'You fought Vaska Kosoi for your boots on the third night.',
    tribute: `You paid Vaska Kosoi ${fmtInt(st.tribute || 0)} grams of bread for the boots on your own feet.`,
    paid: 'Nina\'s roubles bought your boots back from Vaska Kosoi.',
    brigade: 'Pasha stood up for you on the third night.',
    warder: 'You called the warder. Lubimov wore your boots all winter.',
  }[S.flags.urki];
  if (boots) L.push(boots);
  if (S.flags.toes) L.push('Two toes went in the cold, in Vaska\'s rubbers.');
  if (S.flags.pashaLetter) L.push(S.flags.pashaReply ? 'You wrote Pasha\'s letter to Vologda, and read him the answer.' : 'You wrote Pasha\'s letter to Vologda.');
  if (S.stats.measured) L.push(`You held the brigade\'s board ${numberWord(S.stats.measured)} ${plural(S.stats.measured, 'time', 'times')}${S.stats.tufta ? `, and wrote a hundred and twenty ${numberWord(S.stats.tufta)} of them` : ''}.`);
  if (S.stats.doorNights) L.push(`${numberWord(S.stats.doorNights, true)} ${plural(S.stats.doorNights, 'night', 'nights')} by the door.`);
  if (S.flags.photo) L.push(S.day >= 100 ? 'You kept the photograph of Nina and Tanya, under your heel, all winter.' : 'You kept the photograph of Nina and Tanya under your heel.');
  if (S.flags.spoke) L.push(S.flags.moscowAnswer ? 'You told a commission from Moscow the truth. Moscow examined it and found the bread correct.' : 'You told a commission from Moscow the truth.');
  if (S.flags.levBreadPot) L.push('Lev\'s hundred grams went into the brigade\'s pot.');
  if (S.flags.levPencil) L.push('You kept Lev\'s pencil in your boot, and wrote nothing with it.');
  if (S.ended === 'escaped' && S.esc && S.esc.fisherman === 'truth') L.push('You told the fisherman the truth, and he kept it.');
  if (S.flags.signed) L.push('You signed the paper, so that Tanya could study.');
  if (st.lost) L.push(`${fmtInt(st.lost)} grams of your bread went into other men's pockets.`);
  if (st.cells) L.push(`${numberWord(st.cells, true)} ${plural(st.cells, 'day', 'days')} in the cells.`);
  const good = st.good || 0;
  L.push(good ? `${numberWord(good, true)} good ${plural(good, 'day', 'days')}. Almost happy ones.` : 'Not one good day. There were not many to be had.');
  // the best day: the one with the most small mercies in it
  let best = null;
  for (const h of S.history) if (h.good && h.good.length && (!best || h.good.length > best.good.length || (h.good.length === best.good.length && h.v === 'good'))) best = h;
  if (best) L.push(`The best day was ${fmtDate(best.day)}. ${best.good.join(' ')}`);
  return L;
}

// Lev's death is a morning, not an event: the day goes on after it.
function levDeath() {
  S.lev.alive = false; S.lev.diedOn = fmtDate(S.day); S.lev.diedDay = S.day;
  S.bread += 100;
  stopRun('');
  const paras = [
    'Lev did not get up. Lubimov hit the bunk with his stick, which is what you do, and then looked, and then went to get the orderly.',
    'Lev is lighter than his jacket. Pasha keeps his bread ration for the brigade, because the dead do not eat and the office does not know yet. A hundred grams of it is yours.',
  ];
  // the dead do not need boots
  if (S.flags.rubber) {
    S.flags.rubber = false; S.flags.levBoots = true;
    paras.push('His felt boots go to you, because yours are rubber and because you were nearest. They are dry inside. He kept them under his head every night, the way Kuzma said.');
  }
  S.flags.levDied = S.day;
  show(paras, [
    { id: 'keep', def: true, label: 'Keep it.', fn: () => go(count) },
    { id: 'pot', label: 'Put the hundred grams in the brigade\'s pot.', hint: 'the brigade carried him; let it eat him', fn: () => {
      S.bread = Math.max(0, S.bread - 100); S.stats.breadGiven += 100; brig(6); S.flags.levBreadPot = true;
      note('Lev\'s hundred grams went into the brigade\'s pot. Pasha watched you do it and said nothing, which was a receipt.');
      go(count);
    } },
  ], { frame: 'dead', amb: 'amb_hut_morning', sfx: 'rail', story: true });
}
