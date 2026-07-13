import react from "@algovn/config/eslint/react"

// Override the react settings from base config to use a fixed version instead of "detect"
// This avoids a compatibility issue with eslint-plugin-react and eslint 10
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
}).concat([
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "react/prop-types": "off",
    },
  },
])
