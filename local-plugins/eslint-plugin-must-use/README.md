# eslint-plugin-must-use

ESLint plugin with a single rule: **`must-use/no-ignored-return`**.

For every call whose type says it returns something other than `void`, the result must be **used** (for example assigned, returned, passed on, or branched on). If dropping the result feels right, that usually means the wrong function is being called, or the callee should expose a side-effect-only API—**not** that the return value should be discarded on purpose.

This is the TypeScript analogue of applying `[[nodiscard]]`-style discipline across calls: meaningful returns stay meaningful at the call site.

---

## Behaviour

```ts
function parse(s: string): Config { ... }
function log(s: string): void { ... }
async function fetch(): Promise<Data> { ... }

// ❌ Error: Return value of type "Config" is ignored.
parse(input);

// ✅ Use the value — bind it, return it, or branch on it as your logic requires.
const config = parse(input);

// ✅ void-returning calls are fine — there is nothing to “use”.
log("hello");

// Promises are not flagged by this rule; complete the async operation per
// @typescript-eslint/no-floating-promises (e.g. await, .then, or intentional handling).
await fetch();
```

Union types:

```ts
function maybe(): string | void { ... }

maybe(); // ❌ Error — the `string` branch must not be silently dropped.

// ✅ Use the result when it matters (pattern depends on your API).
const label = maybe();
if (label !== undefined && label !== '')
  showLabel(label);

function safe(): void | undefined { ... }
safe(); // ✅ ok — every branch is void-like
```

---

## Setup

### 1. Copy the plugin into your project

```
your-project/
  local-plugins/
    eslint-plugin-must-use/
      src/
        index.ts
        rules/
          no-ignored-return.ts
      tsconfig.json
      package.json
```

### 2. Build it

```bash
cd local-plugins/eslint-plugin-must-use
npm install
npm run build
```

### 3. Add to eslint.config.js / eslint.config.ts

```js
// eslint.config.js
import mustUse from './local-plugins/eslint-plugin-must-use/dist/index.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    plugins: { 'must-use': mustUse },
    rules: {
      'must-use/no-ignored-return': 'error',

      // Pair with this for full coverage of Promises:
      '@typescript-eslint/no-floating-promises': 'error',

      // Pair with this to prevent void on void-returning functions:
      '@typescript-eslint/no-meaningless-void-operator': 'error',
    },
  }
);
```

> **Requires type-checked linting** — make sure `languageOptions.parserOptions.project` is set.
