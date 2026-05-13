import path from 'node:path';

import typescript from '@rollup/plugin-typescript';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';

function requirePathFromEnv(name) {
    const configuredPath = process.env[name];

    if (!configuredPath) {
        throw new Error(
            `${name} is required and must point to a filesystem path.`,
        );
    }

    return path.resolve(configuredPath);
}

const GNOME_ROLLUP_OUT_DIR = requirePathFromEnv('GNOME_ROLLUP_OUT_DIR');
const GNOME_ROLLUP_EXTENSION_ENTRY = requirePathFromEnv(
    'GNOME_ROLLUP_EXTENSION_ENTRY',
);
const GNOME_ROLLUP_PREFS_ENTRY = requirePathFromEnv('GNOME_ROLLUP_PREFS_ENTRY');

export default {
    input: {
        extension: GNOME_ROLLUP_EXTENSION_ENTRY,
        prefs: GNOME_ROLLUP_PREFS_ENTRY,
    },
    output: {
        dir: GNOME_ROLLUP_OUT_DIR,
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: '.',
        sourcemap: false,
        entryFileNames: '[name].js',
    },
    external: [/^gi:\/\//, /^resource:\/\//],
    plugins: [
        tsConfigPaths(),
        typescript({
            sourceMap: false,
            inlineSources: false,
            noEmit: false,
        }),
    ],
};
