import Gio from 'gi://Gio';

import {
    buildMonitorIdentity,
    normalizeConnector,
} from '../../shared/util/monitor-identity.js';
import { logInfo, logWarn } from '../../shared/util/logger.js';

const BUS_NAME = 'org.gnome.Mutter.DisplayConfig';
const OBJECT_PATH = '/org/gnome/Mutter/DisplayConfig';
const INTERFACE = 'org.gnome.Mutter.DisplayConfig';

export function listDisplayConfigMonitors() {
    try {
        const result = Gio.DBus.session.call_sync(
            BUS_NAME,
            OBJECT_PATH,
            INTERFACE,
            'GetCurrentState',
            undefined,
            undefined,
            Gio.DBusCallFlags.NONE,
            -1,
        );
        const [, monitors, logicalMonitors] = result.deep_unpack();
        const primaryConnectors = _collectPrimaryConnectors(logicalMonitors);
        return monitors.map((entry) => _buildMonitor(entry, primaryConnectors));
    } catch (error) {
        logWarn(
            'failed to query Mutter display config for monitor identities',
            {
                busName: BUS_NAME,
                error: error?.message ?? String(error),
            },
        );
        return [];
    }
}

function _collectPrimaryConnectors(logicalMonitors) {
    const primaryConnectors = new Set();
    for (const logicalMonitor of logicalMonitors ?? []) {
        const isPrimary = logicalMonitor?.[4];
        const linkedMonitors = logicalMonitor?.[5];
        if (!isPrimary) {
            continue;
        }

        for (const linkedMonitor of linkedMonitors ?? []) {
            const [connector] = linkedMonitor;
            const normalizedConnector = normalizeConnector(connector);
            if (normalizedConnector) {
                primaryConnectors.add(normalizedConnector);
            }
        }
    }
    return primaryConnectors;
}

function _buildMonitor(entry, primaryConnectors) {
    const [spec, , properties] = entry ?? [];
    const [connector, vendor, product, serial] = spec ?? [];
    const connectorName = String(connector ?? '').trim();
    const monitor = connectorName
        ? {
              ...buildMonitorIdentity({ vendor, product, serial }),
              connector: connectorName,
              vendor: String(vendor ?? '').trim(),
              product: String(product ?? '').trim(),
              serial: String(serial ?? '').trim(),
              displayName: String(properties?.['display-name'] ?? '').trim(),
              isBuiltin: properties?.['is-builtin'] === true,
              isPrimary: primaryConnectors.has(
                  normalizeConnector(connectorName),
              ),
          }
        : undefined;
    if (!monitor) {
        return monitor;
    }

    if (!monitor.isStable) {
        logInfo(
            'display config monitor missing stable hardware identity; returning fallback identity',
            {
                connector: monitor.connector,
                vendor: monitor.vendor,
                product: monitor.product,
                serial: monitor.serial,
            },
        );
    }

    return monitor;
}
