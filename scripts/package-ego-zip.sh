#!/bin/sh
# Build a extensions.gnome.org–ready zip: extension files at archive root,
# schemas compiled in a temp tree (does not modify the repo copy).

set -eu

usage() {
  printf '%s\n' "Usage: sh $0" "  Writes dist/<uuid>.zip from per-monitor-screen-blank@nikitakarpei.github.io/"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
uuid="per-monitor-screen-blank@nikitakarpei.github.io"
src="$repo_root/$uuid"
out_dir="$repo_root/dist"
zip_path="$out_dir/${uuid}.zip"

if [ ! -f "$src/metadata.json" ]; then
  printf 'ERROR: extension source missing: %s\n' "$src" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  printf 'ERROR: zip command not found.\n' >&2
  exit 1
fi

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

cp -a "$src/." "$stage/"

if command -v glib-compile-schemas >/dev/null 2>&1; then
  glib-compile-schemas "$stage/schemas"
else
  printf 'WARN: glib-compile-schemas not found; zip may lack gschemas.compiled\n' >&2
fi

mkdir -p "$out_dir"
( cd "$stage" && zip -r -q "$zip_path" . )

printf '%s\n' "Wrote: $zip_path" "Check layout: unzip -l \"$zip_path\" | head"
