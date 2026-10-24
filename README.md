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

- **The arrival.** The game opens in a prison wagon, then the railhead, the convoy's warning ("a step to the left, a step to the right counts as escape"), a long march in which talking to the man beside you gets you silenced, the gate and the guardhouse at night (surname, article, term; what you try to keep), and the hut, where Kuzma answers your questions about how it works. Then the first supper, and day one (`js/content/arrival.js`).
- **The third night** Vaska comes for your felt boots. Give them up, fight, pay in bread, pay with the roubles you kept at the gate, look to Pasha, or call the warder: the choice (`S.flags.urki`) comes back all winter, in the cold, in the shakedowns, in who stands up for you, and on the camp record.
- **Thirty seconds.** A real choice waits thirty seconds (longer for a long screen, up to a minute), shown by a faint line draining under the default choice (always shown first), then the default is taken. On an everyday screen the default is your habit; on a story screen content marks it with `def: true`, otherwise it is the first, which should be the passive one: keep quiet, comply, wait. A choice the clock makes is never remembered as a habit. No clock on the title, the endings, the night's account, the wire or the record, or where there is only one way on.
- **The first fortnight is survivable.** The big costs are spread rather than lumped: the fight for the boots costs less at once and six days of ribs after; a day in the cells costs less and has its own night, where bread in the lining can still be eaten; and once, in the first fourteen days, when a new man is going, Kuzma breaks his bread and gives him half.
- **A day** is reveille, the count, bread, work, noon, the gate, dinner and night, then the night's account: what happened, what it cost and what put it back ("What took: the cold, then the work. What gave: the bowl."), what was good, and a verdict ("A good day. Almost a happy one.").
- **Small mercies.** Good days are the point. A piece of potato in the soup, eleven minutes of sun, a second bowl, your stick of wood in the stove: some come with the day, some are earned by choices, and some nights bring one of their own. The account lists them, they decide whether a day was good, and the camp record names your best day of the winter.
- **Story dialogue cannot be skipped.** On an event, a letter, the opening or an ending, the choices wait, faintly, until the voice has finished or the text has had time to be read. Everyday screens are never held.
- **The words change with the winter.** The light at reveille, the work, the noon, the gate and the night are drawn from pools that depend on the month and the cold, and remember what has happened: Senka's empty bunk, the blade in your boot, the unsigned letter, a run of good days.
- **Habits.** The everyday choices (how you eat, how you work, the queue, the night) are remembered. From the night's account, "Let the days run" lives the following days the same way until something happens: an event, a search that finds something, the body going, a blizzard when you have a blade, something on the wire coming into reach, or ten days. Small events (the wood stick, the cards, the blacksmith's man, the orderly, Vaska's man, the driver, Lev at the barrow; `minor: true` in `events.js`) are answered the way you answered them last by hand, and the run goes on; fewer events happen while the days run. The summary always says why a run stopped, even when it did not get past its first day.
- **Lev and Kuzma change ordinary days.** Lev declines slowly unless fed, and once he has paid you back he works in the planning office: he no longer needs your crust, and now and then he comes out behind the planning officer with news that changes the evening (Lubimov is doing every lining tonight; Lubimov has the night off). Kuzma's cough comes in February, Alyoshka's boards are on offer in the first week, and Kuzma names them in the hut on the first night.
- **The eye predicts.** Searches at the count and the gate are rarer while you are unnoticed and grow with the eye; a small hoard survives a search more often than a big one.
- **The status bar** shows the body, the brigade's regard and the warders' attention as meters with words, the bread you have hidden, tobacco, the four things an escape needs, and the winter as a strip of days marked good or bad.
- **The wire** needs a blade, 600 g of bread, someone who has done it before, and the way. "Think about the wire" at night says what is missing, where it might be found, and how the fence and the ice look tonight, in words. Going is played in four stages: where to cross the wire, the first night on the ice, the fisherman's hut, and what you give the man with the telephone.
- **The pictures live.** The prints stay still; light and weather are composited over them in three layers (`js/fx.js`): a light layer blended with *screen* (window shafts with dust and the shadow of a man passing outside, Lev's lamp, searchlights sweeping the snow, firelight spilling over the men around the stove), a shade layer blended with *multiply* (cloud shadows drifting over the snow, the corners of a room breathing with the fire, the mess-hut lamp swinging), and a layer for snow, breath, smoke and sparks. The camera is locked: the picture holds still. Only a few pictures have a move of their own (`ASSETS.cams`), played once and then held: at supper and breakfast it leans slowly over the bowl and stays bent over the food; at night it looks slowly round the hut's wide panorama, like turning your head. A stand-in never moves. Some places cycle through drawings while a screen is up (`ASSETS.sequences`): at the gate a man patted down, nobody, a warder's "Следующий!", the next man stepping up. A sequence can also play once and stay on its last step (`stay: true`): at reveille the rail is struck while it sounds, then the man stands with the hammer lowered. Fire, candles and the lantern are cut from the print and lick and lean, lighting what is near them; figures drawn separately (`js/sprites.js`) move over an empty plate of their scene, changing pose in time with their sound: the two men dragging a log up the timber bank. Each place shows another of its three drawings every day; the prints darken in January and warm toward May, and the vignette closes in as the body fails. The WebGL print (trembling ink, depth parallax, `js/glframe.js`) is off; `?living` turns it on to compare.
- **Pictures follow what is happening.** The rail at reveille, the hut in the month's light, the ration at its real size (400, 550 or 650 g), supper without bread, and each work site in three stages over the winter. Pictures not drawn yet show a stand-in (`js/assets.js`); the brief for them is the third set in `prompts/frames.md`. A picture with a twin that differs only in a hand (`ASSETS.alternate`, e.g. supper's spoon) fades slowly to it and back. The soup has a sheen and ripples.
- **Layered sound.** Each place has a soundscape (`js/soundscapes.js`): looping beds under the main ambience (the wind on the hut walls, the stove, the bulb's hum, snow hissing over the crust, spoons on tin) and one-off sounds dropped in now and then, placed left or right (a gust round the corner, a bunk creaking, a door banging far off, a guard's shout, ice cracking on the river, a pick on frozen ground). Behind them, guards and prisoners in Russian (`assets/sfx/ru_*`, listed in `ru_list.json`, from `scripts/gen_crowd.py`): the fives counted at the count, the search at the gate, the foremen at the site, the mess-hut murmur. Sound effects from ElevenLabs cost credits like speech does (roughly 50–100 per sound), so generate takes sparingly.
- **Work sounds.** Each site has its own layers (`site_power`, `site_settlement`, `site_timber`, chosen by the work screen's `scape`): trowels and bricks at the power station, picks and shovels at the settlement, axes, the saw and the dragged log on the timber bank, another gang fainter further off, the foremen in Russian. The arrival has the wagon on the rails, the column trudging, and the convoy's lines (`ru_march_*`, `ru_proc_name`).
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
js/content/arrival.js the wagon, the march, the gate, the hut's first evening
js/content/story.js   title, endings, the camp record
js/assets.js          stand-ins for frames not yet drawn
js/store.js           keeping your place: this tab, this browser, or test mode
js/audio.js, js/soundscapes.js, js/frames.js, js/fx.js, js/sprites.js, js/ui.js   the page: sound and its layers, stills, living overlay, moving figures, rendering
js/testkit.js, js/dev.js, tests/run.js          testing without playing
```

The engine and content never touch the page; they produce screens, and `ui.js` (or the test runner) renders them. To add an event, add an `EV(...)` block to `events.js` with its conditions; to add a camp-wide moment, add a `BEAT(...)` to `calendar.js`.

## Testing without playing

```bash
node tests/run.js                  # name clashes, checks, every scene and choice, 700 simulated winters, asset audit (a few seconds)
node tests/run.js stats smart 300  # one bot in detail: deaths by month, events per winter, how long the days run
node tests/run.js dump > script.txt  # the whole script, for reading
```

The bots: **random** clicks anything; **careful** keeps the default habits and lets the days run; **smart** plays the economy; **escaper** goes through the wire when the odds are tolerable. Current balance: random never sees the spring, careful about 50% (it always gives up its boots on the third night), smart about 95%, escaper gets out about 30% of the time. Good days: careful almost never, smart about two in five. Lev lives to the ice in about two smart winters in three, and one careful winter in eight.

In the browser, `index.html?dev` or the backtick key opens a panel to jump to any scene with any state, skip to a day, run the bots, dump the script, and check that every screen fits the window ("does it fit?", or `DEV.fit()` in the console; resize the window and run it again). Everything the panel does is in test mode, so it never touches a saved game, and test pages are silent unless the link adds `&sound`. Deep links work too: `?scene=event:lev_barrow` (the arrival's screens are `arr:*`), `?notimer` (no thirty-second clock; the panel's "timer" button toggles it), `?skip=60`, `?seed=7`, `?state={"strength":20}`, `?still` (no animation), `?frame=stove` (one frame with its living overlay; add `&fxcheck` to print where the overlay draws, `&glpair` to render the print at two camera positions, `&flat` to compare with the plain still).

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
