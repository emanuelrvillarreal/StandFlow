import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, Users, Calendar, Tag, LogOut,
  CheckCircle, XCircle, Clock, TrendingUp, Download,
  Plus, Edit2, Trash2, Eye, Filter, Map, MessageCircle, Settings,
  ClipboardList, Image as ImageIcon, Copy, Upload, MapPin
} from 'lucide-react'

const STATUS_LABELS = { pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado', reserved:'Reservado' }
const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  paid:      'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
  reserved:  'bg-blue-50 text-blue-700 border border-blue-200',
}

function exportCSV(reservations, events, users, stands, categories) {
  const header = ['Evento','Stand','Nombre Stand','Nombre','Apellido','Email','Teléfono','Categoría','Compartido','Comparte con','Instagram','Importe','Estado']
  const rows = reservations.map(r => {
    const ev = events.find(e => e.id === r.eventId)
    const st = ev?.stands.find(s => s.id === r.standId)
    const user = users.find(u => u.id === r.userId)
    const cat = categories.find(c => c.id === r.categoryId)
    return [
      ev?.name ?? '', st?.number ?? r.standId, r.standName,
      user?.name ?? '', user?.lastName ?? '', user?.email ?? '', user?.phone ?? '',
      cat?.name ?? '', r.shared ? 'Sí' : 'No', r.sharedWith ?? '', r.instagram ?? '',
      r.amount, STATUS_LABELS[r.status] ?? r.status,
    ]
  })
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'reservas.csv'; a.click()
  URL.revokeObjectURL(url)
}

function toEventRow(event) {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    status: event.status,
    map_image: event.mapImage,
    whatsapp: event.whatsapp,
    payment_instructions: event.paymentInstructions,
  }
}

function toStandRow(stand, eventId) {
  return {
    id: stand.id,
    event_id: eventId,
    number: stand.number,
    sector: stand.sector,
    x: stand.x,
    y: stand.y,
    price: stand.price,
    status: stand.status,
    category_id: stand.categoryId || null,
  }
}

function createUuid() {
  return crypto.randomUUID()
}

