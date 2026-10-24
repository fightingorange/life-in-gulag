'use strict';
// The arrival: the wagon, the march from the railhead, the gate, the guardhouse, the hut, where Kuzma
// tells you how it works, and the first supper. Then day one (day.js).
// On the third night Vaska Kosoi comes for your boots (BEAT 'boots', below). What you do about it sets
// the course of the winter, through state the rest of the game reads:
//   S.flags.urki     'gave' | 'fought' | 'tribute' | 'paid' | 'brigade' | 'warder'
//   S.flags.rubber   you wear Vaska's tyre-rubber boots: the cold costs more, the ice is harder (day.js, escape.js)
// and, from the arrival: S.flags.metLev, metSenka, metKuzma, struck (talked in the column), photo, money.

// Every arrival screen is story: the choices wait until the voice has been heard.
function arrive(paras, choices, o) { FLOW.story = true; show(paras, choices, Object.assign({ story: true }, o)); }
const MARCH = { frame: 'arrival_march', amb: 'amb_march', scape: 'arrival_march' };

// ---------- the wagon ----------
function intro() {
  S.flags.title = true;   // no number yet: the status bar stays bare until the guardhouse
  S.day = 0; S.temp = -31;
  S.today = blankToday();
  arrive([
    'The wagon. A goods wagon with a stove in the middle and plank shelves along both walls, two tiers, forty men. The stove is lit when the convoy remembers. The bucket is by the door, and everyone knows whose turn it is to sleep next to it.',
    'Article 58-10, anti-Soviet agitation. Ten years. You said something at a table, in front of a man you had known for twenty years.',
    'In the mornings the convoy gives out salt herring, and in the evenings one bucket of water for the wagon. You stopped counting the days somewhere after Kirov.',
  ], [
    { id: 'sleep_wagon', def: true, label: 'Sleep, if it comes.', fn: arrRailhead },
    { id: 'crack', label: 'Put your eye to the crack between the boards.', fn: arrCrack },
  ], { frame: 'arrival_wagon', amb: 'amb_train' });
}
function arrCrack() {
  arrive([
    'Snow, and black trees, and snow. Once a station with no name on it, and a woman on the platform with a child by the hand. She looks at the wagon, at the stove pipe and the little barred window, and then quickly at something else. She knows what a wagon like this carries.',
  ], [{ label: 'Lie down again.', fn: arrRailhead }], { frame: 'arrival_crack', amb: 'amb_train' });
}
function arrRailhead() {
  arrive([
    'The train stops, and this time it does not start again. Boots on the gravel outside, a shout, dogs. The door rolls back on its rail and the light comes in like a blow.',
    'A railhead: a water tower, a shed, a line of soldiers in long coats, and white country to the edge of the world in every direction. The nearest town is four hundred kilometres behind you, and does not want you.',
    'Out. Down. Into fives. They count you on the embankment, twice, because the first count comes out wrong.',
  ], [{ label: 'Climb down.', fn: arrRule }], { frame: 'arrival_railhead', amb: 'amb_wind', sfx: 'spot_wagon_door' });
}
function arrRule() {
  arrive([
    'The convoy officer stands in front of the column with his hands in his coat and says it the way a priest says grace: fast, and for the thousandth time.',
    '> «Шаг влево, шаг вправо считается побегом. Конвой стреляет без предупреждения.»',
    'A step to the left or the right counts as escape. The convoy shoots without warning. Hands behind your backs. Forward.',
    'Nobody says how far.',
  ], [{ label: 'Hands behind your back.', fn: arrMarch }], { ...MARCH, sfx: 'ru_march_rule' });
}

