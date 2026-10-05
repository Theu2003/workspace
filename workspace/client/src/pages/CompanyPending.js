// Titulo: CompanyPending
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por CompanyPending.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Clock } from '../components/Icons';

export default function CompanyPending() {
  const { logout } = useAuth();

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-stone-100 p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-stone-800">Aguarde, estamos verificando</h1>
          <p className="mt-3 text-sm text-stone-500 leading-relaxed">
            Seus dados foram recebidos com sucesso. Nossa equipe está analisando as informações da sua empresa.
          </p>
          <div className="mt-6 bg-[#f4f7f0] border border-[#e4ecda] rounded-xl p-4">
            <p className="text-sm text-[#364a25] font-medium">
              ⏳ Tempo estimado: até 24 horas úteis
            </p>
            <p className="text-xs text-stone-500 mt-1.5">
              Você receberá uma notificação assim que sua conta for aprovada.
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-xs text-stone-400">Enquanto isso, você pode:</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={logout}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-red-500 transition-colors"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}