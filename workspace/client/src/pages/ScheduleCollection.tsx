import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import type { Address, MaterialItem } from '../types';
import MapView from '../components/MapView';
import AddressFields from '../components/AddressFields';
import { Recycle, MapPin, Calendar, Clock, CheckCircle, Plus, Trash2 } from '../components/Icons';

const MATERIAL_OPTIONS = ['Papel', 'Papelão', 'Plástico', 'Vidro', 'Metal', 'Eletrônicos', 'Óleo de cozinha', 'Outros'];
const PERIODS = ['08:00 às 12:00', '13:00 às 17:00', '18:00 às 20:00'];

export default function ScheduleCollection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const welcome = (location.state as any)?.welcome;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | ''>('');
  const [materials, setMaterials] = useState<MaterialItem[]>([{ type: '', quantity: 0 }]);
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    api<{ addresses: Address[] }>('/users/me').then((d) => {
      setAddresses(d.addresses);
      if (d.addresses.length) setSelectedAddress(d.addresses[0].id);
    }).catch(() => {});
  }, []);

  function startEditAddress(addr: Address) {
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
  }

  function cancelEdit() {
    setEditingAddress(null);
    setEditForm({});
  }

  async function saveEditAddress() {
    if (!editingAddress) return;
    setEditLoading(true);
    try {
      const data = await api<{ message: string; address: Address }>(`/users/addresses/${editingAddress}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setAddresses((prev) => prev.map((a) => a.id === editingAddress ? { ...a, ...data.address } : a));
      cancelEdit();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar endereço');
    } finally {
      setEditLoading(false);
    }
  }

  function openGoogleMaps(addr: Address) {
    const query = `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}, ${addr.cep}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  }

  const currentAddress = addresses.find((a) => a.id === selectedAddress);

  function addMaterial() {
    setMaterials((prev) => [...prev, { type: '', quantity: 0 }]);
  }

  function updateMaterial(idx: number, field: 'type' | 'quantity', value: string | number) {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  function removeMaterial(idx: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== idx));
  }

  const mapMarkers = currentAddress?.latitude && currentAddress?.longitude
    ? [{
        latitude: currentAddress.latitude,
        longitude: currentAddress.longitude,
        label: 'Seu endereço',
        popup: (
          <div>
            <strong>{currentAddress.label}</strong>
            <p>{currentAddress.street}, {currentAddress.number} - {currentAddress.neighborhood}</p>
            <p>{currentAddress.city}/{currentAddress.state} · CEP {currentAddress.cep}</p>
          </div>
        )
      }]
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validMaterials = materials.filter((m) => m.type && Number(m.quantity) > 0);
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
      const data = await api<{ collection: any }>('/collections', {
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
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar coleta');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e4ecda] text-[#4a6741] flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-stone-800">Coleta solicitada!</h2>
          <p className="mt-2 text-sm text-stone-500">Uma empresa vai ser notificada. Acompanhe em "Minhas Coletas".</p>
          <Link to="/minhas-coletas" className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-[#4a6741] text-white font-semibold hover:bg-[#364a25] transition-colors text-sm">
            Ver minhas coletas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf8f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-stone-800">Agendar Coleta</h1>
          <p className="mt-1 text-sm text-stone-500">Solicite a coleta dos seus recicláveis em poucos passos</p>
          {welcome && (
            <div className="mt-3 bg-[#f4f7f0] border border-[#e4ecda] text-[#364a25] rounded-xl px-3 py-2.5 text-sm font-medium">
              Bem-vindo(a), {user?.name?.split(' ')[0]}! Agende sua primeira coleta agora.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <section className="bg-white rounded-xl border border-stone-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center"><Recycle className="w-4 h-4" /></div>
                  <div>
                    <h2 className="font-semibold text-stone-800 text-sm">Materiais</h2>
                    <p className="text-xs text-stone-400">Selecione o tipo e a quantidade</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {materials.map((m, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={m.type}
                        onChange={(e) => updateMaterial(idx, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-stone-200 focus:border-[#6b8f47] outline-none text-sm bg-white"
                      >
                        <option value="">Material</option>
                        {MATERIAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={m.quantity || ''}
                          onChange={(e) => updateMaterial(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:border-[#6b8f47] outline-none text-sm"
                        />
                        <span className="absolute right-2 top-2 text-xs text-stone-400">kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMaterial(idx)}
                        disabled={materials.length === 1}
                        className="w-9 h-9 rounded-lg bg-red-50 text-red-400 flex items-center justify-center disabled:opacity-25 hover:bg-red-100 transition-colors"
                        aria-label="Remover material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addMaterial} className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#6b8f47] hover:text-[#537236]">
                  <Plus className="w-3.5 h-3.5" /> Adicionar material
                </button>
              </section>

              <section className="bg-white rounded-xl border border-stone-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#f4f7f0] text-[#537236] flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
                  <div>
                    <h2 className="font-semibold text-stone-800 text-sm">Data e horário</h2>
                    <p className="text-xs text-stone-400">Quando quer receber a coleta</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Data</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none text-sm"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Período</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PERIODS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          period === p
                            ? 'bg-[#4a6741] border-[#4a6741] text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-[#a6bf87]'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" /> {p}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl border border-stone-100 p-5">
                <h2 className="font-semibold text-stone-800 text-sm mb-2">Observações</h2>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Os materiais vão estar na garagem."
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-200 focus:border-[#6b8f47] focus:ring-1 focus:ring-[#c9d9b5] outline-none text-sm resize-none"
                />
              </section>
            </div>

            <div className="space-y-5">
              <section className="bg-white rounded-xl border border-stone-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
                  <div>
                    <h2 className="font-semibold text-stone-800 text-sm">Endereço da coleta</h2>
                    <p className="text-xs text-stone-400">Onde a empresa vai buscar</p>
                  </div>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-sm text-stone-400 mb-2">Nenhum endereço cadastrado.</p>
                    <Link to="/perfil" className="text-xs font-semibold text-[#6b8f47] hover:underline">Adicionar no perfil</Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {addresses.map((a) => (
                        <div key={a.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedAddress(a.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                              selectedAddress === a.id
                                ? 'border-[#6b8f47] bg-[#f4f7f0]'
                                : 'border-stone-200 hover:border-[#c9d9b5]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-stone-800">{a.label}</span>
                              <div className="flex items-center gap-1.5">
                                {a.is_default === 1 && <span className="text-[10px] font-bold text-[#537236] bg-[#e4ecda] px-1.5 py-0.5 rounded-full">PADRÃO</span>}
                                {selectedAddress === a.id && editingAddress !== a.id && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); startEditAddress(a); }}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {a.street}, {a.number} - {a.neighborhood}, {a.city}/{a.state}
                            </p>
                            <p className="text-[11px] text-stone-400">CEP {a.cep}{a.complement && ` · ${a.complement}`}</p>
                          </button>

                          {selectedAddress === a.id && editingAddress === a.id && (
                            <div className="mt-2 p-3.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-blue-800">Editar endereço</span>
                                <button type="button" onClick={cancelEdit} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                                  Cancelar
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-stone-600 mb-0.5">Nome</label>
                                <input
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 focus:border-blue-500 outline-none text-sm"
                                  value={editForm.label || ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                                />
                              </div>
                              <AddressFields values={editForm} onChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))} />
                              <button
                                type="button"
                                onClick={saveEditAddress}
                                disabled={editLoading}
                                className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {editLoading ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentAddress && (
                      <div className="mt-3.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-600">Localização no mapa</span>
                          <span className="text-[11px] text-stone-400">{currentAddress.neighborhood}</span>
                        </div>
                        <MapView
                          markers={mapMarkers}
                          center={currentAddress.latitude && currentAddress.longitude ? [currentAddress.latitude, currentAddress.longitude] : undefined}
                          height="240px"
                        />
                        {!currentAddress.latitude && (
                          <p className="text-[11px] text-amber-600 mt-1.5">Localização aproximada indisponível.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(currentAddress)}
                          className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          Abrir no Google Maps
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</div>}

              <div className="bg-[#364a25] text-white rounded-xl p-5">
                <h3 className="font-bold text-sm">Resumo</h3>
                <div className="mt-2.5 space-y-1 text-xs">
                  <p><span className="text-white/50">Materiais:</span> {materials.filter((m) => m.type).length || 0} tipo(s)</p>
                  <p><span className="text-white/50">Endereço:</span> {currentAddress ? `${currentAddress.street}, ${currentAddress.number}` : 'Selecione'}</p>
                  <p><span className="text-white/50">Data:</span> {date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'Escolha'}</p>
                  <p><span className="text-white/50">Período:</span> {period || 'Escolha'}</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full py-2.5 rounded-lg bg-white text-[#364a25] font-semibold hover:bg-stone-50 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Solicitando...' : 'Solicitar Coleta'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
