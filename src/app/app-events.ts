import { MonitorState } from '../domain/monitor-state.js';

export type StateChangedEvent = {
    type: 'state-changed';
    payload: {
        monitorId: string;
        previous: MonitorState | undefined;
        current: MonitorState;
        reason: string;
    };
};

// eslint-disable-next-line sonarjs/redundant-type-aliases
export type AppEvents = StateChangedEvent;
