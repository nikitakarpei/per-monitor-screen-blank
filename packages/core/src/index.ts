export { DEADLINE_KEYS, type DeadlineKey } from './domain/deadline-keys.js';
export { MonitorEntity } from './domain/monitor-entity.js';
export { buildMonitorLabel } from './domain/monitor-identity.js';
export { getMonitorModeLabel } from './domain/monitor-mode-labels.js';
export {
    MONITOR_MODES,
    type MonitorMode,
    DEFAULT_MONITOR_MODE,
    resolveMode,
} from './domain/monitor-mode.js';
export {
    type MonitorState,
    tryTransition,
    modeToInitialState,
    resolveAutoMonitorState,
    isAutoMonitorState,
} from './domain/monitor-state.js';
export {
    type ProfileId,
    type Profile,
    type PhysicalMonitorInfo,
    type LogicalMonitorIdentity,
    type PointerPosition,
    type Deadline,
} from './domain/types.js';
