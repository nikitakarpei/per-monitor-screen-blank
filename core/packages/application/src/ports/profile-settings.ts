import type { Profile, ProfileId, MonitorMode } from '@pmsb/domain';

export interface ProfileSettings {
    ensureDefaultProfile(): void;
    getProfiles(): Profile[];
    getActiveProfile(): Profile | null;
    setActiveProfile(id: ProfileId): void;
    deactivateProfile(): void;
    restoreLastActiveProfile(): void;
    createProfile(name: string): ProfileId;
    deleteProfile(id: ProfileId): void;
    renameProfile(id: ProfileId, name: string): void;
    getMonitorMode(profileId: ProfileId, monitorId: string): MonitorMode;
    setMonitorMode(
        profileId: ProfileId,
        monitorId: string,
        mode: MonitorMode,
    ): void;
}
