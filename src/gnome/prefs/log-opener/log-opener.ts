import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { LoggerPort } from '../../../util/logger.js';
import { findExtensionStartCursor } from './journal-cursor-finder.js';

const MANUAL_COMMAND =
    'journalctl --user -f --no-pager -g per-monitor-screen-blank';

/**
 * Controller for opening extension logs in a terminal.
 * Coordinates cursor lookup, terminal launching, and error presentation.
 */
export class LogOpener {
    #window: Gtk.Window | undefined;
    readonly #logger: LoggerPort;

    constructor(window: Gtk.Window, logger: LoggerPort) {
        this.#window = window;
        this.#logger = logger;
    }

    destroy(): void {
        this.#window = undefined;
    }

    async open(): Promise<void> {
        const { cursor } = await findExtensionStartCursor(this.#logger);

        if (!this.#hasTerminalLauncher()) {
            this.#showFailureDialog(
                MANUAL_COMMAND,
                'No terminal launcher (xdg-terminal-exec) was found in PATH.',
            );
            return;
        }

        try {
            await this.#launchTerminal(cursor);
        } catch (error) {
            this.#showFailureDialog(
                MANUAL_COMMAND,
                'Could not start the terminal launcher.',
                String(error),
            );
        }
    }

    #hasTerminalLauncher(): boolean {
        return GLib.find_program_in_path('xdg-terminal-exec') !== null;
    }

    async #launchTerminal(cursor: string | undefined): Promise<void> {
        const argv = this.#buildJournalArgs(cursor);
        const proc = new Gio.Subprocess({
            argv: ['xdg-terminal-exec', '--', ...argv],
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
            const stdoutText = stdout.trim();
            const stderrText = stderr.trim();
            throw new Error(
                `Exit code ${status}: ${stderrText || stdoutText || 'Unknown error'}`,
            );
        }
    }

    #buildJournalArgs(cursor: string | undefined): string[] {
        return [
            'journalctl',
            '--user',
            '-f',
            '--no-pager',
            '-g',
            'per-monitor-screen-blank',
            ...(cursor ? [`--cursor=${cursor}`] : []),
        ];
    }

    #showFailureDialog(
        manualCommand: string,
        reason?: string,
        detail?: string,
    ): void {
        if (!this.#window) {
            this.#logger.info(
                'skipping failure dialog: log opener already destroyed',
            );
            return;
        }

        reason = reason?.trim();
        detail = detail?.trim();
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
            transient_for: this.#window,
            heading: 'Unable to open terminal',
            body,
        });
        dialog.add_response('ok', 'OK');
        dialog.set_default_response('ok');
        void dialog.connect('response', () => dialog.destroy());
        dialog.present();
    }
}
