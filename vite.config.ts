import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    // Permite VITE_ e NEXT_PUBLIC_ para compatibilidade
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React + Router
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // Charts library (heavy)
            charts: ['recharts'],
            // Supabase client
            supabase: ['@supabase/supabase-js'],
            // Icons
            icons: ['lucide-react'],
            // Spreadsheet utils
            xlsx: ['xlsx'],
          }
        }
      },
      // Raise the warning threshold slightly as this is expected for SaaS
      chunkSizeWarningLimit: 600,
    }
  };
});
