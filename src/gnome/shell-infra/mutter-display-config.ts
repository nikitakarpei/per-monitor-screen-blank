import { buildMonitorIdentity } from '../../serialization/monitors/monitor-identity.js';
import type { LoggerPort } from '../../util/logger.js';
import type { MonitorIdentity } from '../../domain/ports-domain.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Lists current monitors with their runtime state.
 * This is platform-level logic that bridges Mutter's runtime monitors with display config identities.
 *
 * Uses documented Mutter public APIs:
 * - MonitorManager.get_logical_monitors() to get logical monitors
 * - LogicalMonitor.get_number() returns an index compatible with Meta.Display monitor API
 *   and Main.layoutManager.monitors array
 * - LogicalMonitor.get_monitors() to get physical Meta.Monitor objects
 *
 * In mirrored setups, one logical monitor yields multiple MonitorIdentity entries
 * (one per physical monitor), all sharing the same index.
 */
export function listCurrentMonitorIdentities(
    logger: LoggerPort,
): MonitorIdentity[] {
    const monitorManager = global.backend.get_monitor_manager();
    const logicalMonitors = monitorManager.get_logical_monitors();

    if (!logicalMonitors) {
        logger.info('no logical monitors available from monitor manager');
        return [];
    }

    const layoutMonitors = Main.layoutManager.monitors;
    if (!layoutMonitors || layoutMonitors.length === 0) {
        logger.info('no monitors available from layout manager');
        return [];
    }

    const monitors: MonitorIdentity[] = [];

    // Build a map of logical monitors by their number (index compatible with layoutManager)
    const logicalMonitorByNumber = new Map<
        number,
        (typeof logicalMonitors)[number]
    >();
    for (const logicalMonitor of logicalMonitors) {
        const number = logicalMonitor.get_number();
        logicalMonitorByNumber.set(number, logicalMonitor);
    }

    // Iterate layout monitors to get indices consistent with Main.layoutManager.monitors
    for (const index of layoutMonitors.keys()) {
        const logicalMonitor = logicalMonitorByNumber.get(index);

        if (!logicalMonitor) {
            logger.warn(
                `no logical monitor found for layout monitor index ${index}; this indicates a mismatch between layoutManager and Mutter`,
            );
            continue;
        }

        const physicalMonitors = logicalMonitor.get_monitors();

        if (!physicalMonitors || physicalMonitors.length === 0) {
            logger.info(
                `logical monitor ${index} has no physical monitors; skipping`,
            );
            continue;
        }

        // For each physical monitor in this logical monitor, create a MonitorIdentity
        // All physical monitors in a mirrored setup share the same index
        for (const metaMonitor of physicalMonitors) {
            const serial = metaMonitor.get_serial().trim();
            if (!serial) {
                logger.info(
                    `monitor with connector ${metaMonitor.get_connector().trim()} has empty serial; monitor skipped`,
                );
                continue;
            }

            const connector = metaMonitor.get_connector();
            const monitorId = buildMonitorIdentity({
                vendor: metaMonitor.get_vendor(),
                product: metaMonitor.get_product(),
                serial: metaMonitor.get_serial(),
            });

            monitors.push({
                index,
                monitorId,
                connector,
                vendor: metaMonitor.get_vendor().trim(),
                product: metaMonitor.get_product().trim(),
            });
        }
    }

    return monitors;
}
