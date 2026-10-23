# Ten Years — shared production direction

This supplements the locked prefix and all three shot sets in `frames.md` (thirty-seven frame names).

## Visual continuity

- A coherent series of coarse, spare hand-carved linocuts. Broad black masses, blunt irregular gouge cuts, short broken hatching only where needed. Make every object legible at 648 pixels wide.
- One near-black ink on a single pale aged-ivory paper stock. Black and paper are the only tonal materials. Grain comes from minute breaks in the ink and paper fibres, never grey washes, soft shading, gradients, sepia photography, or extra pigments.
- Full-bleed horizontal composition, exactly 16:9, request 2048 by 1152 pixels, minimum 1600 by 900. No white border, panels, captions, symbols, lettering, or watermark.
- Eye-level, unheroic observational framing. Quiet everyday endurance. Avoid cinematic spectacle, melodrama, heroic propaganda poses, ornamental Soviet insignia, picturesque ruins, and exaggerated anatomy.
- Worn padded jackets, simple caps or earflap hats, felt boots, plain plank buildings and utilitarian objects suitable to the existing 1951 setting. Figures remain silhouettes with at most a few carved marks, no detailed faces.
- Snow and light are untouched paper. Night is broad black ink interrupted by sparse cream cuts. Fire and stove light have no coloured or luminous gradients.
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
- Preserve the original nineteen masters. Export new masters and all candidate variants as quality-82 web JPEGs. Regenerate their depth maps with the existing `scripts/depth.py` pipeline.
