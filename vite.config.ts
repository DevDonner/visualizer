import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: GitHub Pages serves the build from /visualizer/.
// The portfolio lift ignores this file entirely (host provides its own base).
export default defineConfig({
  base: '/visualizer/',
  plugins: [react(), tailwindcss()],
})
