import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig({
  files: ["src/**/*.{ts,tsx}"],
  extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
  languageOptions: {
    globals: {
      document: "readonly", window: "readonly", localStorage: "readonly",
      performance: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
      crypto: "readonly", setTimeout: "readonly", clearTimeout: "readonly",
    },
  },
});
