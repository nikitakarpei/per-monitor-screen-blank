import { DeadlineScheduler } from './ports/scheduler.js';

import { SettingsGateway, QuickSettings } from './ports/settings.js';
import { Overlay } from './ports/overlay.js';
import {
    PointerContextMenu,
    PointerMenuShortcutManager,
} from './ports/pointer-menu.js';
import { MonitorIdentityStore } from './ports/monitors.js';

import { AppEventBus } from './services/app-event-bus.js';
import { MonitorRegistry } from './services/monitor-registry.js';
import { FocusedMonitorService } from './services/focused-monitor-service.js';
import { type LoggerPort } from '../util/logger.js';
import { ModeStateResolver } from './services/mode-state-resolver.js';

import { applyModeTransitions } from './handlers/profile-switched/apply-mode-transitions.js';
import { syncProfiles as syncProfilesOnIdsChanged } from './handlers/profile-ids-changed/sync-profiles.js';
import { syncProfiles as syncProfilesOnNameChanged } from './handlers/profile-name-changed/sync-profiles.js';
import { handleModeChange } from './handlers/monitor-mode-changed/handle-mode-change.js';
import { setupMonitor } from './handlers/monitor-connected/setup-monitor.js';
import { persistMonitorIdentity } from './handlers/monitor-connected/persist-monitor-identity.js';
import { teardownMonitor } from './handlers/monitor-disconnected/teardown-monitor.js';
import { removeMonitorIdentity } from './handlers/monitor-disconnected/remove-monitor-identity.js';
import { cleanupOverlay } from './handlers/monitor-disconnected/cleanup-overlay.js';
import { rescheduleAutoBlackDeadlines } from './handlers/idle-timeout-changed/reschedule-auto-black-deadlines.js';
import { rescheduleKeepAwakeDeadlines } from './handlers/keep-awake-duration-changed/reschedule-keep-awake-deadlines.js';
import { updateOverlayFadeDuration } from './handlers/fade-duration-changed/update-overlay-fade-duration.js';
import { updateOverlayDimIntensity } from './handlers/dim-intensity-changed/update-overlay-dim-intensity.js';
import { updateIndicator } from './handlers/indicator-visibility-changed/update-indicator.js';
import { transitionFocusedMonitorState } from './handlers/pointer-monitor-timer-policy-changed/transition-focused-monitor-state.js';
import { registerShortcut } from './handlers/pointer-shortcut-changed/register-shortcut.js';
import { handleOverlaySyncStateChanged } from './handlers/state-changed/sync-overlay.js';
import { handleKeepAwakeExpiry } from './handlers/deadline-fired/handle-keep-awake-expiry.js';
import { handleAutoBlackDeadline } from './handlers/deadline-fired/handle-auto-black-deadline.js';
import { handlePointerSuppression } from './handlers/pointer-monitor-changed/handle-pointer-suppression.js';
import { wakeFromAutoBlackOnPointer } from './handlers/pointer-position-changed/wake-from-auto-black-on-pointer.js';
import { rescheduleAutoBlackDeadline } from './handlers/pointer-position-changed/reschedule-auto-black-deadline.js';
import { syncQuickSettings } from './handlers/profile-switched/sync-quick-settings.js';
import { autoBlackDeadlineControl } from './handlers/state-changed/auto-black-deadline-control.js';
import { setActiveProfile } from './handlers/profile-created/set-active-profile.js';
import { keepAwakeDeadlineControl } from './handlers/state-changed/keep-awake-deadline-control.js';

interface EventHandlerDeps {
    bus: AppEventBus;
    logger: LoggerPort;
    settingsGateway: SettingsGateway;
    deadlineScheduler: DeadlineScheduler;
    overlay: Overlay;
    indicatorControls: QuickSettings;
    pointerContextMenu: PointerContextMenu;
    pointerMenuShortcutManager: PointerMenuShortcutManager;
    monitorRegistry: MonitorRegistry;
    focusedMonitorService: FocusedMonitorService;
    modeStateResolver: ModeStateResolver;
    identityStore: MonitorIdentityStore;
}

