import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { LoggerPort } from '@pmsb/application';
import { communicateSubprocessUtf8 } from './subprocess-communicator.js';

export async function findExtensionStartCursor(
    logger: LoggerPort,
    cancellable: Gio.Cancellable,
): Promise<{
    readonly cursor: string | undefined;
    readonly found: boolean;
}> {
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
        const [stdout] = await communicateSubprocessUtf8(
            proc,
            null,
            cancellable,
        );

        if (!stdout.trim()) {
            return { cursor: undefined, found: true };
        }

        const entry = JSON.parse(stdout.trim()) as {
            readonly __CURSOR?: string;
        };
        return { cursor: entry.__CURSOR, found: true };
    } catch (error) {
        if (isCancelledError(error)) {
            return { cursor: undefined, found: false };
        }

        logger.error(
            `failed to read extension start cursor from journal`,
            error as object | undefined,
        );
        return { cursor: undefined, found: false };
    }
}

function isCancelledError(error: unknown): boolean {
    return (
        error instanceof GLib.Error &&
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
    );
}
