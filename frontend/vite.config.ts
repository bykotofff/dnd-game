import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@services': path.resolve(__dirname, './src/services'),
            '@store': path.resolve(__dirname, './src/store'),
            '@types': path.resolve(__dirname, './src/types'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@assets': path.resolve(__dirname, './src/assets'),
        },
    },
    server: {
        host: '0.0.0.0', // Слушать на всех интерфейсах
        port: 3000,
        strictPort: true,
        open: false, // Не открывать браузер автоматически
        cors: true, // Включить CORS
        hmr: {
            port: 3001 // HMR на отдельном порту
        }
    },
    // Убедимся что Vite знает где искать файлы
    root: process.cwd(), // Текущая рабочая директория
    publicDir: 'public', // Папка для статических файлов
    // Настройки для корректной работы с TypeScript
    esbuild: {
        target: 'es2020'
    },
    build: {
        sourcemap: true,
        target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    ui: ['@headlessui/react', '@heroicons/react'],
                    forms: ['react-hook-form'],
                    animations: ['framer-motion'],
                },
            },
        },
    },
})