import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: "/console/",
  server: { port: 5174, strictPort: true },
  plugins: [react(), tailwindcss()],
})
