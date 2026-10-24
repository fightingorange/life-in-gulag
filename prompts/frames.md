# Frames for "Ten Years" — shot list for Codex / image generation

Generate 12 still frames. Every prompt uses the same style prefix so the set reads as one hand.
Produce 3 or 4 variants per frame, pick one, save it as `assets/frames/<name>.png` (16:9, at least 1600×900).

## For Codex: what is needed now (24 October 2026)

Claude leads the game's design and code (see `notes/design-2026-10-24.md`); this section is the standing
list of what the art, sound and voice side needs. Check it now and then; strike items as they land. Every
name below already has a stand-in or is skipped gracefully by the game, so nothing is blocked on it.

### Voice and sound: not Codex's

The voice lines and the sound effects are recorded by Claude from `assets/manifest.json` with the scripts
in `scripts/`; Codex need not run them. (Several were recorded from an earlier version of this brief,
with thanks; they are committed.) This section is for pictures only.

### Sixth set: two prints for the late winter (v6)

Same style prefix, rules and production notes as before. The snow is lived on.

67. **banya** (stand-in: cells) — The camp bathhouse from inside, at night: a low plank room full of steam,
    one small lamp, a row of wooden tubs on a bench, men in silhouette washing, one pouring a tin of water
    over his head, clothes in bundles on hooks along the wall, a stove with a boiler. Steam is carved
    paper; the dark is ink. Crowded, quiet, no faces.
69. ~~**arrival_crack**~~ (landed 24 October) (stand-in: arrival_railhead) — What the eye at the crack between the wagon's boards
    sees: the slit itself as a black frame, and through it, moving past, snow and black trees, and once a
    station platform with no name on it, a woman in a shawl holding a child by the hand, looking at the
    wagon and then away. Mostly black; the world a narrow bright strip.
70. ~~**arrival_gate, redone at night**~~ (landed 24 October) — the present print is drawn in daylight, and the screen is night
    (the march arrives after dark; the lights of the camp were seen from the road). An edit of the
    existing picture: the same gate, column and guard, but night: the sky and the ground black ink, the
    lamp on the arch and the searchlight beams the only paper, breath and the lamp's pool of light on the
    snow. Until it lands the page darkens the daylight print (`ASSETS.dark`).
71. **yard_night** (stand-in: count_camp) — The street between two barracks at night, empty: trodden snow,
    the lamps on their poles with their pools of light, the dark long walls of the huts with one or two
    windows faintly lit, the wire and a tower at the end with the searchlight's beam across the snow. No
    people. Seen from a hut doorway.
72. **hut_outside_night** (stand-in: gate) — One barracks from outside at night, close: the long plank wall,
    the low roof under snow, the stove pipe with smoke going sideways, one window lit from inside and iced,
    a path trodden to the door, the door shut. The rest dark.
68. **river_thaw** (stand-in: river) — The river in April from the bank, before it breaks: the ice still
    whole but grey and sunk in the middle, water standing on it in dark sheets, a black lead of open water
    along the near bank where a spring comes in, a single man's track down to it and back. Wide sky, the
    far bank low. No column, no guards.

### Still open from earlier sets

- The motion loop test for the stove (`prompts/motion.md`): nothing in `assets/frames/motion/` yet.
- Any figure from set five that is not in `assets/frames/figures/` (all nineteen are there at the time
  of writing; this line is for the next set).

## Style prefix (paste before every shot, never change it)

> Two-tone linocut print, black ink on aged cream paper, heavy grain and ink texture, bold carved shapes, high contrast, no mid-tones, no color. Soviet-era print aesthetic, 1951, a labour camp in the far north. Figures are silhouettes or carved outlines, no detailed faces. No text, no lettering, no watermark. Wide 16:9 composition, lots of empty paper and empty snow. Quiet, documentary, not dramatic.

## Negative / rules

- No faces in detail. No tears, no screaming, no theatrical poses.
- No red, no color at all. No photographic realism.
- No barbed wire clichés in frames that are not about the wire.
- No text anywhere in the image.

## Shots