function createIsolatedAuthClient() {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function toProfileRow(user) {
  return {
    id: user.id,
    first_name: user.name,
    last_name: user.lastName,
    email: user.email,
    phone: user.phone,
    role: Number(user.role_id) === 1 ? 'admin' : 'user',
    role_id: Number(user.role_id),
  }
}

function mapProfile(profile) {
  return {
    ...profile,
    name: profile.name ?? profile.first_name ?? '',
    lastName: profile.lastName ?? profile.last_name ?? '',
  }
}

export default function AdminPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { events, reservations, users, categories, currentUser } = state
  const [tab, setTab] = useState('dashboard')
  const [filterEventId, setFilterEventId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [reservationPage, setReservationPage] = useState(1)
  const [catForm, setCatForm] = useState({ name: '', color: '#3B82F6' })
  const [editingCat, setEditingCat] = useState(null)
  const [settingsForm, setSettingsForm] = useState(state.settings)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({ 
    name: '', date: '', location: '', mapImageSalon: null, mapImageGaleria: null, copyFrom: 'none' 
  })
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role_id: 2,
  })
  const [userError, setUserError] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [reservationDetail, setReservationDetail] = useState(null)

  useEffect(() => {
    if (location.state?.openNewEventModal) {
      setTab('events')
      setShowEventModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  function handleFileUpload(e, type) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setEventForm(prev => ({ ...prev, [type]: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const allStands = events.flatMap(e => e.stands)
  const totalAvailable = allStands.filter(s => s.status === 'available').length
  const totalPending = reservations.filter(r => r.status === 'pending').length
  const totalPaid = reservations.filter(r => r.status === 'paid').length
  const totalRevenue = reservations.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)

  const filteredRes = reservations.filter(r => {
    if (filterEventId !== 'all' && r.eventId !== filterEventId) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCategory !== 'all' && r.categoryId !== filterCategory) return false
    return true
  })
  const reservationsPerPage = 10
  const totalReservationPages = Math.max(1, Math.ceil(filteredRes.length / reservationsPerPage))
  const reservationPageSafe = Math.min(reservationPage, totalReservationPages)
  const paginatedRes = filteredRes.slice((reservationPageSafe - 1) * reservationsPerPage, reservationPageSafe * reservationsPerPage)

  function getEvent(id) { return events.find(e => e.id === id) }
  function getStand(eventId, standId) { return getEvent(eventId)?.stands.find(s => s.id === standId) }
  function getUser(id) { return users.find(u => u.id === id) }

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '')
  }

  function notifyReservationPaid(reservation, event, stand, user) {
    const phone = normalizePhone(user?.phone)
    if (!phone) {
      alert('El expositor no tiene un número de celular cargado.')
      return
    }

    const category = categories.find(c => c.id === reservation.categoryId)
    let msg = state.settings?.whatsappPaidTemplate || [
      `Hola {usuario_nombre}!`,
      `Te confirmamos que tu cupo ya quedó completo porque registramos el pago.`,
      ``,
      `Evento: {evento}`,
      `Stand: {stand_numero} - {stand_nombre}`,
      `Categoría: {categoria}`,
      `Importe: {importe}`,
      ``,
      `Muchas gracias.`
    ].join('\n')

    const replacements = {
      '{evento}': event?.name || '-',
      '{stand_numero}': stand?.number || reservation.standId,
      '{stand_nombre}': reservation.standName,
      '{categoria}': category?.name || '-',
      '{importe}': `$${reservation.amount.toLocaleString('es-AR')}`,
      '{usuario_nombre}': `${user?.name || ''} ${user?.lastName || ''}`.trim(),
      '{usuario_email}': user?.email || '-',
      '{usuario_telefono}': user?.phone || '-',
    }

    Object.entries(replacements).forEach(([tag, value]) => {
      msg = msg.replaceAll(tag, value)
    })

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function handleStatusChange(resId, newStatus) {
    const reservation = reservations.find(r => r.id === resId)
    if (!reservation) return

    const standStatus = newStatus === 'paid' ? 'reserved' : newStatus === 'cancelled' ? 'available' : 'pending'
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', resId)

    if (reservationError) {
      alert(`No se pudo actualizar la reserva: ${reservationError.message}`)
      return
    }

    const { error: standError } = await supabase
      .from('stands')
      .update({ status: standStatus })
      .eq('id', reservation.standId)

    if (standError) {
      alert(`La reserva se actualizó, pero no se pudo actualizar el stand: ${standError.message}`)
      return
    }

    dispatch({ type: 'UPDATE_RESERVATION_STATUS', id: resId, status: newStatus })
    if (reservationDetail?.reservation.id === resId) {
      setReservationDetail({
        ...reservationDetail,
        reservation: { ...reservationDetail.reservation, status: newStatus },
      })
    }
  }

  async function handleDeleteReservation(reservation) {
    if (reservation.status !== 'cancelled') {
      alert('Primero tenés que cancelar la reserva para poder eliminarla.')
      return
    }

    const confirmed = window.confirm(`¿Eliminar la reserva "${reservation.standName}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    const { error: reservationError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservation.id)

    if (reservationError) {
      alert(`No se pudo eliminar la reserva: ${reservationError.message}`)
      return
    }

    const { error: standError } = await supabase
      .from('stands')
      .update({ status: 'available', category_id: null })
      .eq('id', reservation.standId)

    if (standError) {
      alert(`La reserva se eliminó, pero no se pudo liberar el stand: ${standError.message}`)
      return
    }

    dispatch({ type: 'DELETE_RESERVATION', id: reservation.id })
    if (reservationDetail?.reservation.id === reservation.id) {
      setReservationDetail(null)
    }
  }

  function handleAddCategory() {
    if (!catForm.name.trim()) return
    dispatch({ type: 'ADD_CATEGORY', category: { id: 'cat' + Date.now(), ...catForm } })
    setCatForm({ name: '', color: '#3B82F6' })
  }

  function handleSaveCat() {
    dispatch({ type: 'UPDATE_CATEGORY', category: editingCat })
    setEditingCat(null)
  }

  async function handleCreateEvent() {
    if (!eventForm.name || !eventForm.date) return

    const sourceEvent = eventForm.copyFrom !== 'none' ? events.find(e => e.id === eventForm.copyFrom) : null
    const newEvent = {
      id: createUuid(),
      name: eventForm.name,
      date: eventForm.date,
      location: eventForm.location,
      status: 'upcoming',
      mapImage: sourceEvent
        ? sourceEvent.mapImage
        : {
            salon: eventForm.mapImageSalon || '/maps/salon.jpeg',
            galeria: eventForm.mapImageGaleria || '/maps/galeria.jpeg',
          },
      whatsapp: sourceEvent?.whatsapp || state.settings?.whatsappNumber || '',
      paymentInstructions: sourceEvent?.paymentInstructions || '',
      stands: sourceEvent
        ? sourceEvent.stands.map(stand => ({
            ...stand,
            id: createUuid(),
            status: 'available',
            categoryId: null,
          }))
        : [],
    }

    const { error: eventError } = await supabase.from('events').insert(toEventRow(newEvent))
    if (eventError) {
      alert(`No se pudo guardar el evento en la base de datos: ${eventError.message}`)
      return
    }

    if (newEvent.stands.length > 0) {
      const { error: standsError } = await supabase
        .from('stands')
        .insert(newEvent.stands.map(stand => toStandRow(stand, newEvent.id)))

      if (standsError) {
        alert(`El evento se creó, pero no se pudieron guardar los stands: ${standsError.message}`)
      }
    }

    dispatch({ type: 'ADD_EVENT', event: newEvent })
    setShowEventModal(false)
    setEventForm({ name: '', date: '', location: '', mapImageSalon: null, mapImageGaleria: null, copyFrom: 'none' })
    navigate(`/events/${newEvent.id}/map`)
  }

  async function handleDeleteEvent(event) {
    const confirmed = window.confirm(`¿Eliminar el evento "${event.name}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    const { error: reservationsError } = await supabase.from('reservations').delete().eq('event_id', event.id)
    if (reservationsError) {
      alert(`No se pudieron eliminar las reservas del evento: ${reservationsError.message}`)
      return
    }

    const { error: standsError } = await supabase.from('stands').delete().eq('event_id', event.id)
    if (standsError) {
      alert(`No se pudieron eliminar los stands del evento: ${standsError.message}`)
      return
    }

    const { error: eventError } = await supabase.from('events').delete().eq('id', event.id)
    if (eventError) {
      alert(`No se pudo eliminar el evento de la base de datos: ${eventError.message}`)
      return
    }

    dispatch({ type: 'DELETE_EVENT', eventId: event.id })
  }

  function openCreateUserModal() {
    setEditingUser(null)
    setUserError('')
    setUserForm({ name: '', lastName: '', email: '', phone: '', password: '', role_id: 2 })
    setShowUserModal(true)
  }

  function openEditUserModal(user) {
    setEditingUser(user)
    setUserError('')
    setUserForm({
      name: user.name || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role_id: user.role_id || 2,
    })
    setShowUserModal(true)
  }

  async function handleSaveUser() {
    setUserError('')

    if (!userForm.name.trim() || !userForm.lastName.trim() || !userForm.email.trim()) {
      setUserError('Completá nombre, apellido y email')
      return
    }

    if (!editingUser && userForm.password.length < 6) {
      setUserError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSavingUser(true)
    try {
      if (editingUser) {
        const updatedUser = { ...editingUser, ...userForm, role_id: Number(userForm.role_id) }
        const { error } = await supabase
          .from('profiles')
          .update(toProfileRow(updatedUser))
          .eq('id', editingUser.id)

        if (error) {
          setUserError(error.message)
          return
        }

        dispatch({ type: 'UPDATE_USER', user: mapProfile(updatedUser) })
      } else {
        const authClient = createIsolatedAuthClient()
        const { data, error: signUpError } = await authClient.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              name: userForm.name,
              lastName: userForm.lastName,
              phone: userForm.phone,
            },
          },
        })

        if (signUpError) {
          setUserError(signUpError.message)
          return
        }

        if (!data.user?.id) {
          setUserError('Supabase creó el alta pendiente, pero no devolvió el usuario. Revisá la configuración de confirmación por email.')
          return
        }

        const newUser = { ...userForm, id: data.user.id, role_id: Number(userForm.role_id) }
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(toProfileRow(newUser), { onConflict: 'id' })

        if (profileError) {
          setUserError(profileError.message)
          return
        }

        dispatch({ type: 'ADD_USER', user: mapProfile(newUser) })
      }

      setShowUserModal(false)
    } finally {
      setSavingUser(false)
    }
  }

  async function handleDeleteUser(user) {
    if (user.id === currentUser?.id) {
      alert('No podés eliminar tu propio usuario desde este panel.')
      return
    }

    const confirmed = window.confirm(`¿Eliminar el usuario "${user.name} ${user.lastName}"?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('profiles')
      .update({ role_id: -1, role: 'deleted' })
      .eq('id', user.id)
    if (error) {
      alert(`No se pudo eliminar el usuario: ${error.message}`)
      return
    }

    dispatch({ type: 'DELETE_USER', id: user.id })
  }

  async function handleSaveSettings() {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: 'whatsapp',
        value: settingsForm,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      alert(`No se pudo guardar la configuración en la base de datos: ${error.message}`)
      return
    }

    dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: settingsForm })
    alert('Configuración guardada correctamente')
  }

  const TABS = [
    { id:'dashboard', label:'Dashboard', icon: LayoutDashboard },
    { id:'events', label:'Eventos', icon: Calendar },
    { id:'reservations', label:'Reservas', icon: ClipboardList },
    { id:'categories', label:'Categorías', icon: Tag },
    { id:'users', label:'Usuarios', icon: Users },
    { id:'settings', label:'Ajustes', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <LayoutDashboard size={16}/>
            </div>
            <span className="font-bold text-lg">Panel Administrador</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/events')}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <Eye size={14}/> Ver eventos
            </button>
            <button onClick={() => { dispatch({ type:'LOGOUT' }); navigate('/') }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <LogOut size={14}/> Salir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition whitespace-nowrap ${tab===t.id ? 'bg-gray-50 text-violet-700' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Pendientes', value: totalPending, icon: Clock, color:'text-yellow-600 bg-yellow-50' },
                { label:'Pagados', value: totalPaid, icon: CheckCircle, color:'text-green-600 bg-green-50' },
                { label:'Disponibles', value: totalAvailable, icon: Map, color:'text-blue-600 bg-blue-50' },
                { label:'Recaudado', value: `$${totalRevenue.toLocaleString('es-AR')}`, icon: TrendingUp, color:'text-violet-600 bg-violet-50' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-5">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                    <stat.icon size={20}/>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Category distribution */}
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
                          style={{width: `${(count/total)*100}%`, background: cat.color}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Events summary */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-800 mb-4">Resumen por evento</h3>
              <div className="space-y-3">
                {events.map(ev => {
                  const evRes = reservations.filter(r => r.eventId === ev.id)
                  return (
                    <div key={ev.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{ev.name}</p>
                        <p className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString('es-AR')}</p>
                      </div>
                      <div className="flex gap-3 text-xs text-right">
                        <span className="text-yellow-600">{evRes.filter(r=>r.status==='pending').length} pend.</span>
                        <span className="text-green-600">{evRes.filter(r=>r.status==='paid').length} pag.</span>
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
        )}

        {/* ── Events ── */}
        {tab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{events.length} eventos registrados</p>
              <button 
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
              >
                <Plus size={18}/> Nuevo Evento
              </button>
            </div>

            <div className="grid gap-4">
              {events.map(ev => (
                <div key={ev.id} className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                      <Calendar size={24}/>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{ev.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><MapPin size={12}/> {ev.location}</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(ev.date).toLocaleDateString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={() => navigate(`/events/${ev.id}/map`)}
                      className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Ver Mapa">
                      <Map size={18}/>
                    </button>
                    <button onClick={() => handleDeleteEvent(ev)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reservations ── */}
        {tab === 'reservations' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-3 items-center">
              <Filter size={16} className="text-gray-400"/>
              <select value={filterEventId} onChange={e => { setFilterEventId(e.target.value); setReservationPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todos los eventos</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setReservationPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setReservationPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => exportCSV(filteredRes, events, users, allStands, categories)}
                className="ml-auto flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                <Download size={14}/> Exportar CSV
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
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{ev?.name}</p>
                        <p className="text-xs text-gray-400">Stand {stand?.number} — {r.standName}</p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Expositor</p>
                        <p className="font-medium">{user?.name} {user?.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Categoría</p>
                        {cat ? (
                          <p className="font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{background:cat.color}}/>
                            {cat.name}
                          </p>
                        ) : <p className="text-gray-400">—</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Importe</p>
                        <p className="font-bold text-violet-600">${r.amount.toLocaleString('es-AR')}</p>
                        <p className="text-xs text-gray-400">Stand {stand?.number ?? r.standId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Compartido</p>
                        <p className="font-medium">{r.shared ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-2">
                      <button onClick={() => setReservationDetail({ reservation: r, event: ev, stand, user, category: cat })}
                        className="flex items-center gap-1 text-xs bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                        <Eye size={12}/> Ver detalle
                      </button>
                      {r.status !== 'paid' && (
                        <button onClick={() => handleStatusChange(r.id, 'paid')}
                          className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition">
                          <CheckCircle size={12}/> Marcar pagado
                        </button>
                      )}
                      {r.status !== 'cancelled' && (
                        <button onClick={() => handleStatusChange(r.id, 'cancelled')}
                          className="flex items-center gap-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg transition">
                          <XCircle size={12}/> Cancelar
                        </button>
                      )}
                      {r.status === 'cancelled' && (
                        <button onClick={() => handleStatusChange(r.id, 'pending')}
                          className="flex items-center gap-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg transition">
                          <Clock size={12}/> Reactivar
                        </button>
                      )}
                      {r.status === 'cancelled' && (
                        <button onClick={() => handleDeleteReservation(r)}
                          className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition">
                          <Trash2 size={12}/> Eliminar
                        </button>
                      )}
                      {user?.phone && (
                        <button onClick={() => notifyReservationPaid(r, ev, stand, user)}
                          className="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition">
                          <MessageCircle size={12}/> Avisar cupo completo
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {tab === 'categories' && (
          <div className="space-y-4 max-w-xl">
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-800 mb-4">Agregar categoría</h3>
              <div className="flex gap-3">
                <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})}
                  placeholder="Nombre de categoría"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"/>
                <div className="flex items-center gap-2">
                  <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm,color:e.target.value})}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"/>
                </div>
                <button onClick={handleAddCategory}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1">
                  <Plus size={14}/> Agregar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border divide-y">
              {categories.map(cat => (
                <div key={cat.id} className="px-5 py-4 flex items-center justify-between">
                  {editingCat?.id === cat.id ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <input type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat,name:e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                      <input type="color" value={editingCat.color} onChange={e => setEditingCat({...editingCat,color:e.target.value})}
                        className="w-9 h-9 rounded-xl border cursor-pointer p-0.5"/>
                      <button onClick={handleSaveCat}
                        className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-green-600 transition">
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full" style={{background:cat.color}}/>
                      <span className="font-medium text-gray-800">{cat.name}</span>
                      <span className="text-xs text-gray-400">
                        {reservations.filter(r=>r.categoryId===cat.id).length} reservas
                      </span>
                    </div>
                  )}
                  {editingCat?.id !== cat.id && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingCat(cat)}
                        className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => dispatch({ type:'DELETE_CATEGORY', id:cat.id })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">{users.length} usuarios registrados</p>
              <button
                onClick={openCreateUserModal}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
              >
                <Plus size={18}/> Crear nuevo usuario
              </button>
            </div>
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm border p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-bold text-violet-600">
                    {u.name?.[0]}{u.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.name} {u.lastName}</p>
                    <p className="text-sm text-gray-400">{u.email} • {u.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.role_id===1?'bg-violet-100 text-violet-700':'bg-gray-100 text-gray-600'}`}>
                    {u.role_id === 1 ? 'Admin' : 'Expositor'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {reservations.filter(r=>r.userId===u.id).length} reservas
                  </span>
                  <button onClick={() => openEditUserModal(u)}
                    className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Modificar">
                    <Edit2 size={16}/>
                  </button>
                  <button onClick={() => handleDeleteUser(u)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Settings ── */}
        {tab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageCircle size={18} className="text-violet-600"/>
                Configuración de WhatsApp
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Número de WhatsApp (con código de país, ej: 54911...)
                  </label>
                  <input 
                    type="text" 
                    value={settingsForm.whatsappNumber} 
                    onChange={e => setSettingsForm({...settingsForm, whatsappNumber: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    placeholder="Ej: 5491112345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Plantilla para enviar comprobante
                  </label>
                  <textarea 
                    value={settingsForm.whatsappTemplate} 
                    onChange={e => setSettingsForm({...settingsForm, whatsappTemplate: e.target.value})}
                    rows={10}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
                    placeholder="Escribe el mensaje..."
                  />
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Etiquetas disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {['{evento}', '{stand_numero}', '{stand_nombre}', '{categoria}', '{importe}', '{usuario_nombre}', '{usuario_email}', '{usuario_telefono}', '{compartido}', '{instagram}'].map(tag => (
                        <code key={tag} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-violet-600">{tag}</code>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Plantilla de confirmación de cupo
                  </label>
                  <textarea
                    value={settingsForm.whatsappPaidTemplate || ''}
                    onChange={e => setSettingsForm({...settingsForm, whatsappPaidTemplate: e.target.value})}
                    rows={8}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
                    placeholder="Mensaje para avisar que el cupo quedó confirmado..."
                  />
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Etiquetas disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {['{evento}', '{stand_numero}', '{stand_nombre}', '{categoria}', '{importe}', '{usuario_nombre}', '{usuario_email}', '{usuario_telefono}'].map(tag => (
                        <code key={tag} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-violet-600">{tag}</code>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition shadow-sm"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Settings className="text-amber-600" size={20}/>
              </div>
              <div>
                <h4 className="font-bold text-amber-900 text-sm mb-1">Información importante</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Las etiquetas se reemplazarán automáticamente con la información real de la reserva cuando el usuario haga click en el botón de WhatsApp. Asegúrate de incluirlas para que recibas todos los datos necesarios.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reservation Detail Modal */}
      {reservationDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Detalle de reserva</h2>
                <p className="text-sm text-gray-400">{reservationDetail.event?.name}</p>
              </div>
              <button onClick={() => setReservationDetail(null)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45"/>
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Stand</p>
                  <p className="font-bold text-gray-900">N° {reservationDetail.stand?.number ?? reservationDetail.reservation.standId}</p>
                  <p className="text-gray-500">{reservationDetail.reservation.standName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Categoría</p>
                  <p className="font-medium">{reservationDetail.category?.name || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Importe / Estado</p>
                  <p className="font-bold text-violet-600">${reservationDetail.reservation.amount.toLocaleString('es-AR')}</p>
                  <p className="text-gray-500">{STATUS_LABELS[reservationDetail.reservation.status]}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-3">Datos del expositor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Nombre</p>
                    <p className="font-medium">{reservationDetail.user?.name} {reservationDetail.user?.lastName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Celular</p>
                    <p className="font-medium">{reservationDetail.user?.phone || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium break-all">{reservationDetail.user?.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-3">Datos compartidos</h3>
                {reservationDetail.reservation.shared ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Comparte con</p>
                      <p className="font-medium">{reservationDetail.reservation.sharedWith}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Instagram</p>
                      <p className="font-medium">{reservationDetail.reservation.instagram || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">No comparte stand.</div>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3">
              {reservationDetail.reservation.status !== 'paid' && (
                <button onClick={() => handleStatusChange(reservationDetail.reservation.id, 'paid')}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                  <CheckCircle size={14}/> Marcar pagado
                </button>
              )}
              {reservationDetail.reservation.status !== 'cancelled' && (
                <button onClick={() => handleStatusChange(reservationDetail.reservation.id, 'cancelled')}
                  className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition">
                  <XCircle size={14}/> Cancelar
                </button>
              )}
              {reservationDetail.reservation.status === 'cancelled' && (
                <button onClick={() => handleStatusChange(reservationDetail.reservation.id, 'pending')}
                  className="flex items-center gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium transition">
                  <Clock size={14}/> Reactivar
                </button>
              )}
              {reservationDetail.reservation.status === 'cancelled' && (
                <button onClick={() => handleDeleteReservation(reservationDetail.reservation)}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                  <Trash2 size={14}/> Eliminar
                </button>
              )}
              {reservationDetail.user?.phone && (
                <button onClick={() => notifyReservationPaid(reservationDetail.reservation, reservationDetail.event, reservationDetail.stand, reservationDetail.user)}
                  className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium transition">
                  <MessageCircle size={14}/> Avisar cupo completo
                </button>
              )}
              <button onClick={() => setReservationDetail(null)}
                className="ml-auto px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900 text-lg">{editingUser ? 'Modificar usuario' : 'Crear nuevo usuario'}</h2>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45"/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {userError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{userError}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre</label>
                  <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Apellido</label>
                  <input type="text" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})}
                  disabled={!!editingUser}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-400"/>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Teléfono</label>
                <input type="tel" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Contraseña inicial</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Tipo de usuario</label>
                <select value={userForm.role_id} onChange={e => setUserForm({...userForm, role_id: Number(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition bg-white">
                  <option value={2}>Expositor</option>
                  <option value={1}>Administrador</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button onClick={() => setShowUserModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition">
                Cancelar
              </button>
              <button onClick={handleSaveUser} disabled={savingUser}
                className="flex-[2] px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-200">
                {savingUser ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Event Modal ── */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900 text-lg">Crear Nuevo Evento</h2>
              <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre del evento</label>
                  <input type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})}
                    placeholder="Ej: Expo Feria Verano 2026"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Fecha</label>
                    <input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Lugar</label>
                    <input type="text" value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})}
                      placeholder="Ej: Centro de Convenciones"
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Configuración de Mapa (Salón)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-violet-300 hover:text-violet-600 transition group cursor-pointer bg-white">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mapImageSalon')}/>
                      <Upload size={20}/>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-600 group-hover:text-violet-700">Subir Captura</p>
                        <p className="text-[10px]">JPEG o PNG</p>
                      </div>
                    </label>
                    <div className="p-1 border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden relative min-h-[60px]">
                      {eventForm.mapImageSalon ? (
                        <img src={eventForm.mapImageSalon} className="w-full h-full object-cover" alt="Preview Salon"/>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 p-3">
                          <ImageIcon size={16}/>
                          <p className="text-sm font-bold">Sin imagen</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Configuración de Mapa (Galería - Opcional)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-violet-300 hover:text-violet-600 transition group cursor-pointer bg-white">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'mapImageGaleria')}/>
                      <Upload size={20}/>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-600 group-hover:text-violet-700">Subir Captura</p>
                        <p className="text-[10px]">JPEG o PNG</p>
                      </div>
                    </label>
                    <div className="p-1 border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden relative min-h-[60px]">
                      {eventForm.mapImageGaleria ? (
                        <img src={eventForm.mapImageGaleria} className="w-full h-full object-cover" alt="Preview Galeria"/>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 p-3">
                          <ImageIcon size={16}/>
                          <p className="text-sm font-bold">Sin imagen</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase mb-3">
                    <Copy size={14}/> 
                    Estructura de Stands
                  </label>
                  <select 
                    value={eventForm.copyFrom} 
                    onChange={e => setEventForm({...eventForm, copyFrom: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-violet-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="none">✨ Evento Nuevo (Sin stands)</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>📋 Clonar de: {ev.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-violet-400 mt-2 italic px-1">
                    * Si clonas un evento, se copiarán todos los stands con sus posiciones actuales.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateEvent}
                disabled={!eventForm.name || !eventForm.date}
                className="flex-[2] px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-200"
              >
                Crear Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
