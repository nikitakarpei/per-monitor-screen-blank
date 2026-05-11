import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LoggerPort } from '@pmsb/application';
import { GnomeProfileSettings } from './gnome-profile-settings.js';
import { GSETTINGS_KEYS } from './gsettings-schema-keys.js';

// ---------------------------------------------------------------------------
// Minimal mocks for gi://GLib and gi://Gio so the module loads under Vitest.
// ---------------------------------------------------------------------------

let uuidCounter = 0;

vi.mock('gi://GLib', () => ({
    default: {
        uuid_string_random: (): string => {
            uuidCounter += 1;
            return `uuid-${uuidCounter}`;
        },
    },
}));

vi.mock('gi://Gio', () => ({
    default: {},
}));

// ---------------------------------------------------------------------------
// Structural fake for Gio.Settings so we can cast without importing gi://Gio.
// ---------------------------------------------------------------------------

type GioSettings = ConstructorParameters<typeof GnomeProfileSettings>[0];

interface FakeSettings {
    get_string(key: string): string;
    set_string(key: string, value: string): boolean;
    get_strv(key: string): string[];
    set_strv(key: string, value: string[]): boolean;
    connect(signal: string, callback: () => void): number;
    disconnect(id: number): void;
}

class FakeGioSettings implements FakeSettings {
    readonly #store = new Map<string, string | string[]>();
    readonly #listeners = new Map<
        number,
        { signal: string; callback: () => void }
    >();
    #nextConnectionId = 1;

    get_string(key: string): string {
        const value = this.#store.get(key);
        return typeof value === 'string' ? value : '';
    }

    set_string(key: string, value: string): boolean {
        return this.#setAndEmit(key, value);
    }

    get_strv(key: string): string[] {
        const value = this.#store.get(key);
        return Array.isArray(value) ? value : [];
    }

    set_strv(key: string, value: string[]): boolean {
        return this.#setAndEmit(key, value);
    }

    #setAndEmit(key: string, value: string | string[]): boolean {
        this.#store.set(key, value);
        this.#emit(key);
        return true;
    }

    connect(signal: string, callback: () => void): number {
        const id = this.#nextConnectionId++;
        this.#listeners.set(id, { signal, callback });
        return id;
    }

    disconnect(id: number): void {
        this.#listeners.delete(id);
    }

    #emit(changedKey: string): void {
        for (const { signal, callback } of this.#listeners.values()) {
            if (signal === `changed::${changedKey}`) {
                callback();
            }
        }
    }
}

function createFakeLogger(): LoggerPort {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

describe('GnomeProfileSettings persistence / restore', () => {
    let settings: FakeGioSettings;
    let logger: LoggerPort;
    let profileSettings: GnomeProfileSettings;

    beforeEach(() => {
        uuidCounter = 0;
        settings = new FakeGioSettings();
        logger = createFakeLogger();

        profileSettings = new GnomeProfileSettings(
            settings as unknown as GioSettings,
            (profileId) => {
                const perProfileSettings = new FakeGioSettings();
                perProfileSettings.set_string('name', `Profile ${profileId}`);
                perProfileSettings.set_string('monitor-modes', '{}');
                return perProfileSettings as unknown as GioSettings;
            },
            logger,
        );
    });

    it('setActiveProfile records the ID as last-active-profile-id', () => {
        const id = profileSettings.createProfile('Test');
        profileSettings.setActiveProfile(id);

        expect(settings.get_string(GSETTINGS_KEYS.activeProfileId)).toBe(id);
        expect(settings.get_string(GSETTINGS_KEYS.lastActiveProfileId)).toBe(
            id,
        );
    });

    it('deactivateProfile clears active-profile-id while preserving last-active-profile-id', () => {
        const id = profileSettings.createProfile('Test');
        profileSettings.setActiveProfile(id);
        profileSettings.deactivateProfile();

        expect(settings.get_string(GSETTINGS_KEYS.activeProfileId)).toBe('');
        expect(settings.get_string(GSETTINGS_KEYS.lastActiveProfileId)).toBe(
            id,
        );
    });

    it('restoreLastActiveProfile re-activates an existing remembered profile and records it as last active', () => {
        const id = profileSettings.createProfile('Test');
        profileSettings.setActiveProfile(id);
        profileSettings.deactivateProfile();

        profileSettings.restoreLastActiveProfile();

        expect(settings.get_string(GSETTINGS_KEYS.activeProfileId)).toBe(id);
        expect(settings.get_string(GSETTINGS_KEYS.lastActiveProfileId)).toBe(
            id,
        );
    });

    it('restoreLastActiveProfile throws when remembered ID is empty', () => {
        expect(() => profileSettings.restoreLastActiveProfile()).toThrow(
            'restore-last-active-profile: no last active profile recorded',
        );
    });

    it('falls back to first profile in persisted profile-ids order when remembered ID is missing and logs info', () => {
        const firstId = profileSettings.createProfile('First');
        const secondId = profileSettings.createProfile('Second');

        // Activate second so it becomes the remembered last-active profile.
        profileSettings.setActiveProfile(secondId);

        // Simulate the second profile being removed externally:
        // drop it from profile-ids so the persisted list now contains only firstId.
        settings.set_strv(GSETTINGS_KEYS.profileIds, [firstId]);

        profileSettings.restoreLastActiveProfile();

        expect(settings.get_string(GSETTINGS_KEYS.activeProfileId)).toBe(
            firstId,
        );
        expect(settings.get_string(GSETTINGS_KEYS.lastActiveProfileId)).toBe(
            firstId,
        );
        expect(logger.info).toHaveBeenCalledWith(
            `restore-last-active-profile: remembered profile ${secondId} is missing; activating fallback profile ${firstId}`,
        );
    });
});
