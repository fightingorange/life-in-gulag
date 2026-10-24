#!/usr/bin/env python3
"""Design the character voices and record the dialogue lines in assets/manifest.json.

    python3 scripts/gen_voice.py design            # create any voice that has no id yet
    python3 scripts/gen_voice.py design --pick lev=2   # recreate Lev from preview 2
    python3 scripts/gen_voice.py design --redo kuzma   # a new voice for a character that has one (the briskest preview)
    python3 scripts/gen_voice.py lines             # record every missing line
    python3 scripts/gen_voice.py lines fomin_kum   # only these
    python3 scripts/gen_voice.py lines --force     # re-record everything
    python3 scripts/gen_voice.py oneoff            # voices marked "oneoff": spoken straight from voice design
    python3 scripts/gen_voice.py oneoff --pick nina=1 --force
    python3 scripts/gen_voice.py oneoff settler --force   # only this one-off voice, a new take

A "oneoff" voice is never saved to the account (custom voice slots are limited). Its lines are
spoken by the voice-design step itself, all in one take so they share a voice, then split at the
pauses. The take must be at least 100 characters. Takes are kept in assets/voice/previews/.

Voice ids are kept in assets/voice/voices.json. Previews from the design step are saved
to assets/voice/previews/<voice>_<n>.mp3 so you can listen before picking.
Lines are written to assets/voice/<line id>.mp3.
"""
import base64
import json
import sys
from eleven import ASSETS, manifest, request, fail, api_key, next_key

VOICE_DIR = ASSETS / "voice"
PREVIEW_DIR = VOICE_DIR / "previews"
VOICES_JSON = VOICE_DIR / "voices.json"

# Text the design step speaks for the previews. Must be 100-1000 characters.
SAMPLE = {
    "lubimov": "Your number. Again. I write it down, and tomorrow I will know you. Three days. With work. Do not look at me like that, I did not make the cold.",
    "fomin": "Nothing bad, brother, nothing bad. The kum just likes to know who people are. There is a warm place coming free. Think about it. We can all help each other a little.",
    "pasha": "The percentage is a hundred and twenty. Do not argue with me, argue with the inspector. The quota is the quota. Somebody has to have done the measuring, and it will not be me.",
    "lev": "They gave me five years for a paper I read aloud. Pain and suffering are always inevitable for a large intelligence and a deep heart. A man who was never hungry wrote that.",
    "kuzma": "Good boots. Everybody saw them at the gate. Sleep with them under your head, and your head on them. Downriver, three days on the ice, there is a settlement of the free ones. They feed you. Then they sell you back. Upriver there is nothing. Nothing is better.",
    "vaska": "Nice jacket. Warm, is it? Take it off, brother, I only want to see. No? Then we will sit here a while, the three of us, and talk about how warm it is.",
    "alyosha": "They will take the bread off you at the gate one day. Give it to me. God sees it, and so do the rats, but the rats are lazier than the warders. Christ is risen, brother.",
    "smith": "I hear you are a man who thinks about fences. I have fifteen centimetres of good steel. Three pinches of tobacco. Not two. Three. And you never saw me.",
    "commissioner": "Any complaints, prisoners? Speak freely. The Soviet state listens. Comrade commandant, the paths are very clean. Write that down, please. Very clean.",
    "nina": "My dear. The collective farm paid for the year in workdays, which is to say in nothing. I paint carpets on canvas now and sell them at the station. Swans, mostly. Are you well?",
    "prisoner": "Fifty-eight ten. Ten years. I said something at a table, in front of a man I had known for twenty years. How much do they feed us? What kills men here? I don't think about fences. Nothing. A worker.",
}


def load_voices():
    return json.loads(VOICES_JSON.read_text()) if VOICES_JSON.exists() else {}


def save_voices(v):
    VOICES_JSON.write_text(json.dumps(v, indent=2))


def design_previews(name, spec):
    body = {
        "voice_description": spec["description"],
        "text": SAMPLE[name],
        "model_id": "eleven_multilingual_ttv_v2",
    }
    status, data, _ = request("POST", "/v1/text-to-voice/design", body)
    if status == 404:  # older API name
        status, data, _ = request("POST", "/v1/text-to-voice/create-previews", body)
    if status != 200:
        fail(status, data, f"design {name}")
    previews = json.loads(data)["previews"]
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    ids = []
    for i, p in enumerate(previews):
        (PREVIEW_DIR / f"{name}_{i}.mp3").write_bytes(base64.b64decode(p["audio_base_64"]))
        ids.append(p["generated_voice_id"])
    print(f"  {name}: {len(ids)} previews -> assets/voice/previews/{name}_*.mp3")
    return ids


def create_voice(name, spec, generated_id):
    body = {"voice_name": spec["name"], "voice_description": spec["description"], "generated_voice_id": generated_id}
    status, data, _ = request("POST", "/v1/text-to-voice", body)
    if status == 404:
        status, data, _ = request("POST", "/v1/text-to-voice/create-voice-from-preview", body)
    if status != 200:
        fail(status, data, f"create voice {name}")
    return json.loads(data)["voice_id"]


