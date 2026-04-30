import Gio from 'gi://Gio';
import { type LoggerPort } from '@pmsb/application';

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
        void proc.init(null);
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
