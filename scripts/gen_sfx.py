#!/usr/bin/env python3
"""Generate the sound effects and ambient loops listed in assets/manifest.json.

    python3 scripts/gen_sfx.py                  # everything that is missing
    python3 scripts/gen_sfx.py rail dogs        # only these
    python3 scripts/gen_sfx.py --force rail     # regenerate even if the file exists
    python3 scripts/gen_sfx.py --takes 3 rail   # three more candidates in assets/sfx/candidates/, the game's file untouched
    python3 scripts/gen_sfx.py --pick rail=2    # use candidate 2 as assets/sfx/rail.mp3 (the old one is kept as rail_previous)
    python3 scripts/gen_sfx.py --seam           # make every loop seamless (skips files already done)

Output: assets/sfx/<name>.mp3. Then run scripts/levels.py.

A file that goes into the game (generated straight into assets/sfx/, or picked) is finished first:
a high-pass if the manifest gives one ("highpass": Hz; generated sounds often carry a rumble under
20-60 Hz that nobody hears but every meter does), brought to a working level, and for loops made
seamless.

Seamless loops ("loop": true): the last 1.5 s is crossfaded over the first 1.5 s and cut off, so the end
flows into the start. Then the first 0.3 s is appended again at the end. The game loops each bed in Web
Audio from 0.15 s to 0.15 s + one period (js/audio.js); inside that repeated stretch the file is the same
one period apart, so the loop is sample-exact whether or not the browser's MP3 decoder trims the
encoder's silence at the start (about 25 ms) and the padding at the end. The period is kept in the file's
comment tag ("seamless <samples>"), which scripts/levels.py writes into js/levels.js as LOOPS.
Needs ffmpeg. Standard library only.
"""
import math
import shutil
import subprocess
import sys
from array import array
from eleven import ASSETS, manifest, request, fail

OUT = ASSETS / "sfx"
CAND = OUT / "candidates"
RATE = 44100
XFADE = 1.5       # seconds of tail crossfaded over the head
EDGE = 0.2        # seconds cut from each end first: generated files often fade in and out there
POST = 0.3        # seconds of the head repeated after the end
SEARCH = 1.5      # seconds searched for the best place to start the tail
TAG = "seamless"
BED_RMS = -30.0   # dBFS a finished loop is brought to (levels.py matches them exactly)
BED_PEAK = -1.0
HIT_PEAK = -3.0   # dBFS peak of a finished one-shot


def generate(name, spec, dest):
    body = {
        "text": spec["text"],
        "duration_seconds": spec.get("seconds", 5),
        "prompt_influence": spec.get("influence", 0.4),
        "loop": bool(spec.get("loop", False)),
    }
    status, data, ctype = request("POST", "/v1/sound-generation", body,
                                  query={"output_format": "mp3_44100_128"}, accept="audio/mpeg")
    if status != 200 or not ctype.startswith("audio"):
        fail(status, data, f"sfx {name}")
    dest.write_bytes(data)
    print(f"  {dest.relative_to(ASSETS)}  {len(data)//1024} KB  ({body['duration_seconds']}s{', loop' if body['loop'] else ''})")
    if dest.parent == OUT:
        finish(dest, spec)


# ---------- finishing (ffmpeg decodes and encodes; the arithmetic is plain Python) ----------
def _probe(path, entry):
    return subprocess.run(["ffprobe", "-v", "error", "-show_entries", entry, "-of", "csv=p=0", str(path)],
                          capture_output=True, text=True).stdout.strip()


def period(path):
    """samples in one period of a seamless loop, or None"""
    tag = _probe(path, "format_tags=comment").split()
    return int(tag[1]) if len(tag) == 2 and tag[0] == TAG and tag[1].isdigit() else None


def _decode(path, af=None):
    ch = int(_probe(path, "stream=channels").splitlines()[0])
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)] + (["-af", af] if af else []) + ["-f", "f32le", "-ar", str(RATE), "-"]
    x = array("f"); x.frombytes(subprocess.run(cmd, capture_output=True, check=True).stdout)
    return x, ch


def _encode(x, ch, path, comment=None):
    tmp = path.with_suffix(".tmp.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", str(ch), "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "128k"] + (["-metadata", f"comment={comment}"] if comment else []) + [str(tmp)],
                   input=x.tobytes(), check=True)
    tmp.replace(path)


