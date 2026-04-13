#!/bin/sh

set -eu

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/$uuid"

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions disable "$uuid" >/dev/null 2>&1 || true
fi

if [ -d "$dest" ]; then
  rm -rf "$dest"
  printf '%s\n' "Removed: $dest"
else
  printf '%s\n' "Nothing to remove at: $dest"
fi

printf '%s\n' "Uninstall completed."
