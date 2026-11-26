"""Convertit les portraits détourés en vrais sprites pixel-art 16-bit avec contour 1px."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
FIGHTERS_DIR = ROOT / "public" / "fighters"

TARGETS = {
    "melenchon": 86,
    "lepen": 86,
    "chikirou": 64,
    "bompard": 64,
    "panot": 64,
    "aliot": 64,
    "odoul": 64,
    "jacobelli": 64,
}

# Matrice Bayer 4x4 normalisée [-0.5, +0.5] pour tramage 16-bit subtil
BAYER_4X4 = [
    [-0.46875, 0.03125, -0.34375, 0.15625],
    [0.28125, -0.21875, 0.40625, -0.09375],
    [-0.28125, 0.21875, -0.40625, 0.09375],
    [0.46875, -0.03125, 0.34375, -0.15625],
]

OUTLINE_COLOR = (11, 14, 23, 255)


def pixelize_sprite(path: Path, base_width: int) -> tuple[int, int]:
    im = Image.open(path).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    w, h = im.size
    base_height = max(1, round(h * (base_width / w)))
    small = im.resize((base_width, base_height), Image.Resampling.LANCZOS)

    # Boost léger du contraste et de la saturation pour un rendu 16-bit net
    rgb = small.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    rgb = ImageEnhance.Color(rgb).enhance(1.15)
    small_rgba = rgb.convert("RGBA")
    small_rgba.putalpha(small.getchannel("A"))

    px = small_rgba.load()
    assert px is not None

    # Seuil alpha strict + léger tramage Bayer uniquement sur les pixels opaques
    opaque_rgb = Image.new("RGB", (base_width, base_height), (11, 14, 23))
    opx = opaque_rgb.load()
    assert opx is not None
    mask = [[False] * base_width for _ in range(base_height)]

    for y in range(base_height):
        for x in range(base_width):
            r, g, b, a = px[x, y]
            if a >= 135:
                mask[y][x] = True
                d = BAYER_4X4[y % 4][x % 4] * 14.0
                opx[x, y] = (
                    max(0, min(255, int(round(r + d)))),
                    max(0, min(255, int(round(g + d)))),
                    max(0, min(255, int(round(b + d)))),
                )

    # Quantification 16-bit (36 couleurs) sans bruit sur l'alpha
    quantized = opaque_rgb.quantize(
        colors=36,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    qpx = quantized.load()
    assert qpx is not None

    # Reconstruction avec transparence nette + contour pixel-art 1px (#0B0E17)
    canvas = Image.new("RGBA", (base_width + 2, base_height + 2), (0, 0, 0, 0))
    cpx = canvas.load()
    assert cpx is not None

    for y in range(base_height):
        for x in range(base_width):
            if mask[y][x]:
                r, g, b, _ = qpx[x, y]
                cpx[x + 1, y + 1] = (r, g, b, 255)

    for y in range(base_height):
        for x in range(base_width):
            if not mask[y][x]:
                neighbors = (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                )
                if any(
                    0 <= nx < base_width and 0 <= ny < base_height and mask[ny][nx]
                    for nx, ny in neighbors
                ):
                    cpx[x + 1, y + 1] = OUTLINE_COLOR

    # Agrandissement NEAREST 4x pour une grille de pixels ultra-nette
    out_w, out_h = canvas.width * 4, canvas.height * 4
    final = canvas.resize((out_w, out_h), Image.Resampling.NEAREST)
    final.save(path, format="PNG", optimize=True)
    return final.size


def main() -> int:
    for slug, base_w in TARGETS.items():
        path = FIGHTERS_DIR / f"{slug}.png"
        if not path.exists():
            raise FileNotFoundError(f"Portrait manquant: {path}")
        size = pixelize_sprite(path, base_w)
        print(f"PIXELIZED {slug}.png -> {size[0]}x{size[1]} ({path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