// ---------- the march ----------
function arrMarch() {
  arrive([
    'The road is two ruts in the snow, and the column fills them, five abreast, a hundred metres of it. A soldier every ten paces on either side. The dogs walk on the outside and look at nobody.',
    'On your right, a boy in a student\'s cap with the flaps down, coughing into his collar. On your left, a big man who looks straight ahead and has not turned his head once, not even for the dogs.',
    'Your feet are warm. Nina sent felt boots to the transit prison in Kalinin, new ones, white, and somehow they reached you. They are the best thing you own. They are nearly the only thing.',
  ], [
    { id: 'walk', def: true, label: 'Walk. Eyes on the back in front of you.', fn: arrHours },
    { id: 'whisper', say: 'prisoner_where', label: 'Whisper to the boy on your right.', hint: 'the transit prisons teach you to talk without moving your lips', fn: arrWhisper },
    { id: 'speak', say: 'prisoner_howfar', label: 'Ask the big man on your left how far.', fn: () => arrSilenced('senka') },
  ], MARCH);
}
function arrWhisper() {
  S.flags.metLev = true;
  arrive([
    '"Where are we going?" you say, without moving your lips. The boy answers the same way, to the back of the man in front. "North. I am Lev. Leningrad. Five years." Twenty steps. "For a paper I read aloud."',
    'The soldier on that side turns his head and looks along the column, and turns it back.',
  ], [
    { id: 'quiet', def: true, label: 'Say nothing more.', fn: arrHours },
    { id: 'ask', say: 'prisoner_paper', label: '"What paper?"', fn: () => arrSilenced('lev') },
  ], MARCH);
}
function arrSilenced(who) {
  adj(-5); eye(6);
  S.flags.struck = true;
  if (who === 'senka') S.flags.metSenka = true;
  arrive([
    who === 'lev' ? '"What paper?" you say, and it comes out louder than you meant.'
      : '"How far?" you say to the big man. He does not turn his head. You say it again, louder.',
    '"Молчать в строю!" The soldier is beside you before you have finished. The rifle butt takes you between the shoulder blades and puts you on your knees in the snow.',
    who === 'lev' ? 'Lev does not look down. Nobody does. You get up, because the column does not wait, and the only thing worse than the rifle is the dogs.'
      : 'The big man steps over your legs without looking down, and the column closes round you. You get up, because the column does not wait, and the only thing worse than the rifle is the dogs.',
    'The soldier says something to the next one, and they both look at you, so that they will know you.',
  ], [{ label: 'Get up. Walk.', fn: arrHours }], { ...MARCH, sfx: who === 'lev' ? 'ru_march_quiet' : 'ru_march_quiet2' });
}
function arrHours() {
  arrive([
    'The first hour. The second. The sun, which was low when you set out, goes lower, and then it is behind the trees and the snow goes blue.',
    'At the back of the column a man sits down in the snow, quite calmly, like a man sitting down to take off a boot. "Подтянись!" Close up. The column closes up. Nobody looks back.',
    'You do not hear a shot. You listen for one for a long time.',
  ], [
    { id: 'close', def: true, label: 'Close up.', fn: arrLights },
    { id: 'back', label: 'Look back.', fn: arrLookBack },
  ], { ...MARCH, sfx: 'ru_march_close' });
}
function arrLookBack() {
  eye(2);
  arrive([
    'You look back. The road behind is empty, except for one soldier walking back the way you came, not hurrying, with his rifle on his shoulder.',
    '"Руки!" Hands. You put them behind your back again and look at the back in front of you, which is where you will be looking for ten years.',
  ], [{ label: 'Walk.', fn: arrLights }], { ...MARCH, sfx: 'ru_march_hands' });
}
function arrLights() {
  adj(-4);
  const paras = [
    'Dark. The third hour, or the fifth. You stopped feeling your face a long time ago. Your feet you can still feel, because of the boots.',
    'Then, on the left, lights. Not a town: a rectangle of lights, a fence of them, with a tower at each corner and searchlights walking slowly over the snow.',
    'Somebody in the column says "There," in an ordinary voice, as if it no longer mattered what he said. Nobody hits him.',
  ];
  if (S.flags.metLev) paras.push('Beside you Lev has stopped coughing. You do not know whether that is good.');
  arrive(paras, [{ label: 'Walk towards the lights.', fn: arrGate }], { ...MARCH, frame: 'arrival_march_dusk' });
}

