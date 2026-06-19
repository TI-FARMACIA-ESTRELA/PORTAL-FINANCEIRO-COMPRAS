import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
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
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    query: ['@tanstack/react-query', 'axios'],
                    charts: ['recharts'],
                    ui: ['@headlessui/react', '@heroicons/react/24/outline', 'react-hot-toast'],
                },
            },
        },
    },
    server: {
        host: true,
        port: 5173,
    },
    preview: {
        host: true,
        port: 5173,
    },
});
