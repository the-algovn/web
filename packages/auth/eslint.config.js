import react from "@algovn/config/eslint/react"

// eslint-plugin-react's "detect" version lookup crashes on ESLint 10
// (same workaround as packages/ui/eslint.config.js) — pin the version.
export default react.map(config => {
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
})
