import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const TARGET_IGNORE = ['src-tauri/target/**', 'src-tauri/target'];

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'tauri-target-watcher-quiet',
      config() {
        return {
          server: {
            fs: { ignore: TARGET_IGNORE },
            watch: {
              usePolling: true,
              interval: 1000,
              ignored: TARGET_IGNORE,
            },
          },
        };
      },
      configureServer(server) {
        try {
          const watcher = (server as any).watcher;
          if (watcher && typeof watcher.on === 'function') {
            watcher.on('error', (err: Error) => {
              const path = (err as any)?.path || '';
              if (typeof path === 'string' && path.includes('src-tauri' + (path.includes('target') ? '' : '/target'))) return;
              console.error('[vite:watcher]', err);
            });
          }
        } catch {
          // watcher not exposed yet in this Vite lifecycle
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        widget: './widget.html',
      },
    },
  },
  server: {
    fs: {
      ignore: ['src-tauri/target/**'],
    },
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['src-tauri/target/**', 'src-tauri/target'],
    },
  },
});