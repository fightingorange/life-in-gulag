'use strict';
// Frames that are written into the game but not drawn yet show a stand-in until they are.
// When a new frame arrives in assets/frames/, it takes over automatically.
const ASSETS = {
  // Every place was drawn three times. The game moves between the drawings as the winter goes on;
  // 'selected' is the master in assets/frames/, the others are in assets/frames/web/variants/.
  variants: {"title": {"selected": 1, "all": [1, 2, 3]}, "hut_morning": {"selected": 1, "all": [1, 2, 3]}, "count": {"selected": 3, "all": [1, 2, 3]}, "table": {"selected": 1, "all": [1, 2, 3]}, "site": {"selected": 2, "all": [1, 2, 3]}, "noon": {"selected": 2, "all": [1, 2, 3]}, "gate": {"selected": 1, "all": [1, 2, 3]}, "hut_night": {"selected": 1, "all": [1, 2, 3]}, "cells": {"selected": 1, "all": [1, 2, 3]}, "wire": {"selected": 3, "all": [1, 2, 3]}, "river": {"selected": 2, "all": [1, 2, 3]}, "dead": {"selected": 1, "all": [1, 2, 3]}, "stove": {"selected": 3, "all": [1, 2, 3]}, "letter": {"selected": 3, "all": [1, 2, 3]}, "inspection": {"selected": 4, "all": [4]}, "blizzard": {"selected": 3, "all": [1, 2, 3]}, "office": {"selected": 3, "all": [1, 2, 3]}, "easter": {"selected": 2, "all": [1, 2, 3]}, "ice_out": {"selected": 2, "all": [1, 2, 3]}},
  fixed: ["title", "dead"],   // these always show the master
  every: 1,                     // days before a place is seen from another angle
  fallback: {
    stove: 'hut_night',        // the stove, the urki, the cold snap
    letter: 'hut_morning',     // a letter or a parcel on the bunk
    inspection: 'count',       // the commission from Moscow
    blizzard: 'hut_night',     // a blizzard night, towers blind
    office: 'table',           // Lev in the planning office
    easter: 'hut_night',       // the egg, the stove, Easter night
    ice_out: 'river',          // the river breaking up in May
  },
};
