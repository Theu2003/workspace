// Titulo: Navbar
// Autor: Mateus Martins Peres
// Finalidade: Componente React responsavel por Navbar.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Bell, Shield } from './Icons';

export default function Navbar() {
  const { role, user, company, logout, unread } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const isPublic = !role;
  const isUser = role === 'user';
  const isCompany = role === 'company';
  const isAdmin = role === 'admin';

  const userLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/agendar-coleta', label: 'Agendar Coleta' },
    { to: '/minhas-coletas', label: 'Minhas Coletas' }
  ];
  const companyLinks = [
    { to: '/empresa/dashboard', label: 'Dashboard' },
    { to: '/empresa/mapa', label: 'Mapa de Coletas' },
    { to: '/empresa/agenda', label: 'Agenda' }
  ];

  const adminLinks = [
    { to: '/admin', label: 'Painel Admin' }
  ];

  const links = isAdmin ? adminLinks : isUser ? userLinks : isCompany ? companyLinks : [];

  return (
    <header className="sticky top-0 z-50 bg-[#faf8f5]/95 backdrop-blur border-b border-stone-200/60 pt-[env(safe-area-inset-top)]">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-[#4a6741] flex items-center justify-center text-white text-sm font-bold">
              ♻
            </span>
            <span className="text-lg font-bold tracking-tight text-stone-800">
              Recicla<span className="text-[#6b8f47]">Já</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-[#e4ecda] text-[#364a25]' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isPublic && (
              <>
                <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900">
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-[#4a6741] hover:bg-[#364a25] rounded-lg transition-colors"
                >
                  Criar conta
                </Link>
              </>
            )}
            {isAdmin && (
              <>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </span>
                <button onClick={logout} className="text-sm font-medium text-stone-500 hover:text-red-600">
                  Sair
                </button>
              </>
            )}
            {!isPublic && !isAdmin && (
              <>
                <Link to="/notificacoes" className="relative p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
                  <Bell className="w-4.5 h-4.5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => navigate(isUser ? '/perfil' : '/empresa/perfil')}
                  className="w-8 h-8 rounded-full bg-[#c9d9b5] text-[#364a25] font-bold text-sm flex items-center justify-center"
                  title={isUser ? user?.name : company?.name}
                >
                  {(isUser ? user?.name : company?.name)?.charAt(0).toUpperCase()}
                </button>
                <button onClick={logout} className="text-sm font-medium text-stone-500 hover:text-red-600">
                  Sair
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-1 min-w-11 min-h-11 flex items-center justify-center text-stone-600 rounded-lg hover:bg-stone-100 active:bg-stone-200 transition-colors"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {open ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden menu-pop border-t border-stone-200/60 bg-[#faf8f5] px-4 py-3 space-y-1 shadow-lg">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
                  isActive ? 'bg-[#e4ecda] text-[#364a25]' : 'text-stone-700 hover:bg-[#e4ecda]'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-stone-200/60 space-y-2">
            {isPublic ? (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700">
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm font-semibold text-center text-white bg-[#4a6741] rounded-lg"
                >
                  Criar conta
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/notificacoes" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700">
                  Notificações {unread > 0 && `(${unread})`}
                </Link>
                <Link to={isUser ? '/perfil' : '/empresa/perfil'} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700">
                  Meu perfil
                </Link>
                <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600">
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}