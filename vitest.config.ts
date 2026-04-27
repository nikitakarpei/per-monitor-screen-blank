import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@pmsb/domain': `${repoRoot}core/packages/domain/src/index.ts`,
            '@pmsb/application': `${repoRoot}core/packages/application/src/index.ts`,
            '@pmsb/infrastructure-gnome': `${repoRoot}platforms/gnome/packages/infrastructure-gnome/src/index.ts`,
            '@pmsb/host-gnome-shell': `${repoRoot}platforms/gnome/packages/host-gnome-shell/src/index.ts`,
            '@pmsb/host-gnome-prefs': `${repoRoot}platforms/gnome/packages/host-gnome-prefs/src/index.ts`,
        },
    },
    test: {
        include: ['core/packages/*/src/**/*.test.ts', 'platforms/*/packages/*/src/**/*.test.ts'],
        passWithNoTests: true,
    },
});
