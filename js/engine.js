'use strict';
// The engine: state, the calendar, the flow of screens, and days that run on their own.
// Content calls show(), note(), cue() and the small helpers below. It never touches the page:
// the page (or a test harness) sets RENDER and receives finished screens.

const SENTENCE = 3653;          // ten years, three of them leap
const NUMBER = 'Ю-81';
const ICE_OUT_DAY = 138;        // 20 May 1951: the river breaks up
const THAW_DAY = 123;           // 5 May: the ice goes bad
const RUN_CAP = 10;             // the longest stretch the days run on their own

let S = null;                   // the prisoner and the camp
let RENDER = null;              // RENDER(screen), set by the page or a harness
let STORE = null;               // { load, save, clear }, set by the page

function newState() {
  return {
    v: 2,
    day: 1, strength: 62, bread: 0, tobacco: 1, brigade: 0, eye: 0, extra: 0,
    temp: -30, dead: false, ended: null,
    flags: {}, seen: {}, last: {}, count: {}, until: {},
    lev: { alive: true, health: 66, helped: 0, refused: 0, diedOn: null },
    kuzma: { here: true, helped: false, coughDay: 0, diedOn: null },
    habits: { morning: 'up', bread: 'eat', work: 'proper', dinner: 'bowl', night: 'sleep' },
    stats: { breadGiven: 0, cells: 0, lost: 0, bowls: 0, mended: 0 },
    today: null,
    history: [],
    lastEventDay: 0,
  };
}

// ---------- calendar ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dateOf(day) { return new Date(Date.UTC(1951, 0, 2 + day)); }          // day 1 = 3 January 1951
function fmtDate(day) { const d = dateOf(day); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; }
function monthOf(day) { return dateOf(day).getUTCMonth(); }
// [coldest, mildest] by month, January to May
const TEMPS = [[-46, -24], [-42, -20], [-34, -12], [-22, -4], [-8, 4]];
function rollTemp(day) {
  if (S.until.snap) return -(42 + rnd(8));
  const [lo, hi] = TEMPS[Math.min(4, monthOf(day))];
  return Math.round(lo + RNG() * (hi - lo));
}
function tempWords(t = S.temp) { return t < 0 ? `Minus ${-t}` : t === 0 ? 'Zero' : `Plus ${t}`; }
function tempShort(t = S.temp) { return t < 0 ? `−${-t}°` : t > 0 ? `+${t}°` : '0°'; }

// ---------- words for numbers ----------
const BODY_WORDS = [[70, 'steady'], [45, 'tired'], [25, 'thin'], [10, 'going'], [-1, 'nearly gone']];
const BRIGADE_WORDS = [[30, 'one of us'], [10, 'useful'], [-10, 'nobody'], [-30, 'watched'], [-999, 'marked']];
const EYE_WORDS = [[70, 'marked down'], [45, 'on the list'], [20, 'noted'], [-1, 'unnoticed']];
const LEV_WORDS = [[60, 'holding'], [35, 'thin'], [15, 'failing'], [-999, 'nearly gone']];
const wordFor = (table, v) => { for (const [min, w] of table) if (v > min) return w; return table[table.length - 1][1]; };
const bodyWord = (v = S.strength) => wordFor(BODY_WORDS, v);
const brigadeWord = (v = S.brigade) => wordFor(BRIGADE_WORDS, v);
const eyeWord = (v = S.eye) => wordFor(EYE_WORDS, v);
const levWord = (v = S.lev.health) => wordFor(LEV_WORDS, v);

// ---------- state helpers ----------
function adj(d) { S.strength = clamp(Math.round(S.strength + d), 0, 100); if (S.strength <= 0) S.dead = true; }
function tob(d) { S.tobacco = Math.max(0, S.tobacco + d); if (d > 0 && S.today) S.today.tobaccoGain = true; }
function eye(d) { S.eye = clamp(S.eye + d, 0, 100); }
function brig(d) { S.brigade = clamp(S.brigade + d, -100, 100); }
function go(fn) { if (S.dead && !S.ended) return die(); fn(); }

