// Side-effect imports: register gi:// and resource:// module paths for TypeScript resolution.
// https://gjs.guide/extensions/development/typescript.html

// GNOME Shell ambient types (provides Shell.Global, Meta, St, Clutter, etc.)
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';
