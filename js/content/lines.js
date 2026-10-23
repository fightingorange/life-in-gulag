'use strict';
// Words that change over the winter. Each pool is a list of lines; a line can depend on the month,
// the cold, the light, and on what has happened (who is gone, what you carry, how long it has been).
// L(pool) picks one the player has not seen lately. Entries: { t: string | () => string, when?, w?, m?, s? }
// m: a small mercy the line carries; s: a sound that plays with it (the crying you read, you hear).

// ---------- the calendar, in words ----------
// day 1 = 3 January; February starts on day 30, March 58, April 89, May 119
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may'];
const mon = () => MONTH_KEYS[Math.min(4, monthOf(S.day))];
const inMonths = (...ms) => () => ms.includes(mon());
const cold = (below) => () => S.temp <= below;
const mild = (above) => () => S.temp >= above;
const since = (day) => day ? S.day - day : null;
const goodStreak = () => { let n = 0; for (let i = S.history.length - 1; i >= 0 && S.history[i].v === 'good'; i--) n++; return n; };
const badStreak = () => { let n = 0; for (let i = S.history.length - 1; i >= 0 && (S.history[i].v === 'bad' || S.history[i].v === 'day'); i--) n++; return n; };
const daysWord = n => `${numberWord(n)} ${plural(n, 'day', 'days')}`;

function L(pool) {
  const list = LINES[pool];
  if (!list) return '';
  const ok = list.map((x, i) => [x, i]).filter(([x]) => !x.when || x.when());
  if (!ok.length) return '';
  S.recent = S.recent || {};
  const recent = S.recent[pool] || [];
  const fresh = ok.filter(([, i]) => !recent.includes(i));
  const [x, i] = weighted(fresh.length ? fresh : ok, ([e]) => e.w || 1);
  S.recent[pool] = [i, ...recent].slice(0, Math.max(0, Math.min(6, ok.length - 1)));
  if (x.m) mercy(typeof x.m === 'function' ? x.m() : x.m);
  if (x.s) cue(x.s);
  return typeof x.t === 'function' ? x.t() : x.t;
}

