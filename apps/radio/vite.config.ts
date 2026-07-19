import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: "/radio/",
  server: { port: 5175, strictPort: true },
  plugins: [react(), tailwindcss()],
})
