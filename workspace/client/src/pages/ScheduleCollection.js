// Titulo: ScheduleCollection
// Autor: Mateus Martins Peres
// Finalidade: Pagina React responsavel por ScheduleCollection.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import MapView from '../components/MapView';
import AddressFields from '../components/AddressFields';
import { Recycle, MapPin, Calendar, Clock, CheckCircle, Plus, Trash2, Package, Leaf, ArrowRight, Truck } from '../components/Icons';

const MATERIAL_OPTIONS = ['Papel', 'Papelão', 'Plástico', 'Vidro', 'Metal', 'Eletrônicos', 'Óleo de cozinha', 'Outros'];
const PERIODS = ['08:00 às 12:00', '13:00 às 17:00', '18:00 às 20:00'];

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:border-[#6b8f47] focus:ring-2 focus:ring-[#c9d9b5]/40 outline-none transition-all text-sm';
const cardClass = 'bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_3px_rgb(0_0_0/0.04),0_8px_24px_-16px_rgb(54_74_37/0.15)] p-5 sm:p-6';

function StepHeader({ icon, step, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#537236] to-[#415a2b] text-white flex items-center justify-center shadow-[0_4px_12px_-4px_rgb(83_114_54/0.5)]">
        {icon}
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#e4ecda] text-[#415a2b] text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white">
          {step}
        </span>
      </div>
      <div>
        <h2 className="font-bold text-stone-800 text-[15px] leading-tight">{title}</h2>
        <p className="text-xs text-stone-400">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ScheduleCollection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const welcome = location.state?.welcome;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [materials, setMaterials] = useState([{ type: '', quantity: 0 }]);
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [editCoords, setEditCoords] = useState(null);
  const [locationToast, setLocationToast] = useState('');

  useEffect(() => {
    api('/users/me').then((d) => {
      setAddresses(d.addresses);
      if (d.addresses.length) setSelectedAddress(d.addresses[0].id);
    }).catch(() => {});
  }, []);

  function startEditAddress(addr) {
    setEditingAddress(addr.id);
    setEditForm({
      label: addr.label,
      cep: addr.cep,
      state: addr.state,
      city: addr.city,
      neighborhood: addr.neighborhood,
      street: addr.street,
      number: addr.number,
      complement: addr.complement || ''
    });

    setEditCoords(
      addr.latitude && addr.longitude
        ? { latitude: addr.latitude, longitude: addr.longitude }
        : null
    );
  }

  function cancelEdit() {
    setEditingAddress(null);
    setEditForm({});
    setEditCoords(null);
  }

  async function saveEditAddress() {
    if (!editingAddress) return;
    setEditLoading(true);
    try {
      const body = editCoords
        ? { ...editForm, latitude: editCoords.latitude, longitude: editCoords.longitude }
        : editForm;
      const data = await api(`/users/addresses/${editingAddress}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      setAddresses((prev) => prev.map((a) => a.id === editingAddress ? { ...a, ...data.address } : a));
      cancelEdit();
    } catch (err) {
      alert(err.message || 'Erro ao salvar endereço');
    } finally {
      setEditLoading(false);
    }
  }

  function openGoogleMaps(addr) {
    const query = `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}, ${addr.cep}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  }

  const currentAddress = addresses.find((a) => a.id === selectedAddress);
  const editingAddressObj = addresses.find((a) => a.id === editingAddress);

  function addMaterial() {
    setMaterials((prev) => [...prev, { type: '', quantity: 0 }]);
  }

  function updateMaterial(idx, field, value) {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  function removeMaterial(idx) {
    setMaterials((prev) => prev.filter((_, i) => i !== idx));
  }

  const editMapMarkers = editCoords
    ? [{
        latitude: editCoords.latitude,
        longitude: editCoords.longitude,
        label: 'Seu endereço'
      }]
    : editingAddressObj && editingAddressObj.latitude && editingAddressObj.longitude
      ? [{
          latitude: editingAddressObj.latitude,
          longitude: editingAddressObj.longitude,
          label: editingAddressObj.label || 'Seu endereço'
        }]
      : [];

  function formatDateBR(iso) {
    if (!iso) return 'Escolha';
    return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  const validMaterials = materials.filter((m) => m.type && Number(m.quantity) > 0);
  const totalKg = validMaterials.reduce((sum, m) => sum + Number(m.quantity || 0), 0);

  function isTomorrow(iso) {
    if (!iso) return false;
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return iso === t.toISOString().split('T')[0];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (validMaterials.length === 0) {
      setError('Adicione ao menos um material com quantidade');
      return;
    }
    if (!selectedAddress) {
      setError('Selecione um endereço');
      return;
    }
    if (!date) {
      setError('Escolha a data');
      return;
    }
    if (!period) {
      setError('Escolha um período');
      return;
    }
    setLoading(true);
    try {
      const data = await api('/collections', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddress,
          materials: validMaterials,
          date,
          period,
          observations
        })
      });
      setSuccess(data.collection.id);
      setTimeout(() => navigate('/minhas-coletas'), 1800);
    } catch (err) {
      setError(err.message || 'Erro ao solicitar coleta');
    } finally {
      setLoading(false);
    }
  }

  async function savePickedLocation() {
    if (!currentAddress || !editCoords || editLoading) return;
    setEditLoading(true);
    try {
      const body = {
        label: currentAddress.label,
        cep: currentAddress.cep,
        state: currentAddress.state,
        city: currentAddress.city,
        neighborhood: currentAddress.neighborhood,
        street: currentAddress.street,
        number: currentAddress.number,
        complement: currentAddress.complement || '',
        latitude: editCoords.latitude,
        longitude: editCoords.longitude
      };
      const d = await api(`/users/addresses/${currentAddress.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      setAddresses((prev) => prev.map((a) => (a.id === currentAddress.id ? { ...a, ...d.address } : a)));
      setLocationToast('Localização salva com sucesso!');
      setTimeout(() => setLocationToast(''), 3000);
    } catch (err) {
      setLocationToast(err.message || 'Erro ao salvar localização');
      setTimeout(() => setLocationToast(''), 4000);
    } finally {
      setEditLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-[#faf8f5]">
        <div className="text-center max-w-sm bg-white rounded-3xl border border-stone-200/70 shadow-[0_20px_60px_-20px_rgb(54_74_37/0.25)] p-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#e4ecda] to-[#c9d9b5] text-[#415a2b] flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-stone-800">Coleta solicitada!</h2>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Empresas da sua região foram notificadas.<br />
            Você será redirecionado em instantes...
          </p>
          <div className="mt-5 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#6b8f47] to-[#84a55e] animate-pulse" />
          </div>
          <Link to="/minhas-coletas" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-all shadow-[0_4px_14px_-4px_rgb(74_103_65/0.5)] text-sm">
            Ver minhas coletas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#f4f7f0]/60 to-[#faf8f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-7">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#537236] to-[#364a25] text-white flex items-center justify-center shadow-[0_6px_16px_-6px_rgb(83_114_54/0.6)]">
              <Recycle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">Agendar Coleta</h1>
              <p className="text-sm text-stone-500">Solicite a coleta dos seus recicláveis em 4 passos</p>
            </div>
          </div>
          {welcome && (
            <div className="mt-4 bg-gradient-to-r from-[#f4f7f0] to-[#eef4e6] border border-[#c9d9b5] text-[#364a25] rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2.5">
              <Leaf className="w-4 h-4 shrink-0" />
              Bem-vindo(a), {user?.name?.split(' ')[0]}! Agende sua primeira coleta agora.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <section className={cardClass}>
                <StepHeader icon={<Recycle className="w-5 h-5" />} step={1} title="Materiais" subtitle="O que você quer descartar?" />
                <div className="space-y-2.5">
                  {materials.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-stretch">
                      <select
                        value={m.type}
                        onChange={(e) => updateMaterial(idx, 'type', e.target.value)}
                        className={`${inputClass} flex-1 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center] pr-9`}
                      >
                        <option value="">Selecione o material</option>
                        {MATERIAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="relative w-24 shrink-0">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={m.quantity || ''}
                          onChange={(e) => updateMaterial(idx, 'quantity', Number(e.target.value))}
                          className={`${inputClass} pr-7`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none font-medium">kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMaterial(idx)}
                        disabled={materials.length === 1}
                        className="w-11 shrink-0 rounded-xl bg-red-50 text-red-400 flex items-center justify-center disabled:opacity-30 hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all border border-red-100/60"
                        aria-label="Remover material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {validMaterials.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#415a2b] bg-[#f4f7f0] rounded-xl px-3 py-2">
                    <Package className="w-3.5 h-3.5" />
                    {validMaterials.length} tipo(s) · ~{totalKg} kg no total
                  </div>
                )}
                <button type="button" onClick={addMaterial} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#6b8f47] hover:text-[#537236] hover:gap-2.5 transition-all">
                  <span className="w-5 h-5 rounded-full bg-[#e4ecda] flex items-center justify-center"><Plus className="w-3 h-3" /></span>
                  Adicionar outro material
                </button>
              </section>

              <section className={cardClass}>
                <StepHeader icon={<Calendar className="w-5 h-5" />} step={2} title="Data e horário" subtitle="Quando podemos passar aí?" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Data</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={inputClass}
                    />
                    {isTomorrow(date) && (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-600">⚡ Coleta para amanhã — empresas podem demorar a aceitar</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Período</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PERIODS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPeriod(p)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98] ${
                            period === p
                              ? 'bg-[#4a6741] border-[#4a6741] text-white shadow-[0_4px_12px_-4px_rgb(74_103_65/0.5)]'
                              : 'bg-stone-50/60 border-stone-200 text-stone-600 hover:border-[#a6bf87] hover:bg-[#f4f7f0]/60'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" /> {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className={cardClass}>
                <StepHeader icon={<Package className="w-5 h-5" />} step={3} title="Observações" subtitle="Algo que a empresa deva saber?" />
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Os materiais vão estar na garagem, portão azul."
                  className={`${inputClass} resize-none leading-relaxed`}
                />
              </section>
            </div>

            <div className="space-y-5">
              <section className={cardClass}>
                <StepHeader icon={<MapPin className="w-5 h-5" />} step={4} title="Endereço da coleta" subtitle="Onde vamos buscar os materiais" />
                {addresses.length === 0 ? (
                  <div className="text-center py-6 bg-[#f4f7f0]/50 rounded-2xl border border-dashed border-[#c9d9b5]">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e4ecda] text-[#537236] flex items-center justify-center mb-2">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-stone-500 mb-3">Nenhum endereço cadastrado.</p>
                    <Link to="/perfil" className="inline-block text-xs font-bold text-[#6b8f47] bg-white border border-[#c9d9b5] rounded-full px-4 py-1.5 hover:bg-[#f4f7f0] transition-colors">Adicionar no perfil</Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {addresses.map((a) => (
                        <div key={a.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedAddress(a.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedAddress(a.id); }}
                            className={`w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                              selectedAddress === a.id
                                ? 'border-[#6b8f47] bg-[#f4f7f0] shadow-[0_2px_10px_-4px_rgb(83_114_54/0.35)]'
                                : 'border-stone-200 hover:border-[#c9d9b5] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${selectedAddress === a.id ? 'border-[#537236] bg-[#537236]' : 'border-stone-300'}`}>
                                  {selectedAddress === a.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                                <span className="text-sm font-bold text-stone-800 truncate">{a.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {a.is_default === 1 && <span className="text-[10px] font-extrabold text-[#537236] bg-[#e4ecda] px-2 py-0.5 rounded-full">PADRÃO</span>}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); startEditAddress(a); }}
                                  className="text-xs font-semibold text-stone-500 hover:text-[#537236] hover:bg-[#e4ecda]/60 px-2 py-0.5 rounded-full transition-colors"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-stone-600 mt-1 ml-6">
                              {a.street}, {a.number} - {a.neighborhood}, {a.city}/{a.state}
                            </p>
                            <p className="text-[11px] text-stone-400 ml-6">CEP {a.cep}{a.complement && ` · ${a.complement}`}</p>
                          </div>

                          {selectedAddress === a.id && editingAddress === a.id && (
                            <div className="mt-2 p-4 rounded-2xl bg-gradient-to-b from-[#eef4fb] to-white border-2 border-blue-200/70 space-y-3 shadow-inner">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-blue-900">Editar endereço</span>
                                <button type="button" onClick={cancelEdit} className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors">
                                  Cancelar
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-stone-600 mb-1">Nome do endereço</label>
                                <input
                                  className={inputClass}
                                  value={editForm.label || ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                                />
                              </div>
                              <AddressFields values={editForm} onChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))} />

                              <div className="pt-1">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-bold text-stone-600">Ajustar localização no mapa</span>
                                  <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">opcional</span>
                                </div>
                                {editCoords ? (
                                  <div className="mb-2 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={savePickedLocation}
                                      disabled={editLoading}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#4a6741] text-white text-xs font-bold hover:bg-[#364a25] transition-colors disabled:opacity-60"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      {editLoading ? 'Salvando...' : 'Salvar esta localização'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditCoords(
                                        editingAddressObj?.latitude && editingAddressObj?.longitude
                                          ? { latitude: editingAddressObj.latitude, longitude: editingAddressObj.longitude }
                                          : null
                                      )}
                                      className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold hover:bg-stone-200 transition-colors"
                                    >
                                      Desfazer
                                    </button>
                                  </div>
                                ) : null}
                                <MapView
                                  markers={editMapMarkers}
                                  center={
                                    editCoords
                                      ? [editCoords.latitude, editCoords.longitude]
                                      : editingAddressObj?.latitude && editingAddressObj?.longitude
                                        ? [editingAddressObj.latitude, editingAddressObj.longitude]
                                        : undefined
                                  }
                                  height="220px"
                                  onPositionChange={(lat, lng) =>
                                    setEditCoords({ latitude: lat, longitude: lng })
                                  }
                                />
                                <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                                  {editCoords
                                    ? '📍 Posição ajustada! Salve para confirmar o ponto de coleta.'
                                    : 'Clique no mapa ou arraste o pin para ajustar o ponto de coleta.'}
                                  <br />
                                  Se não ajustar, usamos a localização aproximada do CEP.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={saveEditAddress}
                                disabled={editLoading}
                                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-[0_4px_12px_-4px_rgb(37_99_235/0.5)]"
                              >
                                {editLoading ? 'Salvando...' : 'Salvar endereço'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentAddress && (
                      <p className="text-[11px] text-stone-400 mt-3">
                        Endereço errado? Toque em "Editar" acima para corrigir ou ajustar o pin no mapa.
                      </p>
                    )}
                  </>
                )}
              </section>

              {error && (
                <div className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  {error}
                </div>
              )}
              {locationToast && (
                <div className="text-sm font-medium text-[#364a25] bg-[#f4f7f0] border border-[#c9d9b5] rounded-2xl px-4 py-3">{locationToast}</div>
              )}

              <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#415a2b] to-[#2d3e20] text-white shadow-[0_16px_40px_-16px_rgb(45_62_32/0.6)]">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#c9d9b5]" /> Resumo da coleta
                </h3>
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Materiais</span>
                    <span className="font-semibold text-right">{validMaterials.length > 0 ? `${validMaterials.length} tipo(s) · ~${totalKg} kg` : '—'}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Endereço</span>
                    <span className="font-semibold text-right truncate">{currentAddress ? `${currentAddress.street}, ${currentAddress.number}` : '—'}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Data</span>
                    <span className="font-semibold text-right">{formatDateBR(date)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Período</span>
                    <span className="font-semibold text-right">{period || '—'}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full py-3.5 min-h-12 rounded-xl bg-white text-[#2d3e20] font-extrabold hover:bg-[#f4f7f0] active:scale-[0.99] transition-all disabled:opacity-60 shadow-lg flex items-center justify-center gap-2 group"
                >
                  {loading ? 'Solicitando...' : 'Confirmar coleta'}
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
