'use strict';
// Frames that are written into the game but not drawn yet show a stand-in until they are.
// When a new frame arrives in assets/frames/, it takes over automatically.
const ASSETS = {
  // Every place was drawn three times. The game moves between the drawings as the winter goes on;
  // 'selected' is the master in assets/frames/, the others are in assets/frames/web/variants/.
  variants: {"title": {"selected": 1, "all": [1, 2, 3]}, "hut_morning": {"selected": 1, "all": [1, 2, 3]}, "count": {"selected": 3, "all": [1, 2, 3]}, "table": {"selected": 1, "all": [1, 2, 3]}, "site": {"selected": 2, "all": [1, 2, 3]}, "noon": {"selected": 2, "all": [1, 2, 3]}, "gate": {"selected": 1, "all": [1, 2, 3]}, "hut_night": {"selected": 1, "all": [1, 2, 3]}, "cells": {"selected": 1, "all": [1, 2, 3]}, "wire": {"selected": 3, "all": [1, 2, 3]}, "river": {"selected": 2, "all": [1, 2, 3]}, "dead": {"selected": 1, "all": [1, 2, 3]}, "stove": {"selected": 3, "all": [1, 2, 3]}, "letter": {"selected": 3, "all": [1, 2, 3]}, "inspection": {"selected": 4, "all": [4]}, "blizzard": {"selected": 3, "all": [1, 2, 3]}, "office": {"selected": 3, "all": [1, 2, 3]}, "easter": {"selected": 2, "all": [1, 2, 3]}, "ice_out": {"selected": 2, "all": [1, 2, 3]}},
  fixed: ["title", "dead"],   // these always show the master
  every: 1,                     // days before a place is seen from another angle
  // two versions of one picture that differ only in a hand or a door: the page fades slowly between them
  alternate: { supper: 'supper_b' },
  // where the camera looks in each master drawing, when it is not the fire or the lamp (fx.js anchors)
  focus: {
    count: [.5, .62], table: [.45, .42], river: [.31, .42], office: [.62, .38], site: [.25, .56],
    letter: [.47, .5], inspection: [.66, .3], ice_out: [.22, .56], dead: [.42, .62], title: [.42, .5],
    cells: [.5, .55], wire: [.25, .5], gate: [.36, .56],
    reveille: [.42, .4], breakfast_400: [.55, .35], breakfast_550: [.58, .35], breakfast_650: [.55, .35],
    supper: [.48, .36], site_power_1: [.5, .45], site_power_2: [.5, .45], site_power_3: [.5, .45],
    site_timber_1: [.5, .5], site_timber_2: [.55, .55], site_timber_3: [.55, .55],
  },
  // How the camera moves over each picture (frames.js, MOVES). A screen can choose another with o.cam.
  // A frame not listed here uses its stand-in's move, then 'look'.
  //   lean   over the bowl and back: slowly in, hold, slowly straighten (supper, breakfast)
  //   stand  a cold man in a column: almost still, a slight sway, breathing (the count, the gate)
  //   walk   a slow drift forward, a trudging sway (the river, the ice)
  //   look   a slow push towards the subject, a long hold, a slow return (the stove, the lamp, Lev)
  //   work   a slow rhythm of effort, then a rest (the sites)
  //   still  nearly static (the title, the record, letters, the dead)
  cams: {
    title: 'still', dead: 'still', letter: 'still', cells: 'still',
    reveille: 'look', hut_morning: 'look', hut_night: 'look', stove: 'look', blizzard: 'look', easter: 'look',
    office: 'look', noon: 'look', wire: 'look',
    count: 'stand', inspection: 'stand', gate: 'stand',
    table: 'lean', table_nobread: 'lean', supper: 'lean', supper_b: 'lean',
    breakfast_400: 'lean', breakfast_550: 'lean', breakfast_650: 'lean',
    site: 'work',
    river: 'walk', ice_out: 'walk',
  },
  // Picture sequences: while a screen with o.seq is up, the picture cycles through these steps.
  //   frame  the picture (stand-ins work as usual)       hold  seconds until the next step, fade included
  //   sfx    a sound as the step begins (AUDIO.snd; a missing file is skipped)
  //   fade   seconds of crossfade into this step (default 1.1)
  // If every step resolves to the same picture (none drawn yet), the screen keeps its own frame
  // and only the sounds keep the rhythm.
  sequences: {
    // the evening search at the gate: a man patted down, nobody, "Next!", the next man, arms going up
    gate_search: [
      { frame: 'gate_search', hold: 5 },
      { frame: 'gate_empty', hold: 2.5, sfx: 'ru_gate_next' },
      { frame: 'gate_next', hold: 4, sfx: 'pat_down' },
    ],
  },
  // A frame name may stand for a picture not drawn yet; it shows its stand-in until the file exists.
  // Stand-ins can chain: site_power_3 -> site_power_2 -> site_power_1 -> site.
  fallback: {
    // the third set (prompts/frames.md, set three): pictures chosen by what is happening
    reveille: 'title',                 // the rail struck at reveille; the title print has the rail
    hut_morning_dark: 'hut_morning',   // January and February: dark at reveille, a bulb
    hut_morning_grey: 'hut_morning',   // March: grey light
    hut_morning_sun: 'hut_morning',    // April and May: low sun through the window, long shadows
    breakfast_400: 'breakfast_550', breakfast_550: 'table', breakfast_650: 'breakfast_550',
    supper: 'table_nobread', table_nobread: 'table',
    site_power_1: 'site', site_power_2: 'site_power_1', site_power_3: 'site_power_2',
    site_settlement_1: 'site', site_settlement_2: 'site_settlement_1', site_settlement_3: 'site_settlement_2',
    site_timber_1: 'site', site_timber_2: 'site_timber_1', site_timber_3: 'site_timber_2',
    // the fourth set: the count inside the wire, between the huts
    count_camp: 'count',
    // the second set
    stove: 'hut_night',        // the stove, the urki, the cold snap
    letter: 'hut_morning',     // a letter or a parcel on the bunk
    inspection: 'count',       // the commission from Moscow
    blizzard: 'hut_night',     // a blizzard night, towers blind
    office: 'table',           // Lev in the planning office
    easter: 'hut_night',       // the egg, the stove, Easter night
    ice_out: 'river',          // the river breaking up in May
    // the gate search, a sequence (sequences.gate_search)
    gate_search: 'gate',       // a man being patted down by two warders, arms out
    gate_empty: 'gate',        // the search spot empty for a moment; the column waits
    gate_next: 'gate',         // the next man steps up, arms going up
  },
};
