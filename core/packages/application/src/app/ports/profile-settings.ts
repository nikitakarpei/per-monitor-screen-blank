import { type Profile, type ProfileId, type MonitorMode } from '@pmsb/domain';

export interface ProfileSettings {
    ensureDefaultProfile(): void;
    getProfiles(): Profile[];
    getActiveProfile(): Profile | null;
    setActiveProfile(id: ProfileId): void;
    createProfile(name: string): ProfileId;
    deleteProfile(id: ProfileId): void;
    renameProfile(id: ProfileId, name: string): void;
    duplicateProfile(id: ProfileId): ProfileId;
    getMonitorMode(profileId: ProfileId, monitorId: string): MonitorMode;
    setMonitorMode(
        profileId: ProfileId,
        monitorId: string,
        mode: MonitorMode,
    ): void;
}
