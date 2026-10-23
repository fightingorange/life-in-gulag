#!/usr/bin/env python3
"""Make a depth map for every drawing the game shows, for the parallax in js/glframe.js.

    python3 scripts/depth.py --model path/to/depth_anything_v2_small.onnx [names...]

Needs onnxruntime, Pillow and numpy (a virtual environment is fine), and the Depth Anything V2
Small model in ONNX form (onnx-community/depth-anything-v2-small on Hugging Face, onnx/model.onnx).
Writes assets/frames/depth/<key>.png: 480x270 greyscale, white = near, black = far.
<key> is the frame name for the master drawing, or name-0N for a variant.
"""
import argparse
import pathlib
import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / "assets/frames/web"
OUT = ROOT / "assets/frames/depth"
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def sources(names):
    out = []
    for p in sorted(WEB.glob("*.jpg")):
        out.append((p.stem, p))
    for p in sorted((WEB / "variants").glob("*.jpg")):
        out.append((p.stem, p))
    if names:
        out = [(k, p) for k, p in out if k in names or k.split("-0")[0] in names]
    return out


def depth(session, path):
    img = Image.open(path).convert("RGB")
    w, h = 518, 294                                   # multiples of 14, 16:9-ish
    x = np.asarray(img.resize((w, h), Image.BICUBIC), dtype=np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    d = session.run(None, {"pixel_values": x})[0][0]
    # relative inverse depth: larger is nearer. Normalise robustly, ignoring the extreme 2%.
    lo, hi = np.percentile(d, 2), np.percentile(d, 98)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    m = Image.fromarray((d * 255).astype(np.uint8)).resize((480, 270), Image.BICUBIC)
    # Grow the near shapes a little, then soften: a near post then carries a margin of what is behind it
    # when it shifts, instead of tearing the background into streaks at its edge.
    return m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("names", nargs="*")
    a = ap.parse_args()
    s = ort.InferenceSession(a.model, providers=["CPUExecutionProvider"])
    OUT.mkdir(parents=True, exist_ok=True)
    for key, path in sources(set(a.names)):
        depth(s, path).save(OUT / f"{key}.png", optimize=True)
        print(f"  {key}.png")
    print("done")


if __name__ == "__main__":
    main()
