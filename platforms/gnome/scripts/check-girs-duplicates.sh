#!/bin/sh
set -eu

script_name=$(basename "$0")

usage() {
    printf '%s\n' "Usage: $script_name [project-root]"
    printf '%s\n' "  Detects duplicate @girs/* packages in node_modules."
    printf '%s\n' "  Nested copies indicate version conflicts not covered by overrides."
    printf '%s\n' "  Exit code 0 if clean, 1 if duplicates found."
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

project_root="${1:-.}"

girs_dir="$project_root/node_modules/@girs"

if [ ! -d "$girs_dir" ]; then
    printf 'ERROR: %s/node_modules/@girs not found — run npm install first\n' "$project_root" >&2
    exit 1
fi

nested_pkgs=$(find "$girs_dir" -path '*/node_modules/@girs/*/package.json' -type f 2>/dev/null || true)

if [ -z "$nested_pkgs" ]; then
    printf '%s\n' "OK: no duplicate @girs/* packages detected"
    exit 0
fi

duplicates=$(printf '%s\n' "$nested_pkgs" | while read -r f; do basename "$(dirname "$f")"; done | sort -u)

conflict_count=0
conflict_output=""

tmp_file="${TMPDIR:-/tmp}/girs-dupes.$$"
trap 'rm -f "$tmp_file"' 0 1 2 3 15

printf '%s\n' "$duplicates" | while read -r pkg; do
    all_vers=$(find "$girs_dir" -path "*/node_modules/@girs/$pkg/package.json" -type f 2>/dev/null \
        | while read -r f; do grep '"version"' "$f" | head -1 | sed 's/.*: "//;s/".*//'; done \
        | sort -u)

    top_json="$girs_dir/$pkg/package.json"
    if [ -f "$top_json" ]; then
        hoisted_ver=$(grep '"version"' "$top_json" | head -1 | sed 's/.*: "//;s/".*//')
        all_vers="$hoisted_ver
$all_vers"
    fi

    unique_vers=$(printf '%s\n' "$all_vers" | sort -u)

    ver_count=$(printf '%s\n' "$unique_vers" | wc -l)
    if [ "$ver_count" -le 1 ]; then
        continue
    fi

    recommended=$(printf '%s\n' "$unique_vers" | node -e '
        let best = "";
        for (const line of require("fs").readFileSync(0, "utf8").trim().split("\n")) {
            if (best === "" || require("semver").gt(line, best)) best = line;
        }
        process.stdout.write(best);
    ')

    printf '"@girs/%s": "%s"\n' "$pkg" "$recommended"
done > "$tmp_file"

conflict_count=$(grep -c . "$tmp_file" || true)

if [ "$conflict_count" -eq 0 ]; then
    printf '%s\n' "OK: no duplicate @girs/* packages detected"
    exit 0
fi

printf 'ERROR: %d @girs/* package(s) have version conflicts not covered by overrides.\n\n' "$conflict_count" >&2
printf '%s\n' "Add these overrides to package.json:" >&2
printf '\n%s\n' '"overrides": {' >&2
sed 's/$/,/' "$tmp_file" | sed '$ s/,$//' >&2
printf '%s\n' '}' >&2
printf '\n%s\n' "See docs/plans/dependency-deduplication.md for details." >&2

exit 1
