'use strict';
// Things that happen at noon. Each event is data: when it can happen, how often, and what it shows.
//   once        happens at most once
//   cooldown    days before it can happen again; max: how many times in all
//   minDay      not before this day
//   site        only at a work site, not on days spent inside
//   when()      extra condition
//   force()     happens as soon as it can (consequences of earlier choices)
//   setup()     state that makes it reachable, for the dev panel and tests
//   minor       a small thing: while the days run, it is answered the way you answered it last time
//               (S.habits['ev:' + id], js/engine.js), and the run goes on

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
  const p = S.day <= 1 ? 0 : S.day === 2 ? 1 : since < 2 ? .1 : FLOW.auto ? .2 : .34;   // fewer while the days run
  if (!chance(p)) return null;
  return weighted(EVENTS.filter(e => !e.force && eventOk(e)), e => typeof e.weight === 'function' ? e.weight() : e.weight);
}
function runEvent(e) {
  S.count[e.id] = (S.count[e.id] || 0) + 1;
  S.last[e.id] = S.day;
  S.seen[e.id] = true;
  S.lastEventDay = S.day;
  FLOW.story = true;
  FLOW.event = e;   // show() puts it on the event's first screen
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
  once: true, minDay: 35, weight: 1.5, when: () => S.kuzma.here && !S.flags.betrayed,
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
  minor: true, cooldown: 5, weight: 3, site: true, when: () => S.lev.alive && !S.flags.levOffice,
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
    ], { frame: siteFrame(todaySite()), amb: 'amb_site' });
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
      S.bread += 300; S.flags.map = true; S.flags.levOffice = true;
      mercy('Lev paid you back.', 0);
      S.lev.health = Math.min(100, S.lev.health + 25);
      note('The way: Lev\'s map, folded small in your boot.', true);
      afterNoon();
    } }], { frame: 'office', amb: 'amb_hut', voice: ['lev_repay', 'lev_map'] });
  },
});

// Lev in the planning office: now and then he comes out to the site behind the planning officer,
// and what he has seen on the office table comes with him. The two share a cooldown (S.last.lev_office).
const levOfficeOk = () => S.flags.levOffice && S.lev.alive && S.day - (S.last.lev_office || 0) >= 9;
EV('lev_warn', {
  max: 4, weight: 3, site: true, when: levOfficeOk,
  setup: () => { S.flags.levOffice = true; S.bread = 400; },
  run() {
    S.last.lev_office = S.day;
    S.flags.warnedDay = S.day;
    const can = S.bread > 0 && !S.flags.baptist;   // bread under Alyoshka's boards is not on you to eat
    const ch = [];
    if (can) ch.push({ id: 'eat', def: true, label: `Eat the ${S.bread} g you have kept. Here, at the barrel.`, hint: 'bread in the stomach cannot be stolen', fn: () => {
      adj(S.bread / 40); S.today.ate += S.bread; S.bread = 0;
      note('You ate the kept bread at the barrel, with your back to the wind, in small bites, the way Lev eats.');
      afterNoon();
    } });
    ch.push(can ? { id: 'keep', label: 'Keep it on you.', hint: 'Lubimov opens every lining tonight', fn: afterNoon } : { id: 'keep', label: 'Nod.', fn: afterNoon });
    show([
      'The planning officer comes out to measure the day\'s work, and Lev comes behind him with the tape and the board. While the officer writes, Lev drinks at the water barrel.',
      'He says to the ladle, not to you: "Lubimov and the sergeant are doing the whole column at the gate tonight. Every man, every lining. I saw the paper." Then he hangs the ladle on its nail and goes after the officer.',
    ], ch, { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'lev_warn' });
  },
});
EV('lev_quiet', {
  max: 4, weight: 3, site: true, when: levOfficeOk,
  setup: () => { S.flags.levOffice = true; S.bread = 400; },
  run() {
    S.last.lev_office = S.day;
    S.until.noSearch = S.day;
    mercy('Lubimov has the night off, Lev says.');
    show([
      'The planning officer is measuring again, and Lev holds the end of the tape for him. When the officer walks off to argue with the site foreman, Lev says, without turning round:',
      '"Lubimov has the night off. The gate tonight is two conscripts from Ryazan. They are cold, and they want their supper more than they want your lining."',
    ], onward('Nod.'), { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'lev_quiet' });
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
    ], { frame: siteFrame(todaySite()), amb: 'amb_site', voice: ['pasha_percentage', 'pasha_name'] });
  },
});
EV('wood_stick', {
  minor: true, cooldown: 9, max: 4, weight: 1.5, site: true, when: () => S.temp <= -20,
  run() {
    show(['At the end of the shift Pasha points at the scrap pile by the carpenters\' shed. "One stick each. Whoever carries nothing sits by the door tonight."'], [
      { id: 'carry', label: 'Carry a stick back.', hint: 'the gate may take it, and notice you', fn: () => { S.today.wood = true; afterNoon(); } },
      { id: 'none', def: true, label: 'Carry nothing.', fn: () => { brig(-3); note('You carried nothing. You will sit by the door.'); afterNoon(); } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'pasha_stove' });
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
        S.flags.partner = true; S.flags.metSenka = true;
        note('Senka. He walked out of a German camp in \'43. He does not talk. He draws.', true);
        afterNoon();
      } },
      { id: 'away', def: true, label: 'Look away.', fn: () => { S.flags.metSenka = true; note('Senka rubbed the window clean and did not look at you again.'); afterNoon(); } },
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
  minor: true, force: () => S.flags.urki === 'tribute' && S.day >= (S.flags.tributeDay || 0) + 10,
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
      { id: 'no', def: true, say: 'prisoner_fences', label: '"I don\'t think about fences."', fn: () => { note('"Nobody does," Vaska said, and laughed.'); afterNoon(); } },
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
    ], { ...noonFrame(), urki: 'knife', voice: S.flags.rubber ? 'urka_rubber' : 'urka_hello' });
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
    ], { frame: siteFrame(todaySite()), amb: 'amb_site' });
  },
});
// Nina's roubles, if they got through the gate and Vaska did not get them
EV('free_driver', {
  minor: true, once: true, minDay: 5, weight: 2, site: true, when: () => S.flags.money,
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
    ], { frame: siteFrame(todaySite()), amb: 'amb_site' });
  },
});

