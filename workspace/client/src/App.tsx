// ===================================================================
// App.tsx — Componente raiz da aplicação React (ReciclaJá)
// ===================================================================
// Este arquivo define a estrutura de rotas da aplicação.
// Ele mapeia URLs para componentes de página e configura:
//   1. Rotas públicas (Home, Login, Registro)
//   2. Rotas protegidas por autenticação (Dashboard, Perfil)
//   3. Rotas protegidas por papel (Admin só vê /admin)
//   4. Componentes globais (Navbar, Footer)
// ===================================================================

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Router do React
import { useAuth } from './auth'; // Hook de autenticação (context global)

// ── Componentes de layout ───────────────────────────────────────────
import Navbar from './components/Navbar';   // Barra de navegação superior
import Footer from './components/Footer';   // Rodapé

// ── Componentes de página (públicas) ───────────────────────────────
import Home from './pages/Home';                     // Página inicial
import Login from './pages/Login';                   // Página de login
import Register from './pages/Register';             // Página de seleção de tipo de registro
import RegisterCompany from './pages/RegisterCompany'; // Formulário de registro de empresa
import RegisterUser from './pages/RegisterUser';     // Formulário de registro de usuário
import ForgotPassword from './pages/ForgotPassword'; // Esqueci a senha (placeholder)

// ── Componentes de página (usuário comum) ───────────────────────────
import UserDashboard from './pages/UserDashboard';         // Dashboard do usuário
import ScheduleCollection from './pages/ScheduleCollection'; // Agendar nova coleta
import MyCollections from './pages/MyCollections';         // Minhas coletas
import UserProfile from './pages/UserProfile';             // Meu perfil

// ── Componentes de página (empresa) ─────────────────────────────────
import CompanyDashboard from './pages/CompanyDashboard';     // Dashboard da empresa
import CollectionRequests from './pages/CollectionRequests'; // Solicitações disponíveis
import CollectionMap from './pages/CollectionMap';           // Mapa de coletas
import CompanyAgenda from './pages/CompanyAgenda';           // Agenda da empresa
import CompanyProfile from './pages/CompanyProfile';         // Perfil da empresa
import CompanyPending from './pages/CompanyPending';         // Tela de espera (empresa não aprovada)

// ── Componentes de página (admin) ───────────────────────────────────
import AdminDashboard from './pages/AdminDashboard'; // Painel administrativo

// ── Componentes compartilhados ──────────────────────────────────────
import Notifications from './pages/Notifications'; // Página de notificações

// ── Guard de autenticação ───────────────────────────────────────────
/**
 * RequireAuth — Componente que protege rotas que exigem autenticação.
 * 
 * Verifica se o usuário está logado e se tem o papel necessário.
 * Se não estiver logado, redireciona para /login.
 * Se tiver o papel errado, redireciona para a página correta do seu papel.
 * 
 * @param {string} role - Papel necessário (opcional). Se não informado,
 *   qualquer usuário autenticado pode acessar.
 * @param {ReactNode} children - Componente filho a ser renderizado se autorizado
 * 
 * Exemplo:
 *   <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
 *   → Só admin pode acessar, outros são redirecionados
 */
function RequireAuth({ role, children }: { role?: 'user' | 'company' | 'admin'; children: React.ReactNode }) {
  const { role: currentRole } = useAuth(); // Papel do usuário logado
  const location = useLocation();          // URL atual (para voltar após login)

  // Se não está logado, redireciona para login
  if (!currentRole) return <Navigate to="/login" state={{ from: location }} replace />;

  // Se o papel exigido não coincide, redireciona para a página correta
  if (role && currentRole !== role) {
    if (currentRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={currentRole === 'user' ? '/dashboard' : '/empresa/dashboard'} replace />;
  }

  return <>{children}</>; // Autorizado, renderiza o componente
}

// ── Componente principal ────────────────────────────────────────────
/**
 * App — Componente raiz da aplicação.
 * 
 * Estrutura:
 *   Navbar (sempre visível)
 *   ├── Rotas da aplicação
 *   └── Footer (sempre visível)
 */
export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra de navegação - aparece em todas as páginas */}
      <Navbar />

      {/* Área principal com as rotas */}
      <main className="flex-1">
        <Routes>
          {/* ── Rotas públicas (qualquer pessoa pode acessar) ── */}
          <Route path="/" element={<Home />} />                    {/* Página inicial */}
          <Route path="/login" element={<Login />} />              {/* Login */}
          <Route path="/cadastro" element={<Register />} />        {/* Selecionar tipo de registro */}
          <Route path="/cadastro/empresa" element={<RegisterCompany />} /> {/* Registro de empresa */}
          <Route path="/cadastro/usuario" element={<RegisterUser />} />     {/* Registro de usuário */}
          <Route path="/esqueci-senha" element={<ForgotPassword />} />     {/* Esqueci a senha */}

          {/* ── Rotas do usuário comum (requer login + papel 'user') ── */}
          <Route path="/perfil" element={<RequireAuth role="user"><UserProfile /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
          <Route path="/agendar-coleta" element={<RequireAuth role="user"><ScheduleCollection /></RequireAuth>} />
          <Route path="/minhas-coletas" element={<RequireAuth role="user"><MyCollections /></RequireAuth>} />

          {/* ── Rotas da empresa (requer login + papel 'company') ── */}
          <Route path="/empresa/pendente" element={<RequireAuth role="company"><CompanyPending /></RequireAuth>} />
          <Route path="/empresa/perfil" element={<RequireAuth role="company"><CompanyProfile /></RequireAuth>} />
          <Route path="/empresa/dashboard" element={<RequireAuth role="company"><CompanyDashboard /></RequireAuth>} />
          <Route path="/empresa/solicitacoes" element={<RequireAuth role="company"><CollectionRequests /></RequireAuth>} />
          <Route path="/empresa/mapa" element={<RequireAuth role="company"><CollectionMap /></RequireAuth>} />
          <Route path="/empresa/agenda" element={<RequireAuth role="company"><CompanyAgenda /></RequireAuth>} />

          {/* ── Rotas do admin (requer login + papel 'admin') ── */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />

          {/* ── Rotas compartilhadas (qualquer autenticado) ── */}
          <Route path="/notificacoes" element={<RequireAuth><Notifications /></RequireAuth>} />

          {/* Rota curinga: qualquer URL não encontrada redireciona para Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Rodapé - aparece em todas as páginas */}
      <Footer />
    </div>
  );
}
