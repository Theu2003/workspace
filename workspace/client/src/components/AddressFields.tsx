interface AddressFieldsProps {
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  required?: boolean;
}

export default function AddressFields({ values, onChange, required = true }: AddressFieldsProps) {
  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition text-sm';
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
        <input
          className={inputClass}
          placeholder="00000-000"
          value={values.cep}
          required={required}
          onChange={(e) => onChange('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
        <input
          className={inputClass}
          placeholder="SP"
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
          placeholder="São Paulo"
          value={values.city}
          required={required}
          onChange={(e) => onChange('city', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
        <input
          className={inputClass}
          placeholder="Centro"
          value={values.neighborhood}
          required={required}
          onChange={(e) => onChange('neighborhood', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Rua</label>
        <input
          className={inputClass}
          placeholder="Av. Exemplo"
          value={values.street}
          required={required}
          onChange={(e) => onChange('street', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
        <input
          className={inputClass}
          placeholder="123"
          value={values.number}
          required={required}
          onChange={(e) => onChange('number', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
        <input
          className={inputClass}
          placeholder="Apto, casa, bloco..."
          value={values.complement}
          onChange={(e) => onChange('complement', e.target.value)}
        />
      </div>
    </div>
  );
}
