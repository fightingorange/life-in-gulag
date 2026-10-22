#!/usr/bin/env python3
"""Generate the sound effects and ambient loops listed in assets/manifest.json.

    python3 scripts/gen_sfx.py              # everything that is missing
    python3 scripts/gen_sfx.py rail dogs    # only these
    python3 scripts/gen_sfx.py --force rail # regenerate even if the file exists

Output: assets/sfx/<name>.mp3
"""
import sys
from eleven import ASSETS, manifest, request, fail

OUT = ASSETS / "sfx"


def generate(name, spec):
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
    (OUT / f"{name}.mp3").write_bytes(data)
    print(f"  {name}.mp3  {len(data)//1024} KB  ({body['duration_seconds']}s{', loop' if body['loop'] else ''})")


def main(argv):
    force = "--force" in argv
    names = [a for a in argv if not a.startswith("--")]
    sfx = manifest()["sfx"]
    OUT.mkdir(parents=True, exist_ok=True)
    todo = names or list(sfx)
    for n in todo:
        if n not in sfx:
            sys.exit(f"unknown sfx: {n}")
        if (OUT / f"{n}.mp3").exists() and not force:
            print(f"  {n}.mp3  exists, skipped")
            continue
        generate(n, sfx[n])
    print("done")


if __name__ == "__main__":
    main(sys.argv[1:])
