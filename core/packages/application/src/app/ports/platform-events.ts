import type {
    ProfileId,
    Deadline,
    LogicalMonitorIdentity,
    MonitorMode,
} from '@pmsb/domain';

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

type WindowObstructionPolicyChangedEvent = {
    type: 'window-obstruction-policy-changed';
    payload: { disabled: boolean };
};

export type PointerShortcutChangedEvent = {
    type: 'pointer-shortcut-changed';
    payload: { shortcut: string[] };
};

type ShowIssueNotificationsChangedEvent = {
    type: 'show-issue-notifications-changed';
    payload: { showIssueNotifications: boolean };
};

export type MonitorConnectedEvent = {
    type: 'monitor-connected';
    payload: LogicalMonitorIdentity;
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

type OverlayShownEvent = {
    type: 'overlay-shown';
    payload: { monitorId: string; monitorIndex: number };
};

type OverlayHiddenEvent = {
    type: 'overlay-hidden';
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

type KnownMonitorsChangedEvent = {
    type: 'known-monitors-changed';
    payload: Record<string, never>;
};

type ApplicationBootstrapRequestedEvent = {
    type: 'application-bootstrap-requested';
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
    | WindowObstructionPolicyChangedEvent
    | PointerShortcutChangedEvent
    | ShowIssueNotificationsChangedEvent
    | MonitorConnectedEvent
    | MonitorDisconnectedEvent
    | PointerMonitorChangedEvent
    | PointerPositionChangedEvent
    | OverlayShownEvent
    | OverlayHiddenEvent
    | DeadlineFiredEvent
    | KnownMonitorsChangedEvent
    | ApplicationBootstrapRequestedEvent;

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
