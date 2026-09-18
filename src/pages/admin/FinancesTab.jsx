import { useMemo } from 'react'
import { Trash2, TrendingUp, TrendingDown, Wallet, Zap } from 'lucide-react'

const PAYMENT_TYPE_LABELS = { deposit: 'Seña', full: 'Total' }

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className={`w-10 h-10 ${tone} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function FinancesTab({
  expenses, expenseForm, setExpenseForm, onAddExpense, onDeleteExpense,
  reservations, events, users,
  totalRevenue, totalManualIncome, totalExpenses, netRevenue,
}) {
  const movements = useMemo(() => {
    const auto = reservations
      .filter(r => r.status === 'paid' || r.status === 'deposit_paid')
      .map(r => {
        const ev = events.find(e => e.id === r.eventId)
        const stand = ev?.stands.find(s => s.id === r.standId)
        const user = users.find(u => u.id === r.userId)
        return {
          id: `res-${r.id}`,
          date: r.paidAt || r.createdAt,
          description: `Stand ${stand?.number ?? r.standId} — ${r.standName}${user ? ` (${user.name} ${user.lastName})` : ''}`,
          amount: r.amount,
          kind: 'income',
          source: 'auto',
          paymentType: r.paymentType || 'full',
        }
      })

    const manual = (expenses || []).map(e => ({
      id: `exp-${e.id}`,
      rawId: e.id,
      date: e.created_at,
      description: e.description,
      amount: Number(e.amount),
      kind: e.type === 'income' ? 'income' : 'expense',
      source: 'manual',
    }))

    return [...auto, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [reservations, events, users, expenses])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos por reservas" value={`$${totalRevenue.toLocaleString('es-AR')}`} icon={Zap} tone="text-violet-600 bg-violet-50" />
        <StatCard label="Ingresos manuales" value={`$${totalManualIncome.toLocaleString('es-AR')}`} icon={TrendingUp} tone="text-emerald-600 bg-emerald-50" />
        <StatCard label="Egresos" value={`-$${totalExpenses.toLocaleString('es-AR')}`} icon={TrendingDown} tone="text-red-600 bg-red-50" />
        <StatCard label="Saldo neto" value={`$${netRevenue.toLocaleString('es-AR')}`} icon={Wallet} tone="text-blue-600 bg-blue-50" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Registrar movimiento manual</h2>
        <p className="text-xs text-gray-400 mb-4">Para plata que no viene de una reserva de stand (ej: sponsors, alquiler, publicidad).</p>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button type="button" onClick={() => setExpenseForm({ ...expenseForm, type: 'income' })}
                className={`flex-1 py-2 text-sm font-semibold transition ${expenseForm.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                Ingreso
              </button>
              <button type="button" onClick={() => setExpenseForm({ ...expenseForm, type: 'expense' })}
                className={`flex-1 py-2 text-sm font-semibold transition ${expenseForm.type !== 'income' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                Egreso
              </button>
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Ej: Alquiler de salón, Sponsor..." />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" placeholder="0" />
          </div>
          <button onClick={onAddExpense}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium transition text-white ${expenseForm.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            Registrar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-gray-800">Movimientos</h3>
          <p className="text-xs text-gray-400">Incluye lo automático (reservas marcadas como pagadas o con seña) y lo cargado a mano.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-900">Fecha</th>
                <th className="px-6 py-3 font-medium text-gray-900">Descripción</th>
                <th className="px-6 py-3 font-medium text-gray-900">Origen</th>
                <th className="px-6 py-3 font-medium text-gray-900 text-right">Monto</th>
                <th className="px-6 py-3 font-medium text-gray-900 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 whitespace-nowrap">{m.date ? new Date(m.date).toLocaleDateString('es-AR') : '-'}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{m.description}</td>
                  <td className="px-6 py-3.5">
                    {m.source === 'auto' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        <Zap size={10} /> Auto · {PAYMENT_TYPE_LABELS[m.paymentType]}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Manual</span>
                    )}
                  </td>
                  <td className={`px-6 py-3.5 text-right font-bold ${m.kind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.kind === 'income' ? '+' : '-'}${m.amount.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {m.source === 'manual' && (
                      <button onClick={() => onDeleteExpense({ id: m.rawId, description: m.description })} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Todavía no hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
