# Per-Monitor Screen Blank

![GNOME Extensions review pending](https://img.shields.io/badge/GNOME%20Extensions-Review%20Pending-EAAA00?style=for-the-badge&logo=gnome&logoColor=white)
[![Download Latest ZIP](https://img.shields.io/badge/Download-Latest%20ZIP-24292F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nikitakarpei/per-monitor-screen-blank/releases/latest)

## Overview

**Per-Monitor Screen Blank** is a GNOME Shell extension that applies a black shell overlay to idle monitors while keeping the display layout and connected monitor state unchanged.

It is meant for setups where a secondary monitor may sit on static content for long periods and should be blanked without triggering monitor disconnect behavior. The extension uses shell-level control because regular app windows are not reliable for this on Wayland.

![Preferences window](images/screenshot.png)

## AI Disclosure

AI assistance was used during development. All generated code was reviewed and tested by the author.

## Compatibility

Tested on **Ubuntu 25.10**, **GNOME 49**, **Wayland**.

## Monitor modes

Each display has its own mode in the active preset. You can change it from Preferences or the pointer shortcut menu.

- **Automatic** — The extension may blank that screen after the pointer has been idle on it for the configured **Blank after** time. Moving the pointer onto that screen wakes it again.
- **Never Blank** — That screen is left alone by the extension until you choose another mode.
- **Keep Awake** — That screen will not blank automatically for the configured **Keep awake for** time. When the timer ends, that screen returns to **Automatic**.
- **Black Screen** — The black overlay stays on that screen until you switch modes.

## Pointer menu shortcut

Press the shortcut to open a small menu at the pointer for the screen under the cursor. From there you can switch **Automatic**, **Never Blank**, **Keep Awake**, or **Black Screen** without opening full Preferences.

The default is **Super+Shift+O**. Change or clear it under **General Settings** in the extension’s Preferences (**Set…** / **Clear**). Click elsewhere or press Escape to close the menu.
When **Show top bar icon** is enabled, Quick Settings adds a top-bar indicator and menu entry for switching the active preset or opening Preferences.

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

To remove the installed copy and all persisted extension settings data:

```sh
sh ./scripts/uninstall.sh --remove-data
```

## Development Notes

- `sh ./scripts/nested-shell-smoke.sh` runs a nested GNOME Shell smoke workflow (requires `dbus-run-session`, `gnome-shell`, `gsettings`, `rg`).
- `sh ./scripts/package-ego-zip.sh` writes `dist/per-monitor-screen-blank@nikitakarpei.github.io.zip` for [extensions.gnome.org](https://extensions.gnome.org/) (extension files at zip root; requires `zip` and `glib-compile-schemas`).
- Runtime logs are prefixed with `[per-monitor-screen-blank]` in `journalctl` (Preferences can open a filtered follow stream via `journalctl --user -f --no-pager -g per-monitor-screen-blank`).
