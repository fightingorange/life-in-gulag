'use strict';
// Things that happen at noon. Each event is data: when it can happen, how often, and what it shows.
//   once        happens at most once
//   cooldown    days before it can happen again; max: how many times in all
//   minDay      not before this day
//   site        only at a work site, not on days spent inside
//   when()      extra condition
//   force()     happens as soon as it can (consequences of earlier choices)
//   setup()     state that makes it reachable, for the dev panel and tests

const EVENTS = [];
function EV(id, def) { EVENTS.push(Object.assign({ id, weight: 1 }, def)); }

function eventOk(e) {
  const n = S.count[e.id] || 0;
  if (e.once && n) return false;
  if (e.max && n >= e.max) return false;
  if (e.cooldown && n && S.day - (S.last[e.id] || 0) < e.cooldown) return false;
  if (e.minDay && S.day < e.minDay) return false;
  if (e.site && S.today.inside) return false;
  return !e.when || e.when();
}
function pickEvent() {
  for (const e of EVENTS) if (e.force && eventOk(e) && e.force()) return e;
  const since = S.day - S.lastEventDay;
  const p = S.day <= 1 ? 0 : S.day === 2 ? 1 : since < 2 ? .1 : .34;
  if (!chance(p)) return null;
  return weighted(EVENTS.filter(e => !e.force && eventOk(e)), e => typeof e.weight === 'function' ? e.weight() : e.weight);
}
function runEvent(e) {
  S.count[e.id] = (S.count[e.id] || 0) + 1;
  S.last[e.id] = S.day;
  S.seen[e.id] = true;
  S.lastEventDay = S.day;
  FLOW.story = true;
  e.run();
}
const onward = (label = 'Go on.') => [{ label, fn: afterNoon }];
const noonFrame = () => S.today.inside ? { frame: 'stove', amb: 'amb_hut' } : { frame: 'noon', amb: 'amb_wind' };
// bread from the lining if there is enough, otherwise the noon soup
function giveFood(grams) {
  if (S.bread >= grams) { S.bread -= grams; S.stats.breadGiven += grams; }
  else adj(-6);
  S.today.gave = true;
}

// ---------- Kuzma ----------
EV('kuzma_river', {
  once: true, minDay: 2, weight: 4, when: () => S.kuzma.here,
  run() {
    show([
      S.flags.metKuzma ? 'The noon break, by the fire that is not allowed and is lit anyway. Kuzma talks the way other men pray.'
        : 'The noon break, by the fire that is not allowed and is lit anyway. Kuzma, fifteen years for a sack of grain off his own collective farm, talks the way other men pray.',
      '"Downriver, three days on the ice, there is the free settlement. Released men, who cannot leave. They will feed you. Then they will sell you back, because they are hungry too. Upriver there is nothing." He thinks about it. "Nothing is better."',
    ], [{ id: 'remember', label: 'Remember it.', hint: 'the wire needs a way', fn: () => {
      S.flags.river = true;
      note('The way: down the river, three days on the ice, to the smoke.', true);
      afterNoon();
    } }], { ...noonFrame(), voice: ['kuzma_river', 'kuzma_nothing'] });
  },
});
EV('kuzma_cough', {
  once: true, minDay: 58, weight: 1.5, when: () => S.kuzma.here && !S.flags.betrayed,
  run() {
    show([
      'Kuzma has a cough that does not sound like the others. At noon he sits with his back against the wall and does not tell the fire anything.',
      '"If," he says, and taps his spoon against your knee. "You know. If. Keep the spoon. It is a good spoon."',
    ], [
      { id: 'give', label: S.bread >= 200 ? 'Give him two hundred grams.' : 'Give him your soup.', hint: 'a man with a cough needs to eat', fn: () => {
        giveFood(200); S.kuzma.helped = true;
        note('Kuzma ate it the way he does everything, as if there were a story in it.', true);
        afterNoon();
      } },
      { id: 'stupid', def: true, label: 'Tell him not to be stupid.', fn: () => {
        S.kuzma.coughDay = S.day;
        note('Kuzma laughed, and the laugh turned into the cough.', true);
        afterNoon();
      } },
    ], { ...noonFrame(), sfx: 'cough', voice: 'kuzma_cough' });
  },
});
EV('kuzma_worse', {
  once: true, force: () => S.kuzma.here && S.kuzma.coughDay && !S.kuzma.helped && S.day >= S.kuzma.coughDay + 4,
  setup: () => { S.kuzma.coughDay = S.day - 4; },
  run() {
    cue('cough');
    show(['Kuzma is worse. He has stopped telling stories, which in Kuzma is like a stove going out. At noon he holds his soup and does not drink it, only holds it, for the warmth.'], [
      { id: 'give', label: S.bread >= 200 ? 'Give him two hundred grams.' : 'Give him your soup.', fn: () => {
        giveFood(200); S.kuzma.helped = true;
        note('Kuzma ate. By evening he was telling the stove about the priest and the tax collector again, badly.', true);
        mercy('Kuzma, telling stories again.', 0);
        afterNoon();
      } },
      { id: 'no', def: true, label: 'Look at your own bowl.', fn: () => { note('Kuzma will not see the river go out.', true); afterNoon(); } },
    ], noonFrame());
  },
});