def _align(x, ch, frames, n, step=441):
    """where the tail that is crossfaded over the head should start: somewhere in the last SEARCH seconds
    before the end, where the loudness moves most like the head's, so a rhythm (a heartbeat, footsteps)
    does not stumble across the seam. For steady noise any choice is as good, and this costs a second at most."""
    env = []
    for i in range(frames // step):
        s = x[i * step * ch:(i + 1) * step * ch]
        env.append(math.sqrt(sum(v * v for v in s) / len(s)) + 1e-9)
    env = [math.log(v) for v in env]
    m = n // step
    head = env[:m]; hm = sum(head) / m; hc = [v - hm for v in head]
    hn = math.sqrt(sum(v * v for v in hc)) or 1e-9
    best, at = -2.0, frames - n
    for s in range(max(m, (frames - n - int(SEARCH * RATE)) // step), (frames - n) // step + 1):
        seg = env[s:s + m]
        if len(seg) < m:
            break
        sm = sum(seg) / m; sc = [v - sm for v in seg]
        c = sum(a * b for a, b in zip(hc, sc)) / (hn * (math.sqrt(sum(v * v for v in sc)) or 1e-9))
        if c > best:
            best, at = c, s * step
    return at


def _seam(x, ch):
    """the loop made seamless, plus POST seconds of its head again; returns (samples, period in frames, r)"""
    edge = int(EDGE * RATE) * ch
    x = x[edge:len(x) - edge]
    frames = len(x) // ch
    n = min(int(XFADE * RATE), frames // 4)
    p = _align(x, ch, frames, n)
    head, tail = x[:n * ch], x[p * ch:(p + n) * ch]
    # how alike head and tail are decides the fade law: equal power for unrelated noise (wind),
    # closer to equal gain for a steady tone (a bulb's hum), so the middle of the fade neither dips nor bulges
    hh = sum(v * v for v in head); tt = sum(v * v for v in tail); ht = sum(a * b for a, b in zip(head, tail))
    r = ht / math.sqrt(hh * tt) if hh and tt else 0.0
    out = array("f", x[:p * ch])
    for i in range(n):
        t = (i + .5) / n
        a, b = math.sin(t * math.pi / 2), math.cos(t * math.pi / 2)
        k = 1 / math.sqrt(max(1e-6, a * a + b * b + 2 * r * a * b))
        for c in range(ch):
            j = i * ch + c
            out[j] = head[j] * a * k + tail[j] * b * k
    out.extend(out[:int(POST * RATE) * ch])
    return out, p, r


def _scale(x, loop):
    peak = max(abs(v) for v in x) or 1e-9
    if loop:
        rms = math.sqrt(sum(v * v for v in x) / len(x)) or 1e-9
        g = min(10 ** (BED_RMS / 20) / rms, 10 ** (BED_PEAK / 20) / peak)
    else:
        g = 10 ** (HIT_PEAK / 20) / peak
    return array("f", (v * g for v in x)), 20 * math.log10(g)


def finish(path, spec):
    hp = spec.get("highpass")
    x, ch = _decode(path, f"highpass=f={hp},highpass=f={hp}" if hp else None)
    loop = bool(spec.get("loop"))
    x, gain = _scale(x, loop)
    note = f"{'high-pass ' + str(hp) + ' Hz, ' if hp else ''}gain {gain:+.1f} dB"
    if loop:
        x, p, r = _seam(x, ch)
        _encode(x, ch, path, f"{TAG} {p}")
        note += f", seamless: period {p / RATE:.3f}s (+{POST}s), r={r:+.2f}"
    else:
        _encode(x, ch, path)
    print(f"  {path.name}  finished: {note}")


def seam(path, force=False):
    """make an existing loop seamless, nothing else"""
    if period(path) and not force:
        print(f"  {path.name}  already seamless")
        return
    x, ch = _decode(path)
    x, p, r = _seam(x, ch)
    _encode(x, ch, path, f"{TAG} {p}")
    print(f"  {path.name}  seamless: period {p / RATE:.3f}s (+{POST}s), r={r:+.2f}")


def main(argv):
    force = "--force" in argv
    takes = 0
    if "--takes" in argv:
        i = argv.index("--takes"); takes = int(argv[i + 1]); del argv[i:i + 2]
    sfx = manifest()["sfx"]
    OUT.mkdir(parents=True, exist_ok=True)
    if "--pick" in argv:
        for a in argv[argv.index("--pick") + 1:]:
            n, k = a.split("=")
            src, dest = CAND / f"{n}_{k}.mp3", OUT / f"{n}.mp3"
            if dest.exists() and not (CAND / f"{n}_previous.mp3").exists():
                shutil.copyfile(dest, CAND / f"{n}_previous.mp3")
            shutil.copyfile(src, dest)
            print(f"  {n}.mp3  <- {src.name}")
            finish(dest, sfx[n])
        return
    names = [a for a in argv if not a.startswith("--")]
    if "--seam" in argv:
        for n in names or [k for k, v in sfx.items() if v.get("loop")]:
            if (OUT / f"{n}.mp3").exists():
                seam(OUT / f"{n}.mp3", force)
        return
    todo = names or list(sfx)
    for n in todo:
        if n not in sfx:
            sys.exit(f"unknown sfx: {n}")
        if takes:
            CAND.mkdir(exist_ok=True)
            have = [int(s) for s in (f.stem[len(n) + 1:] for f in CAND.glob(f"{n}_*.mp3")) if s.isdigit()]
            first = max(have, default=0) + 1
            for k in range(first, first + takes):
                generate(n, sfx[n], CAND / f"{n}_{k}.mp3")
            continue
        if (OUT / f"{n}.mp3").exists() and not force:
            print(f"  {n}.mp3  exists, skipped")
            continue
        generate(n, sfx[n], OUT / f"{n}.mp3")
    print("done")


if __name__ == "__main__":
    main(sys.argv[1:])
