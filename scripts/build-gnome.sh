#!/bin/sh
# Assemble the installable GNOME extension package under dist/<uuid>/.
# Run this before install.sh or package-ego-zip.sh.

set -eu

UUID="per-monitor-screen-blank@nikitakarpei.github.io"
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$repo_root/dist/$UUID"

rm -rf "$OUT"
mkdir -p "$OUT/schemas"

cp \
  "$repo_root/src/gnome/metadata.json" \
  "$repo_root/src/gnome/stylesheet.css" \
  "$repo_root/LICENSE" \
  "$OUT/"
cp -R "$repo_root/src/gnome/schemas/." "$OUT/schemas/"

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
  --alias:@pmsb/core="$repo_root/packages/core/src/index.ts" \
  --alias:@pmsb/application="$repo_root/packages/application/src/index.ts" \
  --alias:@pmsb/infrastructure-gnome="$repo_root/packages/infrastructure-gnome/src/index.ts" \
  --alias:@pmsb/host-gnome-shell="$repo_root/packages/host-gnome-shell/src/index.ts" \
  --alias:@pmsb/host-gnome-prefs="$repo_root/packages/host-gnome-prefs/src/index.ts" \
  "$repo_root/packages/host-gnome-shell/src/extension.ts" \
  "$repo_root/packages/host-gnome-prefs/src/prefs.ts"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$OUT/schemas"
fi

printf 'Built: %s\n' "$OUT"