// ---------- the gate ----------
const ARR_GATE = { frame: 'arrival_gate', amb: 'amb_march', seq: 'gate_search' };
function arrGate() {
  arrive([
    'The gate. The column is counted in by fives, and counted again, and then it is searched, one man at a time, under a lamp, by two warders who are cold and want their supper.',
    'They take your belt, your bootlaces and the coat you were arrested in. They give you a quilted jacket and trousers that have been somebody else\'s, and will be somebody else\'s again.',
    'Two things are still on you: a photograph of Nina and Tanya in your breast pocket, and twenty-five roubles that Nina sewed into the top of the left boot, the night before the trial.',
  ], [
    { id: 'hand', def: true, label: 'Hand everything over. It goes quicker.', fn: () => arrSearch('none') },
    { id: 'photo', label: 'Slip the photograph into your foot cloth.', hint: 'they look in boots', fn: () => arrSearch('photo') },
    { id: 'money', label: 'Say nothing about the roubles in the boot.', hint: 'they look in boots', fn: () => arrSearch('money') },
  ], { ...ARR_GATE, sfx: 'boots' });
}
function arrSearch(what) {
  let p;
  if (what === 'none') {
    p = 'The photograph goes into an envelope with your name on it, for your file. The roubles go into a book, to your personal account. You will not see either again, and you knew it while you were handing them over.';
  } else if (what === 'photo') {
    if (chance(.65)) { S.flags.photo = true; p = 'The warder feels your pockets and finds nothing, because there is nothing. Under your left heel, in the foot cloth, Nina and Tanya go through the gate with you.'; }
    else { eye(4); p = 'He finds it in the foot cloth, because that is where they always are. He looks at it, and at you, and tears it in four, and drops it in the snow. The next man steps on it.'; }
  } else if (chance(.5)) {
    S.flags.money = true;
    p = 'He runs his hands down your legs and stops at the boots, and looks at them a long time. Good boots. Then the man behind you drops something, and the warder turns to see what, and you are through.';
  } else {
    eye(5);
    p = 'He runs his hands down your legs and stops at the boots, and his fingers find the seam. Twenty-five roubles, to your personal account. He writes down your number. He looks at the boots again.';
  }
  arrive([p], [{ label: 'Go on.', fn: arrProcess }], { ...ARR_GATE, sfx: 'pat_down' });
}

// ---------- the guardhouse ----------
const ARR_PROC = { frame: 'arrival_processing', amb: 'amb_cells' };
function arrProcess() {
  S.flags.title = false;   // from here on you have a number
  const paras = [
    'The guardhouse. A table, a lamp, a list, and a warder with a thin face and a pencil: Lubimov. You will learn his name, and you will learn that it is better not to have yours learned by him.',
    '"Surname. Name and patronymic. Article. Term."',
  ];
  if (S.flags.struck) paras.push('He finds your name on the convoy\'s list, and something written beside it, and copies that into his own book as well: talked in the column.');
  paras.push(`From now on you are ${NUMBER}. A trusty paints it on strips of rag, and you sew them on your back, your cap and your knee, with a needle that goes down the line.`);
  arrive(paras, [
    { id: 'answer', def: true, say: 'prisoner_article', label: '"Fifty-eight ten. Ten years."', fn: () => arrBoots(false) },
    { id: 'nothing', say: 'prisoner_nothing', label: '"I was sentenced for nothing."', fn: () => arrBoots(true) },
  ], { ...ARR_PROC, sfx: 'ru_proc_name', voice: 'lubimov_proc' });
}
function arrBoots(nothing) {
  if (nothing) { eye(5); S.flags.nothing = true; }
  arrive([
    nothing ? '"For nothing they give five," Lubimov says, without looking up. "You have ten." He writes something. It is short.'
      : '"Fifty-eight ten. Ten years." He writes it without looking up. He has written it a thousand times.',
    'Then he looks under the table at your feet, for longer than he looked at your face. "Felt boots. Own. One pair." He writes that down too.',
    'By the stove a trusty in a clean jacket is looking at your boots as well, and then at your face, as if to remember which face goes with them.',
  ], [{ label: 'Go where they point.', fn: arrHut }], { ...ARR_PROC, voice: nothing ? ['lubimov_five', 'lubimov_boots'] : 'lubimov_boots' });
}

