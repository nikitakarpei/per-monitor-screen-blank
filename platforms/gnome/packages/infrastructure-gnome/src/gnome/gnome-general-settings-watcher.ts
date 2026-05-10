import {
    type Disposable,
    type DisposableStore,
    createDisposableStore,
} from '@pmsb/lifecycle';
import { type LoggerPort, type PlatformEventEmitter } from '@pmsb/application';
import { GnomeGeneralSettings } from './gnome-general-settings.js';

export class GnomeGeneralSettingsWatcher implements Disposable {
    readonly #settings: GnomeGeneralSettings;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #logger: LoggerPort;
    readonly #observationStore: DisposableStore;
    #destroyed = false;

    constructor(
        settings: GnomeGeneralSettings,
        eventEmitter: PlatformEventEmitter,
        logger: LoggerPort,
    ) {
        this.#settings = settings;
        this.#eventEmitter = eventEmitter;
        this.#logger = logger;
        this.#observationStore = createDisposableStore((error) => {
            this.#logger.error(
                `Failed to dispose resource in GnomeGeneralSettingsWatcher observation store`,
                error,
            );
        });

        this.#wireSettingsSignals();
    }

    dispose(): void {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#observationStore.dispose();
    }

    #wireSettingsSignals(): void {
        void this.#observationStore.add(
            this.#settings.observeIdleTimeoutSecondsChanged(
                (timeoutSeconds) => {
                    this.#eventEmitter.emit({
                        type: 'idle-timeout-changed',
                        payload: { timeoutSeconds },
                    });
                },
            ),
        );
        void this.#observationStore.add(
            this.#settings.observeKeepAwakeMinutesChanged((minutes) => {
                this.#eventEmitter.emit({
                    type: 'keep-awake-duration-changed',
                    payload: { minutes },
                });
            }),
        );
        void this.#observationStore.add(
            this.#settings.observeFadeDurationMsChanged((milliseconds) => {
                this.#eventEmitter.emit({
                    type: 'fade-duration-changed',
                    payload: { milliseconds },
                });
            }),
        );
        void this.#observationStore.add(
            this.#settings.observeDimIntensityPercentChanged((percent) => {
                this.#eventEmitter.emit({
                    type: 'dim-intensity-changed',
                    payload: { percent },
                });
            }),
        );
        void this.#observationStore.add(
            this.#settings.observeQuickSettingsMenuVisibilityChanged(
                (visible) => {
                    this.#eventEmitter.emit({
                        type: 'quick-settings-menu-visibility-changed',
                        payload: { visible },
                    });
                },
            ),
        );
        void this.#observationStore.add(
            this.#settings.observePointerMonitorTimerPolicyChanged(
                (shouldMonitorAutoBlackWhenFocused) => {
                    this.#eventEmitter.emit({
                        type: 'pointer-monitor-timer-policy-changed',
                        payload: { shouldMonitorAutoBlackWhenFocused },
                    });
                },
            ),
        );
        void this.#observationStore.add(
            this.#settings.observePointerMenuShortcutChanged((shortcut) => {
                this.#eventEmitter.emit({
                    type: 'pointer-shortcut-changed',
                    payload: { shortcut: [...shortcut] },
                });
            }),
        );
        void this.#observationStore.add(
            this.#settings.observeShowIssueNotificationsChanged(
                (showIssueNotifications) => {
                    this.#eventEmitter.emit({
                        type: 'show-issue-notifications-changed',
                        payload: { showIssueNotifications },
                    });
                },
            ),
        );
        void this.#observationStore.add(
            this.#settings.observeDisableWindowObstructionPolicyChanged(
                (disabled) => {
                    this.#eventEmitter.emit({
                        type: 'window-obstruction-policy-changed',
                        payload: { disabled },
                    });
                },
            ),
        );
    }
}
