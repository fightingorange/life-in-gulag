#!/usr/bin/env python3
"""Russian background speech: the voices of the camp around the player, mixed under scenes as
distant sounds (the count, the gate, the work site, the mess hut, reveille in the hut).

    python3 scripts/gen_crowd.py design     # one-off voices: each take read by voice design (3 voices per take)
    python3 scripts/gen_crowd.py cut        # speech-to-text word timings, cut each take into phrases
    python3 scripts/gen_crowd.py process    # place each phrase at a distance -> assets/sfx/ru_*.mp3
    python3 scripts/gen_crowd.py murmur     # the mess-hut murmur bed, a seamless ~20 s loop
    python3 scripts/gen_crowd.py verify     # transcribe every final file, compare, write assets/sfx/ru_list.json
    python3 scripts/gen_crowd.py all
    python3 scripts/gen_crowd.py design --force guard_old   # redo one take
    python3 scripts/gen_crowd.py cut ru_march_rule          # cut and process take file names: only those
                                                            # (process makes verify transcribe the file again)

Like the "oneoff" voices in gen_voice.py, these voices are never saved to the account (its voice slots
are full): the voice-design step speaks the whole take, and the take is cut at the word timings from
ElevenLabs speech-to-text. A design call returns three previews, three different voices reading the
same text, so one take gives three voices; OUT below picks which preview each file comes from.
Raw takes, their word timings and the cut phrases are kept in assets/voice/previews/crowd/.
"""
import base64
import difflib
import json
import re
import subprocess
import sys
import uuid
import urllib.error
import urllib.request

from eleven import ASSETS, request, fail, api_key, next_key

CROWD = ASSETS / "voice" / "previews" / "crowd"
SFX = ASSETS / "sfx"
LIST = SFX / "ru_list.json"
MODEL = "eleven_multilingual_ttv_v2"

