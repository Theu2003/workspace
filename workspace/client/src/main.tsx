// ===================================================================
// main.tsx — Ponto de entrada da aplicação React (cliente)
// ===================================================================
// Este arquivo é o primeiro JavaScript executado pelo navegador.
// Ele:
//   1. Cria a raiz do React (DOM root)
//   2. Configura o BrowserRouter (rotas baseadas em URL)
//   3. Configura o AuthProvider (context de autenticação global)
//   4. Renderiza o componente App (todas as rotas)
//   5. Habilita StrictMode para detectar problemas
// ===================================================================

import React from 'react';                          // Biblioteca React
import ReactDOM from 'react-dom/client';             // Renderer do React para DOM
import { BrowserRouter } from 'react-router-dom';   // Router baseado em URL
import { AuthProvider } from './auth';               // Provedor de autenticação global
import App from './App';                             // Componente raiz da aplicação
import './index.css';                                // Estilos globais (Tailwind CSS)

// ── Hierarquia dos componentes ──────────────────────────────────────
// React.StrictMode   → Habilita verificações extras (desenvolvimento)
//   BrowserRouter    → Gerencia rotas baseadas na URL do navegador
//     AuthProvider   → Fornece dados de auth para toda a aplicação
//       App          → Componente com todas as rotas e layouts
//
// Essa hierarquia garante que:
//   1. As rotas funcionem corretamente em todas as páginas
//   2. Dados de autenticação estejam disponíveis em qualquer componente
//   3. Verificações de desenvolvimento estejam ativas

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
