// ===================================================================
// App.jsx — Componente raiz da aplicação React (ReciclaJá)
// ===================================================================
// Este arquivo define a estrutura de rotas da aplicação.
// Ele mapeia URLs para componentes de página e configura:
//   1. Rotas públicas (Home, Login, Registro)
//   2. Rotas protegidas por autenticação (Dashboard, Perfil)
//   3. Rotas protegidas por papel (Admin só vê /admin)
//   4. Componentes globais (Navbar, Footer)
// ===================================================================

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

// ── Componentes de layout ───────────────────────────────────────────
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// ── Componentes de página (públicas) ───────────────────────────────
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterCompany from './pages/RegisterCompany';
import RegisterUser from './pages/RegisterUser';
import ForgotPassword from './pages/ForgotPassword';

// ── Componentes de página (usuário comum) ───────────────────────────
import UserDashboard from './pages/UserDashboard';
import ScheduleCollection from './pages/ScheduleCollection';
import MyCollections from './pages/MyCollections';
import UserProfile from './pages/UserProfile';

// ── Componentes de página (empresa) ─────────────────────────────────
import CompanyDashboard from './pages/CompanyDashboard';
import CollectionMap from './pages/CollectionMap';
import CompanyAgenda from './pages/CompanyAgenda';
import CompanyProfile from './pages/CompanyProfile';
import CompanyPending from './pages/CompanyPending';

// ── Componentes de página (admin) ───────────────────────────────────
import AdminDashboard from './pages/AdminDashboard';

// ── Componentes compartilhados ──────────────────────────────────────
import Notifications from './pages/Notifications';

// Rota antiga /empresa/solicitacoes foi removida — as ações foram
// migradas para o Mapa de Coletas (/empresa/mapa). Usuários que
// acessem a URL antiga caem no curinga ("*") e voltam para a Home.

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
function RequireAuth({ role, children }) {
  const { role: currentRole } = useAuth();
  const location = useLocation();

  // Se não está logado, redireciona para login
  if (!currentRole) return <Navigate to="/login" state={{ from: location }} replace />;

  // Se o papel exigido não coincide, redireciona para a página correta
  if (role && currentRole !== role) {
    if (currentRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={currentRole === 'user' ? '/dashboard' : '/empresa/dashboard'} replace />;
  }

  return <>{children}</>;
}

// ── Componente principal ────────────────────────────────────────────
// Rotas em tela cheia que possuem navbar própria (sem Navbar/Footer globais)
const FULLSCREEN_ROUTES = ['/empresa/mapa'];

/**
 * App — Componente raiz da aplicação.
 * 
 * Estrutura:
 *   Navbar (sempre visível, exceto nas rotas de tela cheia)
 *   ├── Rotas da aplicação
 *   └── Footer (sempre visível, exceto nas rotas de tela cheia)
 */
export default function App() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra de navegação - aparece em todas as páginas, exceto telas fullscreen */}
      {!isFullscreen && <Navbar />}

      {/* Área principal com as rotas */}
      <main className="flex-1">
        <Routes>
          {/* ── Rotas públicas (qualquer pessoa pode acessar) ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/cadastro/empresa" element={<RegisterCompany />} />
          <Route path="/cadastro/usuario" element={<RegisterUser />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />

          {/* ── Rotas do usuário comum (requer login + papel 'user') ── */}
          <Route path="/perfil" element={<RequireAuth role="user"><UserProfile /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
          <Route path="/agendar-coleta" element={<RequireAuth role="user"><ScheduleCollection /></RequireAuth>} />
          <Route path="/minhas-coletas" element={<RequireAuth role="user"><MyCollections /></RequireAuth>} />

          {/* ── Rotas da empresa (requer login + papel 'company') ── */}
          <Route path="/empresa/pendente" element={<RequireAuth role="company"><CompanyPending /></RequireAuth>} />
          <Route path="/empresa/perfil" element={<RequireAuth role="company"><CompanyProfile /></RequireAuth>} />
          <Route path="/empresa/dashboard" element={<RequireAuth role="company"><CompanyDashboard /></RequireAuth>} />
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

      {/* Rodapé - aparece em todas as páginas, exceto telas fullscreen */}
      {!isFullscreen && <Footer />}
    </div>
  );
}