1. **title** — A single hanging iron rail on a post against an empty sky, a hammer leaning beneath it, snow. Nothing else.
2. **hut_morning** — Interior of a long wooden barracks before dawn: rows of two-tier plank bunks receding into dark, one small window with thick ice, a pair of felt boots hanging from the upper bunk in the foreground.
3. **count** — Hundreds of men standing in fives in the dark on open snow, seen from behind, wind pulling at jackets, a single guard with a lantern at the far end, a wooden tower in the distance.
4. **table** — A rough plank table, a tin bowl of thin soup, a small dark piece of bread beside it, a wooden spoon, one pair of hands. Nothing else on the table.
5. **site** — A frozen field of half-dug pits with men swinging picks, a half-built brick wall, a lean-to with a smoking stove in the corner, flat white horizon.
6. **noon** — A small illegal fire of scrap wood in the snow, three or four men crouched around it with their backs to the wind, steam from breath.
7. **gate** — The camp gate from inside: a wooden arch, two guards searching a man with his jacket open and arms out, the column waiting behind, a searchlight on the tower.
8. **hut_night** — The barracks at night: a stove glowing faintly, bodies on bunks, boots and foot cloths drying on strings above the stove, one man awake looking at the ceiling.
9. **cells** — A tiny plank cell, a bunk nailed up against the wall, a man sitting on the edge of a bare board, a slit of grey light, nothing else.
10. **wire** — A rotten fence post with wire sagging, a gap, the taiga beyond, a tower far away, the whole frame mostly dark.
11. **river** — A frozen river seen from the bank, one small figure walking away on the ice, a thin line of smoke on the far horizon.
12. **dead** — An empty lower bunk, a wooden spoon lying on the boards, boots gone.

## Also useful (optional)

- A portrait-free "cast" sheet: five silhouettes with props only (a notebook, a parcel, a work sheet, a thin coat, a pipe) for Lubimov, Fomin, Pasha, Lev, Kuzma. For future dialogue cards.

## Second set: seven frames for the winter calendar (v2)

Same style prefix, same rules, same production notes (`frames-production.md`). Save as `assets/frames/<name>.png`, then make the web copy:
`sips -s format jpeg -s formatOptions 82 assets/frames/<name>.png --out assets/frames/web/<name>.jpg`.
Until a frame exists the game shows its stand-in (in brackets), so these can arrive in any order.

13. **stove** (stand-in: hut_night) — The barracks stove at the centre, glowing through its door slits. Around it, crowded tight, a ring of seated and crouching silhouettes, the nearest with their backs to us. On one side three men sit apart and at ease, one with a cap pushed back: the urki. A space two men wide between the groups. Boots and foot cloths on strings above.
14. **letter** (stand-in: hut_morning) — Close on a bare plank bunk: an opened envelope with a torn edge, a folded letter with some lines blacked out by the censor (black bars, no readable text), a small opened parcel with a knitted sock spilling out, a stub of pencil. Grey window light from one side.
15. **inspection** (stand-in: count) — On packed snow before the camp gate, three officials in long good coats and fur hats and a woman holding a notebook, seen from behind the prisoners' column. The commandant a step behind them. The column in fives in the foreground, backs to us. Swept paths, a fresh-limed post.
16. **blizzard** (stand-in: hut_night) — The barracks window at night seen from inside, the frame of a bunk in the near foreground, a sleeping silhouette. Through the glass, nothing but driving diagonal snow; no tower, no searchlight, no fence visible. Snow packed on the sill.
17. **office** (stand-in: table) — A small camp office: a plank desk with a lamp, an abacus, stacked ledgers, a large folded map with the line of a river on it (no lettering). A thin young prisoner in a padded jacket bent over it with a pencil, seen in profile as a silhouette.
18. **easter** (stand-in: hut_night) — On the edge of a plank bunk, a single boiled egg on a scrap of cloth beside a candle stub, its small flame a carved cut in the black. Behind, out of focus, the stove and the bunks. Quiet, devotional, no icons, no crosses.
19. **ice_out** (stand-in: river) — The river in May breaking up: huge cracked plates of ice tilting and piled against each other, black open water between them, a low bank with a small column of prisoners and two guards standing still, watching. Wide sky, a little smoke on the far horizon.

## Third set: pictures that follow what is happening (v3)

Same style prefix, rules and production notes as before. Most of these are **edits of an existing master**,
so the composition stays identical and the game's light (windows, lamp, soup) still lines up: give the
master to the image tool and ask for only the change described. Save each as `assets/frames/<name>.png`,
then `sips -s format jpeg -s formatOptions 82 assets/frames/<name>.png --out assets/frames/web/<name>.jpg`.
Every one has a stand-in in the game until it exists (`js/assets.js`), so they can arrive in any order.

### Reveille

20. **reveille** (new) — Before dawn, outside the staff hut. A man in a sheepskin coat swings a hammer at
    a length of iron rail hanging from a post, caught mid-swing. A lantern on a nail lights him and the
    rail; everything else is night: the dark huts, a searchlight beam far off, snow. The hammer and the rail
    must read at a glance. (Stand-in: the title print.)

