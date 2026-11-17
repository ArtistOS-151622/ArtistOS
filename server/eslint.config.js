import js from "@eslint/js"
import nodePlugin from "eslint-plugin-n"
import globals from "globals"

export default [
  { ignores: ["node_modules/"] },
  js.configs.recommended,
  nodePlugin.configs["flat/recommended-module"],
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      // Use the pino logger (src/utils/logger.js), never console.
      "no-console": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      // process.exit is intentional in server.js / config/env.js (fail fast).
      "n/no-process-exit": "off",
    },
  },
  {
    files: ["tests/**/*.js"],
    rules: {
      // Tests import the TypeScript originals from the Next.js app (parity tests).
      "n/no-missing-import": "off",
      // Module mocking is experimental in Node; fine for tests, never used in src/.
      "n/no-unsupported-features/node-builtins": ["error", { ignores: ["test.mock.module"] }],
    },
  },
]
