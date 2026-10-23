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
  // The camera (frames.js, MOVES) is locked: the picture holds still. Only these pictures have a move,
  // played once and then held until the screen changes. A screen can choose another with o.cam.
  // The move belongs to the picture actually shown, so a stand-in stays locked.
  //   lean   one slow lean over the bowl, about seven seconds, then he stays bent over the food
  //   pano   a slow look round a wide (3:1) picture, like turning his head, over about fifty seconds
  //   still  locked (everything not listed)
  cams: {
    table: 'lean', table_nobread: 'lean', supper: 'lean', supper_b: 'lean',
    breakfast_400: 'lean', breakfast_550: 'lean', breakfast_650: 'lean',
    hut_night_pano: 'pano',
  },
  // Picture sequences: while a screen with o.seq is up, the picture goes through these steps.
  //   frame  the picture (stand-ins work as usual)       hold  seconds until the next step, fade included
  //   sfx    a sound as the step begins (AUDIO.snd; a missing file is skipped)
  //   fade   seconds of crossfade into this step (default 1.1)
  //   stay   true: the sequence stops at this step and stays on it (otherwise it loops)
  // If every step resolves to the same picture (none drawn yet), the screen keeps its own frame
  // and only the sounds keep the rhythm.
  sequences: {
    // the evening search at the gate: a man patted down, nobody, "Next!", the next man, arms going up
    gate_search: [
      { frame: 'gate_search', hold: 5 },
      { frame: 'gate_empty', hold: 2.5, sfx: 'ru_gate_next' },
      { frame: 'gate_next', hold: 4, sfx: 'pat_down' },
    ],
    // reveille: the rail is struck while it sounds (the screen's sfx 'rail', about eight seconds of blows
    // before the ring dies), then the man stands with the hammer lowered, and stays so
    reveille: [
      { frame: 'reveille', hold: 7.8 },
      { frame: 'reveille_after', fade: 1.8, stay: true },
    ],
  },
  // Stand-ins that also go round the place's drawings by day, as the place itself would: while the
  // panorama is not drawn, the night hut shows the hut's drawing of the day, with its own light.
  inherit: ['hut_night_pano'],
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
    // the fifth set (prompts/frames.md, set five): the arrival, the hut at its true size, people moving
    arrival_wagon: 'hut_night',        // inside the prison wagon, men on plank shelves, a crack of light
    arrival_railhead: 'river',         // the train stopped in the snow, the convoy and dogs, men climbing down
    arrival_march: 'river',            // the column strung out across white country, guards on both sides
    arrival_march_dusk: 'arrival_march',   // the same march later, the light going, the camp's lights ahead
    arrival_gate: 'gate',              // the gate at night, the new column counted in
    arrival_processing: 'office',      // the guardhouse: a clerk's table, a lamp, a list, a man before it
    arrival_hut: 'hut_night',          // the hut in the evening, new men with bundles, an old hand on his bunk
    hut_night_pano: 'hut_night',       // the hut at its true size, two hundred men, wide, for a slow look round
    reveille_after: 'reveille',        // the rail struck; the man stands with the hammer lowered
    mess_table: 'table',               // the crowded mess table, the new master for breakfast and supper
    // plates: a place with its workers removed, for the moving figures (js/sprites.js). The game shows a
    // plate in place of its picture when it exists; asked for by name, a missing plate shows the picture.
    site_timber_plate_1: 'site_timber_1', site_timber_plate_2: 'site_timber_2', site_timber_plate_3: 'site_timber_3',
    site_settlement_plate_1: 'site_settlement_1', site_settlement_plate_2: 'site_settlement_2', site_settlement_plate_3: 'site_settlement_3',
    site_power_plate_1: 'site_power_1', site_power_plate_2: 'site_power_2', site_power_plate_3: 'site_power_3',
    noon_plate: 'noon',
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
