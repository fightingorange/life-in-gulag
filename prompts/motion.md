# Motion loops: a test with the stove

The game can play a short looping film in place of a still. The first test is the stove: if it keeps the
linocut look, more scenes follow (the count in the snow, the walker on the river, the ice breaking up).

## What to make

Start from the master drawing `assets/frames/stove.png` (image-to-video, e.g. Sora). Prompt:

> Animate this two-tone linocut print as a short, seamless, looping shot. Keep every carved line, the
> black ink and the cream paper exactly as they are: no colour, no shading, no photographic detail, no
> new objects, no camera movement, no zoom. Only small, quiet movement: the fire behind the three slits
> of the stove door flickers; the seated men breathe, their shoulders rising and falling a little; one
> man shifts his weight; the foot cloths on the line above sway very slightly in the warm air. Keep it
> calm and still, like a print that has come slightly alive. 6 to 8 seconds, 24 fps, 16:9.

Generate three takes. Keep the one where the lines change least: the print must still look carved.

## Putting it in the game

1. Make it loop smoothly (it plays forward, then backward) and small enough for the web:

   ```bash
   ffmpeg -i stove_take.mp4 -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]" -map "[v]" -an -vf scale=1280:-2 -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart assets/frames/motion/stove.mp4
   ```

2. Add its name to `assets/frames/motion/list.json`: `["stove"]`.

The film plays whenever the master stove drawing is on screen, under the snow and embers overlay, and the
camera still moves over it. Other drawings of the stove keep the living print. Remove the name from the
list to switch the film off.
