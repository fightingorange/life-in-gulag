# Frames for "Ten Years" — shot list for Codex / image generation

Generate 12 still frames. Every prompt uses the same style prefix so the set reads as one hand.
Produce 3 or 4 variants per frame, pick one, save it as `assets/frames/<name>.png` (16:9, at least 1600×900).

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
