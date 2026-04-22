import Gio from 'gi://Gio';
import { LoggerPort } from '../../../util/logger.js';

export async function findExtensionStartCursor(logger: LoggerPort): Promise<{
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
        // eslint-disable-next-line unicorn/no-null -- GJS API expects explicit null for cancellable.
        void proc.init(null);
        // eslint-disable-next-line unicorn/no-null -- GJS API expects explicit null placeholders.
        const [stdout] = await proc.communicate_utf8_async(null, null);

        if (!stdout.trim()) {
            return { cursor: undefined, found: true };
        }

        const entry = JSON.parse(stdout.trim()) as {
            readonly __CURSOR?: string;
        };
        return { cursor: entry.__CURSOR, found: true };
    } catch (error) {
        logger.info(
            `failed to read extension start cursor from journal: ${String(error)}`,
        );
        return { cursor: undefined, found: false };
    }
}
