import {
    applyIdleTimeoutToAutoAwakeMonitors,
    type ApplyIdleTimeoutToAutoAwakeMonitorsDeps,
} from '../../use-cases/apply-idle-timeout-to-auto-awake-monitors.js';
import {
    applyKeepAwakeDurationToKeepAwakeMonitors,
    type ApplyKeepAwakeDurationToKeepAwakeMonitorsDeps,
} from '../../use-cases/apply-keep-awake-duration-to-keep-awake-monitors.js';
import {
    applyPointerMonitorTimerPolicy,
    type ApplyPointerMonitorTimerPolicyDeps,
} from '../../use-cases/apply-pointer-monitor-timer-policy.js';
import {
    registerPointerMenuShortcut,
    type RegisterPointerMenuShortcutDeps,
} from '../../use-cases/register-pointer-menu-shortcut.js';
import { type GeneralSettings } from '../../ports/general-settings.js';
import { type Overlay } from '../../ports/overlay.js';
import { type QuickSettings } from '../../ports/quick-settings.js';

interface BootstrapGeneralSettingsDeps
    extends
        ApplyIdleTimeoutToAutoAwakeMonitorsDeps,
        ApplyKeepAwakeDurationToKeepAwakeMonitorsDeps,
        ApplyPointerMonitorTimerPolicyDeps,
        RegisterPointerMenuShortcutDeps {
    readonly generalSettings: GeneralSettings;
    readonly overlay: Overlay;
    readonly quickSettings: QuickSettings;
}

/**
 * Bootstraps general settings on application startup.
 * Reads current settings from the general settings port and applies each
 * using the corresponding use cases.
 */
export function bootstrapGeneralSettings(
    deps: BootstrapGeneralSettingsDeps,
    _payload: Record<string, never>,
): void {
    applyIdleTimeoutToAutoAwakeMonitors(
        deps,
        deps.generalSettings.getIdleTimeout(),
    );

    applyKeepAwakeDurationToKeepAwakeMonitors(
        deps,
        deps.generalSettings.getKeepAwakeMinutes(),
    );

    deps.overlay.setFadeDuration(deps.generalSettings.getFadeDuration());

    deps.overlay.setDimIntensityPercent(deps.generalSettings.getDimIntensity());

    deps.quickSettings.visible =
        deps.generalSettings.getShowQuickSettingsMenu();

    applyPointerMonitorTimerPolicy(
        deps,
        !deps.generalSettings.getDisableAutoTimerOnPointerMonitor(),
    );

    registerPointerMenuShortcut(
        deps,
        deps.generalSettings.getPointerMenuShortcut(),
    );
}