# Each take: a voice description and the phrases it reads, one take, long pauses between phrases.
TAKES = {
    "guard_old": {
        "description": "A harsh, hoarse Russian man in his fifties, a labour camp guard sergeant shouting orders "
                       "outdoors in freezing cold, rough smoker's voice, loud, curt and contemptuous. Speaks Russian.",
        "phrases": [
            ("form", "Стройся по пятёркам!"),
            ("hats", "Шапки снять!"),
            ("c1", "Первая пятёрка!"),
            ("c2", "Вторая!"),
            ("c3", "Третья!"),
            ("c4", "Четвёртая!"),
            ("c5", "Пятая!"),
            ("again", "Ещё раз! Сначала!"),
            ("next", "Следующий!"),
            ("hands", "Руки!"),
            ("unbutton", "Расстегнись!"),
            ("pass", "Проходи!"),
        ],
    },
    "guard_young": {
        "description": "A young Russian soldier, about twenty, a camp escort guard, loud, impatient and bored, "
                       "shouting at prisoners in the frost, sharp clear voice. Speaks Russian.",
        "phrases": [
            ("davai", "Давай, давай!"),
            ("move", "Шевелись!"),
            ("nostand", "Не стоять!"),
            ("next", "Следующий!"),
            ("hands", "Руки в стороны!"),
            ("pass", "Проходи!"),
            ("form", "Стройся по пятёркам!"),
        ],
    },
    "foreman": {
        "description": "A strong, gruff Russian man in his forties, a work gang foreman, deep hoarse voice, "
                       "calling out to his men as they haul a heavy log in the snow. Speaks Russian.",
        "phrases": [
            ("heave", "Раз, два — взяли!"),
            ("heave2", "Ещё взяли!"),
            ("davai", "Давай, ребята, давай!"),
            ("smoke", "Перекур!"),
            ("move", "Шевелись, братва!"),
            ("together", "Дружно, разом!"),
        ],
    },
    "prisoner_old": {
        "description": "A tired, worn-out Russian man in his sixties, a prisoner, low, weary and hoarse, "
                       "mumbling and grumbling under his breath, half asleep. Speaks Russian.",
        "phrases": [
            ("nothing", "Да нет ничего, гражданин начальник."),
            ("cold", "Холодно же, руки не гнутся."),
            ("again", "Ох, господи... опять."),
            ("minute", "Ещё бы минутку."),
            ("boots", "Где мои валенки?"),
            ("thick", "Мне без гущи не надо."),
        ],
    },
    "prisoner_mess": {
        "description": "A hungry, rough Russian man in his thirties, a prisoner in a crowded mess hall, "
                       "curt and hoarse, speaking over the noise. Speaks Russian.",
        "phrases": [
            ("move", "Двигай!"),
            ("spoon", "Ложку дай."),
            ("thick", "Мне без гущи не надо."),
            ("shove", "Подвинься, сесть негде."),
            ("bowl", "Миску верни!"),
            ("going", "Всё, всё, иду уже."),
        ],
    },
    "orderly": {
        "description": "A middle-aged Russian man, a barracks orderly, bawling loudly in a dark wooden hut "
                       "before dawn to wake the men, rough, drawn-out shouts. Speaks Russian.",
        "phrases": [
            ("up", "Подъём!"),
            ("up2", "Подъём, говорю! Вставай!"),
            ("ration", "Кто не встанет, тому без пайки!"),
            ("brigade", "Подъём, бригада, на развод!"),
            ("out", "Выходи строиться!"),
        ],
    },
    "convoy": {
        "description": "A harsh, loud Russian convoy soldier in his thirties shouting at a long column of prisoners "
                       "on the march outdoors in deep frost, hoarse barking voice, curt, threatening, every word hammered "
                       "out. Speaks Russian.",
        "phrases": [
            ("rule", "Шаг влево, шаг вправо — считается побег! Конвой стреляет без предупреждения!"),
            ("quiet", "Разговорчики!"),
            ("quiet2", "Прекратить разговоры в строю!"),
            ("hands", "Руки за спину!"),
            ("close", "Подтянись! Не растягиваться!"),
            ("name", "Фамилия!"),
        ],
    },
    # The murmur: men talking low at the tables. Read as running talk, not separate phrases.
    "murmur_a": {
        "description": "A tired Russian man talking quietly to the man next to him at a table, low murmuring "
                       "conversational voice, mumbling, unhurried. Speaks Russian.",
        "talk": "Да он вчера опять в санчасть ходил, а там говорят, температуры нет, иди работай. Ну он и пошёл. "
                "А баланда сегодня совсем пустая, одна капуста. Ты хлеб-то оставил? Я половину на вечер оставил. "
                "Говорят, морозы ещё неделю продержатся. А на лесоповале, говорят, норму опять подняли.",
    },
    "murmur_b": {
        "description": "An older Russian man speaking quietly and wearily across a crowded table, hoarse, low "
                       "murmur, half to himself. Speaks Russian.",
        "talk": "Мне жена писала, у них в деревне тоже голодно. Картошки, пишет, до весны не хватит. "
                "А бригадир наш опять с нарядчиком поругался, теперь на каменный карьер погонят. "
                "Ты ешь, ешь, не смотри. Завтра, может, табаку дадут. Нет, не дадут, не верю я им.",
    },
}