### The hut at reveille, in three lights — edits of `hut_morning.png`

The light of the morning changes over the winter, and the hut should show it, with real shadows.

21. **hut_morning_dark** (January, February) — The window is black. A single bare electric bulb hangs on
    a wire from the ceiling beam in the middle of the aisle and is the only light: a hard pool of it on
    the floor, the uprights of the bunks throwing long shadows away from it, the far end lost in black.
22. **hut_morning_grey** (March) — The window is a grey square; flat grey light lies along the floor of the
    aisle, the bunk uprights throw soft, short shadows towards the viewer. The bulb hangs unlit.
23. **hut_morning_sun** (April, May) — Low sun comes in through the window: a bright shaft falls across
    the floor towards the viewer, the window frame's cross is printed in light on the boards, and every
    bunk upright throws a long, hard, diagonal shadow across the floor. Dust in the shaft.

### Breakfast: the ration, at its true size — edits of `table.png`

550 grams of camp rye bread is a dense, heavy block: about a quarter of a loaf, roughly 12 × 9 × 8 cm,
thick crust, cut with a blunt knife. The current picture shows a slice. Change only the bread; keep the
bowl, the spoon, the hands and the table exactly as they are.

24. **breakfast_550** — the bread as a heavy quarter-loaf block, sitting where the slice is now.
25. **breakfast_400** — a noticeably smaller, thinner piece: an end, the heel of the loaf, clearly less.
26. **breakfast_650** — a noticeably bigger block, almost a third of a loaf, for the commission's days.

The three must differ at a glance; the player should see the ration change.

### Supper, and the hands moving — edits of `table.png`

27. **supper** — the evening: no bread at all. The bowl is fuller, skilly with groats in it, steam rising
    in carved lines. The right hand holds the wooden spoon, its bowl in the soup; the left hand steadies
    the bowl's rim.
28. **supper_b** — exactly the same picture, but the right hand has lifted the spoon a little out of the
    bowl, a drip falling from it. Nothing else changes, not even a line.

The game fades slowly between `supper` and `supper_b`, so the hand seems to move; the closer the two are
except for the hand and spoon, the better it works.

### The work, as it goes on over the winter

Each site in three stages, from the same viewpoint, so the work visibly progresses. Stage 1 is
January, stage 2 February and March, stage 3 April and May. Make stage 1 first, then stages 2 and 3 as
edits of it.

29. **site_power_1** — The power station: a brick wall going up, one storey high, with bare wooden
    scaffolding, men on planks laying bricks, a mortar box steaming over a brazier, snow everywhere.
30. **site_power_2** — The same wall, now two storeys, scaffolding taller, a hoist with a bucket.
31. **site_power_3** — The same building, roof beams going on, the scaffolding wet, snow melting to mud.
32. **site_settlement_1** — The settlement (the current `site.png` is this; it can be kept as stage 1):
    shallow pits in frozen ground, men with picks, the carpenters' shed with its stove pipe.
33. **site_settlement_2** — The same field: the pits deeper, shored with timber, spoil heaps beside them.
34. **site_settlement_3** — The same field: timber foundation frames standing in the pits, slush and water.
35. **site_timber_1** — The river bank: two men to a log hauling it up the bank to a sledge, logs half
    buried in snow, the frozen river behind.
36. **site_timber_2** — The same bank: a stack of logs grown taller than a man.
37. **site_timber_3** — The same bank: a great stack; the river ice grey and cracked, open water in places.

## Fourth set: layers and moments (v4)

So far a scene is one still picture. From here some scenes are **composited**: a background plate, with
figures drawn separately and moved over it by the game (js/sprites.js), or a short **sequence** of
pictures the game cycles while the screen is up (js/frames.js). Same style prefix and rules as before.

Rules for plates and figures:
- A **plate** is the scene with the moving figures removed, everything else identical (an edit of the
  existing picture). Leave the ground where the figures were plausible: tracks in the snow, nothing
  conspicuous.
- A **figure** is drawn alone on plain cream paper, nothing else in the picture: no ground, no horizon, no
  frame. Only a small contact shadow under the feet. Same scale, angle and light as in the scene it
  belongs to, so it can be laid over the plate. The game blends figures with *multiply*, so the paper
  vanishes and only the ink remains: keep the figure's own light areas as carved paper inside a clear
  ink outline. Save figures as `assets/frames/figures/<name>.png` (PNG, at least 1200 px wide).
