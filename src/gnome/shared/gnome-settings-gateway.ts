import Gio from 'gi://Gio';
import { PlatformEventEmitter } from '../../app/ports/platform-events.js';
import { SettingsGateway } from '../../app/ports/settings.js';
import {
    DEFAULT_MONITOR_MODE,
    type MonitorMode,
} from '../../domain/monitor-mode.js';
import { Profile, ProfileId } from '../../domain/types.js';
import { Logger } from '../../util/logger.js';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../gsettings-schema-keys.js';
import { ProfileRegistry } from './profile-registry.js';

/**
 * Pure facade for GSettings access.
 * - Delegates ALL profile operations to ProfileRegistry and ProfileStore
 * - Does NOT subscribe to ProfileRegistry/ProfileStore events (they emit directly)
 * - Only handles scalar settings wiring and emits through PlatformEventEmitter
 */
export class GnomeSettingsGateway implements SettingsGateway {
    readonly #settings: Gio.Settings;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #profileRegistry: ProfileRegistry;
    readonly #logger: Logger;
    readonly #signalConnections: number[] = [];
    #started = false;
    #destroyed = false;

    constructor(deps: GnomeSettingsGatewayDeps) {
        this.#settings = deps.settings;
        this.#eventEmitter = deps.eventEmitter;
        this.#profileRegistry = deps.profileRegistry;
        this.#logger = deps.logger;
    }

    start(): void {
        if (this.#started) {
            return;
        }
        this.#started = true;

        // Start the profile registry
        this.#profileRegistry.start();

        // Wire scalar settings signals
        this.#wireScalarSettingsSignals();
    }

