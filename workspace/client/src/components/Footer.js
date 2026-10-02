// Titulo: Footer
// Autor: Mateus Martins Peres
// Finalidade: Componente React responsavel por Footer.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Phone, Mail, Instagram } from './Icons';

export default function Footer() {
  const { role } = useAuth();
  const isLogged = !!role;
  return (
    <footer className="bg-stone-800 text-stone-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#6b8f47] flex items-center justify-center text-white text-xs font-bold">
              ♻
            </span>
            <span className="text-base font-bold text-white">
              Recicla<span className="text-[#a6bf87]">Já</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Link to="/" className="hover:text-[#a6bf87] transition-colors">Início</Link>
            {isLogged && <Link to="/notificacoes" className="hover:text-[#a6bf87] transition-colors">Notificações</Link>}
            <Link to="/login" className="hover:text-[#a6bf87] transition-colors">Entrar</Link>
            <Link to="/cadastro" className="hover:text-[#a6bf87] transition-colors">Criar conta</Link>
            <span className="text-stone-600">|</span>
            <a href="tel:+5538998962288" className="flex items-center gap-1 hover:text-[#a6bf87] transition-colors">
              <Phone className="w-3 h-3 text-[#84a55e]" /> (38) 99896-2288
            </a>
            <a href="mailto:mateusmartinsperes53@gmail.com" className="flex items-center gap-1 hover:text-[#a6bf87] transition-colors">
              <Mail className="w-3 h-3 text-[#84a55e]" /> E-mail
            </a>
            <a href="https://instagram.com/theus_peres4" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#a6bf87] transition-colors">
              <Instagram className="w-3 h-3 text-[#84a55e]" /> @theus_peres4
            </a>
          </nav>
        </div>

        <div className="border-t border-stone-700/60 mt-3 pt-2.5 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-stone-500">
          <p>&copy; {new Date().getFullYear()} ReciclaJá. Todos os direitos reservados.</p>
          <div className="flex items-center gap-3">
            <span>Seg–sex 08h–18h · Sáb 08h–12h</span>
            <a href="#" className="hover:text-stone-300 transition-colors">Termos</a>
            <a href="#" className="hover:text-stone-300 transition-colors">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}