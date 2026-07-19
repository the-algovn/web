import react from "@algovn/config/eslint/react"

// eslint-plugin-react's "detect" version lookup crashes on ESLint 10
// (same workaround as packages/ui/eslint.config.js) — pin the version.
export default [
  ...react.map(config => {
    if (config.settings?.react?.version === "detect") {
      return {
        ...config,
        settings: {
          ...config.settings,
          react: { ...config.settings.react, version: "19.0.0" },
        },
      }
    }
    return config
  }),
  {
    // Test fakes type unused params (e.g. `_token`) to keep vi.fn's inferred
    // call signature aligned with the real API — underscore marks them
    // intentionally unused.
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]
