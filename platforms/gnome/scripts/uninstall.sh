#!/bin/sh

set -eu

. "$(dirname -- "$0")/_paths.sh"

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/$uuid"
remove_data=0

usage() {
  printf '%s\n' "Usage: sh ./scripts/uninstall.sh [--remove-data|--purge]"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --remove-data|--purge)
      remove_data=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf '%s\n' "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

reset_settings_data() {
  if ! command -v dconf >/dev/null 2>&1; then
    printf '%s\n' "Error: dconf is required to remove settings data but was not found" >&2
    exit 1
  fi

  dconf reset -f "/org/gnome/shell/extensions/per-monitor-screen-blank/"
  printf '%s\n' "Removed settings data: /org/gnome/shell/extensions/per-monitor-screen-blank/"
}

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions disable "$uuid" >/dev/null 2>&1 || true
fi

if [ "$remove_data" -eq 1 ]; then
  reset_settings_data
fi

if [ -d "$dest" ]; then
  rm -rf "$dest"
  printf '%s\n' "Removed: $dest"
else
  printf '%s\n' "Nothing to remove at: $dest"
fi

printf '%s\n' "Uninstall completed."
