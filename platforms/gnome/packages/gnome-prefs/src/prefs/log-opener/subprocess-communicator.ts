import type Gio from 'gi://Gio';

export async function communicateSubprocessUtf8(
    proc: Gio.Subprocess,
    stdinBuffer: string | null,
    cancellable: Gio.Cancellable,
): Promise<readonly [stdout: string, stderr: string]> {
    return await new Promise((resolve, reject) => {
        proc.communicate_utf8_async(
            stdinBuffer,
            cancellable,
            (_source, result) => {
                try {
                    const [ok, stdout, stderr] =
                        proc.communicate_utf8_finish(result);

                    if (!ok) {
                        reject(
                            new Error('Subprocess UTF-8 communication failed'),
                        );
                        return;
                    }

                    resolve([stdout, stderr]);
                } catch (error) {
                    reject(error);
                }
            },
        );
    });
}
