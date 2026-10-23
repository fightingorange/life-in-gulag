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
const epigraph = q => `" ${q[0]} || ${q[1]}`;

function title() {
  S = newState(); S.flags.title = true;
  FLOW.auto = null; FLOW.stop = null;
  const saved = STORE && STORE.load();
  const ch = [{ id: 'begin', label: saved ? 'Begin again.' : 'Begin.', fn: intro }];
  if (saved) ch.unshift({ id: 'continue', label: `Continue: ${fmtDate(saved.day)}, day ${saved.day}.`, fn: () => { S = saved; startDay(); } });
  show(['# TEN YEARS', '~ Десять лет', epigraph(QUOTES.creature)], ch, { title: true, frame: 'title', amb: 'amb_wind' });
}
function intro() {
  S.flags.title = false;
  show([
    '1951. A camp in the north, past the railhead, on a river that is ice for seven months of the year. The nearest town is four hundred kilometres away and does not want you.',
    'Article 58-10, anti-Soviet agitation. Ten years. You said something at a table.',
    'Ten years is not a thing a man can hold in his head. The old ones say: do not count the years, count the winter. When the ice goes out on the river in May, the worst of it is over.',
    'There is another way out: through the wire, and down the river on the ice. Most men who take it are found in the spring.',
    'You stopped counting on the train. This morning you start again, from one.',
    '~ Each day you choose how to eat, how to work and how to spend the night. Once you have lived a day, the days can run on their own, the way you lived it, until something happens.',
  ], [{ id: 'wake', label: 'Wake.', fn: startDay }], { frame: 'hut_night', amb: 'amb_hut' });
}

// ---------- endings ----------
const spoonHand = () => S.kuzma.here ? 'Kuzma takes your spoon' : 'somebody takes your spoon';
const ENDINGS = {
  died: {
    stamp: 'УМЕР', outcome: 'Died in the barracks.', frame: 'dead', amb: 'amb_cells',
    quote: () => S.flags.betrayed ? QUOTES.hell : QUOTES.heart,
    voice: () => S.kuzma.here ? 'kuzma_spoon' : null,
    text: () => [
      'You do not get up at reveille. Lubimov hits the bunk with his stick, which is what you do, and then he looks, and then he goes to get the orderly.',
      `In the evening ${spoonHand()}. The dead do not need spoons, and the living do.`,
    ],
  },
  shot: {
    stamp: 'УБИТ ПРИ ПОБЕГЕ', outcome: 'Shot while attempting to escape.', frame: 'wire', amb: null, sfx: 'shot',
    quote: () => QUOTES.goal,
    text: () => [
      S.flags.blade
        ? 'The blade goes through the first wire and the second. The third is the one with the bell on it. The searchlight finds you four metres out. It is not even a decision for the man in the tower.'
        : 'Without a blade there is only the gap under the wire by the latrine, and the gap under the wire by the latrine is known. The searchlight finds you four metres out. It is not even a decision for the man in the tower.',
    ],
  },
  frozen: {
    stamp: 'УМЕР', outcome: 'Absconded. Found in the spring.', frame: 'river', amb: 'amb_wind',
    quote: () => QUOTES.lie,
    text: () => [
      'You go through at the place where the post is rotten, and nobody shoots.',
      'Two nights on the ice. On the third you sit down to rest for a minute, with your back to a log, out of the wind, and the minute is comfortable in a way nothing has been for a long time.',
      'In the spring a surveyor finds the boots.',
    ],
  },
  escaped: {
    stamp: 'В БЕГАХ', outcome: 'Absconded. Not found.', frame: 'river', amb: 'amb_wind',
    quote: () => QUOTES.own,
    text: () => [
      'You go through at the place where the post is rotten. Nobody shoots. Nobody shoots because nobody sees, and nobody sees because the man in the tower is inside his coat.',
      S.flags.partner && !S.flags.senkaGone
        ? 'Senka walks in front. He does not look back once in three days, and you learn to be grateful for that.'
        : 'You walk alone, on the river, downstream, because downstream is where the smoke is.',
      'On the fourth day you see the smoke. A settlement of the free ones: released men, in a place they cannot leave. They give you soup. The man with the soup looks at your boots, then at the telephone on the wall. He does not pick it up. Not today.',
    ],
  },
  spring: {
    stamp: 'ЖИВ', outcome: 'Alive at the breaking of the ice.', frame: 'ice_out', amb: 'amb_spring', sfx: 'ice_break',
    quote: () => QUOTES.creature,
    text: () => [
      'In the night the river makes a sound like artillery, a long way off. In the morning the ice is moving: grey plates the size of huts, turning, shouldering each other, going north to the sea.',
      'The whole column stops on the bank to watch, and the guards let it, because they are watching too.',
      'The worst of it is over, the old men say. The old men said that last year.',
      `Tomorrow is day ${S.day + 1}. There are ${fmtInt(SENTENCE + S.extra - S.day)} to go.`,
    ],
  },
};

function finish(kind) {
  const E = ENDINGS[kind];
  S.ended = kind;
  S.dead = kind !== 'escaped' && kind !== 'spring';
  FLOW.auto = null; FLOW.stop = null;
  if (STORE) STORE.clear();
  show([...E.text(), epigraph(E.quote())], [{ id: 'again', label: 'Again.', fn: title }], {
    frame: E.frame, amb: E.amb, sfx: E.sfx || null, voice: E.voice ? E.voice() : null,
    record: recordFor(kind), ending: kind,
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
  if (S.flags.spoke) L.push('You told a commission from Moscow the truth.');
  if (S.flags.signed) L.push('You signed the paper, so that Tanya could study.');
  if (st.lost) L.push(`${fmtInt(st.lost)} grams of your bread went into other men's pockets.`);
  if (st.cells) L.push(`${numberWord(st.cells, true)} ${plural(st.cells, 'day', 'days')} in the cells.`);
  const good = st.good || 0;
  L.push(good ? `${numberWord(good, true)} good ${plural(good, 'day', 'days')}. Almost happy ones.` : 'Not one good day. There were not many to be had.');
  return L;
}

// Lev's death is a morning, not an event: the day goes on after it.
function levDeath() {
  S.lev.alive = false; S.lev.diedOn = fmtDate(S.day);
  S.bread += 100;
  stopRun('');
  show([
    'Lev did not get up. Lubimov hit the bunk with his stick, which is what you do, and then looked, and then went to get the orderly.',
    'Lev is lighter than his jacket. Pasha keeps his bread ration for the brigade, because the dead do not eat and the office does not know yet. A hundred grams of it is yours.',
  ], [{ label: 'Keep it.', fn: () => go(count) }], { frame: 'dead', amb: 'amb_hut', sfx: 'rail' });
}
