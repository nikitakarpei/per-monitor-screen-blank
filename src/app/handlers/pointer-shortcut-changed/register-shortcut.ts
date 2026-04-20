import type { Logger } from '../../../util/logger.js';
import type {
    PointerContextMenu,
    PointerMenuKeybindingManager,
    PointerShortcutChangedEvent,
    SettingsGateway,
} from '../../../ports/index.js';
import { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import { MONITOR_MODES } from '../../../domain/monitor-mode.js';
import { getMonitorModeLabel } from '../../../domain/monitor-mode-labels.js';

interface RegisterShortcutDeps {
    logger: Logger;
    keybindingManager: PointerMenuKeybindingManager;
    focusedMonitorService: FocusedMonitorService;
    settingsGateway: SettingsGateway;
    pointerContextMenu: PointerContextMenu;
}

/**
 * Handles the 'pointer-shortcut-changed' event by registering a shortcut for the pointer menu.
 */
export function registerShortcut(
    deps: RegisterShortcutDeps,
    payload: PointerShortcutChangedEvent['payload'],
): void {
    const shortcut = payload.shortcut[0];
    deps.logger.info(`pointer shortcut changed: ${shortcut ?? 'none'}`);
    deps.keybindingManager.unregister();
    if (shortcut) {
        deps.keybindingManager.register(shortcut, () => {
            const focused = deps.focusedMonitorService.getFocusedMonitor();
            if (!focused) {
                deps.logger.warn('no focused monitor found');
                return;
            }
            const currentMode = deps.settingsGateway.getMonitorMode(focused.id);
            const items = MONITOR_MODES.map((mode) => ({
                label:
                    getMonitorModeLabel(mode) +
                    (currentMode === mode ? ' ✓' : ''),
                onActivate: () =>
                    deps.settingsGateway.setMonitorMode(focused.id, mode),
            }));
            deps.pointerContextMenu.open(items);
        });
    }
}
