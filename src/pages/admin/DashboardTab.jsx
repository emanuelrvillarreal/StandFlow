import { Clock, CheckCircle, Map, TrendingUp } from 'lucide-react'
import { formatEventDate } from '../../lib/formatEventDate'

export default function DashboardTab({
  events, reservations, categories,
  totalPending, totalDeposit, totalPaid, totalAvailable,
  totalPendingAmount = 0, totalDepositRemaining = 0,
  totalRevenue, totalExpenses, netRevenue, navigate,
}) {
  const money = n => `$${n.toLocaleString('es-AR')}`
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Pendientes', value: totalPending, icon: Clock, color: 'text-yellow-600 bg-yellow-50', sub: totalPendingAmount > 0 ? `Faltan ${money(totalPendingAmount)}` : null },
          { label: 'Señas Pagas', value: totalDeposit, icon: CheckCircle, color: 'text-orange-600 bg-orange-50', sub: totalDepositRemaining > 0 ? `Faltan ${money(totalDepositRemaining)}` : null },
          { label: 'Pagados', value: totalPaid, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Disponibles', value: totalAvailable, icon: Map, color: 'text-blue-600 bg-blue-50' },
          { label: 'Ingresos', value: money(totalRevenue), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Egresos', value: `-${money(totalExpenses)}`, icon: TrendingUp, color: 'text-red-600 bg-red-50' },
          { label: 'Saldo Neto', value: money(netRevenue), icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-5">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            {stat.sub && <p className="text-xs font-semibold text-red-500 mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="font-bold text-gray-800 mb-4">Distribución por categoría</h3>
        <div className="space-y-3">
          {categories.map(cat => {
            const count = reservations.filter(r => r.categoryId === cat.id).length
            const total = reservations.length || 1
            return (
              <div key={cat.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <span className="text-gray-500">{count} reservas</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(count / total) * 100}%`, background: cat.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="font-bold text-gray-800 mb-4">Resumen por evento</h3>
        <div className="space-y-3">
          {events.map(ev => {
            const evRes = reservations.filter(r => r.eventId === ev.id)
            return (
              <div key={ev.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{ev.name}</p>
                  <p className="text-xs text-gray-400">{formatEventDate(ev, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-3 text-xs text-right">
                  <span className="text-yellow-600">{evRes.filter(r => r.status === 'pending').length} pend.</span>
                  <span className="text-green-600">{evRes.filter(r => r.status === 'paid').length} pag.</span>
                  <button onClick={() => navigate(`/events/${ev.id}/map`)}
                    className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg hover:bg-violet-200 transition">
                    Ver mapa
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