// ---------- the hut: Kuzma tells you how it works ----------
const ARR_HUT = { frame: 'arrival_hut', amb: 'amb_hut' };
const KUZMA_ANSWERS = [
  { id: 'q_bread', label: '"How much do they feed us?"', voice: ['kuzma_bread', 'kuzma_alyosha'], paras: [
    '"Five hundred and fifty grams of bread, if the brigade makes the norm. Four hundred if it does not. Eat it in the morning, all of it, or hide it where nobody looks."',
    'He says it the way other men say the date.',
    '"Alyoshka the Baptist keeps his under the boards by his bunk. He will keep yours, if you ask him."'] },
  { id: 'q_day', label: '"What happens in the morning?"', voice: 'kuzma_day', paras: [
    '"The rail at five. Then the count, in fives. They count until it comes out right. Stand in your five and look at nothing. A man they notice is a man they search."'] },
  { id: 'q_brigade', label: '"Who is the man by the stove?"', voice: 'kuzma_brigade', paras: [
    'A square man with grey stubble, mending a mitten with his back to the room, the way a fisherman mends a net.',
    '"Pasha. The foreman. The brigade eats on the norm, so the brigade watches how you work. Work so Pasha sees it. A man the brigade decides against does not see the spring."'] },
  { id: 'q_urki', label: '"And those, by the door?"', voice: 'kuzma_urki', paras: [
    'Four men on the warm side of the stove with a blanket spread between them and cards on the blanket. One of them has a squint.',
    '"Thieves. Vaska Kosoi and his friends. They do not work, and they eat first. The camp is run for them." He looks at your feet. "They saw your boots too."'] },
  { id: 'q_years', label: '"How does a man do ten years?"', voice: 'kuzma_winter', paras: [
    '"He does not. Nobody can hold ten years in his head. Count the winter. On the twentieth of May the ice goes out on the river. When it goes, the worst is over."',
    '"Some go out on the ice before that." He shrugs. "We find them in the spring, mostly."'] },
  { id: 'q_kills', label: '"What kills men here?"', voice: 'kuzma_kills', paras: [
    '"The cold is slow, and it is fair. What kills a man is stopping. First he stops mending his boots. Then he stops washing. Then he scrapes other men\'s bowls. Then the cold notices him."'] },
  { id: 'q_good', label: '"How do you bear it?"', voice: 'kuzma_good', paras: [
    'He thinks about it, as if nobody had asked him before.',
    '"Learn to see a good day. A second bowl. Dry foot cloths. Eleven minutes of sun. A man who can still tell a good day from a bad one is not finished."'] },
];
// the questions not asked yet, and "That's enough for tonight", which is what a tired man says
// Four questions at a time, so the screen fits a small window; the next one comes up as one is asked.
// Left alone, Kuzma goes on to the next thing a new man needs to know: the introduction is not skipped
// by a timer running out.
function kuzmaChoices(asked) {
  const open = KUZMA_ANSWERS.filter(q => !asked.includes(q.id)).slice(0, 4);
  return [
    ...open.map((q, i) => ({ id: q.id, def: i === 0 || undefined, say: 'prisoner_' + q.id, label: q.label, fn: () => arrAsk(q, asked) })),
    { id: 'enough', def: !open.length || undefined, label: 'That\'s enough for tonight.', fn: arrSupper },
  ];
}
function arrHut() {
  S.flags.metKuzma = true;
  const paras = ['Hut seven. Two hundred men in a hut built for a hundred, bunks in two tiers, a stove made from a petrol drum, and a smell you will stop smelling in a week. You are in Pasha\'s brigade. Your place is a bottom bunk at the end, under a pair of boots that hang over the edge.'];
  if (S.flags.metSenka) paras.push('They are the big man\'s boots, the one from the march who would not turn his head. He is lying on his back with his hands inside his jacket, and he does not turn it now.');
  if (S.flags.metLev) paras.push('Lev is two bunks down, sitting up with his cap still on, looking at nothing.');
  paras.push('On the next bunk an old man sits up, looks at your boots first and then at you. Kuzma: fifteen years for a sack of grain from his own collective farm. He was here before the fence.');
  paras.push('"Good boots," he says. "Everybody saw them at the gate. Sleep with them under your head, and your head on them."');
  arrive(paras, kuzmaChoices([]), { ...ARR_HUT, voice: 'kuzma_boots' });
}
function arrAsk(q, asked) {
  arrive(q.paras, kuzmaChoices([...asked, q.id]), { ...ARR_HUT, voice: q.voice });
}

