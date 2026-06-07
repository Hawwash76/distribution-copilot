import base from "@distribution-copilot/eslint-config/base";

/**
 * Root ESLint config — used for editor support on root-level files.
 * Each workspace ships its own `eslint.config.mjs`; `turbo run lint`
 * executes those per package.
 */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/generated/**",
    ],
  },
  ...base,
];