// ---------- Lev ----------
EV('lev_barrow', {
  cooldown: 5, weight: 3, site: true, when: () => S.lev.alive,
  run() {
    const first = S.count.lev_barrow === 1;
    const paras = first ? [
      S.flags.metLev ? 'Lev, from the march, has stopped at the barrow. He is nineteen, and the paper was something he read aloud at a seminar. He makes about half the quota now, and the brigade carries the rest.'
        : 'Lev has stopped at the barrow. He is nineteen, from Leningrad, five years for a paper he read aloud at a seminar. He makes about half the quota now, and the brigade carries the rest.',
      'He does not ask. He looks at your pocket.',
    ] : [pick([
      'Lev again, at the barrow. He has started to walk the way the old ones walk, feet flat, saving something.',
      'Lev stops beside you with the barrow. He talks about Leningrad for a while, about the Fontanka in June, and then he stops talking and looks at your pocket.',
      'Lev is leaning on the barrow as if it were holding him up. Perhaps it is.',
    ])];
    show(paras, [
      { id: 'give', label: S.bread >= 200 ? 'Give him two hundred grams.' : 'Give him your noon soup.', hint: S.bread >= 200 ? 'from what you have kept' : 'you will feel it by evening', fn: () => {
        giveFood(200);
        S.lev.health = Math.min(100, S.lev.health + 18); S.lev.helped++; brig(3);
        if (first) return show(['He eats it there, at the barrow, with his back to the wind, not quickly. "I will pay you back." He will not. You both know it, and it does not matter.'], onward(), { sfx: 'bread', voice: 'lev_payback' });
        note('Lev ate it with his back to the wind.');
        afterNoon();
      } },
      { id: 'refuse', def: true, label: 'Look at the barrow.', fn: () => {
        S.lev.refused++; S.lev.health -= 4;
        note(S.lev.refused >= 2 ? 'Lev has stopped asking with his eyes. That is worse.' : 'Lev looked at the barrow too.');
        afterNoon();
      } },
    ], { frame: siteFrame(null), amb: 'amb_site' });
  },
});
EV('lev_quote', {
  once: true, force: () => S.lev.alive && S.lev.helped >= 2,
  setup: () => { S.lev.helped = 2; },
  run() {
    adj(3);
    mercy('Lev, with colour in his face.', 0);
    show([
      'Lev sits by you at the noon fire, out of the wind. He has colour today.',
      '"Pain and suffering," he says, "are always inevitable for a large intelligence and a deep heart."',
      '"Who said that."',
      '"A man who did four years in Omsk. He wrote it afterwards, with a full stomach." He laughs, and then he coughs, and then he is quiet.',
    ], onward(), { ...noonFrame(), voice: ['lev_quote', 'prisoner_who', 'lev_omsk'] });
  },
});
EV('lev_repay', {
  once: true, minDay: 55, weight: 3, when: () => S.lev.alive && S.lev.helped >= 4,
  setup: () => { S.lev.helped = 4; S.day = Math.max(S.day, 55); },
  run() {
    show([
      'Lev finds you at the water barrel. He has been taken into the planning office: somebody found out he can draw a straight line and do sums, which in here is a trade.',
      'He gives you three hundred grams of bread wrapped in a page of somebody\'s production report. "I told you I would pay you back. You didn\'t believe me. Neither did I."',
      'Inside the bread there is a second page, folded small: the river, copied in pencil, every bend of it, and a cross where the settlement is. "Forty-one kilometres," Lev says. "Don\'t tell me what it\'s for."',
    ], [{ id: 'take', label: 'Take it.', fn: () => {
      S.bread += 300; S.flags.map = true;
      mercy('Lev paid you back.', 0);
      S.lev.health = Math.min(100, S.lev.health + 25);
      note('The way: Lev\'s map, folded small in your boot.', true);
      afterNoon();
    } }], { frame: 'office', amb: 'amb_hut', voice: ['lev_repay', 'lev_map'] });
  },
});

