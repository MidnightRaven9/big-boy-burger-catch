#!/usr/bin/env python3
"""Build articulated sprite layers from the ORIGINAL mascot PNG.

The source artwork is a single flattened image. This script cuts it into
independently animatable layers (legs, torso, arm, head, plate arm) and draws
expression variants of the head using colors sampled from the original image.
No substitute or generic character art is introduced.

Run: python3 scripts/build-mascot-layers.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "assets" / "mascot.png"
OUT = ROOT / "public" / "assets" / "mascot"
SX, SY = 1086, 1448  # original artwork pixel size

# Source rectangles as fractions of the original image (x0, y0, x1, y1).
LAYERS = {
    "leg-back": (0.384, 0.600, 0.723, 0.985),
    "leg-front": (0.089, 0.600, 0.383, 0.985),
    "torso": (0.239, 0.380, 0.699, 0.659),
    "arm-left": (0.119, 0.400, 0.339, 0.659),
    "plate-arm": (0.519, 0.230, 0.939, 0.639),
    "head": (0.121, 0.005, 0.579, 0.440),
}

# Rotation/animation pivots as fractions of the original image.
PIVOTS = {
    "leg-back": (0.5535, 0.610),
    "leg-front": (0.2360, 0.610),
    "arm-left": (0.2290, 0.410),
    "head": (0.3500, 0.435),
}

# Facial features measured from the original artwork, in image fractions.
EYES = {
    "left": (0.3794, 0.2479, 0.4650, 0.3066),
    "right": (0.5239, 0.2383, 0.5783, 0.2887),
}
MOUTH = (0.4401, 0.3204, 0.5783, 0.3600)

SKIN = (252, 190, 159, 255)       # sampled from original face
SKIN_SHADE = (240, 168, 137, 255)
OUTLINE = (24, 12, 10, 255)       # sampled hair/eye outline
WHITE = (255, 253, 250, 255)
MOUTH_DARK = (92, 18, 20, 255)
SPARKLE = (255, 231, 120, 255)


def crop(img: Image.Image, rect: tuple[float, float, float, float]) -> Image.Image:
    w, h = img.size
    x0, y0, x1, y1 = rect
    return img.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))


def to_local(rect: tuple[float, float, float, float], fx: float, fy: float) -> tuple[int, int]:
    """Fractional artwork coordinate -> pixel coordinate inside the head crop."""
    x0, y0, _x1, _y1 = rect
    return (round((fx - x0) * SX), round((fy - y0) * SY))


def draw_sparkle(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=SPARKLE)
    d.ellipse((cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3), fill=WHITE)


def make_blink(head: Image.Image, rect: tuple[float, float, float, float]) -> Image.Image:
    """Natural blink: closed eyelids drawn in the original skin/outline tones."""
    out = head.copy()
    d = ImageDraw.Draw(out)
    for box in EYES.values():
        l, t, r, b = box
        cx, cy = to_local(rect, (l + r) / 2, (t + b) / 2)
        ew = max(10, round((r - l) * SX * 0.58))
        eh = max(8, round((b - t) * SY * 0.55))
        d.ellipse((cx - ew, cy - eh, cx + ew, cy + eh), fill=SKIN)
        d.arc((cx - ew + 2, cy - 4, cx + ew - 2, cy + eh), start=190, end=350, fill=OUTLINE, width=7)
    return out


def make_happy(head: Image.Image, rect: tuple[float, float, float, float]) -> Image.Image:
    """Excited smile: sparkling eyes, wider grin, celebratory cheeks."""
    out = head.copy()
    d = ImageDraw.Draw(out)
    for box in EYES.values():
        l, t, r, b = box
        ex, ey = to_local(rect, (l + r) / 2, (t + b) / 2)
        draw_sparkle(d, ex - 3, ey - 2, max(4, round((r - l) * SX * 0.16)))
    ml, mt, mr, mb = MOUTH
    lx, ty = to_local(rect, ml, mt)
    rx, by = to_local(rect, mr, mb)
    d.arc((lx, ty - 6, rx, by + 10), start=12, end=168, fill=OUTLINE, width=max(4, round((by - ty) * 0.16)))
    blush = (247, 150, 140, 110)
    for side in (lx + 12, rx - 12):
        d.ellipse((side - 14, by - 2, side + 14, by + 18), fill=blush)
    return out


def make_shock(head: Image.Image, rect: tuple[float, float, float, float]) -> Image.Image:
    """Shocked face: wide eyes, small pupils, open mouth."""
    out = head.copy()
    d = ImageDraw.Draw(out)
    for box in EYES.values():
        l, t, r, b = box
        cx, cy = to_local(rect, (l + r) / 2, (t + b) / 2)
        ew = max(10, round((r - l) * SX * 0.62))
        eh = max(10, round((b - t) * SY * 0.62))
        # soften original eye, then draw a large white eye with pupil
        d.ellipse((cx - ew, cy - eh, cx + ew, cy + eh), fill=SKIN)
        d.ellipse((cx - ew + 3, cy - eh + 3, cx + ew - 3, cy + eh - 3), fill=WHITE, outline=OUTLINE, width=4)
        pr = max(6, round(ew * 0.42))
        d.ellipse((cx - pr, cy - pr // 2, cx + pr, cy + pr), fill=OUTLINE)
        d.ellipse((cx - pr + 3, cy - pr // 2 + 2, cx + pr - 3, cy + pr - 4), fill=WHITE)
    ml, mt, mr, mb = MOUTH
    cx, cy = to_local(rect, (ml + mr) / 2, (mt + mb) / 2 + 0.006)
    mw = max(12, round((mr - ml) * SX * 0.24))
    mh = max(10, round((mb - mt) * SY * 0.78))
    d.ellipse((cx - mw - 4, cy - mh - 4, cx + mw + 4, cy + mh + 4), fill=SKIN)
    d.ellipse((cx - mw, cy - mh, cx + mw, cy + mh), fill=MOUTH_DARK, outline=OUTLINE, width=4)
    return out


def make_sad(head: Image.Image, rect: tuple[float, float, float, float]) -> Image.Image:
    """Disappointed face: droopy lids and a small frown."""
    out = head.copy()
    d = ImageDraw.Draw(out)
    for box in EYES.values():
        l, t, r, b = box
        cx, cy = to_local(rect, (l + r) / 2, (t + b) / 2)
        ew = max(10, round((r - l) * SX * 0.55))
        eh = max(8, round((b - t) * SY * 0.42))
        d.ellipse((cx - ew, cy - eh, cx + ew, cy + eh // 2), fill=SKIN)
        d.arc((cx - ew, cy - eh, cx + ew, cy + eh), start=190, end=350, fill=OUTLINE, width=6)
    ml, mt, mr, mb = MOUTH
    cx, cy = to_local(rect, (ml + mr) / 2, (mt + mb) / 2)
    mw = max(12, round((mr - ml) * SX * 0.32))
    d.arc((cx - mw, cy - 10, cx + mw, cy + 26), start=15, end=165, fill=OUTLINE, width=7)
    return out


def main() -> None:
    image = Image.open(SRC).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)

    for name, rect in LAYERS.items():
        crop(image, rect).save(OUT / f"{name}.png")

    head_rect = LAYERS["head"]
    head = crop(image, head_rect)
    head.save(OUT / "head-normal.png")
    make_blink(head, head_rect).save(OUT / "head-blink.png")
    make_happy(head, head_rect).save(OUT / "head-happy.png")
    make_shock(head, head_rect).save(OUT / "head-shock.png")
    make_sad(head, head_rect).save(OUT / "head-sad.png")

    metadata = {
        "source": {"width": image.width, "height": image.height},
        "layers": LAYERS,
        "pivots": PIVOTS,
        "expressionHeads": {
            "normal": "mascot/head-normal.png",
            "blink": "mascot/head-blink.png",
            "happy": "mascot/head-happy.png",
            "shock": "mascot/head-shock.png",
            "sad": "mascot/head-sad.png",
        },
        "plate": {
            "x": 0.7675,
            "y": 0.2762,
            "radiusX": 0.176,
        },
    }
    (OUT / "layers.json").write_text(json.dumps(metadata, indent=2) + "\n")

    # A typed copy is imported by the runtime so the offline/file:// build never
    # needs fetch(), which browsers block for local files.
    ts = ROOT / "src" / "game" / "mascotLayers.generated.ts"
    ts.write_text(
        "// GENERATED FILE - run `npm run build:mascot-layers` to update.\n"
        "export const MASCOT_SOURCE = "
        + json.dumps(metadata["source"], indent=2)
        + " as const;\n\n"
        "export const MASCOT_LAYER_RECTS = "
        + json.dumps(metadata["layers"], indent=2)
        + " as const;\n\n"
        "export type MascotLayerName = keyof typeof MASCOT_LAYER_RECTS;\n\n"
        "export const MASCOT_PIVOTS = "
        + json.dumps(metadata["pivots"], indent=2)
        + " as const satisfies Partial<Record<MascotLayerName, readonly [number, number]>>;\n\n"
        "export const MASCOT_EXPRESSION_HEADS = "
        + json.dumps(metadata["expressionHeads"], indent=2)
        + " as const;\n\n"
        "export type MascotExpression = keyof typeof MASCOT_EXPRESSION_HEADS;\n\n"
        "export const MASCOT_PLATE = "
        + json.dumps(metadata["plate"], indent=2)
        + " as const;\n"
    )
    print(f"Wrote {len(LAYERS)} articulated layers + 5 expression heads to {OUT}")
    print(f"Wrote typed metadata to {ts}")


if __name__ == "__main__":
    main()
