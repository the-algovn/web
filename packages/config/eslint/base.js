import js from "@eslint/js"
import tseslint from "typescript-eslint"
import turbo from "eslint-plugin-turbo"
import prettier from "eslint-config-prettier"

export default tseslint.config(
  { ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { turbo },
    rules: { "turbo/no-undeclared-env-vars": "warn" },
  },
  prettier
)
