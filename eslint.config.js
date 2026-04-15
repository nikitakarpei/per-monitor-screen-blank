import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';

const gjsGlobals = {
    ...globals.es2024,
    global: 'readonly',
    globalThis: 'readonly',
    imports: 'readonly',
    log: 'readonly',
    logError: 'readonly',
};

const layeringRules = {
    'import/no-restricted-paths': ['error', {
        zones: [
            {
                target: './src/shared',
                from: './src/app',
                message: 'shared/ must not import from app/ — it is a platform-agnostic leaf layer.',
            },
            {
                target: './src/shared',
                from: './src/gnome',
                message: 'shared/ must not import from gnome/ — it is a platform-agnostic leaf layer.',
            },
            {
                target: './src/app',
                from: './src/gnome',
                message: 'app/ must not import from gnome/ — keep the application layer platform-agnostic.',
            },
        ],
    }],
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
    'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
    }],
    'no-use-before-define': ['error', { classes: false, functions: false }],
    'no-var': 'error',
    'object-shorthand': ['error', 'always'],
    'import/no-unresolved': ['error', { ignore: ['^gi://', '^resource:///'] }],
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-template': 'error',
};

export default [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
        ],
    },
    {
        files: ['src/**/*.js'],
        plugins: {
            import: importPlugin,
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
        files: ['src/gnome/extension.js'],
        rules: {
            'no-restricted-imports': ['error', {
                paths: [
                    { name: 'gi://Gdk', message: 'extension.js must stay out of the GTK/GDK/Adwaita process boundary.' },
                    { name: 'gi://Gtk', message: 'extension.js must stay out of the GTK/GDK/Adwaita process boundary.' },
                    { name: 'gi://Adw', message: 'extension.js must stay out of the GTK/GDK/Adwaita process boundary.' },
                ],
            }],
        },
    },
    {
        files: ['src/gnome/prefs.js'],
        rules: {
            'no-restricted-imports': ['error', {
                paths: [
                    { name: 'gi://Clutter', message: 'prefs.js must stay out of the GNOME Shell process boundary.' },
                    { name: 'gi://Meta', message: 'prefs.js must stay out of the GNOME Shell process boundary.' },
                    { name: 'gi://Shell', message: 'prefs.js must stay out of the GNOME Shell process boundary.' },
                    { name: 'gi://St', message: 'prefs.js must stay out of the GNOME Shell process boundary.' },
                ],
            }],
        },
    },
    eslintConfigPrettier,
];
