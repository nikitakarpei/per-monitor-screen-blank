import type { Rule } from "eslint";
import { noIgnoredReturn } from "./rules/no-ignored-return.js";

const plugin = {
  meta: {
    name: "eslint-plugin-must-use",
    version: "1.0.0",
  },
  rules: {
    "no-ignored-return": noIgnoredReturn as unknown as Rule.RuleModule,
  },
  configs: {} as Record<string, unknown>,
};

// Flat config preset
plugin.configs["recommended"] = {
  plugins: { "must-use": plugin },
  rules: {
    "must-use/no-ignored-return": "error",
  },
};

export default plugin;
export { noIgnoredReturn };
