import { Toaster } from "@algovn/ui/sonner"
import { ThemeProvider } from "@algovn/ui/theme-provider"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { Callback } from "./components/callback"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"

const el = document.getElementById("root")
if (!el) throw new Error("Root element #root not found")

const isCallback = window.location.pathname.endsWith("/callback")

createRoot(el).render(
  <StrictMode>
    <ThemeProvider forcedTheme="dark">
      {isCallback ? <Callback /> : <App />}
      <Toaster />
    </ThemeProvider>
  </StrictMode>,
)
