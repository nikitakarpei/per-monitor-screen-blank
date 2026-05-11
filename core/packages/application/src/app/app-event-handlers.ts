import type { DeadlineScheduler } from './ports/scheduler.js';

import type { GeneralSettings } from './ports/general-settings.js';
import type { ProfileSettings } from './ports/profile-settings.js';
import type { QuickSettings } from './ports/quick-settings.js';
import type { Overlay } from './ports/overlay.js';
import type {
    PointerContextMenu,
    PointerMenuShortcutManager,
} from './ports/pointer-menu.js';
import type {
    MonitorIdentityStore,
    ConnectedMonitorsQuery,
} from './ports/monitors.js';

import type { AppEventBus } from './services/app-event-bus.js';
import type { MonitorRegistry } from './services/monitor-registry.js';
import type { FocusedMonitorService } from './services/focused-monitor-service.js';
import type { LoggerPort } from '../util/logger.js';
import type { ModeStateResolver } from './services/mode-state-resolver.js';

import { handleModeChange } from './handlers/monitor-mode-changed/handle-mode-change.js';
import { teardownMonitor } from './handlers/monitor-disconnected/teardown-monitor.js';
import { handleOverlaySyncStateChanged } from './handlers/state-changed/sync-overlay.js';
import { handleKeepAwakeExpiry } from './handlers/deadline-fired/handle-keep-awake-expiry.js';
import { handleAutoBlackDeadline } from './handlers/deadline-fired/handle-auto-black-deadline.js';
import { handlePointerSuppression } from './handlers/pointer-monitor-changed/handle-pointer-suppression.js';
import { wakeFromAutoBlackOnPointer } from './handlers/pointer-position-changed/wake-from-auto-black-on-pointer.js';
import { rescheduleAutoBlackDeadline } from './handlers/pointer-position-changed/reschedule-auto-black-deadline.js';
import { autoBlackDeadlineControl } from './handlers/state-changed/auto-black-deadline-control.js';
import { keepAwakeDeadlineControl } from './handlers/state-changed/keep-awake-deadline-control.js';
import { bootstrapConnectedMonitors } from './handlers/application-bootstrap-requested/bootstrap-connected-monitors.js';
import { bootstrapConnectedIdentities } from './handlers/application-bootstrap-requested/bootstrap-connected-identities.js';
import { pruneDisconnectedIdentities } from './handlers/application-bootstrap-requested/prune-disconnected-identities.js';
import { bootstrapGeneralSettings } from './handlers/application-bootstrap-requested/bootstrap-general-settings.js';
import { applyProfileModesToMonitors } from './use-cases/apply-profile-modes-to-monitors.js';
import { disableMonitorsOnProfileInactivation } from './use-cases/disable-monitors-on-profile-inactivation.js';
import { persistMonitorIdentity } from './use-cases/persist-monitor-identity.js';
import { applyIdleTimeoutToAutoAwakeMonitors } from './use-cases/apply-idle-timeout-to-auto-awake-monitors.js';
import { applyKeepAwakeDurationToKeepAwakeMonitors } from './use-cases/apply-keep-awake-duration-to-keep-awake-monitors.js';
import { applyPointerMonitorTimerPolicy } from './use-cases/apply-pointer-monitor-timer-policy.js';
import { registerPointerMenuShortcut } from './use-cases/register-pointer-menu-shortcut.js';
import { setupConnectedMonitor } from './use-cases/setup-connected-monitor.js';

interface EventHandlerDeps {
    bus: AppEventBus;
    logger: LoggerPort;
    generalSettings: GeneralSettings;
    profileSettings: ProfileSettings;
    deadlineScheduler: DeadlineScheduler;
    overlay: Overlay;
    quickSettings: QuickSettings;
    pointerContextMenu: PointerContextMenu;
    pointerMenuShortcutManager: PointerMenuShortcutManager;
    monitorRegistry: MonitorRegistry;
    focusedMonitorService: FocusedMonitorService;
    modeStateResolver: ModeStateResolver;
    monitorIdentityStore: MonitorIdentityStore;
    connectedMonitorsQuery: ConnectedMonitorsQuery;
}

