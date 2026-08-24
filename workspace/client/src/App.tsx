import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterCompany from './pages/RegisterCompany';
import RegisterUser from './pages/RegisterUser';
import UserDashboard from './pages/UserDashboard';
import ScheduleCollection from './pages/ScheduleCollection';
import MyCollections from './pages/MyCollections';
import CompanyDashboard from './pages/CompanyDashboard';
import CollectionRequests from './pages/CollectionRequests';
import CollectionMap from './pages/CollectionMap';
import CompanyAgenda from './pages/CompanyAgenda';
import CompanyProfile from './pages/CompanyProfile';
import CompanyPending from './pages/CompanyPending';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import RecyclingInfo from './pages/RecyclingInfo';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';

function RequireAuth({ role, children }: { role?: 'user' | 'company' | 'admin'; children: React.ReactNode }) {
  const { role: currentRole } = useAuth();
  const location = useLocation();
  if (!currentRole) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && currentRole !== role) {
    if (currentRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={currentRole === 'user' ? '/dashboard' : '/empresa/dashboard'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/cadastro/empresa" element={<RegisterCompany />} />
          <Route path="/cadastro/usuario" element={<RegisterUser />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/informacoes" element={<RecyclingInfo />} />
          <Route path="/perfil" element={<RequireAuth role="user"><UserProfile /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
          <Route path="/agendar-coleta" element={<RequireAuth role="user"><ScheduleCollection /></RequireAuth>} />
          <Route path="/minhas-coletas" element={<RequireAuth role="user"><MyCollections /></RequireAuth>} />
          <Route path="/empresa/pendente" element={<RequireAuth role="company"><CompanyPending /></RequireAuth>} />
          <Route path="/empresa/perfil" element={<RequireAuth role="company"><CompanyProfile /></RequireAuth>} />
          <Route path="/empresa/dashboard" element={<RequireAuth role="company"><CompanyDashboard /></RequireAuth>} />
          <Route path="/empresa/solicitacoes" element={<RequireAuth role="company"><CollectionRequests /></RequireAuth>} />
          <Route path="/empresa/mapa" element={<RequireAuth role="company"><CollectionMap /></RequireAuth>} />
          <Route path="/empresa/agenda" element={<RequireAuth role="company"><CompanyAgenda /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
          <Route path="/notificacoes" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