- A **sequence** is several edits of one picture that differ only in what happens. Keep everything else
  identical, down to the line.

### The count, inside the camp

38. **count_camp** — The morning count happens inside the zone, not in a field. Night, before dawn. A
    street of trampled snow between two long barracks; the prisoners stand in rows of five down the
    middle of it, backs to us, breath rising; lamps on poles throw pools of light on the snow; at the
    end of the street the wire and a watchtower with its searchlight; a guard with a lantern and a
    board walks along the front row. (Replaces `count`, which is in an open field.)

### The gate in the evening: three beats — edits of `gate.png`

The game cycles these while the gate screen is up: a man searched, the spot empty and a guard calling
"Next!", the next man stepping up. They must match exactly except for the people at the search spot.

39. **gate_search** — a prisoner with his jacket open and arms out, a guard patting him down, another
    watching (as in the current picture).
40. **gate_empty** — the search spot empty: the two guards waiting, one beckoning with a raised hand
    towards the column; the column waits behind as before.
41. **gate_next** — the next prisoner has stepped up to the spot, arms half raised, opening his jacket;
    the guards turning to him.

### The timber bank: the haulers really haul

42. **site_timber_plate_1**, **site_timber_plate_2**, **site_timber_plate_3** — edits of
    `site_timber_1/2/3` with the two men and their log removed: the slope with the drag track in the
    snow, the stack and the river as in each stage.
43. **figure: haulers_a** and **figure: haulers_b** — the two men hauling the log up the bank by ropes,
    seen exactly as in `site_timber_1`, on plain paper; two poses of the same effort (a: leaning into it,
    one foot forward; b: the next step, ropes taut), same scale and position in the drawing, so the game
    can alternate them as it moves the pair up the slope.

### Optional, if there is time

44. **figure: guard_lantern** — the guard with the lantern and board from `count_camp`, alone on paper,
    to walk along the front row.
45. **figure: column_man_a/b** — one prisoner in a padded jacket walking, seen from behind, two steps,
    for the column moving through the gate.

## Fifth set: the arrival, the hut at its true size, people who move (v5)

Same style prefix, rules and production notes. Plates, figures and sequences as defined in set four.
Every name below has a stand-in in the game already (`js/assets.js`), so they can arrive in any order.

**One rule for every outdoor picture from now on, old and new: the snow is lived on.** Trodden paths
between the huts, packed tracks where the column walks, footprints, the runners of a sledge, a dark
line where a man dragged something. Inside the camp no snow is untouched. Out in the country, the column's
own track behind it.

### A. The arrival

The player now arrives: days in a prison wagon, a long march from the railhead, the gate at night,
processing, the hut. These pictures carry the first ten minutes of the game.

46. **arrival_wagon** — Inside a closed wooden goods wagon in winter, half dark. Two tiers of rough plank
    shelves on both sides packed with men lying and sitting in coats, a small iron stove in the middle with
    a pipe through the roof, a barred slit of a window high up letting in one grey stripe of light, frost
    on the planks. Seen from the floor near the door.
47. **arrival_railhead** — The train stopped in empty white country: a line of dark goods wagons, one door
    rolled open, men climbing down into knee-deep snow with bundles. A row of guards with rifles and two
    dogs on leashes along the track. No station, only a water tower and a hut.
48. **arrival_march** — The column strung out across flat white country under a low sky, seen from inside
    it, slightly above: the backs of the men in fives ahead, bundles on their shoulders, a guard on each side
    a few paces off with a rifle, one with a dog. The column's track behind it, nothing else on the plain.
49. **arrival_march_dusk** — the same march hours later: the light nearly gone, the column smaller and
    straggling, and far ahead, low on the horizon, a row of lights on poles and the dark shapes of towers:
    the camp. (An edit of 48 is ideal.)
50. **arrival_gate** — The camp gate at night from outside: the wooden arch with its lamp, the gates
    open, the new column halted in fives in front of it in the snow, a guard with a board counting them
    through, searchlight beams crossing above. (Different from `gate`, which is seen from inside.)
51. **arrival_processing** — Inside the guardhouse: a plank table with an oil lamp and an open register,
    a clerk in uniform writing; before the table one prisoner standing with his cap in his hand, his bundle
    opened on the floor; along the wall a bench of men waiting. Hard lamplight, deep shadows.
52. **arrival_hut** — The barracks in the evening, everyone awake: new men standing in the aisle with
    their bundles, not knowing where to go; old prisoners on the bunks looking at them; in the foreground,
    on a lower bunk, an older man sitting with his elbows on his knees, the one who will explain how it
    works. The stove lit.

