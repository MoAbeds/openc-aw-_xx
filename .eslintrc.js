/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["./packages/config/eslint-preset.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".turbo/",
    ".next/",
    "**/.eslintrc.js",
  ],
};
