import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // 固定 127.0.0.1：session cookie 与 OAuth redirect 都绑在这个 host
    port: 5173,
    open: true,
  },
})
