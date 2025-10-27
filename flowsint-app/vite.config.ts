import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      ...tanstackRouter({
        target: 'react',
        routesDirectory: 'src/routes',
        generatedRouteTree: 'src/routeTree.gen.ts',
        // routeFileIgnorePrefix: '_',
        autoCodeSplitting: true,
        verboseFileRoutes: false,
        quoteStyle: 'double',
        semicolons: true
      }),
      enforce: 'pre'
    },
    react({
      babel: {
        // plugins: ["babel-plugin-react-compiler"]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    open: false,
    host: '0.0.0.0',
    port: 5173
  }
})
