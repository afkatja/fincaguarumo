import { defineConfig } from "eslint/config"
import js from "@eslint/js"

export default defineConfig([
  js.configs.recommended,
  {
    ignores: ["./next/*", "node_modules"],
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        browser: true,
        es2021: true,
        node: true,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-undef": "off",
    },
  },
])
