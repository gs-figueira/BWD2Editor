#!/usr/bin/env bash
# Regenerate everything the editor loads from the mod data:
#   mod tables (.bin/.tbl) -> txt -> constants -> public/d2/constants_bw.bundle.js
#   packages/d2s           -> public/d2/d2s.bundle.min.js
# and run the byte-identical round-trip check on reference/saves.
#
# usage: tools/build_editor_data.sh [mod-version]   (default 4.2.1)
# Item graphics are a separate one-off step: tools/extract_gfx.py (see CLAUDE.md).
set -euo pipefail

VER="${1:-4.2.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOD="$ROOT/reference/mod-$VER/patch_d2"
OUT="$ROOT/build/mod-$VER"
PUBLIC="$ROOT/packages/d2s-editor/public/d2"

# npm comes from fnm (system node has none)
if command -v fnm >/dev/null; then
  eval "$(fnm env --shell bash)"
  fnm use lts-latest >/dev/null
fi

[ -d "$MOD" ] || { echo "missing $MOD — run tools/extract_mpq.py first" >&2; exit 1; }

echo "== d2s: compile"
(cd "$ROOT/packages/d2s" && [ -d node_modules ] || (cd "$ROOT/packages/d2s" && npm ci --ignore-scripts))
(cd "$ROOT/packages/d2s" && npx tsc && NODE_OPTIONS=--openssl-legacy-provider npx webpack --config webpack.bw.config.js >/dev/null)

echo "== bw-data: txt + constants"
node "$ROOT/packages/bw-data/src/cli.ts" "$MOD" "$OUT/txt" >/dev/null
node "$ROOT/packages/bw-data/src/constants.ts" "$OUT/txt" "$OUT"

echo "== round-trip"
node "$ROOT/packages/bw-data/src/roundtrip.ts" "$OUT/constants.json" "$ROOT"/reference/saves/*.d2s

echo "== editor bundles"
mkdir -p "$PUBLIC"
cp "$OUT/constants_96.bundle.js" "$PUBLIC/constants_bw.bundle.js"
cp "$ROOT/packages/d2s/dist/d2s.bundle.min.js" "$PUBLIC/d2s.bundle.min.js"
echo "done: $PUBLIC"
