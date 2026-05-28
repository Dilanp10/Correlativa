import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — siempre necesario, carga primero
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Estado y animaciones — comunes en todas las páginas
          'vendor-ui': ['zustand', 'framer-motion'],
          // Supabase — necesario para auth y queries
          'vendor-supabase': ['@supabase/supabase-js'],
          // React Flow — solo TreePage, el más pesado (~250 kB)
          'vendor-flow': ['@xyflow/react'],
        },
      },
    },
  },
})