// ---------- the kum and his trusty ----------
EV('fomin_recruit', {
  once: true, minDay: 4, weight: () => S.flags.urki === 'warder' ? 8 : 2, when: () => !S.flags.betrayed,
  run() {
    show([
      S.flags.urki === 'warder' ? 'Fomin finds you at the water barrel: the trusty in the clean jacket from the guardhouse, the night you came. He works indoors and eats. He has heard about the boots.'
        : 'Fomin finds you at the water barrel. Fomin is a trusty, which means he works indoors and eats.',
      '"The kum asked about you. Nothing bad. He likes to know who people are." He looks at your hands. "There is a place coming free in the bootmakers\'. Warm. He said you might be the kind who notices things."',
    ], [
      { id: 'deny', say: 'prisoner_deny', label: '"I don\'t notice anything."', hint: 'the kum will remember that too', fn: () => {
        eye(10); note('Fomin went away smiling. Fomin always goes away smiling.'); afterNoon();
      } },
      { id: 'ask', say: 'prisoner_ask', label: '"What would he want noticed?"', hint: 'a warm chair has a price', fn: () => {
        S.flags.informer = true; S.flags.informerDay = S.day; eye(-20);
        show(['You have not said yes. You have said something that sounds like yes to a man who only needs that much.'], onward());
      } },
    ], { ...noonFrame(), voice: ['fomin_kum', 'fomin_bootmakers'] });
  },
});
EV('kum_name', {
  once: true, force: () => S.flags.informer && !S.flags.named && S.day >= S.flags.informerDay + 3,
  setup: () => { S.flags.informer = true; S.flags.informerDay = S.day - 3; },
  run() {
    show([
      'Fomin again. The kum has been patient, Fomin says, and patience is not free.',
      '"A name. Anyone. Kuzma talks at night. Everybody hears him."',
    ], [
      { id: 'name', say: 'prisoner_kuzma', label: '"Kuzma."', hint: 'the bootmakers\' shop is warm', fn: () => {
        S.flags.betrayed = true; S.flags.named = true; S.flags.bootmakers = true; eye(-30);
        S.kuzma.here = false;
        show(['Kuzma is taken from the hut after the evening count, with his bag. His bunk is given to a Latvian who does not talk. The next morning you are told to report to the bootmakers\'.'], onward(), { sfx: 'door' });
      } },
      { id: 'refuse', def: true, say: 'prisoner_noname', label: '"I don\'t have one."', fn: () => {
        S.flags.informer = false; S.flags.refusedName = true; eye(30);
        show(['"Everyone has one," Fomin says, and goes. The kum will remember that you had the chance.'], onward(), { voice: 'fomin_everyone' });
      } },
    ], { ...noonFrame(), voice: 'fomin_name' });
  },
});
EV('found_out', {
  once: true, force: () => S.flags.betrayed && S.day >= (S.last.kum_name || 0) + 2 && chance(.15),
  setup: () => { S.flags.betrayed = true; },
  run() {
    adj(-18); brig(-40);
    remember('The brigade knows who gave Kuzma.', true);
    show([
      'Three of the brigade in the latrine, and you, and no one in the door. Nobody says the word. They do not need the word.',
      'Afterwards you wash your face in snow. Nothing is broken. That was deliberate. Broken men go to the medic, and the medic asks.',
    ], onward(), { ...noonFrame(), sfx: 'fight' });
  },
});
EV('fomin_parcel', {
  once: true, minDay: 8,
  run() {
    show(['Fomin has a parcel. Fomin has a parcel every month: lard, sugar, tobacco, a dried fish like a shoe. He needs it carried to the hut while he signs for it. Nobody else is around.'], [
      { id: 'honest', label: 'Carry it. Take nothing.', fn: () => {
        tob(1);
        show(['He gives you a pinch of tobacco at the door: the price of a carrier. He counts the rest in front of you.'], onward(), { voice: 'fomin_carrier' });
      } },
      { id: 'fish', label: 'Carry it. Take the fish.', hint: 'three days of not thinking about bread', fn: () => {
        if (chance(.4)) { eye(20); brig(-5); show(['He counts the rest in front of you. He does not say anything about the fish. Fomin writes things down.'], onward()); }
        else { S.bread += 300; show(['The fish goes into the lining. It is salt and bone, and it is three days of not thinking about bread.'], onward()); }
      } },
    ], noonFrame());
  },
});

