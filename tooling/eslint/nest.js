import node from "./node.js";

/**
 * ESLint config for NestJS apps. Relaxes rules that conflict with Nest's
 * decorator-driven, empty-module class style.
 */
export default [
  ...node,
  {
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },
];
