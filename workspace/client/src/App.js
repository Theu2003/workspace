// Titulo: App
// Autor: Mateus Martins Peres
// Finalidade: Modulo do frontend responsavel por App.
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterCompany from './pages/RegisterCompany';
import RegisterUser from './pages/RegisterUser';
import ForgotPassword from './pages/ForgotPassword';

import UserDashboard from './pages/UserDashboard';
import ScheduleCollection from './pages/ScheduleCollection';
import MyCollections from './pages/MyCollections';
import UserProfile from './pages/UserProfile';

import CompanyDashboard from './pages/CompanyDashboard';
import CollectionMap from './pages/CollectionMap';
import CompanyAgenda from './pages/CompanyAgenda';
import CompanyProfile from './pages/CompanyProfile';
import CompanyPending from './pages/CompanyPending';

import AdminDashboard from './pages/AdminDashboard';

import Notifications from './pages/Notifications';

function RequireAuth({ role, children }) {
  const { role: currentRole } = useAuth();
  const location = useLocation();

  if (!currentRole) return <Navigate to="/login" state={{ from: location }} replace />;

  if (role && currentRole !== role) {
    if (currentRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={currentRole === 'user' ? '/dashboard' : '/empresa/dashboard'} replace />;
  }

  return <>{children}</>;
}

const FULLSCREEN_ROUTES = ['/empresa/mapa'];

export default function App() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      { }
      {!isFullscreen && <Navbar />}

      { }
      <main className="flex-1">
        <Routes>
          { }
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/cadastro/empresa" element={<RegisterCompany />} />
          <Route path="/cadastro/usuario" element={<RegisterUser />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />

          { }
          <Route path="/perfil" element={<RequireAuth role="user"><UserProfile /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
          <Route path="/agendar-coleta" element={<RequireAuth role="user"><ScheduleCollection /></RequireAuth>} />
          <Route path="/minhas-coletas" element={<RequireAuth role="user"><MyCollections /></RequireAuth>} />

          { }
          <Route path="/empresa/pendente" element={<RequireAuth role="company"><CompanyPending /></RequireAuth>} />
          <Route path="/empresa/perfil" element={<RequireAuth role="company"><CompanyProfile /></RequireAuth>} />
          <Route path="/empresa/dashboard" element={<RequireAuth role="company"><CompanyDashboard /></RequireAuth>} />
          <Route path="/empresa/mapa" element={<RequireAuth role="company"><CollectionMap /></RequireAuth>} />
          <Route path="/empresa/agenda" element={<RequireAuth role="company"><CompanyAgenda /></RequireAuth>} />

          { }
          <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />

          { }
          <Route path="/notificacoes" element={<RequireAuth><Notifications /></RequireAuth>} />

          { }
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      { }
      {!isFullscreen && <Footer />}
    </div>
  );
}