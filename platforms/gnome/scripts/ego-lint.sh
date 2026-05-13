#!/bin/sh
set -eu

error() {
    printf 'ERROR: %s\n' "$1" >&2
}

usage() {
    printf '%s\n' "Usage: sh $0 <target-dir>"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

if [ "$#" -ne 1 ]; then
    error 'expected exactly one target directory argument'
    usage >&2
    exit 1
fi

target_dir=$1

if [ ! -d "$target_dir" ]; then
    error "target directory not found: $target_dir"
    exit 1
fi

# shellcheck source=/dev/null
. "$(dirname -- "$0")/_paths.sh"

reviewer_ego_lint="$GNOME_VENDOR_DIR/gnome-extension-reviewer/ego-lint"
if [ ! -f "$reviewer_ego_lint" ] || [ ! -r "$reviewer_ego_lint" ]; then
    error 'gnome-extension-reviewer submodule not initialized; run: git submodule update --init --recursive'
    exit 1
fi

tmp_output="${TMPDIR:-/tmp}/ego-lint.$$"
trap 'rm -f "$tmp_output"' 0 HUP INT QUIT TERM
sh "$reviewer_ego_lint" "$target_dir" --no-report >"$tmp_output" 2>&1 || true

cat "$tmp_output"

# Parse the summary because the cached reviewer can exit non-zero even when the result is clean.
summary_line=$(grep '^[[:space:]]*Results: ' "$tmp_output" | tail -n 1 || true)
case "$summary_line" in
    *'0 failed, 0 warnings'*) exit 0 ;;
    *'failed,'*'warnings'*) : ;;
    *) error 'unable to parse ego-lint summary'; exit 1 ;;
esac

failed=$(printf '%s\n' "$summary_line" | sed -n 's/.*Results:.*\([0-9][0-9]*\) failed, \([0-9][0-9]*\) warnings.*/\1/p')
warnings=$(printf '%s\n' "$summary_line" | sed -n 's/.*Results:.*\([0-9][0-9]*\) failed, \([0-9][0-9]*\) warnings.*/\2/p')

if [ -z "$failed" ] || [ -z "$warnings" ]; then
    error 'unable to parse ego-lint summary'
    exit 1
fi

if [ "$failed" -ne 0 ]; then
    error 'ego-lint reported failures'
    exit 1
fi

exit 0
