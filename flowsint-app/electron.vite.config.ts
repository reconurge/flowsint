import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [
      {
        ...tanstackRouter({
          target: 'react',
          routesDirectory: "src/renderer/src/routes",
          generatedRouteTree: "src/renderer/src/routeTree.gen.ts",
          routeFileIgnorePrefix: "_",
          autoCodeSplitting: true,
          verboseFileRoutes: false,
          quoteStyle: "double",
          semicolons: true
        }),
        enforce: 'pre'
      },
      react(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5001",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})