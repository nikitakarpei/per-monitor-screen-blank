#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
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

reset_settings_data() {
  if ! command -v gsettings >/dev/null 2>&1; then
    printf '%s\n' "Skipped settings removal: gsettings not found" >&2
    return
  fi

  if gsettings writable "$settings_schema" active-profile-id >/dev/null 2>&1; then
    gsettings reset-recursively "$settings_schema"
    printf '%s\n' "Removed settings data: $settings_schema"
    return
  fi

  for schema_dir in "$repo_root/platforms/gnome/dist/$uuid/schemas" "$repo_root/platforms/gnome/assets/schemas"; do
    if [ -f "$schema_dir/gschemas.compiled" ] &&
      gsettings --schemadir "$schema_dir" writable "$settings_schema" active-profile-id >/dev/null 2>&1; then
      gsettings --schemadir "$schema_dir" reset-recursively "$settings_schema"
      printf '%s\n' "Removed settings data: $settings_schema"
      return
    fi
  done

  printf '%s\n' "Skipped settings removal: schema not available for $settings_schema" >&2
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
