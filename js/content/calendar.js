'use strict';
// The winter's calendar: things that happen to the whole camp on (or after) a given day.
// A morning beat replaces reveille; a noon beat replaces the noon event; a night beat replaces the night.

const BEATS = [];
function BEAT(id, day, at, run, extra) { BEATS.push(Object.assign({ id, day, at, run }, extra || {})); }
function beatFor(at) {
  return BEATS.find(b => b.at === at && S.day >= b.day && !S.seen['beat:' + b.id] && (!b.when || b.when())) || null;
}
function runBeat(b) { S.seen['beat:' + b.id] = true; FLOW.story = true; b.run(); }

// 24 to 30 January: the cold snap
BEAT('cold_snap', 22, 'morning', () => {
  S.until.snap = 28;
  S.temp = -(45 + rnd(4));
  show([
    'The thermometer by the gate stops at forty-five and stays there. The rail is struck at reveille, and then the order comes down that nobody goes out.',
    'Below forty-one they do not march you. For a week it will not be above forty-one. The stove is lit all day: two hundred men, one stove.',
  ], [{ label: 'Go on.', fn: () => go(count) }], { frame: morningFrame(), amb: 'amb_blizzard', sfx: 'rail' });
});
BEAT('stove', 24, 'noon', () => {
  const ch = [
    { id: 'push', label: 'Push in.', hint: 'warm, and remembered', fn: () => {
      adj(8); brig(-4); S.flags.urkiGrudge = S.flags.urkiGrudge || S.day;
      note('You were warm for an afternoon. Vaska Kosoi saw where you stood.', true);
      afterNoon();
    } },
    { id: 'wait', def: true, label: 'Wait your turn at the edge.', fn: () => { adj(3); note('Your turn came at four. It lasted twenty minutes.'); afterNoon(); } },
  ];
  if (S.lev.alive) ch.push({ id: 'lev', label: 'Give your place to Lev.', hint: `Lev is ${levWord()}`, fn: () => {
    S.lev.health = Math.min(100, S.lev.health + 15); S.lev.helped++; adj(-2); brig(4);
    note('Lev sat by the stove until his eyebrows steamed.');
    afterNoon();
  } });
  show(['The stove. In the morning it was a stove. By noon it is a country with borders. The urki have the side with the door; the brigade has the side with the wall; between them is a place two men wide, and you are standing at the edge of it.'],
    ch, { frame: 'stove', amb: 'amb_hut' });
}, { when: () => !!S.until.snap });

// 4 February: a letter
BEAT('letter1', 33, 'noon', () => {
  const ch = [{ id: 'nowrite', def: true, label: 'Don\'t write. Nothing that is true gets through.', fn: () => { adj(-3); afterNoon(); } }];
  if (S.tobacco > 0) ch.unshift({ id: 'write', label: 'Write back. Paper costs a pinch of tobacco.', fn: () => {
    tob(-1); adj(4); S.flags.wrote = true;
    mercy('A letter home.', 0);
    note('You wrote that you are well. It is the first lie you have told in weeks, and it felt like a kindness.');
    afterNoon();
  } });
  show([
    'A letter. Four months old, a third of it blacked out. Your wife writes that the collective farm paid for the year in workdays, which is to say in nothing, and that she is painting carpets on canvas to sell at the station. Swans, mostly.',
    'She asks if you are well. She does not ask when.',
  ], ch, { frame: 'letter', amb: 'amb_hut', sfx: 'paper', voice: 'nina_letter1' });
});

