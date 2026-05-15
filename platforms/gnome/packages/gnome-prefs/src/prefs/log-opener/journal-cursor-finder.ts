import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { LoggerPort } from '@pmsb/application';

interface ExtensionStartCursorResult {
    readonly cursor: string | undefined;
    readonly found: boolean;
}

export function findExtensionStartCursor(
    logger: LoggerPort,
    cancellable: Gio.Cancellable,
    onComplete: (result: ExtensionStartCursorResult) => void,
): void {
    try {
        const proc = new Gio.Subprocess({
            argv: [
                'journalctl',
                '--user',
                '-g',
                'per-monitor-screen-blank.*extension enabled',
                '-n',
                '1',
                '--output=json',
                '--no-pager',
            ],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        // Gio.Subprocess.init() returns boolean; failure caught by exception
        void proc.init(cancellable);

        proc.communicate_utf8_async(null, cancellable, (_source, result) => {
            try {
                const [, stdout] = proc.communicate_utf8_finish(result);

                if (!stdout.trim()) {
                    onComplete({ cursor: undefined, found: true });
                    return;
                }

                const entry = JSON.parse(stdout.trim()) as {
                    readonly __CURSOR?: string;
                };
                onComplete({ cursor: entry.__CURSOR, found: true });
            } catch (error) {
                handleCursorLookupError(logger, error, onComplete);
            }
        });
    } catch (error) {
        handleCursorLookupError(logger, error, onComplete);
    }
}

function handleCursorLookupError(
    logger: LoggerPort,
    error: unknown,
    onComplete: (result: ExtensionStartCursorResult) => void,
): void {
    if (isCancelledError(error)) {
        onComplete({ cursor: undefined, found: false });
        return;
    }

    logger.error(
        `failed to read extension start cursor from journal`,
        error as object | undefined,
    );
    onComplete({ cursor: undefined, found: false });
}

function isCancelledError(error: unknown): boolean {
    return (
        error instanceof GLib.Error &&
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
    );
}
