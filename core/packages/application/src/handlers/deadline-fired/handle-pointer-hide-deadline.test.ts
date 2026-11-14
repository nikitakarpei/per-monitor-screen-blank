import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEADLINE_KEYS } from '@pmsb/domain';
import type { DeadlineKey } from '@pmsb/domain';
import { AppEventBus } from '../../services/app-event-bus.js';
import { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import type { SyncPointerVisibilityDeps } from '../../use-cases/sync-pointer-visibility.js';
import type { LoggerPort } from '../../util/logger.js';
import { handlePointerHideDeadline } from './handle-pointer-hide-deadline.js';

function noop(): void {
    /* no-op */
}

describe('handlePointerHideDeadline', () => {
    let logger: LoggerPort;
    let bus: AppEventBus;
    let monitorRegistry: MonitorRegistry;
    let pointerMonitorId: string;
    const setHidden = vi.fn<(hidden: boolean) => void>();
    let deps: SyncPointerVisibilityDeps;

    function fire(deadlineKey: DeadlineKey, monitorId: string): void {
        handlePointerHideDeadline(deps, {
            deadlineKey,
            monitorId,
            token: 'token',
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        bus = new AppEventBus(logger, {
            on: vi.fn(() => noop),
            onAny: vi.fn(() => noop),
        });
        monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');
        monitorRegistry.transitionState(
            'monitor-a',
            'ManualBlack',
            'test-setup',
        );
        monitorRegistry.create('monitor-b');
        monitorRegistry.transitionState(
            'monitor-b',
            'ManualBlack',
            'test-setup',
        );
        pointerMonitorId = 'monitor-a';
        deps = {
            focusedMonitorService: new FocusedMonitorService(
                {
                    getPointerPosition: () => ({
                        x: 0,
                        y: 0,
                        monitorId: pointerMonitorId,
                    }),
                },
                monitorRegistry,
            ),
            generalSettings: { getDimIntensity: () => 100 },
            pointerVisibility: { setHidden },
            logger,
        };
    });

    afterEach(() => {
        monitorRegistry.dispose();
        bus.dispose();
    });

    it('hides the pointer once it has rested on the fully black monitor', () => {
        fire(DEADLINE_KEYS.pointerHide, 'monitor-a');

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('ignores deadlines with other keys', () => {
        fire(DEADLINE_KEYS.autoBlack, 'monitor-a');

        expect(setHidden).not.toHaveBeenCalled();
    });

    it('skips and logs when the pointer has moved to another monitor', () => {
        pointerMonitorId = 'monitor-b';

        fire(DEADLINE_KEYS.pointerHide, 'monitor-a');

        expect(setHidden).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenLastCalledWith(
            expect.stringContaining('pointer left monitor'),
        );
    });
});