// ---------- the brigade ----------
EV('tufta', {
  cooldown: 18, max: 2, weight: 2, site: true, when: () => !S.flags.bootmakers,
  run() {
    show([
      'Pasha squats by you with the work sheet. "The percentage is a hundred and twenty." It is not. It is maybe sixty.',
      '"The inspector takes the sheet. Somebody has to have done the measuring. I need a name that is not mine." He is not asking. He is a good foreman. He is asking.',
    ], [
      { id: 'mine', say: 'prisoner_myname', label: '"Put my name."', hint: 'the brigade eats on that sheet; so do you, if the inspector is lazy', fn: () => {
        brig(15);
        if (chance(.25)) { S.flags.pendingCells = true; S.flags.cellsWhy = 'The inspector checked the sheet. Your name was on it.'; }
        note('Your name is on the sheet. If the inspector looks, it is your name he finds.', true);
        afterNoon();
      } },
      { id: 'other', say: 'prisoner_other', label: '"Put somebody else\'s."', fn: () => {
        brig(-15); note('Pasha wrote another name. He did not look at you while he wrote it.', true); afterNoon();
      } },
    ], { frame: siteFrame(null), amb: 'amb_site', voice: ['pasha_percentage', 'pasha_name'] });
  },
});
EV('wood_stick', {
  cooldown: 9, max: 4, weight: 1.5, site: true, when: () => S.temp <= -20,
  run() {
    show(['At the end of the shift Pasha points at the scrap pile by the carpenters\' shed. "One stick each. Whoever carries nothing sits by the door tonight."'], [
      { id: 'carry', label: 'Carry a stick back.', hint: 'the gate may take it, and notice you', fn: () => { S.today.wood = true; afterNoon(); } },
      { id: 'none', def: true, label: 'Carry nothing.', fn: () => { brig(-3); note('You carried nothing. You will sit by the door.'); afterNoon(); } },
    ], { frame: siteFrame(null), amb: 'amb_site', voice: 'pasha_stove' });
  },
});

// ---------- Senka ----------
EV('senka_frost', {
  once: true, minDay: 5, weight: 3, when: () => !S.flags.senkaGone,
  run() {
    show([
      S.flags.metSenka ? 'Senka, the big man from the march who would not turn his head, draws on the frost of the lean-to window with a nail: the river. A bend. A cross. Then he rubs it out with his sleeve and looks at you.'
        : 'Senka, deaf since a shell at Kursk, draws on the frost of the lean-to window with a nail: the river. A bend. A cross. Then he rubs it out with his sleeve and looks at you.',
      'He walked out of a German camp in \'43. He is telling you he can walk out of this one.',
    ], [
      { id: 'nod', label: 'Nod.', hint: 'a man who has done it before', fn: () => {
        S.flags.partner = true;
        note('Senka. He walked out of a German camp in \'43. He does not talk. He draws.', true);
        afterNoon();
      } },
      { id: 'away', def: true, label: 'Look away.', fn: () => { note('Senka rubbed the window clean and did not look at you again.'); afterNoon(); } },
    ], noonFrame());
  },
});
EV('senka_stash', {
  once: true, weight: 3, when: () => S.flags.partner && !S.flags.senkaGone && S.day >= (S.last.senka_frost || 0) + 6,
  setup: () => { S.flags.partner = true; },
  run() {
    show(['Senka sits down beside you and opens his jacket a little, like a man showing a wound. Inside, in a sock, four hundred grams of bread, gone hard as wood. He points at it, and at you, and at himself, and holds up three fingers: three days.'], [
      { id: 'yes', label: 'Nod again.', fn: () => {
        S.flags.senkaBread = true;
        note('Senka\'s bread counts for both of you: three hundred grams toward the ice.', true);
        afterNoon();
      } },
    ], noonFrame());
  },
});

