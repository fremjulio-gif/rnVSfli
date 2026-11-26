"""Télécharge poliment les portraits Wikimedia Commons CC et les détoure via macOS Vision."""

from __future__ import annotations

import argparse
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
        "lepen",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Marine_Le_Pen_2025_%28cropped%29.jpg/960px-Marine_Le_Pen_2025_%28cropped%29.jpg",
        480,
    ),
    (
        "retailleau",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais.jpg/960px-Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais.jpg",
        480,
    ),
    (
        "macron",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Emmanuel_Macron_May_2024.jpg/960px-Emmanuel_Macron_May_2024.jpg",
        480,
    ),
    (
        "faure",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Portrait_d%27Olivier_Faure.jpg/960px-Portrait_d%27Olivier_Faure.jpg",
        480,
    ),
    (
        "tondelier",
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Huma2023MarineTondelier.jpg/960px-Huma2023MarineTondelier.jpg",
        480,
    ),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-générer aussi les fichiers existants")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    headers = {
        "User-Agent": "VERSUS-PortraitBuilder/1.0 (https://github.com/fremjulio-gif/rnVSfli)"
    }

    pending = [
        (slug, url, width)
        for slug, url, width in FIGHTERS
        if args.force or not (OUT_DIR / f"{slug}.png").exists()
    ]
    if not pending:
        print("Tous les portraits de référence sont déjà présents.")
        return 0

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        with httpx.Client(timeout=20.0, follow_redirects=True, headers=headers) as client:
            for slug, url, width in pending:
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
