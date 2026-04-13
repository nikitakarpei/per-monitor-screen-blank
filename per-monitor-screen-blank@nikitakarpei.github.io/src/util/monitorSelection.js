import Meta from 'gi://Meta';

import { buildMonitorIdentity, normalizeConnector } from './monitorIdentity.js';
import { logWarn } from './logger.js';

export function listRuntimeMonitors(display) {
    const count = typeof display?.get_n_monitors === 'function' ? display.get_n_monitors() : 0;
    const primary = typeof display?.get_primary_monitor === 'function' ? display.get_primary_monitor() : 0;
    const runtimeSpecsByConnector = _listRuntimeMonitorSpecs();
    const monitors = [];

    for (let index = 0; index < count; index += 1) {
        const connector = String(display?.get_monitor_plug_name?.(index) ?? '').trim();
        const runtimeSpec = runtimeSpecsByConnector.get(normalizeConnector(connector));
        if (!runtimeSpec) {
            logWarn('runtime monitor missing stable hardware identity; monitor skipped', {
                index,
                connector,
            });
            continue;
        }

        monitors.push({
            index,
            ...runtimeSpec,
            connector,
            isPrimary: index === primary,
        });
    }

    return monitors;
}

function _listRuntimeMonitorSpecs() {
    const monitorManager = global.backend?.get_monitor_manager?.() ?? Meta.MonitorManager.get?.();
    const runtimeSpecsByConnector = new Map();

    for (const monitor of monitorManager?.get_monitors?.() ?? []) {
        const connector = String(monitor?.get_connector?.() ?? '').trim();
        if (!connector)
            continue;

        const runtimeSpec = {
            ...buildMonitorIdentity({
                vendor: monitor?.get_vendor?.() ?? '',
                product: monitor?.get_product?.() ?? '',
                serial: monitor?.get_serial?.() ?? '',
            }),
            connector,
        };
        if (!runtimeSpec.isStable) {
            logWarn('runtime monitor missing stable hardware identity; monitor skipped', {
                connector,
                vendor: String(monitor?.get_vendor?.() ?? '').trim(),
                product: String(monitor?.get_product?.() ?? '').trim(),
                serial: String(monitor?.get_serial?.() ?? '').trim(),
            });
            continue;
        }

        runtimeSpecsByConnector.set(normalizeConnector(connector), runtimeSpec);
    }

    return runtimeSpecsByConnector;
}
