import type Meta from 'gi://Meta';
import type { ConnectedMonitorsQuery } from '@pmsb/application';
import { buildLogicalMonitorIdentity } from '@pmsb/domain';
import type { LogicalMonitorIdentity, PhysicalMonitorInfo } from '@pmsb/domain';

export class GnomeMonitorQuery implements ConnectedMonitorsQuery {
    listConnectedMonitors(): readonly LogicalMonitorIdentity[] {
        return this.#listCurrentMonitorIdentities();
    }

    #listCurrentMonitorIdentities(): LogicalMonitorIdentity[] {
        const logicalMonitors = this.#getLogicalMonitors();
        if (!logicalMonitors) return [];

        return logicalMonitors.map((logical) =>
            this.#toLogicalMonitorIdentity(logical),
        );
    }

    #getLogicalMonitors() {
        const logicalMonitors = global.backend
            .get_monitor_manager()
            .get_logical_monitors();

        return logicalMonitors;
    }

    #toLogicalMonitorIdentity(
        logical: Meta.LogicalMonitor,
    ): LogicalMonitorIdentity {
        const index = logical.get_number();
        const physicalMonitors = this.#buildPhysicalMonitorInfo(
            logical.get_monitors(),
        );
        const connectors = physicalMonitors.map((p) => p.connector);
        const monitorId = buildLogicalMonitorIdentity(connectors);

        return { index, monitorId, physicalMonitors };
    }

    #buildPhysicalMonitorInfo(monitors: Meta.Monitor[]): PhysicalMonitorInfo[] {
        return monitors
            .toSorted((a, b) =>
                a.get_connector().localeCompare(b.get_connector()),
            )
            .map((m) => ({
                connector: m.get_connector(),
                vendor: m.get_vendor(),
                product: m.get_product(),
            }));
    }
}
