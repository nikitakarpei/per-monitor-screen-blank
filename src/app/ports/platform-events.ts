import {
    ProfileId,
    Deadline,
    PhysicalMonitorInfo,
} from '../../domain/types.js';
import { MonitorMode } from '../../domain/monitor-mode.js';

export type ProfileIdsChangedEvent = {
    type: 'profile-ids-changed';
    payload: Record<string, never>;
};

export type ProfileSwitchedEvent = {
    type: 'profile-switched';
    payload: { profileId: ProfileId };
};

export type ProfileNameChangedEvent = {
    type: 'profile-name-changed';
    payload: { profileId: ProfileId; name: string };
};

export type MonitorModeChangedEvent = {
    type: 'monitor-mode-changed';
    payload: { profileId: ProfileId; monitorId: string; mode: MonitorMode };
};

export type IdleTimeoutChangedEvent = {
    type: 'idle-timeout-changed';
    payload: { timeoutSeconds: number };
};

export type KeepAwakeDurationChangedEvent = {
    type: 'keep-awake-duration-changed';
    payload: { minutes: number };
};

export type FadeDurationChangedEvent = {
    type: 'fade-duration-changed';
    payload: { milliseconds: number };
};

export type DimIntensityChangedEvent = {
    type: 'dim-intensity-changed';
    payload: { percent: number };
};

export type IndicatorVisibilityChangedEvent = {
    type: 'quick-settings-menu-visibility-changed';
    payload: { visible: boolean };
};

export type PointerMonitorTimerPolicyChangedEvent = {
    type: 'pointer-monitor-timer-policy-changed';
    payload: { shouldMonitorAutoBlackWhenFocused: boolean };
};

export type PointerShortcutChangedEvent = {
    type: 'pointer-shortcut-changed';
    payload: { shortcut: string[] };
};

export type MonitorConnectedEvent = {
    type: 'monitor-connected';
    payload: {
        monitorId: string;
        physicalMonitors: readonly PhysicalMonitorInfo[];
    };
};

export type MonitorDisconnectedEvent = {
    type: 'monitor-disconnected';
    payload: { monitorId: string };
};

export type PointerMonitorChangedEvent = {
    type: 'pointer-monitor-changed';
    payload: { monitorId: string; previousMonitorId: string | undefined };
};

export type PointerPositionChangedEvent = {
    type: 'pointer-position-changed';
    payload: { monitorId: string };
};

export type DeadlineFiredEvent = {
    type: 'deadline-fired';
    payload: Deadline;
};

export type ProfileCreatedEvent = {
    type: 'profile-created';
    payload: { profileId: ProfileId };
};

export type MonitorsGeometryChangedEvent = {
    type: 'monitors-geometry-changed';
    payload: Record<string, never>;
};

export type PlatformEvent =
    | ProfileIdsChangedEvent
    | ProfileSwitchedEvent
    | ProfileNameChangedEvent
    | ProfileCreatedEvent
    | MonitorModeChangedEvent
    | IdleTimeoutChangedEvent
    | KeepAwakeDurationChangedEvent
    | FadeDurationChangedEvent
    | DimIntensityChangedEvent
    | IndicatorVisibilityChangedEvent
    | PointerMonitorTimerPolicyChangedEvent
    | PointerShortcutChangedEvent
    | MonitorConnectedEvent
    | MonitorDisconnectedEvent
    | PointerMonitorChangedEvent
    | PointerPositionChangedEvent
    | DeadlineFiredEvent
    | MonitorsGeometryChangedEvent;

export interface PlatformEventEmitter {
    emit(event: PlatformEvent): void;
}

export interface PlatformEventSubscriber {
    on<K extends PlatformEvent['type']>(
        eventType: K,
        callback: (
            payload: Extract<PlatformEvent, { type: K }>['payload'],
        ) => void,
    ): () => void;
    onAny(callback: (event: PlatformEvent) => void): () => void;
}
