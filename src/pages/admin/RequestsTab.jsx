import { useMemo, useState } from 'react'
import { Search, Check, X, RotateCcw, Instagram, Store, Phone, Mail, MessageSquare, ShieldCheck } from 'lucide-react'
import { formatDateTime } from '../../lib/formatDateTime'

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'all', label: 'Todas' },
]

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
}
const STATUS_TEXT = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }

export default function RequestsTab({ eventRequests, events, users, onDecide }) {
  const approvalEvents = useMemo(() => events.filter(e => e.requiresApproval), [events])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [eventFilter, setEventFilter] = useState('all')
  const [search, setSearch] = useState('')

  const requests = useMemo(() => {
    const q = search.trim().toLowerCase()
    return eventRequests
      .filter(r => approvalEvents.some(e => e.id === r.eventId))
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => eventFilter === 'all' || r.eventId === eventFilter)
      .filter(r => {
        if (!q) return true
        const u = users.find(x => x.id === r.userId)
        const haystack = [u?.name, u?.lastName, u?.businessName, u?.email, u?.phone, u?.instagram].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [eventRequests, approvalEvents, users, statusFilter, eventFilter, search])

  const counts = useMemo(() => {
    const scoped = eventRequests.filter(r => approvalEvents.some(e => e.id === r.eventId))
    return {
      pending: scoped.filter(r => r.status === 'pending').length,
      approved: scoped.filter(r => r.status === 'approved').length,
      rejected: scoped.filter(r => r.status === 'rejected').length,
      all: scoped.length,
    }
  }, [eventRequests, approvalEvents])

  if (approvalEvents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-10 text-center max-w-xl mx-auto">
        <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">Ningún evento con confirmación</h3>
        <p className="text-sm text-gray-500">
          Cuando crees o edites un evento y actives <span className="font-medium">"Requiere confirmación"</span>,
          las solicitudes de los expositores van a aparecer acá para que las apruebes o rechaces.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === f.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
              <span className={`text-[11px] px-1.5 rounded-full ${statusFilter === f.id ? 'bg-white/25' : 'bg-white text-gray-500'}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="all">Todos los eventos con confirmación</option>
            {approvalEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, emprendimiento, email o Instagram..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
      </div>

      {requests.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400 text-sm">
          No hay solicitudes en esta vista.
        </div>
      )}

      {requests.map(r => {
        const u = users.find(x => x.id === r.userId)
        const ev = events.find(x => x.id === r.eventId)
        return (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row gap-4">
              <div className="flex-shrink-0">
                {u?.businessPhoto ? (
                  <img src={u.businessPhoto} alt={u.businessName || ''} className="w-20 h-20 rounded-2xl object-cover border" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border flex items-center justify-center">
                    <Store className="text-gray-300" size={28} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{u?.businessName || 'Sin emprendimiento cargado'}</p>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {u ? `${u.name} ${u.lastName}` : 'Usuario no encontrado'} · quiere participar en <span className="font-medium text-gray-800">{ev?.name}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {u?.instagram && (
                    <a href={u.instagram.startsWith('http') ? u.instagram : `https://instagram.com/${u.instagram.replace('@', '')}`}
                      target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pink-600 hover:underline">
                      <Instagram size={12} /> {u.instagram}
                    </a>
                  )}
                  {u?.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {u.phone}</span>}
                  {u?.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {u.email}</span>}
                </div>
                {r.message && (
                  <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex gap-2">
                    <MessageSquare size={14} className="text-gray-400 flex-shrink-0 mt-0.5" /> <span>{r.message}</span>
                  </p>
                )}
                <p className="text-[11px] text-gray-400">
                  Solicitada el {formatDateTime(r.createdAt)}
                  {r.decidedAt && r.status !== 'pending' && ` · resuelta el ${formatDateTime(r.decidedAt)}`}
                </p>
              </div>

              <div className="flex sm:flex-col gap-2 sm:justify-center flex-shrink-0">
                {r.status !== 'approved' && (
                  <button onClick={() => onDecide(r, 'approved')}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {r.status === 'rejected' ? <RotateCcw size={14} /> : <Check size={14} />} Aprobar
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => onDecide(r, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    <X size={14} /> {r.status === 'approved' ? 'Revocar' : 'Rechazar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
