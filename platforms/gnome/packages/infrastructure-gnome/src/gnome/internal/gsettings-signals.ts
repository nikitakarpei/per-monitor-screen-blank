/**
 * Internal GSettings signal helpers for infrastructure-gnome.
 * Not exported from the package - for internal use only.
 */
import {
    GSETTINGS_KEYS,
    PROFILE_GSETTINGS_KEYS,
} from '../gsettings-schema-keys.js';

/** `connect('changed::…')` for a specific schema key. Internal to infrastructure-gnome. */
export function gsettingsChangedSignal(
    key: (typeof GSETTINGS_KEYS)[keyof typeof GSETTINGS_KEYS],
): string;
export function gsettingsChangedSignal(
    key: (typeof PROFILE_GSETTINGS_KEYS)[keyof typeof PROFILE_GSETTINGS_KEYS],
): string;
export function gsettingsChangedSignal(key: string): string {
    return `changed::${key}`;
}
