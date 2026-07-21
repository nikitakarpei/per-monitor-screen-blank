import { describe, it, expect, vi } from 'vitest';
import type { LoggerPort } from '../util/logger.js';
import type { ProfileSettings } from '../ports/profile-settings.js';
import type { Profile, ProfileId, MonitorMode } from '@pmsb/domain';
import { AppEventBus } from '../services/app-event-bus.js';
import { MonitorRegistry } from '../services/monitor-registry.js';
import { FocusedMonitorService } from '../services/focused-monitor-service.js';
import { ModeStateResolver } from '../services/mode-state-resolver.js';
import type { PlatformEventSubscriber } from '../ports/platform-events.js';
import type { PointerSource } from '../ports/monitors.js';
import type { GeneralSettings } from '../ports/general-settings.js';
import { applyProfileModesToMonitors } from './apply-profile-modes-to-monitors.js';

class FakeProfileSettings implements ProfileSettings {
    readonly #profiles: Profile[];

    constructor(profiles: Profile[]) {
        this.#profiles = profiles;
    }

    getProfiles(): Profile[] {
        return this.#profiles;
    }

    getMonitorMode(_profileId: ProfileId, monitorId: string): MonitorMode {
        const profile = this.#profiles.find((p) => p.id === _profileId);
        return profile?.monitorModes[monitorId] ?? 'disabled';
    }

    ensureDefaultProfile = vi.fn();
    getActiveProfile = vi.fn();
    setActiveProfile = vi.fn();
    deactivateProfile = vi.fn();
    restoreLastActiveProfile = vi.fn();
    createProfile = vi.fn();
    deleteProfile = vi.fn();
    renameProfile = vi.fn();
    setMonitorMode = vi.fn();
}

function createFakeLogger(): LoggerPort {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

function noop(): void {
    /* no-op */
}

function createNoOpPlatformSubscriber(): PlatformEventSubscriber {
    return {
        on: vi.fn(() => noop),
        onAny: vi.fn(() => noop),
    };
}

function createFakePointerSource(monitorId: string): PointerSource {
    return {
        getPointerPosition: vi.fn(() => ({
            monitorId,
            x: 0,
            y: 0,
        })),
    };
}

class FakeGeneralSettings implements GeneralSettings {
    readonly #disableAutoTimerOnPointerMonitor: boolean;

    constructor(disableAutoTimerOnPointerMonitor: boolean) {
        this.#disableAutoTimerOnPointerMonitor =
            disableAutoTimerOnPointerMonitor;
    }

    getIdleTimeout(): number {
        return 60;
    }

    setIdleTimeout = vi.fn();

    getFadeDuration(): number {
        return 500;
    }

    setFadeDuration = vi.fn();

    getDimIntensity(): number {
        return 50;
    }

    setDimIntensity = vi.fn();

    getPointerMenuShortcut(): string[] {
        return [];
    }

    setPointerMenuShortcut = vi.fn();

    getShowQuickSettingsMenu(): boolean {
        return true;
    }

    setShowQuickSettingsMenu = vi.fn();

    getShowIssueNotifications(): boolean {
        return true;
    }

    setShowIssueNotifications = vi.fn();

    getDisableAutoTimerOnPointerMonitor(): boolean {
        return this.#disableAutoTimerOnPointerMonitor;
    }

    setDisableAutoTimerOnPointerMonitor = vi.fn();

    getKeepAwakeMinutes(): number {
        return 30;
    }

    setKeepAwakeMinutes = vi.fn();

    getDisableWindowObstructionPolicy(): boolean {
        return false;
    }

    setDisableWindowObstructionPolicy = vi.fn();
}

describe('applyProfileModesToMonitors', () => {
    it('applies profile monitor modes to all managed monitors', () => {
        const profile: Profile = {
            id: 'profile-1',
            name: 'Test Profile',
            monitorModes: {
                'monitor-a': 'keep-awake',
                'monitor-b': 'disabled',
            },
        };
        const profileSettings = new FakeProfileSettings([profile]);
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');
        monitorRegistry.create('monitor-b');

        const pointerSource = createFakePointerSource('monitor-a');
        const focusedMonitorService = new FocusedMonitorService(
            pointerSource,
            monitorRegistry,
        );
        const generalSettings = new FakeGeneralSettings(false);
        const modeStateResolver = new ModeStateResolver(
            generalSettings,
            focusedMonitorService,
        );

        applyProfileModesToMonitors(
            { profileSettings, monitorRegistry, modeStateResolver, logger },
            'profile-1',
        );

        expect(monitorRegistry.get('monitor-a').state).toBe('KeepAwake');
        expect(monitorRegistry.get('monitor-b').state).toBe('Disabled');

        bus.dispose();
        monitorRegistry.dispose();
    });

    it('resolves undefined modes to disabled', () => {
        const profile: Profile = {
            id: 'profile-1',
            name: 'Test Profile',
            monitorModes: {},
        };
        const profileSettings = new FakeProfileSettings([profile]);
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');

        const pointerSource = createFakePointerSource('monitor-a');
        const focusedMonitorService = new FocusedMonitorService(
            pointerSource,
            monitorRegistry,
        );
        const generalSettings = new FakeGeneralSettings(false);
        const modeStateResolver = new ModeStateResolver(
            generalSettings,
            focusedMonitorService,
        );

        applyProfileModesToMonitors(
            { profileSettings, monitorRegistry, modeStateResolver, logger },
            'profile-1',
        );

        expect(monitorRegistry.get('monitor-a').state).toBe('Disabled');

        bus.dispose();
        monitorRegistry.dispose();
    });

    it('warns and returns when profile is not found', () => {
        const profileSettings = new FakeProfileSettings([]);
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');

        const pointerSource = createFakePointerSource('monitor-a');
        const focusedMonitorService = new FocusedMonitorService(
            pointerSource,
            monitorRegistry,
        );
        const generalSettings = new FakeGeneralSettings(false);
        const modeStateResolver = new ModeStateResolver(
            generalSettings,
            focusedMonitorService,
        );

        applyProfileModesToMonitors(
            { profileSettings, monitorRegistry, modeStateResolver, logger },
            'nonexistent-profile',
        );

        expect(logger.warn).toHaveBeenCalledWith(
            'apply-profile-modes-to-monitors: profile not found for id nonexistent-profile',
        );
        expect(monitorRegistry.get('monitor-a').state).toBeUndefined();

        bus.dispose();
        monitorRegistry.dispose();
    });
});