// ---------- the first supper, and the first night ----------
function arrSupper() {
  const ch = [{ id: 'slow', def: true, label: 'Eat it slowly, from the top.', fn: () => { adj(4); arrSleep(); } }];
  if (S.flags.metLev) ch.push({ id: 'lev', label: 'Give Lev the fish head from yours.', hint: 'he has not eaten since the train', fn: () => {
    adj(2); S.lev.health = Math.min(100, S.lev.health + 6); S.flags.levFish = true;
    note('Lev ate the fish head, eyes and all, and then looked at you as if you had given him a coat.');
    arrSleep();
  } });
  ch.push({ id: 'gulp', label: 'Drink it down while it is hot.', fn: () => {
    adj(3); note('Gone in four swallows. Kuzma watched you and said nothing, and that was the lesson.'); arrSleep();
  } });
  arrive([
    'The mess hut, the last sitting, for the new ones. Skilly: hot water with a memory of cabbage, and at the bottom, if you are lucky, a fish head looking up at you. No bread. Bread is in the morning.',
    'Kuzma eats beside you, slowly, from the top, so that the warmth lasts. He does not tell you to. He shows you.',
    'Somebody behind you in the queue says "Good boots," to nobody in particular. You turn round. A man with a squint, smiling at the ceiling.',
  ], ch, { frame: 'supper', amb: 'amb_queue', voice: 'vaska_goodboots' });
}
function arrSleep() {
  const paras = ['Lights out is a bulb that stays on. The stove ticks. Two hundred men breathe, and the boots above your face sway a little when their owner turns over.'];
  if (S.flags.metSenka) paras.push('Senka, Kuzma told you at supper. Deaf since a shell at Kursk. You could have shouted at him all the way from the railhead.');
  arrive([...paras,
    'You put your own boots under your head, the way Kuzma said, and your head on them.',
    'You stopped counting the days on the train. In the morning you start again, from one.',
    '~ Each day you choose how to eat, how to work and how to spend the night. Once you have lived a day, the days can run on their own, the way you lived it, until something happens.',
  ], [{ id: 'wake', label: 'Sleep.', fn: () => { S.day = 1; FLOW.story = false; startDay(); } }], { frame: 'hut_night', amb: 'amb_hut' });
}

