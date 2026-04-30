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
    { type: 'domain', pattern: 'core/packages/domain/src/**' },
    { type: 'application', pattern: 'core/packages/application/src/**' },
    { type: 'lifecycle', pattern: 'core/packages/lifecycle/src/**' },
    {
        type: 'infrastructure-gnome',
        pattern: 'platforms/gnome/packages/infrastructure-gnome/src/**',
    },
    {
        type: 'gnome-shell',
        pattern: 'platforms/gnome/packages/gnome-shell/src/**',
    },
    {
        type: 'gnome-prefs',
        pattern: 'platforms/gnome/packages/gnome-prefs/src/**',
    },
    {
        type: 'gnome-composition',
        pattern: 'platforms/gnome/packages/gnome-composition/src/**',
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
        project: './tsconfig.eslint.json',
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
            'import/resolver': importResolver,
            'import-x/resolver': importResolver,
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
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            ...boundariesStrict.rules,
            ...sharedRules,
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
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
            '@typescript-eslint/no-meaningless-void-operator': 'off',
            'sonarjs/void-use': 'off',
            'boundaries/dependencies': ['error', boundariesRules],
            'import-x/no-relative-packages': 'error',
            'import-x/no-duplicates': 'warn',
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
    eslintConfigPrettier,
);
