import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import mustUse from './local-plugins/eslint-plugin-must-use/dist/index.js';
import boundaries from 'eslint-plugin-boundaries';
import { strict as boundariesStrict } from 'eslint-plugin-boundaries/config';

// =============================================================================
// Boundaries Configuration
// Define element types for each package and enforce dependency rules.
// =============================================================================
const boundariesElements = [
    { type: 'domain', pattern: 'core/packages/domain/src/**', mode: 'full' },
    {
        type: 'application',
        pattern: 'core/packages/application/src/**',
        mode: 'full',
    },
    {
        type: 'lifecycle',
        pattern: 'core/packages/lifecycle/src/**',
        mode: 'full',
    },
    {
        type: 'infrastructure-gnome',
        pattern: 'platforms/gnome/packages/infrastructure-gnome/src/**',
        mode: 'full',
    },
    {
        type: 'gnome-shell',
        pattern: 'platforms/gnome/packages/gnome-shell/src/**',
        mode: 'full',
    },
    {
        type: 'gnome-prefs',
        pattern: 'platforms/gnome/packages/gnome-prefs/src/**',
        mode: 'full',
    },
    {
        type: 'gnome-composition',
        pattern: 'platforms/gnome/packages/gnome-composition/src/**',
        mode: 'full',
    },
];

const boundariesRules = {
    default: 'disallow',
    rules: [
        { from: { type: 'domain' }, allow: { to: { type: 'domain' } } },
        {
            from: { type: 'application' },
            allow: { to: { type: ['domain', 'application', 'lifecycle'] } },
        },
        { from: { type: 'lifecycle' }, allow: { to: { type: ['lifecycle'] } } },
        {
            from: { type: 'infrastructure-gnome' },
            allow: {
                to: {
                    type: [
                        'domain',
                        'application',
                        'lifecycle',
                        'infrastructure-gnome',
                    ],
                },
            },
        },
        {
            from: { type: 'gnome-shell' },
            allow: {
                to: {
                    type: ['domain', 'application', 'lifecycle', 'gnome-shell'],
                },
            },
        },
        {
            from: { type: 'gnome-prefs' },
            allow: {
                to: {
                    type: ['domain', 'application', 'lifecycle', 'gnome-prefs'],
                },
            },
        },
        {
            from: { type: 'gnome-composition' },
            allow: {
                to: {
                    type: [
                        'domain',
                        'application',
                        'lifecycle',
                        'infrastructure-gnome',
                        'gnome-shell',
                        'gnome-prefs',
                        'gnome-composition',
                    ],
                },
            },
        },
    ],
};

const importResolver = {
    node: {
        extensions: ['.js', '.ts'],
    },
    typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true,
    },
};

// =============================================================================
// Shared Rules
// =============================================================================
const sharedRules = {
    ...js.configs.recommended.rules,
    ...sonarjs.configs.recommended.rules,
    ...unicorn.configs.recommended.rules,
    'array-callback-return': 'error',
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-console': 'error',
    'no-implicit-coercion': 'error',
    'no-undef': 'off',
    'no-var': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-template': 'error',
};

// =============================================================================
// Main Config
// =============================================================================
export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['core/packages/**/*.ts', 'platforms/*/packages/**/*.ts'],
        settings: {
            ...boundariesStrict.settings,
            'boundaries/elements': boundariesElements,
            'import-x/resolver': importResolver,
            'import/resolver': importResolver,
            'import-x/ignore': ['^gi://', '^resource://'],
        },
        plugins: {
            'import-x': importPlugin,
            sonarjs,
            unicorn,
            '@typescript-eslint': tseslint.plugin,
            'must-use': mustUse,
            boundaries,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.es2024,
                global: 'readonly',
                globalThis: 'readonly',
                imports: 'readonly',
                log: 'readonly',
                logError: 'readonly',
            },
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            ...boundariesStrict.rules,
            ...sharedRules,
            ...tseslint.configs.strictTypeChecked.rules,
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            'no-shadow': 'off',
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
            '@typescript-eslint/no-shadow': 'error',
            '@typescript-eslint/no-use-before-define': [
                'error',
                { classes: false, functions: false },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/strict-boolean-expressions': 'error',
            'must-use/no-ignored-return': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-meaningless-void-operator': 'off',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports' },
            ],
            '@typescript-eslint/no-import-type-side-effects': 'error',
            'sonarjs/void-use': 'off',
            'boundaries/dependencies': ['error', boundariesRules],
            'import-x/no-relative-packages': 'error',
            'import-x/no-duplicates': 'error',
            'import-x/no-unresolved': [
                'error',
                { ignore: ['^gi://', '^resource://'] },
            ],
            'import-x/consistent-type-specifier-style': [
                'error',
                'prefer-top-level',
            ],
        },
    },
    {
        files: [
            'core/packages/**/*.test.ts',
            'platforms/*/packages/**/*.test.ts',
        ],
        rules: {
            'must-use/no-ignored-return': 'off',
        },
    },
    {
        files: [
            'core/packages/domain/src/**/*.ts',
            'core/packages/application/src/**/*.ts',
        ],
        rules: {
            '@typescript-eslint/no-restricted-types': [
                'error',
                {
                    types: {
                        unknown: {
                            message:
                                'Validate at boundaries and pass explicit domain/application types instead of unknown',
                        },
                    },
                },
            ],
        },
    },
    {
        files: [
            'platforms/gnome/packages/gnome-shell/src/**/*.ts',
            'platforms/gnome/packages/gnome-prefs/src/**/*.ts',
            'platforms/gnome/packages/gnome-composition/src/**/*.ts',
            'platforms/gnome/packages/infrastructure-gnome/src/**/*.ts',
        ],
        rules: {
            'unicorn/prefer-global-this': 'off',
            'unicorn/no-null': 'off',
        },
    },
    {
        files: ['platforms/gnome/packages/gnome-shell/src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'gi://Gdk',
                            message: 'Shell-side must not import Gdk',
                        },
                        {
                            name: 'gi://Gtk',
                            message: 'Shell-side must not import Gtk',
                        },
                        {
                            name: 'gi://Adw',
                            message: 'Shell-side must not import Adw',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['platforms/gnome/packages/gnome-prefs/src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'gi://Clutter',
                            message: 'Prefs-side must not import Clutter',
                        },
                        {
                            name: 'gi://Meta',
                            message: 'Prefs-side must not import Meta',
                        },
                        {
                            name: 'gi://St',
                            message: 'Prefs-side must not import St',
                        },
                        {
                            name: 'gi://Shell',
                            message: 'Prefs-side must not import Shell',
                        },
                    ],
                },
            ],
        },
    },
    eslintConfigPrettier,
);
