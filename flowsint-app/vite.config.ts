import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL

  return {
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
        plugins: ["babel-plugin-react-compiler"]
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
          target: apiUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      open: false,
      host: '0.0.0.0',
      port: 5173
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-dom/client'],
            'vendor-xyflow': ['@xyflow/react', '@xyflow/system'],
            'vendor-pixi': ['pixi.js'],
            'vendor-monaco': ['@monaco-editor/react'],
            'vendor-tiptap': [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/core',
            ],
            'vendor-map': ['maplibre-gl'],
            'vendor-charts': ['recharts', 'd3', 'd3-force'],
            'vendor-motion': ['framer-motion'],
          }
        }
      }
    }
  }
})
