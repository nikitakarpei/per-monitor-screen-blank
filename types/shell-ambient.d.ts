// Side-effect imports for GNOME Shell process ONLY (extension.js, shell-ui/, shell-infra/)
// These types are NOT available in prefs/ or shared/

// GNOME Shell ambient types (provides Shell.Global, Meta, St, Clutter, etc.)
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

// Resource module type declarations
import './pointer-watcher.d.ts';
