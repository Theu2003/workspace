import { Link } from 'react-router-dom';
import { Leaf, Recycle, CheckCircle } from '../components/Icons';

const materials = [
  { name: 'Papel e papelão', tip: 'Limpos e secos. Dobre pra economizar espaço.', color: '#b8860b' },
  { name: 'Plásticos', tip: 'Lave as embalagens e seque antes de descartar.', color: '#4682b4' },
  { name: 'Vidros', tip: 'Embrulhe ou use caixa pra evitar acidentes na coleta.', color: '#6b8f47' },
  { name: 'Metais', tip: 'Latinhas e embalagens podem ser amassadas pra ganhar espaço.', color: '#708090' },
  { name: 'Eletrônicos', tip: 'Remova baterias. Apague dados pessoais.', color: '#7b68ae' },
  { name: 'Óleo de cozinha', tip: 'Guarde em garrafa PET tampada e identifique.', color: '#8b6914' }
];

const doList = [
  'Separe por tipo',
  'Lave embalagens antes',
  'Amasse latas e embalagens',
  'Identifique os sacos'
];

const dontList = [
  'Misture com lixo orgânico',
  'Descarte pilhas no lixo comum',
  'Dobre papéis molhados',
  'Inclua copos sujos de gordura'
];

export default function RecyclingInfo() {
  return (
    <div>
      <section className="bg-[#364a25] text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm font-medium"><Leaf className="w-4 h-4" /> Guia de reciclagem</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Informações sobre reciclagem</h1>
            <p className="mt-3 text-white/65 text-base leading-relaxed">
              Aprenda a separar direito e entenda por que isso faz tanta diferença.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-stone-800 text-center">Como separar cada material</h2>
          <p className="mt-2 text-stone-400 text-center max-w-lg mx-auto text-sm">Separar certo garante que os materiais sejam realmente reciclados.</p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((m) => (
              <div key={m.name} className="bg-white rounded-xl border border-stone-100 p-5 hover:border-[#c9d9b5] transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: m.color }}>
                  {m.name.charAt(0)}
                </div>
                <h3 className="mt-3 font-bold text-stone-800">{m.name}</h3>
                <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{m.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#f4f7f0] border border-[#e4ecda] p-6">
            <h3 className="font-bold text-stone-800 text-base mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#6b8f47]" /> Faça assim</h3>
            <ul className="space-y-2.5">
              {doList.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-stone-600">
                  <CheckCircle className="w-4 h-4 text-[#6b8f47] shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-6">
            <h3 className="font-bold text-stone-800 text-base mb-4 flex items-center gap-2"><Recycle className="w-4 h-4 text-red-500" /> Evite</h3>
            <ul className="space-y-2.5">
              {dontList.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-stone-600">
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center text-red-500 font-bold text-xs">✕</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-extrabold text-stone-800">O ciclo da reciclagem</h2>
          <div className="mt-7 grid sm:grid-cols-4 gap-4 text-center">
            {[
              { n: '1', t: 'Separação', d: 'Você separa em casa' },
              { n: '2', t: 'Coleta', d: 'A empresa vai até você' },
              { n: '3', t: 'Triagem', d: 'Materiais separados por tipo' },
              { n: '4', t: 'Nova vida', d: 'Viram matéria-prima de novo' }
            ].map((s) => (
              <div key={s.n}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#4a6741] text-white flex items-center justify-center text-lg font-bold">
                  {s.n}
                </div>
                <h3 className="mt-2.5 font-bold text-stone-800 text-sm">{s.t}</h3>
                <p className="mt-1 text-xs text-stone-400">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-[#364a25] text-white rounded-2xl p-7">
            <h3 className="text-xl font-bold">Bora começar?</h3>
            <p className="mt-1.5 text-white/60 text-sm">Agende uma coleta e mande seus recicláveis pro lugar certo.</p>
            <Link to="/cadastro" className="mt-4 inline-block px-6 py-2.5 rounded-xl bg-white text-[#364a25] font-bold hover:bg-stone-50 transition-colors text-sm">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
