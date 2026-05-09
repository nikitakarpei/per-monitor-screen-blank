import Gio from 'gi://Gio';

// Promisify must run before any async work
Gio._promisify(
    Gio.Subprocess.prototype,
    'communicate_utf8_async',
    'communicate_utf8_finish',
);