# The files: situation, role, the phrases (consecutive, from one take) and which preview reads them.
# Several previews of one take are different voices, so the same take gives the count and the gate
# different men.
OUT = [
    # morning count, outside in the dark
    ("ru_count_form",      "count", "guard",    "guard_old", 0, ["form"],                     "Form up in fives!"),
    ("ru_count_hats",      "count", "guard",    "guard_old", 0, ["hats"],                     "Caps off!"),
    ("ru_count_fives",     "count", "guard",    "guard_old", 0, ["c1", "c2", "c3"],           "First five! Second! Third!"),
    ("ru_count_fives2",    "count", "guard",    "guard_old", 1, ["c4", "c5"],                 "Fourth! Fifth!"),
    ("ru_count_again",     "count", "guard",    "guard_old", 0, ["again"],                    "Once more! From the start!"),
    ("ru_count_form2",     "count", "guard",    "guard_young", 0, ["form"],                   "Form up in fives!"),
    # the gate, the evening search
    ("ru_gate_next",       "gate",  "guard",    "guard_old", 1, ["next"],                     "Next!"),
    ("ru_gate_hands",      "gate",  "guard",    "guard_old", 1, ["hands"],                    "Hands!"),
    ("ru_gate_unbutton",   "gate",  "guard",    "guard_old", 1, ["unbutton"],                 "Unbutton!"),
    ("ru_gate_pass",       "gate",  "guard",    "guard_old", 1, ["pass"],                     "Go on through!"),
    ("ru_gate_next2",      "gate",  "guard",    "guard_young", 0, ["next"],                   "Next!"),
    ("ru_gate_hands2",     "gate",  "guard",    "guard_young", 0, ["hands"],                  "Arms out!"),
    ("ru_gate_grumble",    "gate",  "prisoner", "prisoner_old", 0, ["nothing"],               "There's nothing, citizen chief."),
    ("ru_gate_grumble2",   "gate",  "prisoner", "prisoner_old", 0, ["cold"],                  "It's cold, my hands won't bend."),
    ("ru_gate_grumble3",   "gate",  "prisoner", "prisoner_mess", 1, ["going"],                "All right, all right, I'm going."),
    # the work site
    ("ru_site_davai",      "site",  "guard",    "guard_young", 1, ["davai"],                  "Come on, come on!"),
    ("ru_site_move",       "site",  "guard",    "guard_young", 1, ["move"],                   "Get moving!"),
    ("ru_site_nostand",    "site",  "guard",    "guard_young", 1, ["nostand"],                "No standing about!"),
    ("ru_site_heave",      "site",  "prisoner", "foreman", 2, ["heave"],                      "One, two, lift!"),
    ("ru_site_heave2",     "site",  "prisoner", "foreman", 2, ["heave2"],                     "Lift again!"),
    ("ru_site_davai2",     "site",  "prisoner", "foreman", 0, ["davai"],                      "Come on, lads, come on!"),
    ("ru_site_smoke",      "site",  "prisoner", "foreman", 2, ["smoke"],                      "Smoke break!"),
    # the mess hut
    ("ru_mess_thick",      "mess",  "prisoner", "prisoner_mess", 0, ["thick"],                "Not for me without the thick of it."),
    ("ru_mess_move",       "mess",  "prisoner", "prisoner_mess", 0, ["move"],                 "Shove over!"),
    ("ru_mess_spoon",      "mess",  "prisoner", "prisoner_mess", 0, ["spoon"],                "Give me a spoon."),
    ("ru_mess_shove",      "mess",  "prisoner", "prisoner_mess", 2, ["shove"],                "Move up, there's nowhere to sit."),
    ("ru_mess_bowl",       "mess",  "prisoner", "prisoner_mess", 2, ["bowl"],                 "Give the bowl back!"),
    ("ru_mess_thick2",     "mess",  "prisoner", "prisoner_old", 1, ["thick"],                 "Not for me without the thick of it."),
    # reveille in the hut
    ("ru_hut_up",          "hut",   "orderly",  "orderly", 0, ["up"],                         "Get up!"),
    ("ru_hut_up2",         "hut",   "orderly",  "orderly", 0, ["up2"],                        "Get up, I said! On your feet!"),
    ("ru_hut_ration",      "hut",   "orderly",  "orderly", 0, ["ration"],                     "Whoever doesn't get up goes without his ration!"),
    ("ru_hut_brigade",     "hut",   "orderly",  "orderly", 0, ["brigade"],                    "Up, brigade, out to the work parade!"),
    ("ru_hut_mutter",      "hut",   "prisoner", "prisoner_old", 2, ["again"],                 "Oh Lord... again."),
    ("ru_hut_minute",      "hut",   "prisoner", "prisoner_old", 2, ["minute"],                "Just one more minute."),
    ("ru_hut_boots",       "hut",   "prisoner", "prisoner_old", 0, ["boots"],                 "Where are my felt boots?"),
    # arrival: the march from the railhead, and the gate
    ("ru_march_rule",      "march", "guard",    "convoy", 2, ["rule"],                        "A step to the left, a step to the right counts as escape! The convoy shoots without warning!"),
    ("ru_march_quiet",     "march", "guard",    "convoy", 2, ["quiet"],                       "No talking!"),
    ("ru_march_quiet2",    "march", "guard",    "convoy", 2, ["quiet2"],                      "Stop talking in the ranks!"),
    ("ru_march_hands",     "march", "guard",    "convoy", 2, ["hands"],                       "Hands behind your back!"),
    ("ru_march_close",     "march", "guard",    "convoy", 2, ["close"],                       "Close up! Don't straggle!"),
    ("ru_proc_name",       "proc",  "guard",    "convoy", 0, ["name"],                        "Surname!"),
]

OUTDOOR = {"count", "gate", "site", "march", "proc"}

# Distance: mono, band-limited, an echo. Outdoors the echo comes late and long, off the huts and the
# forest across cold air; indoors it is short and close, and the top is duller.
CHAIN = {
    "out": "highpass=f=170,lowpass=f=3400,aecho=0.85:0.6:150|330|560:0.22|0.13|0.07",
    "in":  "highpass=f=130,lowpass=f=2200,aecho=0.85:0.55:23|41|67:0.3|0.2|0.12",
}
TARGET_PEAK = -5.0


