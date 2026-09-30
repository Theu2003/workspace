// Titulo: Register
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por Register.
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#faf8f5] py-12 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#4a6741] flex items-center justify-center text-white text-lg font-bold">
            ♻
          </div>
          <h1 className="mt-3 text-2xl font-bold text-stone-800">Criar sua conta</h1>
          <p className="mt-1 text-sm text-stone-400">Escolha o tipo de conta que quer criar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <Link
            to="/cadastro/usuario"
            className="group bg-white rounded-2xl border border-stone-200 p-7 text-center hover:border-[#a6bf87] hover:shadow-md transition-all"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#f4f7f0] text-[#537236] flex items-center justify-center text-2xl group-hover:bg-[#4a6741] group-hover:text-white transition-colors">
              ♻
            </div>
            <h2 className="mt-4 text-lg font-bold text-stone-800">Sou um usuário</h2>
            <p className="mt-2 text-sm text-stone-500 leading-relaxed">
              Tenho recicláveis em casa e quero agendar a coleta.
            </p>
            <span className="mt-4 inline-block px-5 py-2 rounded-lg bg-[#4a6741] text-white text-sm font-semibold group-hover:bg-[#364a25] transition-colors">
              Criar conta de usuário
            </span>
          </Link>

          <Link
            to="/cadastro/empresa"
            className="group bg-white rounded-2xl border border-stone-200 p-7 text-center hover:border-[#a6bf87] hover:shadow-md transition-all"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#f4f7f0] text-[#537236] flex items-center justify-center text-2xl group-hover:bg-[#537236] group-hover:text-white transition-colors">
              🚚
            </div>
            <h2 className="mt-4 text-lg font-bold text-stone-800">Sou uma empresa coletora</h2>
            <p className="mt-2 text-sm text-stone-500 leading-relaxed">
              Faço coleta e quero receber solicitações.
            </p>
            <span className="mt-4 inline-block px-5 py-2 rounded-lg bg-[#537236] text-white text-sm font-semibold group-hover:bg-[#415a2b] transition-colors">
              Cadastrar minha empresa
            </span>
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-stone-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-[#6b8f47] font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}