def duration(path):
    import subprocess
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def cmd_design(argv):
    picks = {}
    redo = [argv[i + 1] for i, a in enumerate(argv) if a == "--redo" and i + 1 < len(argv)]
    for a in argv:
        if a.startswith("--pick") or a == "--redo" or a in redo:
            continue
        if "=" in a:
            k, v = a.split("=", 1)
            picks[k] = int(v)
    voices = manifest()["voices"]
    state = load_voices()
    for name, spec in voices.items():
        if spec.get("oneoff"):
            continue
        st = state.setdefault(name, {})
        if name in redo and "voice_id" in st:
            # a new voice for this character: the old one is kept on its account for comparison;
            # of the previews, the briskest (shortest for the same sample) is taken, unless picked
            st.setdefault("previous", []).append({"voice_id": st["voice_id"], "account": st.get("account", "saved"), "picked": st.get("picked")})
            st["previews"] = design_previews(name, spec)
            durs = [duration(PREVIEW_DIR / f"{name}_{i}.mp3") for i in range(len(st["previews"]))]
            pick = picks.get(name, durs.index(min(durs)) if durs else 0)
            st["voice_id"] = create_voice(name, spec, st["previews"][pick])
            st["picked"] = pick
            st["account"] = __import__("eleven").LAST_KEY_NAME or "saved"
            print(f"  {name}: new voice from preview {pick} ({', '.join(f'{d:.1f}s' for d in durs)}) on the {st['account']} account")
            save_voices(state)
            continue
        if name in picks:
            if "previews" not in st:
                sys.exit(f"{name}: no previews recorded yet, run design first")
            st["voice_id"] = create_voice(name, spec, st["previews"][picks[name]])
            st["picked"] = picks[name]
            print(f"  {name}: voice created from preview {picks[name]}")
        elif "voice_id" in st:
            print(f"  {name}: already has a voice, skipped")
            continue
        else:
            st["previews"] = design_previews(name, spec)
            st["voice_id"] = create_voice(name, spec, st["previews"][0])
            st["picked"] = 0
            st["account"] = __import__("eleven").LAST_KEY_NAME or "saved"
            print(f"  {name}: voice created from preview 0 on the {st['account']} account")
        save_voices(state)
    print("done")


def record_line(line_id, line, voices, settings):
    v = voices.get(line["voice"], {}).get("voice_id")
    if not v:
        sys.exit(f"{line_id}: voice '{line['voice']}' has no id yet, run: gen_voice.py design")
    body = {
        "text": line["text"],
        "model_id": line.get("model", "eleven_multilingual_v2"),   # eleven_v3 for a line with [laughs] or [coughs] in it
        "voice_settings": {
            "stability": settings.get("stability", 0.6),
            "similarity_boost": settings.get("similarity_boost", 0.8),
            "style": settings.get("style", 0.2),
            "use_speaker_boost": True,
        },
    }
    if settings.get("speed"):
        body["voice_settings"]["speed"] = settings["speed"]
    if line.get("lang"):
        body["language_code"] = line["lang"]
    status, data, ctype = request("POST", f"/v1/text-to-speech/{v}", body,
                                  query={"output_format": "mp3_44100_128"}, accept="audio/mpeg")
    if status != 200 or not ctype.startswith("audio"):
        fail(status, data, f"line {line_id}")
    (VOICE_DIR / f"{line_id}.mp3").write_bytes(data)
    print(f"  {line_id}.mp3  {len(data)//1024} KB")


def cmd_lines(argv):
    force = "--force" in argv
    only = [a for a in argv if not a.startswith("--")]
    m = manifest()
    voices = load_voices()
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    for line_id, line in m["lines"].items():
        if only and line_id not in only:
            continue
        if m["voices"][line["voice"]].get("oneoff"):
            continue
        spec = m["voices"][line["voice"]]
        takes = [(line_id, spec.get("settings", {}))]
        # a voice with states (the prisoner): the same line again, thinner, then nearly gone
        for state, st in (spec.get("states") or {}).items():
            takes.append((f"{line_id}_{state}", {**spec.get("settings", {}), **st.get("settings", {})}))
        for take_id, settings in takes:
            if (VOICE_DIR / f"{take_id}.mp3").exists() and not force:
                print(f"  {take_id}.mp3  exists, skipped")
                continue
            record_line(take_id, line, voices, settings)
    print("done")


def silences(path):
    """(start, end) of each pause in an mp3, from ffmpeg's silencedetect."""
    import subprocess, re
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    dur = float(re.search(r"Duration: (\d+):(\d+):([0-9.]+)", out).group(3)) + 60 * int(re.search(r"Duration: (\d+):(\d+)", out).group(2))
    return list(zip(starts, ends)), dur


def cut(src, dst, start, end):
    import subprocess
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-ss", f"{start:.3f}"]
    if end is not None:
        cmd += ["-to", f"{end:.3f}"]
    cmd += ["-c:a", "libmp3lame", "-b:a", "128k", str(dst)]
    subprocess.run(cmd, check=True)


