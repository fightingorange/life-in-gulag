'use strict';
// The sound of each place, in layers. A scene names its main ambience (amb_*); this adds what plays
// under and around it:
//   beds   looping layers at a given volume (relative to the main ambience), faded in and out
//   spots  one-off sounds dropped in at random intervals [min, max] seconds, placed left or right;
//          a list of files plays one of them each time (the Russian voices: assets/sfx/ru_list.json).
//          Only small sounds of the place belong here. A single event (the man crying, the prayer) is
//          heard once, when the text says so (the s: field in js/content/lines.js); js/audio.js skips
//          any that end up in a list here (ONCE).
// A screen can name its place apart from its ambience (o.scape): the count is outside like noon, but
// only the count has guards shouting the fives.
// All of them muffle with the body and go silent with the sound switch.
const SCAPES = {
  // the hut at night: slow breathing (amb_hut), the wind on the walls, the stove
  amb_hut: {
    beds: [['bed_wind_walls', .45], ['bed_stove', .3]],
    spots: [['spot_creak', [10, 24], .3], ['cough', [20, 45], .25], ['spot_gust', [14, 32], .22], ['spot_door_far', [30, 70], .2]],
  },
  // the hut at reveille: men waking (amb_hut_morning), the wind, the bulb
  amb_hut_morning: {
    beds: [['bed_wind_walls', .4], ['bed_bulb', .35]],
    spots: [['spot_creak', [8, 18], .3], ['cough', [8, 22], .35], ['spot_door_far', [14, 36], .3],
      [['ru_hut_up', 'ru_hut_up2', 'ru_hut_ration', 'ru_hut_brigade'], [4, 10], .4],
      [['ru_hut_mutter', 'ru_hut_minute', 'ru_hut_boots'], [7, 16], .25]],
  },
  // outside in the open: the wind (amb_wind), snow hissing, gusts, the camp far off
  amb_wind: {
    beds: [['bed_wind_snow', .5]],
    spots: [['spot_gust', [6, 14], .5], ['spot_shout_far', [14, 34], .3], ['dogs', [28, 60], .25], ['spot_door_far', [20, 45], .2], ['spot_ice_crack', [35, 80], .25], ['spot_snow_steps', [30, 70], .25]],
  },
  // the morning count, inside the wire: the wind, the guards counting the fives
  count: {
    beds: [['bed_wind_snow', .5]],
    spots: [[['ru_count_form', 'ru_count_hats', 'ru_count_fives', 'ru_count_fives2', 'ru_count_again', 'ru_count_form2'], [4, 10], .45],
      ['spot_gust', [8, 18], .4], ['dogs', [25, 55], .2], ['cough', [10, 24], .25]],
  },
  // the column marching and the gate: the search, the men muttering in the line
  amb_march: {
    beds: [['bed_wind_snow', .45]],
    spots: [['spot_shout_far', [10, 24], .3], ['dogs', [14, 30], .3], ['spot_gust', [10, 24], .4],
      [['ru_gate_hands', 'ru_gate_unbutton', 'ru_gate_pass', 'ru_gate_hands2', 'ru_gate_next2'], [5, 12], .35],
      [['ru_gate_grumble', 'ru_gate_grumble2', 'ru_gate_grumble3'], [9, 20], .22]],
  },
  // the work site
  amb_site: {
    beds: [['bed_wind_snow', .4]],
    spots: [['spot_pick', [3, 8], .4], ['spot_shout_far', [14, 30], .3], ['spot_gust', [10, 22], .4], ['spot_crow', [25, 60], .25],
      [['ru_site_davai', 'ru_site_move', 'ru_site_nostand', 'ru_site_heave', 'ru_site_heave2', 'ru_site_davai2'], [7, 16], .3]],
  },
  // each site its own work (the work screen names 'site_' + the site's key; amb_site is the fallback).
  // A quiet entry is the same work further off: another gang down the wall, across the field, up the bank.
  // the power station: laying bricks on the second storey, the mortar freezing on the trowel
  site_power: {
    beds: [['bed_wind_snow', .4]],
    spots: [['spot_trowel', [3, 8], .4], ['spot_brick', [4, 10], .35], [['spot_trowel', 'spot_brick'], [5, 12], .14],
      ['spot_gust', [10, 22], .4], ['spot_shout_far', [16, 34], .25],
      [['ru_site_davai', 'ru_site_move', 'ru_site_nostand', 'ru_site_davai2', 'ru_site_smoke'], [8, 18], .3]],
  },
  // the settlement: picks and shovels in frozen ground; the carpenters' shed at the edge
  site_settlement: {
    beds: [['bed_wind_snow', .4]],
    spots: [['spot_pick', [3, 7], .4], ['spot_shovel', [4, 10], .35], [['spot_pick', 'spot_shovel'], [5, 12], .14],
      ['spot_saw', [20, 45], .12], ['spot_gust', [10, 22], .4], ['spot_crow', [25, 60], .25],
      [['ru_site_davai', 'ru_site_move', 'ru_site_nostand', 'ru_site_davai2', 'ru_site_smoke'], [7, 16], .3]],
  },
  // the river bank: logs hauled up to the sledge, axes and a two-man saw, the frozen river below
  site_timber: {
    beds: [['bed_wind_snow', .4]],
    spots: [['log_drag', [10, 22], .35], ['spot_axe', [5, 12], .35], ['spot_axe', [8, 18], .14], ['spot_saw', [10, 24], .3],
      ['spot_gust', [10, 22], .35], ['spot_ice_crack', [40, 90], .2],
      [['ru_site_heave', 'ru_site_heave2', 'ru_site_davai2'], [6, 14], .3],
      [['ru_site_davai', 'ru_site_move', 'ru_site_nostand', 'ru_site_smoke'], [14, 30], .25]],
  },
  // arrival: inside the goods wagon on the move (amb_train): a plank creaking, a man coughing, the wind at the boards
  amb_train: {
    beds: [['bed_wind_walls', .55], ['bed_wind_snow', .3]],   // the wind through the boards, all the way
    spots: [['spot_creak', [8, 20], .3], ['cough', [12, 30], .3], ['spot_gust', [16, 36], .2]],
  },
  // arrival: the column marching from the railhead. The story plays ru_march_rule and ru_march_quiet itself.
  arrival_march: {
    beds: [['bed_column', .5], ['bed_wind_snow', .4]],
    spots: [['dogs', [18, 40], .3], ['spot_gust', [8, 18], .4], ['spot_snow_steps', [10, 24], .3],
      [['ru_march_close', 'ru_march_hands'], [12, 28], .35]],
  },
  // the mess hut: the queue (amb_queue), spoons on tin, the stove; the door letting the cold in
  amb_queue: {
    beds: [['bed_spoons', .55], ['bed_stove', .2], ['ru_mess_murmur', .3]],
    spots: [['spot_door_far', [12, 30], .3], ['cough', [10, 26], .3], ['ladle', [9, 20], .3],
      [['ru_mess_thick', 'ru_mess_move', 'ru_mess_spoon', 'ru_mess_shove', 'ru_mess_bowl', 'ru_mess_thick2'], [8, 18], .28]],
  },
  // the hut the week after Kuzma's paper: the same beds, fewer sounds, nobody telling the stove anything
  hut_quiet: {
    beds: [['bed_wind_walls', .45], ['bed_stove', .3]],
    spots: [['spot_creak', [18, 40], .25], ['spot_gust', [20, 45], .2]],
  },
  // the bunk by the door: the wind closer, the door often, the stove far off
  hut_door: {
    beds: [['bed_wind_walls', .6], ['bed_stove', .12]],
    spots: [['spot_door_far', [5, 12], .5], ['spot_gust', [6, 14], .45], ['spot_creak', [12, 28], .25], ['cough', [20, 45], .2]],
  },
  // the bathhouse: the boiler, water, the men
  banya: {
    beds: [['bed_stove', .45], ['ru_mess_murmur', .25]],
    spots: [['drip', [2, 6], .5], ['cough', [8, 20], .3], ['spot_door_far', [15, 35], .25]],
  },
  // the cells: almost nothing, which is the point
  amb_cells: {
    beds: [['bed_wind_walls', .3]],
    spots: [['drip', [6, 15], .35], ['spot_creak', [22, 45], .2], ['spot_door_far', [30, 60], .2]],
  },
  // a blizzard on the walls
  amb_blizzard: {
    beds: [['bed_wind_walls', .6]],
    spots: [['spot_gust', [3, 8], .55], ['spot_creak', [10, 22], .25]],
  },
  // May: the thaw
  amb_spring: {
    beds: [],
    spots: [['drip', [4, 10], .4], ['spot_ice_crack', [8, 20], .45], ['spot_crow', [12, 30], .3]],
  },
};
