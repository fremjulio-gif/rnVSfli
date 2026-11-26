"""Télécharge poliment les portraits Wikimedia Commons CC et les détoure via macOS Vision."""

from __future__ import annotations

import subprocess
import tempfile
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "fighters"
SWIFT_SCRIPT = ROOT / "scripts" / "cutout.swift"

FIGHTERS = [
    (
        "melenchon",
        "https://upload.wikimedia.org/wikipedia/commons/3/3e/Jean_Luc_M%C3%A9lenchon_en_mai_2026-_55261894422_%28cropped%29.jpg",
        480,
    ),
    (
        "chikirou",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Sophia-Chikirou.jpg/960px-Sophia-Chikirou.jpg",
        320,
    ),
    (
        "bompard",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Manuel_Bompard_Manifestation_Liban_%28cropped%29.jpg/960px-Manuel_Bompard_Manifestation_Liban_%28cropped%29.jpg",
        320,
    ),
    (
        "panot",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Mathilde_Panot_2021-3.jpg/960px-Mathilde_Panot_2021-3.jpg",
        320,
    ),
    (
        "lepen",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Marine_Le_Pen_2025_%28cropped%29.jpg/960px-Marine_Le_Pen_2025_%28cropped%29.jpg",
        480,
    ),
    (
        "aliot",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Louis_Aliot_2015_02_%28cropped%29_%28cropped%29.jpg/960px-Louis_Aliot_2015_02_%28cropped%29_%28cropped%29.jpg",
        320,
    ),
    (
        "odoul",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Photo_officielle_Julien_Odoul.jpg/960px-Photo_officielle_Julien_Odoul.jpg",
        320,
    ),
    (
        "jacobelli",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Laurent_Jacobelli.jpg/960px-Laurent_Jacobelli.jpg",
        320,
    ),
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    headers = {
        "User-Agent": "VERSUS-PortraitBuilder/1.0 (https://github.com/fremjulio-gif/rnVSfli)"
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        with httpx.Client(timeout=20.0, follow_redirects=True, headers=headers) as client:
            for slug, url, width in FIGHTERS:
                resp = client.get(url)
                if resp.status_code == 429:
                    time.sleep(2.5)
                    resp = client.get(url)
                resp.raise_for_status()
                src_file = tmp / f"{slug}.jpg"
                src_file.write_bytes(resp.content)

                dst_file = OUT_DIR / f"{slug}.png"
                proc = subprocess.run(
                    ["swift", str(SWIFT_SCRIPT), str(src_file), str(dst_file), str(width)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if proc.returncode != 0:
                    raise RuntimeError(f"Échec cutout {slug}: {proc.stderr}")
                print(proc.stdout.strip())
                time.sleep(0.7)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
