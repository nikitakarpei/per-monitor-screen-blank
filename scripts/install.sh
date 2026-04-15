#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
uuid="per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/$uuid"

sh "$repo_root/scripts/build-gnome.sh"

mkdir -p "$dest"
cp -R "$repo_root/dist/$uuid/." "$dest/"

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions enable "$uuid" >/dev/null 2>&1 || true
fi

printf '%s\n' "Installed to: $dest" "Reload GNOME Shell if needed." "Open GNOME Extensions to verify the extension is enabled."
