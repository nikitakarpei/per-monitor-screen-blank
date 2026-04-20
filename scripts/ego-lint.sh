#!/bin/sh
set -eu

repo_url='https://github.com/ZviBaratz/gnome-extension-reviewer.git'
cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/gnome-extension-reviewer"

usage() {
    printf '%s\n' "Usage: sh $0 <target-dir>"
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

if [ "$#" -ne 1 ]; then
    printf '%s\n' 'ERROR: expected exactly one target directory argument' >&2
    usage >&2
    exit 1
fi

target_dir=$1

if [ ! -d "$target_dir" ]; then
    printf 'ERROR: target directory not found: %s\n' "$target_dir" >&2
    exit 1
fi

if [ ! -d "$cache_dir/.git" ]; then
    mkdir -p "${cache_dir%/*}"
    if ! git clone --depth 1 "$repo_url" "$cache_dir"; then
        printf '%s\n' 'ERROR: failed to clone gnome-extension-reviewer' >&2
        exit 1
    fi
fi

tmp_output="${TMPDIR:-/tmp}/ego-lint.$$"
trap 'rm -f "$tmp_output"' 0 1 2 3 15
sh "$cache_dir/ego-lint" "$target_dir" --no-report >"$tmp_output" 2>&1 || true

cat "$tmp_output"

# Parse the summary because the cached reviewer can exit non-zero even when the result is clean.
summary_line=$(grep '^[[:space:]]*Results: ' "$tmp_output" | tail -n 1 || true)
case "$summary_line" in
    *'0 failed, 0 warnings'*) exit 0 ;;
    *'failed,'*'warnings'*) : ;;
    *) printf '%s\n' 'ERROR: unable to parse ego-lint summary' >&2; exit 1 ;;
esac

failed=$(printf '%s\n' "$summary_line" | sed -n 's/.*Results:.*\([0-9][0-9]*\) failed, \([0-9][0-9]*\) warnings.*/\1/p')
warnings=$(printf '%s\n' "$summary_line" | sed -n 's/.*Results:.*\([0-9][0-9]*\) failed, \([0-9][0-9]*\) warnings.*/\2/p')

if [ -z "$failed" ] || [ -z "$warnings" ]; then
    printf '%s\n' 'ERROR: unable to parse ego-lint summary' >&2
    exit 1
fi

if [ "$failed" -ne 0 ]; then
    printf '%s\n' 'ERROR: ego-lint reported failures' >&2
    exit 1
fi

exit 0