// 18 to 20 February: the commission from Moscow
BEAT('inspection', 47, 'morning', () => {
  S.until.inspection = 49; S.until.searches = 49;
  show([
    'A commission from Moscow. Overnight the paths are swept, the latrine is limed, and the cooks find meat. The skilly has a skin of fat on it this morning.',
    'For three days the bread will be six hundred and fifty grams. For three days Lubimov will search everything twice.',
  ], [{ label: 'Go on.', fn: () => go(count) }], { frame: 'inspection', amb: 'amb_wind', sfx: 'rail' });
});
BEAT('commission', 48, 'noon', () => {
  show([
    'The commission walks the work site: three men in good coats and a woman with a notebook. The camp commandant walks a little behind them, the way a dog walks behind a man with a stick.',
    'One of them stops in front of the brigade. "Any complaints, prisoners? Speak freely. The Soviet state listens. Nobody is punished for an honest complaint."',
  ], [
    { id: 'silent', label: 'Look at his boots.', fn: () => { note('He nodded, satisfied, and moved on. Nobody in the brigade looked at anybody.'); afterNoon(); } },
    { id: 'speak', say: 'prisoner_complaint', label: '"The bread is short weight. The men are dying."', hint: 'true, and remembered by the wrong people', fn: () => {
      eye(40); brig(12); S.flags.spoke = true;
      S.flags.pendingCells = true; S.flags.cellsWhy = 'Lubimov comes for you before reveille. "Complaints," he says, and writes it down. Five days. They give you one now and owe you the rest.';
      note('The woman wrote something down. That night Lubimov wrote something down too.', true);
      afterNoon();
    } },
  ], { frame: 'inspection', amb: 'amb_site', voice: 'commissioner_complaints' });
}, { when: () => !!S.until.inspection && !S.today.inside });

// 11 March: two men go through the wire
BEAT('others_escape', 68, 'morning', () => {
  const senka = !S.flags.partner && !S.flags.senkaGone;
  if (senka) { S.flags.senkaGone = true; S.flags.senkaGoneDay = S.day; }
  S.flags.othersEscaped = senka ? 'senka' : 'two';
  S.flags.metSenka = true;   // either way, his name is said at the count
  S.until.searches = 76; S.until.cut = 71;
  stopRun('');
  show([
    'Count. The count comes out wrong, and then wrong again, and then a third time, and the guards stop shouting and go quiet, which is worse.',
    senka
      ? 'Two men went through the wire in the night: a Ukrainian from the third barracks, and Senka. His boots are not hanging by your face. You had got used to them.'
      : 'Two men went through the wire in the night, Ukrainians from the third barracks. Senka, in the next five, looks at the ground with great attention.',
    'Pasha says what everyone knows. Searches for a week. Bread cut for three days.',
  ], [{ label: 'Stand.', fn: () => go(breakfast) }], { frame: 'count', amb: 'amb_wind', sfx: 'dogs', voice: 'pasha_escape' });
});
BEAT('brought_back', 72, 'morning', () => {
  const senka = S.flags.othersEscaped === 'senka';
  show([
    senka
      ? 'They bring them back on the fourth day, in a lorry. The Ukrainian walks. Senka does not. He is laid by the gate for three days so that the column can see what a man looks like who tried.'
      : 'They bring them back on the fourth day, in a lorry, and lay them by the gate so that the column can see what men look like who tried.',
    'You walk past twice a day. You learn to look at the gate the way the others do: carefully, at the top of it.',
  ], [{ label: 'Go on.', fn: () => go(count) }], { frame: 'gate', amb: 'amb_march', sfx: 'lorry' });
}, { when: () => !!S.flags.othersEscaped });

// 22 March: a parcel from home
BEAT('parcel', 80, 'noon', () => {
  const ch = [
    { id: 'share', label: 'Share it with the brigade.', hint: 'the brigade remembers this kind of thing', fn: () => {
      brig(18); adj(6); tob(2);
      mercy('A parcel, in her handwriting, shared.', 0);
      note('The lard went round the brigade on the point of a knife. Pasha took the smallest piece, which is how you know he is the foreman.', true);
      afterNoon();
    } },
    { id: 'eat', def: true, label: 'Eat it yourself, slowly, over a week.', fn: () => { adj(18); tob(2); note('The lard, a little every night, in the dark, like a secret.'); mercy('A parcel, in her handwriting.', 0); afterNoon(); } },
  ];
  if (!S.flags.blade) ch.push({ id: 'trade', label: 'Trade the lard to the blacksmith\'s man.', hint: 'fifteen centimetres of steel', fn: () => {
    S.flags.blade = true; S.flags.bladeDay = S.day; tob(2); eye(5);
    note('The lard went into the blacksmith\'s man\'s coat. Fifteen centimetres of steel went into your boot.', true);
    afterNoon();
  } });
  show([
    'A parcel, with your name on it in your wife\'s handwriting. It has been opened and closed again by somebody with less patience than she has.',
    'Inside: a piece of lard the size of a fist, two onions, a pair of socks she knitted from an old scarf you recognise, and a twist of makhorka. Nothing else. There was never going to be anything else.',
  ], ch, { frame: 'letter', amb: 'amb_hut', sfx: 'paper' });
});

