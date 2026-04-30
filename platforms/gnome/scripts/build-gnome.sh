#!/bin/sh
# Assemble the installable GNOME extension package under dist/<uuid>/.
# Run this before install.sh or package-ego-zip.sh.

set -eu

UUID="per-monitor-screen-blank@nikitakarpei.github.io"
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
OUT="$repo_root/platforms/gnome/dist/$UUID"

rm -rf "$OUT"
mkdir -p "$OUT/schemas"

cp \
  "$repo_root/platforms/gnome/assets/metadata.json" \
  "$repo_root/platforms/gnome/assets/stylesheet.css" \
  "$repo_root/LICENSE" \
  "$OUT/"
cp -R "$repo_root/platforms/gnome/assets/schemas/." "$OUT/schemas/"

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
  --alias:@pmsb/lifecycle="$repo_root/core/packages/lifecycle/src/index.ts" \
  --alias:@pmsb/domain="$repo_root/core/packages/domain/src/index.ts" \
  --alias:@pmsb/application="$repo_root/core/packages/application/src/index.ts" \
  --alias:@pmsb/infrastructure-gnome="$repo_root/platforms/gnome/packages/infrastructure-gnome/src/index.ts" \
  --alias:@pmsb/gnome-shell="$repo_root/platforms/gnome/packages/gnome-shell/src/index.ts" \
  --alias:@pmsb/gnome-prefs="$repo_root/platforms/gnome/packages/gnome-prefs/src/index.ts" \
  "$repo_root/platforms/gnome/packages/gnome-composition/src/extension.ts" \
  "$repo_root/platforms/gnome/packages/gnome-composition/src/prefs.ts"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$OUT/schemas"
fi

printf 'Built: %s\n' "$OUT"