const LINES = {
  // how the morning looks at reveille: the light comes back across the winter
  light: [
    { t: 'It is black outside, the kind of black that has been there since November.', when: inMonths('jan') },
    { t: 'The window is black. It will be black when you march out, and nearly black when you march back.', when: inMonths('jan') },
    { t: 'Outside it is still night. The searchlights are the only morning there is.', when: inMonths('jan', 'feb') },
    { t: 'Dark still, but a different dark: grey at the bottom edge, if you look for it.', when: inMonths('feb') },
    { t: 'The window is grey now at reveille. A month ago it was black. Nobody mentions it, and everybody has noticed.', when: inMonths('mar') },
    { t: 'There is light at reveille: thin, the colour of skilly, but light.', when: inMonths('mar', 'apr') },
    { t: 'Full light at reveille. The lamps in the hut look foolish, burning in the day.', when: inMonths('apr', 'may') },
    { t: 'The sun is up before the rail. Somewhere outside a bird is making a sound nobody here has a name for.', when: inMonths('may'), m: 'A bird at reveille.' },
  ],

  // the second paragraph of reveille: the hut, and who is in it, or not
  morning: [
    { t: 'Pasha the foreman is already up, which means the brigade is going somewhere it does not want to go.' },
    { t: 'Somebody\'s foot cloths have frozen to the wall where he hung them. He works them loose with his thumbs, carefully, like a man taking off a bandage.', when: cold(-25) },
    { t: 'The man in the bunk below has coughed the same way for a week. This morning he does not, and everyone listens to him not coughing.' },
    { t: 'The Latvians are already dressed. The Latvians are always already dressed.' },
    { t: 'The orderly carries the latrine tub out between two poles, and the cold comes in where it goes out.', when: cold(-15) },
    { t: 'Kuzma is telling the stove a story. The stove has heard it.', when: () => S.kuzma.here },
    { t: 'In the bunk above, Senka\'s boots hang by your face, as they always do.', when: () => !S.flags.senkaGone },
    { t: 'Senka sleeps with his hands inside his jacket, like a man guarding something.', when: () => !S.flags.senkaGone },
    { t: 'Someone has stolen someone\'s spoon. There is a short, quiet, terrible argument, and then the spoon is found.' },
    { t: 'Your felt boots are where you left them, under your head. You check twice anyway.' },
    { t: 'The hut smells of wet felt and smoke and two hundred men. You stopped smelling it in the second week. This morning, for some reason, you smell it.' },
    { t: 'Lev is already sitting up, with his blanket round his shoulders, reading the inside of his own eyelids.', when: () => S.lev.alive },
    { t: 'Your eyelashes have frozen together in the night. You open them one at a time with a thumb, like a book.', when: cold(-38) },
    { t: 'Ice on the inside of the walls, in the shape of the planks, so that the hut has a second hut inside it.', when: cold(-35) },
    { t: 'Water is dripping off the roof beam onto somebody\'s bunk. He has moved his head six inches and gone back to sleep.', when: inMonths('apr', 'may'), s: 'drip' },
    { t: 'The air in the hut is wet now instead of frozen. Everything smells of it: the felt, the planks, the men.', when: inMonths('apr', 'may') },
    // memory
    { t: 'The boots are gone from the bunk above. Nobody has been given Senka\'s place. Nobody wants it.', when: () => S.flags.senkaGone, w: 2 },
    { t: () => `It has been ${daysWord(since(S.flags.senkaGoneDay))} since Senka. You still wake expecting the boots by your face.`, when: () => S.flags.senkaGoneDay && since(S.flags.senkaGoneDay) >= 3 && since(S.flags.senkaGoneDay) <= 20 },
    { t: 'Somebody else has Lev\'s place at the end of the bunk. He is older, and coughs, and you do not learn his name.', when: () => !S.lev.alive, w: 1.5 },
    { t: 'The Latvian in Kuzma\'s bunk does not talk. Since Kuzma went, nobody talks much near you.', when: () => S.flags.betrayed, w: 2 },
    { t: 'Nobody tells the stove stories now. The stove does not seem to mind. The men do.', when: () => !S.kuzma.here && !S.flags.betrayed, w: 2 },
    { t: 'The bread in your lining has gone hard as a stone. You check it with your elbow forty times a day, without meaning to.', when: () => S.bread >= 400 && !S.flags.baptist },
    { t: () => `The blade has been in your boot for ${daysWord(since(S.flags.bladeDay))}. Your foot has learned the shape of it.`, when: () => S.flags.blade && since(S.flags.bladeDay) >= 4 },
    { t: 'The letter is still inside your jacket, unsigned. You have read it so often that the folds have worn through.', when: () => S.seen['beat:letter2'] && !S.flags.signed, w: 1.5 },
    { t: 'No letters come now. You knew they would not, and you still listen for your name when the post is called.', when: () => S.flags.signed, w: 1.5 },
    { t: 'Three good days, one after another. You do not tell anyone, in case it hears.', when: () => goodStreak() >= 3, w: 3 },
    { t: 'Bad days, one after another, like men in a column. You have stopped telling them apart.', when: () => badStreak() >= 5, w: 2 },
    { t: 'A month. You have stopped counting the days and started counting the winter, the way the old ones told you.', when: () => S.day >= 30 && S.day <= 34, w: 3 },
    { t: 'Day fifty, by your count. Nobody marks it. You mark it, by not eating your bread until noon.', when: () => S.day >= 50 && S.day <= 52, w: 3 },
    { t: 'Day one hundred. In here a hundred is not a number, it is a place you have been.', when: () => S.day >= 100 && S.day <= 102, w: 3 },
    { t: 'Men still talk about the week of forty-five below as if it had been a war. In a way it was.', when: () => S.seen['beat:cold_snap'] && S.day >= 32 && S.day <= 60 },
  ],

  // the count
  count: [
    { t: 'Count. The fives shuffle into place. Lubimov counts with his lips moving, the way some men read.' },
    { t: 'Count. Your feet stop hurting at about the second count, which is not a good sign.', when: cold(-25) },
    { t: 'Count. The wind comes off the river with nothing in its way for four hundred kilometres.', when: cold(-15) },
    { t: 'Count. Someone at the end of the line is held up by the two men beside him. The number comes out right.' },
    { t: 'Count, in the dark, by lantern. Lubimov\'s breath goes up in front of his face like a second, smaller Lubimov.', when: inMonths('jan', 'feb') },
    { t: 'Count, in grey light. You can see the faces in the next five now, which is not always better.', when: inMonths('mar', 'apr') },
    { t: 'Count. The yard is mud under a skin of ice that breaks when the fives stamp. Somebody\'s boot comes off. Nobody laughs.', when: inMonths('apr', 'may') },
    { t: 'Count. Forty below, and they count slowly, as if it were a punishment, which it is.', when: cold(-40) },
    { t: 'Count. The number comes out right the first time, and the guards look at each other as if something has gone wrong.' },
    { t: 'Count. Since the two men went over the wire they count three times, and the third time is the slowest.', when: () => S.flags.othersEscaped && S.day < 90, w: 2 },
    { t: 'Count. Lubimov stops in front of you, looks at you, and moves on. He has done it every morning since the commission.', when: () => S.flags.spoke, w: 2 },
  ],

  // breakfast, before the bread is weighed
  breakfast: [
    { t: 'Breakfast. The skilly is the colour of the bowl.' },
    { t: 'Breakfast. There is a fish eye in the skilly, looking at you. You eat it.' },
    { t: 'Breakfast. Somebody says the cook was a professor once. Of what, nobody knows. Not of soup.' },
    { t: 'Breakfast. You eat the skilly the way you learned in the second week: slowly, from the top, so the warmth lasts.' },
    { t: 'Breakfast. The steam off the bowls is the only warm thing in the room, and two hundred men lean into it.', when: cold(-30) },
    { t: 'Breakfast. Cabbage again. It has been cabbage since October. They say there is a field of it somewhere that never ends.', when: inMonths('jan', 'feb', 'mar') },
    { t: 'Breakfast. Nettles in the skilly: the first green thing anyone has eaten since autumn. The brigade eats it like medicine.', when: inMonths('may'), m: 'Something green in the skilly.' },
    { t: 'Breakfast. Your hands shake a little holding the bowl. They did not used to.', when: () => S.strength < 30, s: 'cough' },
  ],

  // the foreman, at the work site
  foreman: [
    { t: 'Pasha counts heads and does not say anything. The quota is the quota.' },
    { t: 'Pasha walks the line once and says nothing, which from Pasha is a speech.' },
    { t: 'Pasha has the work sheet inside his jacket, against his chest, like a letter from home.' },
    { t: 'Pasha looks at the sky, then at the ground, then at the brigade, in that order, and does the arithmetic.' },
    { t: 'Pasha nods at you as he passes. Pasha does not nod at everyone.', when: () => S.brigade >= 25 },
    { t: 'Pasha does not look at you. That is a decision, and you know it is.', when: () => S.brigade <= -20 },
  ],
  // what the season does to the work
  site: [
    { t: 'The ground does not want to be dug. It rings under the pick like iron.', when: inMonths('jan', 'feb') },
    { t: 'Fires on the ground all night to soften it, and in the morning a hand\'s depth of mud on top of a mile of iron.', when: inMonths('feb', 'mar') },
    { t: 'The top of the ground has gone soft. Under it, a spade\'s length down, it is January forever.', when: inMonths('apr') },
    { t: 'Water stands in the pits you dug in March. You dig the same pits again, out of the water.', when: inMonths('may') },
    { t: 'The light lasts now. That means the work lasts too.', when: inMonths('apr', 'may') },
    { t: 'It is so cold the mortar freezes in the bucket. Men warm the trowels in their armpits.', when: cold(-35) },
  ],

  // noon, when nothing happens
  quiet: [
    { t: 'Noon. The soup cart does not come. Nothing happens. In here that is an event, and not a bad one.' },
    { t: 'Noon. Someone has found a bit of wire and is making a needle of it, slowly, with a stone. Six men watch him as if he were a surgeon.' },
    { t: 'Noon. A raven lands on the half-built wall and looks at the brigade with professional interest.', s: 'raven' },
    { t: 'Noon. The Estonian with the good boots tells you, in careful Russian, about the sea at Pärnu. You have never seen the sea. You let him tell it twice.', m: 'The sea at Pärnu, told twice.' },
    { t: 'Noon. Two men argue about whether it is Tuesday. It matters to neither of them. They argue anyway, because it is something to own.' },
    { t: 'Noon. Kuzma sings half a song, stops, and says he has forgotten the rest. He has not. The rest is about a woman.', when: () => S.kuzma.here, m: 'Half of Kuzma\'s song.' },
    { t: 'Noon. Lev explains to nobody in particular how a steam engine works. The brigade listens. It is better than thinking.', when: () => S.lev.alive, m: 'Lev and his steam engine.' },
    { t: 'Noon. The soup comes, and there is a piece of potato in yours. You look at it for a while before you eat it.', m: 'A piece of potato in the soup.' },
    { t: 'Noon. The guard on the corner tower is a boy of about nineteen. He waves, then remembers, then looks away.' },
    { t: 'Noon. A man from the second brigade has frostbite in two fingers. He looks at them the way you look at a letter you do not want to open.', when: cold(-25) },
    { t: 'Noon. You count the days on your fingers, then stop, because your fingers are cold and the number is the same as yesterday, plus one.' },
    { t: 'Noon. The sun is a white coin on the horizon for an hour, and then it gives up.', when: inMonths('jan') },
    { t: 'Noon. Snow comes sideways for an hour, so thick that the brigade works by the sound of each other\'s picks.', when: inMonths('feb') },
    { t: 'Noon. The sun comes out for eleven minutes. Every face in the brigade turns to it, the way plants do.', when: inMonths('feb', 'mar'), m: 'Eleven minutes of sun.' },
    { t: 'Noon. Water drips from the icicles on the tool shed for an hour, then stops, as if it had been told.', when: inMonths('mar') },
    { t: 'Noon. Somebody says he heard geese in the night. Nobody believes him. Everybody listens.', when: inMonths('apr'), m: 'Geese, or the rumour of geese.' },
    { t: 'Noon. The snow by the wall has gone grey and rotten, full of the whole winter: ash, bones, a lost mitten.', when: inMonths('apr', 'may') },
    { t: 'Noon. A fly, of all things. The brigade watches it for the whole break as if it were a cinema.', when: inMonths('may'), m: 'A fly, in May.' },
    { t: 'Noon. The men look at the gap in the wire by the latrine, mended now with new wire, bright as a coin. Then they stop looking.', when: () => S.flags.othersEscaped && S.day < 100 },
    { t: 'Noon. You look for Lev by the barrow, out of habit, and then remember.', when: () => !S.lev.alive && since(S.lev.diedDay) <= 15, w: 2 },
  ],

  // the gate in the evening
  gate: [
    { t: 'The column back. At the gate the warders search, because the gate is where things cross. Jackets open in the wind, hands up.' },
    { t: 'The column back, in the dark, in fives, faster than it went out. The gate is where the day is decided.', when: inMonths('jan', 'feb') },
    { t: 'The column back, in daylight still. It is strange to see the camp at the end of the day. It looks smaller.', when: inMonths('apr', 'may') },
    { t: 'Back through the gate. Somebody ahead of you turns his pockets out before he is told to, which is how you know he is new.' },
    { t: 'Back through the gate, through slush up to the ankle. The searchers do not want to bend down in it, which is a mercy.', when: inMonths('may') },
    { t: 'The column back. The man in front of you is asleep on his feet, walking. You put a hand on his back and steer him through the gate like a cart.' },
    { t: 'The column back, singing, because Pasha said sing: an old marching song nobody believes in, sung to keep the feet together.', when: () => S.brigade >= 15 },
    { t: 'The column back. The dogs walk with it on both sides, and look at nobody, which is worse than if they looked.' },
    { t: 'Back to the gate in a wind that takes your breath and does not give it back. Men walk with their eyes shut and their hands on the shoulders in front.', when: cold(-35) },
    { t: 'The column back, along the river. Somebody says the ice has a voice in the evening, and for a while everybody listens for it.', when: inMonths('mar', 'apr') },
    { t: 'The column back. Five abreast, as always, so that if one man falls, four men know.' },
  ],
  gateQuiet: [
    { t: 'The warders are cold too. The line goes through.', when: cold(-20) },
    { t: 'The search is quick tonight. Somebody important is waiting for the guards\' dinner.' },
    { t: 'They only pat the pockets tonight. The sergeant has a cold and wants his bed.' },
    { t: 'The line goes through. Lubimov is not on the gate tonight, and everybody walks a little differently.', m: 'Lubimov was not on the gate.' },
    { t: 'They search the five in front and wave the rest through. Luck, of a kind.', m: 'Waved through at the gate.' },
    { t: 'A warder looks at your hands, at your face, at your hands again, and lets you go. You do not know what he was looking for. Neither does he.' },
  ],
  countQuiet: [
    { t: 'Lubimov walks the line looking at faces. You keep yours the way you keep it.' },
    { t: 'Lubimov walks the line. He stops at a man in the third five and looks at him for a long time, and then walks on. The man does not breathe until he is gone.' },
    { t: 'Nobody is searched this morning. The guards want it over as much as you do.' },
    { t: 'The count comes out right on the second try, and the column moves before anybody can change his mind.' },
    { t: 'Lubimov counts you with his stick, a tap on each shoulder, like a man counting fence posts.' },
  ],
  blizzard: [
    { t: 'A blizzard. The hut shakes like a cart. From the window you cannot see the towers, which means the towers cannot see you.' },
    { t: 'A blizzard comes in after dark. Snow finds its way through the walls, fine as flour, and lies on the blankets.' },
    { t: 'Wind all night, the kind that has weight. The searchlights are on, and they light nothing but snow.' },
  ],
  sick: [
    { t: 'The medic looks at your tongue and writes you off work. The hut is empty all day. It is warm in a way it is never warm at night, and it is quiet, and you sleep like a man being paid for it.' },
    { t: 'The medic takes your wrist, counts, and writes a word you cannot read. A day off work. You lie in the empty hut and listen to the stove as if it were music.' },
    { t: 'Off work. The orderly sweeps around you, grumbling. You sleep through the noon rail, through the evening rail, almost through dinner.' },
  ],
  // the night's own small mercies: the account lists one some nights when the day had none
  mercy: [
    { t: 'Your foot cloths dried on the stove pipe, all the way through.' },
    { t: 'A place near the stove tonight, for once.', when: cold(-20) },
    { t: 'The soup was hot today: not warm, hot.' },
    { t: 'Nobody shouted at you all day.' },
    { t: 'Someone gave you a light without being asked.' },
    { t: 'A dream about bread, the white kind, with a crust. You woke before you ate it, and you still had it.' },
    { t: 'You found a crust in the snow by the bakery, frozen, that nobody else had found.' },
    { t: 'The lice were quiet tonight.' },
    { t: 'You remembered the name of your street in Kalinin, which you had lost for a week.' },
    { t: 'A warm wind for an hour in the afternoon, from the south, smelling of nothing, which was everything.', when: inMonths('mar', 'apr', 'may') },
    { t: 'You walked back on dry ground for the first time since October.', when: inMonths('may') },
    { t: 'Light at the evening count. You could see your own hands.', when: inMonths('apr', 'may') },
    { t: 'Senka drew a horse on the frost of the window, for no reason, and pointed at it, and you both looked at it.', when: () => !S.flags.senkaGone && S.flags.partner },
    { t: 'Lev told you the plot of a novel by a Frenchman, all of it, in the dark. It took an hour. It was a good hour.', when: () => S.lev.alive },
    { t: 'Alyoshka prayed for you, out loud, by name, and did not ask if he could.', when: () => S.flags.baptist },
  ],
  searchLead: [
    { t: 'Your turn. Jacket open, arms out.' },
    { t: 'Lubimov is on the gate tonight. Your turn.' },
    { t: 'Your turn. The warder\'s hands are colder than the wind.' },
    { t: 'Your turn. Off with the mittens, open the jacket, lift the shirt. The cold goes in like water.', when: cold(-25) },
  ],
  searchNone: [
    { t: 'He finds nothing, because there is nothing, or because he is cold.' },
    { t: 'His hands go over you like a man checking a horse. Nothing.' },
    { t: 'Nothing. He moves on to the next man, who is shaking.' },
    { t: 'He feels the seams of the jacket, slowly, the way a tailor would. Nothing. He seems almost disappointed.' },
    { t: 'He looks in your mouth. He looks in your boots. He finds your feet, which he does not want.' },
  ],

  dinner: [
    { t: 'Dinner: skilly again, and a ladle of groats if the cook\'s hand does not shake. The queue has its own law, and the law has a ladle.' },
    { t: 'Dinner. The mess hut is full of steam, so that you find your bowl by feel, like a blind man finding his own face.' },
    { t: 'Dinner. The cook\'s helper bangs the ladle on the pot rim between bowls, to knock off what might have been yours.' },
    { t: 'Dinner. The mess hut windows are white with ice on the inside. The heat of two hundred men is not enough to clear them.', when: cold(-30) },
    { t: 'Dinner. The door of the mess hut is propped open for the first time since autumn, and nobody closes it.', when: inMonths('may') },
    { t: 'Dinner. You eat standing, because there is no room on the benches, with your back to the wall so nobody can come at the bowl.' },
    { t: 'Dinner. The man next to you eats with his eyes shut. When you ask him why, he says it tastes better if he does not look.' },
    { t: 'Dinner. Groats tonight, actual groats, and the hut goes quiet the way a church does.', m: 'Groats, actual groats.' },
    { t: 'Dinner. Somebody has dropped his bowl. Four men are on their knees picking up the groats from the floor, one by one, and nobody laughs.' },
    { t: 'Dinner. The skilly has a skin of ice on it by the time you reach the bench.', when: cold(-38) },
    { t: 'Dinner. Pasha eats last, after the brigade, as he always does. It is the only thing you have ever seen him do slowly.', when: () => S.brigade >= 0 },
  ],

  night: [
    { t: 'Night. Two hundred men breathing in a hut built for a hundred. The stove is embers.' },
    { t: 'Night. Somebody is crying, very quietly, the way men learn to here. Nobody says anything. That is the kindness.', s: 'crying' },
    { t: 'Night. The Latvians are praying in Latvian. It sounds like counting.', s: 'prayer' },
    { t: 'Night. Lice, and the stove ticking, and somebody\'s boots drying on the pipe, and the smell of them.' },
    { t: 'Night. You lie on your back and do the thing you do instead of thinking about home: you count the planks above you.' },
    { t: 'Night, early, the way it is in January: dark at four, and fourteen hours to get through before the rail.', when: inMonths('jan') },
    { t: 'Night. The cold comes up through the planks of the bunk, so that you sleep on your side and turn every hour, like meat.', when: cold(-38) },
    { t: 'Night, and still light outside the window at the evening count. The men do not know what to do with it.', when: inMonths('apr', 'may') },
    { t: 'Night. Meltwater is running somewhere under the hut. It sounds like someone talking in the next room.', when: inMonths('may'), s: 'drip' },
    { t: 'Night. Kuzma is telling the stove about the priest and the tax collector. You fall asleep before the end. You always do.', when: () => S.kuzma.here, m: 'Kuzma\'s story, nearly to the end.' },
    { t: 'Night. Senka, in the bunk above, is drawing on the frost of the wall with his fingernail. You do not ask what.', when: () => !S.flags.senkaGone && S.flags.partner },
  ],
};
