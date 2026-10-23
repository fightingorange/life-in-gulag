# Ten Years

A text game about one winter in a Soviet labour camp, 1951. Ten years is too long to hold in your head, so the old prisoners say: count the winter. Survive until the ice goes out on the river on 20 May, or go through the wire and down the river on the ice.

## Play

```bash
python3 scripts/serve.py
```

Then open http://localhost:8077. The server tells the browser not to cache, so an updated file is always picked up. Opening `index.html` directly also works, but the strength-dependent muffling of the sound needs the server. Keys 1 to 9 or click. Headphones.

On a desktop every screen fits the window without scrolling: the picture and its documents (the night's account, the wire, the camp record) on the left, the prose and choices on the right. A screen that is still too tall shrinks a little, never below 80%. Phones get a single scrolling column.

### Keeping your place

The game saves at the start of each day, and only on this computer.

- **By default it is kept only while the tab is open.** A reload continues; closing the tab forgets.
- **Keeping it in the browser is opt-in.** The first nights' accounts offer it, and the switch at the top of the page ("saving: this tab / this browser") changes it at any time. Switching it off removes the copy from the browser at once.
- **Test mode saves nothing.** Any dev link (`?dev`, `?test`, `?scene=`, `?skip=`, `?seed=`, `?state=`, `?still`) or opening the dev panel puts the page in test mode: it reads no save and writes none, and the top of the page says so.

## How it plays

- **A day** is reveille, the count, bread, work, noon, the gate, dinner and night, then the night's account: what happened, what it cost, what was good, and a verdict ("A good day. Almost a happy one.").
- **Small mercies.** Good days are the point. A piece of potato in the soup, eleven minutes of sun, a second bowl, your stick of wood in the stove: some come with the day, some are earned by choices, and some nights bring one of their own. The account lists them, they decide whether a day was good, and the camp record names your best day of the winter.
- **Story dialogue cannot be skipped.** On an event, a letter, the opening or an ending, the choices wait, faintly, until the voice has finished or the text has had time to be read. Everyday screens are never held.
- **The words change with the winter.** The light at reveille, the work, the noon, the gate and the night are drawn from pools that depend on the month and the cold, and remember what has happened: Senka's empty bunk, the blade in your boot, the unsigned letter, a run of good days.
- **Habits.** The everyday choices (how you eat, how you work, the queue, the night) are remembered. From the night's account, "Let the days run" lives the following days the same way until something happens: an event, a search that finds something, the body going, a blizzard when you have a blade, something on the wire coming into reach, or ten days.
- **The status bar** shows the body, the brigade's regard and the warders' attention as meters with words, the bread you have hidden, tobacco, the four things an escape needs, and the winter as a strip of days marked good or bad.
- **The wire** needs a blade, 600 g of bread, someone who has done it before, and the way. "Think about the wire" at night says what is missing, where it might be found, and how the fence and the ice look tonight, in words. Going is played in four stages: where to cross the wire, the first night on the ice, the fisherman's hut, and what you give the man with the telephone.
- **The pictures live.** The prints stay still; light and weather are composited over them in three layers (`js/fx.js`): a light layer blended with *screen* (window shafts with dust and the shadow of a man passing outside, Lev's lamp, searchlights sweeping the snow, firelight spilling over the men around the stove), a shade layer blended with *multiply* (cloud shadows drifting over the snow, the corners of a room breathing with the fire, the mess-hut lamp swinging), and a layer for snow, breath, smoke and sparks. A very slow camera push toward each scene's subject. Each place shows another of its three drawings every day; the prints darken in January and warm toward May, and the vignette closes in as the body fails. The WebGL print (trembling ink, depth parallax, `js/glframe.js`) is off; `?living` turns it on to compare.
- **Pictures follow what is happening.** The rail at reveille, the hut in the month's light, the ration at its real size (400, 550 or 650 g), supper without bread, and each work site in three stages over the winter. Pictures not drawn yet show a stand-in (`js/assets.js`); the brief for them is the third set in `prompts/frames.md`. A picture with a twin that differs only in a hand (`ASSETS.alternate`, e.g. supper's spoon) fades slowly to it and back. The soup has a sheen and ripples.
- **Layered sound.** Each place has a soundscape (`js/soundscapes.js`): looping beds under the main ambience (the wind on the hut walls, the stove, the bulb's hum, snow hissing over the crust, spoons on tin) and one-off sounds dropped in now and then, placed left or right (a gust round the corner, a bunk creaking, a door banging far off, a guard's shout, ice cracking on the river, a pick on frozen ground). Sound effects from ElevenLabs cost no credits on this plan.
- **Sounds follow the text.** A line can carry its own sound: the man crying at night, the Latvians praying, the raven, the thaw dripping. Mornings have their own ambience, men waking, without the night's snoring.
- **Motion loops.** A drawing can also have a short looping film (`assets/frames/motion/`, listed in `list.json`), which plays over the print when that drawing is on screen. The first test, the stove, is described in `prompts/motion.md`.
- **Sound** fades in and out on a curve that follows the ear, ambient beds start at a different point of their loop each time, and every file is level-matched by `scripts/levels.py`.
- **Endings** close on a camp record card, stamped, with what the record does not say: the bread you gave away, whether you gave a name, who lived.

## Files

```
index.html            the page
css/game.css          paper and ink
js/util.js            helpers, seedable dice
js/engine.js          state, calendar, screens, days that run on their own (no page access)
js/content/lines.js   words that change with the month, the cold and what has happened
js/content/day.js     the daily round and the night's account
js/content/events.js  noon events as data: when, how often, what they show
js/content/calendar.js  the winter's beats: the cold snap, letters, the commission, an escape, Easter, the thaw
js/content/escape.js  the wire and the ice
js/content/story.js   title, opening, endings, the camp record
js/assets.js          stand-ins for frames not yet drawn
js/store.js           keeping your place: this tab, this browser, or test mode
js/audio.js, js/frames.js, js/fx.js, js/ui.js   the page: sound, stills, living overlay, rendering
js/testkit.js, js/dev.js, tests/run.js          testing without playing
```

The engine and content never touch the page; they produce screens, and `ui.js` (or the test runner) renders them. To add an event, add an `EV(...)` block to `events.js` with its conditions; to add a camp-wide moment, add a `BEAT(...)` to `calendar.js`.

## Testing without playing

```bash
node tests/run.js                  # name clashes, checks, every scene and choice, 700 simulated winters, asset audit (a few seconds)
node tests/run.js stats smart 300  # one bot in detail: deaths by month, events per winter, how long the days run
node tests/run.js dump > script.txt  # the whole script, for reading
```

The bots: **random** clicks anything; **careful** keeps the default habits and lets the days run; **smart** plays the economy; **escaper** goes through the wire when the odds are tolerable. Current balance: random never sees the spring, careful about 40%, smart about 75%, escaper gets out about a third of the time. Good days: careful almost never, smart about two in five.

In the browser, `index.html?dev` or the backtick key opens a panel to jump to any scene with any state, skip to a day, run the bots, dump the script, and check that every screen fits the window ("does it fit?", or `DEV.fit()` in the console; resize the window and run it again). Everything the panel does is in test mode, so it never touches a saved game, and test pages are silent unless the link adds `&sound`. Deep links work too: `?scene=event:lev_barrow`, `?skip=60`, `?seed=7`, `?state={"strength":20}`, `?still` (no animation), `?frame=stove` (one frame with its living overlay; add `&fxcheck` to print where the overlay draws, `&glpair` to render the print at two camera positions, `&flat` to compare with the plain still).

## Assets

Everything the game loads is listed in `assets/manifest.json`.

- `assets/frames/` — thirty-seven linocut frame states (PNG masters) and `web/` JPEG copies the game loads. Prompts and the locked style in `prompts/frames.md`; shared art direction in `prompts/frames-production.md`. Open `assets/frames/review.html` for the collection and all 113 preserved variants; choose “Set three” for the seasonal lighting, rations, supper pair and construction progressions. Exact generation prompts, source paths and visual QA are in `assets/frames/production/`. Settlement stage one reuses the original site print. New edit candidates preserve the viewpoint and are kept for review; the game uses their selected masters. Stand-ins remain available in `js/assets.js` if a frame is missing. After adding a master: `sips -s format jpeg -s formatOptions 82 assets/frames/<name>.png --out assets/frames/web/<name>.jpg`.
- `assets/frames/depth/` — a depth map per drawing (white near, black far) for the parallax, from `scripts/depth.py`: Depth Anything V2 Small (ONNX), run once with onnxruntime. Re-run it after adding or replacing a drawing: `python3 scripts/depth.py --model depth_anything_v2_small.onnx`.
- `assets/sfx/` — ambient loops and one-shots, from `scripts/gen_sfx.py`.
- `assets/voice/` — dialogue, from `scripts/gen_voice.py`. If two characters sound alike, a saved voice can be deleted after its lines are recorded and a more distinct one designed in its slot (the game needs only the recorded files); Lev and Lubimov were redesigned this way, picking the take that measures furthest from every other voice.
  Eleven voices, Russian-accented English; the Easter lines and the count are in Russian. The prisoner (you) speaks the few lines he says aloud: "Who said that." to Lev, and the spoken choices, which are heard when you pick them.

### ElevenLabs scripts

Standard-library Python. The key is read from `~/.config/elevenlabs/api-key.txt` or `ELEVENLABS_API_KEY` and never printed.

```bash
python3 scripts/gen_sfx.py                 # every missing sound
python3 scripts/gen_voice.py design        # design and save voices that have no id yet
python3 scripts/gen_voice.py lines         # record every missing line
python3 scripts/gen_voice.py oneoff        # voices marked "oneoff" (see below)
python3 scripts/gen_voice.py lines --force kuzma_river
```

The account allows ten saved voices, and three of its ten were already in use, so the blacksmith's man, the commissioner and Nina are "oneoff" voices. So is the prisoner. Their lines are spoken by the voice-design step itself and are never saved as voices. All of one character's lines are read in a single take, so they share a voice, and the take is cut into lines at the word timings from ElevenLabs speech-to-text. Alternative takes are in `assets/voice/previews/`; choose one with `oneoff --pick nina=1 --force`.
