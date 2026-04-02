import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import prettierConfigRecommended from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.vite/**",
      "docs/**",
      "packages/api/uploads/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      ...prettierConfigRecommended.rules,
      "no-debugger": "error",
      "prettier/prettier": [
        "error",
        {},
        {
          usePrettierrc: true,
        },
      ],
    },
  },
];
