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
