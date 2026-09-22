import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Search, Download, Check, Sparkles, Store, AlertCircle, Users2 } from 'lucide-react'
import NoticeDialog from '../../components/NoticeDialog'
import { supabase } from '../../lib/supabase'
import { eventDays, todayISO, formatDateTime, formatTime } from '../../lib/formatDateTime'

const PAY_STYLES = {
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending: 'bg-red-50 text-red-600 border border-red-200',
  reserved: 'bg-blue-50 text-blue-700 border border-blue-200',
  free: 'bg-violet-50 text-violet-700 border border-violet-200',
}

function money(n) { return `$${Number(n || 0).toLocaleString('es-AR')}` }

function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Cómo pagó un expositor: completo, la mitad (seña) o nada todavía.
function paymentInfo(r, stand) {
  const total = Number(stand?.price ?? (r.paymentType === 'deposit' ? r.amount * 2 : r.amount)) || 0
  if (r.status === 'paid') return { key: 'paid', label: 'Pagó completo', paid: total, total, debt: 0 }
  if (r.status === 'deposit_paid') {
    const paid = Number(r.amount) || 0
    return { key: 'deposit', label: 'Pagó la mitad (seña)', paid, total, debt: Math.max(0, total - paid) }
  }
  if (r.status === 'reserved') return { key: 'reserved', label: 'Reservado', paid: 0, total, debt: total }
  return {
    key: 'pending',
    label: r.paymentType === 'deposit' ? 'Sin pagar (eligió seña)' : 'Sin pagar',
    paid: 0, total, debt: total,
  }
}

