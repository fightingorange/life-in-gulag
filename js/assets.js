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
    cells: [.5, .55], wire: [.25, .5],
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
    // the second set
    stove: 'hut_night',        // the stove, the urki, the cold snap
    letter: 'hut_morning',     // a letter or a parcel on the bunk
    inspection: 'count',       // the commission from Moscow
    blizzard: 'hut_night',     // a blizzard night, towers blind
    office: 'table',           // Lev in the planning office
    easter: 'hut_night',       // the egg, the stove, Easter night
    ice_out: 'river',          // the river breaking up in May
  },
};
