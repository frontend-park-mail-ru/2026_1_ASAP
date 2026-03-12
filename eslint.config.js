import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,

  {
    files: ["src/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Handlebars : "readonly"
      },
      sourceType: "module"
    }
  },
  {
    files: ["*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        process: "readonly"
      },
      sourceType: "module"
    }
  },

  {
    files: ["server/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: "module"
    }
  }
];