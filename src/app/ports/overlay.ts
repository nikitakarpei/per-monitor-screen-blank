export interface Overlay {
    showForMonitor(monitorId: string): void;
    hideForMonitor(monitorId: string): void;
    setFadeDuration(milliseconds: number): void;
    setDimIntensityPercent(percent: number): void;
}
