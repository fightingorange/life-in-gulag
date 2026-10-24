"""Shared helpers for the ElevenLabs scripts. Standard library only.

Keys, never printed:
  saved   ~/.config/elevenlabs/api-key.txt (or $ELEVENLABS_API_KEY): the account that holds the game's
          saved character voices (assets/voice/voices.json). Only it can speak them.
  fresh   ~/.config/elevenlabs/api-key-new.txt: a second account with its own credits, used first for
          everything that is not a saved voice: one-off voices, sound effects, speech-to-text.
  spare   ELEVENLABS_API_KEY in ~/.config/beszedtanulas/elevenlabs.env, nearly used up.
A request that needs a saved voice goes to the saved account; anything else goes to the fresh account
first. If a key is refused for want of credits, the next one in that order is tried.
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


def _read(path):
    return path.read_text().strip() if path.exists() else ""


def _named_keys():
    """{'saved': key, 'fresh': key, 'spare': key}, only those that exist."""
    out = {}
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip() or _read(Path.home() / ".config" / "elevenlabs" / "api-key.txt")
    if k:
        out["saved"] = k
    f = _read(Path.home() / ".config" / "elevenlabs" / "api-key-new.txt")
    if f and f not in out.values():
        out["fresh"] = f
    e = _env_value(FALLBACK_ENV, "ELEVENLABS_API_KEY")
    if e and e not in out.values():
        out["spare"] = e
    if not out:
        sys.exit("no ElevenLabs key: set ELEVENLABS_API_KEY or create ~/.config/elevenlabs/api-key.txt")
    return out


def _keys():
    """The general order: the fresh account first, then the saved one, then the spare."""
    n = _named_keys()
    return [n[k] for k in ("fresh", "saved", "spare") if k in n]


def _saved_voice_ids():
    try:
        v = json.loads((ASSETS / "voice" / "voices.json").read_text())
        return {x.get("voice_id") for x in v.values() if x.get("voice_id")}
    except Exception:
        return set()


def _voice_accounts():
    """{voice_id: 'saved' | 'fresh'} from assets/voice/voices.json (a voice without 'account' is on the saved one)."""
    try:
        v = json.loads((ASSETS / "voice" / "voices.json").read_text())
        return {x["voice_id"]: x.get("account", "saved") for x in v.values() if x.get("voice_id")}
    except Exception:
        return {}


def _voice_account(path):
    """The account that holds the voice a request names, or None."""
    parts = path.split("?")[0].strip("/").split("/")
    if len(parts) >= 3 and parts[1] in ("text-to-speech", "voices"):
        return _voice_accounts().get(parts[2])
    return None


LAST_KEY_NAME = None   # which account answered the last request (cmd_design records it with a new voice)


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
    global LAST_KEY_NAME
    named = _named_keys()
    acct = _voice_account(path)
    if acct and acct in named:
        order = [named[acct]] + [k for k in _keys() if k != named[acct]]
    else:
        order = _keys()
    names = {v: k for k, v in named.items()}
    for i, key in enumerate(order):
        LAST_KEY_NAME = names.get(key)
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("xi-api-key", key)
        req.add_header("accept", accept)
        if data is not None:
            req.add_header("content-type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.status, r.read(), r.headers.get("content-type", "")
        except urllib.error.HTTPError as e:
            status, body, ctype = e.code, e.read(), e.headers.get("content-type", "")
        if _out_of_credits(status, body) and i + 1 < len(order):
            print(f"  an ElevenLabs key has run out of credits; trying the next")
            continue
        if status == 404 and b"voice" in body.lower():
            print("  this voice is not on the account that was asked; saved voices live on the first account")
        return status, body, ctype
    return status, body, ctype


def fail(status, body, what):
    text = body.decode("utf-8", "replace")[:600]
    sys.exit(f"{what}: HTTP {status}\n{text}")
