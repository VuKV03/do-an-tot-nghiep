import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(
        new Date().toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      ),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // QuanLyThi Service — admin & portal routes
        '/api/exam/admin': {
          target: 'http://localhost:8005',
          changeOrigin: true,
          secure: false,
        },
        '/api/exam/portal': {
          target: 'http://localhost:8005',
          changeOrigin: true,
          secure: false,
        },
        // Exam Service — packages & exams routes (rewrite /api/exam/packages → /packages)
        '/api/exam/packages': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api\/exam\/packages/, '/packages'),
        },
        // Fallback: everything else via Gateway
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
