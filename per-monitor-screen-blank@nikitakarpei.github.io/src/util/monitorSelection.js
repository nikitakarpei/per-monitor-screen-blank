import Meta from 'gi://Meta';

import { buildMonitorIdentity } from './monitorIdentity.js';
import { logInfo } from './logger.js';

export function listRuntimeMonitors(display) {
    const count = typeof display?.get_n_monitors === 'function' ? display.get_n_monitors() : 0;
    const primary = typeof display?.get_primary_monitor === 'function' ? display.get_primary_monitor() : 0;
    const monitorManager = global.backend?.get_monitor_manager?.() ?? Meta.MonitorManager.get?.();
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
            logInfo('runtime monitor missing stable hardware identity; monitor skipped', {
                index,
                connector,
                vendor: String(managerMonitor.get_vendor?.() ?? '').trim(),
                product: String(managerMonitor.get_product?.() ?? '').trim(),
                serial: String(managerMonitor.get_serial?.() ?? '').trim(),
            });
            continue;
        }

        monitors.push({ index, ...runtimeSpec, connector, isPrimary: index === primary });
    }

    return monitors;
}
