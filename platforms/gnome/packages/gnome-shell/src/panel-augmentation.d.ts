// Module augmentation for GNOME Shell panel.js QuickSettings.
// Upstream accepts SystemIndicator in addExternalIndicator, but @girs/gnome-shell
// types currently declare only Button. This widens the parameter type.
// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js

import type { SystemIndicator } from '@girs/gnome-shell/ui/quickSettings';

declare module '@girs/gnome-shell/ui/panel' {
    interface QuickSettings {
        addExternalIndicator(
            indicator: SystemIndicator,
            colSpan?: number,
        ): void;
    }
}
