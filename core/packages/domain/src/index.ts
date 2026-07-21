export { DEADLINE_KEYS, type DeadlineKey } from './deadline-keys.js';
export { MonitorEntity } from './monitor-entity.js';
export { buildMonitorLabel } from './monitor-identity.js';
export { getMonitorModeLabel } from './monitor-mode-labels.js';
export {
    MONITOR_MODES,
    type MonitorMode,
    DEFAULT_MONITOR_MODE,
    resolveMode,
} from './monitor-mode.js';
export {
    type MonitorState,
    tryTransition,
    modeToInitialState,
    resolveAutoMonitorState,
    isAutoMonitorState,
} from './monitor-state.js';
export {
    type ProfileId,
    type Profile,
    type PhysicalMonitorInfo,
    type LogicalMonitorIdentity,
    type PointerPosition,
    type Deadline,
    type KnownMonitorEntry,
} from './types.js';
export {
    normalizeDimIntensityPercent,
    dimIntensityPercentToOpacity,
} from './dim-intensity.js';
export { normalizeFadeDurationMs } from './fade-duration.js';
export { buildLogicalMonitorIdentity } from './monitor-identity-utilities.js';
export {
    buildIssueNotificationText,
    type IssueNotificationText,
} from './issue-notification.js';
