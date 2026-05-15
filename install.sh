#!/bin/sh

set -eu

repo="nikitakarpei/per-monitor-screen-blank"
UUID="per-monitor-screen-blank@nikitakarpei.github.io"
asset_url="https://github.com/$repo/releases/latest/download/$UUID.zip"
checksum_url="$asset_url.sha256"

desktop_name=$(printf '%s' "${XDG_CURRENT_DESKTOP:-}" | tr '[:upper:]' '[:lower:]')
is_gnome_shell=0

case "$desktop_name" in
  *gnome*)
    is_gnome_shell=1
    ;;
esac

if [ "$is_gnome_shell" -eq 0 ] && command -v gnome-shell >/dev/null 2>&1 && gnome-shell --version >/dev/null 2>&1; then
  is_gnome_shell=1
fi

if [ "$is_gnome_shell" -eq 0 ]; then
  printf '%s\n' "Unsupported desktop: this installer currently supports GNOME Shell only." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf '%s\n' "Missing dependency: curl is required to download the latest release." >&2
  exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
  printf '%s\n' "Missing dependency: sha256sum is required to verify the downloaded release." >&2
  exit 1
fi

if ! command -v gnome-extensions >/dev/null 2>&1; then
  printf '%s\n' "Missing dependency: gnome-extensions is required to install the extension." >&2
  exit 1
fi

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT HUP INT TERM
zip_file="$temp_dir/$UUID.zip"
checksum_file="$temp_dir/$UUID.zip.sha256"

verify_checksum() {
  checksum_line=""
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *"$UUID.zip"*)
        checksum_line=$line
        break
        ;;
    esac
  done < "$checksum_file"

  if [ -n "$checksum_line" ] && printf '%s\n' "$checksum_line" | (cd "$temp_dir" && sha256sum -c -); then
    return 0
  fi

  if [ -n "$checksum_line" ]; then
    expected_checksum=$(printf '%s\n' "$checksum_line" | sed -n 's/.*\([0-9A-Fa-f]\{64\}\).*/\1/p')
  else
    expected_checksum=$(sed -n 's/.*\([0-9A-Fa-f]\{64\}\).*/\1/p' "$checksum_file")
  fi
  expected_checksum=${expected_checksum%%
*}

  case "$expected_checksum" in
    ""|*[!0123456789abcdefABCDEF]*)
      printf '%s\n' "Unable to read a valid SHA-256 checksum from $checksum_file." >&2
      return 1
      ;;
  esac

  if [ "${#expected_checksum}" -ne 64 ]; then
    printf '%s\n' "Unable to read a valid SHA-256 checksum from $checksum_file." >&2
    return 1
  fi

  actual_checksum=$(sha256sum "$zip_file")
  actual_checksum=${actual_checksum%% *}

  if [ "$actual_checksum" != "$expected_checksum" ]; then
    printf '%s\n' "Checksum verification failed for $UUID.zip." >&2
    return 1
  fi
}

printf '%s\n' "Downloading latest release for $UUID..."
curl -fL -o "$zip_file" "$asset_url"

printf '%s\n' "Downloading checksum for $UUID..."
curl -fL -o "$checksum_file" "$checksum_url"

printf '%s\n' "Verifying downloaded release checksum..."
verify_checksum

printf '%s\n' "Installing GNOME Shell extension..."
gnome-extensions install --force "$zip_file"

printf '%s\n' "Done."
