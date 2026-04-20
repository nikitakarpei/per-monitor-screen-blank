import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import mustUse from './local-plugins/eslint-plugin-must-use/dist/index.js';

const gjsGlobals = {
    ...globals.es2024,
    global: 'readonly',
    globalThis: 'readonly',
    imports: 'readonly',
    log: 'readonly',
    logError: 'readonly',
};

const layeringRules = {
    'import-x/no-restricted-paths': [
        'error',
        {
            zones: [
                {
                    target: './src/domain',
                    from: './src/serialization',
                    message:
                        'domain/ must not import from serialization/ — parse at boundaries only.',
                },
                {
                    target: './src/domain',
                    from: './src/app',
                    message:
                        'domain/ must not import from app/ — core model stays platform-agnostic.',
                },
                {
                    target: './src/domain',
                    from: './src/gnome',
                    message:
                        'domain/ must not import from gnome/ — core model stays platform-agnostic.',
                },
                {
                    target: './src/serialization',
                    from: './src/gnome',
                    message:
                        'serialization/ must not import from gnome/ — keep wire parsers platform-agnostic.',
                },
                {
                    target: './src/serialization',
                    from: './src/app',
                    message:
                        'serialization/ must not import from app/ — wire parsers stay below application layer.',
                },
                {
                    target: './src/app',
                    from: './src/gnome',
                    message:
                        'app/ must not import from gnome/ — keep the application layer platform-agnostic.',
                },
                // src/gnome/ layer boundaries — shared/ is process-safe, importable from both processes
                {
                    target: './src/gnome/shared',
                    from: './src/gnome/shell-infra',
                    message:
                        'shared/ must not import from shell-infra/ — shared code must stay process-safe and not depend on Shell infrastructure.',
                },
                {
                    target: './src/gnome/shared',
                    from: './src/gnome/shell-ui',
                    message:
                        'shared/ must not import from shell-ui/ — shared code must stay process-safe and not depend on Shell UI.',
                },
                {
                    target: './src/gnome/shared',
                    from: './src/gnome/prefs',
                    message:
                        'shared/ must not import from prefs/ — shared code must stay process-safe and not depend on prefs-process code.',
                },
                // prefs/ — prefs-process only, can import shared/
                {
                    target: './src/gnome/prefs',
                    from: './src/gnome/shell-infra',
                    message:
                        'prefs/ must not import from shell-infra/ — prefs code must stay out of the Shell process boundary.',
                },
                {
                    target: './src/gnome/prefs',
                    from: './src/gnome/shell-ui',
                    message:
                        'prefs/ must not import from shell-ui/ — prefs code must stay out of the Shell process boundary.',
                },
                // shell-ui/ — Shell-process UI only, can import shell-infra/ and shared/
                {
                    target: './src/gnome/shell-ui',
                    from: './src/gnome/prefs',
                    message:
                        'shell-ui/ must not import from prefs/ — shell code must stay out of the prefs-process layer.',
                },
                // shell-infra/ — Shell-process infrastructure, can import shared/
                {
                    target: './src/gnome/shell-infra',
                    from: './src/gnome/shell-ui',
                    message:
                        'shell-infra/ must not import from shell-ui/ — infrastructure layer must stay below the Shell UI layer.',
                },
                {
                    target: './src/gnome/shell-infra',
                    from: './src/gnome/prefs',
                    message:
                        'shell-infra/ must not import from prefs/ — infrastructure layer must stay out of the prefs-process layer.',
                },
            ],
        },
    ],
};

const sharedRules = {
    ...js.configs.recommended.rules,
    ...importPlugin.flatConfigs.recommended.rules,
    ...sonarjs.configs.recommended.rules,
    ...unicorn.configs.recommended.rules,
    'array-callback-return': 'error',
    'consistent-return': 'error',
    curly: ['error', 'multi-line'],
    eqeqeq: ['error', 'always'],
    'no-console': 'error',
    'no-implicit-coercion': 'error',
    'no-shadow': 'error',
    'no-undef': 'error',
    'no-unused-vars': [
        'error',
        {
            args: 'after-used',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            ignoreRestSiblings: true,
        },
    ],
    'no-use-before-define': ['error', { classes: false, functions: false }],
    'no-var': 'error',
    'object-shorthand': ['error', 'always'],
    'import-x/no-unresolved': ['error', { ignore: ['^gi://', '^resource:///'] }],
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-template': 'error',
};

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['src/**/*.js'],
        settings: {
            'import-x/resolver': {
                node: {
                    extensions: ['.js', '.ts'],
                },
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
        plugins: {
            'import-x': importPlugin,
            sonarjs,
            unicorn,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: gjsGlobals,
        },
        rules: { ...sharedRules, ...layeringRules },
    },
    {
        files: ['src/**/*.ts', 'src/gnome/**/*.ts'],
        settings: {
            'import-x/resolver': {
                node: {
                    extensions: ['.js', '.ts'],
                },
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
        plugins: {
            'import-x': importPlugin,
            sonarjs,
            unicorn,
            '@typescript-eslint': tseslint.plugin,
            'must-use': mustUse,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: gjsGlobals,
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            ...sharedRules,
            ...layeringRules,
            // Disable base rules that don't understand TypeScript
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            // Use TypeScript-aware versions
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/no-redeclare': 'error',
            '@typescript-eslint/no-restricted-types': [
                'error',
                {
                    types: {
                        unknown: {
                            message: 'Use an explicit type instead of unknown',
                        },
                    },
                },
            ],
            'must-use/no-ignored-return': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            // These rules conflict with must-use/no-ignored-return which requires
            // explicit `void` prefix to acknowledge discarded return values
            '@typescript-eslint/no-meaningless-void-operator': 'off',
            'sonarjs/void-use': 'off',
        },
    },
    {
        files: ['src/**/*.test.ts'],
        rules: {
            // Test files use vitest describe/it which return SuiteCollector.
            // Disable must-use since test file patterns don't require acknowledgment.
            'must-use/no-ignored-return': 'off',
        },
    },

    {
        files: ['src/gnome/extension.js'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'gi://Gdk',
                            message:
                                'extension.js must stay out of the GTK/GDK/Adwaita process boundary.',
                        },
                        {
                            name: 'gi://Gtk',
                            message:
                                'extension.js must stay out of the GTK/GDK/Adwaita process boundary.',
                        },
                        {
                            name: 'gi://Adw',
                            message:
                                'extension.js must stay out of the GTK/GDK/Adwaita process boundary.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/gnome/prefs.js'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'gi://Clutter',
                            message:
                                'prefs.js must stay out of the GNOME Shell process boundary.',
                        },
                        {
                            name: 'gi://Meta',
                            message:
                                'prefs.js must stay out of the GNOME Shell process boundary.',
                        },
                        {
                            name: 'gi://Shell',
                            message:
                                'prefs.js must stay out of the GNOME Shell process boundary.',
                        },
                        {
                            name: 'gi://St',
                            message:
                                'prefs.js must stay out of the GNOME Shell process boundary.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/gnome/**/*.ts'],
        rules: {
            'unicorn/prefer-global-this': 'off',
        },
    },
    eslintConfigPrettier,
];