// ---------- the urki ----------
EV('urki_stove', {
  cooldown: 20, max: 3, minDay: 6,
  weight: () => S.flags.urki === 'gave' ? 4 : 2,
  when: () => !['tribute', 'paid'].includes(S.flags.urki) && !(S.flags.urki === 'brigade' && S.brigade >= 10),
  run() {
    const loot = S.tobacco > 0 ? 'tobacco' : S.bread > 0 ? 'bread' : 'jacket';
    show([
      'Vaska Kosoi, who has a squint and eleven years for something nobody asks about, sits down next to you by the fire. Two of his friends sit down on the other side. They are the kind of men the camp is run for.',
      '"Nice jacket," Vaska says. "Warm, is it? Take it off. I want to see if it is warm."',
    ], [
      { id: 'give', label: loot === 'tobacco' ? 'Give him your tobacco instead.' : loot === 'bread' ? 'Give him your bread instead.' : 'Give him the jacket.', fn: () => {
        if (loot === 'tobacco') { S.tobacco = 0; note('Vaska took the tobacco and left you the jacket. Among the urki, that is called kindness.'); }
        else if (loot === 'bread') { S.stats.lost += S.bread; S.bread = 0; note('Vaska took the bread and left you the jacket.', true); }
        else { S.until.nojacket = S.day + 4; note('You worked the afternoon in your shirt and a sack. Someone will find you another jacket in a few days. Someone always dies.', true); }
        afterNoon();
      } },
      { id: 'fight', label: 'Hit him first.', hint: 'you will lose; the question is what else', fn: () => {
        adj(-14); brig(10); eye(5); S.flags.urkiGrudge = S.day;
        note('The brigade saw you hit Vaska Kosoi. So did the urki.', true);
        show(['You hit him once, well, and then the three of them hit you for a while. Nobody stops it, and then Pasha stops it, which is not the same thing.', '"I\'ll remember you," Vaska says, wiping his mouth.'], onward(), { sfx: 'fight', voice: 'vaska_remember' });
      } },
      { id: 'pasha', label: 'Look at Pasha.', hint: S.brigade >= 20 ? 'the brigade might stand with you' : 'you have not earned that yet', fn: () => {
        if (S.brigade >= 20) {
          brig(3);
          mercy('The brigade stood up for you.');
          show(['Pasha stands up. Then the brigade stands up, one at a time, without hurrying. Vaska looks at them, laughs, and goes back to his own side of the fire.'], onward());
        } else {
          S.tobacco = 0; S.until.nojacket = S.day + 4;
          note('Pasha looked at the fire. Vaska took the jacket and the tobacco both.', true);
          afterNoon();
        }
      } },
    ], { ...noonFrame(), voice: 'vaska_jacket' });
  },
});
EV('urki_grudge', {
  once: true, force: () => S.flags.urkiGrudge && S.day >= S.flags.urkiGrudge + 5 && chance(.25),
  setup: () => { S.flags.urkiGrudge = S.day - 5; },
  run() {
    const had = S.bread > 0 && !S.flags.baptist;
    if (had) { S.stats.lost += S.bread; S.bread = 0; }
    remember(had ? 'The urki cut your lining open for the bread.' : 'The urki cut your lining open and found nothing.', true);
    show([had
      ? 'At noon you find the lining of your jacket cut open, neatly, from the inside, while you slept. The bread is gone. Vaska Kosoi, across the fire, is eating something.'
      : 'At noon you find the lining of your jacket cut open, neatly, from the inside, while you slept. There was nothing in it. Somebody wasted a good knife on you, and that will be remembered too.',
    ], onward(), noonFrame());
  },
});
// ---------- the boots, afterwards (the third night: arrival.js) ----------
// tribute: Vaska's man comes for his share every ten days, until you stop paying
EV('urki_tribute', {
  force: () => S.flags.urki === 'tribute' && S.day >= (S.flags.tributeDay || 0) + 10,
  setup: () => { S.flags.urki = 'tribute'; S.flags.tributeDay = S.day - 10; },
  run() {
    S.flags.tributeDay = S.day;
    show([
      'Vaska\'s man finds you at the noon fire, the young one with the burnt hand. He does not say anything. He holds the hand out.',
      S.bread >= 150 ? 'A hundred and fifty grams. He knows where you keep it. Everyone knows where everyone keeps it.' : 'You have nothing kept. He will take your noon soup instead, and look at you while you watch him eat it.',
    ], [
      { id: 'pay', def: true, label: 'Pay.', hint: 'the boots stay on your feet', fn: () => {
        if (S.bread >= 150) { S.bread -= 150; S.stats.lost += 150; } else adj(-5);
        S.stats.tribute = (S.stats.tribute || 0) + 150;
        note('Vaska\'s share. Paid up for another week or so.');
        afterNoon();
      } },
      { id: 'stop', label: 'Shake your head.', hint: 'nobody stops paying Vaska Kosoi for nothing', fn: () => {
        S.flags.urki = 'fought'; S.flags.urkiGrudge = S.day; brig(4);
        remember('You stopped paying Vaska.', true);
        show(['The young one looks at you for a moment, puzzled, as if a dog had spoken. Then he goes back across the fire and says something to Vaska, and Vaska looks at you over the flames and nods, slowly, like a man agreeing a price.'], onward());
      } },
    ], { ...noonFrame(), urki: 'tribute' });
  },
});
// the men who pay: Vaska trusts them, and sells them steel
EV('vaska_fence', {
  once: true, minDay: 18, weight: 3, when: () => ['tribute', 'paid'].includes(S.flags.urki) && !S.flags.blade,
  setup: () => { S.flags.urki = 'paid'; S.bread = 300; },
  run() {
    const can = S.bread >= 300;
    show([
      'Vaska Kosoi sits down beside you at the noon fire like an old friend, and gives you the end of his cigarette, which nobody refuses.',
      '"A man who pays is a man I can trust," he says. "And you look at the fence the way I look at a purse. I have fifteen centimetres of steel. Three hundred grams, and you never saw me."',
    ], [
      { id: 'no', def: true, label: '"I don\'t think about fences."', fn: () => { note('"Nobody does," Vaska said, and laughed.'); afterNoon(); } },
      can ? { id: 'pay', label: 'Pay him three hundred grams.', hint: 'the wire needs a blade', fn: () => {
        S.bread -= 300; S.flags.blade = true; S.flags.bladeDay = S.day; eye(3);
        note('Vaska\'s steel is in your boot. You walk differently. You must stop walking differently.', true);
        afterNoon();
      } } : { id: 'cant', label: `You have ${S.bread} g. Say so.`, fn: () => { note('"Come back when you have it," Vaska said. "I am patient. So is the fence."', true); afterNoon(); } },
    ], { ...noonFrame(), voice: 'vaska_fence', urki: 'fence' });
  },
});
// the men who fought, or called the warder: the urki collect
EV('urki_knife', {
  once: true, minDay: 14, weight: 4,
  when: () => ['fought', 'warder'].includes(S.flags.urki) && S.day >= (S.flags.urkiGrudge || 0) + 10,
  setup: () => { S.flags.urki = 'fought'; S.flags.urkiGrudge = S.day - 10; },
  run() {
    const settle = S.flags.rubber
      ? { id: 'settle', label: 'Give him what you have kept.', hint: S.bread ? `${S.bread} g` : 'you have nothing; he will take your soup', fn: () => {
          if (S.bread) { S.stats.lost += S.bread; S.bread = 0; } else adj(-6);
          S.flags.urki = 'gave';
          note('Vaska\'s man took it, and patted your cheek. Your account with the urki is closed. They write such things in their heads, very carefully.', true);
          afterNoon();
        } }
      : { id: 'settle', label: 'Take off the boots. Here, in the snow.', hint: 'he has the rubber ones with him', fn: () => {
          S.flags.urki = 'gave'; S.flags.rubber = true; S.flags.rubberDay = S.day;
          note('You walked back to the zone in Vaska\'s rubbers. Your account with the urki is closed.', true);
          afterNoon();
        } };
    show([
      'At the noon fire the young one with the burnt hand sits down beside you, close, closer than men sit. Something under his jacket touches your side through the quilting, and stays there.',
      S.flags.rubber ? '"Vaska says hello," he says. "He says the rubber boots suit you. He says you still owe him for the trouble."'
        : '"Vaska says hello," he says. "He says it is cold for the time of year. A man could lose his boots in this cold."',
    ], [
      { id: 'still', def: true, label: 'Sit still.', hint: S.brigade >= 20 ? 'the brigade is at the fire' : 'the brigade is at the fire; it owes you nothing', fn: () => {
        if (S.brigade >= 20) {
          brig(3); S.flags.urki = 'brigade';
          mercy('The brigade stood up for you.');
          return show(['Across the fire Pasha stands up, and then the brigade stands up, one man at a time, without hurrying. The young one looks at them, and smiles, and is gone.'], onward());
        }
        adj(-20); S.until.infirmary = S.day + 3;
        remember('Vaska\'s man put a knife in you at the noon fire.', true);
        const paras = ['Nobody stands up. The knife goes in once, not deep, between two ribs, the way a man signs his name. Then he is gone, and you are looking at the snow going red under you, and somebody is shouting for the medic, and it is you.'];
        if (!S.flags.rubber) { S.flags.rubber = true; S.flags.rubberDay = S.day; paras.push('When you come back from the infirmary your boots are on Vaska\'s feet, and the rubber ones are on your bunk.'); }
        S.flags.urki = 'gave';
        show(paras, onward(), { sfx: 'fight' });
      } },
      settle,
    ], { ...noonFrame(), urki: 'knife' });
  },
});
// Pasha's protection lasts while the brigade thinks well of you
EV('urki_return', {
  once: true, force: () => S.flags.urki === 'brigade' && !S.flags.rubber && S.brigade < -10,
  setup: () => { S.flags.urki = 'brigade'; S.brigade = -20; },
  run() {
    loseBoots('gave');
    remember('Pasha did not stand up this time. Vaska has your boots.', true);
    show([
      'Vaska Kosoi sits down beside you at the noon fire as if he had never got up. "Pasha is not looking at you any more," he says. "I notice these things."',
      'He is right. Pasha is looking at the fire. Vaska\'s friend has the rubber boots with him, the same ones, as if they had been waiting for you all this time.',
    ], [{ id: 'give', label: 'Take them off.', fn: afterNoon }], noonFrame());
  },
});
// the rubber boots in a hard frost
EV('frostbite', {
  once: true, weight: 5, site: true, when: () => S.flags.rubber && S.temp <= -36,
  setup: () => { S.flags.rubber = true; S.temp = -40; },
  run() {
    show(['At noon you notice that two toes on your left foot stopped hurting an hour ago. In the rubber boots the cold does not knock. It comes in and sits down.'], [
      { id: 'work', def: true, label: 'Work on. Do not look.', fn: () => {
        adj(-10); S.flags.toes = true;
        note('Two toes went white, and then grey. They are still yours, for now. You walk differently.', true);
        afterNoon();
      } },
      { id: 'rub', label: 'Boot off by the fire. Rub them till they burn.', hint: 'the foreman sees a man sitting down', fn: () => {
        adj(-3); brig(-4);
        note('The toes came back, screaming. The foreman wrote down a man sitting by the fire.');
        afterNoon();
      } },
    ], { frame: siteFrame(null), amb: 'amb_site' });
  },
});
// Nina's roubles, if they got through the gate and Vaska did not get them
EV('free_driver', {
  once: true, minDay: 5, weight: 2, site: true, when: () => S.flags.money,
  setup: () => { S.flags.money = true; },
  run() {
    show(['A free driver brings cement to the site: a man in a sheepskin with no number on it, who goes home at night. While they unload he stands by his lorry, smoking, and says to nobody that he has makhorka, for money.'], [
      { id: 'keep', def: true, label: 'Keep Nina\'s roubles in the boot.', fn: afterNoon },
      { id: 'pay', label: 'Buy tobacco with them.', hint: 'twenty-five roubles; tobacco is the camp\'s money', fn: () => {
        S.flags.money = false; tob(3);
        mercy('Three pinches of makhorka, from a free man.', 0);
        note('Three pinches, in a twist of newspaper. The driver did not look at your face, which was a courtesy.');
        afterNoon();
      } },
    ], { frame: siteFrame(null), amb: 'amb_site' });
  },
});

