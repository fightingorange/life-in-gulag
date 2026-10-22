"""Shared helpers for the ElevenLabs scripts. Standard library only.

The API key is read from ~/.config/elevenlabs/api-key.txt (or $ELEVENLABS_API_KEY)
and is never printed.
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


def api_key():
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        p = Path.home() / ".config" / "elevenlabs" / "api-key.txt"
        if p.exists():
            k = p.read_text().strip()
    if not k:
        sys.exit("no ElevenLabs key: set ELEVENLABS_API_KEY or create ~/.config/elevenlabs/api-key.txt")
    return k


def manifest():
    return json.loads(MANIFEST.read_text())


def request(method, path, body=None, query=None, accept="application/json"):
    """Returns (status, bytes, content_type). Raises nothing; caller checks status."""
    url = BASE + path
    if query:
        url += "?" + "&".join(f"{k}={v}" for k, v in query.items())
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("xi-api-key", api_key())
    req.add_header("accept", accept)
    if data is not None:
        req.add_header("content-type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, r.read(), r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers.get("content-type", "")


def fail(status, body, what):
    text = body.decode("utf-8", "replace")[:600]
    sys.exit(f"{what}: HTTP {status}\n{text}")
