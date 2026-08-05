import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { VitePWA } from "vite-plugin-pwa";

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
      VitePWA({
    registerType: "autoUpdate",
    devOptions: {
      enabled: true,
    },
    manifest: {
      name: "Blantyre Pinball",
      short_name: "Pinball",
      description: "A pinball game inspired by the streets and landmarks of Blantyre, Malawi.",
      theme_color: "#000000",
      background_color: "#000000",
      display: "standalone",
      orientation: "landscape",
      start_url: "/",
      scope: "/",
      icons: [
      ],
    },
  }),
  ],
})

export default config
