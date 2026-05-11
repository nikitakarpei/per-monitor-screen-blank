/**
 * Resource that can be explicitly disposed.
 */
export interface Disposable {
    dispose(): void;
}

/**
 * Collection that holds disposables and disposes them in reverse order.
 */
export interface DisposableStore extends Disposable {
    add(resource: Disposable): void;
}

/**
 * Callback to report failures during resource disposal.
 */
export type CleanupFailureReporter = (
    error: Error | object,
    resource: Disposable,
) => void;

/**
 * Creates a DisposableStore that reports cleanup failures without stopping
 * remaining disposals.
 */
export function createDisposableStore(
    reportFailure: CleanupFailureReporter,
): DisposableStore {
    const resources: Disposable[] = [];
    let disposed = false;

    return {
        add(resource: Disposable): void {
            if (disposed) {
                throw new Error(
                    'Cannot add resources to an already disposed store',
                );
            }
            resources.push(resource);
        },
        dispose(): void {
            if (disposed) {
                return;
            }
            disposed = true;
            for (let index = resources.length - 1; index >= 0; index--) {
                try {
                    resources[index].dispose();
                } catch (error) {
                    reportFailure(error as Error | object, resources[index]);
                }
            }
            resources.length = 0;
        },
    };
}
