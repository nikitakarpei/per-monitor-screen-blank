#!/bin/sh

set -eu

. "$(dirname -- "$0")/_paths.sh"

for cmd in dbus-run-session gnome-shell gsettings rg; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf 'ERROR: %s command is not available.\n' "$cmd"
    exit 1
  fi
done

if [ "${XDG_SESSION_TYPE:-}" != "wayland" ] || [ -z "${WAYLAND_DISPLAY:-}" ] || [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  printf '%s\n' 'ERROR: nested GNOME Shell smoke test must be run from an existing graphical Wayland session.'
  printf '%s\n' '       Please start it from a usable Wayland desktop session and try again.'
  exit 1
fi
have_timeout=0
if command -v timeout >/dev/null 2>&1; then
  have_timeout=1
fi

uuid="per-monitor-screen-blank@nikitakarpei.github.io"
boot_wait="${1:-8}"
run_wait="${2:-6}"
nested_log=$(mktemp)
extension_context_log=$(mktemp)
trap 'rm -f "$nested_log" "$extension_context_log"' EXIT

sh "$GNOME_SCRIPTS_DIR/build-gnome.sh"
src_extension_dir="$GNOME_DIST_DIR/$uuid"
# Avoid bare "ERROR:" — it matches notifyError body text ("error: Per-Monitor ...") in nested logs.
error_pattern='JS ERROR|TypeError|SyntaxError|ReferenceError|No signal|GType|Argument string may not be null|Unhandled promise rejection|CRITICAL|GLib-CRITICAL|Gjs-CRITICAL|\[per-monitor-screen-blank\] ERROR:'

printf '%s\n' "== Running nested GNOME Shell check =="
dbus-run-session sh -eu -c '
  log_file="$1"
  extension_uuid="$2"
  extension_src="$3"
  boot_delay="$4"
  run_delay="$5"
  have_timeout_flag="$6"

  sandbox_home=$(mktemp -d)
  trap "rm -rf \"$sandbox_home\"" EXIT
  export XDG_DATA_HOME="$sandbox_home"

  extension_dir="$XDG_DATA_HOME/gnome-shell/extensions/$extension_uuid"
  mkdir -p "$extension_dir"
  cp -R "$extension_src/." "$extension_dir/"
  if command -v glib-compile-schemas >/dev/null 2>&1; then
    if ! glib-compile-schemas "$extension_dir/schemas" >/dev/null 2>&1; then
      printf '%s\n' "ERROR: failed to compile extension schemas in $extension_dir/schemas"
      exit 1
    fi
  fi

  gsettings set org.gnome.shell disable-user-extensions false >/dev/null 2>&1 || true
  gsettings set org.gnome.shell enabled-extensions "[\"$extension_uuid\"]" >/dev/null 2>&1 || true

  shell_mode="--nested"
  if gnome-shell --help 2>&1 | rg -q -- "--devkit"; then
    shell_mode="--devkit"
  fi

  G_MESSAGES_DEBUG=all SHELL_DEBUG=all gnome-shell "$shell_mode" --wayland >"$log_file" 2>&1 &
  shell_pid=$!

  boot_deadline=$(( $(date +%s) + boot_delay ))
  while :; do
    if rg -q "Extension $extension_uuid in state ACTIVE after loading|State: ACTIVE" "$log_file" 2>/dev/null; then
      break
    fi
    if ! kill -0 "$shell_pid" >/dev/null 2>&1; then
      break
    fi
    if [ "$(date +%s)" -ge "$boot_deadline" ]; then
      break
    fi
    sleep 1
  done

  {
    echo "== Nested shell mode: $shell_mode =="
    echo "== Nested gnome-extensions checks =="
    if [ "$have_timeout_flag" = "1" ]; then
      timeout 10 gnome-extensions enable "$extension_uuid" || true
      timeout 10 gnome-extensions info "$extension_uuid" || true
      timeout 10 gnome-extensions list --enabled || true
    else
      gnome-extensions enable "$extension_uuid" || true
      gnome-extensions info "$extension_uuid" || true
      gnome-extensions list --enabled || true
    fi
  } >>"$log_file" 2>&1

  run_deadline=$(( $(date +%s) + run_delay ))
  while :; do
    if rg -q "Extension $extension_uuid in state ACTIVE after loading|State: ACTIVE" "$log_file" 2>/dev/null; then
      break
    fi
    if [ "$(date +%s)" -ge "$run_deadline" ]; then
      break
    fi
    sleep 1
  done

  kill "$shell_pid" >/dev/null 2>&1 || true
  wait "$shell_pid" >/dev/null 2>&1 || true
' _ "$nested_log" "$uuid" "$src_extension_dir" "$boot_wait" "$run_wait" "$have_timeout"

printf '%s\n' "== Nested shell extension errors =="
if ! rg -i "per-monitor-screen-blank|Extension per-monitor-screen-blank@nikitakarpei.github.io|$error_pattern" "$nested_log"; then
  printf '%s\n' "No extension-related errors found in nested shell log."
fi

rg -i -C 6 "per-monitor-screen-blank@nikitakarpei.github.io|Extension per-monitor-screen-blank@nikitakarpei.github.io|Loading extension per-monitor-screen-blank@nikitakarpei.github.io|state of extension per-monitor-screen-blank@nikitakarpei.github.io" "$nested_log" >"$extension_context_log" || true

if ! rg -q "per-monitor-screen-blank@nikitakarpei.github.io|Extension per-monitor-screen-blank@nikitakarpei.github.io" "$nested_log"; then
  printf '%s\n' "Nested check failed: extension did not appear in nested shell logs."
  exit 1
fi

if rg -qi "$error_pattern" "$extension_context_log"; then
  printf '%s\n' "Nested check failed: runtime errors detected in nested shell logs."
  exit 1
fi

if rg -q "ERROR: Could not read extension state|State: ERROR" "$nested_log"; then
  printf '%s\n' "Nested check failed: extension reported an ERROR state in nested shell."
  exit 1
fi

if ! rg -q "Extension per-monitor-screen-blank@nikitakarpei.github.io in state ACTIVE after loading|State: ACTIVE" "$nested_log"; then
  printf '%s\n' "Nested check failed: extension never reached ACTIVE state."
  exit 1
fi

if rg -q "State: DISABLED|State: OUT OF DATE|State: OUT_OF_DATE|State: UNINSTALLED" "$nested_log"; then
  printf '%s\n' "Nested check failed: extension did not reach ENABLED state."
  exit 1
fi
