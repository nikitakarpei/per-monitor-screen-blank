# Per-Monitor Screen Blank

![GNOME Extensions review pending](https://img.shields.io/badge/GNOME%20Extensions-Review%20Pending-EAAA00?style=for-the-badge&logo=gnome&logoColor=white)
[![Download Latest ZIP](https://img.shields.io/badge/Download-Latest%20ZIP-24292F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nikitakarpei/per-monitor-screen-blank/releases/latest)
![Built with AI](https://img.shields.io/badge/Built_with-AI-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)

## Overview

**Per-Monitor Screen Blank** is a GNOME Shell extension that applies a black shell overlay to idle monitors while keeping the display layout and connected monitor state unchanged.

It is meant for setups where a secondary monitor may sit on static content for long periods and should be blanked without triggering monitor disconnect behavior. The extension uses shell-level control because regular app windows are not reliable for this on Wayland.

![Preferences window](images/screenshot.png)

## AI Disclosure

AI assistance was used during development. All generated code was reviewed and tested by the author.

## Compatibility

Tested on **Ubuntu 25.10**, **GNOME 49**, **Wayland**.
Tested on **Ubuntu 26.04**, **GNOME 50**, **Wayland**.

## Monitor modes

Each display has its own mode in the active preset. You can change it from Preferences or the pointer shortcut menu.

- **Automatic** — The extension may blank that screen after it has had no pointer activity for the configured **Blank after** time. Any pointer activity on that screen wakes it again.
- **Never Blank** — That screen is left alone by the extension until you choose another mode.
- **Keep Awake** — That screen will not blank automatically for the configured **Keep awake for** time. When the timer ends, that screen returns to **Automatic**.
- **Black Screen** — The black overlay stays on that screen until you switch modes.

## General settings

- **Blank after** — How long a screen in Automatic mode must go without pointer activity before it blanks.
- **Keep awake for** — How long Keep Awake stays active before the screen returns to Automatic.
- **Do not blank the screen under the pointer** — While enabled, automatic blanking is paused for whichever screen the pointer is currently on.
- **Darkness** — How opaque the black overlay is, from transparent to fully black.
- **Fade time** — Duration of the fade animation when a screen blacks out or wakes up.

## Pointer menu shortcut

Press the shortcut to open a small menu at the pointer for the screen under the cursor. From there you can switch **Automatic**, **Never Blank**, **Keep Awake**, or **Black Screen** without opening full Preferences.

The default is **Super+Shift+O**. Change or clear it under **General Settings** in the extension’s Preferences (**Set…** / **Clear**). Click elsewhere or press Escape to close the menu.
When **Show quick settings menu** is enabled, Quick Settings adds a menu entry for switching the active preset or opening Preferences.

## Installation Guide

From the repository root:

```sh
sh ./platforms/gnome/scripts/install.sh
```

Then reload GNOME Shell if needed and enable **Per-Monitor Screen Blank** in the Extensions app.

To remove the installed copy:

```sh
sh ./platforms/gnome/scripts/uninstall.sh
```

To remove the installed copy and all persisted extension settings data:

```sh
sh ./platforms/gnome/scripts/uninstall.sh --remove-data
```

## Development Notes

- `npm run lint` runs ESLint as the JS harness for this extension. It uses ESLint core rules plus `eslint-plugin-sonarjs` for maintainability smells, `eslint-plugin-unicorn` for modern JS correctness rules, and `eslint-plugin-import` for import hygiene.
- `ego-lint` runs during `sh ./platforms/gnome/scripts/package-ego-zip.sh` against the built extension/package output before upload.
- `sh ./platforms/gnome/scripts/nested-shell-smoke.sh` runs a nested GNOME Shell smoke workflow (requires `dbus-run-session`, `gnome-shell`, `gsettings`, `rg`, and an existing graphical Wayland session).
- `sh ./platforms/gnome/scripts/package-ego-zip.sh` writes `platforms/gnome/dist/per-monitor-screen-blank@nikitakarpei.github.io.zip` for [extensions.gnome.org](https://extensions.gnome.org/) (extension files at zip root; requires `zip` and `glib-compile-schemas`).
- Runtime logs are prefixed with `[per-monitor-screen-blank]` in `journalctl` (Preferences can open a filtered follow stream via `journalctl --user -f --no-pager -g per-monitor-screen-blank`).
