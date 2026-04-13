# Per-Monitor Screen Blank

## Brief Description / Introduction

**Per-Monitor Screen Blank** is a GNOME Shell extension for Ubuntu/GNOME that applies a black shell overlay to monitors that are idle, while keeping the display layout and connected monitor state unchanged.

## Motivation / Original Problem

The extension is designed to reduce OLED burn-in risk on a secondary monitor by blanking it when it is idle and likely showing static content. It does this without triggering monitor disconnect behavior, and it uses shell-level control because regular app windows are not reliable for this on Wayland.

## Brief Description of Features

- Per-monitor modes with an **Auto** default, plus manual overrides such as **Keep Awake** and **Black Now**.
- Shell-native controls through **Quick Settings** and a persistent top-bar indicator for visible state.
- Automatic wake behavior when pointer activity returns to the monitor, with configurable timing and fade.
- Settings persisted in GSettings (`org.gnome.shell.extensions.per-monitor-screen-blank`).

## Installation Guide

From the repository root:

```sh
sh ./scripts/install.sh
```

Then reload GNOME Shell if needed and enable **Per-Monitor Screen Blank** in the Extensions app.

To remove the installed copy:

```sh
sh ./scripts/uninstall.sh
```

## Development Notes

- `sh ./scripts/nested-shell-smoke.sh` runs a nested GNOME Shell smoke workflow (requires `dbus-run-session`, `gnome-shell`, `gsettings`, `rg`).
- Runtime logs are prefixed with `[per-monitor-screen-blank]` in `journalctl`.