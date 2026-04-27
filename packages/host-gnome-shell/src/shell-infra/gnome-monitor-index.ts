export interface GnomeMonitorIndex {
    getMonitorIdByIndex(index: number): string;
    tryGetMonitorIdByIndex(index: number): string | undefined;
    getIndexByMonitorId(id: string): number;
    tryGetIndexByMonitorId(id: string): number | undefined;
}
