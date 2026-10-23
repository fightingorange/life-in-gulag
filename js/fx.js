'use strict';
// Living stills: the print stays still, and light and weather are composited over it.
// Four layers, each a canvas over the picture:
//   cut       drawn normally, under the others: pieces of the print itself, recut live (the flames)
//   light     blended with 'screen', so it really brightens the print: window shafts, lamp cones,
//             searchlights, firelight and its spill, glows
//   shade     blended with 'multiply', so it really darkens it: cloud shadows drifting over the snow,
//             the dark of a room breathing with the fire, a warm overprint on light skies
//   particles drawn normally: snow, breath, smoke, sparks, dust, grain
// Everything is in the print's own two inks (paper and black) except firelight, the only warm
// thing in the game. Positions are fractions of the frame (0..1).
const FX = (() => {
  const PAPER = '235,226,202', INK = '27,24,19', WARM = '214,160,90';
  // the print's own inks, measured off the drawings: what a flame is cut from and covered with
  const P_PAPER = '237,220,192', P_INK = '35,33,29', P_CORE = '241,207,150';
  const col = c => c === 'paper' ? PAPER : c === 'warm' ? WARM : INK;
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // a mouth that breathes: where, paper or ink (soft puffs), how big; dir: which way he faces (1 right,
  // -1 left); sync: the index of the lift (his shoulders, below) whose breathing out it follows
  const B = (x, y, color, scale, dir, sync) => ({ x, y, color: color || 'paper', scale: scale || 1, dir: dir || 1, sync });
  const CONF = {
    // ---- outside: snow, breath, smoke, and cloud shadows drifting over the snow
    title:       { snow: { n: 40, color: 'ink', wind: 35, speed: [18, 40], size: [.6, 1.3], streak: true },
                   clouds: { n: 3, a: .20, speed: 7 } },
    count:       { snow: { n: 160, color: 'paper', wind: -45, speed: [35, 80], size: [.7, 1.9] },
                   breath: [B(.36, .62, 'paper', .8), B(.44, .62, 'paper', .8), B(.51, .62, 'paper', .8), B(.575, .62, 'paper', .8), B(.635, .62, 'paper', .8)],
                   glow: [{ x: .505, y: .525, r: .03, color: 'warm', a: .5, flicker: .6 }],
                   sweep: { x: .82, y: .42, a0: 160, a1: 205, period: 16, len: 1.1, spread: 11, a: 1.6 } },
    site:        { snow: { n: 50, color: 'ink', wind: 25, speed: [15, 35], size: [.6, 1.2], streak: true },
                   smoke: { x: .92, y: .215, color: 'ink', a: .10, r: [6, 30], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 },
                   clouds: { n: 4, a: .19, speed: 10 } },
    noon:        { snow: { n: 90, color: 'ink', wind: 70, speed: [35, 60], size: [.7, 1.5], streak: true },
                   // the fire between the men: the drawn flame is inked over and cut again, live
                   flame: { x: .53, y: .787, w: .052, h: .12, embers: 3,
                            cover: [[.501, .792], [.503, .762], [.508, .738], [.513, .716], [.517, .694], [.52, .664], [.527, .668], [.531, .69], [.536, .71], [.543, .728], [.55, .748], [.556, .765], [.559, .79], [.54, .794]],
                            base: [[.48, .80], [.502, .792], [.52, .783], [.535, .778], [.55, .781], [.575, .79]] },
                   firelight: { x: .53, y: .735, r: .2, a: .26, sq: .85,
                            ground: { x: .53, y: .80, rx: .19, ry: .045, a: .2 },
                            // the hands held out to it, and the two faces turned to it
                            touch: [{ x: .503, y: .688, r: .02, a: .4 }, { x: .553, y: .675, r: .024, a: .4 }, { x: .368, y: .532, r: .016, a: .35 }, { x: .617, y: .54, r: .016, a: .35 }] },
                   dark: { x: .53, y: .72, r: .42, a: .12 },
                   smoke: { x: .528, y: .665, color: 'ink', a: .07, r: [8, 34], life: 4, rate: 1, drift: [18, -30], spread: 10 },
                   // the men breathe: each man's head and shoulders cut from the print and lifted a hair as he
                   // breathes in (lift), and the two whose faces show breathe out in carved curls as they sink
                   lift: [{ box: [.255, .492, .398, .672], pivot: [.33, .72], rise: .0042, turn: -.35, period: 4.6, ph: .1 },
                          { box: [.358, .54, .497, .675], pivot: [.43, .74], rise: .0032, turn: .25, period: 5.3, ph: .55 },
                          { box: [.497, .54, .598, .652], pivot: [.55, .7], rise: .003, turn: -.2, period: 4.1, ph: .8 },
                          { box: [.598, .492, .748, .675], pivot: [.68, .73], rise: .0042, turn: .35, period: 5, ph: .35 }],
                   breath: [B(.374, .557, 'ink', .7, 1, 0), B(.611, .585, 'ink', .7, -1, 3)], carve: true,
                   clouds: { n: 3, a: .17, speed: 12 } },
    gate:        { snow: { n: 60, color: 'ink', wind: 20, speed: [18, 40], size: [.6, 1.3], streak: true },
                   sweep: { x: .835, y: .135, a0: 135, a1: 200, period: 11, len: .9, spread: 14, color: 'warm' },
                   clouds: { n: 3, a: .17, speed: 8 } },
    wire:        { snow: { n: 70, color: 'paper', wind: -25, speed: [20, 45], size: [.6, 1.6] },
                   sweep: { x: .795, y: .52, a0: 185, a1: 235, period: 14, len: 1.0, spread: 9 } },
    river:       { snow: { n: 30, color: 'ink', wind: 40, speed: [12, 30], size: [.5, 1.1], streak: true },
                   smoke: { x: .82, y: .29, color: 'ink', a: .07, r: [4, 16], life: 5, rate: 1.4, drift: [30, -6], spread: 6 },
                   breath: [B(.31, .40, 'ink', .35)],
                   clouds: { n: 4, a: .19, speed: 9 } },
    inspection:  { snow: { n: 40, color: 'ink', wind: 25, speed: [14, 32], size: [.5, 1.1], streak: true },
                   breath: [B(.565, .25, 'ink', .45), B(.635, .25, 'ink', .45), B(.675, .25, 'ink', .45), B(.735, .27, 'ink', .45), B(.785, .22, 'ink', .45)],
                   clouds: { n: 4, a: .18, speed: 9 } },
    ice_out:     { snow: { n: 25, color: 'ink', wind: 55, speed: [10, 24], size: [.5, 1], streak: true },
                   smoke: { x: .76, y: .23, color: 'ink', a: .06, r: [4, 14], life: 5, rate: 1.2, drift: [26, -5], spread: 6 },
                   clouds: { n: 4, a: .20, speed: 14 } },
    // ---- inside: light through the windows, the stove, the lamp
    hut_morning: { beam: { x: .727, y: .5, w: .07, angle: 96, spread: 26, len: .55, a: .32, pass: true, land: { x: .7, y: .78, rx: .16, ry: .06 } },
                   glow: [{ x: .727, y: .45, r: .07, color: 'paper', a: .22, flicker: .15 }],
                   motes: { n: 18, region: [.6, .48, .25, .4] } },
    hut_night:   { ember: { x: .73, y: .57, r: .06, floor: { x: .73, y: .7, rx: .14, ry: .035 } },
                   spill: { x: .72, y: .6, r: .3, a: .12 },
                   dark: { x: .72, y: .58, r: .45, a: .22 },
                   beam: { x: .655, y: .48, w: .06, angle: 100, spread: 22, len: .35, a: .16, pass: true },
                   breath: [B(.235, .465, 'paper', .6)], motes: { n: 10, region: [.55, .35, .4, .4] } },
    // the soup's steam and stirring are placed per picture in BOWLS, below
    table:       { pool: { x: .46, y: .36, r: .5, a: .3, swing: .05, period: 7.5, shade: true } },
    cells:       { beam: { x: .5, y: .17, w: .03, angle: 92, spread: 16, len: .75, a: .32, land: { x: .48, y: .78, rx: .13, ry: .05 } },
                   glow: [{ x: .50, y: .11, r: .05, color: 'paper', a: .18, flicker: .15 }],
                   motes: { n: 16, region: [.42, .2, .16, .6] } },
    dead:        { beam: { x: .86, y: .27, w: .07, angle: 128, spread: 26, len: .7, a: .34, pass: true, land: { x: .62, y: .72, rx: .16, ry: .06 } },
                   glow: [{ x: .87, y: .21, r: .07, color: 'paper', a: .16, flicker: .1 }],
                   motes: { n: 12, region: [.55, .25, .35, .5] } },
    stove:       { ember: { x: .366, y: .545, r: .08, floor: { x: .40, y: .67, rx: .16, ry: .035 } },
                   spill: { x: .37, y: .58, r: .36, a: .14 },
                   dark: { x: .38, y: .56, r: .5, a: .2 },
                   beam: { x: .56, y: .38, w: .06, angle: 100, spread: 20, len: .3, a: .08 },
                   motes: { n: 10, region: [.28, .3, .3, .35] } },
    blizzard:    { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.64, .225, .167, .305] },
                   beam: { x: .725, y: .52, w: .17, angle: 105, spread: 30, len: .5, a: .12, flicker: .35 },
                   glow: [{ x: .725, y: .38, r: .12, color: 'paper', a: .1, flicker: .3 }] },
    letter:      { beam: { x: .14, y: .1, w: .16, angle: 40, spread: 28, len: .9, a: .34, pass: true, land: { x: .5, y: .6, rx: .25, ry: .12 } },
                   motes: { n: 18, region: [.08, .1, .4, .5] } },
    office:      { beam: { x: .26, y: .3, w: .05, angle: 62, spread: 58, len: .38, a: .3, color: 'warm', flicker: .08, land: { x: .42, y: .58, rx: .2, ry: .07 } },
                   glow: [{ x: .265, y: .27, r: .06, color: 'warm', a: .3, flicker: .1 }],
                   motes: { n: 10, region: [.25, .25, .25, .25] } },
    // ---- the third set: pictures that follow the day
    reveille:    { flame: { x: .2775, y: .254, w: .008, h: .03, kind: 'lamp' },     // the lantern on the post, inside its glass
                   firelight: { x: .2775, y: .235, r: .1, a: .2, sq: 1.1, bands: 3 },
                   glow: [{ x: .275, y: .22, r: .07, color: 'warm', a: .38, flicker: .35 }, { x: .03, y: .34, r: .06, color: 'warm', a: .25, flicker: .1 }],
                   spill: { x: .29, y: .32, r: .38, a: .13 },
                   sweep: { x: .945, y: .41, a0: 184, a1: 204, period: 13, len: .38, spread: 7 },
                   snow: { n: 70, color: 'paper', wind: -20, speed: [18, 40], size: [.6, 1.4] },
                   breath: [B(.385, .34, 'paper', .7)] },
    hut_morning_dark: { glow: [{ x: .668, y: .21, r: .05, color: 'paper', a: .4, flicker: .06 }],
                   beam: { x: .668, y: .23, w: .02, angle: 92, spread: 70, len: .5, a: .12, breathe: false, flicker: .05, land: { x: .67, y: .78, rx: .2, ry: .07 } },
                   motes: { n: 12, region: [.58, .25, .18, .45] } },
    hut_morning_grey: { beam: { x: .725, y: .5, w: .07, angle: 96, spread: 24, len: .5, a: .2, pass: true, land: { x: .72, y: .78, rx: .15, ry: .05 } },
                   motes: { n: 14, region: [.62, .48, .22, .4] } },
    hut_morning_sun: { beam: { x: .725, y: .48, w: .07, angle: 100, spread: 30, len: .62, a: .28, pass: true },
                   glow: [{ x: .725, y: .45, r: .08, color: 'paper', a: .25, flicker: .1 }],
                   motes: { n: 24, region: [.55, .45, .3, .45] } },
    site_power_1: { snow: { n: 50, color: 'ink', wind: 25, speed: [15, 35], size: [.6, 1.2], streak: true },
                   smoke: { x: .73, y: .6, color: 'ink', a: .08, r: [6, 26], life: 4, rate: 1.2, drift: [10, -26], spread: 10 },
                   clouds: { n: 4, a: .18, speed: 10 } },
    site_timber_1: { snow: { n: 40, color: 'ink', wind: 30, speed: [15, 32], size: [.6, 1.2], streak: true },
                   breath: [B(.385, .48, 'ink', .6), B(.69, .36, 'ink', .6)],
                   clouds: { n: 4, a: .17, speed: 11 } },
    // the bank without its haulers (sprites.js moves them over it): the same weather, and the breath
    // goes with the men's mouths as they climb
    site_timber_plate: { snow: { n: 40, color: 'ink', wind: 30, speed: [15, 32], size: [.6, 1.2], streak: true },
                   breath: 'figures', carve: true,
                   clouds: { n: 4, a: .17, speed: 11 } },
    easter:      { flame: { x: .853, y: .657, w: .017, h: .109, kind: 'candle', cover: true, under: [-.03, 0], base: [[.82, .658], [.89, .658]] },
                   firelight: { x: .853, y: .62, r: .13, a: .2, sq: 1, bands: 3,
                            ground: { x: .84, y: .735, rx: .14, ry: .035, a: .16 }, touch: [{ x: .77, y: .70, r: .03, a: .14 }] },
                   spill: { x: .84, y: .6, r: .3, a: .09 },
                   dark: { x: .84, y: .6, r: .55, a: .2 },
                   beam: { x: .23, y: .24, w: .05, angle: 95, spread: 18, len: .3, a: .08 } },
  };
  // noon's plate: the fire and the snow without the men, who come as one figure (sprites.js) and
  // breathe where their mouths are
  CONF.noon_plate = Object.assign({}, CONF.noon, { lift: null, breath: 'figures' });

  // ---- the soup, per picture: every bowl in one place, because the mess-hut pictures will be redrawn
  // (mess_table and its edits: give each new drawing its own line here; a picture with no line has no
  // steam and no stirring, rather than steam in the wrong place).
  //   x, y, rx, ry  the soup's surface, an ellipse inside the rim (fractions of the frame)
  //   steam         wisps rising at a time (0: none); rise: how high they go (fraction of the frame's height)
  //   at            where the wisps rise from, across the surface (-1 left edge .. 1 right edge); default anywhere
  //   stir          how far the middle of the soup turns, in degrees (default 4)
  //   keep          [[x, y, rx, ry], ...]: what lies in the soup and must not turn with it (a spoon)
  // A name may point to another picture's line (the edits that only change the bread).
  const BOWLS = {
    table:            { x: .472, y: .342, rx: .095, ry: .054, steam: 3, rise: .2 },
    table_nobread: 'table', breakfast_400: 'table', breakfast_550: 'table', breakfast_650: 'table',
    'table-02':       { x: .395, y: .488, rx: .09, ry: .047, steam: 3, rise: .2 },
    'table-03':       { x: .557, y: .43, rx: .1, ry: .155, steam: 3, rise: .13 },        // looking straight down
    // supper's own drawn steam rises at .47; the spoon lies in the soup (supper) or is lifted with a drip
    // (supper_b, its twin, which fades in over it): neither turns
    supper:           { x: .467, y: .354, rx: .098, ry: .055, steam: 2, rise: .19, at: [-.55, .32],
                        keep: [[.51, .37, .05, .03], [.565, .352, .03, .018], [.538, .29, .052, .034], [.507, .33, .012, .028]] },
    supper_b: 'supper',
  };
  function bowlOf(key) {
    let b = BOWLS[key];
    for (let i = 0; typeof b === 'string' && i < 4; i++) b = BOWLS[b];
    return b && typeof b === 'object' ? b : null;
  }

  // effects placed by hand on the other drawings of each place (positions as fractions of the frame)
  const VARIANTS = {
    'hut_morning-02': { glow: [{ x: .245, y: .37, r: .08, color: 'paper', a: .10, flicker: .3 }] },
    'hut_morning-03': { glow: [{ x: .68, y: .45, r: .08, color: 'paper', a: .10, flicker: .3 }] },
    'site-01': { smoke: { x: .04, y: .13, color: 'ink', a: .10, r: [6, 28], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 } },
    'site-03': { smoke: { x: .965, y: .07, color: 'ink', a: .10, r: [6, 28], life: 4.5, rate: 1.2, drift: [14, -28], spread: 8 } },
    // noon-01: a small fire on open snow, its tongues cut in ink
    'noon-01': { flame: { x: .525, y: .752, w: .042, h: .085, style: 'ink', lick: .6, embers: 2,
                          cover: [[.502, .748], [.504, .705], [.508, .688], [.514, .672], [.52, .656], [.527, .662], [.531, .69], [.535, .705], [.537, .735], [.532, .75]],
                          base: [[.48, .78], [.505, .765], [.525, .757], [.545, .75], [.57, .745]] },
                 firelight: { x: .525, y: .71, r: .17, a: .2, sq: .8, ground: { x: .525, y: .76, rx: .17, ry: .04, a: .18 },
                          touch: [{ x: .56, y: .66, r: .022, a: .22 }, { x: .49, y: .68, r: .02, a: .18 }] },
                 dark: { x: .525, y: .7, r: .42, a: .1 },
                 smoke: { x: .525, y: .64, color: 'ink', a: .07, r: [8, 30], life: 4, rate: 1, drift: [18, -30], spread: 10 },
                 lift: [{ box: [.262, .525, .385, .675], pivot: [.32, .73], rise: .004, turn: -.3, period: 4.8, ph: .2 },
                        { box: [.378, .565, .5, .69], pivot: [.44, .76], rise: .003, turn: .25, period: 5.4, ph: .6 },
                        { box: [.548, .535, .68, .66], pivot: [.62, .71], rise: .0035, turn: .3, period: 4.3, ph: .9 },
                        { box: [.688, .545, .815, .685], pivot: [.75, .75], rise: .004, turn: .3, period: 5.1, ph: .4 }],
                 breath: [B(.376, .574, 'ink', .7, 1, 0), B(.583, .585, 'ink', .7, -1, 2), B(.712, .6, 'ink', .7, -1, 3)] },
    // noon-03: the big one, close, between the coats
    'noon-03': { flame: { x: .482, y: .69, w: .066, h: .165, embers: 4,
                          cover: [[.452, .69], [.453, .66], [.458, .645], [.463, .625], [.464, .59], [.466, .56], [.469, .543], [.472, .543], [.476, .56], [.484, .58], [.492, .6], [.5, .603], [.506, .62], [.513, .64], [.517, .668], [.516, .69]],
                          base: [[.43, .71], [.452, .69], [.468, .676], [.478, .667], [.49, .672], [.505, .682], [.52, .69], [.54, .70]] },
                 firelight: { x: .482, y: .62, r: .24, a: .26, sq: .85, ground: { x: .48, y: .73, rx: .22, ry: .05, a: .2 },
                          touch: [{ x: .425, y: .6, r: .035, a: .22 }, { x: .545, y: .6, r: .035, a: .22 }, { x: .52, y: .44, r: .03, a: .18 }, { x: .25, y: .36, r: .025, a: .14 }] },
                 dark: { x: .48, y: .62, r: .45, a: .12 },
                 smoke: { x: .47, y: .5, color: 'ink', a: .07, r: [8, 34], life: 4, rate: 1, drift: [18, -30], spread: 10 },
                 lift: [{ box: [.075, .235, .28, .5], pivot: [.17, .6], rise: .006, turn: -.3, period: 4.9, ph: .15 },
                        { box: [.27, .275, .425, .5], pivot: [.34, .62], rise: .005, turn: .2, period: 5.5, ph: .6 },
                        { box: [.44, .245, .56, .46], pivot: [.5, .55], rise: .005, turn: -.25, period: 4.4, ph: .85 },
                        { box: [.555, .295, .76, .52], pivot: [.65, .65], rise: .006, turn: .3, period: 5.2, ph: .4 }],
                 breath: [B(.258, .36, 'ink', 1, 1, 0), B(.498, .372, 'ink', 1, -1, 2)] },
    'gate-02': { sweep: { x: .80, y: .08, a0: 125, a1: 190, period: 11, len: .9, spread: 14, color: 'warm' } },
    'gate-03': { sweep: { x: .79, y: .25, a0: 140, a1: 205, period: 11, len: .9, spread: 14, color: 'warm' } },
    'hut_night-02': { ember: { x: .265, y: .60, r: .05, floor: { x: .27, y: .72, rx: .11, ry: .03 } } },
    'hut_night-03': { ember: { x: .665, y: .60, r: .05, floor: { x: .66, y: .72, rx: .11, ry: .03 } } },
    'cells-02': { glow: [{ x: .62, y: .22, r: .06, color: 'paper', a: .08, flicker: .15 }] },
    'cells-03': { glow: [{ x: .50, y: .26, r: .06, color: 'paper', a: .08, flicker: .15 }] },
    'wire-01': { sweep: { x: .75, y: .47, a0: 185, a1: 235, period: 14, len: 1.0, spread: 9 } },
    'stove-01': { ember: { x: .39, y: .53, r: .07, floor: { x: .40, y: .66, rx: .15, ry: .035 } } },
    'stove-02': { ember: { x: .594, y: .53, r: .07, floor: { x: .59, y: .66, rx: .15, ry: .035 } } },
    'letter-01': { glow: [{ x: .12, y: .08, r: .24, color: 'paper', a: .08, flicker: .05 }] },
    'letter-02': { glow: [{ x: .12, y: .08, r: .24, color: 'paper', a: .08, flicker: .05 }] },
    'blizzard-01': { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.645, .17, .19, .37] } },
    'blizzard-02': { snow: { n: 90, color: 'paper', wind: -120, speed: [140, 230], size: [.6, 1.4], streak: true, len: 9, clip: [.225, .17, .18, .36] } },
    'office-01': { glow: [{ x: .86, y: .14, r: .2, color: 'warm', a: .12, flicker: .12 }] },
    'office-02': { glow: [{ x: .27, y: .17, r: .2, color: 'warm', a: .12, flicker: .12 }] },
    'easter-01': { flame: { x: .5862, y: .603, w: .022, h: .107, kind: 'candle', cover: true, under: [.036, 0], base: [[.55, .604], [.62, .604]] },
                   firelight: { x: .586, y: .56, r: .13, a: .2, sq: 1, bands: 3, ground: { x: .58, y: .69, rx: .14, ry: .035, a: .16 }, touch: [{ x: .44, y: .62, r: .035, a: .14 }] } },
    'easter-03': { flame: { x: .6958, y: .601, w: .019, h: .118, kind: 'candle', cover: true, under: [.03, 0], base: [[.66, .602], [.73, .602]] },
                   firelight: { x: .696, y: .55, r: .13, a: .2, sq: 1, bands: 3, ground: { x: .68, y: .70, rx: .14, ry: .035, a: .16 }, touch: [{ x: .56, y: .66, r: .035, a: .14 }] } },
    // the other two drawings of reveille (not in the rotation yet): the lantern on the hut wall
    'reveille-01': { flame: { x: .186, y: .393, w: .007, h: .026, kind: 'lamp' }, firelight: { x: .186, y: .375, r: .1, a: .2, sq: 1.1, bands: 3 },
                     glow: [{ x: .186, y: .37, r: .07, color: 'warm', a: .38, flicker: .35 }] },
    'reveille-03': { flame: { x: .19, y: .295, w: .008, h: .028, kind: 'lamp' }, firelight: { x: .19, y: .275, r: .1, a: .2, sq: 1.1, bands: 3 },
                     glow: [{ x: .19, y: .27, r: .07, color: 'warm', a: .38, flicker: .35 }] },
  };

  let canvas, ctx, box, W = 0, H = 0, s = 1, cfg = null, name = null;
  let ctxP, ctxL, ctxS, ctxC, layers = [];
  let clouds = [], passAt = 0, passT = -1;
  let snow = [], puffs = [], sparks = [], motes = [], breathTimers = [], smokeAcc = 0, sparkAcc = 0;
  let raf = null, last = 0, t = 0, grain = [], grainIdx = 0, grainAt = 0;
  let flames = [], fireF = 1, cutDirty = false, lifts = [], soup = null, curls = [], breathCycle = [];

  function mount(frameBox) {
    box = frameBox;
    const layer = (id, blend) => {
      const c = document.createElement('canvas');
      c.id = id;
      if (blend) c.style.mixBlendMode = blend;
      box.appendChild(c);
      layers.push(c);
      return c.getContext('2d');
    };
    ctxC = layer('fx-cut', null);        // cut-outs of the print itself (flames), under the light and shade
    ctxC.canvas.style.transition = 'opacity 1.1s ease';   // they come in with their picture
    ctxS = layer('fx-shade', 'multiply');
    ctxL = layer('fx-light', 'screen');
    ctxP = layer('fx', null);
    layers.shift();                      // layers[0..2] stay shade, light, particles
    canvas = layers[2];
    ctx = ctxP;
    for (let i = 0; i < 3; i++) grain.push(makeGrain());
    if (window.ResizeObserver) new ResizeObserver(resize).observe(box);
    else addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (cfg) start(); });
  }
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), im = g.createImageData(160, 160), d = im.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 27; d[i + 1] = 24; d[i + 2] = 19; d[i + 3] = Math.random() < .5 ? 0 : Math.random() * 70; }
    g.putImageData(im, 0, 0);
    return c;
  }
  function resize() {
    if (!box) return;
    const r = { width: box.clientWidth, height: box.clientHeight };   // layout size: the drift transform does not count
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height; s = W / 680;
    for (const [c, g] of [[layers[0], ctxS], [layers[1], ctxL], [layers[2], ctxP], [ctxC.canvas, ctxC]]) {
      // the cut-outs of the print (flames) are as sharp as the print
      const d = g === ctxC ? Math.min(window.devicePixelRatio || 1, 2) : dpr;
      c.width = Math.round(W * d); c.height = Math.round(H * d);
      g.setTransform(d, 0, 0, d, 0, 0);
    }
    seed();
  }
  function seed() {
    snow = []; motes = []; puffs = []; sparks = []; breathTimers = [];
    if (!cfg) return;
    if (cfg.snow) for (let i = 0; i < cfg.snow.n; i++) snow.push(flake(cfg.snow, true));
    if (cfg.motes) for (let i = 0; i < cfg.motes.n; i++) {
      const [rx, ry, rw, rh] = cfg.motes.region;
      motes.push({ x: (rx + Math.random() * rw) * W, y: (ry + Math.random() * rh) * H, vx: rnd(-3, 3), vy: rnd(-2, 2), ph: rnd(0, 6.3) });
    }
    if (Array.isArray(cfg.breath)) breathTimers = cfg.breath.map(() => rnd(.5, 3));
    clouds = [];
    if (cfg.clouds) for (let i = 0; i < cfg.clouds.n; i++) clouds.push(cloud(cfg.clouds, true));
    passAt = rnd(8, 20); passT = -1;
    flames = [].concat(cfg.flame || []).map(makeFlame);
    lifts = (cfg.lift || []).map(c => ({ c, sprite: null }));
    soup = cfg.soup ? { b: cfg.soup, sprite: null, wisps: [] } : null;
    curls = []; breathCycle = [];
  }
  function cloud(c, anywhere) {
    const r = rnd(.25, .5) * W;
    return { x: anywhere ? rnd(-r, W + r) : -r * 1.2, y: rnd(-.1, 1.1) * H, r, sq: rnd(.35, .6), v: rnd(.6, 1.2) * (c.speed || 9) * s, a: rnd(.6, 1) };
  }
  // the area snow falls in: the whole frame, or a clip region such as a window
  function area(c) { const [x, y, w, h] = c.clip || [0, 0, 1, 1]; return { x: x * W, y: y * H, w: w * W, h: h * H }; }
  function flake(c, anywhere) {
    const A = area(c);
    return { x: A.x + Math.random() * A.w, y: anywhere ? A.y + Math.random() * A.h : A.y - 4, vy: rnd(c.speed[0], c.speed[1]) * s, r: rnd(c.size[0], c.size[1]) * s, ph: rnd(0, 6.3), a: rnd(.5, 1) };
  }

  // A variant drawing ("noon-03") uses its own entry if there is one (merged over the master's);
  // otherwise it keeps only what does not depend on where things are in the picture.
  const PLACED = ['ember', 'glow', 'breath', 'sweep', 'smoke', 'beam', 'spill', 'dark', 'pool', 'flame', 'firelight', 'lift'];
  // pictures that are edits of another share its effects: the breadless table is the table
  const ALIAS = {
    table_nobread: 'table', breakfast_400: 'table', breakfast_550: 'table', breakfast_650: 'table', supper: 'table', supper_b: 'table',
    site_power_2: 'site_power_1', site_power_3: 'site_power_1',
    site_settlement_1: 'site', site_settlement_2: 'site', site_settlement_3: 'site',
    site_timber_2: 'site_timber_1', site_timber_3: 'site_timber_1',
    reveille_after: 'reveille',     // the same scene, the hammer lowered: the same lantern and light
    // plates: the place without its workers, who move over it as figures (sprites.js)
    test_timber_plate: 'site_timber_plate', site_timber_plate_1: 'site_timber_plate', site_timber_plate_2: 'site_timber_plate', site_timber_plate_3: 'site_timber_plate',
    site_power_plate_1: 'site_power_1', site_power_plate_2: 'site_power_1', site_power_plate_3: 'site_power_1',
    site_settlement_plate_1: 'site', site_settlement_plate_2: 'site', site_settlement_plate_3: 'site',
  };
  function configFor(key) {
    const soup = bowlOf(key);
    if (ALIAS[key]) key = ALIAS[key];
    let out;
    if (CONF[key] && !key.includes('-0')) out = CONF[key];
    else {
      const base = key.split('-0')[0], b = CONF[base] || {};
      out = {};
      for (const k in b) if (!PLACED.includes(k) && !(k === 'snow' && b.snow.clip)) out[k] = b[k];
      Object.assign(out, VARIANTS[key] || {});
    }
    return soup ? Object.assign({}, out, { soup }) : out;
  }
  function set(frameName) {
    name = frameName;
    // the print now on screen, for cutting its drawn flames out
    printImg = box ? [...box.querySelectorAll('img.on')].find(i => !i.classList.contains('twin')) || null : null;
    cfg = frameName ? configFor(frameName) : null;   // an unconfigured frame still gets the grain
    if (reduced) cfg = null;
    if (ctxC) {
      ctxC.clearRect(0, 0, W, H); cutDirty = false;
      const st = ctxC.canvas.style; st.opacity = 0; requestAnimationFrame(() => requestAnimationFrame(() => { st.opacity = 1; }));
    }
    if (cfg) { resize(); start(); } else { stop(); for (const g of [ctxP, ctxL, ctxS]) if (g) g.clearRect(0, 0, W, H); }
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    let dt = (now - last) / 1000;
    if (dt < 1 / 32) return;           // ~30 fps is plenty for a print
    last = now; dt = Math.min(dt, .1);
    frame(dt, now);
  }
  function frame(dt, now) {
    t += dt;
    if (!cfg || !W) return;
    ctxP.clearRect(0, 0, W, H); ctxL.clearRect(0, 0, W, H); ctxS.clearRect(0, 0, W, H);
    if (cutDirty) { ctxC.clearRect(0, 0, W, H); cutDirty = false; }
    fireF = flames.length ? fireLevel() : flick(5.5, .45);
    // cut-outs
    ctx = ctxC;
    for (const L of lifts) { cutLift(L); cutDirty = true; }
    if (soup) { stir(soup); cutDirty = true; }
    for (const fl of flames) { cutFlame(fl); cutDirty = true; }
    // shade
    ctx = ctxS;
    if (cfg.clouds) drawClouds(cfg.clouds, dt);
    if (cfg.dark) drawDark(cfg.dark);
    if (cfg.firelight) drawFireTint(cfg.firelight);
    if (cfg.pool && cfg.pool.shade) drawPool(cfg.pool);
    if (cfg.sweep && cfg.sweep.color === 'warm') drawSweep(cfg.sweep);
    // light
    ctx = ctxL;
    if (cfg.beam) [].concat(cfg.beam).forEach(b => drawBeam(b, dt));
    if (cfg.pool && !cfg.pool.shade) drawPool(cfg.pool);
    if (cfg.sweep && cfg.sweep.color !== 'warm') drawSweep(cfg.sweep);
    if (cfg.glow) cfg.glow.forEach(drawGlow);
    if (cfg.spill) drawSpill(cfg.spill);
    if (cfg.ember) drawEmber(cfg.ember, dt);
    if (cfg.firelight) drawFireGlow(cfg.firelight);
    // particles
    ctx = ctxP;
    for (const fl of flames) drawSparksOf(fl, dt);
    if (cfg.ember && cfg.ember.sparks) drawSparks(cfg.ember, dt);
    if (cfg.smoke) stepSmoke(cfg.smoke, dt);
    if (cfg.breath) stepBreath(cfg.breath, dt);
    drawPuffs(dt);
    drawCurls();
    if (soup) drawSteam(soup);
    if (cfg.motes) drawMotes(dt);
    if (cfg.snow) drawSnow(cfg.snow, dt);
    drawGrain(now);
  }

  // ---- snow: paper flakes over dark skies, ink specks over light ones
  function drawSnow(c, dt) {
    const color = col(c.color), base = c.color === 'paper' ? .75 : .45, A = area(c);
    ctx.lineCap = 'round';
    if (c.clip) { ctx.save(); ctx.beginPath(); ctx.rect(A.x, A.y, A.w, A.h); ctx.clip(); }
    for (const f of snow) {
      const wob = Math.sin(t * 1.3 + f.ph) * 9 * s;
      f.y += f.vy * dt; f.x += (c.wind * s + wob) * dt;
      if (f.y > A.y + A.h + 4) { Object.assign(f, flake(c, false)); }
      if (f.x < A.x - 6) f.x += A.w + 12; else if (f.x > A.x + A.w + 6) f.x -= A.w + 12;
      ctx.globalAlpha = base * f.a;
      if (c.streak) {
        const vx = c.wind * s, vy = f.vy, L = (c.len || 3) * s;
        const n = Math.hypot(vx, vy) || 1;
        ctx.strokeStyle = `rgb(${color})`; ctx.lineWidth = f.r;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - vx / n * L, f.y - vy / n * L); ctx.stroke();
      } else {
        ctx.fillStyle = `rgb(${color})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (c.clip) ctx.restore();
  }

  // ---- puffs: breath, steam, chimney smoke
  function addPuff(x, y, color, a, r0, r1, life, dx, dy) {
    puffs.push({ x, y, color, a, r0, r1, life, age: 0, dx, dy, ph: rnd(0, 6.3) });
  }
  // Breath: a soft puff, or with cfg.carve, a few curls cut in the print's two inks (breathe, below).
  // breath: 'figures' breathes at the mouths of the moving figures (sprites.js), wherever they are.
  // A mouth with sync breathes out as the shoulders of its lift (cfg.lift) start to sink.
  function stepBreath(list, dt) {
    if (list === 'figures') list = window.SPRITES ? SPRITES.mouths().filter(m => m.a > .6).map(m => B(m.x, m.y, 'ink', m.scale || .9, m.dir)) : [];
    list.forEach((b, i) => {
      if (breathTimers[i] === undefined) breathTimers[i] = rnd(.5, 2.5);
      const L = b.sync !== undefined && cfg.lift && cfg.lift[b.sync];
      if (L) {
        const c = Math.floor(t / L.period + (L.ph || 0) - .5);
        if (breathCycle[i] === undefined) breathCycle[i] = c;
        if (c === breathCycle[i]) return;
        breathCycle[i] = c;
      } else {
        breathTimers[i] -= dt;
        if (breathTimers[i] > 0) return;
        breathTimers[i] = rnd(2.6, 4.8);
      }
      if (cfg.carve) return breathe(b);
      const k = b.scale, a = b.color === 'paper' ? .20 : .11;
      addPuff(b.x * W, b.y * H, b.color, a, 4 * k * s, 15 * k * s, 2.4, rnd(-4, 10) * k * s, -14 * k * s);
    });
  }
  function stepSmoke(c, dt) {
    smokeAcc += dt * c.rate;
    while (smokeAcc >= 1) {
      smokeAcc -= 1;
      addPuff(c.x * W + rnd(-c.spread, c.spread) * s * .15, c.y * H, c.color, c.a, c.r[0] * s, c.r[1] * s, c.life, c.drift[0] * s + rnd(-c.spread, c.spread) * s * .3, c.drift[1] * s);
    }
  }
  function drawPuffs(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt;
      if (p.age >= p.life) { puffs.splice(i, 1); continue; }
      const k = p.age / p.life, env = Math.sin(Math.PI * Math.min(1, k * 1.15));
      const r = p.r0 + (p.r1 - p.r0) * k;
      const x = p.x + p.dx * p.age + Math.sin(t * 1.7 + p.ph) * 2 * s, y = p.y + p.dy * p.age;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col(p.color)},${p.a * env})`); g.addColorStop(1, `rgba(${col(p.color)},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    }
  }

  // ---- embers: the only warm light
  function flick(speed, depth) { return 1 - depth + depth * (0.5 + 0.5 * (Math.sin(t * speed) * 0.6 + Math.sin(t * speed * 2.7 + 1) * 0.3 + Math.sin(t * speed * 6.1 + 2) * 0.1)); }
  function drawEmber(e, dt) {
    const f = flick(6, .5), x = e.x * W, y = e.y * H, r = e.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${WARM},${.42 * f})`); g.addColorStop(.45, `rgba(${WARM},${.14 * f})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    if (e.floor) {
      const fl = e.floor, fx = fl.x * W, fy = fl.y * H;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, fl.ry / fl.rx);
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, fl.rx * W);
      g2.addColorStop(0, `rgba(${WARM},${.22 * f})`); g2.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, fl.rx * W, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }
  function drawSparks(e, dt) {
    const x = e.x * W, y = e.y * H;
    {
      sparkAcc += dt * 1.6;
      while (sparkAcc >= 1) { sparkAcc -= 1; sparks.push({ x: x + rnd(-6, 6) * s, y: y - 4 * s, vx: rnd(-8, 14) * s, vy: rnd(-28, -14) * s, life: rnd(.8, 1.6), age: 0, ph: rnd(0, 6.3) }); }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.age += dt;
        if (p.age >= p.life) { sparks.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(t * 9 + p.ph) * 10 * s) * dt; p.y += p.vy * dt;
        ctx.globalAlpha = (1 - p.age / p.life) * .8;
        ctx.fillStyle = `rgb(${WARM})`; ctx.fillRect(p.x, p.y, 1.2 * s, 1.2 * s);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- open flame. Where the print has its flame drawn (a fire, a candle), that drawn flame is
  // cut out of the print (the 'cover' outline) and recut live: the cover is inked over, and the cut-out
  // is laid back on in thin slices, each pushed sideways and up by a wave that climbs the flame, so the
  // tongues lick, stretch and change shape. Where no flame is drawn (the lantern's glass), a small
  // flame is cut from scratch: paper, edged in ink. Logs, wax or the burner in front stay in front
  // (the flame shows only above 'base'). Bits tear off the tips and embers go up.
  //   flame: { x, y: the foot of the flame; w, h: its size (fractions of the frame);
  //            kind: 'fire' | 'candle' | 'lamp'; style: 'paper' (light flame on dark) or 'ink' (dark
  //            tongues on snow); cover: the drawn flame's outline [[x,y]..], or true for a candle's
  //            teardrop; base: polyline [[x,y]..] left to right; embers, flakes: per second }
  // The cut changes twelve times a second, like a block recut for every frame, never smoothly.
  const CUT = 12;
  let printImg = null;
  function makeFlame(c) {
    const calm = c.kind === 'candle' || c.kind === 'lamp';
    const outline = c.cover === true ? teardrop(c) : c.cover || null;
    return { c, calm, outline, sprite: outline ? cutOut(outline, c.under) : null, p: [rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)], flakes: [], embers: [], eAcc: 0, fAcc: rnd(0, 1) };
  }
  // a candle's drawn flame: a teardrop a little larger than it
  function teardrop(c) {
    const L = [], R = [];
    for (let k = 0; k <= 10; k++) {
      const v = k / 10, hw = c.w * .62 * Math.pow(1 - v, .75) * Math.min(1, (v + .15) * 3), y = c.y + c.h * .02 - v * c.h * 1.08;
      L.push([c.x - hw, y]); R.push([c.x + hw, y]);
    }
    return L.concat(R.reverse());
  }
  // the drawn flame, cut out of the print at the canvas's resolution
  function cutOut(pts, under, from) {
    const img = from || printImg;
    if (!img || !img.complete || !img.naturalWidth || !W) return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs) * W - 2, y0 = Math.min(...ys) * H - 2, w = (Math.max(...xs) - Math.min(...xs)) * W + 4, h = (Math.max(...ys) - Math.min(...ys)) * H + 4;
    const dpr = ctxC.canvas.width / W, sc = document.createElement('canvas');
    sc.width = Math.ceil(w * dpr); sc.height = Math.ceil(h * dpr);
    const g = sc.getContext('2d'), nw = img.naturalWidth, nh = img.naturalHeight;
    const k = Math.max(W / nw, H / nh), ox = (W - nw * k) / 2, oy = (H - nh * k) / 2;   // object-fit: cover
    g.drawImage(img, (x0 - ox) / k, (y0 - oy) / k, w / k, h / k, 0, 0, sc.width, sc.height);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    pts.forEach(([x, y], i) => { const px = (x * W - x0) * dpr, py = (y * H - y0) * dpr; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
    g.closePath(); g.fill();
    // what lies under the drawn flame is not known; 'under' takes it from beside it in the print
    let bed = null;
    if (under) {
      bed = document.createElement('canvas'); bed.width = sc.width; bed.height = sc.height;
      const b = bed.getContext('2d'), bx = x0 + under[0] * W, by = y0 + under[1] * H;
      b.drawImage(img, (bx - ox) / k, (by - oy) / k, w / k, h / k, 0, 0, sc.width, sc.height);
      b.globalCompositeOperation = 'destination-in'; b.drawImage(sc, 0, 0);
      b.globalCompositeOperation = 'source-over';    // where the cut-out was see-through, keep the print's ink
    }
    return { sc, bed, x0, y0, w, h, dpr };
  }
  // how bright the fire is now: the light, the dark around it and the glows all follow this
  function fireLevel() {
    const q = Math.floor(t * CUT) / CUT;
    return .5 + .5 * (Math.sin(q * 7.3) * .5 + Math.sin(q * 12.9 + 1) * .3 + Math.sin(q * 23.1 + 2) * .2);
  }
  // the shape of the flame at cut-time q: how tall (st), and how far each height is pushed (off) and widened (sq)
  function flameAt(F, q) {
    const p = F.p;
    if (F.calm) {   // a candle mostly stands still, sways a little and now and then gutters
      const gust = Math.max(0, Math.sin(q * .8 + p[1]) - .85) * 5;
      return { st: 1 + .035 * Math.sin(q * 2.3 + p[0]) + .025 * Math.sin(q * 6.7) - .1 * gust,
        off: v => F.c.w * W * (.07 * Math.pow(v, 1.6) * Math.sin(q * 1.6 + p[2]) + .3 * gust * v * v * Math.sin(q * 11)),
        sq: v => 1 + .06 * Math.sin(q * 3.1 + p[1]) * v + .15 * gust };
    }
    return { st: 1 + .13 * (F.c.lick || 1) * (Math.sin(q * 7.1 + p[0]) * .6 + Math.sin(q * 11.3 + 1) * .4),
      off: v => F.c.w * W * (F.c.lick || 1) * (.14 * Math.pow(v, 1.3) * Math.sin(v * 7 - q * 8.5 + p[1]) + .06 * Math.pow(v, 1.8) * Math.sin(q * 3.7 + p[2])),
      sq: v => 1 + .2 * (F.c.lick || 1) * v * Math.sin(q * 5.9 + v * 5 + p[0]) };
  }
  // a flame cut from scratch: wide low down, pointed, the tip thrown aside
  function tonguePath(x0, y0, hh, bw, lean) {
    const N = 9, L = [], R = [], l = bw / 2;
    for (let k = 0; k <= N; k++) {
      const v = k / N, y = y0 - hh * v, cx = x0 + lean * Math.pow(v, 1.6);
      const hw = l * Math.pow(1 - v, .8) * Math.min(1, (v + .1) * 3.2);
      L.push([cx - hw, y]); R.push([cx + hw, y]);
    }
    const pts = L.concat(R.reverse().slice(1));
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      if (k === N) ctx.lineTo(ax, ay); else ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.closePath();
  }
  function poly(pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H));
    ctx.closePath();
  }
  function cutFlame(F) {
    const c = F.c, X = c.x * W, Y = c.y * H, w = c.w * W, h = c.h * H;
    const q = Math.floor(t * CUT) / CUT, ink = c.style === 'ink', sh = flameAt(F, q);
    const other = ink ? P_PAPER : P_INK;
    if (F.outline && !F.sprite) F.sprite = cutOut(F.outline, c.under);
    ctx.save();
    if (c.base) {   // only above the logs, the wax, the lamp's burner
      const b = c.base;
      ctx.beginPath(); ctx.moveTo(b[0][0] * W, 0);
      for (const [x, y] of b) ctx.lineTo(x * W, y * H);
      ctx.lineTo(b[b.length - 1][0] * W, 0); ctx.closePath(); ctx.clip();
    }
    if (F.sprite) {
      const S = F.sprite, rows = Math.ceil(S.h), sw = S.sc.width;
      ctx.fillStyle = `rgb(${other})`; poly(F.outline); ctx.fill();     // ink over the drawn flame,
      if (S.bed) ctx.drawImage(S.bed, S.x0, S.y0, S.w, S.h);            // or the print from beside it
      for (let r = 0; r < rows; r++) {                                  // and the flame laid back on, slice by slice
        const yr = S.y0 + r, v = (Y - yr) / h;
        if (v <= 0) { ctx.drawImage(S.sc, 0, r * S.dpr, sw, S.dpr, S.x0, yr, S.w, 1); continue; }
        const k = sh.sq(v), x = X + (S.x0 - X) * k + sh.off(v), y = Y - (Y - yr) * sh.st;
        ctx.drawImage(S.sc, 0, r * S.dpr, sw, S.dpr, x, y - .08, S.w * k, sh.st + .16);
      }
    } else {        // nothing drawn: cut a small flame, its dark heart and the wick
      const hh = h * sh.st, lean = sh.off(1);
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(.6, .6 * s); ctx.strokeStyle = `rgb(${P_INK})`;
      tonguePath(X, Y, hh, w * sh.sq(.5), lean); ctx.fillStyle = `rgb(${P_CORE})`; ctx.fill(); ctx.stroke();
      tonguePath(X, Y, hh * .62, w * .55, lean * .5); ctx.fillStyle = `rgb(${P_PAPER})`; ctx.fill();
      tonguePath(X, Y + 1, hh * .28, w * .3, lean * .2); ctx.fillStyle = `rgb(${P_INK})`; ctx.fill();
    }
    ctx.restore();
  }
  function drawSparksOf(F, dt) {
    const c = F.c, X = c.x * W, Y = c.y * H, w = c.w * W, h = c.h * H;
    const q = Math.floor(t * CUT) / CUT, ink = c.style === 'ink', sh = flameAt(F, q), fill = ink ? P_INK : P_PAPER;
    // bits of flame that tear off the tips, and embers going up
    if (c.flakes || !F.calm) {
      F.fAcc += dt * (c.flakes || 1.6);
      while (F.fAcc >= 1) {
        F.fAcc -= 1;
        const u = rnd(-.3, .3), v = rnd(.75, 1);
        F.flakes.push({ x: X + u * w + sh.off(v), y: Y - h * sh.st * v, vx: rnd(-.3, .5) * w, vy: -h * rnd(1.1, 1.7), r: w * rnd(.05, .09), age: 0, life: rnd(.25, .5) });
      }
    }
    ctx.lineWidth = .6 * s; ctx.strokeStyle = `rgb(${P_INK})`; ctx.fillStyle = `rgb(${fill})`;
    for (let i = F.flakes.length - 1; i >= 0; i--) {
      const p = F.flakes[i]; p.age += dt;
      if (p.age >= p.life) { F.flakes.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const step = Math.floor(p.age * CUT) / CUT, r = p.r * (1 - step / p.life * .8);   // they shrink in cuts too
      tonguePath(p.x, p.y, r * 2.6, r * 1.3, Math.sin(p.age * 20) * r * .6);
      ctx.fill(); if (!ink) ctx.stroke();
    }
    if (c.embers) {
      F.eAcc += dt * c.embers;
      while (F.eAcc >= 1) {
        F.eAcc -= 1;
        F.embers.push({ x: X + rnd(-.4, .4) * w, y: Y - h * rnd(.3, .9), vx: rnd(-6, 10) * s, vy: -rnd(18, 34) * s, age: 0, life: rnd(1, 2.4), ph: rnd(0, 6.3), sz: rnd(.9, 1.6), warm: Math.random() < .6 });
      }
    }
    for (let i = F.embers.length - 1; i >= 0; i--) {
      const p = F.embers[i]; p.age += dt;
      if (p.age >= p.life) { F.embers.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(t * 5 + p.ph) * 9 * s) * dt; p.y += p.vy * dt; p.vy *= 1 - .4 * dt;
      ctx.globalAlpha = Math.min(1, (1 - p.age / p.life) * 1.6) * (Math.sin(t * 17 + p.ph) > -.6 ? .95 : .3);
      ctx.fillStyle = `rgb(${ink ? P_INK : p.warm ? P_CORE : P_PAPER})`;
      const z = p.sz * s;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - z); ctx.lineTo(p.x + z * .6, p.y); ctx.lineTo(p.x, p.y + z * .8); ctx.lineTo(p.x - z * .6, p.y); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- firelight, as a second plate would print it: a warm tint overprinted (multiply) on the
  // paper round the fire, the snow, the white cuts of hands and faces, in a few hard-edged carved
  // steps, not a photographic glow; the black stays black. Close to the flame a little warm light
  // is screened in too, so the nearest coats come up out of the dark. All of it swells and shrinks
  // with the fire.
  //   firelight: { x, y, r, a, sq, bands, ground: { x, y, rx, ry, a }, touch: [{ x, y, r, a }],
  //                lift: alpha of the screened light near the flame, glow: its radius (fraction of r) }
  const TINT = '246,196,128';
  function blob(x, y, r, sq, seed, jag) {
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const a = i / 36 * 6.2832;
      const d = 1 + jag * (Math.sin(a * 3 + seed + t * .35) * .5 + Math.sin(a * 7 - seed * 2 + t * .6) * .3 + Math.sin(a * 13 + seed * 3) * .2);
      const px = x + Math.cos(a) * r * d, py = y + Math.sin(a) * r * d * sq;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function steps(x, y, r, sq, a, n, seed, f, jag) {
    for (let k = 0; k < n; k++) {
      ctx.globalAlpha = a / n * (.55 + .45 * f);
      blob(x, y, r * (1 - k / (n + .4)) * (.88 + .14 * f), sq, seed + k * 1.7, jag === undefined ? .1 : jag);
      ctx.fill();
    }
  }
  function drawFireTint(fl) {           // shade layer, multiply
    const f = fireF;
    ctx.fillStyle = `rgb(${TINT})`;
    steps(fl.x * W, fl.y * H, fl.r * W, fl.sq || .85, fl.a, fl.bands || 4, 0, f);
    if (fl.ground) { const g = fl.ground; steps(g.x * W, g.y * H, g.rx * W, g.ry * H / (g.rx * W), g.a, 3, 2, f); }
    if (fl.touch) fl.touch.forEach((p, i) => steps(p.x * W, p.y * H, p.r * W, p.sq || 1, p.a, 2, i * 3.1, f));
    ctx.globalAlpha = 1;
  }
  function drawFireGlow(fl) {           // light layer, screen
    const f = fireF;
    ctx.fillStyle = `rgb(${WARM})`;
    steps(fl.x * W, fl.y * H, fl.r * W * (fl.glow || .45), fl.sq || .85, fl.lift === undefined ? .16 : fl.lift, 3, 5, f, .04);
    if (fl.touch) fl.touch.forEach((p, i) => p.lit && steps(p.x * W, p.y * H, p.r * W, p.sq || 1, p.lit, 1, i * 2.3, f, .06));
    ctx.globalAlpha = 1;
  }

  // ---- glow: a window, a lantern, a slit of grey light
  function drawGlow(gl) {
    const f = !gl.flicker ? 1 : gl.color === 'warm' && flames.length ? 1 - gl.flicker + gl.flicker * fireF : flick(4, gl.flicker);
    const x = gl.x * W, y = gl.y * H, r = gl.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col(gl.color)},${gl.a * f})`); g.addColorStop(1, `rgba(${col(gl.color)},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  }

  // ---- a shaft of light: from a window or a lamp, wider as it falls, soft at the edges.
  // It breathes slowly (clouds over the sun, the lamp flame), and if it comes through a window,
  // now and then a man walks past outside and it dims for a moment.
  function slow(seed) { return .5 + .5 * (Math.sin(t * .23 + seed) * .6 + Math.sin(t * .61 + seed * 2) * .4); }
  function drawBeam(b, dt) {
    let k = b.breathe === false ? 1 : .72 + .28 * slow(b.x * 10);
    if (b.flicker) k *= flick(5, b.flicker);
    if (b.pass) {
      passAt -= dt;
      if (passAt <= 0 && passT < 0) { passT = 0; passAt = rnd(18, 34); }
      if (passT >= 0) { passT += dt; const u = passT / 1.8; if (u >= 1) passT = -1; else k *= 1 - .65 * Math.sin(Math.PI * u); }
    }
    const x = b.x * W, y = b.y * H, w = (b.w || .04) * W, L = b.len * Math.hypot(W, H) * .6;
    const ang = b.angle * Math.PI / 180, half = (b.spread || 20) * Math.PI / 360;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const c = col(b.color || 'paper');
    // three nested passes, narrow to wide, for a soft edge
    for (const [sp, aa] of [[.55, .5], [.8, .3], [1, .2]]) {
      const h1 = half * sp, wide = w / 2 + Math.tan(h1) * L;
      const g = ctx.createLinearGradient(x, y, x + ux * L, y + uy * L);
      g.addColorStop(0, `rgba(${c},${b.a * aa * k})`); g.addColorStop(.6, `rgba(${c},${b.a * aa * k * .45})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + nx * w / 2, y + ny * w / 2);
      ctx.lineTo(x + ux * L + nx * wide, y + uy * L + ny * wide);
      ctx.lineTo(x + ux * L - nx * wide, y + uy * L - ny * wide);
      ctx.lineTo(x - nx * w / 2, y - ny * w / 2);
      ctx.closePath(); ctx.fill();
    }
    // where the shaft lands, a pool of light on the floor or the table
    if (b.land) {
      const lx = b.land.x * W, ly = b.land.y * H, rx = b.land.rx * W, ry = b.land.ry * H;
      ctx.save(); ctx.translate(lx, ly); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(${c},${b.a * .7 * k})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }
  // ---- firelight on everything near it: a wide, warm, flickering spill
  function drawSpill(sp) {
    const f = fireF, x = sp.x * W, y = sp.y * H, r = sp.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${WARM},${sp.a * f})`); g.addColorStop(.5, `rgba(${WARM},${sp.a * .4 * f})`); g.addColorStop(1, `rgba(${WARM},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- the dark of a firelit room, breathing against the fire: when it flares, the corners recede
  function drawDark(d) {
    const f = fireF, x = d.x * W, y = d.y * H, r = d.r * W;
    const g = ctx.createRadialGradient(x, y, r * .25, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${INK},${d.a * (1.25 - f * .5)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- a hanging lamp, just out of the picture, swinging a little: its pool of light moves
  function drawPool(p) {
    const sw = Math.sin(t * 2 * Math.PI / (p.period || 7)) * (p.swing || .03);
    const x = (p.x + sw) * W, y = p.y * H, r = p.r * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (p.shade) { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${INK},${p.a})`); }
    else { g.addColorStop(0, `rgba(${col(p.color || 'paper')},${p.a})`); g.addColorStop(1, `rgba(${col(p.color || 'paper')},0)`); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // ---- carved wisps: steam and breath as a block-cutter would leave them. Where a wisp crosses the
  // dark of the print it is a sliver of paper cut out of the ink; where it crosses the light it is a
  // hairline of ink left standing. It comes in pieces, pointed at both ends, that break further apart
  // as it rises, and it is recut a few times a second, never smoothly.
  // The print's lightness, coarse, decides which ink a piece is cut in.
  let lumMap = null;
  function lightAt(x, y) {
    const img = printImg;
    if (!img || !img.complete || !img.naturalWidth) return 200;
    if (!lumMap || lumMap.img !== img || lumMap.src !== img.src) {
      const w = 336, h = Math.round(w * img.naturalHeight / img.naturalWidth), c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      let d;
      try { d = g.getImageData(0, 0, w, h).data; } catch (e) { lumMap = { img, src: img.src, L: null }; return 200; }
      const L = new Uint8Array(w * h);
      for (let i = 0; i < L.length; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
      lumMap = { img, src: img.src, w, h, L };
    }
    if (!lumMap.L) return 200;
    const nw = img.naturalWidth, nh = img.naturalHeight, k = Math.max(W / nw, H / nh);
    const u = (x - (W - nw * k) / 2) / (nw * k), v = (y - (H - nh * k) / 2) / (nh * k);
    const i = Math.max(0, Math.min(lumMap.w - 1, Math.floor(u * lumMap.w))), j = Math.max(0, Math.min(lumMap.h - 1, Math.floor(v * lumMap.h)));
    return lumMap.L[j * lumMap.w + i];
  }
  // pts: the wisp's spine [[x, y], ...] in pixels; half: its half-width at the foot; broken: how much of
  // it is gone (0 whole .. 1 nothing); seed, slide: where the breaks fall, and how they travel along it;
  // a: how strong (1 full)
  function sliver(pts, half, broken, seed, slide, a, climb, inkw) {
    let piece = [], dark = null;
    const flush = () => { if (piece.length > 2) carvePiece(piece, half, dark, a, inkw); piece = []; };
    for (let i = 0; i < pts.length; i++) {
      const v = i / (pts.length - 1);
      const n = .5 + .5 * (Math.sin(v * 9.1 + seed - slide) * .6 + Math.sin(v * 23.7 + seed * 2.3 - slide * 1.7) * .4);
      if (n < broken + (climb || 0) * v) { flush(); continue; }
      const d = lightAt(pts[i][0], pts[i][1]) < 118;
      if (piece.length && d !== dark) { const p = piece[piece.length - 1]; flush(); piece.push(p); }
      dark = d;
      piece.push([pts[i][0], pts[i][1], v]);
    }
    flush();
  }
  function carvePiece(p, half, dark, a, inkw) {
    const L = [], R = [], n = p.length;
    for (let i = 0; i < n; i++) {
      const a0 = p[Math.max(0, i - 1)], a1 = p[Math.min(n - 1, i + 1)];
      let tx = a1[0] - a0[0], ty = a1[1] - a0[1];
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const u = i / (n - 1), hw = half * (1 - .45 * p[i][2]) * Math.pow(Math.sin(Math.PI * u), .55) * (dark ? 1 : inkw || .6);
      L.push([p[i][0] - ty * hw, p[i][1] + tx * hw]); R.push([p[i][0] + ty * hw, p[i][1] - tx * hw]);
    }
    ctx.globalAlpha = (dark ? .82 : .7) * a;
    ctx.fillStyle = `rgb(${dark ? P_PAPER : P_INK})`;
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ---- steam off the soup: a few wisps rising from the surface, curling, breaking up as they go,
  // each living some seconds and another coming up somewhere else
  const STEAM_CUT = 10;
  function wisp(b, q, anywhere) {
    const life = rnd(6, 10), at = b.at ? b.at[Math.floor(Math.random() * b.at.length)] + rnd(-.12, .12) : rnd(-.6, .6);
    return { u: at, back: rnd(.15, .6), born: q - (anywhere ? rnd(0, life * .8) : 0), life, ph: rnd(0, 6.3), seed: rnd(0, 50), lean: rnd(-.2, .45), amp: rnd(.7, 1.3), fq: rnd(9, 13), h: rnd(.75, 1.1) };
  }
  function drawSteam(S) {
    const b = S.b, n = b.steam === undefined ? 3 : b.steam;
    if (!n) return;
    const q = Math.floor(t * STEAM_CUT) / STEAM_CUT;
    while (S.wisps.length < n) S.wisps.push(wisp(b, q, true));
    const cx = b.x * W, cy = b.y * H, rx = b.rx * W, ry = b.ry * H, rise = (b.rise || .18) * H;
    S.wisps.forEach((w, j) => {
      let age = q - w.born;
      if (age >= w.life) { S.wisps[j] = w = wisp(b, q, false); age = 0; }
      const k = age / w.life, top = Math.min(1, age / 1.8) * w.h;
      const ends = 1 - Math.pow(Math.sin(Math.PI * k), .6);          // whole in the middle of its life
      const x0 = cx + w.u * rx, y0 = cy - ry * w.back * Math.sqrt(1 - w.u * w.u);
      const pts = [], N = 26;
      for (let i = 0; i <= N; i++) {
        const v = i / N * top;
        const amp = rise * .045 * w.amp * (.35 + v);
        pts.push([x0 + w.lean * rise * .3 * v * v + amp * Math.sin(v * w.fq - q * 2.2 + w.ph), y0 - v * rise]);
      }
      sliver(pts, (1.1 + .3 * w.amp) * s, .04 + .6 * ends, w.seed, q * 1.3, 1, .3);
    });
  }

  // ---- the soup turns a little in the bowl: its surface, cut from the print, is laid back in rings,
  // the middle turned most and the rim not at all, back and forth, so the flecks of fat and grain drift.
  // What lies in it (keep) is laid back unturned on top. While the picture's twin (ASSETS.alternate:
  // supper's lifted spoon) fades in over it, the twin's soup is stirred too, and the two crossfade.
  function stir(S) {
    const b = S.b, box4 = [[b.x - b.rx, b.y - b.ry], [b.x + b.rx, b.y - b.ry], [b.x + b.rx, b.y + b.ry], [b.x - b.rx, b.y + b.ry]];
    if (!S.sprite) S.sprite = cutOut(box4);
    const twin = box && box.querySelector('img.twin.on');
    const tw = twin && twin.complete && twin.naturalWidth ? +getComputedStyle(twin).opacity : 0;
    if (tw > .01 && (!S.twin || S.twinSrc !== twin.src)) { S.twin = cutOut(box4, null, twin); S.twinSrc = twin.src; }
    if (S.sprite && tw < .99) stirOne(S.sprite, b, 1);
    if (S.twin && tw > .01) stirOne(S.twin, b, tw);
  }
  function stirOne(sp, b, a) {
    ctx.globalAlpha = a;
    const q = Math.floor(t * CUT) / CUT;
    const th = (b.stir || 4) * Math.PI / 180 * (Math.sin(q * .42 + 1) * .65 + Math.sin(q * .17 + 4) * .35);
    const cx = b.x * W, cy = b.y * H, rx = b.rx * W, ry = b.ry * H, sq = ry / rx, R = 9;
    for (let i = 1; i < R; i++) {
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, sq);
      ctx.beginPath(); ctx.arc(0, 0, rx * (1 - i / R), 0, 6.3); ctx.clip();
      ctx.rotate(th * Math.pow(i / R, .8)); ctx.scale(1, 1 / sq); ctx.translate(-cx, -cy);
      ctx.drawImage(sp.sc, sp.x0, sp.y0, sp.w, sp.h);
      ctx.restore();
    }
    for (const [x, y, ex, ey] of b.keep || []) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x * W, y * H, ex * W, ey * H, 0, 0, 6.3); ctx.clip();
      ctx.drawImage(sp.sc, sp.x0, sp.y0, sp.w, sp.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---- breath in the cold, carved: two or three short curls leave the mouth the way he faces, drift
  // with the wind, rise a little, and break apart
  function breathe(b) {
    const n = Math.random() < .5 ? 2 : 3;
    for (let i = 0; i < n; i++) curls.push({ x: b.x * W, y: b.y * H + (i - (n - 1) / 2) * 4 * s * b.scale, dir: b.dir || 1, k: b.scale,
      born: t + i * .1, life: rnd(2.2, 2.9), ph: rnd(0, 6.3), seed: rnd(0, 50), len: rnd(.75, 1.15) * (1 - i * .15) });
  }
  function drawCurls() {
    if (!curls.length) return;
    const q = Math.floor(t * CUT) / CUT, wind = cfg.snow ? cfg.snow.wind * .25 : 6;
    for (let i = curls.length - 1; i >= 0; i--) {
      const c = curls[i], age = q - c.born;
      if (age >= c.life) { curls.splice(i, 1); continue; }
      if (age < 0) continue;
      const k = age / c.life, L = 40 * s * c.k * c.len * Math.min(1, .25 + age / .5);
      const ox = c.x + c.dir * 3 * s * c.k + wind * s * age, oy = c.y - 5 * s * c.k * age;
      const pts = [], N = 14;
      for (let j = 0; j <= N; j++) {
        const v = j / N;
        pts.push([ox + c.dir * v * L, oy - v * L * .18 + Math.sin(v * 5.5 + c.ph - age * 3) * L * .1 * (.3 + v)]);
      }
      sliver(pts, 1.7 * s * c.k, .08 + .75 * k * k, c.seed, age * 2.2, 1, 0, .8);
    }
  }

  // ---- a man breathing: his head and shoulders cut from the print and laid back lifted a hair and
  // turned about his hips as he breathes in, sinking as he breathes out. Recut like the flames, a few
  // times a second. What is cut is the man's ink and a little snow round it, not the box: thin lines
  // (the horizon, streaks of snow) are opened out of the cut so they stay where they are, and the box's
  // edges are feathered where it crosses him, so no seam shows.
  //   lift: [{ box: [x0, y0, x1, y1], pivot: [x, y], rise (fraction of the height), turn (degrees),
  //            shift: [dx, dy] (fractions, a hand going to the fire), period (seconds), ph (0..1),
  //            feather: [top, right, bottom, left] as fractions of the box (default [0, .1, .2, .1]: his
  //            head stands clear against the snow, the box cuts through him at the sides and below) }]
  function liftSprite(c) {
    const [x0, y0, x1, y1] = c.box;
    const sp = cutOut([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    if (!sp) return null;
    const g = sp.sc.getContext('2d'), w = sp.sc.width, h = sp.sc.height, f = c.feather || [0, .1, .2, .1];
    try {
      const im = g.getImageData(0, 0, w, h), d = im.data, m = new Uint8Array(w * h);
      for (let i = 0; i < m.length; i++) m[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11 < 95 ? 255 : 0;
      const r = Math.max(1, Math.round(2.2 * sp.dpr * s)), grow = Math.max(2, Math.round(3.5 * sp.dpr * s));
      let k = morph(m, w, h, r, false);                  // open: thin lines go, the man stays
      k = morph(k, w, h, r + grow, true);                 // and grow it by a margin of snow
      k = morph(k, w, h, 1, null);                        // a soft edge
      for (let i = 0; i < k.length; i++) d[i * 4 + 3] = d[i * 4 + 3] * k[i] / 255;
      g.putImageData(im, 0, 0);
    } catch (e) {}
    g.globalCompositeOperation = 'destination-out';
    const edge = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => {
      const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
    };
    const [ft, fr, fb, fl] = f.map((v, i) => v * (i % 2 ? w : h)) ;
    if (fl) edge(0, 0, fl, 0, 0, 0, fl, h);
    if (fr) edge(w, 0, w - fr, 0, w - fr, 0, fr, h);
    if (ft) edge(0, 0, 0, ft, 0, 0, w, ft);
    if (fb) edge(0, h, 0, h - fb, 0, h - fb, w, fb);
    g.globalCompositeOperation = 'source-over';
    return sp;
  }
  // erode (grow false), dilate (true) or blur (null) a mask by a square of radius r, in two passes
  function morph(src, w, h, r, grow) {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    const pass = (a, b, n, len, step, stride) => {
      for (let o = 0; o < n; o++) for (let i = 0; i < len; i++) {
        let v = grow === false ? 255 : 0, sum = 0, cnt = 0;
        for (let j = Math.max(0, i - r); j <= Math.min(len - 1, i + r); j++) {
          const x = a[o * stride + j * step];
          if (grow === null) { sum += x; cnt++; } else if (grow) { if (x > v) v = x; } else if (x < v) v = x;
        }
        b[o * stride + i * step] = grow === null ? sum / cnt : v;
      }
    };
    pass(src, tmp, h, w, 1, w);      // along the rows
    pass(tmp, out, w, h, w, 1);      // down the columns
    return out;
  }
  function liftAt(c, q) { return .5 - .5 * Math.cos(2 * Math.PI * (q / c.period + (c.ph || 0))); }
  function cutLift(L) {
    const c = L.c;
    if (!L.sprite) L.sprite = liftSprite(c);
    const sp = L.sprite;
    if (!sp) return;
    const k = liftAt(c, Math.floor(t * CUT) / CUT), px = c.pivot[0] * W, py = c.pivot[1] * H;
    const sh = c.shift || [0, 0];
    ctx.save();
    ctx.translate(px, py); ctx.rotate((c.turn || 0) * Math.PI / 180 * k); ctx.translate(-px, -py);
    ctx.translate(sh[0] * W * k, (sh[1] - (c.rise || 0)) * H * k);
    ctx.drawImage(sp.sc, sp.x0, sp.y0, sp.w, sp.h);
    ctx.restore();
  }

  // ---- cloud shadows drifting over the snow
  function drawClouds(c, dt) {
    for (let i = 0; i < clouds.length; i++) {
      const q = clouds[i];
      q.x += q.v * dt;
      if (q.x - q.r > W) clouds[i] = cloud(c, false);
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, q.sq);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r);
      g.addColorStop(0, `rgba(${INK},${c.a * q.a})`); g.addColorStop(.6, `rgba(${INK},${c.a * q.a * .5})`); g.addColorStop(1, `rgba(${INK},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, 6.3); ctx.fill(); ctx.restore();
    }
  }

  // ---- searchlight: a slow sweep from the tower
  function drawSweep(sw) {
    const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / sw.period);
    const ang = (sw.a0 + (sw.a1 - sw.a0) * k) * Math.PI / 180, half = sw.spread * Math.PI / 360;
    const x = sw.x * W, y = sw.y * H, L = sw.len * W;
    // over a dark sky the beam is paper light, screened in; over a light sky it is a
    // faint warm overprint, multiplied, the way a second plate would carry it
    const warm = sw.color === 'warm', c = warm ? WARM : PAPER, m = sw.a || 1, a0 = (warm ? .34 : .30) * m, a1 = (warm ? .15 : .11) * m;
    const g = ctx.createRadialGradient(x, y, 0, x, y, L);
    g.addColorStop(0, `rgba(${c},${a0})`); g.addColorStop(.55, `rgba(${c},${a1})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - half) * L, y + Math.sin(ang - half) * L);
    ctx.lineTo(x + Math.cos(ang + half) * L, y + Math.sin(ang + half) * L);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---- dust in a shaft of light
  function drawMotes(dt) {
    const [rx, ry, rw, rh] = cfg.motes.region;
    ctx.fillStyle = `rgb(${PAPER})`;
    for (const m of motes) {
      m.vx += rnd(-6, 6) * dt; m.vy += rnd(-6, 6) * dt;
      m.vx *= .98; m.vy *= .98;
      m.x += m.vx * s * dt; m.y += (m.vy + 1.5) * s * dt;
      if (m.x < rx * W) m.x = (rx + rw) * W; if (m.x > (rx + rw) * W) m.x = rx * W;
      if (m.y > (ry + rh) * H) m.y = ry * H; if (m.y < ry * H) m.y = (ry + rh) * H;
      ctx.globalAlpha = .18 + .14 * Math.sin(t * 2 + m.ph);
      ctx.fillRect(m.x, m.y, 1.1 * s, 1.1 * s);
    }
    ctx.globalAlpha = 1;
  }

  // ---- film grain, barely there
  function drawGrain(now) {
    if (now - grainAt > 90) { grainAt = now; grainIdx = (grainIdx + 1) % grain.length; }
    ctx.save(); ctx.globalAlpha = .18;
    ctx.fillStyle = ctx.createPattern(grain[grainIdx], 'repeat');
    ctx.translate((grainIdx * 37) % 160, (grainIdx * 53) % 160);
    ctx.fillRect(-160, -160, W + 320, H + 320); ctx.restore();
  }

  // where the eye goes in this picture: the first effect placed by hand on it (fire, lamp, window, tower)
  function focusOf(key) {
    const c = configFor(key);
    const fl = c.flame && [].concat(c.flame)[0];
    if (fl) return [fl.x, fl.y - fl.h * .5];
    if (c.soup) return [c.soup.x, c.soup.y];
    const e = c.ember || (c.glow && c.glow[0]) || c.sweep || c.smoke || (Array.isArray(c.breath) && c.breath[0]);
    return e ? [e.x, e.y] : null;
  }
  // advance(secs): stop the clock and step the overlay by hand, for looking at it headlessly
  function advance(secs) { stop(); const n = Math.round(secs * 30); for (let i = 0; i < n; i++) frame(1 / 30, performance.now()); }
  return { mount, set, resize, focusOf, advance, state: () => ({ name, cfg: !!cfg, running: !!raf, W, H, snow: snow.length, puffs: puffs.length, curls: curls.length, flames: flames.length, lifts: lifts.length, wisps: soup ? soup.wisps.length : 0, t: Math.round(t) }) };
})();
window.FX = FX;
