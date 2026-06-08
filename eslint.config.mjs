import base from "@distribution-copilot/eslint-config/base";

/**
 * Root ESLint config — used for editor support on root-level files and by
 * lint-staged (which runs ESLint from the repo root with file paths as args).
 * Each workspace ships its own `eslint.config.mjs`; `turbo run lint`
 * executes those per package.
 */
export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/.turbo/**", "**/generated/**"],
  },
  ...base,
  {
    // NestJS uses decorator-driven empty module classes — relax rules that
    // conflict with that pattern for all API source files.
    files: ["apps/api/**"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },
];
