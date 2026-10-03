import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://127.0.0.1:8080'

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{js,jsx}'],
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 800, // kB — TinyMCE y Leaflet son grandes por diseño
      rollupOptions: {
        output: {
          // Separa librerías pesadas en chunks independientes para mejor caché:
          // - El navegador solo re-descarga el chunk que cambió en cada deploy.
          // - Al navegar entre módulos, estos chunks ya están en caché.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react'
              }
              if (id.includes('sweetalert2') || id.includes('dompurify')) {
                return 'vendor-ui'
              }
              if (id.includes('qrcode.react')) {
                return 'vendor-qr'
              }
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'vendor-map'
              }
              if (id.includes('@tinymce')) {
                return 'vendor-tinymce'
              }
            }
          },
        },
      },
    },
  }
})