def text_of(take):
    t = TAKES[take]
    if "talk" in t:
        return t["talk"]
    return " ... ".join(p for _, p in t["phrases"])


def ff(*args, capture=False):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error" if not capture else "info", "-y", *args],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit("ffmpeg failed: " + r.stderr[-800:])
    return r.stderr


def measure(path):
    out = ff("-i", str(path), "-af", "volumedetect", "-f", "null", "-", capture=True)
    return (float(re.search(r"mean_volume: (-?[0-9.]+) dB", out).group(1)),
            float(re.search(r"max_volume: (-?[0-9.]+) dB", out).group(1)))


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def credits():
    s, d, _ = request("GET", "/v1/user/subscription")
    if s != 200:
        return None
    j = json.loads(d)
    return j.get("character_count"), j.get("character_limit")


# ---- design ----------------------------------------------------------------------------------------

def cmd_design(argv):
    force = "--force" in argv
    only = [a for a in argv if not a.startswith("--")]
    CROWD.mkdir(parents=True, exist_ok=True)
    before = credits()
    for name, t in TAKES.items():
        if only and name not in only:
            continue
        files = [CROWD / f"{name}_{i}.mp3" for i in range(3)]
        if files[0].exists() and not force:
            print(f"  {name}: takes exist, skipped")
            continue
        text = text_of(name)
        if len(text) < 100:
            sys.exit(f"{name}: a take needs at least 100 characters, has {len(text)}")
        body = {"voice_description": t["description"], "text": text, "model_id": MODEL}
        status, data, _ = request("POST", "/v1/text-to-voice/design", body)
        if status != 200:
            fail(status, data, f"design {name}")
        for i, p in enumerate(json.loads(data)["previews"][:3]):
            files[i].write_bytes(base64.b64decode(p["audio_base_64"]))
            (CROWD / f"{name}_{i}.words.json").unlink(missing_ok=True)
        print(f"  {name}: {len(text)} characters, 3 takes -> {CROWD.relative_to(ASSETS.parent)}/{name}_*.mp3")
    after = credits()
    if before and after:
        print(f"  credits used: {after[0] - before[0]} ({after[0]}/{after[1]})")


# ---- speech-to-text ----------------------------------------------------------------------------------

def transcribe(path, cache=None):
    """Word list from ElevenLabs speech-to-text (scribe_v1, Russian). Cached next to the take."""
    if cache and cache.exists():
        return json.loads(cache.read_text())
    b = uuid.uuid4().hex
    fields = {"model_id": "scribe_v1", "language_code": "ru", "tag_audio_events": "false"}
    body = b"".join(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
                    for k, v in fields.items())
    body += (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp3\"\r\n"
             f"Content-Type: audio/mpeg\r\n\r\n").encode() + path.read_bytes() + f"\r\n--{b}--\r\n".encode()
    while True:
        req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, method="POST")
        req.add_header("xi-api-key", api_key())
        req.add_header("content-type", f"multipart/form-data; boundary={b}")
        try:
            raw = urllib.request.urlopen(req, timeout=180).read()
            break
        except urllib.error.HTTPError as e:
            if e.code in (401, 402, 429) and next_key("speech-to-text"):
                continue
            sys.exit(f"speech-to-text {path.name}: HTTP {e.code} {e.read()[:300]!r}")
    j = json.loads(raw)
    out = {"text": j.get("text", ""),
           "words": [{"text": w["text"], "start": w["start"], "end": w["end"]}
                     for w in j.get("words", []) if w.get("type") == "word"]}
    if cache:
        cache.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out


def norm(word):
    return re.sub(r"[^а-я0-9]|[ъь]", "", word.lower().replace("ё", "е"))   # the recogniser mixes up ъ and ь


def words_of(text):
    return [w for w in (norm(x) for x in re.split(r"[\s—-]+", text)) if w]


def similarity(a, b):
    return difflib.SequenceMatcher(None, words_of(a), words_of(b)).ratio()


