import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Shield, UserPlus, Trash2, Download, Search, CheckCircle2, AlertTriangle, DollarSign,
  Users2, Hash, Calendar, ChevronLeft, ChevronRight, Store, Pencil, X, Check, Phone, Tag,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatBirthDate } from '../../lib/formatDateTime'

const PAGE_SIZE = 15

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
    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
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

function StatCard({ label, value, icon: Icon, tone, active, onClick, sub }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`text-left bg-white rounded-2xl border p-4 transition ${onClick ? 'hover:border-violet-300 cursor-pointer' : 'cursor-default'} ${active ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-100'}`}>
      <div className={`w-9 h-9 ${tone} rounded-xl flex items-center justify-center mb-2.5`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </button>
  )
}

function initials(a, b) {
  return `${(a || '?')[0] || ''}${(b || '')[0] || ''}`.toUpperCase()
}

const editInputCls = 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

function PersonRow({
  person, title, badgeCls, readOnly, onTogglePaid, onDelete,
  isEditing, editForm, setEditForm, onStartEdit, onSaveEdit, onCancelEdit, saving,
}) {
  if (isEditing) {
    return (
      <div className="bg-violet-50/60 border border-violet-200 rounded-xl px-3.5 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Nombre" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} className={editInputCls} />
          <input type="text" placeholder="Apellido" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} className={editInputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="DNI" value={editForm.dni} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} className={editInputCls} />
          <input type="date" value={editForm.birth_date} onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })} className={editInputCls} />
        </div>
        <input type="number" min="0" placeholder="Monto a cobrarle por fuera (opcional)" value={editForm.amount}
          onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className={`w-full ${editInputCls}`} />
        <div className="flex gap-2 pt-0.5">
          <button onClick={onSaveEdit} disabled={saving}
            className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            <Check size={13} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onCancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition">
            <X size={13} /> Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
          {initials(person.first_name, person.last_name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {person.first_name} {person.last_name}
            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{title}</span>
          </p>
          <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1"><Hash size={11} /> {person.dni}</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatBirthDate(person.birth_date)}</span>
            {person.added_by_admin && <span className="text-violet-500">cargado por el admin</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!readOnly && !!person.amount && (
          <button onClick={onTogglePaid}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${person.paid ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            <DollarSign size={12} /> ${Number(person.amount).toLocaleString('es-AR')} · {person.paid ? 'Cobrado' : 'Marcar cobrado'}
          </button>
        )}
        {!readOnly && (
          <button onClick={onStartEdit} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Corregir datos">
            <Pencil size={14} />
          </button>
        )}
        {!readOnly && onDelete && (
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// Gestión de seguros (titular + acompañantes) por evento. Se usa antes del
// evento, para juntar los datos que hay que mandarle a la compañía de
// seguros — distinto de Asistencia, que es el día del evento.
export default function InsuranceTab({ events, reservations, users, categories = [], readOnly = false, onAddExpenseRecord = () => {}, onRemoveExpenseRecord = () => {} }) {
  const sortedEvents = useMemo(() => {
    const active = events.filter(ev => ev.status !== 'past').sort((a, b) => new Date(a.date) - new Date(b.date))
    const past = events.filter(ev => ev.status === 'past').sort((a, b) => new Date(a.date) - new Date(b.date))
    return [...active, ...past]
  }, [events])

  const [eventId, setEventId] = useState(null)
  useEffect(() => {
    if (eventId && events.some(e => e.id === eventId)) return
    setEventId(sortedEvents[0]?.id || null)
  }, [events, eventId, sortedEvents])

  const event = events.find(e => e.id === eventId)
  const eventReservations = useMemo(
    () => reservations.filter(r => r.eventId === eventId && r.status !== 'cancelled'),
    [reservations, eventId]
  )
  const idsKey = useMemo(() => eventReservations.map(r => r.id).sort().join(','), [eventReservations])

  const [peopleByReservation, setPeopleByReservation] = useState({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | complete | pending
  const [page, setPage] = useState(1)
  const [addingFor, setAddingFor] = useState(null)
  const EMPTY_PERSON_FORM = { role: 'acompanante', first_name: '', last_name: '', dni: '', birth_date: '', amount: '' }
  const [personForm, setPersonForm] = useState(EMPTY_PERSON_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingPersonId, setEditingPersonId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => { setPage(1) }, [eventId, filter, search])

  useEffect(() => {
    if (!eventId) return
    const ids = idsKey ? idsKey.split(',') : []
    if (ids.length === 0) { setPeopleByReservation({}); return }
    let cancelled = false
    supabase.from('reservation_insurance').select('*').in('reservation_id', ids).order('position').then(({ data, error }) => {
      if (cancelled || error) return
      const grouped = {}
      ;(data || []).forEach(p => {
        if (!grouped[p.reservation_id]) grouped[p.reservation_id] = []
        grouped[p.reservation_id].push(p)
      })
      setPeopleByReservation(grouped)
    })
    return () => { cancelled = true }
  }, [eventId, idsKey])

  const rows = useMemo(() => eventReservations.map(r => {
    const stand = event?.stands.find(s => s.id === r.standId)
    const user = users.find(u => u.id === r.userId)
    const category = categories.find(c => c.id === stand?.categoryId)
    const people = peopleByReservation[r.id] || []
    const titular = people.find(p => p.role === 'titular')
    const companions = people.filter(p => p.role === 'acompanante')
    return { reservation: r, stand, category, user, titular, companions, complete: !!titular }
  }).sort((a, b) => String(a.stand?.number ?? '').localeCompare(String(b.stand?.number ?? ''), 'es', { numeric: true })),
    [eventReservations, peopleByReservation, event, users, categories])

  const visibleRows = rows.filter(row => {
    if (filter === 'complete' && !row.complete) return false
    if (filter === 'pending' && row.complete) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    const haystack = [
      row.stand?.number, row.reservation.standName, row.titular?.first_name, row.titular?.last_name,
      row.titular?.dni, row.user?.email, row.user?.name, row.user?.lastName,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const completeCount = rows.filter(r => r.complete).length
  const pendingCount = rows.length - completeCount
  const allPeople = rows.flatMap(r => [...(r.titular ? [r.titular] : []), ...r.companions])
  const totalToCollect = allPeople.filter(p => p.amount && !p.paid).reduce((s, p) => s + Number(p.amount), 0)
  const totalCollected = allPeople.filter(p => p.amount && p.paid).reduce((s, p) => s + Number(p.amount), 0)

  async function handleAddPerson(reservationId) {
    if (!personForm.first_name.trim() || !personForm.last_name.trim() || !personForm.dni.trim() || !personForm.birth_date) {
      setErr('Completá nombre, apellido, DNI y fecha de nacimiento.')
      return
    }
    setSaving(true)
    setErr('')
    const position = (peopleByReservation[reservationId] || []).length
    const { data, error } = await supabase.from('reservation_insurance').insert({
      reservation_id: reservationId, role: personForm.role,
      first_name: personForm.first_name.trim(), last_name: personForm.last_name.trim(),
      dni: personForm.dni.trim(), birth_date: personForm.birth_date,
      amount: personForm.amount === '' ? null : Number(personForm.amount),
      added_by_admin: true, position,
    }).select().single()
    setSaving(false)
    if (error) { setErr(`No se pudo agregar: ${error.message}`); return }
    setPeopleByReservation(prev => ({ ...prev, [reservationId]: [...(prev[reservationId] || []), data] }))
    setPersonForm(EMPTY_PERSON_FORM)
    setAddingFor(null)
  }

  async function handleDeletePerson(reservationId, personId) {
    const { error } = await supabase.from('reservation_insurance').delete().eq('id', personId)
    if (error) return
    setPeopleByReservation(prev => ({ ...prev, [reservationId]: (prev[reservationId] || []).filter(p => p.id !== personId) }))
  }

  function startEditPerson(person) {
    setErr('')
    setEditingPersonId(person.id)
    setEditForm({
      first_name: person.first_name || '', last_name: person.last_name || '',
      dni: person.dni || '', birth_date: person.birth_date || '', amount: person.amount ?? '',
    })
  }

  function cancelEditPerson() {
    setEditingPersonId(null)
    setEditForm(null)
  }

  // Corrige datos cargados mal (DNI, fecha de nacimiento, nombre) sin tener
  // que borrar y volver a crear a la persona.
  async function handleSaveEditPerson(reservationId, personId) {
    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.dni.trim() || !editForm.birth_date) {
      setErr('Completá nombre, apellido, DNI y fecha de nacimiento.')
      return
    }
    setSavingEdit(true)
    setErr('')
    const { data, error } = await supabase.from('reservation_insurance').update({
      first_name: editForm.first_name.trim(), last_name: editForm.last_name.trim(),
      dni: editForm.dni.trim(), birth_date: editForm.birth_date,
      amount: editForm.amount === '' ? null : Number(editForm.amount),
    }).eq('id', personId).select().single()
    setSavingEdit(false)
    if (error) { setErr(`No se pudo guardar la corrección: ${error.message}`); return }
    setPeopleByReservation(prev => ({ ...prev, [reservationId]: (prev[reservationId] || []).map(p => p.id === personId ? data : p) }))
    cancelEditPerson()
  }

  // Al marcar cobrado, se crea un ingreso manual en Finanzas (ligado al
  // evento) con el monto del seguro; al destildar, se borra ese ingreso. Así
  // queda reflejado en Finanzas sin que haya que cargarlo dos veces.
  async function handleTogglePaid(row, person) {
    setErr('')
    if (!person.paid) {
      const expense = {
        id: crypto.randomUUID(),
        description: `Seguro - ${person.first_name} ${person.last_name} (Stand ${row.stand?.number ?? '—'} - ${row.reservation.standName || ''})`,
        amount: Number(person.amount),
        type: 'income',
        event_id: eventId,
        created_at: new Date().toISOString(),
      }
      const { error: expError } = await supabase.from('expenses').insert(expense)
      if (expError) { setErr(`No se pudo registrar el ingreso en Finanzas: ${expError.message}`); return }
      const { data, error } = await supabase.from('reservation_insurance')
        .update({ paid: true, expense_id: expense.id }).eq('id', person.id).select().single()
      if (error) { setErr(`No se pudo marcar como cobrado: ${error.message}`); await supabase.from('expenses').delete().eq('id', expense.id); return }
      onAddExpenseRecord(expense)
      setPeopleByReservation(prev => ({ ...prev, [row.reservation.id]: (prev[row.reservation.id] || []).map(p => p.id === person.id ? data : p) }))
    } else {
      const { data, error } = await supabase.from('reservation_insurance')
        .update({ paid: false, expense_id: null }).eq('id', person.id).select().single()
      if (error) { setErr(`No se pudo destildar: ${error.message}`); return }
      if (person.expense_id) {
        await supabase.from('expenses').delete().eq('id', person.expense_id)
        onRemoveExpenseRecord(person.expense_id)
      }
      setPeopleByReservation(prev => ({ ...prev, [row.reservation.id]: (prev[row.reservation.id] || []).map(p => p.id === person.id ? data : p) }))
    }
  }

  function exportXlsx() {
    const header = [
      'Evento', 'Stand', 'Nombre de stand', 'Categoría',
      'Nombre cuenta', 'Apellido cuenta', 'Email cuenta', 'Teléfono cuenta',
      'Rol seguro', 'Nombre asegurado', 'Apellido asegurado', 'DNI', 'Fecha de nacimiento',
      'Cargado por el admin', 'Monto a cobrar', 'Cobrado',
    ]
    const lines = rows.flatMap(row => {
      const base = [
        event?.name, row.stand?.number ?? '—', row.reservation.standName || '', row.category?.name || '',
        row.user?.name || '', row.user?.lastName || '', row.user?.email || '', row.user?.phone || '',
      ]
      const people = [...(row.titular ? [row.titular] : []), ...row.companions]
      if (people.length === 0) return [[...base, 'Sin cargar', '', '', '', '', '', '', '']]
      return people.map(p => [
        ...base,
        p.role === 'titular' ? 'Titular' : 'Acompañante',
        p.first_name, p.last_name, p.dni, p.birth_date ? formatBirthDate(p.birth_date) : '', p.added_by_admin ? 'Sí' : 'No',
        p.amount ?? '', p.amount ? (p.paid ? 'Sí' : 'No') : '',
      ])
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...lines])
    ws['!cols'] = [20, 8, 20, 14, 14, 14, 24, 14, 12, 16, 16, 12, 14, 12, 14, 10].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Seguros')
    XLSX.writeFile(wb, `seguros-${(event?.name || 'evento').replace(/\s+/g, '-')}.xlsx`)
  }

  if (!events.length) {
    return <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">Todavía no hay eventos.</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Shield size={20} className="text-violet-600" /> Seguros</h2>
          <p className="text-sm text-gray-500">Datos de seguro del titular y los acompañantes de cada stand, para mandarle a la compañía antes del evento.</p>
        </div>
        {!readOnly && (
          <button onClick={exportXlsx}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
            <Download size={15} /> Exportar Excel
          </button>
        )}
      </div>

      {err && !addingFor && (
        <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm">{err}</div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-4 ${!readOnly ? 'lg:grid-cols-5' : ''} gap-3`}>
        <StatCard label="Stands" value={rows.length} icon={Users2} tone="text-gray-600 bg-gray-100"
          active={filter === 'all'} onClick={() => setFilter('all')} />
        <StatCard label="Completo" value={completeCount} icon={CheckCircle2} tone="text-emerald-600 bg-emerald-50"
          active={filter === 'complete'} onClick={() => setFilter('complete')} />
        <StatCard label="Falta cargar" value={pendingCount} icon={AlertTriangle} tone="text-amber-600 bg-amber-50"
          active={filter === 'pending'} onClick={() => setFilter('pending')} />
        {!readOnly && (
          <>
            <StatCard label="Falta cobrar" value={`$${totalToCollect.toLocaleString('es-AR')}`} icon={DollarSign} tone="text-amber-600 bg-amber-50" />
            <StatCard label="Cobrado" value={`$${totalCollected.toLocaleString('es-AR')}`} icon={DollarSign} tone="text-emerald-600 bg-emerald-50" />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3.5">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={eventId || ''} onChange={e => setEventId(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold">
            {sortedEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.status === 'past' ? ' (finalizado)' : ''}</option>)}
          </select>
          <p className="text-xs text-gray-400 ml-auto">
            {visibleRows.length} resultado{visibleRows.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por stand, titular, DNI o email..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>

      <div className="space-y-3">
        {pageRows.length === 0 && (
          <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">No hay reservas que coincidan.</div>
        )}
        {pageRows.map(row => (
          <div key={row.reservation.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 bg-gray-50/60 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm flex-shrink-0">
                  {row.stand?.number ?? '—'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                    <Store size={13} className="text-gray-400 flex-shrink-0" /> {row.reservation.standName || 'Sin nombre'}
                    {row.category && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: row.category.color + '20', color: row.category.color }}>
                        <Tag size={10} /> {row.category.name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate flex items-center gap-2.5 flex-wrap">
                    {row.user && <span>{row.user.name} {row.user.lastName} · {row.user.email}</span>}
                    {row.user?.phone && <span className="flex items-center gap-1 flex-shrink-0"><Phone size={11} /> {row.user.phone}</span>}
                    {!row.user && '—'}
                  </p>
                </div>
              </div>
              {row.complete ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={13} /> Completo
                </span>
              ) : (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle size={13} /> Falta que lo cargue
                </span>
              )}
            </div>

            <div className="p-4 space-y-2">
              {row.titular && (
                <PersonRow person={row.titular} title="Titular" badgeCls="bg-violet-100 text-violet-700" readOnly={readOnly}
                  onTogglePaid={() => handleTogglePaid(row, row.titular)}
                  onDelete={row.titular.added_by_admin ? () => handleDeletePerson(row.reservation.id, row.titular.id) : null}
                  isEditing={editingPersonId === row.titular.id} editForm={editForm} setEditForm={setEditForm}
                  onStartEdit={() => startEditPerson(row.titular)}
                  onSaveEdit={() => handleSaveEditPerson(row.reservation.id, row.titular.id)}
                  onCancelEdit={cancelEditPerson} saving={savingEdit} />
              )}
              {row.companions.map(p => (
                <PersonRow key={p.id} person={p} title="Acompañante" badgeCls="bg-gray-200 text-gray-600" readOnly={readOnly}
                  onTogglePaid={() => handleTogglePaid(row, p)}
                  onDelete={() => handleDeletePerson(row.reservation.id, p.id)}
                  isEditing={editingPersonId === p.id} editForm={editForm} setEditForm={setEditForm}
                  onStartEdit={() => startEditPerson(p)}
                  onSaveEdit={() => handleSaveEditPerson(row.reservation.id, p.id)}
                  onCancelEdit={cancelEditPerson} saving={savingEdit} />
              ))}

              {!readOnly && (addingFor === row.reservation.id ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  {err && <p className="text-xs text-red-600">{err}</p>}
                  {!row.titular && (
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                      <button type="button" onClick={() => setPersonForm({ ...personForm, role: 'titular' })}
                        className={`flex-1 py-2 transition ${personForm.role === 'titular' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        Es el titular
                      </button>
                      <button type="button" onClick={() => setPersonForm({ ...personForm, role: 'acompanante' })}
                        className={`flex-1 py-2 transition ${personForm.role === 'acompanante' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                        Es un acompañante
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nombre" value={personForm.first_name} onChange={e => setPersonForm({ ...personForm, first_name: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <input type="text" placeholder="Apellido" value={personForm.last_name} onChange={e => setPersonForm({ ...personForm, last_name: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <input type="text" placeholder="DNI" value={personForm.dni} onChange={e => setPersonForm({ ...personForm, dni: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <input type="date" value={personForm.birth_date} onChange={e => setPersonForm({ ...personForm, birth_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <div>
                    <input type="number" min="0" placeholder="Monto a cobrarle por fuera (opcional)" value={personForm.amount}
                      onChange={e => setPersonForm({ ...personForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <p className="text-[11px] text-gray-400 mt-1">No forma parte del precio del stand: es lo que hay que cobrarle aparte por el seguro.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddPerson(row.reservation.id)} disabled={saving}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setAddingFor(null); setErr('') }}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingFor(row.reservation.id); setPersonForm({ ...EMPTY_PERSON_FORM, role: row.titular ? 'acompanante' : 'titular' }); setErr('') }}
                  className="flex items-center gap-1.5 text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg text-sm font-medium transition">
                  <UserPlus size={15} /> {row.titular ? 'Agregar acompañante' : 'Agregar seguro (se olvidó de cargarlo)'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {visibleRows.length > 0 && (
        <p className="text-xs text-gray-400 px-1 text-center">
          Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visibleRows.length)} de {visibleRows.length}
        </p>
      )}
      <Pager page={safePage} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
