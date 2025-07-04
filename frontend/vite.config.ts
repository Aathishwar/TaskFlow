import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './', // ✅ Required for correct asset resolution on Vercel
  plugins: [
    react({
      // Remove the babel plugin that was causing issues
    })
  ],
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
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'esbuild', // Use esbuild for faster minification
    target: 'esnext', // Use modern JS for smaller bundle
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // UI chunk for Chakra UI
          ui: [
            '@chakra-ui/react',
            '@emotion/react',
            '@emotion/styled',
            'framer-motion'
          ],
          // Utils chunk for utilities
          utils: [
            'axios',
            'date-fns',
            'socket.io-client'
          ]
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    // Enable modern browser optimizations
    cssMinify: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@chakra-ui/react',
      'framer-motion',
      'axios',
      'socket.io-client',
      'firebase/app',
      'firebase/auth'
    ]
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove console.log in production
    pure: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
    // Remove debugger statements in production
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : []
  }
});
