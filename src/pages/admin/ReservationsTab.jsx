import { useState } from 'react'
import { Filter, Download, Eye, CheckCircle, XCircle, Clock, Trash2, MessageCircle, Users2, MoreVertical, AlertTriangle, Unlock } from 'lucide-react'
import { STATUS_LABELS, STATUS_STYLES, exportCSV } from './adminHelpers'
import { formatDateTime } from '../../lib/formatDateTime'

const PAYMENT_TYPE_LABELS = { deposit: 'Seña (50%)', full: 'Total (100%)' }
const PAYMENT_TYPE_STYLES = {
  deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
  full: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

function ActionsMenu({ reservation: r, user, open, onToggle, onClose, onViewDetail, onStatusChange, onDeleteReservation, onNotifyPaid }) {
  return (
    <div className="relative">
      <button onClick={onToggle}
        className="flex items-center gap-1 text-xs font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
        <MoreVertical size={14} /> Acciones
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20 overflow-hidden">
            <button onClick={() => { onViewDetail(); onClose() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left">
              <Eye size={14} className="text-gray-400" /> Ver detalle
            </button>
            {r.status === 'pending' && (
              <button onClick={() => { onStatusChange('deposit_paid'); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 transition text-left">
                <CheckCircle size={14} /> Marcar seña
              </button>
            )}
            {(r.status !== 'paid' && r.status !== 'cancelled') && (
              <button onClick={() => { onStatusChange('paid'); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition text-left">
                <CheckCircle size={14} /> Marcar pagado
              </button>
            )}
            {r.status !== 'cancelled' && (
              <button onClick={() => { onStatusChange('cancelled'); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left">
                <XCircle size={14} /> Cancelar
              </button>
            )}
            {r.status === 'cancelled' && (
              <button onClick={() => { onStatusChange('pending'); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition text-left">
                <Clock size={14} /> Reactivar
              </button>
            )}
            {r.status === 'cancelled' && (
              <button onClick={() => { onDeleteReservation(); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition text-left">
                <Trash2 size={14} /> Eliminar
              </button>
            )}
            {user?.phone && (
              <button onClick={() => { onNotifyPaid(); onClose() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition text-left">
                <MessageCircle size={14} /> Avisar cupo completo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function ReservationsTab({
  events, categories, users, allStands,
  filterEventId, setFilterEventId,
  filterStatus, setFilterStatus,
  filterCategory, setFilterCategory,
  filteredRes, paginatedRes,
  reservationPageSafe, totalReservationPages, setReservationPage,
  getEvent, getStand, getUser,
  onViewDetail, onStatusChange, onDeleteReservation, onNotifyPaid,
  orphanStands = [], onFreeStand = () => {}, onFreeAllOrphanStands = () => {},
}) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const visibleOrphans = filterEventId === 'all'
    ? orphanStands
    : orphanStands.filter(s => s.eventId === filterEventId)

  return (
    <div className="space-y-4">
      {visibleOrphans.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 text-sm">
                {visibleOrphans.length} stand{visibleOrphans.length !== 1 ? 's' : ''} ocupado{visibleOrphans.length !== 1 ? 's' : ''} sin reserva activa
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Suele pasar cuando falla una reserva o se cancela sin liberar el espacio. Liberalos para que vuelvan a estar disponibles.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {visibleOrphans.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-gray-700">
                    {s.eventName ? `${s.eventName} · ` : ''}Stand {s.number}
                    <button
                      onClick={() => onFreeStand(s)}
                      className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-full font-semibold transition"
                    >
                      <Unlock size={12} /> Liberar
                    </button>
                  </span>
                ))}
              </div>
            </div>
            {visibleOrphans.length > 1 && (
              <button
                onClick={() => onFreeAllOrphanStands(visibleOrphans)}
                className="flex-shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition"
              >
                <Unlock size={13} /> Liberar todos
              </button>
            )}
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-gray-400" />
        <select value={filterEventId} onChange={e => { setFilterEventId(e.target.value); setReservationPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="all">Todos los eventos</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setReservationPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setReservationPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => exportCSV(filteredRes, events, users, allStands, categories)}
          className="ml-auto flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {filteredRes.length} reservas encontradas · página {reservationPageSafe} de {totalReservationPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReservationPage(page => Math.max(1, page - 1))}
            disabled={reservationPageSafe === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-400 px-1">{reservationPageSafe} / {totalReservationPages}</span>
          <button
            onClick={() => setReservationPage(page => Math.min(totalReservationPages, page + 1))}
            disabled={reservationPageSafe === totalReservationPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {paginatedRes.map(r => {
          const ev = getEvent(r.eventId)
          const stand = getStand(r.eventId, r.standId)
          const user = getUser(r.userId)
          const cat = categories.find(c => c.id === r.categoryId)
          const paymentType = r.paymentType || 'full'
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible hover:shadow-md transition-shadow">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-violet-50/60 to-transparent rounded-t-2xl">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{ev?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Stand {stand?.number} — {r.standName}</p>
                  {r.createdAt && <p className="text-[11px] text-violet-500 mt-0.5">Se anotó el {formatDateTime(r.createdAt)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  <ActionsMenu
                    reservation={r}
                    user={user}
                    open={openMenuId === r.id}
                    onToggle={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                    onClose={() => setOpenMenuId(null)}
                    onViewDetail={() => onViewDetail({ reservation: r, event: ev, stand, user, category: cat })}
                    onStatusChange={(status) => onStatusChange(r.id, status)}
                    onDeleteReservation={() => onDeleteReservation(r)}
                    onNotifyPaid={() => onNotifyPaid(r, ev, stand, user)}
                  />
                </div>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2.5">
                  {user?.businessPhoto ? (
                    <img src={user.businessPhoto} alt={user.businessName || ''} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {user?.name?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 leading-none mb-1">Expositor</p>
                    <p className="font-medium truncate">{user?.businessName || `${user?.name || ''} ${user?.lastName || ''}`}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 leading-none mb-1">Categoría</p>
                  {cat ? (
                    <p className="font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      {cat.name}
                    </p>
                  ) : <p className="text-gray-400">—</p>}
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 leading-none mb-1">Importe</p>
                  <p className="font-bold text-violet-600">${r.amount.toLocaleString('es-AR')}</p>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PAYMENT_TYPE_STYLES[paymentType]}`}>
                    {PAYMENT_TYPE_LABELS[paymentType]}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 leading-none mb-1">Compartido</p>
                  <p className="font-medium flex items-center gap-1.5">
                    {r.shared && <Users2 size={13} className="text-violet-500" />}
                    {r.shared ? 'Sí' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalReservationPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setReservationPage(page => Math.max(1, page - 1))}
            disabled={reservationPageSafe === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition bg-white"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500 px-2">Página {reservationPageSafe} de {totalReservationPages}</span>
          <button
            onClick={() => setReservationPage(page => Math.min(totalReservationPages, page + 1))}
            disabled={reservationPageSafe === totalReservationPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition bg-white"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
