'use strict';
// The sound of each place, in layers. A scene names its main ambience (amb_*); this adds what plays
// under and around it:
//   beds   looping layers at a given volume (relative to the main ambience), faded in and out
//   spots  one-off sounds dropped in at random intervals [min, max] seconds, placed left or right
// All of them muffle with the body and go silent with the sound switch.
const SCAPES = {
  // the hut at night: snoring (amb_hut), the wind on the walls, the stove
  amb_hut: {
    beds: [['bed_wind_walls', .45], ['bed_stove', .3]],
    spots: [['spot_creak', [6, 16], .45], ['cough', [16, 40], .3], ['spot_gust', [14, 32], .22], ['spot_door_far', [30, 70], .2]],
  },
  // the hut at reveille: men waking (amb_hut_morning), the wind, the bulb
  amb_hut_morning: {
    beds: [['bed_wind_walls', .4], ['bed_bulb', .35]],
    spots: [['spot_creak', [5, 12], .45], ['cough', [8, 22], .35], ['spot_door_far', [14, 36], .3]],
  },
  // outside in the open: the wind (amb_wind), snow hissing, gusts, the camp far off
  amb_wind: {
    beds: [['bed_wind_snow', .5]],
    spots: [['spot_gust', [6, 14], .5], ['spot_shout_far', [14, 34], .3], ['dogs', [28, 60], .25], ['spot_door_far', [20, 45], .2], ['spot_ice_crack', [35, 80], .25]],
  },
  // the column marching and the gate
  amb_march: {
    beds: [['bed_wind_snow', .45]],
    spots: [['spot_shout_far', [8, 20], .4], ['dogs', [12, 28], .3], ['spot_gust', [10, 24], .4]],
  },
  // the work site
  amb_site: {
    beds: [['bed_wind_snow', .4]],
    spots: [['spot_pick', [3, 8], .4], ['spot_shout_far', [10, 25], .35], ['spot_gust', [10, 22], .4], ['spot_crow', [25, 60], .25]],
  },
  // the mess hut: the queue (amb_queue), spoons on tin, the stove; the door letting the cold in
  amb_queue: {
    beds: [['bed_spoons', .55], ['bed_stove', .2]],
    spots: [['spot_door_far', [12, 30], .3], ['cough', [10, 26], .3], ['ladle', [9, 20], .3]],
  },
  // the cells: almost nothing, which is the point
  amb_cells: {
    beds: [['bed_wind_walls', .3]],
    spots: [['drip', [6, 15], .35], ['spot_creak', [22, 45], .25], ['spot_door_far', [30, 60], .2]],
  },
  // a blizzard on the walls
  amb_blizzard: {
    beds: [['bed_wind_walls', .6]],
    spots: [['spot_gust', [3, 8], .55], ['spot_creak', [8, 18], .35]],
  },
  // May: the thaw
  amb_spring: {
    beds: [],
    spots: [['drip', [4, 10], .4], ['spot_ice_crack', [8, 20], .45], ['spot_crow', [12, 30], .3]],
  },
};
