import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: "/the-race/",
  server: { port: 5176, strictPort: true },
  plugins: [react(), tailwindcss()],
})
