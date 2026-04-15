#!/bin/sh
# Assemble the installable GNOME extension package under dist/<uuid>/.
# Run this before install.sh or package-ego-zip.sh.

set -eu

UUID="per-monitor-screen-blank@nikitakarpei.github.io"
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$repo_root/dist/$UUID"

rm -rf "$OUT"
mkdir -p \
  "$OUT/schemas" \
  "$OUT/src/app" \
  "$OUT/src/shared" \
  "$OUT/src/platform/gnome" \
  "$OUT/src/ui/gnome"

# Extension entry points and metadata
cp \
  "$repo_root/src/gnome/extension.js" \
  "$repo_root/src/gnome/prefs.js" \
  "$repo_root/src/gnome/metadata.json" \
  "$repo_root/src/gnome/stylesheet.css" \
  "$OUT/"
cp -R "$repo_root/src/gnome/schemas/." "$OUT/schemas/"

# Shared cross-platform code
cp -R "$repo_root/src/shared/." "$OUT/src/shared/"

# App layer (AppController)
cp -R "$repo_root/src/app/." "$OUT/src/app/"

# GNOME platform implementations
cp -R "$repo_root/src/gnome/platform/." "$OUT/src/platform/gnome/"

# GNOME UI components
cp -R "$repo_root/src/gnome/ui/." "$OUT/src/ui/gnome/"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$OUT/schemas"
fi

printf 'Built: %s\n' "$OUT"