### B. The hut at its true size, and a slow look round it

The current hut reads as a room for twenty or forty. A camp barracks held two hundred.

53. **hut_night_pano** — A wide panorama, **3:1** (at least 4800 × 1600), of a long barracks at night
    seen from eye level near the middle of the aisle, so that the game can turn slowly across it like a
    head turning: two-tier bunks ("vagonki") in long rows on both sides running away into the dark, both
    ends of the hut visible at the far left and far right, two iron stoves glowing at intervals, one dim
    bulb, felt boots and foot cloths hanging on strings over the stoves, bodies on every bunk, a few men
    sitting up. **On one lower bunk in the near right third, the blanket and the boards are drawn with
    nobody in them**: a figure will be laid there.
54. **figure: sleeper_turn_a / sleeper_turn_b / sleeper_turn_c** — one man in a padded jacket lying on
    that bunk under a thin blanket, alone on paper, at exactly the scale and angle of that bunk in 53: (a) on
    his back, (b) half turned onto his side, (c) on his side facing the wall, knees drawn up. The game cuts
    between them every half minute or so, with a creak.

### C. Reveille, after the rail

55. **reveille_after** — an edit of `reveille`: the rail has been struck. The same man stands at ease
    beside the post, the hammer hanging at his side, looking towards the huts; the rail still. Everything
    else exactly the same, line for line, so the lantern's light still fits.

### D. The mess table, crowded — new master, then edits

The breakfast and supper pictures look like a laid table in a still life: one bowl, the spoon placed
beside it. A camp mess hut is crowded and nobody lays anything.

56. **mess_table** — A long plank mess table seen from the place of one man sitting at it, looking down:
    his own tin bowl close in front of him, his two hands, and on both sides of him other men's elbows,
    sleeves and bowls, shoulder to shoulder on the bench; across the table more men bent over their bowls,
    heads down, caps on; spilled soup and bread crumbs on the boards; steam. His right hand holds the
    wooden spoon in the bowl. Nothing is arranged.
57. **breakfast_550 / breakfast_400 / breakfast_650** — edits of 56 with the bread beside his bowl, sizes
    as in set three (a heavy quarter-loaf block; the heel, clearly less; almost a third of a loaf).
58. **supper / supper_b** — edits of 56, no bread anywhere, as in set three: (a) spoon in the soup, the left
    hand steadying the rim; (b) the spoon lifted, a drip falling. These replace the current ones.

### E. Work that moves — plates and figures

A man caught mid-swing for half a minute looks frozen. The workers become figures the game moves:
each figure in two or three poses, cut between in time with the sound of the blow.

59. **site_settlement_plate_1 / _2 / _3** — edits of `site_settlement_1/2/3` with the men who dig
    removed (the ground where they stood trodden).
60. **figure: digger_a / digger_b** — a man with a pick, as the nearest digger in `site_settlement_1`,
    same scale: (a) the pick raised over his shoulder, (b) the pick driven into the ground, back bent.
61. **figure: shoveller_a / shoveller_b** — a man with a shovel: (a) the blade pushed into the spoil,
    (b) throwing the spoil over his shoulder.
62. **site_power_plate_1 / _2 / _3** — edits of `site_power_1/2/3` with the bricklayers on the
    scaffolding removed.
63. **figure: bricklayer_a / bricklayer_b** — a man on the scaffold planks, as the nearest bricklayer in
    `site_power_1`: (a) bent to the mortar box with a trowel, (b) upright, setting a brick on the wall.
64. **figure: axeman_a / axeman_b** — for the timber bank: a man trimming a log with an axe, (a) the axe
    raised, (b) the axe in the wood. Same scale as the haulers in `site_timber_1`.

### F. Noon: the men move with the fire

65. **noon_plate** — an edit of `noon` with the crouching men removed: the fire, the scrap wood, the
    trodden snow round it.
66. **figure: noon_men_a / noon_men_b** — the group of crouching men as in `noon`, as one figure:
    (a) hands held out to the fire, (b) the same men a moment later: one rubbing his hands, one with his
    head turned away from the smoke, one shifted on his heels. Same position and scale.

### G. Tracks in the snow — edits of existing pictures, saved under the same names

Edits, not new compositions, so the game's light still lines up. Add only trodden paths, footprints and
sledge tracks as in the rule above: `count`, `gate` (and `gate_search`, `gate_empty`, `gate_next`),
`inspection`, `noon`, `reveille`, `wire`, `river`, `site_*` (all nine), `ice_out`.
