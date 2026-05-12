import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

function readTsconfigPaths(): Record<string, string> {
    const tsconfigPath = new URL('tsconfig.json', import.meta.url);
    const raw = readFileSync(tsconfigPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
        compilerOptions?: { paths?: Record<string, string[]> };
    };
    const paths = parsed.compilerOptions?.paths ?? {};
    const alias: Record<string, string> = {};
    for (const [key, values] of Object.entries(paths)) {
        if (values.length > 0) {
            alias[key] = `${repoRoot}${values[0]}`;
        }
    }
    return alias;
}

export default defineConfig({
    resolve: {
        alias: readTsconfigPaths(),
    },
    test: {
        include: [
            'core/packages/*/src/**/*.test.ts',
            'platforms/*/packages/*/src/**/*.test.ts',
        ],
        passWithNoTests: true,
    },
});
