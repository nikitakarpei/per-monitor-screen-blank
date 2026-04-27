import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import {
    type PlatformEventEmitter,
    type PointerSource,
} from '@pmsb/application';
import { GjsLogger } from '@pmsb/infrastructure-gnome';
import { GnomeMonitorIndex } from './gnome-monitor-index.js';
import { type PointerPosition } from '@pmsb/domain';

export class GnomePointerSource implements PointerSource {
    readonly #pointerWatcher = PointerWatcher.getPointerWatcher();
    readonly #indexResolver: GnomeMonitorIndex;
    readonly #emitter: PlatformEventEmitter;
    readonly #logger: GjsLogger;
    #watch?: PointerWatcher.PointerWatch;
    #lastMonitorIndex?: number;
    #lastX?: number;
    #lastY?: number;

    constructor(options: {
        logger: GjsLogger;
        eventEmitter: PlatformEventEmitter;
        indexResolver: GnomeMonitorIndex;
    }) {
        this.#emitter = options.eventEmitter;
        this.#logger = options.logger;
        this.#indexResolver = options.indexResolver;
    }

    start(): void {
        if (this.#watch) {
            this.#logger.warn('pointer watcher already started');
            return;
        }

        try {
            this.#watch = this.#pointerWatcher.addWatch(
                100,
                (x: number, y: number) => {
                    try {
                        this._handlePointerSample(x, y);
                    } catch (error) {
                        this.#logger.error(
                            `failed to handle pointer sample: ${String(error)}`,
                        );
                    }
                },
            );
        } catch (error) {
            this.#logger.error('failed to start shell pointer watcher');
            throw error;
        }
    }

    stop(): void {
        try {
            this.#watch?.remove();
        } catch {
            this.#logger.warn('failed to stop shell pointer watcher');
        } finally {
            this.#watch = undefined;
            this.#lastMonitorIndex = undefined;
            this.#lastX = undefined;
            this.#lastY = undefined;
        }
    }

    getPointerPosition(): PointerPosition {
        let [x, y] = global.get_pointer();
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            x = 0;
            y = 0;
        }

        const monitorIndex = global.display.get_current_monitor();
        const monitorId = this.#indexResolver.getMonitorIdByIndex(monitorIndex);

        return { x, y, monitorId };
    }

    private _handlePointerSample(x: number, y: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            [x, y] = global.get_pointer();
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            this.#logger.warn(
                'both pointer watcher and global.get_pointer returned invalid coordinates',
            );
            return;
        }

        const previousMonitorIndex = this.#lastMonitorIndex;
        const monitorIndex = global.display.get_current_monitor();
        const monitorChanged = previousMonitorIndex !== monitorIndex;
        const pointerMoved =
            monitorChanged || x !== this.#lastX || y !== this.#lastY;
        const initialized =
            this.#lastX !== undefined &&
            this.#lastY !== undefined &&
            previousMonitorIndex !== undefined;

        this.#lastX = x;
        this.#lastY = y;
        this.#lastMonitorIndex = monitorIndex;

        if (!initialized) return;

        if (!pointerMoved && !monitorChanged) return;

        const monitorId = this.#indexResolver.getMonitorIdByIndex(monitorIndex);

        if (monitorChanged) {
            const previousMonitorId =
                this.#indexResolver.tryGetMonitorIdByIndex(
                    previousMonitorIndex,
                );
            // This might happen if the monitor was disconnected
            if (!previousMonitorId) {
                return;
            }

            this.#emitter.emit({
                type: 'pointer-position-changed',
                payload: {
                    monitorId: previousMonitorId,
                },
            });

            this.#emitter.emit({
                type: 'pointer-monitor-changed',
                payload: {
                    monitorId,
                    previousMonitorId,
                },
            });
        }

        if (pointerMoved) {
            this.#emitter.emit({
                type: 'pointer-position-changed',
                payload: {
                    monitorId,
                },
            });
        }
    }
}
