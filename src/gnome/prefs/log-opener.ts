import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { LoggerPort } from '../../util/logger.js';
import type Gtk from 'gi://Gtk';

interface JournalEntry {
    readonly __CURSOR?: string;
}

interface FailureExtra {
    readonly reason?: string;
    readonly detail?: string;
}

/**
 * Find the journal cursor for the most recent extension enable log entry.
 * @param logger - Logger instance for diagnostic output.
 * @returns The cursor string, or undefined if not found.
 */
async function findExtensionStartCursor(
    logger: LoggerPort,
): Promise<string | undefined> {
    let cursor: string | undefined;
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
        if (!stdout?.trim()) {
            return cursor;
        }
        const entry: JournalEntry = JSON.parse(stdout.trim()) as JournalEntry;
        cursor = entry.__CURSOR;
    } catch {
        logger.info('failed to read extension start cursor from journal');
    }

    return cursor;
}

/**
 * Present a failure dialog when opening extension logs fails.
 * @param window - Parent window for the dialog.
 * @param manualCommand - Command to show for manual execution.
 * @param logger - Logger instance for diagnostic output.
 * @param extra - Additional error context.
 * @param isWindowDestroyed - Whether the parent window is already destroyed.
 */
function presentLogsFailureDialog(
    window: Gtk.Window,
    manualCommand: string,
    logger: LoggerPort,
    extra: FailureExtra = {},
    isWindowDestroyed = false,
): void {
    if (isWindowDestroyed) {
        return;
    }

    const reason = extra.reason?.trim();
    const detail = extra.detail?.trim();
    const bodyParts: string[] = [];
    if (reason) {
        bodyParts.push(reason);
    }
    if (detail) {
        bodyParts.push(detail);
    }
    bodyParts.push(`Run this command manually:\n\n${manualCommand}`);
    const body = bodyParts.join('\n\n');

    const dialog = new Adw.MessageDialog({
        transient_for: window,
        heading: 'Unable to open terminal',
        body,
    });
    dialog.add_response('ok', 'OK');
    dialog.set_default_response('ok');
    // Signal handler acknowledged for must-use; dialog manages its own lifecycle
    void dialog.connect('response', () => dialog.destroy());
    dialog.present();
}

/**
 * Open a terminal with live extension logs via xdg-terminal-exec.
 * @param window - Parent window for error dialogs.
 * @param logger - Logger instance for diagnostic output.
 * @param isWindowDestroyed - Whether the parent window is already destroyed.
 */
export async function openExtensionLogs(
    window: Gtk.Window,
    logger: LoggerPort,
    isWindowDestroyed = false,
): Promise<void> {
    /* journalctl --grep matches MESSAGE text; covers log tag and bracket prefix without bash/rg.
     * --cursor positions the stream at the last extension enable so all session logs are visible. */
    const startCursor = await findExtensionStartCursor(logger);
    const journalArgv: string[] = [
        'journalctl',
        '--user',
        '-f',
        '--no-pager',
        '-g',
        'per-monitor-screen-blank',
        ...(startCursor ? [`--cursor=${startCursor}`] : []),
    ];
    const manual =
        'journalctl --user -f --no-pager -g per-monitor-screen-blank';

    if (!GLib.find_program_in_path('xdg-terminal-exec')) {
        logger.info('default terminal launcher unavailable for extension logs');
        presentLogsFailureDialog(
            window,
            manual,
            logger,
            {
                reason: 'No terminal launcher (xdg-terminal-exec) was found in PATH.',
            },
            isWindowDestroyed,
        );
        return;
    }

    try {
        const proc = new Gio.Subprocess({
            argv: ['xdg-terminal-exec', '--', ...journalArgv],
            flags:
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE,
        });
        // Gio.Subprocess.init() returns boolean; failure caught by exception
        // eslint-disable-next-line unicorn/no-null -- GJS API expects explicit null for cancellable.
        void proc.init(null);
        /* eslint-disable unicorn/no-null -- GJS API expects explicit null placeholders. */
        const [stdout, stderr] = await proc.communicate_utf8_async(null, null);
        /* eslint-enable unicorn/no-null */
        const status = proc.get_exit_status();
        if (status !== 0) {
            const stdoutText = stdout?.trim() ?? '';
            const stderrText = stderr?.trim() ?? '';
            logger.warn('xdg-terminal-exec failed for extension logs');
            presentLogsFailureDialog(
                window,
                manual,
                logger,
                {
                    reason: 'The terminal launcher exited with an error.',
                    detail: stderrText || stdoutText || `Exit code ${status}`,
                },
                isWindowDestroyed,
            );
            return;
        }
    } catch (error) {
        logger.warn('failed to launch default terminal for extension logs');
        presentLogsFailureDialog(
            window,
            manual,
            logger,
            {
                reason: 'Could not start the terminal launcher.',
                detail: String(error),
            },
            isWindowDestroyed,
        );
    }
}
