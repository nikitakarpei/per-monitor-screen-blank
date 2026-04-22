import { Profile, ProfileId } from '../../domain/types.js';
import { MonitorMode } from '../../domain/monitor-mode.js';

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
    initProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId,
    ): void;
    syncProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId,
    ): void;
    visible: boolean;
}
