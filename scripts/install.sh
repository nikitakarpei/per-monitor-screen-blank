#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
src="$repo_root/per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/per-monitor-screen-blank@nikitakarpei.github.io"

mkdir -p "$dest"
cp -R "$src/." "$dest/"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$dest/schemas"
fi

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions enable per-monitor-screen-blank@nikitakarpei.github.io >/dev/null 2>&1 || true
fi

printf '%s\n' "Installed to: $dest" "Reload GNOME Shell if needed." "Open GNOME Extensions to verify the extension is enabled."
