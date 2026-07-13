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
  {
    // vendored shadcn registry files — extend this list when vendoring new components
    files: [
      "src/components/{accordion,alert,alert-dialog,aspect-ratio,attachment,avatar,badge,breadcrumb,bubble,button,button-group,calendar,card,carousel,chart,checkbox,collapsible,combobox,command,context-menu,dialog,direction,drawer,dropdown-menu,empty,field,form,hover-card,input,input-group,input-otp,item,kbd,label,marker,menubar,message,message-scroller,native-select,navigation-menu,pagination,popover,progress,radio-group,resizable,scroll-area,select,separator,sheet,sidebar,skeleton,slider,sonner,spinner,switch,table,tabs,textarea,toggle,toggle-group,tooltip}.tsx",
      "src/hooks/use-mobile.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "jsx-a11y/anchor-has-content": "off",
    },
  },
])