EV('cards', {
  cooldown: 14, max: 3, weight: 1, minDay: 7, when: () => S.tobacco >= 1,
  run() {
    show(['The urki are playing cards on a jacket spread on the snow: cards cut from a cement sack and painted with burnt sugar. Vaska deals. "A pinch to sit down," he says. "Two if you win."'], [
      { id: 'play', label: 'Stake a pinch.', hint: 'they cheat; the question is how much', fn: () => {
        if (chance(.38)) { tob(2); note('You won two pinches, which worries you more than losing would have.'); mercy('Won at cards, against the urki.', 0); }
        else { tob(-1); note('You lost the pinch. Vaska was very sorry about it.'); }
        afterNoon();
      } },
      { id: 'watch', def: true, label: 'Watch, and keep your tobacco.', fn: afterNoon },
    ], noonFrame());
  },
});

// ---------- the brigade gives back ----------
EV('brigade_help', {
  cooldown: 12, max: 3, force: () => S.strength < 25 && S.brigade >= 20 && S.day - (S.last.brigade_help || -99) >= 12,
  setup: () => { S.strength = 20; S.brigade = 30; },
  run() {
    const who = S.kuzma.here && chance(.5) ? 'Kuzma' : 'Pasha';
    adj(10); S.today.inside = S.today.inside || false;
    mercy(who === 'Pasha' ? 'Pasha\'s bread, put by your bowl.' : 'Kuzma\'s bread, and his story with it.');
    show(who === 'Pasha'
      ? ['At the noon break Pasha sits down by you and puts a piece of bread by your bowl: two hundred grams, from his own. He does not look at you while he does it, and he does not say anything, and when you try to say something he gets up and goes.',
         'Later you understand that the brigade has decided you are worth keeping. It is the first thing in weeks that has made you want to weep.']
      : ['Kuzma sits down by you at the noon fire with his bread in his hand, breaks it, and gives you the larger half. "I am old," he says. "Old men do not need so much. Besides, you are thin, and thin men are bad luck in a brigade."',
         'He tells you about the priest and the tax collector while you eat, so that you do not have to say anything.'],
      onward(), { ...noonFrame(), voice: null });
  },
});

