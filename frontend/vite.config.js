import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    include: ['jspdf', 'html2canvas', 'chart.js', 'react-chartjs-2', 'lucide-react', 'framer-motion'],
    exclude: ['canvg']
  },
  build: {
    rollupOptions: {
      external: ['canvg']
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
