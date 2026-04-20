import GObject from 'gi://GObject';
import { Logger } from '../../util/logger.js';

const logger = new Logger('gobject-helpers');

// Tracks which targets each holder has connected to, enabling bulk disconnect
const holderTargets = new WeakMap<object, Set<object>>();
// Tracks handler IDs per (holder, target) — prefs fallback only (connectObject unavailable)
const signalTracker = new WeakMap<object, Map<object, number[]>>();

// Structural type — any object accepted; GJS ensures runtime compatibility
export interface SignalTarget {}

function registerHolderTarget(holder: object, target: object): void {
    let targets = holderTargets.get(holder);
    if (!targets) {
        targets = new Set();
        holderTargets.set(holder, targets);
    }
    targets.add(target);
}

function unregisterHolderTarget(holder: object, target: object): void {
    const targets = holderTargets.get(holder);
    if (!targets) return;
    targets.delete(target);
    if (targets.size === 0) holderTargets.delete(holder);
}

// GJS adds connectObject/disconnectObject to GObject.Object at runtime but they're absent from type definitions
export function gobjectConnectObject<
    H extends (...arguments_: never[]) => void,
>(
    target: SignalTarget,
    signal: string,
    handler: H,
    holder: SignalTarget,
): void {
    const targetAny = target as any;
    registerHolderTarget(holder as object, target as object);

    if (typeof targetAny.connectObject === 'function') {
        interface ConnectableObject {
            connectObject(
                signal: string,
                handler: H,
                holder: GObject.Object,
            ): void;
        }
        // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Runtime cast for GJS connectObject
        (target as unknown as ConnectableObject).connectObject(
            signal,
            handler,
            // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Runtime cast for GJS holder
            holder as unknown as GObject.Object,
        );
        return;
    }

    // prefs fallback: connectObject unavailable, use connect() and track IDs manually
    const handlerId = targetAny.connect(signal, handler) as number;

    let holderMap = signalTracker.get(holder);
    if (!holderMap) {
        holderMap = new Map<object, number[]>();
        signalTracker.set(holder, holderMap);
    }
    let targetIds = holderMap.get(target);
    if (!targetIds) {
        targetIds = [];
        holderMap.set(target, targetIds);
    }
    targetIds.push(handlerId);
}

export function gobjectDisconnectObject(
    target: SignalTarget,
    holder: SignalTarget,
): void {
    const targetAny = target as any;
    unregisterHolderTarget(holder as object, target as object);

    if (typeof targetAny.disconnectObject === 'function') {
        type DisconnectableObject = {
            disconnectObject(holder: GObject.Object): void;
        };
        (target as never as DisconnectableObject).disconnectObject(
            holder as never as GObject.Object,
        );
        return;
    }

    const holderMap = signalTracker.get(holder);
    if (!holderMap) {
        logger.warn('gobjectDisconnectObject: no tracked signals for holder');
        return;
    }
    const targetIds = holderMap.get(target);
    if (!targetIds || targetIds.length === 0) {
        logger.warn('gobjectDisconnectObject: no tracked signals for target');
        return;
    }
    const disconnectable = targetAny as { disconnect(id: number): void };
    for (const handlerId of targetIds) {
        disconnectable.disconnect(handlerId);
    }
    holderMap.delete(target);
    if (holderMap.size === 0) signalTracker.delete(holder);
}

export function gobjectDisconnectAllForHolder(holder: SignalTarget): void {
    const targets = holderTargets.get(holder as object);
    if (!targets) return;
    // delete before iterating so unregisterHolderTarget calls within gobjectDisconnectObject are no-ops
    holderTargets.delete(holder as object);
    for (const target of targets) {
        gobjectDisconnectObject(target as SignalTarget, holder);
    }
}
