"""Shared helpers for the ElevenLabs scripts. Standard library only.

Keys, in order, never printed:
  1. $ELEVENLABS_API_KEY, or ~/.config/elevenlabs/api-key.txt
  2. a fallback: ELEVENLABS_API_KEY in ~/.config/beszedtanulas/elevenlabs.env
If a request is refused because the current key has run out of credits, the next key is used.
Saved character voices belong to the first account; the fallback account cannot speak them, so
only sound effects, one-off voices and speech-to-text carry over.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
MANIFEST = ASSETS / "manifest.json"
BASE = "https://api.elevenlabs.io"


FALLBACK_ENV = Path.home() / ".config" / "beszedtanulas" / "elevenlabs.env"


def _env_value(path, name):
    if not path.exists():
        return ""
    for line in path.read_text().splitlines():
        line = line.strip()
        if line.startswith("export "):
            line = line[7:].strip()
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _keys():
    keys = []
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        p = Path.home() / ".config" / "elevenlabs" / "api-key.txt"
        if p.exists():
            k = p.read_text().strip()
    if k:
        keys.append(k)
    f = _env_value(FALLBACK_ENV, "ELEVENLABS_API_KEY")
    if f and f not in keys:
        keys.append(f)
    if not keys:
        sys.exit("no ElevenLabs key: set ELEVENLABS_API_KEY or create ~/.config/elevenlabs/api-key.txt")
    return keys


KEYS = None
CURRENT = 0


def api_key():
    global KEYS
    if KEYS is None:
        KEYS = _keys()
    return KEYS[CURRENT]


def _out_of_credits(status, body):
    if status not in (401, 402, 429):
        return False
    text = body.decode("utf-8", "replace").lower()
    return any(w in text for w in ("quota", "credit", "exceeded", "insufficient"))


def next_key(reason=""):
    """Move to the fallback key. Returns False if there is none left."""
    global CURRENT
    api_key()
    if CURRENT + 1 >= len(KEYS):
        return False
    CURRENT += 1
    print(f"  ElevenLabs key {CURRENT} has run out{(' (' + reason + ')') if reason else ''}; using key {CURRENT + 1}")
    return True


def manifest():
    return json.loads(MANIFEST.read_text())


def request(method, path, body=None, query=None, accept="application/json"):
    """Returns (status, bytes, content_type). Raises nothing; caller checks status."""
    url = BASE + path
    if query:
        url += "?" + "&".join(f"{k}={v}" for k, v in query.items())
    data = json.dumps(body).encode() if body is not None else None
    while True:
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("xi-api-key", api_key())
        req.add_header("accept", accept)
        if data is not None:
            req.add_header("content-type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.status, r.read(), r.headers.get("content-type", "")
        except urllib.error.HTTPError as e:
            status, body, ctype = e.code, e.read(), e.headers.get("content-type", "")
        if _out_of_credits(status, body) and next_key("out of credits"):
            continue
        if status == 404 and CURRENT > 0 and b"voice" in body.lower():
            print("  this voice is saved on the first ElevenLabs account; the fallback account cannot speak it")
        return status, body, ctype


def fail(status, body, what):
    text = body.decode("utf-8", "replace")[:600]
    sys.exit(f"{what}: HTTP {status}\n{text}")
