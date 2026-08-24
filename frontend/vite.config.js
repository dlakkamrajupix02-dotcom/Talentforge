import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-task-list',
      '@tiptap/extension-task-item',
      '@tiptap/extension-text-style',
      '@tiptap/extension-table',
      '@tiptap/extension-text-align',
      '@tiptap/extension-highlight',
      '@tiptap/extension-image',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-subscript',
      '@tiptap/extension-superscript',
    ],
  },
  server: {
    proxy: {
      '/backend': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Gracefully handle backend reconnects / restarts without crashing Vite proxy
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend service momentarily unavailable or reconnecting', code: err.code }));
            }
          });
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (!cookies) return;
            proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
              cookie
                .replace(/;\s*Domain=[^;]*/gi, '')
                .replace(/;\s*Secure/gi, '')
            );
          });
        },
      },
      '/geo-api': {
        target: 'https://freeipapi.com/api/json',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geo-api/, '')
      }
    }
  }
})
