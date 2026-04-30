import Gio from 'gi://Gio';
import { type Disposable } from '@pmsb/lifecycle';
import { type GeneralSettings } from '@pmsb/application';
import { GSETTINGS_KEYS } from './gsettings-schema-keys.js';
import { gsettingsChangedSignal } from './internal/gsettings-signals.js';

export class GnomeGeneralSettings implements GeneralSettings {
    readonly #settings: Gio.Settings;

    constructor(settings: Gio.Settings) {
        this.#settings = settings;
    }

    getIdleTimeout(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.idleTimeoutSeconds);
    }

    setIdleTimeout(value: number): void {
        void this.#settings.set_int(GSETTINGS_KEYS.idleTimeoutSeconds, value);
    }

    getFadeDuration(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.fadeDurationMs);
    }

    setFadeDuration(value: number): void {
        void this.#settings.set_int(GSETTINGS_KEYS.fadeDurationMs, value);
    }

    getDimIntensity(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.dimIntensityPercent);
    }

    setDimIntensity(value: number): void {
        void this.#settings.set_int(GSETTINGS_KEYS.dimIntensityPercent, value);
    }

    getPointerMenuShortcut(): string[] {
        return this.#settings.get_strv(GSETTINGS_KEYS.pointerMenuShortcut);
    }

    setPointerMenuShortcut(value: string[]): void {
        void this.#settings.set_strv(GSETTINGS_KEYS.pointerMenuShortcut, value);
    }

    getShowQuickSettingsMenu(): boolean {
        return this.#settings.get_boolean(GSETTINGS_KEYS.showQuickSettingsMenu);
    }

    setShowQuickSettingsMenu(value: boolean): void {
        void this.#settings.set_boolean(
            GSETTINGS_KEYS.showQuickSettingsMenu,
            value,
        );
    }

    getShowIssueNotifications(): boolean {
        return this.#settings.get_boolean(
            GSETTINGS_KEYS.showIssueNotifications,
        );
    }

    setShowIssueNotifications(value: boolean): void {
        void this.#settings.set_boolean(
            GSETTINGS_KEYS.showIssueNotifications,
            value,
        );
    }

    getDisableAutoTimerOnPointerMonitor(): boolean {
        return this.#settings.get_boolean(
            GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
        );
    }

    setDisableAutoTimerOnPointerMonitor(value: boolean): void {
        void this.#settings.set_boolean(
            GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
            value,
        );
    }

    getKeepAwakeMinutes(): number {
        return this.#settings.get_int(GSETTINGS_KEYS.keepAwakeMinutes);
    }

    setKeepAwakeMinutes(value: number): void {
        void this.#settings.set_int(GSETTINGS_KEYS.keepAwakeMinutes, value);
    }

    observeIdleTimeoutSecondsChanged(
        callback: (timeoutSeconds: number) => void,
    ): Disposable {
        return this.#observeIntSetting(
            GSETTINGS_KEYS.idleTimeoutSeconds,
            () => this.getIdleTimeout(),
            callback,
        );
    }

    observeKeepAwakeMinutesChanged(
        callback: (minutes: number) => void,
    ): Disposable {
        return this.#observeIntSetting(
            GSETTINGS_KEYS.keepAwakeMinutes,
            () => this.getKeepAwakeMinutes(),
            callback,
        );
    }

    observeFadeDurationMsChanged(
        callback: (milliseconds: number) => void,
    ): Disposable {
        return this.#observeIntSetting(
            GSETTINGS_KEYS.fadeDurationMs,
            () => this.getFadeDuration(),
            callback,
        );
    }

    observeDimIntensityPercentChanged(
        callback: (percent: number) => void,
    ): Disposable {
        return this.#observeIntSetting(
            GSETTINGS_KEYS.dimIntensityPercent,
            () => this.getDimIntensity(),
            callback,
        );
    }

    observeQuickSettingsMenuVisibilityChanged(
        callback: (visible: boolean) => void,
    ): Disposable {
        return this.#observeBooleanSetting(
            GSETTINGS_KEYS.showQuickSettingsMenu,
            () => this.getShowQuickSettingsMenu(),
            callback,
        );
    }

    observePointerMonitorTimerPolicyChanged(
        callback: (shouldMonitorAutoBlackWhenFocused: boolean) => void,
    ): Disposable {
        return this.#observeBooleanSetting(
            GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
            () => !this.getDisableAutoTimerOnPointerMonitor(),
            callback,
        );
    }

    observePointerMenuShortcutChanged(
        callback: (shortcut: readonly string[]) => void,
    ): Disposable {
        return this.#observeSetting(
            GSETTINGS_KEYS.pointerMenuShortcut,
            () => this.getPointerMenuShortcut(),
            callback,
        );
    }

    observeShowIssueNotificationsChanged(
        callback: (showIssueNotifications: boolean) => void,
    ): Disposable {
        return this.#observeBooleanSetting(
            GSETTINGS_KEYS.showIssueNotifications,
            () => this.getShowIssueNotifications(),
            callback,
        );
    }

    #observeSetting<T>(
        key: (typeof GSETTINGS_KEYS)[keyof typeof GSETTINGS_KEYS],
        readCurrentValue: () => T,
        callback: (value: T) => void,
    ): Disposable {
        const connectionId = this.#settings.connect(
            gsettingsChangedSignal(key),
            () => callback(readCurrentValue()),
        );

        let disposed = false;
        return {
            dispose: (): void => {
                if (disposed) {
                    return;
                }

                disposed = true;
                this.#settings.disconnect(connectionId);
            },
        };
    }

    #observeIntSetting(
        key: (typeof GSETTINGS_KEYS)[keyof typeof GSETTINGS_KEYS],
        readCurrentValue: () => number,
        callback: (value: number) => void,
    ): Disposable {
        return this.#observeSetting(key, readCurrentValue, callback);
    }

    #observeBooleanSetting(
        key: (typeof GSETTINGS_KEYS)[keyof typeof GSETTINGS_KEYS],
        readCurrentValue: () => boolean,
        callback: (value: boolean) => void,
    ): Disposable {
        return this.#observeSetting(key, readCurrentValue, callback);
    }
}
