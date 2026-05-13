#!/bin/sh
# Assemble the installable GNOME extension package under dist/<uuid>/.
# Run this before install.sh or package-ego-zip.sh.

set -eu

. "$(dirname -- "$0")/_paths.sh"

UUID="per-monitor-screen-blank@nikitakarpei.github.io"
OUT="$GNOME_DIST_DIR/$UUID"

if ! command -v glib-compile-schemas >/dev/null 2>&1; then
  printf 'ERROR: glib-compile-schemas is unavailable; local extension builds require compiled schemas in %s.\n' "$OUT/schemas" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/schemas"

cp \
  "$GNOME_PLATFORM_ROOT/assets/metadata.json" \
  "$GNOME_PLATFORM_ROOT/assets/stylesheet.css" \
  "$REPOSITORY_ROOT/LICENSE" \
  "$OUT/"
cp -R "$GNOME_PLATFORM_ROOT/assets/schemas/." "$OUT/schemas/"

# Build extension.js and prefs.js with Rollup while preserving modules.
# gi:// and resource:// externals are handled by the Rollup config.
# Package aliases come from the root tsconfig.json.
cd "$REPOSITORY_ROOT"
GNOME_ROLLUP_OUT_DIR="$OUT" \
  GNOME_ROLLUP_EXTENSION_ENTRY="$GNOME_PLATFORM_ROOT/packages/gnome-composition/src/extension.ts" \
  GNOME_ROLLUP_PREFS_ENTRY="$GNOME_PLATFORM_ROOT/packages/gnome-composition/src/prefs.ts" \
  npx rollup --config "$GNOME_PLATFORM_ROOT/scripts/rollup.config.js"

glib-compile-schemas "$OUT/schemas"

printf 'Built: %s\n' "$OUT"