export function registerAppEventHandlers(deps: EventHandlerDeps): void {
    void deps.bus.on('state-changed', (payload) =>
        handleOverlaySyncStateChanged(
            {
                overlay: deps.overlay,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('state-changed', (payload) =>
        autoBlackDeadlineControl(
            {
                deadlineScheduler: deps.deadlineScheduler,
                settingsGateway: deps.settingsGateway,
                focusedMonitorService: deps.focusedMonitorService,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('state-changed', (payload) =>
        keepAwakeDeadlineControl(
            {
                deadlineScheduler: deps.deadlineScheduler,
                settingsGateway: deps.settingsGateway,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('pointer-monitor-changed', (payload) =>
        handlePointerSuppression(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
                settingsGateway: deps.settingsGateway,
            },
            payload,
        ),
    );
    void deps.bus.on('pointer-position-changed', (payload) =>
        wakeFromAutoBlackOnPointer(
            {
                monitorRegistry: deps.monitorRegistry,
                settingsGateway: deps.settingsGateway,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('pointer-position-changed', (payload) =>
        rescheduleAutoBlackDeadline(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                settingsGateway: deps.settingsGateway,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('deadline-fired', (payload) =>
        handleKeepAwakeExpiry(
            {
                settingsGateway: deps.settingsGateway,
                monitorRegistry: deps.monitorRegistry,
                logger: deps.logger,
                deadlineScheduler: deps.deadlineScheduler,
                bus: deps.bus,
            },
            payload,
        ),
    );
    void deps.bus.on('deadline-fired', (payload) =>
        handleAutoBlackDeadline(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
                bus: deps.bus,
            },
            payload,
        ),
    );
    // profile-switched handler
    void deps.bus.on('profile-switched', (payload) =>
        applyModeTransitions(
            {
                logger: deps.logger,
                gateway: deps.settingsGateway,
                monitorRegistry: deps.monitorRegistry,
                modeStateResolver: deps.modeStateResolver,
            },
            payload,
        ),
    );
    // profile-switched handler
    void deps.bus.on('profile-switched', (payload) =>
        syncQuickSettings(
            {
                quickSettings: deps.indicatorControls,
                gateway: deps.settingsGateway,
            },
            payload,
        ),
    );
    // profile-ids-changed handler
    void deps.bus.on('profile-ids-changed', (_payload) =>
        syncProfilesOnIdsChanged(undefined, {
            quickSettings: deps.indicatorControls,
            gateway: deps.settingsGateway,
        }),
    );
    // profile-name-changed handler
    void deps.bus.on('profile-name-changed', (payload) =>
        syncProfilesOnNameChanged(payload, {
            quickSettings: deps.indicatorControls,
            gateway: deps.settingsGateway,
        }),
    );
    // profile-created handler - auto-activates newly created profiles
    void deps.bus.on('profile-created', (payload) => {
        setActiveProfile(
            {
                settingsGateway: deps.settingsGateway,
            },
            payload,
        );
    });
    // monitor-mode-changed handler
    void deps.bus.on('monitor-mode-changed', (payload) =>
        handleModeChange(
            {
                gateway: deps.settingsGateway,
                monitorRegistry: deps.monitorRegistry,
                quickSettings: deps.indicatorControls,
                logger: deps.logger,
                modeStateResolver: deps.modeStateResolver,
            },
            payload,
        ),
    );
    // monitor-connected handlers
    void deps.bus.on('monitor-connected', (payload) =>
        setupMonitor(
            {
                monitorRegistry: deps.monitorRegistry,
                logger: deps.logger,
                settingsGateway: deps.settingsGateway,
                modeStateResolver: deps.modeStateResolver,
            },
            payload,
        ),
    );
    void deps.bus.on('monitor-connected', (payload) =>
        persistMonitorIdentity(
            {
                identityStore: deps.identityStore,
                logger: deps.logger,
            },
            payload,
        ),
    );
    // monitor-disconnected handlers
    void deps.bus.on('monitor-disconnected', (payload) =>
        teardownMonitor(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('monitor-disconnected', (payload) =>
        removeMonitorIdentity(
            {
                identityStore: deps.identityStore,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('monitor-disconnected', (payload) =>
        cleanupOverlay(
            {
                overlay: deps.overlay,
                logger: deps.logger,
            },
            payload,
        ),
    );

    // scalar setting handlers
    void deps.bus.on('idle-timeout-changed', (payload) =>
        rescheduleAutoBlackDeadlines(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('keep-awake-duration-changed', (payload) =>
        rescheduleKeepAwakeDeadlines(
            {
                monitorRegistry: deps.monitorRegistry,
                deadlineScheduler: deps.deadlineScheduler,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('fade-duration-changed', (payload) =>
        updateOverlayFadeDuration({ overlay: deps.overlay }, payload),
    );
    void deps.bus.on('dim-intensity-changed', (payload) =>
        updateOverlayDimIntensity({ overlay: deps.overlay }, payload),
    );
    void deps.bus.on('quick-settings-menu-visibility-changed', (payload) =>
        updateIndicator(
            {
                indicatorControls: deps.indicatorControls,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('pointer-monitor-timer-policy-changed', (payload) =>
        transitionFocusedMonitorState(
            {
                focusedMonitorService: deps.focusedMonitorService,
                monitorRegistry: deps.monitorRegistry,
                logger: deps.logger,
            },
            payload,
        ),
    );
    void deps.bus.on('pointer-shortcut-changed', (payload) =>
        registerShortcut(
            {
                logger: deps.logger,
                shortcutManager: deps.pointerMenuShortcutManager,
                focusedMonitorService: deps.focusedMonitorService,
                settingsGateway: deps.settingsGateway,
                pointerContextMenu: deps.pointerContextMenu,
            },
            payload,
        ),
    );
}
