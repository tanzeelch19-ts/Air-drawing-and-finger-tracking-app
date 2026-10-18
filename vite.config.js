import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // basicSsl: HTTPS deta hai, taake phone par camera chale.
  plugins: [react(), tailwindcss(), basicSsl()],

  // host: true: computer ke network address par bhi khulta hai (phone se kholne ke liye)
  server: { host: true },

  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
});