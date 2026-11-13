// Titulo: AddressFields
// Autor: Mateus Martins Peres
// Finalidade: Componente React responsavel por AddressFields.
import { useState } from 'react';

export default function AddressFields({ values, onChange, required = true }) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition text-sm';

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocalização não suportada neste navegador.');
      return;
    }
    setGeoLoading(true);
    setGeoStatus('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`,
            { headers: { 'User-Agent': 'ReciclaJa/1.0 (reciclagem app)' } }
          );
          const data = await res.json();
          if (data && data.address) {
            const a = data.address;
            if (a.road) onChange('street', a.road);
            if (a.house_number) onChange('number', a.house_number);
            if (a.suburb || a.neighbourhood) onChange('neighborhood', a.suburb || a.neighbourhood);
            if (a.city || a.town || a.village) onChange('city', a.city || a.town || a.village);
            if (a.state) onChange('state', a.state);
            if (a.postcode) onChange('cep', a.postcode.replace(/\D/g, '').slice(0, 8));
            setGeoStatus('Endereço preenchido pela localização!');
            setTimeout(() => setGeoStatus(null), 3000);
          } else {
            setGeoStatus('Não foi possível identificar o endereço. Preencha manualmente.');
            setTimeout(() => setGeoStatus(null), 4000);
          }
        } catch {
          setGeoStatus('Erro ao consultar o endereço. Tente novamente.');
          setTimeout(() => setGeoStatus(null), 4000);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setGeoStatus(`O navegador bloqueia o GPS em endereços http que não são localhost (você está em ${window.location.origin}). Acesse pelo computador via http://localhost:5173, ou por um endereço https://, ou preencha o endereço manualmente.`);
          } else {
            setGeoStatus('Permissão de localização negada. Clique no cadeado ao lado do endereço no navegador → Localização → Permitir, depois tente de novo.');
          }
        } else if (err.code === 2) {
          setGeoStatus('Localização indisponível. Tente novamente.');
        } else {
          setGeoStatus('Tempo esgotado. Verifique sua conexão.');
        }
        setTimeout(() => setGeoStatus(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
        </svg>
        {geoLoading ? 'Obtendo localização...' : 'Usar minha localização (GPS)'}
      </button>
      {geoStatus && (
        <p className="mb-3 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">{geoStatus}</p>
      )}
      { }
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
          <input
            className={inputClass}
            value={values.cep}
            required={required}
            onChange={(e) => onChange('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
          <input
            className={inputClass}
            maxLength={2}
            value={values.state}
            required={required}
            onChange={(e) => onChange('state', e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
          <input
            className={inputClass}
            value={values.city}
            required={required}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
          <input
            className={inputClass}
            value={values.neighborhood}
            required={required}
            onChange={(e) => onChange('neighborhood', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Rua</label>
          <input
            className={inputClass}
            value={values.street}
            required={required}
            onChange={(e) => onChange('street', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
          <input
            className={inputClass}
            value={values.number}
            required={required}
            onChange={(e) => onChange('number', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
          <input
            className={inputClass}
            value={values.complement}
            onChange={(e) => onChange('complement', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}