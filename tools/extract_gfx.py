"""Extract item graphics (.dc6) and palettes the editor renders with.

Later archives override earlier ones (d2data < d2exp < Patch_D2), like the game's
MPQ priority. Paths are lowercased because the editor is served from a case-sensitive
filesystem and the MPQs mix "invleg.DC6" / "Palette/" casing.

Run from ~/Projetos/mpq_extractor so the library resolves:
    uv run python <repo>/tools/extract_gfx.py <game-dir> <repo>/packages/d2s-editor/public
"""

import sys
from pathlib import Path

from mpq_extractor import MPQArchive

ARCHIVES = ["d2data.mpq", "d2exp.mpq", "Patch_D2.mpq"]
WANTED = ("data\\global\\items\\", "data\\global\\palette\\act1\\")


def main(game_dir: str, out_dir: str) -> None:
    out = Path(out_dir).resolve()
    count = 0
    for name in ARCHIVES:
        with MPQArchive(Path(game_dir) / name) as mpq:
            for f in mpq.list_files("*"):
                low = str(f).lower()
                if not low.startswith(WANTED) or low.endswith("\\"):
                    continue
                parts = low.split("\\")
                if ".." in parts or "" in parts:
                    continue
                dest = out.joinpath(*parts)
                if not dest.resolve().is_relative_to(out):
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(mpq.read_file(f))
                count += 1
        print(f"{name}: done ({count} files written so far)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
