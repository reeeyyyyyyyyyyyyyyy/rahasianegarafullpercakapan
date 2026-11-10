import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      // Externalize Capacitor USB Serial plugin (optional dependency for Android)
      external: [
        '@nicoritschel/capacitor-usb-serial',
      ],
    },
  },
  server: {
    host: "0.0.0.0", // listen to all interfaces (0.0.0.0)
    port: 5173,
    allowedHosts: [
      "tifa-app.dearahmanfauzi.net",
      "tifa-app.forgixrobotic.com",
      "localhost",
    ]
  }
})
