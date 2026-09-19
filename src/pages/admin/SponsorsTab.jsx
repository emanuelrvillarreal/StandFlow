import { useState } from 'react'
import { Sparkles, Trash2, Users as UsersIcon, KeyRound, Plus, Edit2, UserPlus } from 'lucide-react'
import { formatBirthDate } from '../../lib/formatDateTime'

export default function SponsorsTab({ sponsorRegistrations, events, users, onDeleteRegistration, onAddMember = () => {}, onEditMember = () => {}, onDeleteMember = () => {} }) {
  const [filterEventId, setFilterEventId] = useState('all')

  const sponsorEvents = events.filter(ev => ev.sponsors?.enabled)
  const rows = sponsorRegistrations
    .filter(r => filterEventId === 'all' || r.eventId === filterEventId)
    .map(r => {
      const ev = events.find(e => e.id === r.eventId)
      return { ...r, event: ev, stand: ev?.stands.find(s => s.id === r.standId), user: users.find(u => u.id === r.userId) }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Sparkles size={20} className="text-amber-500" /> Sponsors</h2>
          <p className="text-sm text-gray-500">Sponsors registrados por evento. Sus stands son gratis: no generan importes ni pagos.</p>
        </div>
        <select value={filterEventId} onChange={e => setFilterEventId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none">
          <option value="all">Todos los eventos</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {sponsorEvents.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sponsorEvents.map(ev => {
            const total = ev.stands.filter(s => s.isSponsor).length
            const taken = ev.stands.filter(s => s.isSponsor && s.status !== 'available').length
            return (
              <div key={ev.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-gray-900 truncate">{ev.name}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <KeyRound size={12} className="text-amber-500" />
                  Código: <span className="font-mono font-bold text-gray-700">{ev.sponsors.code || '—'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Stands de Sponsors: <span className="font-bold text-gray-700">{taken}/{total}</span> ocupados</p>
              </div>
            )
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
          <Sparkles className="mx-auto mb-2 text-gray-300" />
          Todavía no hay Sponsors registrados.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{r.event?.name || 'Evento eliminado'}</p>
                  <p className="text-sm text-gray-500">
                    Stand <span className="font-bold text-gray-800">{r.stand?.number ?? '—'}</span>
                    {r.stand?.sector ? ` · ${r.stand.sector}` : ''}
                    {' · '}<span className="text-amber-600 font-semibold">Gratis ($0)</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cuenta: {r.user ? `${r.user.name} ${r.user.lastName} · ${r.user.email}` : '—'} · {new Date(r.createdAt).toLocaleString('es-AR')}
                  </p>
                </div>
                <button onClick={() => onDeleteRegistration(r)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition">
                  <Trash2 size={14} /> Liberar stand
                </button>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                    <UsersIcon size={12} /> Integrantes ({r.members.length})
                  </p>
                  <button onClick={() => onAddMember(r)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition">
                    <UserPlus size={13} /> Agregar integrante
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 uppercase">
                        <th className="pr-4 py-1 font-semibold">Nombre</th>
                        <th className="pr-4 py-1 font-semibold">Apellido</th>
                        <th className="pr-4 py-1 font-semibold">DNI</th>
                        <th className="pr-4 py-1 font-semibold">Nacimiento</th>
                        <th className="pr-4 py-1 font-semibold">Teléfono</th>
                        <th className="pr-4 py-1 font-semibold">Mail</th>
                        <th className="py-1 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.members.map(m => (
                        <tr key={m.id} className="text-gray-700">
                          <td className="pr-4 py-1">{m.firstName}</td>
                          <td className="pr-4 py-1">{m.lastName}</td>
                          <td className="pr-4 py-1">{m.dni}</td>
                          <td className="pr-4 py-1">{formatBirthDate(m.birthDate) || '—'}</td>
                          <td className="pr-4 py-1">{m.phone}</td>
                          <td className="pr-4 py-1">{m.email}</td>
                          <td className="py-1">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => onEditMember(r, m)} title="Modificar integrante" aria-label={`Modificar a ${m.firstName} ${m.lastName}`}
                                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => onDeleteMember(r, m)} title="Quitar integrante" aria-label={`Quitar a ${m.firstName} ${m.lastName}`}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
