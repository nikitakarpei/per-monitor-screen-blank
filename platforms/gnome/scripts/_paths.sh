#!/bin/sh
# Shared GNOME script path helper.

if [ -z "${GNOME_SCRIPTS_DIR:-}" ]; then
  printf '%s\n' 'ERROR: GNOME_SCRIPTS_DIR must be set before sourcing platforms/gnome/scripts/_paths.sh.' >&2
  return 1
fi

if [ ! -d "$GNOME_SCRIPTS_DIR" ]; then
  printf '%s\n' 'ERROR: GNOME_SCRIPTS_DIR must point to an existing directory.' >&2
  printf '%s\n' "  GNOME_SCRIPTS_DIR=$GNOME_SCRIPTS_DIR" >&2
  return 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' 'ERROR: git is required to resolve the repository root from the GNOME scripts directory.' >&2
  return 1
fi

REPOSITORY_ROOT=$(
  (
    cd "$GNOME_SCRIPTS_DIR" 2>/dev/null || exit 1
    git rev-parse --show-toplevel 2>/dev/null || exit 1
  )
) || {
  printf '%s\n' 'ERROR: unable to resolve the Git worktree root from GNOME_SCRIPTS_DIR.' >&2
  printf '%s\n' "  GNOME_SCRIPTS_DIR=$GNOME_SCRIPTS_DIR" >&2
  printf '%s\n' '  Ensure the scripts are being run inside the repository Git worktree.' >&2
  return 1
}

if [ ! -d "$REPOSITORY_ROOT/platforms/gnome/scripts" ]; then
  printf '%s\n' 'ERROR: resolved repository root does not contain platforms/gnome/scripts.' >&2
  printf '%s\n' "  REPOSITORY_ROOT=$REPOSITORY_ROOT" >&2
  return 1
fi

GNOME_PLATFORM_ROOT=$REPOSITORY_ROOT/platforms/gnome
GNOME_SCRIPTS_DIR=$GNOME_PLATFORM_ROOT/scripts
GNOME_DIST_DIR=$GNOME_PLATFORM_ROOT/dist

export REPOSITORY_ROOT GNOME_PLATFORM_ROOT GNOME_SCRIPTS_DIR GNOME_DIST_DIR

return 0