EV('cards', {
  minor: true, cooldown: 14, max: 3, weight: 1, minDay: 7, when: () => S.tobacco >= 1,
  run() {
    show(['The urki are playing cards on a jacket spread on the snow: cards cut from a cement sack and painted with burnt sugar. Vaska deals. "A pinch to sit down," he says. "Two if you win."'], [
      { id: 'play', label: 'Stake a pinch.', hint: 'they cheat; the question is how much', fn: () => {
        if (chance(.38)) { tob(2); note('You won two pinches, which worries you more than losing would have.'); mercy('Won at cards, against the urki.', 0); }
        else { tob(-1); note('You lost the pinch. Vaska was very sorry about it.'); }
        afterNoon();
      } },
      { id: 'watch', def: true, label: 'Watch, and keep your tobacco.', fn: afterNoon },
    ], { ...noonFrame(), voice: 'vaska_pinch' });
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
  once: true, minDay: 5, weight: 4,
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
  minor: true, cooldown: 16, max: 3, weight: 2, minDay: 15, when: () => !S.flags.blade,
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
      { id: 'no', say: 'prisoner_fences', label: '"I don\'t think about fences."', fn: () => { note('"Nobody does," he said, and was gone.'); afterNoon(); } },
    ], { ...noonFrame(), voice: 'smith_three' });
  },
});
EV('medic_orderly', {
  minor: true, cooldown: 16, max: 4, weight: () => S.strength < 40 ? 4 : 1, when: () => S.strength < 55 && !S.until.infirmary,
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

// ---------- the bathhouse ----------
// Every three weeks or so: the one hot thing in the camp. Five clean days afterwards (S.until.clean).
EV('banya', {
  cooldown: 20, max: 5, weight: 2, minDay: 8, site: true,
  run() {
    const clean = () => { S.until.clean = S.day + 5; };
    const BANYA = { frame: 'banya', amb: 'amb_hut', scape: 'banya' };
    show([
      'At the noon break Pasha stands up with his bowl and says it to the brigade the way he says everything, once: "Bathhouse tonight. The brigade after the fourth. Whoever is not clean by the count tomorrow is not in my brigade."',
      'The bathhouse is one boiler of hot water for forty men, and the first ten get it hot.',
    ], [
      { id: 'old', def: true, label: 'Let the old men go first.', hint: 'warm water, by the time it is yours', fn: () => {
        brig(4); cost(2, 'the bathhouse'); clean();
        mercy('The bathhouse, what was left of the hot.');
        show(['By the time it is your turn the water is warm, not hot, and grey. You wash anyway, all of you, with the lye soap that takes the skin, and the clothes go into the boiler with the lice in them and come out with the lice dead. For five days you will not scratch.'],
          onward(), BANYA);
      } },
      { id: 'first', label: 'Push to the front. Get the hot water.', hint: 'hot, and remembered', fn: () => {
        brig(-4); cost(5, 'the bathhouse'); clean();
        mercy('Hot water, first.');
        show(['Hot. Hot enough to hurt. You pour it over your head with the tin and stand in it and are, for a minute, a man in a bathhouse and nothing else. Behind you the queue watches the water go grey. In the morning Pasha looks at you a moment longer than usual.'],
          onward(), BANYA);
      } },
      { id: 'sell', label: 'Sell your turn to Vaska\'s man for a pinch.', hint: 'tobacco; the lice stay', fn: () => {
        tob(1);
        note('You sold your turn at the bathhouse. The lice kept theirs.');
        show(['Vaska\'s man takes your place in the queue and gives you the pinch without looking at you, the way money changes hands at a station. You sit on your bunk and scratch, and smoke, and it is nearly worth it.'],
          onward(), { frame: 'hut_night', amb: 'amb_hut', voice: 'vaska_turn' });
      } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'pasha_banya' });
  },
});

// ---------- Senka names a date ----------
// April, if he is still with you: the first of May, before the ice goes bad. The wire screen says so
// every night until then (escape.js); if you have not gone, he goes without you (calendar.js, senka_goes).
EV('senka_date', {
  once: true, minDay: 96, weight: 4, site: true,
  when: () => S.flags.partner && !S.flags.senkaGone && !S.flags.tried && !S.flags.senkaDate,
  setup: () => { S.flags.partner = true; S.day = Math.max(S.day, 96); },
  run() {
    const date = () => { S.flags.senkaDate = 119; };
    show([
      'At the noon break Senka squats by the lean-to, where the snow has gone to mud, and draws with a nail the way he drew on the frost: the river, the bend, the cross. Then, beside it, four marks: 1. V.',
      'The first of May. Before the ice goes bad. He looks at you, and holds up two fingers, and then one, and rubs the two out with his thumb.',
    ], [
      { id: 'away', def: true, label: 'Look at the mud until he rubs it out.', fn: () => {
        date();
        note('Senka rubbed the river out with his boot. He goes on the first of May, whether you nodded or not.', true);
        afterNoon();
      } },
      { id: 'nod', label: 'Nod.', hint: 'the first of May, together', fn: () => {
        date();
        note('Senka goes on the first of May. With you, or without you.', true);
        afterNoon();
      } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site' });
  },
});

// ---------- Pasha and the brigade ----------
// The brigade's regard is a number (S.brigade); these give it a story. Below −20 you are moved to the
// bunk by the door (S.flags.door: the cold costs more, the ladle reaches you last) until the brigade
// forgives you. Above 30, once you have put your name on the sheet, Pasha hands you the board and the
// tape (S.flags.measurer), and the brigade's percentage is yours to write.
EV('brigade_door', {
  force: () => !S.flags.door && S.brigade <= -20 && S.day >= 4,
  setup: () => { S.brigade = -25; },
  run() {
    S.flags.door = true; S.flags.doorDay = S.day;
    remember('Pasha moved you to the bunk by the door.', true);
    show([
      'At noon Pasha says your name, and points with his chin at the hut, and says the rest: "By the door. Until I say." That is all. The man who had the bunk by the door is already moving his things to yours.',
      'The bunk by the door is the one the cold comes in over, every time the door opens, which is all night. It is where a brigade keeps the man it has not decided about, or has.',
    ], onward('Say nothing.'), { ...noonFrame(), voice: 'pasha_door' });
  },
});
EV('brigade_door_back', {
  force: () => S.flags.door && S.brigade >= 0 && S.day >= (S.flags.doorDay || 0) + 4,
  setup: () => { S.flags.door = true; S.flags.doorDay = S.day - 4; S.brigade = 5; },
  run() {
    S.flags.door = false;
    mercy('Your old bunk back, away from the door.');
    remember('Pasha moved you back from the door.', true);
    show([
      'At noon Pasha stops by you with his bowl and does not sit down. "Bring your things. Your place is here." He has already walked on by the time you understand it.',
      'The man by the door does not look up when you take your blanket back. He knows where he is going.',
    ], onward(), { ...noonFrame(), voice: 'pasha_back' });
  },
});
EV('pasha_board', {
  once: true, minDay: 25, weight: 3, site: true,
  when: () => S.brigade >= 30 && S.seen.tufta && !S.flags.measurer && !S.flags.door,
  setup: () => { S.brigade = 35; S.seen.tufta = true; },
  run() {
    show([
      'At the end of the shift Pasha holds out the board and the tape, the way he holds out everything: as if it were already yours and he were only reminding you.',
      '"You can count," he says. "Count." The brigade\'s percentage is written on that board every evening, and the brigade eats on the percentage.',
    ], [
      { id: 'back', def: true, say: 'prisoner_cantcount', label: 'Hand it back. "I can\'t count."', hint: 'the brigade will remember who would not', fn: () => {
        brig(-6);
        note('You handed Pasha the board back. He took it without a word, which was the word.', true);
        afterNoon();
      } },
      { id: 'take', label: 'Take the board.', hint: 'the brigade eats on your arithmetic; so does the inspector', fn: () => {
        S.flags.measurer = true; brig(4);
        note('The board and the tape are yours. Every evening the brigade\'s bread is a number you write.', true);
        afterNoon();
      } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'pasha_count' });
  },
});
EV('measure', {
  minor: true, cooldown: 8, max: 6, weight: 3, site: true, when: () => S.flags.measurer,
  setup: () => { S.flags.measurer = true; },
  run() {
    S.stats.measured = (S.stats.measured || 0) + 1;
    const what = todaySite() && todaySite().key === 'power' ? 'the wall' : todaySite() && todaySite().key === 'timber' ? 'the stack' : 'the pits';
    show([
      `At the end of the shift you measure ${what} with the tape, and do the sum on the board with the stub of pencil, and it comes to sixty. Sixty is four hundred grams tomorrow, for forty men.`,
      'Pasha is standing where he can see the board and not see it, which is a skill.',
    ], [
      { id: 'honest', def: true, label: 'Write sixty.', hint: 'four hundred grams tomorrow; nobody can be put in the cells for sixty', fn: () => {
        S.flags.cutBread = true; brig(-6);
        note('You wrote sixty. The brigade will eat four hundred grams on your arithmetic, and will know whose it was.', true);
        afterNoon();
      } },
      { id: 'tufta', label: 'Write a hundred and twenty.', hint: 'six hundred and fifty grams for two days; your name on the sheet', fn: () => {
        S.stats.tufta = (S.stats.tufta || 0) + 1;
        S.until.bonus = S.day + 2; brig(8);
        if (chance(.2)) {
          S.flags.measurer = false;
          S.flags.pendingCells = true; S.flags.cellsWhy = 'The inspector measured the wall himself, with his own tape, and the board said a hundred and twenty. Three days. They give you one of them now and owe you the others. Pasha has the board again.';
          note('A hundred and twenty, in your hand, on the sheet. The inspector has a tape of his own.', true);
        } else note('A hundred and twenty. Six hundred and fifty grams for two days, for forty men, on a number you made up. Nobody in the brigade thanks you. All of them know.', true);
        afterNoon();
      } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site' });
  },
});
EV('pasha_letter', {
  cooldown: 6, max: 2, weight: 2, minDay: 20,
  when: () => S.brigade >= 10 && !S.flags.pashaLetter && !S.flags.door,
  setup: () => { S.brigade = 15; },
  run() {
    show([
      'At noon Pasha sits down beside you with a sheet of paper and a stub of pencil, and does not look at you. "You write. I\'ll say." He says it the way he says the norm.',
      'A daughter in Vologda, sixteen, at the technical school. He wants her told that the camp is a timber works and he is the foreman of it, which is true, and that he is well, which is the usual lie. He does not say the word camp once.',
      ...(S.flags.spoke ? ['At the end he says, "Put that there is a man in my brigade who told Moscow the truth." Then: "No. Don\'t put that." You put it anyway, and he reads it, and lets it stand.'] : []),
    ], [
      { id: 'later', def: true, label: 'Tell him there is no light to write by. Tomorrow.', fn: () => {
        note('Pasha put the paper back inside his jacket. He did not ask again that day.');
        afterNoon();
      } },
      { id: 'write', label: 'Write it.', hint: 'in your hand, in his words', fn: () => {
        S.flags.pashaLetter = S.day; brig(8);
        mercy('Pasha\'s letter to Vologda, in your handwriting.');
        note('You wrote Pasha\'s letter, every word his, in your hand. He looked at the page a long time, as if your writing were a photograph of him.', true);
        afterNoon();
      } },
    ], { ...noonFrame(), voice: 'pasha_letter' });
  },
});
EV('pasha_reply', {
  once: true, weight: 4,
  when: () => S.flags.pashaLetter && S.day >= S.flags.pashaLetter + 40 && S.brigade >= 0 && !S.flags.door,
  setup: () => { S.flags.pashaLetter = S.day - 40; S.brigade = 15; },
  run() {
    S.flags.pashaReply = true; brig(6);
    mercy('Pasha\'s daughter, at the technical school, in her own hand.');
    show([
      'A letter for Pasha. He cannot read it fast enough and will not let anyone else, so at noon he brings it to you and puts it in your hand and watches your face while you read it to him.',
      'Vologda. The technical school. She writes "foreman" twice, and "when you come home" once. Pasha says, "Again," and you read it again, and then he takes it back and puts it inside his jacket with the other thing he keeps there, which you have never seen.',
    ], onward('Give it back.'), { ...noonFrame(), voice: 'pasha_again' });
  },
});

// ---------- Lubimov, once or twice, as a man ----------
// He is the camp's weather. These do not soften him: he asks what you were, and uses it.
EV('lubimov_what', {
  once: true, minDay: 30, weight: 2, when: () => S.eye >= 20 && !S.today.inside,
  setup: () => { S.eye = 25; },
  run() {
    show([
      'At the noon break Lubimov comes out to the site with the planning officer, which he never does, and stands by the fire with his hands behind his back while the officer measures. Then he stops in front of you.',
      '"What were you," he says. "Before." It is not a question. He has the book under his arm.',
    ], [
      { id: 'nothing', def: true, say: 'prisoner_worker', label: '"Nothing. A worker."', fn: () => {
        eye(3);
        note('"Nothing," Lubimov said, and wrote something, and it was longer than nothing.');
        afterNoon();
      } },
      { id: 'truth', say: 'prisoner_bookkeeper', label: '"The bookkeeper. At the collective farm."', hint: 'a man who can count is a man they can use', fn: () => {
        S.flags.toldLubimov = S.day; eye(2);
        note('"A bookkeeper," Lubimov said, as if tasting it, and wrote it down. He will remember that you can add.', true);
        afterNoon();
      } },
    ], { frame: siteFrame(todaySite()), amb: 'amb_site', voice: 'lubimov_what' });
  },
});
EV('lubimov_sums', {
  once: true, weight: 4, when: () => S.flags.toldLubimov && S.day >= S.flags.toldLubimov + 8 && !S.today.inside,
  setup: () => { S.flags.toldLubimov = S.day - 8; },
  run() {
    show([
      'At noon the orderly comes for you by name: the guardhouse. Lubimov is at the table with the month\'s bread ledger open and a pencil, and the sums do not come out, and the commandant wants them by evening.',
      '"Add these," he says. "Correctly. Then go." An hour at a table, in the warm, with a pencil, and the brigade walking past the window on its way back to the pits.',
    ], [
      { id: 'add', def: true, label: 'Add them. Correctly.', hint: 'an hour in the warm; the brigade sees where you went', fn: () => {
        cost(4, 'the warm'); eye(-8); brig(-4);
        S.flags.lubimovSums = true;
        mercy('An hour at a table, with a pencil.');
        note('The sums came out. Lubimov looked at the page, and at you, and said nothing, which from Lubimov is a receipt.', true);
        afterNoon();
      } },
      { id: 'wrong', label: 'Add them wrong, a little, in the camp\'s favour.', hint: 'four hundred grams a day for a week, for somebody', fn: () => {
        cost(4, 'the warm'); eye(10);
        note('You made the ledger short by two hundred loaves. Somebody will eat them. Lubimov did not check your arithmetic, today.', true);
        afterNoon();
      } },
    ], { frame: 'arrival_processing', amb: 'amb_cells', voice: 'lubimov_sums' });
  },
});
