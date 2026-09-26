const STATUS_COLORS = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  aceita: 'bg-blue-100 text-blue-800 border-blue-200',
  agendada: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  em_coleta: 'bg-purple-100 text-purple-800 border-purple-200',
  concluida: 'bg-green-100 text-green-800 border-green-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
  recusada: 'bg-gray-100 text-gray-700 border-gray-200'
};

export default function StatusBadge({ status, label }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label || status}
    </span>
  );
}