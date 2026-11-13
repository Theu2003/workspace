// ===================================================================
// vite.config.js — Configuração do Vite (bundler/dev server)
// ===================================================================
// Define:
//   1. Plugins: React (JSX) e Tailwind CSS 4
//   2. Servidor de desenvolvimento:
//      - host: true → acessível na rede local (ex: celular no mesmo Wi-Fi)
//      - allowedHosts → hosts permitidos para túneis (Cloudflare, etc.)
//      - proxy → repassa chamadas /api para o backend na porta 3001
// ===================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// USE_HTTPS=1 ativa HTTPS com certificado auto-assinado (certs/).
// Obrigatório para que o GPS funcione em endereços que não são localhost
// (ex: celular na rede local via https://192.168.x.x).
const useHttps = process.env.USE_HTTPS === '1'
const thisDir = path.dirname(fileURLToPath(import.meta.url))
const keyFile = path.join(thisDir, 'certs', 'key.pem')
const certFile = path.join(thisDir, 'certs', 'cert.pem')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // JSX vive em arquivos .js — dizemos ao esbuild para tratá-los como JSX
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: /node_modules/
  },
  // Scanner de dependências (dev) também precisa entender JSX em .js
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    allowedHosts: ['.monkeycode-ai.live', '.trycloudflare.com'],
    host: true,
    port: 5173,
    https: useHttps && fs.existsSync(keyFile) && fs.existsSync(certFile) ? {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile)
    } : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
