// Side-effect imports for prefs process and shared code
// These types are safe for both extension.js and prefs.js processes

// GTK4 and Adwaita types for preferences dialog
import '@girs/gtk-4.0';
import '@girs/adw-1';
import '@girs/gdk-4.0';

// Core GLib/GObject types
import '@girs/glib-2.0';
import '@girs/gobject-2.0';
import '@girs/gio-2.0';
import '@girs/gmodule-2.0';

// Pango for text rendering
import '@girs/pango-1.0';
import '@girs/pangocairo-1.0';
