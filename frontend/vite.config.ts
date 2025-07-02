import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './', // ✅ Required for correct asset resolution on Vercel
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ✅ Dev only
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000', // ✅ Dev only
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
