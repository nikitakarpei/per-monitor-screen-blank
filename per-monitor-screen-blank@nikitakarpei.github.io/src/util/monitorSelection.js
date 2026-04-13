import { buildMonitorIdentity } from './monitorIdentity.js';

export function listRuntimeMonitors(display) {
    const count = typeof display?.get_n_monitors === 'function' ? display.get_n_monitors() : 0;
    const primary = typeof display?.get_primary_monitor === 'function' ? display.get_primary_monitor() : 0;
    const monitors = [];
    for (let index = 0; index < count; index += 1) {
        const connector = display?.get_monitor_plug_name?.(index) ?? '';
        monitors.push({
            index,
            ...buildMonitorIdentity({ index, connector }),
            connector,
            isPrimary: index === primary,
        });
    }
    return monitors;
}
