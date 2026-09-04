import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Leaf, Recycle, Truck, MapPin, Calendar, Users, CheckCircle } from '../components/Icons';

const steps = [
  { num: '1', icon: <Users className="w-5 h-5" />, title: 'Crie sua conta', desc: 'Cadastre-se de graça, rápido e sem complicação.' },
  { num: '2', icon: <Recycle className="w-5 h-5" />, title: 'Informe seus materiais', desc: 'Diga o que você tem e a quantidade aproximada.' },
  { num: '3', icon: <MapPin className="w-5 h-5" />, title: 'Confirme o endereço', desc: 'Marque onde a coleta vai acontecer.' },
  { num: '4', icon: <Calendar className="w-5 h-5" />, title: 'Escolha o dia', desc: 'Selecione o melhor horário pra você.' },
  { num: '5', icon: <CheckCircle className="w-5 h-5" />, title: 'Empresa aceita', desc: 'Uma coletora pega a solicitação e confirma.' },
  { num: '6', icon: <Leaf className="w-5 h-5" />, title: 'Acompanhe e recicle', desc: 'Veja tudo em tempo real e ajude o planeta.' }
];

export default function Home() {
  const { role, userCity } = useAuth();
  const scheduleLink = role === 'user' ? '/agendar-coleta' : role === 'company' ? '/empresa/dashboard' : '/cadastro';

  const [stats, setStats] = useState({ companies: 0, collections: 0, totalWeight: '0 kg' });

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#364a25] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center relative">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm font-medium">
              ♻ Plataforma de coleta seletiva
            </span>
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight">
              Reciclar não precisa ser complicado.
            </h1>
            <p className="mt-5 text-lg text-white/75 max-w-lg leading-relaxed">
              Marque uma coleta, sepere o que tem, e uma empresa conectada ao ReciclaJá vai buscar na sua casa.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={scheduleLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#364a25] font-bold hover:bg-stone-50 transition-colors"
              >
                <Calendar className="w-4 h-4" /> Agendar coleta
              </Link>

            </div>
            <div className="mt-10 flex gap-8 max-w-sm">
              <div>
                <p className="text-2xl font-extrabold">{stats.companies}</p>
                <p className="text-sm text-white/50">empresas parceiras</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.collections}</p>
                <p className="text-sm text-white/50">coletas feitas</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.totalWeight}</p>
                <p className="text-sm text-white/50">de materiais</p>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-7 border border-white/10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#6b8f47] flex items-center justify-center text-white text-lg">♻</div>
                <div>
                  <p className="font-semibold text-sm">Coleta agendada!</p>
                  <p className="text-xs text-white/50">Segunda-feira, 25/08 às 13h–17h</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Papelão', qty: '10 kg', color: 'bg-amber-400' },
                  { label: 'Vidro', qty: '5 kg', color: 'bg-sky-400' },
                  { label: 'Plástico', qty: '8 kg', color: 'bg-blue-400' }
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3 bg-white/[0.06] rounded-lg px-4 py-2.5">
                    <span className={`w-2 h-2 rounded-full ${m.color}`} />
                    <span className="flex-1 text-sm font-medium">{m.label}</span>
                    <span className="text-xs text-white/60">{m.qty}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#6b8f47] flex items-center justify-center text-sm">🚚</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold">Recicla Fácil Coletas</p>
                  <p className="text-[11px] text-white/40">a caminho</p>
                </div>
                <Truck className="w-5 h-5 text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg">
            <span className="text-[#6b8f47] font-semibold text-xs uppercase tracking-wider">Como funciona</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-800">Poucos passos, grande impacto</h2>
            <p className="mt-3 text-stone-500 leading-relaxed">Do cadastro à coleta, tudo pensado pra ser rápido.{userCity && ` Disponível em ${userCity}.`}</p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {steps.map((s) => (
              <div key={s.num} className="relative bg-white rounded-xl p-5 border border-stone-100 hover:border-[#c9d9b5] transition-colors group">
                <span className="absolute top-3 right-4 text-4xl font-extrabold text-stone-100 group-hover:text-[#e4ecda] transition-colors">{s.num}</span>
                <div className="w-10 h-10 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center">{s.icon}</div>
                <h3 className="mt-3 font-bold text-stone-800">{s.title}</h3>
                <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to={scheduleLink} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4a6741] text-white font-bold hover:bg-[#364a25] transition-colors">
              <Calendar className="w-4 h-4" /> Começar agora
            </Link>
          </div>
        </div>
      </section>

      {/* Para quem quer reciclar / Para empresas */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10">
            <span className="text-[#6b8f47] font-semibold text-xs uppercase tracking-wider">Para todos</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-800">Funciona pra quem quer reciclar e pra quem coleta</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-[#364a25] text-white p-7">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl">♻</div>
              <h3 className="mt-4 text-xl font-bold">Pra quem quer reciclar</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a6bf87]" /> Agende em minutos, sem burocracia</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a6bf87]" /> Cadastre vários endereços</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a6bf87]" /> Veja no mapa onde vai ser a coleta</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a6bf87]" /> Acompanhe o status de cada coleta</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#a6bf87]" /> Receba notificações a cada etapa</li>
              </ul>
              <Link to="/cadastro/usuario" className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-white text-[#364a25] font-bold hover:bg-stone-50 transition-colors text-sm">
                Criar conta de usuário
              </Link>
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 p-7">
              <div className="w-12 h-12 rounded-xl bg-[#f4f7f0] text-[#537236] flex items-center justify-center text-xl">🚚</div>
              <h3 className="mt-4 text-xl font-bold text-stone-800">Pra empresas coletoras</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-stone-600">
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6b8f47]" /> Receba pedidos da sua região</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6b8f47]" /> Visualize endereços no mapa</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6b8f47]" /> Filtre por data, cidade e material</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6b8f47]" /> Planeje rotas de coleta fácil</li>
                <li className="flex gap-2.5"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6b8f47]" /> Dashboard e agenda completos</li>
              </ul>
              <Link to="/cadastro/empresa" className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-[#4a6741] text-white font-bold hover:bg-[#364a25] transition-colors text-sm">
                Cadastrar minha empresa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#f4f7f0]">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-800">Bora reciclar?</h2>
          <p className="mt-3 text-stone-500 text-lg">Agende sua primeira coleta hoje. É rápido, de graça e faz diferença.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to={scheduleLink} className="px-6 py-3 rounded-xl bg-[#4a6741] text-white font-bold hover:bg-[#364a25] transition-colors">
              Agendar coleta
            </Link>
            <Link to="/login" className="px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors">
              Entrar na plataforma
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
