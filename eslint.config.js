import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      "docs-generated/**",
      "coverage/**",
      "node_modules/**",
      "src/templates.js",
      "src/**/*.precompiled.js"
    ]
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...js.configs.recommended
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    files: ["src/**/*.{ts,js}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Handlebars: "readonly",
        __LOCAL_API__: "readonly"
      },
      sourceType: "module"
    }
  },
  {
    files: ["tests/**/*.ts", "vitest.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      sourceType: "module"
    }
  },
  {
    files: ["*.js", "*.cjs", "server/**/*.js", "webpack.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        process: "readonly"
      },
      sourceType: "module"
    }
  }
];
