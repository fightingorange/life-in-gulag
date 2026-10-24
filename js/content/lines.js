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
// where the brigade is today: S.today.site is 'power' | 'settlement' | 'timber', or null inside (day.js)
const onSite = key => !!S.today && S.today.site === key;
const outdoors = () => !S.today || !S.today.inside;
// Senka's name is learned on the march, at the frost window, or from the wire; until then he is the big man
const knowsSenka = () => !!(S.flags.metSenka || S.flags.partner || S.seen.senka_frost);
// Lev in the planning office (lev_repay, events.js)
const levAtOffice = () => !!S.flags.levOffice && S.lev.alive;

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
    { t: 'In the bunk above, Senka\'s boots hang by your face, as they always do.', when: () => !S.flags.senkaGone && knowsSenka() },
    { t: 'Senka sleeps with his hands inside his jacket, like a man guarding something.', when: () => !S.flags.senkaGone && knowsSenka() },
    { t: 'In the bunk above, the big man\'s boots hang by your face, as they always do. Nobody has told you his name.', when: () => !S.flags.senkaGone && !knowsSenka() },
    { t: 'The big man in the bunk above sleeps with his hands inside his jacket, like a man guarding something. You have not heard him say a word to anyone.', when: () => !S.flags.senkaGone && !knowsSenka() },
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
    // the boots, and the third night (arrival.js)
    { t: 'The rubber boots are where your felt ones used to be. You put them on in the dark, still wet from yesterday, and your feet remember May as a rumour.', when: () => S.flags.rubber, w: 2 },
    { t: 'Across the hut Vaska Kosoi is putting on your felt boots. He does it slowly, so that you can watch.', when: () => S.flags.rubber && S.flags.urki === 'gave', w: 2 },
    { t: 'Your ribs on the left side tell you the time before the rail does.', when: () => S.flags.urki === 'fought' && since(S.flags.urkiGrudge) <= 12, w: 2 },
    { t: 'Vaska\'s man looks at you across the hut and taps his stomach. A reminder. You are paid up, for now.', when: () => S.flags.urki === 'tribute', w: 2 },
    { t: 'Pasha passes your bunk and looks at your boots and then at you, the way a man checks a tool he has lent.', when: () => S.flags.urki === 'brigade', w: 1.5 },
    { t: 'You look at the photograph before the rail, with your back to the hut. Nina, and Tanya at nine, in a coat that used to be yours.', when: () => S.flags.photo, w: 1.5 },
    { t: 'Lev\'s felt boots, on your feet now. You still put them under your head every night, the way he did.', when: () => S.flags.levBoots, w: 2 },
    // Lev in the office, Kuzma after the cough, Kuzma's half loaf (day.js)
    { t: 'Lev is up before the rail, brushing down the office jacket with the flat of his hand. It has no number on the knee. After the count he goes the other way from the column.', when: levAtOffice, w: 2 },
    { t: 'Kuzma coughs once at reveille, out of habit, and listens to it the way a man taps a wheel. It sounds like anybody\'s cough now.', when: () => S.kuzma.here && S.kuzma.helped, w: 1.5 },
    { t: 'Kuzma looks you over at reveille, the way he did in the first week, from the boots up. Then he goes back to the stove.', when: () => S.kuzma.here && S.flags.kuzmaHalf },
    // the first of May: Kuzma held until special order; Senka's date; Senka gone, and not found
    { t: 'Kuzma is already sitting up, with the paper folded small in his hand. He has not told the stove anything since the first of May. The men talk round him, carefully, the way men walk round a hole.', when: () => S.kuzma.here && S.flags.kuzmaHeld && since(S.flags.kuzmaHeld) <= 6, w: 3 },
    { t: 'Kuzma told the stove about the priest and the tax collector last night, from the beginning, for the first time since the paper. The hut let out a breath it had been holding for a week.', when: () => S.kuzma.here && S.flags.kuzmaHeld && since(S.flags.kuzmaHeld) >= 7 && since(S.flags.kuzmaHeld) <= 9, w: 4 },
    { t: 'Senka has stopped drawing. He sleeps in his boots now, with his hands inside his jacket, and wakes before the rail.', when: () => S.flags.senkaDate && S.flags.partner && !S.flags.senkaGone, w: 3 },
    // the brigade: the bunk by the door; the bench by the stove
    { t: 'The door opened eleven times in the night, by your count, and the cold came in over you each time and lay down on the blanket. The bunk by the door is for counting.', when: () => S.flags.door, w: 3 },
    { t: 'Pasha\'s men sleep by the stove, and you are one of the men who sleep by the stove now. Nobody said so. You were simply not moved when the places were taken.', when: () => S.brigade >= 30 && !S.flags.door, w: 1.5 },
    { t: 'Four days. Five. Nobody has been brought back. Somebody says Senka reached the railway town; somebody always says that. You find that you believe it, and you keep that to yourself.', when: () => S.flags.senkaFree && since(S.flags.senkaGoneDay) >= 4 && since(S.flags.senkaGoneDay) <= 20, w: 3 },
  ],

  // the count
  count: [
    { t: 'Count. The fives shuffle into place. Lubimov counts with his lips moving, the way some men read.' },
    { t: 'Count. Your feet stop hurting at about the second count. The old men say that is when to start worrying.', when: cold(-25) },
    { t: 'Count. The wind comes off the river with nothing in its way for four hundred kilometres.', when: cold(-15) },
    { t: 'Count. Someone at the end of the line is held up by the two men beside him. The number comes out right.' },
    { t: 'Count, in the dark, by lantern. Lubimov\'s breath goes up in front of his face like a second, smaller Lubimov.', when: inMonths('jan', 'feb') },
    { t: 'Count, in grey light. You can see the faces in the next five now. Some of them you would rather not have seen.', when: inMonths('mar', 'apr') },
    { t: 'Count. The yard is mud under a skin of ice that breaks when the fives stamp. Somebody\'s boot comes off. Nobody laughs.', when: inMonths('apr', 'may') },
    { t: 'Count. Forty below, and they count slowly, as if the counting were the punishment.', when: cold(-40) },
    { t: 'Count. The number comes out right the first time, and the guards look at each other as if something has gone wrong.' },
    { t: 'Count. Since the two men went over the wire they count three times, and the third time is the slowest.', when: () => S.flags.othersEscaped && S.day < 90, w: 2 },
    { t: 'Count. Lubimov stops in front of you, looks at you, and moves on. He has done it every morning since the commission.', when: () => S.flags.spoke, w: 2 },
    { t: 'Count. In the rubber boots you cannot feel the ground, only the cold coming up through it, like water into a hole.', when: () => S.flags.rubber && S.temp <= -25, w: 2 },
    { t: 'Count. Lubimov walks the line in new felt boots, white ones. He stops in front of you, and looks down at your feet, and then at his own.', when: () => S.flags.urki === 'warder', w: 2 },
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
    { t: 'Pasha hands you the board without a word and goes to the far end of the work, where he cannot see what you write on it.', when: () => S.flags.measurer, w: 2 },
    { t: 'Pasha counts heads and his eyes go past you to the next man, the way they go past a post.', when: () => S.flags.door, w: 2 },
  ],
  // what the season does to the work
  // (the settlement digs, the power station lays brick, the timber bank hauls; S.today.site says which)
  site: [
    { t: 'The ground does not want to be dug. It rings under the pick like iron.', when: () => onSite('settlement') && inMonths('jan', 'feb')() },
    { t: 'Fires on the ground all night to soften it, and in the morning a hand\'s depth of mud on top of a mile of iron.', when: () => onSite('settlement') && inMonths('feb', 'mar')() },
    { t: 'The top of the ground has gone soft. Under it, a spade\'s length down, it is January forever.', when: () => onSite('settlement') && inMonths('apr')() },
    { t: 'Water stands in the pits you dug in March. You dig the same pits again, out of the water.', when: () => onSite('settlement') && inMonths('may')() },
    { t: 'The light lasts now. That means the work lasts too.', when: inMonths('apr', 'may') },
    { t: 'It is so cold the mortar freezes in the bucket. Men warm the trowels in their armpits.', when: () => onSite('power') && cold(-35)() },
    // the power station
    { t: 'The scaffold is poles and planks and rope, and at the second storey the wind off the river comes through it as if the wall were not there. Men lay brick with one hand and hold the pole with the other. The norm is set for two hands.', when: () => onSite('power') && inMonths('jan', 'feb')() },
    { t: 'The bricks are frozen to the stack and come away with a crowbar, one at a time. The mortar bucket stands on a fire of scrap until it steams, and has a crust on it by the time it reaches the scaffold.', when: () => onSite('power') && inMonths('jan', 'feb')() },
    { t: 'The mortar stays soft in the bucket all morning now, and the second storey is wet to the touch. From the scaffold you can see the river, grey, still whole.', when: () => onSite('power') && inMonths('apr', 'may')() },
    // the timber bank
    { t: 'The logs are frozen to the bank and to each other, and the first hour goes on breaking them loose with a pole. Then the sledge road, glazed by the runners, where two men and a log go up a step at a time and come down all at once.', when: () => onSite('timber') && inMonths('jan', 'feb')() },
    { t: 'Under the bank the river has started to talk under the ice: a knock, and a long creak, like a door in another house. The guards on the bank turn their heads to it, the same as the men.', when: () => onSite('timber') && inMonths('mar')() },
    { t: 'The bank is mud to the knee. Every few steps it takes a boot, and you stand on one leg with the log on your shoulder while the man behind you digs for it with his hand.', when: () => onSite('timber') && inMonths('may')() },
  ],

  // noon, when nothing happens
  quiet: [
    { t: 'Noon. The soup cart does not come. Nothing happens. In here that is an event, and not a bad one.' },
    { t: 'Noon. Someone has found a bit of wire and is making a needle of it, slowly, with a stone. Six men watch him as if he were a surgeon.' },
    { t: 'Noon. A raven lands on the half-built wall and looks at the brigade with professional interest.', s: 'raven' },
    { t: 'Noon. The Estonian with the good boots tells you, in careful Russian, about the sea at Pärnu. You have never seen the sea. You let him tell it twice.', m: 'The sea at Pärnu, told twice.' },
    { t: 'Noon. Two men argue about whether it is Tuesday. It matters to neither of them. They argue anyway, because it is something to own.' },
    { t: 'Noon. Kuzma sings half a song, stops, and says he has forgotten the rest. He has not. The rest is about a woman.', when: () => S.kuzma.here, m: 'Half of Kuzma\'s song.' },
    { t: 'Noon. Lev explains to nobody in particular how a steam engine works. The brigade listens. It is better than thinking.', when: () => S.lev.alive && !S.flags.levOffice, m: 'Lev and his steam engine.' },
    { t: 'Noon. Lev\'s place at the barrow is empty. Somebody says the office has a stove and a kettle, and says it again a little later, as if it were news.', when: () => levAtOffice() && outdoors(), w: 1.5 },
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
    // the late winter: fewer words than January
    { t: 'Noon. Under the bank, where a spring comes in, there is open water: a hand\'s width of it, black, moving. Men go down to look at it one at a time, and come back up.', when: () => outdoors() && inMonths('mar', 'apr')() },
    { t: 'Noon. An old man from the next brigade takes off his cap and sits with his face to the sun and his eyes shut. His head is white where the cap was, like a potato out of a cellar.', when: () => outdoors() && inMonths('mar', 'apr')() },
    { t: 'Noon. The wind smells of earth. Not snow, not smoke: earth, from somewhere it has been uncovered. Men breathe through their noses for the first time since October.', when: () => outdoors() && inMonths('apr', 'may')() },
    { t: 'Noon. The mud has a bottom somewhere, but nobody has found it. The barrows stand in it to the axle and the brigade stands in it to the shin, and eats standing.', when: () => outdoors() && inMonths('apr', 'may')() },
    { t: 'Noon. The first mosquitoes, up out of the wet ground by the wall. Men slap their necks and curse them, and you can hear that they do not mean it.', when: () => outdoors() && inMonths('may')() },
    { t: 'Noon. The guards on the towers are in their summer coats, all of them, on the same morning, as if by order. It was by order.', when: () => outdoors() && inMonths('may')() },
    { t: 'Noon. The men look at the gap in the wire by the latrine, mended now with new wire, bright as a coin. Then they stop looking.', when: () => S.flags.othersEscaped && S.day < 100 },
    { t: 'Noon. You look for Lev by the barrow, out of habit, and then remember.', when: () => !S.lev.alive && since(S.lev.diedDay) <= 15, w: 2 },
    { t: 'Noon. Kuzma sits with the brigade and eats, and says nothing, and nobody asks him anything. Somebody has to tell the story about the priest, so somebody does, badly, and Kuzma does not correct him.', when: () => S.kuzma.here && S.flags.kuzmaHeld && since(S.flags.kuzmaHeld) <= 6, w: 3 },
    { t: 'Noon. Two men from the brigade argue about the percentage, and stop when they see you, and start again more quietly. The sum is yours now, and so is the argument.', when: () => S.flags.measurer && outdoors(), w: 2 },
    { t: 'Noon. The brigade eats in a ring with its back to the wind, and the ring has a gap in it where you sit, a little outside, the way a dog sits outside a door.', when: () => S.flags.door && outdoors(), w: 3 },
  ],

  // the gate in the evening
  gate: [
    { t: 'The column back. At the gate the warders search, because the gate is where things cross. Jackets open in the wind, hands up.' },
    { t: 'The column back, in the dark, in fives, faster than it went out. The gate is where the day is decided.', when: inMonths('jan', 'feb') },
    { t: 'The column back, in daylight still. It is strange to see the camp at the end of the day. It looks smaller.', when: inMonths('apr', 'may') },
    { t: 'Back through the gate. Somebody ahead of you turns his pockets out before he is told to. New.' },
    { t: 'Back through the gate, through slush up to the ankle. The searchers do not want to bend down in it, so they do not.', when: inMonths('may') },
    { t: 'The column back. The man in front of you is asleep on his feet, walking. You put a hand on his back and steer him through the gate like a cart.' },
    { t: 'The column back, singing, because Pasha said sing: an old marching song nobody believes in, sung to keep the feet together.', when: () => S.brigade >= 15 },
    { t: 'The column back. The dogs walk with it on both sides and look at nobody. You would rather they looked.' },
    { t: 'Back to the gate in a wind that takes your breath and does not give it back. Men walk with their eyes shut and their hands on the shoulders in front.', when: cold(-35) },
    { t: 'The column back, along the river. Somebody says the ice has a voice in the evening, and for a while everybody listens for it.', when: inMonths('mar', 'apr') },
    { t: 'The column back. Five abreast, as always, so that if one man falls, four men know.' },
    { t: 'The column back. "A step to the left or the right," the convoy says at the site, every evening, as if anyone had forgotten since the railhead.' },
    { t: 'The column back, in the dark. You walk in the rubber boots the way the old men walk: flat, not lifting, saving something.', when: () => S.flags.rubber && inMonths('jan', 'feb')() },
    { t: 'The column back. The road is two ruts of water with a ridge of rotten ice between them, and the fives walk the ridge, slipping, so as not to wade.', when: inMonths('apr', 'may') },
    { t: 'The column back with the sun behind it, so that its shadow reaches the gate first, five abreast, and is not searched.', when: inMonths('apr', 'may') },
    { t: 'Back through the gate. The warders search with their mittens off now. They are quicker, and they find more.', when: inMonths('apr', 'may') },
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
    { t: 'Clean foot cloths, and skin that does not itch, for once.', when: () => !!S.until.clean, w: 3 },
    { t: 'A place by the stove, because the brigade keeps one for you now.', when: () => S.brigade >= 30 && !S.flags.door && cold(-15)(), w: 2 },
    { t: 'You remembered the name of your street in Kalinin. It had been gone a week.' },
    { t: 'A warm wind for an hour in the afternoon, from the south. It smelled of nothing at all.', when: inMonths('mar', 'apr', 'may') },
    { t: 'You walked back on dry ground for the first time since October.', when: inMonths('may') },
    { t: 'Light at the evening count. You could see your own hands.', when: inMonths('apr', 'may') },
    { t: 'Senka drew a horse on the frost of the window, for no reason, and pointed at it, and you both looked at it.', when: () => !S.flags.senkaGone && S.flags.partner },
    { t: 'Lev told you the plot of a novel by a Frenchman, all of it, in the dark. It took an hour. It was a good hour.', when: () => S.lev.alive },
    { t: 'Alyoshka prayed for you, out loud, by name, and did not ask if he could.', when: () => S.flags.baptist },
    { t: 'You looked at the photograph by the light of the stove door, for as long as you wanted.', when: () => S.flags.photo },
    { t: 'Your own boots, dry inside, under your head.', when: () => !S.flags.rubber && S.flags.urki && S.flags.urki !== 'warder' },
    { t: 'Lev talked about Leningrad in the dark, in a whisper, without moving his lips, the way you both learned on the march.', when: () => S.lev.alive && S.flags.metLev },
    { t: 'Lev came back from the office warm through, and sat on the end of your bunk, and the warm came off his jacket for a while.', when: levAtOffice },
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
    { t: 'Night. Your boots under your head, and your head on them, the way Kuzma said. Twice in the night a hand tries them, gently, and goes away.', when: () => !S.flags.rubber && ['fought', 'tribute', 'paid', 'brigade'].includes(S.flags.urki), w: 1.5 },
    { t: 'Night. The urki are playing cards by the stove door. Once Vaska looks up, finds you in the dark, and goes back to his cards.', when: () => ['fought', 'warder'].includes(S.flags.urki), w: 1.5 },
    { t: 'Night. You hang the rubber boots on the stove pipe and they steam, and stink, and are wet again by morning.', when: () => S.flags.rubber },
    { t: 'Night. Lev is back from the office with a stub of pencil behind his ear. He tells you about the planning officer, who cannot add, and signs what Lev adds for him, and gets the bonus.', when: levAtOffice, w: 1.5 },
    { t: 'Night. Lev does not thank you for the bread any more. It has gone past that, the way a debt goes past the point where anyone writes it down.', when: () => S.lev.alive && S.lev.helped >= 3 },
    { t: 'Night. Kuzma\'s cough has gone the way it came. He tells the stove about the priest and the tax collector, badly, and the hut corrects him from the bunks.', when: () => S.kuzma.here && S.kuzma.helped, w: 1.5 },
    { t: 'Night. Somewhere in the dark a man breaks a crust in two, and you know the sound: Kuzma, the first fortnight, holding out the half without a word.', when: () => S.flags.kuzmaHalf },
    { t: 'Night. The lice are quiet. The bathhouse boiled them out of the seams, and for a few nights the hut sleeps like a hut of men instead of a hut of men scratching.', when: () => !!S.until.clean, m: 'The lice, quiet.', w: 2 },
    { t: 'Night. Kuzma lies on his back with the paper on his chest, like a man who fell asleep over a book. He is not asleep.', when: () => S.kuzma.here && S.flags.kuzmaHeld && since(S.flags.kuzmaHeld) <= 6, w: 3 },
    { t: 'Night, by the door. Every man who goes out to the latrine lets the winter in over your feet, and every man who comes back lets it in again. You stop counting at thirty.', when: () => S.flags.door, w: 3 },
    { t: 'Night. From the bunk by the door the stove is a red mark a long way off, like a village seen from the road.', when: () => S.flags.door, w: 2 },
    { t: 'Night. The board is under your head with your boots, because a board can be stolen too, and a brigade that loses its board loses two days\' bread.', when: () => S.flags.measurer, w: 1.5 },
  ],
};
