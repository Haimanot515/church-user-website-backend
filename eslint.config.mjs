import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "coverage/**", "dist/**", "prisma/schema/migrations/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^(req|res|next)$" }],
      "no-console": "off",
      eqeqeq: ["warn", "smart"],
      "prefer-const": "warn",
    },
  },
];
