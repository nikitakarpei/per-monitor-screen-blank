#!/bin/sh
# Build an extensions.gnome.org–ready zip with extension files at archive root.
# Compiled schemas are intentionally excluded because EGO rejects them.

set -eu

usage() {
  printf '%s\n' "Usage: sh $0" "  Writes dist/<uuid>.zip from the built extension in dist/<uuid>/."
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

# shellcheck source=/dev/null
. "$(dirname -- "$0")/_paths.sh"

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
out_dir="$GNOME_DIST_DIR"
zip_path="$out_dir/${uuid}.zip"

sh "$GNOME_SCRIPTS_DIR/ego-lint.sh"

src="$out_dir/$uuid"

if ! command -v zip >/dev/null 2>&1; then
  printf 'ERROR: zip command not found.\n' >&2
  exit 1
fi

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

cp -a "$src/." "$stage/"
rm -f "$stage/schemas/gschemas.compiled"

rm -f "$zip_path"
( cd "$stage" && zip -r -q "$zip_path" . )

if ! command -v sha256sum >/dev/null 2>&1; then
  printf 'ERROR: sha256sum command not found.\n' >&2
  exit 1
fi

sha256_path="${zip_path}.sha256"
zip_name=$(basename "$zip_path")
( cd "$out_dir" && sha256sum "$zip_name" ) > "$sha256_path"

printf '%s\n' "Wrote: $zip_path" "Checksum: $sha256_path" "Check layout: unzip -l \"$zip_path\" | head"
