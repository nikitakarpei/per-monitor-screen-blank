import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import type Gtk from 'gi://Gtk';
import type { LoggerPort } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';
import { findExtensionStartCursor } from './journal-cursor-finder.js';

const MANUAL_COMMAND =
    'journalctl --user -f --no-pager -g per-monitor-screen-blank';

/**
 * Controller for opening extension logs in a terminal.
 * Coordinates cursor lookup, terminal launching, and error presentation.
 */
export class LogOpener implements Disposable {
    #window: Gtk.Window | undefined;
    #cancellable: Gio.Cancellable | undefined;
    readonly #logger: LoggerPort;

    constructor(window: Gtk.Window, logger: LoggerPort) {
        this.#window = window;
        this.#logger = logger;
    }

    dispose(): void {
        this.#cancellable?.cancel();
        this.#cancellable = undefined;
        this.#window = undefined;
    }

    open(): void {
        if (!this.#window) {
            this.#logger.info(
                'skipping log open: log opener already destroyed',
            );
            return;
        }

        const cancellable = this.#getCancellable();
        findExtensionStartCursor(this.#logger, cancellable, ({ cursor }) => {
            if (!this.#window) {
                this.#logger.info(
                    'skipping terminal launch: log opener already destroyed',
                );
                return;
            }

            if (!this.#hasTerminalLauncher()) {
                this.#showFailureDialog(
                    MANUAL_COMMAND,
                    'No terminal launcher (xdg-terminal-exec) was found in PATH.',
                );
                return;
            }

            this.#launchTerminal(cursor, cancellable);
        });
    }

    #hasTerminalLauncher(): boolean {
        return GLib.find_program_in_path('xdg-terminal-exec') !== null;
    }

    #getCancellable(): Gio.Cancellable {
        this.#cancellable ??= new Gio.Cancellable();
        return this.#cancellable;
    }

    #launchTerminal(
        cursor: string | undefined,
        cancellable: Gio.Cancellable,
    ): void {
        try {
            const argv = this.#buildJournalArgs(cursor);
            const proc = new Gio.Subprocess({
                argv: ['xdg-terminal-exec', '--', ...argv],
                flags:
                    Gio.SubprocessFlags.STDOUT_PIPE |
                    Gio.SubprocessFlags.STDERR_PIPE,
            });
            // Gio.Subprocess.init() returns boolean; failure caught by exception
            void proc.init(cancellable);

            proc.communicate_utf8_async(
                null,
                cancellable,
                (_source, result) => {
                    try {
                        const [, stdout, stderr] =
                            proc.communicate_utf8_finish(result);
                        const status = proc.get_exit_status();

                        if (status !== 0) {
                            const stdoutText = stdout.trim();
                            const stderrText = stderr.trim();
                            this.#handleTerminalLaunchError(
                                new Error(
                                    `Exit code ${status}: ${stderrText || stdoutText || 'Unknown error'}`,
                                ),
                            );
                        }
                    } catch (error) {
                        this.#handleTerminalLaunchError(error);
                    }
                },
            );
        } catch (error) {
            this.#handleTerminalLaunchError(error);
        }
    }

    #handleTerminalLaunchError(error: unknown): void {
        if (isCancelledError(error)) {
            return;
        }

        this.#logger.error(
            'failed to open extension logs',
            error as object | undefined,
        );
        this.#showFailureDialog(
            MANUAL_COMMAND,
            'Could not start the terminal launcher.',
            String(error),
        );
    }

    #buildJournalArgs(cursor: string | undefined): string[] {
        return [
            'journalctl',
            '--user',
            '-f',
            '--no-pager',
            '-g',
            'per-monitor-screen-blank',
            ...(cursor === undefined ? [] : [`--cursor=${cursor}`]),
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

        if (reason !== undefined && reason !== '') {
            bodyParts.push(reason);
        }
        if (detail !== undefined && detail !== '') {
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

function isCancelledError(error: unknown): boolean {
    return (
        error instanceof GLib.Error &&
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
    );
}
