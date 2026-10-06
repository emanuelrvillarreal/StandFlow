import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, Check, X, RotateCcw, Trash2, Eye, Download, ChevronLeft, ChevronRight, ChevronDown, Instagram, Store, Phone, Mail, MessageSquare, ShieldCheck, ScrollText, Loader2 } from 'lucide-react'
import { formatDateTime, formatBirthDate } from '../../lib/formatDateTime'
import { exportRequestsCSV } from './adminHelpers'

const PAGE_SIZE = 15

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'all', label: 'Todas' },
]

function pageTokens(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const tokens = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...tokens].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        aria-label="Página anterior"
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-white hover:text-violet-600 hover:border-violet-200 transition bg-white">
        <ChevronLeft size={16} />
      </button>
      {pageTokens(page, totalPages).map((t, i) => t === '…' ? (
        <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-300 text-sm select-none">…</span>
      ) : (
        <button key={t} onClick={() => onChange(t)} aria-current={t === page ? 'page' : undefined}
          className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition ${
            t === page ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
          }`}>
          {t}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        aria-label="Página siguiente"
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-white hover:text-violet-600 hover:border-violet-200 transition bg-white">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
}
const STATUS_TEXT = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800 break-words">{value}</p>
    </div>
  )
}

function RequestDetailModal({ request, user, event, decidedByUser, onClose }) {
  if (!request) return null
  // Portal a document.body: el <main> del panel tiene su propio z-index y
  // "atrapa" todo lo que esta adentro por debajo del sidebar (que tiene un
  // z-index mas alto), sin importar el z-index que le pongamos al modal acá.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">Detalle de la solicitud</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
          </div>

          {user?.businessPhoto && (
            <img src={user.businessPhoto} alt={user.businessName || ''} className="w-full h-48 object-cover rounded-xl border" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Emprendimiento" value={user?.businessName} />
            <Field label="Nombre" value={user ? `${user.name} ${user.lastName}`.trim() : ''} />
            <Field label="Email" value={user?.email} />
            <Field label="Teléfono" value={user?.phone} />
            <Field label="Instagram" value={user?.instagram} />
            <Field label="Fecha de nacimiento" value={formatBirthDate(user?.birthDate)} />
            <Field label="Evento" value={event?.name} />
            <Field label="Estado" value={STATUS_TEXT[request.status]} />
          </div>

          {request.message && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Mensaje</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3">{request.message}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Solicitada el {formatDateTime(request.createdAt)}
            {request.decidedAt && request.status !== 'pending' && ` · resuelta el ${formatDateTime(request.decidedAt)}`}
            {decidedByUser && request.status !== 'pending' && ` por ${decidedByUser.name} ${decidedByUser.lastName || ''}`.trimEnd()}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function RequestsTab({
  eventRequests, events, users, onDecide, onDelete = () => {}, onResendEmail = () => {},
  isSysadmin = false, notificationLog, loadingNotificationLog = false, onLoadNotificationLog = () => {},
}) {
  const approvalEvents = useMemo(() => events.filter(e => e.requiresApproval), [events])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [eventFilter, setEventFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [detailRequest, setDetailRequest] = useState(null)
  const [page, setPage] = useState(1)
  const [showLog, setShowLog] = useState(false)

  function changeStatusFilter(id) { setStatusFilter(id); setPage(1) }
  function changeEventFilter(id) { setEventFilter(id); setPage(1) }
  function changeSearch(v) { setSearch(v); setPage(1) }

  function toggleLog() {
    const next = !showLog
    setShowLog(next)
    if (next && notificationLog === null) onLoadNotificationLog()
  }

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

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRequests = requests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
            <button key={f.id} onClick={() => changeStatusFilter(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${statusFilter === f.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
              <span className={`text-[11px] px-1.5 rounded-full ${statusFilter === f.id ? 'bg-white/25' : 'bg-white text-gray-500'}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
          <select value={eventFilter} onChange={e => changeEventFilter(e.target.value)}
            className="col-span-2 sm:col-span-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="all">Todos los eventos con confirmación</option>
            {approvalEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <div className="relative col-span-2 sm:col-span-1 sm:flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => changeSearch(e.target.value)}
              placeholder="Buscar por nombre, emprendimiento, email o Instagram..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button onClick={() => exportRequestsCSV(requests, events, users)}
            className="col-span-2 sm:col-span-1 flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold transition">
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {requests.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400 text-sm">
          No hay solicitudes en esta vista.
        </div>
      )}

      {requests.length > 0 && (
        <p className="text-xs text-gray-400 px-1">
          Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, requests.length)} de {requests.length} solicitudes
        </p>
      )}

      {pageRequests.map(r => {
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
                  {r.decidedBy && r.status !== 'pending' && (() => {
                    const decider = users.find(x => x.id === r.decidedBy)
                    return decider ? ` por ${decider.name} ${decider.lastName || ''}`.trimEnd() : ''
                  })()}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-col sm:justify-center sm:w-36 flex-shrink-0">
                <button onClick={() => setDetailRequest(r)}
                  className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
                  <Eye size={14} /> Ver detalles
                </button>
                {r.status !== 'approved' && (
                  <button onClick={() => onDecide(r, 'approved')}
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {r.status === 'rejected' ? <RotateCcw size={14} /> : <Check size={14} />} Aprobar
                  </button>
                )}
                {r.status === 'approved' && (
                  <button onClick={() => onResendEmail(r)}
                    className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    <Mail size={14} /> Reenviar mail
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => onDecide(r, 'rejected')}
                    className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    <X size={14} /> {r.status === 'approved' ? 'Revocar' : 'Rechazar'}
                  </button>
                )}
                {r.status === 'rejected' && (
                  <button onClick={() => onDelete(r)}
                    className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <Pager page={safePage} totalPages={totalPages} onChange={setPage} />

      {isSysadmin && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={toggleLog}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition">
            <span className="flex items-center gap-2 font-bold text-gray-800">
              <ScrollText size={16} className="text-violet-500" />
              Log de notificaciones
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">Solo sysadmin</span>
            </span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showLog ? 'rotate-180' : ''}`} />
          </button>

          {showLog && (
            <div className="border-t border-gray-100">
              {loadingNotificationLog ? (
                <div className="p-8 flex items-center justify-center text-gray-400 gap-2 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Cargando...
                </div>
              ) : !notificationLog || notificationLog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Todavía no se mandó ninguna notificación.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-5 py-2.5 font-medium text-gray-500 text-xs uppercase">Fecha</th>
                        <th className="px-5 py-2.5 font-medium text-gray-500 text-xs uppercase">Destinatario</th>
                        <th className="px-5 py-2.5 font-medium text-gray-500 text-xs uppercase">Evento</th>
                        <th className="px-5 py-2.5 font-medium text-gray-500 text-xs uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {notificationLog.map(n => {
                        const ev = events.find(e => e.id === n.eventId)
                        return (
                          <tr key={n.id}>
                            <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{formatDateTime(n.createdAt)}</td>
                            <td className="px-5 py-2.5 text-gray-800">{n.toEmail}</td>
                            <td className="px-5 py-2.5 text-gray-600">{ev?.name || '—'}</td>
                            <td className="px-5 py-2.5">
                              {n.status === 'sent' ? (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enviado</span>
                              ) : (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200" title={n.errorMessage || ''}>Error</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <RequestDetailModal
        request={detailRequest}
        user={detailRequest ? users.find(x => x.id === detailRequest.userId) : null}
        event={detailRequest ? events.find(x => x.id === detailRequest.eventId) : null}
        decidedByUser={detailRequest?.decidedBy ? users.find(x => x.id === detailRequest.decidedBy) : null}
        onClose={() => setDetailRequest(null)}
      />
    </div>
  )
}
