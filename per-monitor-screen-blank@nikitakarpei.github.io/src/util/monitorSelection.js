import { monitorIdFromIndex } from './monitorIdentity.js';

export function listRuntimeMonitors(display) {
    const count = typeof display?.get_n_monitors === 'function' ? display.get_n_monitors() : 0;
    const primary = typeof display?.get_primary_monitor === 'function' ? display.get_primary_monitor() : 0;
    const monitors = [];
    for (let index = 0; index < count; index += 1) {
        const geometry = display?.get_monitor_geometry?.(index);
        const connector = display?.get_monitor_plug_name?.(index) ?? '';
        const width = geometry?.width ?? 0;
        const height = geometry?.height ?? 0;
        const id = monitorIdFromIndex(index);
        monitors.push({
            index,
            id,
            connector,
            width,
            height,
            isPrimary: index === primary,
        });
    }
    return monitors;
}
