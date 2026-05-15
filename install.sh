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

printf '%s\n' "Downloading latest release for $UUID..."
curl -fL -o "$zip_file" "$asset_url"

printf '%s\n' "Downloading checksum for $UUID..."
curl -fL -o "$checksum_file" "$checksum_url"

printf '%s\n' "Verifying downloaded release checksum..."
(cd "$temp_dir" && sha256sum -c "$UUID.zip.sha256")

printf '%s\n' "Installing GNOME Shell extension..."
gnome-extensions install --force "$zip_file"

printf '%s\n' "Done."
