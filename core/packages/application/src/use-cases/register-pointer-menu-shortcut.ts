import { MONITOR_MODES, getMonitorModeLabel } from '@pmsb/domain';
import type { LoggerPort } from '../util/logger.js';
import type {
    PointerContextMenu,
    PointerMenuShortcutManager,
} from '../ports/pointer-menu.js';
import type { ProfileSettings } from '../ports/profile-settings.js';
import type { FocusedMonitorService } from '../services/focused-monitor-service.js';

export interface RegisterPointerMenuShortcutDeps {
    readonly logger: LoggerPort;
    readonly pointerMenuShortcutManager: PointerMenuShortcutManager;
    readonly focusedMonitorService: FocusedMonitorService;
    readonly profileSettings: ProfileSettings;
    readonly pointerContextMenu: PointerContextMenu;
}

export function registerPointerMenuShortcut(
    deps: RegisterPointerMenuShortcutDeps,
    shortcut: ReadonlyArray<string>,
): void {
    const firstShortcut = shortcut[0];
    deps.logger.info(`pointer shortcut changed: ${firstShortcut}`);
    deps.pointerMenuShortcutManager.unregister();
    if (firstShortcut) {
        deps.pointerMenuShortcutManager.register(() => {
            const focused = deps.focusedMonitorService.getFocusedMonitor();
            if (!focused) {
                deps.logger.warn('no focused monitor found');
                return;
            }
            const activeProfile = deps.profileSettings.getActiveProfile();
            if (!activeProfile) {
                deps.logger.warn('no active profile found');
                return;
            }
            const currentMode = deps.profileSettings.getMonitorMode(
                activeProfile.id,
                focused.id,
            );
            const items = MONITOR_MODES.map((mode) => ({
                label:
                    getMonitorModeLabel(mode) +
                    (currentMode === mode ? ' ✓' : ''),
                onActivate: () =>
                    deps.profileSettings.setMonitorMode(
                        activeProfile.id,
                        focused.id,
                        mode,
                    ),
            }));
            deps.pointerContextMenu.open(items);
        });
    }
}
