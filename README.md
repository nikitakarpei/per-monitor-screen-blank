# Per-Monitor Screen Blank

## Brief Description / Introduction

**Per-Monitor Screen Blank** is a GNOME Shell extension for Ubuntu/GNOME that applies a black shell overlay to monitors that are idle, while keeping the display layout and connected monitor state unchanged.

## Motivation / Original Problem

The extension is designed to reduce OLED burn-in risk on a secondary monitor by blanking it when it is idle and likely showing static content. It does this without triggering monitor disconnect behavior, and it uses shell-level control because regular app windows are not reliable for this on Wayland.

## Monitor modes

Each display has its own mode in the active profile. You can change it from Preferences, Quick Settings, or the pointer shortcut menu.

- **Auto** — The extension may blank that monitor after the pointer has been idle on it for the configured **Idle timeout**. Idle detection and wake behavior follow **Wake on pointer entry** and the other global timing options.
- **Disabled** — That monitor is left alone by the extension (no automatic blanking) until you choose another mode.
- **Keep awake** — No automatic blanking on that monitor for the configured **Keep awake** duration (minutes); when the timer ends, that monitor returns to **Auto** so protection resumes without a manual step.
- **Manual black** — The black overlay stays on that monitor until you switch modes. In the pointer menu this action is labeled **Black Now**.

## Pointer menu shortcut

Press the shortcut to open a small menu at the pointer for the monitor under the cursor. From there you can switch **Auto**, **Disabled**, **Keep awake**, or **Black now** without opening full Preferences.

The default is **Super+Shift+O**. Change or clear it under **Global behavior** in the extension’s Preferences (**Set…** / **Clear**). Click elsewhere or press Escape to close the menu.

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
- `sh ./scripts/package-ego-zip.sh` writes `dist/per-monitor-screen-blank@nikitakarpei.github.io.zip` for [extensions.gnome.org](https://extensions.gnome.org/) (extension files at zip root; requires `zip` and `glib-compile-schemas`).
- Runtime logs are prefixed with `[per-monitor-screen-blank]` in `journalctl` (Preferences can open a filtered follow stream via `journalctl --user -f --no-pager -g per-monitor-screen-blank`).
- Declare only GNOME Shell versions you have tested in `metadata.json` `shell-version` (currently aimed at **49**).