export function registerAppEventHandlers(deps: EventHandlerDeps): void {
    void deps.bus.on('state-changed', (payload) =>
        handleOverlaySyncStateChanged(deps, payload),
    );
    void deps.bus.on('state-changed', (payload) =>
        autoBlackDeadlineControl(deps, payload),
    );
    void deps.bus.on('state-changed', (payload) =>
        keepAwakeDeadlineControl(deps, payload),
    );
    void deps.bus.on('pointer-monitor-changed', (payload) =>
        handlePointerSuppression(deps, payload),
    );
    void deps.bus.on('pointer-position-changed', (payload) =>
        wakeFromAutoBlackOnPointer(deps, payload),
    );
    void deps.bus.on('pointer-position-changed', (payload) =>
        rescheduleAutoBlackDeadline(deps, payload),
    );
    void deps.bus.on('deadline-fired', (payload) =>
        handleKeepAwakeExpiry(deps, payload),
    );
    void deps.bus.on('deadline-fired', (payload) =>
        handleAutoBlackDeadline(deps, payload),
    );
    void deps.bus.on('profile-switched', (payload) =>
        applyProfileModesToMonitors(deps, payload.profileId),
    );
    void deps.bus.on('profile-switched', (_payload) =>
        deps.quickSettings.syncProfiles(),
    );
    void deps.bus.on('profile-inactivated', (_payload) =>
        disableMonitorsOnProfileInactivation(deps),
    );
    void deps.bus.on('profile-inactivated', (_payload) =>
        deps.quickSettings.syncProfiles(),
    );
    void deps.bus.on('profile-ids-changed', (_payload) =>
        deps.quickSettings.syncProfiles(),
    );
    void deps.bus.on('profile-name-changed', (_payload) =>
        deps.quickSettings.syncProfiles(),
    );
    void deps.bus.on('profile-created', (payload) =>
        deps.profileSettings.setActiveProfile(payload.profileId),
    );
    void deps.bus.on('monitor-mode-changed', (payload) =>
        handleModeChange(deps, payload),
    );
    void deps.bus.on('monitor-connected', (payload) =>
        setupConnectedMonitor(deps, payload.monitorId),
    );
    void deps.bus.on('monitor-connected', (payload) =>
        persistMonitorIdentity(deps, payload),
    );
    void deps.bus.on('monitor-disconnected', (payload) =>
        teardownMonitor(deps, payload),
    );

    // scalar setting handlers
    void deps.bus.on('idle-timeout-changed', (payload) =>
        applyIdleTimeoutToAutoAwakeMonitors(deps, payload.timeoutSeconds),
    );
    void deps.bus.on('keep-awake-duration-changed', (payload) =>
        applyKeepAwakeDurationToKeepAwakeMonitors(deps, payload.minutes),
    );
    void deps.bus.on('fade-duration-changed', (payload) =>
        deps.overlay.setFadeDuration(payload.milliseconds),
    );
    void deps.bus.on('dim-intensity-changed', (payload) =>
        deps.overlay.setDimIntensityPercent(payload.percent),
    );
    void deps.bus.on(
        'quick-settings-menu-visibility-changed',
        (payload) => (deps.quickSettings.visible = payload.visible),
    );
    void deps.bus.on('pointer-monitor-timer-policy-changed', (payload) =>
        applyPointerMonitorTimerPolicy(
            deps,
            payload.shouldMonitorAutoBlackWhenFocused,
        ),
    );
    void deps.bus.on('pointer-shortcut-changed', (payload) =>
        registerPointerMenuShortcut(deps, payload.shortcut),
    );

    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        deps.profileSettings.ensureDefaultProfile(),
    );
    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        bootstrapConnectedMonitors(deps, _payload),
    );
    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        bootstrapConnectedIdentities(deps, _payload),
    );
    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        pruneDisconnectedIdentities(deps, _payload),
    );
    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        deps.quickSettings.syncProfiles(),
    );
    void deps.bus.on('application-bootstrap-requested', (_payload) =>
        bootstrapGeneralSettings(deps, _payload),
    );
}
