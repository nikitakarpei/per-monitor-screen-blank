import { describe, it, expect, vi } from 'vitest';
import type { LoggerPort } from '../../util/logger.js';
import { AppEventBus } from '../services/app-event-bus.js';
import { MonitorRegistry } from '../services/monitor-registry.js';
import type { PlatformEventSubscriber } from '../ports/platform-events.js';
import { disableMonitorsOnProfileInactivation } from './disable-monitors-on-profile-inactivation.js';

function createFakeLogger(): LoggerPort {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

function noop(): void {
    /* no-op */
}

function createNoOpPlatformSubscriber(): PlatformEventSubscriber {
    return {
        on: vi.fn(() => noop),
        onAny: vi.fn(() => noop),
    };
}

describe('disableMonitorsOnProfileInactivation', () => {
    it('transitions every managed monitor to disabled', () => {
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');
        monitorRegistry.create('monitor-b');
        monitorRegistry.create('monitor-c');
        monitorRegistry.transitionState('monitor-a', 'KeepAwake', 'test-setup');
        monitorRegistry.transitionState('monitor-b', 'AutoAwake', 'test-setup');
        monitorRegistry.transitionState(
            'monitor-c',
            'ManualBlack',
            'test-setup',
        );

        disableMonitorsOnProfileInactivation({ monitorRegistry, logger });

        expect(monitorRegistry.get('monitor-a').state).toBe('Disabled');
        expect(monitorRegistry.get('monitor-b').state).toBe('Disabled');
        expect(monitorRegistry.get('monitor-c').state).toBe('Disabled');

        bus.dispose();
        monitorRegistry.dispose();
    });

    it('does nothing when no monitors are managed', () => {
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);

        disableMonitorsOnProfileInactivation({ monitorRegistry, logger });

        expect(monitorRegistry.getAll()).toHaveLength(0);

        bus.dispose();
        monitorRegistry.dispose();
    });

    it('logs the inactive transition once', () => {
        const logger = createFakeLogger();
        const platformSubscriber = createNoOpPlatformSubscriber();
        const bus = new AppEventBus(logger, platformSubscriber);
        const monitorRegistry = new MonitorRegistry(logger, bus);
        monitorRegistry.create('monitor-a');
        monitorRegistry.transitionState('monitor-a', 'KeepAwake', 'test-setup');

        disableMonitorsOnProfileInactivation({ monitorRegistry, logger });

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith(
            'profile-inactivated: disabling all managed monitors',
        );

        bus.dispose();
        monitorRegistry.dispose();
    });
});