// ---------- the flow of screens ----------
// show() builds a screen. Normally it goes to RENDER. While the days are running on their own,
// a routine screen is answered by habit instead, and the next step is queued for drive().
// FLOW.story: the screens being shown belong to the story (an event, a beat, the opening, an ending),
// so the page holds their choices until the dialogue has been heard.
const FLOW = { auto: null, stop: null, pending: null, inline: [], cues: [], screen: null, story: false };

// A line of consequence: shown at the top of the next screen, and kept for the night's account.
function note(text, major) {
  if (S.today) S.today.notes.push({ t: text, major: !!major });
  FLOW.inline.push(text);
}
// A small mercy: something good that happened today. The night's account lists them, they decide
// whether it was a good day, and the camp record remembers the best day of the winter.
function mercy(text, gain = 0) {
  if (!S.today || !text || S.today.mercies.includes(text)) return;
  S.today.mercies.push(text);
  S.stats.mercies = (S.stats.mercies || 0) + 1;
  if (gain) adj(gain);
}
// The same, for the night's account only, when the screen already says it.
function remember(text, major) { if (S.today) S.today.notes.push({ t: text, major: !!major }); }
// A sound to play with the next screen.
function cue(name) { FLOW.cues.push(name); }

// screen options (o): frame, amb, sfx, voice, routine (true | habit key), title, ending,
// ledger, plan, record. Choices: { label, fn, id?, hint?, habit? }.
function show(paras, choices, o = {}) {
  if (o.story === undefined && FLOW.story && !o.routine) o.story = true;
  const scr = { paras, choices, o, day: S ? S.day : 0 };
  if (FLOW.auto) {
    const ch = autoChoice(scr);
    if (ch) { FLOW.inline.length = 0; FLOW.cues.length = 0; FLOW.pending = ch.fn; return; }
    scr.run = endRun();
  }
  scr.notes = FLOW.inline.splice(0);
  if (o.ledger) scr.notes = scr.notes.filter(n => !o.ledger.lines.includes(n));   // the account already says it
  scr.cues = FLOW.cues.splice(0);
  FLOW.screen = scr;
  if (RENDER) RENDER(scr);
}
function autoChoice(scr) {
  const r = scr.o.routine;
  if (!r || FLOW.stop !== null || S.dead) return null;
  if (r === true) return scr.choices[0];
  const want = S.habits[r];
  return scr.choices.find(c => c.id === want) || scr.choices.find(c => c.id && c.habit !== false) || scr.choices[0];
}
// The player picked a choice. A routine choice made by hand becomes the habit.
function choose(ch) {
  const scr = FLOW.screen;
  if (scr && typeof scr.o.routine === 'string' && ch.id && ch.habit !== false) S.habits[scr.o.routine] = ch.id;
  drive(ch.fn);
}
function drive(fn) {
  FLOW.pending = fn;
  let guard = 0;
  while (FLOW.pending) {
    const f = FLOW.pending;
    FLOW.pending = null;
    f();
    if (++guard > 20000) { FLOW.auto = null; throw new Error('drive: the days ran away'); }
  }
}

// ---------- days that run on their own ----------
function startRun() { FLOW.auto = { from: S.day + 1, strength: S.strength, bread: S.bread, tobacco: S.tobacco }; FLOW.stop = null; }
function stopRun(reason) { if (FLOW.auto && FLOW.stop === null) FLOW.stop = reason || ''; }
function endRun() {
  const r = FLOW.auto, reason = FLOW.stop;
  FLOW.auto = null; FLOW.stop = null;
  if (!r) return null;
  const days = S.history.filter(h => h.day >= r.from);
  return { days, from: r.from, fromStrength: r.strength, fromBread: r.bread, fromTobacco: r.tobacco, reason };
}
