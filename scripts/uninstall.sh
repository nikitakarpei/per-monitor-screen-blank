#!/bin/sh

set -eu

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
dest="$HOME/.local/share/gnome-shell/extensions/$uuid"
settings_schema="org.gnome.shell.extensions.per-monitor-screen-blank"
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

if command -v gnome-extensions >/dev/null 2>&1; then
  gnome-extensions disable "$uuid" >/dev/null 2>&1 || true
fi

if [ -d "$dest" ]; then
  rm -rf "$dest"
  printf '%s\n' "Removed: $dest"
else
  printf '%s\n' "Nothing to remove at: $dest"
fi

if [ "$remove_data" -eq 1 ]; then
  if command -v gsettings >/dev/null 2>&1; then
    gsettings reset-recursively "$settings_schema"
    printf '%s\n' "Removed settings data: $settings_schema"
  else
    printf '%s\n' "Skipped settings removal: gsettings not found" >&2
  fi
fi

printf '%s\n' "Uninstall completed."
