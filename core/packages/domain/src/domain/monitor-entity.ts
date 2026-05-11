import type { MonitorState } from './monitor-state.js';

export class MonitorEntity {
    public readonly id: string;
    public state: MonitorState | undefined;

    constructor(id: string, state: MonitorState | undefined) {
        this.id = id;
        this.state = state;
    }
}
