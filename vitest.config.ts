import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@pmsb/core': `${repoRoot}packages/core/src/index.ts`,
            '@pmsb/application': `${repoRoot}packages/application/src/index.ts`,
            '@pmsb/infrastructure-gnome': `${repoRoot}packages/infrastructure-gnome/src/index.ts`,
            '@pmsb/host-gnome-shell': `${repoRoot}packages/host-gnome-shell/src/index.ts`,
            '@pmsb/host-gnome-prefs': `${repoRoot}packages/host-gnome-prefs/src/index.ts`,
        },
    },
    test: {
        include: ['src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
        passWithNoTests: true,
    },
});