// ---------- other people ----------
EV('baptist', {
  once: true, minDay: 10, weight: 2,
  run() {
    show([
      'Alyoshka the Baptist works beside you, and prays while he works, under his breath, the way other men swear.',
      '"They will take the bread off you at the gate one day," he says. "Give it to me. I keep mine under the boards by my bunk. God sees it, and so do the rats, but the rats are lazier than the warders."',
    ], [
      { id: 'trust', label: 'Let him keep your bread.', hint: 'safe from the searches on your body', fn: () => {
        S.flags.baptist = true;
        note('Your bread lives under Alyoshka\'s boards now. The searches at the gate will find nothing on you.', true);
        afterNoon();
      } },
      { id: 'keep', def: true, label: 'Keep it on you.', fn: () => { note('Alyoshka shrugged and went back to praying.'); afterNoon(); } },
    ], { ...noonFrame(), voice: 'alyosha_keep' });
  },
});
EV('blade_trade', {
  cooldown: 16, max: 3, weight: 2, minDay: 15, when: () => !S.flags.blade,
  run() {
    const can = S.tobacco >= 3;
    show([
      'The blacksmith\'s man finds you at the noon fire. He has a way of standing next to people as if he had always been there.',
      '"I hear you are a man who thinks about fences," he says. "I have fifteen centimetres of good steel. Three pinches of tobacco. Not two. Three."',
    ], [
      can ? { id: 'pay', label: 'Pay him three.', hint: 'the wire needs a blade', fn: () => {
        tob(-3); S.flags.blade = true; S.flags.bladeDay = S.day; eye(5);
        note('The blade is in your boot. You walk differently. You must stop walking differently.', true);
        afterNoon();
      } } : { id: 'cant', label: `You have ${numberWord(S.tobacco)}. Say so.`, fn: () => {
        note('"Come back when you have three," he said. Mending boots pays in tobacco, if the thread holds.', true);
        afterNoon();
      } },
      { id: 'no', label: '"I don\'t think about fences."', fn: () => { note('"Nobody does," he said, and was gone.'); afterNoon(); } },
    ], { ...noonFrame(), voice: 'smith_three' });
  },
});
EV('medic_orderly', {
  cooldown: 16, max: 4, weight: () => S.strength < 40 ? 4 : 1, when: () => S.strength < 55 && !S.until.infirmary,
  run() {
    const can = S.tobacco >= 2;
    show(['Somebody in the second brigade knows somebody: the medic is short an orderly. Three days washing floors in the infirmary, in the warm. The man who arranges these things wants two pinches of tobacco.'], [
      can ? { id: 'pay', label: 'Pay him two.', hint: 'three warm days, and soup', fn: () => {
        tob(-2); S.until.infirmary = S.day + 3;
        note('Three days of floors, starting tomorrow.', true);
        afterNoon();
      } } : { id: 'cant', label: `He wants two. You have ${numberWord(S.tobacco)}.`, fn: () => { note('Two pinches. You will remember the price.'); afterNoon(); } },
      { id: 'no', label: 'Keep your tobacco.', fn: afterNoon },
    ], noonFrame());
  },
});
