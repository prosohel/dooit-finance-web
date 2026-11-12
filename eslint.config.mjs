import { defineConfig, globalIgnores } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
  // Build output and vendored editors are not our code: linting them reported ~700 "errors" that no one can fix here.
  globalIgnores([".next/**", "out/**", "public/tinymce/**"]),
  {
    extends: compat.extends("next/core-web-vitals"),
    files: ["**/*.js", "**/*.jsx"],
    rules: {
        //for all js, jsx files
        "no-console": "warn",
        "no-unused-vars": "warn",
        "no-undef": "error",
    },
}]);