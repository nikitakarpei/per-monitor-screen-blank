import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { buildMonitorIdentity } from '../../shared/util/monitor-identity.js';
import { logInfo, logWarn } from '../../shared/util/logger.js';

export class GnomeMonitorProvider {
    /**
     * Returns all currently connected monitors with hardware identity details.
     * Unstable monitors are included and marked with isStable=false.
     *
     * @returns {{ index: number, id: string, isStable: boolean, connector: string, isPrimary: boolean }[]}
     */
    listMonitors() {
        const display = globalThis.display;
        const count = typeof display?.get_n_monitors === 'function' ? display.get_n_monitors() : 0;
        const primary = typeof display?.get_primary_monitor === 'function' ? display.get_primary_monitor() : 0;
        const monitorManager = globalThis.backend?.get_monitor_manager?.() ?? Meta.MonitorManager.get?.();
        const managerMonitors = monitorManager?.get_monitors?.() ?? [];
        const monitors = [];

        for (let index = 0; index < count; index += 1) {
            const managerMonitor = managerMonitors[index];
            if (!managerMonitor) {
                logInfo('no manager monitor at display index; monitor skipped', { index, managerCount: managerMonitors.length });
                continue;
            }

            const connector = String(managerMonitor.get_connector?.() ?? '').trim();
            const runtimeSpec = buildMonitorIdentity({
                vendor: managerMonitor.get_vendor?.() ?? '',
                product: managerMonitor.get_product?.() ?? '',
                serial: managerMonitor.get_serial?.() ?? '',
            });

            if (!runtimeSpec.isStable) {
                logInfo('runtime monitor missing stable hardware identity; monitor returned unstable', {
                    index,
                    connector,
                    vendor: String(managerMonitor.get_vendor?.() ?? '').trim(),
                    product: String(managerMonitor.get_product?.() ?? '').trim(),
                    serial: String(managerMonitor.get_serial?.() ?? '').trim(),
                });
            }

            monitors.push({ index, ...runtimeSpec, connector, isPrimary: index === primary });
        }

        return monitors;
    }

    /**
     * Registers a callback to be called whenever the monitor configuration changes.
     * Returns a disconnector function.
     *
     * @param {() => void} callback
     * @returns {() => void} disconnector
     */
    onMonitorsChanged(callback) {
        const id = Main.layoutManager.connect('monitors-changed', callback);
        return () => {
            try {
                Main.layoutManager.disconnect(id);
            } catch (error) {
                logWarn('failed to disconnect monitors-changed listener', {
                    id,
                    error: error?.message ?? String(error),
                });
            }
        };
    }
}