export default function AttendanceTab({ events, reservations, users, sponsorRegistrations, initialEventId }) {
  const [eventId, setEventId] = useState(initialEventId || events[0]?.id || '')
  const [day, setDay] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | present | absent | unpaid
  const [attendance, setAttendance] = useState([])
  const [loadError, setLoadError] = useState('')
  const [busyKey, setBusyKey] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => { if (initialEventId) setEventId(initialEventId) }, [initialEventId])
  useEffect(() => { if (!eventId && events[0]) setEventId(events[0].id) }, [events, eventId])

  const ev = events.find(e => e.id === eventId)
  const days = useMemo(() => eventDays(ev), [ev])

  // Al cambiar de evento se elige el día de hoy si el evento lo incluye; si no, el primero.
  useEffect(() => {
    if (!days.length) { setDay(''); return }
    setDay(prev => (days.includes(prev) ? prev : (days.includes(todayISO()) ? todayISO() : days[0])))
  }, [days])

  // Asistencia del evento (con actualización en vivo por si hay más de un admin en la puerta).
  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    setLoadError('')
    supabase.from('event_attendance').select('*').eq('event_id', eventId).then(({ data, error }) => {
      if (cancelled) return
      if (error) { setLoadError(error.message); setAttendance([]); return }
      setAttendance(data || [])
    })
    const channel = supabase
      .channel(`attendance-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance', filter: `event_id=eq.${eventId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          setAttendance(list => list.filter(a => a.id !== payload.old.id))
        } else {
          setAttendance(list => list.some(a => a.id === payload.new.id) ? list : [...list, payload.new])
        }
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [eventId])

  const rows = useMemo(() => {
    if (!ev) return []
    const out = []

    reservations.filter(r => r.eventId === ev.id && r.status !== 'cancelled').forEach(r => {
      const u = users.find(x => x.id === r.userId)
      const stand = ev.stands.find(s => s.id === r.standId)
      out.push({
        key: `r-${r.id}`, kind: 'exhibitor', reservationId: r.id,
        name: u?.businessName || `${u?.name || ''} ${u?.lastName || ''}`.trim() || '(sin nombre)',
        sub: [u?.businessName ? `${u?.name || ''} ${u?.lastName || ''}`.trim() : '', u?.phone].filter(Boolean).join(' · '),
        stand: stand?.number ?? '—', createdAt: r.createdAt, pay: paymentInfo(r, stand),
        shared: !!r.shared, sharedWith: (r.sharedWith || '').trim(), instagram: (r.instagram || '').trim(),
      })
    })

    sponsorRegistrations.filter(g => g.eventId === ev.id).forEach(g => {
      const stand = ev.stands.find(s => s.id === g.standId)
      g.members.forEach(m => {
        out.push({
          key: `m-${m.id}`, kind: 'sponsor', memberId: m.id,
          name: `${m.firstName} ${m.lastName}`,
          sub: `DNI ${m.dni} · ${m.phone}`,
          stand: stand?.number ?? '—', createdAt: g.createdAt,
          shared: false, sharedWith: '', instagram: '',
          pay: { key: 'free', label: 'Sin cargo', paid: 0, total: 0, debt: 0 },
        })
      })
    })

    return out.sort((a, b) => String(a.stand).localeCompare(String(b.stand), 'es', { numeric: true }) || a.name.localeCompare(b.name))
  }, [ev, reservations, users, sponsorRegistrations])

  // Presencia del día elegido, indexada por persona.
  const presentByKey = useMemo(() => {
    const map = new Map()
    attendance.filter(a => a.day === day).forEach(a => {
      map.set(a.reservation_id ? `r-${a.reservation_id}` : `m-${a.sponsor_member_id}`, a)
    })
    return map
  }, [attendance, day])

  const visible = rows.filter(r => {
    const q = search.trim().toLowerCase()
    if (q && !`${r.name} ${r.sub} ${r.stand} ${r.sharedWith} ${r.instagram}`.toLowerCase().includes(q)) return false
    if (filter === 'present') return presentByKey.has(r.key)
    if (filter === 'absent') return !presentByKey.has(r.key)
    if (filter === 'unpaid') return r.kind === 'exhibitor' && r.pay.key !== 'paid'
    return true
  })

  const exhibitorRows = rows.filter(r => r.kind === 'exhibitor')
  const stats = {
    total: rows.length,
    present: rows.filter(r => presentByKey.has(r.key)).length,
    paid: exhibitorRows.filter(r => r.pay.key === 'paid').length,
    deposit: exhibitorRows.filter(r => r.pay.key === 'deposit').length,
    unpaid: exhibitorRows.filter(r => r.pay.key === 'pending' || r.pay.key === 'reserved').length,
    collected: exhibitorRows.reduce((s, r) => s + r.pay.paid, 0),
    due: exhibitorRows.reduce((s, r) => s + r.pay.debt, 0),
  }

  async function toggle(row) {
    if (!day || busyKey) return
    setBusyKey(row.key)
    const current = presentByKey.get(row.key)
    if (current) {
      const { error } = await supabase.from('event_attendance').delete().eq('id', current.id)
      if (error) setNotice({ title: 'No se pudo desmarcar', message: `No se pudo desmarcar: ${error.message}`, tone: 'danger' })
      else setAttendance(list => list.filter(a => a.id !== current.id))
    } else {
      const { data, error } = await supabase.from('event_attendance').insert({
        event_id: eventId, day,
        reservation_id: row.reservationId || null,
        sponsor_member_id: row.memberId || null,
      }).select().single()
      if (error) setNotice({ title: 'No se pudo marcar', message: `No se pudo marcar la asistencia: ${error.message}`, tone: 'danger' })
      else setAttendance(list => list.some(a => a.id === data.id) ? list : [...list, data])
    }
    setBusyKey(null)
  }

  function exportCsv() {
    const header = ['Evento', 'Día', 'Tipo', 'Nombre', 'Contacto', 'Stand', 'Compartido', 'Comparte con', 'Instagram', 'Se anotó', 'Pago', 'Cobrado', 'Total', 'Debe', 'Presente', 'Hora de ingreso']
    const lines = rows.map(r => {
      const a = presentByKey.get(r.key)
      return [
        ev?.name, day, r.kind === 'sponsor' ? 'Sponsor' : 'Expositor', r.name, r.sub, r.stand,
        r.kind === 'sponsor' ? '' : (r.shared ? 'Sí' : 'No'), r.sharedWith, r.instagram,
        formatDateTime(r.createdAt),
        r.pay.label, r.pay.paid, r.pay.total, r.pay.debt, a ? 'Sí' : 'No', a ? formatTime(a.checked_at) : '',
      ]
    })
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url; el.download = `asistencia-${(ev?.name || 'evento').replace(/\s+/g, '-')}-${day}.csv`; el.click()
    URL.revokeObjectURL(url)
  }

  if (!events.length) {
    return <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">Todavía no hay eventos.</div>
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck size={20} className="text-violet-600" /> Asistencia</h2>
        <p className="text-sm text-gray-500">Marcá quién vino cada día del evento y controlá cómo pagó cada uno.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={eventId} onChange={e => { setEventId(e.target.value); setSearch(''); setFilter('all') }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {days.map(d => (
              <button key={d} onClick={() => setDay(d)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold capitalize transition ${day === d ? 'bg-violet-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700'}`}>
                {dayLabel(d)}{d === todayISO() ? ' · hoy' : ''}
              </button>
            ))}
          </div>
          <button onClick={exportCsv}
            className="ml-auto flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            <Download size={14} /> Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <p className="text-[11px] font-bold text-violet-500 uppercase">Presentes hoy</p>
            <p className="text-2xl font-bold text-violet-700">{stats.present}<span className="text-sm font-semibold text-violet-400"> / {stats.total}</span></p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-[11px] font-bold text-emerald-600 uppercase">Pago completo</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.paid}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-[11px] font-bold text-amber-600 uppercase">Solo seña · sin pagar</p>
            <p className="text-2xl font-bold text-amber-700">{stats.deposit}<span className="text-sm font-semibold text-amber-500"> · {stats.unpaid}</span></p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase">Cobrado · falta cobrar</p>
            <p className="text-lg font-bold text-gray-800">{money(stats.collected)} <span className="text-sm font-semibold text-red-500">· {money(stats.due)}</span></p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>No se pudo cargar la asistencia: {loadError}. Si es la primera vez, falta ejecutar supabase-attendance.sql en Supabase.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, emprendimiento o stand"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[['all', 'Todos'], ['present', 'Presentes'], ['absent', 'Faltan llegar'], ['unpaid', 'Con pago pendiente']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${filter === k ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-violet-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="text-left text-[11px] uppercase text-gray-400 bg-gray-50 border-b">
                <th className="px-4 py-3 font-semibold w-36">Presente</th>
                <th className="px-4 py-3 font-semibold">Persona / emprendimiento</th>
                <th className="px-4 py-3 font-semibold">Stand</th>
                <th className="px-4 py-3 font-semibold">Compartido</th>
                <th className="px-4 py-3 font-semibold">Se anotó</th>
                <th className="px-4 py-3 font-semibold">Pago</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => {
                const a = presentByKey.get(r.key)
                return (
                  <tr key={r.key} data-row={r.name} className={`border-b last:border-0 transition ${a ? 'bg-emerald-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(r)} disabled={!day || busyKey === r.key}
                        aria-pressed={!!a} aria-label={`${a ? 'Desmarcar' : 'Marcar'} presente a ${r.name}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-60 ${
                          a ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600' : 'border border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}>
                        {a ? <><Check size={13} /> {formatTime(a.checked_at)}</> : 'Marcar'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {r.kind === 'sponsor'
                          ? <span title="Sponsor" className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700"><Sparkles size={10} /> SPONSOR</span>
                          : <Store size={13} className="text-violet-400" />}
                        {r.name}
                      </p>
                      {r.sub && <p className="text-xs text-gray-400">{r.sub}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{r.stand}</td>
                    <td className="px-4 py-3">
                      {r.kind === 'sponsor' ? (
                        <span className="text-gray-300">—</span>
                      ) : r.shared ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                            <Users2 size={12} /> Sí
                          </span>
                          {r.sharedWith && <p className="text-xs text-gray-700 mt-1 font-medium">{r.sharedWith}</p>}
                          {r.instagram && <p className="text-[11px] text-pink-600">{r.instagram}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(r.createdAt) || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_STYLES[r.pay.key]}`}>{r.pay.label}</span>
                      {r.kind === 'exhibitor' && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {money(r.pay.paid)} de {money(r.pay.total)}
                          {r.pay.debt > 0 && <span className="text-red-500 font-semibold"> · debe {money(r.pay.debt)}</span>}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">
            {rows.length === 0 ? 'Todavía no hay nadie anotado en este evento.' : 'Nadie coincide con ese filtro.'}
          </p>
        )}
      </div>

      <NoticeDialog
        open={!!notice}
        title={notice?.title}
        message={notice?.message}
        tone={notice?.tone}
        onClose={() => setNotice(null)}
      />
    </div>
  )
}
