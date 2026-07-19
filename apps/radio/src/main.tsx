import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "@algovn/ui/sonner"
import { ThemeProvider } from "@algovn/ui/theme-provider"
import App from "./App"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider forcedTheme="dark">
      <App />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
)
