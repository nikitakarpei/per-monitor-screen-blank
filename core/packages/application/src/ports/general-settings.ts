export interface GeneralSettings {
    getIdleTimeout(): number;
    setIdleTimeout(value: number): void;
    getFadeDuration(): number;
    setFadeDuration(value: number): void;
    getDimIntensity(): number;
    setDimIntensity(value: number): void;
    getPointerMenuShortcut(): string[];
    setPointerMenuShortcut(value: string[]): void;
    getShowQuickSettingsMenu(): boolean;
    setShowQuickSettingsMenu(value: boolean): void;
    getShowIssueNotifications(): boolean;
    setShowIssueNotifications(value: boolean): void;
    getDisableAutoTimerOnPointerMonitor(): boolean;
    setDisableAutoTimerOnPointerMonitor(value: boolean): void;
    getKeepAwakeMinutes(): number;
    setKeepAwakeMinutes(value: number): void;
    getDisableWindowObstructionPolicy(): boolean;
    setDisableWindowObstructionPolicy(value: boolean): void;
}
