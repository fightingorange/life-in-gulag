'use strict';
// Frames that are written into the game but not drawn yet show a stand-in until they are.
// When a new frame arrives in assets/frames/, it takes over automatically.
const ASSETS = {
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
