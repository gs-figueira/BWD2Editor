"""Extract item graphics (.dc6) and palettes from the game's MPQs.

Writes, under <repo>:
  reference/gfx/<archive>/data/global/...      one copy per MPQ, so tools can tell mod art
                                               (Patch_D2) from Blizzard art (d2data/d2exp)
  packages/d2s-editor/public/data/global/...   merged (d2data < d2exp < Patch_D2, like the
                                               game's MPQ priority) for LOCAL use only. It's
                                               gitignored and never published.

Paths are lowercased because the editor is served from a case-sensitive filesystem and
the MPQs mix "invleg.DC6" / "Palette/" casing.

Run from ~/Projetos/mpq_extractor so the library resolves:
    uv run python <repo>/tools/extract_gfx.py <game-dir> <repo>
"""

import sys
from pathlib import Path

from mpq_extractor import MPQArchive

ARCHIVES = ["d2data.mpq", "d2exp.mpq", "Patch_D2.mpq"]
WANTED = ("data\\global\\items\\", "data\\global\\palette\\act1\\")


def safe_dest(root: Path, mpq_name: str) -> Path | None:
    parts = mpq_name.lower().split("\\")
    if ".." in parts or "" in parts:
        return None
    dest = root.joinpath(*parts)
    return dest if dest.resolve().is_relative_to(root) else None


def main(game_dir: str, repo: str) -> None:
    repo_root = Path(repo).resolve()
    merged = repo_root / "packages/d2s-editor/public"
    for name in ARCHIVES:
        per_archive = (repo_root / "reference/gfx" / name.lower().removesuffix(".mpq")).resolve()
        count = 0
        with MPQArchive(Path(game_dir) / name) as mpq:
            for f in mpq.list_files("*"):
                low = str(f).lower()
                if not low.startswith(WANTED) or low.endswith("\\"):
                    continue
                data = mpq.read_file(f)
                for root in (per_archive, merged.resolve()):
                    dest = safe_dest(root, str(f))
                    if dest is None:
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(data)
                count += 1
        print(f"{name}: {count} files")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
