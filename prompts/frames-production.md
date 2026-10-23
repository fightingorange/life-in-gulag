# Ten Years — shared production direction

This supplements the locked prefix and all five shot sets in `frames.md` (sixty-one scene masters and eighteen production figure poses).

## Visual continuity

- A coherent series of coarse, spare hand-carved linocuts. Broad black masses, blunt irregular gouge cuts, short broken hatching only where needed. Make every object legible at 648 pixels wide.
- One near-black ink on a single pale aged-ivory paper stock. Black and paper are the only tonal materials. Grain comes from minute breaks in the ink and paper fibres, never grey washes, soft shading, gradients, sepia photography, or extra pigments.
- Full-bleed horizontal composition, exactly 16:9, request 2048 by 1152 pixels, minimum 1600 by 900. No white border, panels, captions, symbols, lettering, or watermark.
- Eye-level, unheroic observational framing. Quiet everyday endurance. Avoid cinematic spectacle, melodrama, heroic propaganda poses, ornamental Soviet insignia, picturesque ruins, and exaggerated anatomy.
- Worn padded jackets, simple caps or earflap hats, felt boots, plain plank buildings and utilitarian objects suitable to the existing 1951 setting. Figures remain silhouettes with at most a few carved marks, no detailed faces.
- Light is bare paper. Snow carries packed walking routes, overlapping bootprints, sledge runners and log-drag grooves. Night is broad black ink interrupted by sparse cream cuts. Fire and stove light have no coloured or luminous gradients.
- Keep important subjects within the central 85 percent of the composition; leave breathing room around them.

## Shared barracks design

For `hut_morning`, `hut_night`, `dead`, `stove`, `letter`, `blizzard`, and `easter`: rough two-tier plank bunks, thick square uprights, three long boards per sleeping platform, a simple diagonal brace. Narrow central aisle, horizontal plank walls, low ceiling beams. A small rectangular ice-clouded window at the far end. No mattresses, pillows, decorative furnishings, or readable signs. Keep the same construction across the barracks images. In `dead`, focus closely on an empty lower bunk made this way, with a single wooden spoon on its boards and the place beneath it empty of boots.

## Variant strategy

Produce three separate image files per shot. The scene and medium stay fixed; vary only the placement, distance, and distribution of black ink versus open paper. Every variant must include all required narrative objects. Choose the clearest, quietest version and copy it to `assets/frames/<name>.png`.

If a selected composition needs a targeted correction, preserve that correction as a fourth variant. The second set's inspection scene uses this to clarify the ranks of five. Export selected masters to `assets/frames/web/<name>.jpg` with `sips -s format jpeg -s formatOptions 82 assets/frames/<name>.png --out assets/frames/web/<name>.jpg`.

Record the exact generation prompts and original output paths in each group's production JSON under `assets/frames/production/`. Preserve the three variants under `assets/frames/variants/` so selections remain reviewable.

## Third-set continuity

- Treat lighting, ration, supper and later construction stages as edits of the specified masters. Candidate variants must preserve the viewpoint; they are review alternatives, not alternate camera angles for the game to cycle through.
- The three morning lights use the same `hut_morning.png` input. Express grey light and shadows through carved density, retaining the two inks.
- Breakfast changes only the bread. Supper keeps the bowl in its original position; the spoon-lift companion uses the selected supper master as its input. Generated twins preserve visual registration but can retain small ink/paper texture differences outside the hand; inspect the slow fade before promising pixel identity.
- Reuse `site.png` byte for byte as `site_settlement_1.png`. Edit later site stages from their selected stage-one master to keep landmarks aligned.
- The v5 prompt authorizes replacing the five meal masters and adding tracks to seventeen existing outdoor masters. Their previous versions are preserved under `assets/frames/production/archive-before-v5/`; earlier candidate files remain untouched. Export new masters and all candidate variants as quality-82 web JPEGs. Regenerate their depth maps with the existing `scripts/depth.py` pipeline.

## Layers, sequences and arrival

- The v4/v5 production pass runs four parallel agent groups. Independent candidates are generated concurrently; plates and companion poses use selected masters as edit inputs.
- Save this pass's three candidates per state under `assets/frames/variants/v5/`, with quality-82 review JPEGs in `web/variants/v5/`. Save selected figures as opaque cream-paper PNGs under `assets/frames/figures/`. The game's multiply compositor levels their paper to white.
- Plates remove only the designated workers and their moving props. Preserve architecture, work stages, fire, landmarks, snow routes and lighting. Paired poses retain canvas geometry; small generated ink and paper differences can remain outside the action.
- The tracked gate is reused byte for byte as `gate_search`, which the shot list permits. `gate_empty` and `gate_next` are registered edits of it. Reveille's after-action image shares the tracked reveille master.
- New crowded breakfast and supper pictures derive from `mess_table`; the three bread rations differ visibly. Supper has no bread anywhere, and its companion changes the spoon gesture only.
- `hut_night_pano` uses a true 3:1 composition. The built-in tool returned a native 2172 × 724 selected image; its native candidate is preserved, and the delivery master is resampled with `sips` to the requested 4800 × 1600. The export adds no native detail. The near-right lower berth is reserved for the three sleeper poses.
- Calibrate sprite paper margins, anchors and scale against the actual plates. Keep review candidates out of the game's daily camera-variant rotation so their registration stays fixed. Exact prompts, native source paths and selections are recorded in the four `production/v5-*.json` group files linked by the review gallery.
