import { type Profile, type ProfileId, type MonitorMode } from '@pmsb/domain';

/**
 * @deprecated Use GeneralSettings and ProfileSettings instead.
 */
export interface SettingsGateway {
    getIdleTimeoutSeconds(): number;
    getKeepAwakeMinutes(): number;
    shouldMonitorAutoBlackWhenFocused(): boolean;
    getProfiles(): ReadonlyArray<Readonly<Profile>>;
    getActiveProfileId(): ProfileId;
    getActiveProfile(): Readonly<Profile>;
    setActiveProfile(profileId: ProfileId): void;
    getMonitorMode(monitorId: string): MonitorMode;
    getMonitorModes(
        profileId: ProfileId,
    ): Readonly<Record<string, MonitorMode>>;
    setMonitorMode(monitorId: string, mode: MonitorMode): void;
    ensureStorage(): void;
}

export interface QuickSettings {
    syncProfiles(): void;
    visible: boolean;
}
