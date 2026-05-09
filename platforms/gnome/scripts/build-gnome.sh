#!/bin/sh
# Assemble the installable GNOME extension package under dist/<uuid>/.
# Run this before install.sh or package-ego-zip.sh.

set -eu

. "$(dirname -- "$0")/_paths.sh"

UUID="per-monitor-screen-blank@nikitakarpei.github.io"
OUT="$GNOME_DIST_DIR/$UUID"

rm -rf "$OUT"
mkdir -p "$OUT/schemas"

cp \
  "$GNOME_PLATFORM_ROOT/assets/metadata.json" \
  "$GNOME_PLATFORM_ROOT/assets/stylesheet.css" \
  "$REPOSITORY_ROOT/LICENSE" \
  "$OUT/"
cp -R "$GNOME_PLATFORM_ROOT/assets/schemas/." "$OUT/schemas/"

# Bundle extension.js and prefs.js with esbuild.
# gi:// and resource:// are GJS runtime modules — marked external so
# esbuild leaves them as bare imports for GJS to resolve at runtime.
# Source maps are generated for easier debugging of runtime errors.
npx esbuild \
  --bundle \
  --format=esm \
  --platform=neutral \
  --external:gi://* \
  --external:resource://* \
  --sourcemap \
  --entry-names=[name] \
  --outdir="$OUT" \
  --alias:@pmsb/lifecycle="$REPOSITORY_ROOT/core/packages/lifecycle/src/index.ts" \
  --alias:@pmsb/domain="$REPOSITORY_ROOT/core/packages/domain/src/index.ts" \
  --alias:@pmsb/application="$REPOSITORY_ROOT/core/packages/application/src/index.ts" \
  --alias:@pmsb/infrastructure-gnome="$REPOSITORY_ROOT/platforms/gnome/packages/infrastructure-gnome/src/index.ts" \
  --alias:@pmsb/gnome-shell="$REPOSITORY_ROOT/platforms/gnome/packages/gnome-shell/src/index.ts" \
  --alias:@pmsb/gnome-prefs="$REPOSITORY_ROOT/platforms/gnome/packages/gnome-prefs/src/index.ts" \
  "$REPOSITORY_ROOT/platforms/gnome/packages/gnome-composition/src/extension.ts" \
  "$REPOSITORY_ROOT/platforms/gnome/packages/gnome-composition/src/prefs.ts"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$OUT/schemas"
fi

printf 'Built: %s\n' "$OUT"