// ---------- the third night: Vaska comes for the boots ----------
// A night beat (day.js, night()). The choice sets S.flags.urki, and the winter reads it:
//   gave     Vaska's rubber boots (S.flags.rubber), and the urki know you give (urki_stove more often)
//   fought   you keep the boots; the brigade respects you; the urki owe you (urki_grudge, urki_knife)
//   tribute  you keep the boots and pay for them every week or so (urki_tribute); Vaska trusts payers (vaska_fence)
//   paid     Nina's roubles; Vaska leaves you alone and trusts you (vaska_fence)
//   brigade  Pasha stands up, if you have worked for him; his protection lasts while the brigade thinks well of you (urki_return)
//   warder   Lubimov confiscates the boots "as the object of a dispute", the urki owe you, the kum takes an interest
const BOOTS_HUT = { frame: 'hut_night', amb: 'amb_hut' };
const bootsDone = (paras, o = {}) => show(paras, [{ label: 'Lie down.', fn: () => go(endDay) }], { ...BOOTS_HUT, ...o });
function loseBoots(urki) {
  S.flags.urki = urki; S.flags.rubber = true; S.flags.rubberDay = S.day;
}
BEAT('boots', 3, 'night', () => {
  stopRun('');
  const ch = [
    { id: 'give', def: true, label: 'Take them off.', hint: 'the cold will remember it, and so will Vaska', fn: () => {
      loseBoots('gave'); brig(-3);
      remember('You gave Vaska Kosoi your boots.', true);
      bootsDone([
        'You take them off. They are warm from your feet. Vaska puts them on there, sitting on your bunk, then stands and stamps twice, like a man trying a floor.',
        '"Fair," he says, and goes back to the stove. The rubber boots are cold all the way through, and they will be cold all the way through every morning until May.',
        'Nobody in the hut looks at you. That is a kindness, and it is also a judgement.',
      ]);
    } },
    { id: 'fight', label: 'Put your feet on them. Hit him first.', hint: 'there are three of them', fn: () => {
      cost(-10, 'the fight'); brig(12); eye(6);
      S.until.ribs = S.day + 6;   // six days of it: the cold and the work cost more (day.js)
      S.flags.urki = 'fought'; S.flags.urkiGrudge = S.day;
      if (chance(.35)) { S.flags.pendingCells = true; S.flags.cellsWhy = 'The hut orderly reported a fight. Lubimov does not ask who started it. Three days. They give you one of them now and owe you the others.'; }
      remember('You fought Vaska Kosoi for your boots, and kept them.', true);
      bootsDone([
        'You put your feet on the boots and hit him, once, well, on the side of the face with the squint. Then the three of them are on you, in the narrow place between the bunks where there is no room to fall down.',
        'It goes on for a while. Then Pasha and two men from the brigade pull them off, not quickly, and not gently either.',
        '"I\'ll remember you," Vaska says, wiping his mouth. He leaves the rubber boots on the floor, as if he will be back for the felt ones.',
        'You sleep on your boots with your ribs singing. In the morning the brigade looks at you differently. So does the other side of the stove.',
      ], { sfx: 'fight', voice: 'vaska_remember' });
    } },
    { id: 'bread', say: 'prisoner_breadinstead', label: '"Take my bread instead. Tomorrow\'s, and the day after\'s."', hint: 'a man who pays once pays again', fn: () => {
      adj(-12);
      S.flags.urki = 'tribute'; S.flags.tributeDay = S.day;
      S.stats.tribute = (S.stats.tribute || 0) + 550;
      remember('You pay Vaska Kosoi for your own boots.', true);
      bootsDone([
        '"Bread," Vaska says, as if he were tasting the word. He looks at your boots and at your face, and does the arithmetic. "Tomorrow\'s, and the day after\'s. Then we will see. A man who pays is a friend of mine."',
        'In the morning his man is at the end of the bread table before you are. He does not take all of it. He takes enough.',
      ]);
    } },
  ];
  if (S.flags.money) ch.push({ id: 'money', label: 'Give him Nina\'s roubles from the boot.', hint: 'twenty-five roubles; money buys more than bread in here', fn: () => {
    S.flags.money = false; S.flags.urki = 'paid';
    remember('Nina\'s roubles bought your boots back from Vaska Kosoi.', true);
    bootsDone([
      'You take off the left boot, and Vaska watches with real interest while you work the seam open with your thumbnail and give him Nina\'s twenty-five roubles.',
      '"Money," he says, and smells it. "A man with money has friends outside. I like men with friends." He leaves you the boots. He leaves you the rubber ones too, as a present.',
    ]);
  } });
  ch.push({ id: 'pasha', label: 'Look at Pasha.', hint: S.brigade >= 10 ? 'you have worked for him every day; he has seen it' : 'three days is not long', fn: () => {
    if (S.brigade >= 10) {
      S.flags.urki = 'brigade'; brig(6);
      mercy('Pasha stood up for you.');
      remember('Pasha stood up for you. Now you have to keep earning it.', true);
      return bootsDone([
        'You look at Pasha. Pasha looks at the mitten a while longer, and then he puts it down and stands up, and two of the brigade stand up behind him without being asked.',
        '"He is in my brigade," Pasha says. "His feet work for my brigade." It is not loud. It does not need to be.',
        'Vaska looks at them, and laughs, and picks up his rubber boots. "Another time," he says to you, kindly.',
      ], { voice: 'pasha_mine' });
    }
    loseBoots('gave'); brig(-6);
    remember('You looked at Pasha, and Pasha looked at his mitten. Vaska has your boots.', true);
    bootsDone([
      'You look at Pasha. Pasha looks at the mitten. Three days is not long enough for a brigade to decide about a man, and Pasha is a careful foreman.',
      'Vaska follows your look, and smiles, and waits. In the end you take the boots off. He puts them on there on your bunk, and stamps twice, like a man trying a floor. "Fair."',
    ]);
  } });
  ch.push({ id: 'warder', label: 'Shout for the warder.', hint: 'the warders will come; so will everything after', fn: () => {
    loseBoots('warder'); brig(-12); eye(12);
    S.flags.urkiGrudge = S.day;
    remember('You called the warder. Lubimov took your boots.', true);
    bootsDone([
      'You shout for the warder. The hut goes quieter than quiet. Vaska does not move. He sits on the end of your bunk and waits, smiling, like a man at a station.',
      'Lubimov comes, eventually, with the orderly and a lamp. He looks at Vaska, at the rubber boots, at the felt ones, and at you.',
      '"Object of a dispute," he says. "Confiscated." He puts the felt boots under his arm and writes a number in his book. Not Vaska\'s. Yours.',
      'When the door has shut, Vaska picks up the rubber boots and drops them on your bunk. "A present," he says. "You will need them."',
    ], { voice: 'lubimov_dispute' });
  } });
  show([
    'After the evening count, before the bulb goes dim. Vaska Kosoi comes down the hut between the bunks, not hurrying, with two of his friends a step behind him. The hut goes quiet the way a field goes quiet before hail.',
    'He sits down on the end of your bunk. "Good boots," he says. "Felt, from home. My size, I think." He drops a pair of camp boots on the floor: tyre rubber and rag, wet through. "A swap. I am fair."',
    `${S.kuzma.here ? 'Kuzma has turned to the wall.' : 'The old men have turned to the wall.'} At the stove, Pasha is mending a mitten and does not look up. Not yet.`,
  ], ch, { ...BOOTS_HUT, voice: 'vaska_boots', confront: 'boots' });
}, { when: () => !S.flags.urki });
