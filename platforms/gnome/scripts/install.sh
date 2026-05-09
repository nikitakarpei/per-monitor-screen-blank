#!/bin/sh

set -eu

GNOME_SCRIPTS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$GNOME_SCRIPTS_DIR/_paths.sh"

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/$uuid"

sh "$GNOME_SCRIPTS_DIR/build-gnome.sh"

mkdir -p "$dest"
cp -R "$GNOME_DIST_DIR/$uuid/." "$dest/"

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions enable "$uuid" >/dev/null 2>&1 || true
fi

printf '%s\n' "Installed to: $dest" "Reload GNOME Shell if needed." "Open GNOME Extensions to verify the extension is enabled."
