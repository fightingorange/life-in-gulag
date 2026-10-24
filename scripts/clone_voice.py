#!/usr/bin/env python3
"""Move a character's voice to the fresh ElevenLabs account by cloning it from the lines already recorded.

    python3 scripts/clone_voice.py lubimov            # clone from assets/voice/lubimov_*.mp3; record a test line
    python3 scripts/clone_voice.py lubimov --adopt    # the clone becomes the character's voice (voices.json)
    python3 scripts/clone_voice.py lubimov --drop     # delete the clone again

A designed voice cannot be copied between accounts and has no seed to replay, but an instant clone
built from a minute or two of its own recordings comes close. The clone is kept as a candidate in
voices.json ("clone") until --adopt; until then every line is still spoken by the original. The test
line goes to assets/voice/previews/<voice>_clone_test.mp3 beside a copy of the original for listening.
"""
import json
import shutil
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from eleven import ASSETS, BASE, manifest, request, fail, _named_keys

VOICE_DIR = ASSETS / "voice"
PREVIEW_DIR = VOICE_DIR / "previews"
VOICES_JSON = VOICE_DIR / "voices.json"
MAX_FILES = 25           # the API's limit on samples


def samples(name):
    """The character's plain recordings, longest first, without the prisoner's thin and going takes."""
    files = [p for p in VOICE_DIR.glob(f"{name}_*.mp3") if not p.stem.endswith(("_thin", "_going"))]
    files.sort(key=lambda p: p.stat().st_size, reverse=True)
    return files[:MAX_FILES]


def clone(name, spec, files, key):
    b = uuid.uuid4().hex
    parts = []
    def field(k, v):
        parts.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    field("name", spec["name"] + " (clone)")
    field("description", spec["description"][:500])
    field("remove_background_noise", "false")
    field("labels", json.dumps({"game": "ten-years", "character": name, "origin": "instant clone of the designed voice"}))
    for p in files:
        parts.append((f"--{b}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{p.name}\"\r\n"
                      f"Content-Type: audio/mpeg\r\n\r\n").encode() + p.read_bytes() + b"\r\n")
    body = b"".join(parts) + f"--{b}--\r\n".encode()
    req = urllib.request.Request(BASE + "/v1/voices/add", data=body, method="POST")
    req.add_header("xi-api-key", key)
    req.add_header("content-type", f"multipart/form-data; boundary={b}")
    try:
        raw = urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        fail(e.code, e.read(), f"clone {name}")
    return json.loads(raw)["voice_id"]


def speak(voice_id, text, settings, out, key, lang=None):
    body = {"text": text, "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": settings.get("stability", 0.6), "similarity_boost": settings.get("similarity_boost", 0.8),
                               "style": settings.get("style", 0.2), "use_speaker_boost": True}}
    if settings.get("speed"):
        body["voice_settings"]["speed"] = settings["speed"]
    if lang:
        body["language_code"] = lang
    req = urllib.request.Request(BASE + f"/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128", data=json.dumps(body).encode(), method="POST")
    req.add_header("xi-api-key", key)
    req.add_header("content-type", "application/json")
    req.add_header("accept", "audio/mpeg")
    try:
        out.write_bytes(urllib.request.urlopen(req, timeout=180).read())
    except urllib.error.HTTPError as e:
        fail(e.code, e.read(), f"test line for {voice_id}")


def main(argv):
    if not argv or argv[0].startswith("--"):
        sys.exit(__doc__)
    name, flags = argv[0], argv[1:]
    m = manifest()
    spec = m["voices"].get(name)
    if not spec:
        sys.exit(f"no voice '{name}' in the manifest")
    v = json.loads(VOICES_JSON.read_text())
    st = v.setdefault(name, {})
    keys = _named_keys()
    key = keys.get("fresh") or keys.get("saved")
    if "--drop" in flags:
        c = st.pop("clone", None)
        if c:
            req = urllib.request.Request(BASE + f"/v1/voices/{c['voice_id']}", method="DELETE"); req.add_header("xi-api-key", key)
            urllib.request.urlopen(req, timeout=60).read()
            print(f"  {name}: clone deleted")
        VOICES_JSON.write_text(json.dumps(v, indent=2))
        return
    if "--adopt" in flags:
        c = st.get("clone")
        if not c:
            sys.exit(f"{name}: no clone to adopt; run without --adopt first")
        st.setdefault("previous", []).append({"voice_id": st.get("voice_id"), "account": st.get("account", "saved"), "picked": st.get("picked"), "note": "the designed voice, before the clone"})
        st["voice_id"], st["account"] = c["voice_id"], c["account"]
        st.pop("clone")
        VOICES_JSON.write_text(json.dumps(v, indent=2))
        print(f"  {name}: the clone is the voice now (on the {st['account']} account)")
        return
    if st.get("clone") and "--again" not in flags:
        vid = st["clone"]["voice_id"]
        print(f"  {name}: a clone exists; recording the test line again (use --again to clone afresh)")
    else:
        files = samples(name)
        if len(files) < 2:
            sys.exit(f"{name}: too few recordings to clone from ({len(files)})")
        vid = clone(name, spec, files, key)
        st["clone"] = {"voice_id": vid, "account": "fresh" if key == keys.get("fresh") else "saved", "from": [p.name for p in files]}
        VOICES_JSON.write_text(json.dumps(v, indent=2))
        print(f"  {name}: cloned from {len(files)} recordings")
    # a test line: the longest recorded English line, so the two takes can be heard side by side
    lines = [(lid, l) for lid, l in m["lines"].items() if l["voice"] == name and (VOICE_DIR / f"{lid}.mp3").exists()]
    english = [x for x in lines if not x[1].get("lang")] or lines
    lid, line = max(english, key=lambda x: len(x[1]["text"]))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    speak(vid, line["text"], spec.get("settings", {}), PREVIEW_DIR / f"{name}_clone_test.mp3", key, line.get("lang"))
    shutil.copy(VOICE_DIR / f"{lid}.mp3", PREVIEW_DIR / f"{name}_original_test.mp3")
    print(f"  listen: assets/voice/previews/{name}_original_test.mp3 and {name}_clone_test.mp3 ({lid})")


if __name__ == "__main__":
    main(sys.argv[1:])