// 11 April: a second letter
BEAT('letter2', 100, 'noon', () => {
  const pencil = S.lev.alive ? 'Lev\'s pencil' : 'a stub of pencil';
  show([
    'A second letter. The censor has left almost all of it, which tells you what kind of letter it is before you read it.',
    'Tanya has finished school. They will not take her at the institute with a father like hers. The man at the district office says that if your wife divorces you, it will be as if Tanya had no father, and then they will take her.',
    'She does not ask you to agree. She sends the form, already signed, and asks you to forgive her.',
    ...(S.flags.photo ? ['You take the photograph out from under your heel and look at it for a long time: Nina, and Tanya at nine, in a coat that used to be yours.'] : []),
  ], [
    { id: 'sign', label: 'Sign it.', fn: () => {
      adj(-6); S.flags.signed = true;
      note(`You signed it on the bunk, with ${pencil}. The letters will stop. That was the price, and you paid it.`, true);
      afterNoon();
    } },
    { id: 'keep', def: true, label: 'Put it inside your jacket, unsigned.', fn: () => {
      adj(-3);
      note('You carry it against your chest. It is not warm. Nothing in here is.', true);
      afterNoon();
    } },
  ], { frame: 'letter', amb: 'amb_hut', sfx: 'paper', voice: 'nina_letter2' });
}, { when: () => !!S.seen['beat:letter1'] });

// 29 April: Easter
BEAT('easter', 117, 'noon', () => {
  const kuzma = S.kuzma.here;
  show([
    'Sunday. Nobody says it is Easter, and everybody knows. Alyoshka the Baptist has saved a boiled egg from somewhere. There is no getting an egg in here, and he has one.',
    kuzma
      ? 'In the evening, by the stove, he says to nobody and everybody: "Christ is risen." And from his bunk, without opening his eyes, Kuzma answers: "Truly he is risen."'
      : 'In the evening, by the stove, he says to nobody and everybody: "Christ is risen." Nobody answers. Kuzma would have answered.',
  ], [
    { id: 'say', label: 'Say it too.', fn: () => { adj(4); note('You said it. You do not know whether you believe it. It was warm to say.'); mercy('Christ is risen, said out loud.', 0); afterNoon(); } },
    { id: 'quiet', def: true, label: 'Say nothing.', fn: afterNoon },
  ], { frame: 'easter', amb: 'amb_hut', voice: kuzma ? ['alyosha_easter', 'kuzma_easter'] : 'alyosha_easter' });
});

// 5 May: the thaw
BEAT('thaw', THAW_DAY, 'morning', () => {
  const paras = ['In the night something changed. The snow on the roof of the bakery has gone dark, and in the afternoon there is water in the ruts: actual water, moving.'];
  if (S.kuzma.here) paras.push('Kuzma looks at the river a long time. "After the tenth the river will not hold a man. Before that it holds him, but it does not like it."');
  else paras.push('The old men look at the river and say the ice will not hold a man after the tenth. Kuzma would have known the exact day.');
  paras.push('If anyone is going on the ice, it has to be now.');
  stopRun('');
  show(paras, [{ label: 'Go on.', fn: () => go(count) }], { frame: 'river', amb: 'amb_spring', voice: S.kuzma.here ? 'kuzma_tenth' : null });
});