def align(take, i):
    """{phrase id: (start, end, matched fraction)} for preview i of a take."""
    src = CROWD / f"{take}_{i}.mp3"
    stt = transcribe(src, CROWD / f"{take}_{i}.words.json")
    got = [norm(w["text"]) for w in stt["words"]]
    exp, owner = [], []
    for pid, text in TAKES[take]["phrases"]:
        for w in words_of(text):
            exp.append(w)
            owner.append(pid)
    # fuzzy word match: two words match if they are close (the recogniser may drop a soft sign)
    sm = difflib.SequenceMatcher(None, exp, got, autojunk=False)
    pairs = {}
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal":
            for k in range(a1 - a0):
                pairs[a0 + k] = b0 + k
        elif op == "replace" and a1 - a0 == b1 - b0:
            for k in range(a1 - a0):
                if difflib.SequenceMatcher(None, exp[a0 + k], got[b0 + k]).ratio() >= 0.7:
                    pairs[a0 + k] = b0 + k
    spans = {}
    for pid, _ in TAKES[take]["phrases"]:
        idx = [k for k, o in enumerate(owner) if o == pid]
        hit = [pairs[k] for k in idx if k in pairs]
        if not hit:
            continue
        spans[pid] = (stt["words"][min(hit)]["start"], stt["words"][max(hit)]["end"], len(hit) / len(idx),
                      min(hit), max(hit))
    return spans, stt


def cmd_cut(argv):
    CROWD.mkdir(parents=True, exist_ok=True)
    cache = {}
    for name, situation, role, take, i, units, english in OUT:
        if argv and name not in argv:
            continue
        if (take, i) not in cache:
            cache[(take, i)] = align(take, i)
        spans, stt = cache[(take, i)]
        missing = [u for u in units if u not in spans or spans[u][2] < 0.6]
        if missing:
            print(f"  {name}: {missing} not found in {take}_{i} (heard: {stt['text'][:120]})")
            continue
        s0, e0 = spans[units[0]][0], spans[units[-1]][1]
        first, last = spans[units[0]][3], spans[units[-1]][4]
        words = stt["words"]
        a = max(0.0, s0 - 0.1)
        if first > 0:
            a = max(a, (words[first - 1]["end"] + s0) / 2)
        z = e0 + 0.3
        if last + 1 < len(words):
            z = min(z, (e0 + words[last + 1]["start"]) / 2)
        ff("-i", str(CROWD / f"{take}_{i}.mp3"), "-ss", f"{a:.3f}", "-to", f"{z:.3f}", "-ac", "1",
           str(CROWD / f"{name}.wav"))
        print(f"  {name}: {take}_{i} {a:.2f}-{z:.2f}s  {' '.join(dict(TAKES[take]['phrases'])[u] for u in units)}")


# ---- distance -----------------------------------------------------------------------------------------

def place(src, dst, chain, tail=0.7):
    """Run the chain with a tail for the echo, fade, and set the peak; mono MP3 128k."""
    tmp = dst.with_suffix(".tmp.wav")
    d = duration(src) + tail
    ff("-i", str(src), "-af",
       f"aformat=channel_layouts=mono,apad=pad_dur={tail},{chain},"
       f"afade=t=in:d=0.02,afade=t=out:st={max(0, d - 0.35):.3f}:d=0.35,atrim=0:{d:.3f}",
       "-ar", "44100", str(tmp))
    _, peak = measure(tmp)
    ff("-i", str(tmp), "-af", f"volume={TARGET_PEAK - peak:.2f}dB", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k",
       str(dst))
    tmp.unlink()


def cmd_process(argv):
    for name, situation, *_ in OUT:
        if argv and name not in argv:
            continue
        src = CROWD / f"{name}.wav"
        if not src.exists():
            print(f"  {name}: no cut phrase, skipped")
            continue
        outdoor = situation in OUTDOOR
        place(src, SFX / f"{name}.mp3", CHAIN["out" if outdoor else "in"], tail=0.9 if outdoor else 0.4)
        (CROWD / f"{name}.final.json").unlink(missing_ok=True)   # the check must hear the new file
        print(f"  {name}.mp3  {duration(SFX / f'{name}.mp3'):.2f}s  ({'outdoor' if outdoor else 'indoor'})")


# ---- the murmur bed --------------------------------------------------------------------------------

