import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from './Icons';

export default function Footer() {
  const { role } = useAuth();
  const isLogged = !!role;
  return (
    <footer className="bg-stone-800 text-stone-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-[#6b8f47] flex items-center justify-center text-white text-sm font-bold">
                ♻
              </span>
              <span className="text-lg font-bold text-white">
                Recicla<span className="text-[#a6bf87]">Já</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Juntando quem quer reciclar com quem faz a coleta. Simples assim.
            </p>
            <div className="flex gap-2 mt-4">
              <a href="https://instagram.com/theus_peres4" target="_blank" className="p-2 rounded-lg bg-stone-700/50 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Navegação</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-[#a6bf87] transition-colors">Início</Link></li>
              <li><Link to="/informacoes" className="hover:text-[#a6bf87] transition-colors">Informações sobre reciclagem</Link></li>
              {isLogged && <li><Link to="/notificacoes" className="hover:text-[#a6bf87] transition-colors">Notificações</Link></li>}
              <li><Link to="/login" className="hover:text-[#a6bf87] transition-colors">Entrar</Link></li>
              <li><Link to="/cadastro" className="hover:text-[#a6bf87] transition-colors">Criar conta</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#84a55e]" /> (38) 99896-2288</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#84a55e]" /> mateusmartinsperes53@gmail.com</li>
              <li className="flex items-center gap-2"><Instagram className="w-4 h-4 text-[#84a55e]" /> @theus_peres4</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Atendimento</h4>
            <ul className="space-y-2 text-sm">
              <li>Seg a sex: 08h às 18h</li>
              <li>Sábado: 08h às 12h</li>
              <li className="text-[#a6bf87] font-medium mt-2">Coletas em todo o Brasil</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-700 mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} ReciclaJá. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-stone-300 transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-stone-300 transition-colors">Política de privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