def align_cut(take, lines):
    """Cut a take into its lines at the word timings from ElevenLabs speech-to-text.
    Returns False (and cuts nothing) if the words cannot be matched."""
    import re, uuid, urllib.request, urllib.error
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() \
        + take.read_bytes() + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, method="POST")
    req.add_header("xi-api-key", api_key())
    req.add_header("content-type", f"multipart/form-data; boundary={b}")
    try:
        try:
            raw = urllib.request.urlopen(req, timeout=180).read()
        except urllib.error.HTTPError as e:
            if e.code in (401, 402, 429) and next_key("speech-to-text"):
                req.add_header("xi-api-key", api_key())
                raw = urllib.request.urlopen(req, timeout=180).read()
            else:
                raise
        words = [w for w in json.loads(raw)["words"] if w.get("type") == "word"]
    except Exception as e:
        print(f"  speech-to-text failed ({e}); falling back to pauses")
        return False
    norm = lambda t: re.sub(r"[^a-z']", "", t.lower())
    spans, i = [], 0
    for lid, line in lines:
        want = [norm(w) for w in line["text"].split() if norm(w)]
        while i < len(words) and norm(words[i]["text"]) != want[0]:
            i += 1
        j = i + len(want) - 1
        if j >= len(words):
            print(f"  {lid}: could not find it in the take; falling back to pauses")
            return False
        spans.append((lid, words[i]["start"], words[j]["end"]))
        i = j + 1
    for n, (lid, s0, e0) in enumerate(spans):
        a, z = max(0, s0 - .12), e0 + .25
        if n + 1 < len(spans):
            z = min(z, (e0 + spans[n + 1][1]) / 2)
        cut(take, VOICE_DIR / f"{lid}.mp3", a, z)
        print(f"  {lid}.mp3  {a:.1f}s to {z:.1f}s (aligned)")
    return True


def cmd_oneoff(argv):
    force = "--force" in argv
    picks = dict((a.split("=", 1)[0], int(a.split("=", 1)[1])) for a in argv if "=" in a)
    only = [a for a in argv if not a.startswith("--") and "=" not in a]   # oneoff settler --force: only this voice
    m = manifest()
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    for name, spec in m["voices"].items():
        if not spec.get("oneoff") or (only and name not in only):
            continue
        lines = [(lid, l) for lid, l in m["lines"].items() if l["voice"] == name]
        if not force and all((VOICE_DIR / f"{lid}.mp3").exists() for lid, _ in lines):
            print(f"  {name}: lines exist, skipped")
            continue
        take = [PREVIEW_DIR / f"{name}_take_{i}.mp3" for i in range(3)]
        if force or not take[0].exists():
            text = (" ... ... " if len(lines) > 2 else " ... ").join(l["text"] for _, l in lines)
            if len(text) < 100:
                sys.exit(f"{name}: a one-off take needs at least 100 characters, has {len(text)}")
            body = {"voice_description": spec["description"], "text": text, "model_id": "eleven_multilingual_ttv_v2"}
            status, data, _ = request("POST", "/v1/text-to-voice/design", body)
            if status != 200:
                fail(status, data, f"oneoff {name}")
            for i, p in enumerate(json.loads(data)["previews"][:3]):
                take[i].write_bytes(base64.b64decode(p["audio_base_64"]))
            print(f"  {name}: 3 takes -> assets/voice/previews/{name}_take_*.mp3")
        src = take[picks.get(name, 0)]
        if len(lines) == 1:
            cut(src, VOICE_DIR / f"{lines[0][0]}.mp3", 0, None)
            print(f"  {lines[0][0]}.mp3  from take {picks.get(name, 0)}")
            continue
        if align_cut(src, lines):
            continue
        # split the take where the lines meet. The lines are read with long pauses between them, so the
        # longest pauses are the boundaries; with only two lines, take the pause nearest the expected point.
        pauses, dur = silences(src)
        sizes = [len(l["text"]) for _, l in lines]
        if len(lines) > 2 and len(pauses) >= len(lines) - 1:
            bounds = sorted(sorted(pauses, key=lambda p: p[1] - p[0], reverse=True)[:len(lines) - 1])
        else:
            total, bounds, acc = sum(sizes), [], 0
            for n in sizes[:-1]:
                acc += n
                want = dur * acc / total
                best = min(pauses, key=lambda p: abs((p[0] + p[1]) / 2 - want)) if pauses else (want, want)
                bounds.append(best)
        t0 = 0.0
        for i, (lid, _) in enumerate(lines):
            end = bounds[i][0] + 0.15 if i < len(bounds) else None
            cut(src, VOICE_DIR / f"{lid}.mp3", t0, end)
            print(f"  {lid}.mp3  {t0:.1f}s to {'end' if end is None else f'{end:.1f}s'}")
            t0 = max(0.0, bounds[i][1] - 0.15) if i < len(bounds) else t0
    print("done")


if __name__ == "__main__":
    args = sys.argv[1:]
    cmds = {"design": cmd_design, "lines": cmd_lines, "oneoff": cmd_oneoff}
    if not args or args[0] not in cmds:
        sys.exit(__doc__)
    cmds[args[0]](args[1:])