def cmd_murmur(argv):
    """Six voices (two takes, three previews each) cut into breath groups and scattered round a circular
    timeline, so the loop point is seamless by construction; the echo is run over three laps and the
    middle lap kept, so its tail wraps too."""
    import numpy as np
    L, SR = 20.0, 44100
    n = int(L * SR)
    rng = np.random.default_rng(1951)
    buf = np.zeros(n)
    voices = [(t, i) for t in ("murmur_a", "murmur_b") for i in range(3)]
    for v, (take, i) in enumerate(voices):
        src = CROWD / f"{take}_{i}.mp3"
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-f", "f64le", "-"],
                             capture_output=True).stdout
        x = np.frombuffer(pcm, dtype=np.float64).copy()
        x /= max(1e-9, np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)))   # level-match the voices on their speech
        stt = transcribe(src, CROWD / f"{take}_{i}.words.json")
        # breath groups: runs of words with gaps under 0.35 s
        groups, cur = [], None
        for w in stt["words"]:
            if cur and w["start"] - cur[1] < 0.35:
                cur[1] = w["end"]
            else:
                if cur:
                    groups.append(cur)
                cur = [w["start"], w["end"]]
        if cur:
            groups.append(cur)
        gain = 10 ** (rng.uniform(-9, -2) / 20)
        t = rng.uniform(0, L)
        for g0, g1 in groups:
            a, z = int(max(0, g0 - 0.05) * SR), int((g1 + 0.1) * SR)
            seg = x[a:z].copy()
            f = int(0.03 * SR)
            if len(seg) > 2 * f:
                seg[:f] *= np.linspace(0, 1, f)
                seg[-f:] *= np.linspace(1, 0, f)
            pos = int(t * SR) % n
            idx = (pos + np.arange(len(seg))) % n
            np.add.at(buf, idx, seg * gain)
            t += (g1 - g0) + rng.uniform(0.3, 1.6)
            if t > L * 0.95 + rng.uniform(0, L):   # each voice says about a lap's worth, then falls quiet
                break
    buf /= np.max(np.abs(buf)) * 1.05
    raw = CROWD / "murmur_raw.wav"
    three = np.tile(buf, 3)
    pcm16 = (np.clip(three, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(raw)],
                   input=pcm16, check=True)
    wet = CROWD / "murmur_wet.wav"
    ff("-i", str(raw), "-af",
       "highpass=f=140,lowpass=f=1200,aecho=0.85:0.6:23|41|67|110:0.32|0.22|0.14|0.08,"
       f"atrim={L:.3f}:{2 * L:.3f}", "-ar", str(SR), str(wet))
    mean, _ = measure(wet)
    ff("-i", str(wet), "-af", f"volume={-28.0 - mean:.2f}dB", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k",
       str(SFX / "ru_mess_murmur.mp3"))
    raw.unlink()
    wet.unlink()
    print(f"  ru_mess_murmur.mp3  {duration(SFX / 'ru_mess_murmur.mp3'):.2f}s, {len(voices)} voices, mean -28 dB")


# ---- verify ------------------------------------------------------------------------------------------

def cmd_verify(argv):
    listing, bad = [], []
    for name, situation, role, take, i, units, english in OUT:
        f = SFX / f"{name}.mp3"
        if not f.exists():
            bad.append((name, "missing"))
            continue
        want = " ".join(dict(TAKES[take]["phrases"])[u] for u in units)
        heard = transcribe(f, CROWD / f"{name}.final.json")["text"]
        sim = similarity(want, heard)
        ok = sim >= 0.75
        print(f"  {'ok ' if ok else 'BAD'} {name:20s} {sim:.2f}  want: {want}  heard: {heard}")
        if not ok:
            bad.append((name, heard))
            continue
        listing.append({"file": f"{name}.mp3", "situation": situation, "text": want, "english": english,
                        "role": role, "kind": "spot"})
    m = SFX / "ru_mess_murmur.mp3"
    if m.exists():
        heard = transcribe(m, CROWD / "ru_mess_murmur.final.json")["text"]
        print(f"  bed ru_mess_murmur: heard {len(words_of(heard))} words: {heard[:160]}")
        listing.append({"file": "ru_mess_murmur.mp3", "situation": "mess",
                        "text": "(неразборчивый гул голосов за столами)",
                        "english": "indistinct murmur of men talking at the tables; a seamless 20 s loop",
                        "role": "crowd", "kind": "bed"})
    LIST.write_text(json.dumps(listing, ensure_ascii=False, indent=1) + "\n")
    print(f"  wrote {LIST.relative_to(ASSETS.parent)}: {len(listing)} files" +
          (f"; left out: {', '.join(n for n, _ in bad)}" if bad else ""))


if __name__ == "__main__":
    args = sys.argv[1:]
    cmds = {"design": cmd_design, "cut": cmd_cut, "process": cmd_process, "murmur": cmd_murmur, "verify": cmd_verify}
    if args and args[0] == "all":
        for c in ("design", "cut", "process", "murmur", "verify"):
            cmds[c]([])
    elif not args or args[0] not in cmds:
        sys.exit(__doc__)
    else:
        cmds[args[0]](args[1:])