    /**
     * Emits initial scalar settings state events.
     * Should be called after start() when all components are initialized.
     */
    emitInitialState(): void {
        this.#eventEmitter.emit({
            type: 'idle-timeout-changed',
            payload: { timeoutSeconds: this.getIdleTimeoutSeconds() },
        });
        this.#eventEmitter.emit({
            type: 'keep-awake-duration-changed',
            payload: { minutes: this.getKeepAwakeMinutes() },
        });
        this.#eventEmitter.emit({
            type: 'fade-duration-changed',
            payload: { milliseconds: this.getFadeDurationMs() },
        });
        this.#eventEmitter.emit({
            type: 'dim-intensity-changed',
            payload: { percent: this.getDimIntensityPercent() },
        });
        this.#eventEmitter.emit({
            type: 'quick-settings-menu-visibility-changed',
            payload: { visible: this.shouldShowQuickSettingsMenu() },
        });
        this.#eventEmitter.emit({
            type: 'pointer-monitor-timer-policy-changed',
            payload: {
                shouldMonitorAutoBlackWhenFocused:
                    this.shouldMonitorAutoBlackWhenFocused(),
            },
        });
        this.#eventEmitter.emit({
            type: 'pointer-shortcut-changed',
            payload: { shortcut: this.getPointerMenuShortcut() },
        });
    }

    destroy(): void {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;

        // Disconnect all scalar signal handlers
        for (const id of this.#signalConnections) {
            try {
                this.#settings.disconnect(id);
            } catch {
                this.#logger.warn('disconnect failed during gateway destroy');
            }
        }
        this.#signalConnections.length = 0;

        // Destroy the profile registry
        this.#profileRegistry.destroy();
    }

    // ============================================================================
    // Profile Operations (delegated to ProfileRegistry/ProfileStore)
    // ============================================================================

    ensureStorage(): void {
        this.#profileRegistry.ensureDefaultProfile();
    }

    getProfiles(): ReadonlyArray<Readonly<Profile>> {
        const profileIds = this.#profileRegistry.getProfileIds();
        const profiles: Profile[] = [];

        for (const id of profileIds) {
            const store = this.#profileRegistry.getProfileStore(id);
            if (!store) {
                this.#logger.warn(`Profile not found in profile map: ${id}`);
                continue;
            }
            profiles.push({
                id: store.id,
                name: store.getName(),
                monitorModes: store.getMonitorModes(),
            });
        }

        return profiles.map((p) => ({
            ...p,
            monitorModes: { ...p.monitorModes },
        }));
    }

    getActiveProfileId(): ProfileId {
        return this.#profileRegistry.getActiveProfileId();
    }

    getActiveProfile(): Readonly<Profile> {
        const activeId = this.getActiveProfileId();
        const store = this.#profileRegistry.getProfileStore(activeId);

        if (!store) {
            throw new Error(
                `Active profile store is empty/missing: ${activeId}`,
            );
        }

        return {
            id: store.id,
            name: store.getName(),
            monitorModes: store.getMonitorModes(),
        };
    }

    setActiveProfile(profileId: ProfileId): void {
        this.#profileRegistry.setActiveProfileId(profileId);
    }

    getMonitorMode(monitorId: string): MonitorMode {
        const activeId = this.getActiveProfileId();

        if (!activeId) {
            this.#logger.warn(
                `getMonitorMode: active profile id is empty, falling back to 'disabled' mode for monitor ${monitorId}`,
            );
            return DEFAULT_MONITOR_MODE;
        }

        const store = this.#profileRegistry.getProfileStore(activeId);

        if (!store) {
            this.#logger.warn(
                `getMonitorMode: active profile store is missing for ${activeId}, falling back to 'disabled' mode for monitor ${monitorId}`,
            );
            return DEFAULT_MONITOR_MODE;
        }

        return store.getMonitorMode(monitorId);
    }

    getMonitorModes(
        profileId: ProfileId,
    ): Readonly<Record<string, MonitorMode>> {
        const store = this.#profileRegistry.getProfileStore(profileId);

        if (!store) {
            throw new Error(
                `Cannot get monitor modes: profile store is missing for ${profileId}`,
            );
        }

        const modes = store.getMonitorModes();
        if (Object.keys(modes).length === 0) {
            this.#logger.info(
                `No monitor modes configured for profile: ${profileId}`,
            );
        }

        return modes;
    }

    setMonitorMode(monitorId: string, mode: MonitorMode): void {
        const activeId = this.getActiveProfileId();
        const store = this.#profileRegistry.getProfileStore(activeId);

        if (!store) {
            this.#logger.warn(
                `setMonitorMode: active profile ${activeId} not found`,
            );
            throw new Error('active profile not found');
        }

        store.setMonitorMode(monitorId, mode);
    }

    // ============================================================================
    // Scalar Settings
    // ============================================================================

    getIdleTimeoutSeconds(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.idleTimeoutSeconds);
    }

    getKeepAwakeMinutes(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.keepAwakeMinutes);
    }

    shouldMonitorAutoBlackWhenFocused(): boolean {
        return !this.#settings.get_boolean(
            GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
        );
    }

    getFadeDurationMs(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.fadeDurationMs);
    }

    getDimIntensityPercent(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.dimIntensityPercent);
    }

    shouldShowQuickSettingsMenu(): boolean {
        return this.#settings.get_boolean(GSETTINGS_KEYS.showQuickSettingsMenu);
    }

    getPointerMenuShortcut(): string[] {
        return this.#settings.get_strv(GSETTINGS_KEYS.pointerMenuShortcut);
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    #wireScalarSettingsSignals(): void {
        const connect = (
            key: (typeof GSETTINGS_KEYS)[keyof typeof GSETTINGS_KEYS],
            function_: () => void,
        ) => {
            const id = this.#settings.connect(
                gsettingsChangedSignal(key),
                function_,
            );
            this.#signalConnections.push(id);
        };

        connect(GSETTINGS_KEYS.idleTimeoutSeconds, () => {
            this.#eventEmitter.emit({
                type: 'idle-timeout-changed',
                payload: { timeoutSeconds: this.getIdleTimeoutSeconds() },
            });
        });

        connect(GSETTINGS_KEYS.keepAwakeMinutes, () => {
            this.#eventEmitter.emit({
                type: 'keep-awake-duration-changed',
                payload: { minutes: this.getKeepAwakeMinutes() },
            });
        });

        connect(GSETTINGS_KEYS.fadeDurationMs, () => {
            this.#eventEmitter.emit({
                type: 'fade-duration-changed',
                payload: { milliseconds: this.getFadeDurationMs() },
            });
        });

        connect(GSETTINGS_KEYS.dimIntensityPercent, () => {
            this.#eventEmitter.emit({
                type: 'dim-intensity-changed',
                payload: { percent: this.getDimIntensityPercent() },
            });
        });

        connect(GSETTINGS_KEYS.showQuickSettingsMenu, () => {
            this.#eventEmitter.emit({
                type: 'quick-settings-menu-visibility-changed',
                payload: { visible: this.shouldShowQuickSettingsMenu() },
            });
        });

        connect(GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor, () => {
            this.#eventEmitter.emit({
                type: 'pointer-monitor-timer-policy-changed',
                payload: {
                    shouldMonitorAutoBlackWhenFocused:
                        this.shouldMonitorAutoBlackWhenFocused(),
                },
            });
        });

        connect(GSETTINGS_KEYS.pointerMenuShortcut, () => {
            this.#eventEmitter.emit({
                type: 'pointer-shortcut-changed',
                payload: { shortcut: this.getPointerMenuShortcut() },
            });
        });
    }
}

interface GnomeSettingsGatewayDeps {
    settings: Gio.Settings;
    eventEmitter: PlatformEventEmitter;
    profileRegistry: ProfileRegistry;
    logger: Logger;
}
