#!/bin/sh
# Build the GNOME extension and run extensions.gnome.org reviewer lint.

set -eu

usage() {
  printf '%s\n' "Usage: sh $0" "  Builds dist/<uuid>/ and runs ego-lint against that unpacked extension directory."
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

# shellcheck source=/dev/null
. "$(dirname -- "$0")/_paths.sh"

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
src="$GNOME_DIST_DIR/$uuid"

sh "$GNOME_SCRIPTS_DIR/build-gnome.sh"

if [ ! -f "$src/metadata.json" ]; then
  printf 'ERROR: built extension missing: %s\n' "$src" >&2
  exit 1
fi

reviewer_ego_lint="$GNOME_VENDOR_DIR/gnome-extension-reviewer/ego-lint"
if [ ! -f "$reviewer_ego_lint" ] || [ ! -r "$reviewer_ego_lint" ]; then
  printf '%s\n' 'ERROR: ego-lint not found or not readable.' >&2
  exit 1
fi

sh "$reviewer_ego_lint" "$src" --no-report
