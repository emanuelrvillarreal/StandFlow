import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { supabase, createIsolatedAuthClient } from '../lib/supabase'
import {
  LayoutDashboard, Users, Calendar, Tag, LogOut,
  Eye, TrendingUp, Settings, ClipboardList,
} from 'lucide-react'
import {
  createUuid, normalizePhone, toEventRow, toStandRow, toProfileRow, mapProfile,
} from './admin/adminHelpers'
import DashboardTab from './admin/DashboardTab'
import EventsTab from './admin/EventsTab'
import ReservationsTab from './admin/ReservationsTab'
import FinancesTab from './admin/FinancesTab'
import CategoriesTab from './admin/CategoriesTab'
import UsersTab from './admin/UsersTab'
import SettingsTab from './admin/SettingsTab'
import ReservationDetailModal from './admin/ReservationDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'
import UserModal from './admin/UserModal'
import BlockUserModal from './admin/BlockUserModal'
import EventModal from './admin/EventModal'

const EMPTY_EVENT_FORM = {
  name: '', date: '', endDate: '', location: '', status: 'upcoming', whatsapp: '', paymentInstructions: '',
  posterImage: null, mapImageSalon: null, mapImageGaleria: null, copyFrom: 'none',
}

export default function AdminPage() {
  const { state, dispatch, logout, refreshUsers } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { events, reservations, users, categories, currentUser, expenses } = state
  const [tab, setTab] = useState('dashboard')
  const [filterEventId, setFilterEventId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [reservationPage, setReservationPage] = useState(1)
  const [catForm, setCatForm] = useState({ name: '', color: '#3B82F6' })
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', type: 'expense' })
  const [editingCat, setEditingCat] = useState(null)
  const [settingsForm, setSettingsForm] = useState(state.settings)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)
  const [showUserModal, setShowUserModal] = useState(false)
  const [blockUserTarget, setBlockUserTarget] = useState(null)
  const [blockReason, setBlockReason] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    name: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
    role_id: 2,
  })
  const [userError, setUserError] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [reservationDetail, setReservationDetail] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  function requestConfirm({ title, itemLabel, message, confirmLabel, tone, onConfirm }) {
    setConfirmDialog({ title, itemLabel, message, confirmLabel, tone, onConfirm })
  }
  function closeConfirmDialog() {
    setConfirmDialog(null)
  }
  async function runConfirmedAction() {
    const action = confirmDialog?.onConfirm
    setConfirmDialog(null)
    if (action) await action()
  }

  // Los datos de los expositores (nombre, foto, emprendimiento) pueden haber
  // cambiado o haberse registrado después de abrir el panel: se refrescan al
  // entrar a las pestañas que los muestran.
  useEffect(() => {
    if (tab === 'reservations' || tab === 'users' || tab === 'finances') refreshUsers()
  }, [tab, refreshUsers])

  useEffect(() => {
    if (location.state?.openNewEventModal) {
      setTab('events')
      openCreateEventModal()
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
  const totalDeposit = reservations.filter(r => r.status === 'deposit_paid').length
  const totalPaid = reservations.filter(r => r.status === 'paid').length
  const totalRevenue = reservations.filter(r => r.status === 'paid' || r.status === 'deposit_paid').reduce((s, r) => s + r.amount, 0)
  const totalManualIncome = (expenses || []).filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses = (expenses || []).filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0)
  const netRevenue = totalRevenue + totalManualIncome - totalExpenses

  const filteredRes = reservations.filter(r => {
    if (filterEventId !== 'all' && r.eventId !== filterEventId) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCategory !== 'all' && r.categoryId !== filterCategory) return false
    return true
  })
  const reservationsPerPage = 20
  const totalReservationPages = Math.max(1, Math.ceil(filteredRes.length / reservationsPerPage))
  const reservationPageSafe = Math.min(reservationPage, totalReservationPages)
  const paginatedRes = filteredRes.slice((reservationPageSafe - 1) * reservationsPerPage, reservationPageSafe * reservationsPerPage)

  function getEvent(id) { return events.find(e => e.id === id) }
  function getStand(eventId, standId) { return getEvent(eventId)?.stands.find(s => s.id === standId) }
  function getUser(id) { return users.find(u => u.id === id) }

  // Stands ocupados (pending/reserved) sin ninguna reserva activa.
  // Pasa cuando falla el insert de la reserva o se borra sin liberar el stand.
  const ACTIVE_RES_STATUSES = ['pending', 'deposit_paid', 'paid', 'reserved']
  const orphanStands = allStands.filter(s => {
    if (s.status !== 'pending' && s.status !== 'reserved') return false
    return !reservations.some(r => r.standId === s.id && ACTIVE_RES_STATUSES.includes(r.status))
  }).map(s => {
    const ev = events.find(e => e.stands.some(st => st.id === s.id))
    return { ...s, eventId: ev?.id, eventName: ev?.name }
  })

  async function handleFreeStand(stand) {
    const { error } = await supabase
      .from('stands')
      .update({ status: 'available', category_id: null })
      .eq('id', stand.id)
    if (error) {
      alert(`No se pudo liberar el stand ${stand.number}: ${error.message}`)
      return
    }
    dispatch({ type: 'UPDATE_STAND', eventId: stand.eventId, standId: stand.id, updates: { status: 'available', categoryId: null } })
  }

  function requestFreeStand(stand) {
    requestConfirm({
      title: '¿Liberar este stand?',
      itemLabel: `Stand ${stand.number} — ${stand.eventName || ''}`,
      message: 'Va a quedar disponible para reservar. Solo hacelo si no tiene una reserva activa.',
      confirmLabel: 'Sí, liberar',
      tone: 'neutral',
      onConfirm: () => handleFreeStand(stand),
    })
  }

  function requestFreeAllOrphanStands(list) {
    if (!list.length) return
    requestConfirm({
      title: `¿Liberar ${list.length} stands?`,
      itemLabel: 'Stands sin reserva activa',
      message: 'Todos van a quedar disponibles para reservar.',
      confirmLabel: 'Sí, liberar todos',
      tone: 'neutral',
      onConfirm: async () => {
        const { error } = await supabase
          .from('stands')
          .update({ status: 'available', category_id: null })
          .in('id', list.map(s => s.id))
        if (error) {
          alert(`No se pudieron liberar los stands: ${error.message}`)
          return
        }
        list.forEach(s => {
          dispatch({ type: 'UPDATE_STAND', eventId: s.eventId, standId: s.id, updates: { status: 'available', categoryId: null } })
        })
      },
    })
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

    const standStatus = (newStatus === 'paid' || newStatus === 'deposit_paid') ? 'reserved' : newStatus === 'cancelled' ? 'available' : 'pending'
    const isNowPaid = newStatus === 'paid' || newStatus === 'deposit_paid'
    // Se registra cuándo entró la plata para que Finanzas lo pueda mostrar
    // automáticamente; si se revierte el estado, se limpia esa fecha.
    const paidAt = isNowPaid ? (reservation.paidAt || new Date().toISOString()) : null
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({ status: newStatus, paid_at: paidAt })
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

    dispatch({ type: 'UPDATE_RESERVATION_STATUS', id: resId, status: newStatus, paidAt })
    if (reservationDetail?.reservation.id === resId) {
      setReservationDetail({
        ...reservationDetail,
        reservation: { ...reservationDetail.reservation, status: newStatus },
      })
    }
  }

  function handleDeleteReservation(reservation) {
    if (reservation.status !== 'cancelled') {
      alert('Primero tenés que cancelar la reserva para poder eliminarla.')
      return
    }

    requestConfirm({
      title: '¿Eliminar esta reserva?',
      itemLabel: reservation.standName,
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
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
      },
    })
  }

  async function handleAddCategory() {
    if (!catForm.name.trim()) return
    const newCat = { id: createUuid(), ...catForm }
    const { error } = await supabase.from('categories').insert(newCat)
    if (error) {
      alert(`No se pudo crear la categoría: ${error.message}`)
      return
    }
    dispatch({ type: 'ADD_CATEGORY', category: newCat })
    setCatForm({ name: '', color: '#3B82F6' })
  }

  async function handleSaveCat() {
    const { error } = await supabase
      .from('categories')
      .update({ name: editingCat.name, color: editingCat.color })
      .eq('id', editingCat.id)
    if (error) {
      alert(`No se pudo actualizar la categoría: ${error.message}`)
      return
    }
    dispatch({ type: 'UPDATE_CATEGORY', category: editingCat })
    setEditingCat(null)
  }

  function handleDeleteCategory(cat) {
    requestConfirm({
      title: '¿Eliminar esta categoría?',
      itemLabel: cat.name,
      message: 'Las reservas que ya la usan van a quedar sin categoría asignada.',
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', cat.id)
        if (error) {
          alert(`No se pudo eliminar la categoría: ${error.message}`)
          return
        }
        dispatch({ type: 'DELETE_CATEGORY', id: cat.id })
      },
    })
  }

  async function handleAddExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) return
    const newExpense = {
      id: createUuid(),
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      type: expenseForm.type,
      created_at: new Date().toISOString()
    }
    const { error } = await supabase.from('expenses').insert(newExpense)
    if (error) {
      alert(`No se pudo registrar el movimiento: ${error.message}`)
      return
    }
    dispatch({ type: 'ADD_EXPENSE', expense: newExpense })
    setExpenseForm({ description: '', amount: '', type: expenseForm.type })
  }

  function handleDeleteExpense(expense) {
    requestConfirm({
      title: '¿Eliminar este movimiento?',
      itemLabel: expense.description,
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
        const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
        if (error) {
          alert(`No se pudo eliminar: ${error.message}`)
          return
        }
        dispatch({ type: 'DELETE_EXPENSE', id: expense.id })
      },
    })
  }

  function openCreateEventModal() {
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
    setShowEventModal(true)
  }

  function openEditEventModal(event) {
    setEditingEvent(event)
    setEventForm({
      name: event.name || '',
      date: event.date || '',
      endDate: event.endDate || '',
      location: event.location || '',
      status: event.status || 'upcoming',
      whatsapp: event.whatsapp || '',
      paymentInstructions: event.paymentInstructions || '',
      posterImage: event.posterImage || null,
      mapImageSalon: event.mapImage?.salon || null,
      mapImageGaleria: event.mapImage?.galeria || null,
      copyFrom: 'none',
    })
    setShowEventModal(true)
  }

  async function handleCreateEvent() {
    const sourceEvent = eventForm.copyFrom !== 'none' ? events.find(e => e.id === eventForm.copyFrom) : null
    const newEvent = {
      id: createUuid(),
      name: eventForm.name,
      date: eventForm.date,
      endDate: eventForm.endDate || null,
      location: eventForm.location,
      status: 'upcoming',
      posterImage: eventForm.posterImage || sourceEvent?.posterImage || null,
      mapImage: sourceEvent
        ? sourceEvent.mapImage
        : {
          salon: eventForm.mapImageSalon || '/maps/salon.jpeg',
          galeria: eventForm.mapImageGaleria || '/maps/galeria.jpeg',
        },
      whatsapp: eventForm.whatsapp || sourceEvent?.whatsapp || state.settings?.whatsappNumber || '',
      paymentInstructions: eventForm.paymentInstructions || sourceEvent?.paymentInstructions || '',
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
    setEventForm(EMPTY_EVENT_FORM)
    navigate(`/events/${newEvent.id}/map`)
  }

  async function handleUpdateEvent() {
    const updatedEvent = {
      ...editingEvent,
      name: eventForm.name,
      date: eventForm.date,
      endDate: eventForm.endDate || null,
      location: eventForm.location,
      status: eventForm.status,
      whatsapp: eventForm.whatsapp,
      paymentInstructions: eventForm.paymentInstructions,
      posterImage: eventForm.posterImage,
      mapImage: {
        salon: eventForm.mapImageSalon || editingEvent.mapImage?.salon || '/maps/salon.jpeg',
        galeria: eventForm.mapImageGaleria || editingEvent.mapImage?.galeria || '/maps/galeria.jpeg',
      },
    }

    const { error } = await supabase.from('events').update(toEventRow(updatedEvent)).eq('id', editingEvent.id)
    if (error) {
      alert(`No se pudo actualizar el evento: ${error.message}`)
      return
    }

    dispatch({ type: 'UPDATE_EVENT', event: updatedEvent })
    setShowEventModal(false)
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
  }

  function handleSaveEvent() {
    if (!eventForm.name || !eventForm.date) return
    return editingEvent ? handleUpdateEvent() : handleCreateEvent()
  }

  function requestDeleteEvent(event) {
    requestConfirm({
      title: '¿Eliminar este evento?',
      itemLabel: event.name,
      message: 'Se van a borrar también todos sus stands y reservas. Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
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
      },
    })
  }

  function openCreateUserModal() {
    setEditingUser(null)
    setUserError('')
    setUserForm({ name: '', lastName: '', businessName: '', email: '', phone: '', password: '', role_id: 2 })
    setShowUserModal(true)
  }

  function openEditUserModal(user) {
    setEditingUser(user)
    setUserError('')
    setUserForm({
      name: user.name || '',
      lastName: user.lastName || '',
      businessName: user.businessName || '',
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

  function handleResetUserPassword(user) {
    if (!user.email) {
      alert('Este usuario no tiene un email cargado.')
      return
    }

    requestConfirm({
      title: '¿Reenviar recuperación de contraseña?',
      itemLabel: user.email,
      message: 'Le va a llegar un mail para que elija una nueva contraseña.',
      confirmLabel: 'Sí, enviar',
      tone: 'neutral',
      onConfirm: async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
        })

        if (error) {
          alert(`No se pudo enviar el email de recuperación: ${error.message}`)
          return
        }

        alert(`Le enviamos un email a ${user.email} para que pueda elegir una nueva contraseña.`)
      },
    })
  }

  function handleDeleteUser(user) {
    if (user.id === currentUser?.id) {
      alert('No podés eliminar tu propio usuario desde este panel.')
      return
    }

    requestConfirm({
      title: '¿Eliminar este usuario?',
      itemLabel: `${user.name} ${user.lastName}`,
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      onConfirm: async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ role_id: -1, role: 'deleted' })
          .eq('id', user.id)
        if (error) {
          alert(`No se pudo eliminar el usuario: ${error.message}`)
          return
        }

        dispatch({ type: 'DELETE_USER', id: user.id })
      },
    })
  }

  function openBlockUserModal(user) {
    if (user.id === currentUser?.id) {
      alert('No podés bloquear tu propio usuario.')
      return
    }
    setBlockUserTarget(user)
    setBlockReason('')
  }

  async function confirmBlockUser() {
    const user = blockUserTarget
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: true, blocked_reason: blockReason || null, blocked_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      alert(`No se pudo bloquear al usuario: ${error.message}`)
      return
    }

    dispatch({ type: 'UPDATE_USER', user: { ...user, isBlocked: true, blockedReason: blockReason } })
    setBlockUserTarget(null)
    setBlockReason('')
  }

  function handleUnblockUser(user) {
    requestConfirm({
      title: '¿Desbloquear este usuario?',
      itemLabel: `${user.name} ${user.lastName}`,
      message: 'Va a poder volver a iniciar sesión normalmente.',
      confirmLabel: 'Sí, desbloquear',
      tone: 'neutral',
      onConfirm: async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ is_blocked: false, blocked_reason: null, blocked_at: null })
          .eq('id', user.id)

        if (error) {
          alert(`No se pudo desbloquear al usuario: ${error.message}`)
          return
        }

        dispatch({ type: 'UPDATE_USER', user: { ...user, isBlocked: false, blockedReason: '' } })
      },
    })
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'reservations', label: 'Reservas', icon: ClipboardList },
    { id: 'finances', label: 'Finanzas', icon: TrendingUp },
    { id: 'categories', label: 'Categorías', icon: Tag },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <span className="font-bold text-lg">Panel Administrador</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/events')}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <Eye size={14} /> Ver eventos
            </button>
            <button onClick={async () => { await logout(); navigate('/') }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition whitespace-nowrap ${tab === t.id ? 'bg-gray-50 text-violet-700' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {tab === 'dashboard' && (
          <DashboardTab
            events={events} reservations={reservations} categories={categories}
            totalPending={totalPending} totalDeposit={totalDeposit} totalPaid={totalPaid}
            totalAvailable={totalAvailable} totalRevenue={totalRevenue} totalExpenses={totalExpenses}
            netRevenue={netRevenue} navigate={navigate}
          />
        )}

        {tab === 'events' && (
          <EventsTab
            events={events} navigate={navigate}
            onOpenCreateEvent={openCreateEventModal}
            onEditEvent={openEditEventModal}
            onDeleteEvent={requestDeleteEvent}
          />
        )}

        {tab === 'reservations' && (
          <ReservationsTab
            events={events} categories={categories} users={users} allStands={allStands}
            filterEventId={filterEventId} setFilterEventId={setFilterEventId}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filteredRes={filteredRes} paginatedRes={paginatedRes}
            reservationPageSafe={reservationPageSafe} totalReservationPages={totalReservationPages}
            setReservationPage={setReservationPage}
            getEvent={getEvent} getStand={getStand} getUser={getUser}
            onViewDetail={setReservationDetail}
            onStatusChange={handleStatusChange}
            onDeleteReservation={handleDeleteReservation}
            onNotifyPaid={notifyReservationPaid}
            orphanStands={orphanStands}
            onFreeStand={requestFreeStand}
            onFreeAllOrphanStands={requestFreeAllOrphanStands}
          />
        )}

        {tab === 'finances' && (
          <FinancesTab
            expenses={expenses} expenseForm={expenseForm} setExpenseForm={setExpenseForm}
            onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense}
            reservations={reservations} events={events} users={users}
            totalRevenue={totalRevenue} totalManualIncome={totalManualIncome}
            totalExpenses={totalExpenses} netRevenue={netRevenue}
          />
        )}

        {tab === 'categories' && (
          <CategoriesTab
            categories={categories} reservations={reservations}
            catForm={catForm} setCatForm={setCatForm} onAddCategory={handleAddCategory}
            editingCat={editingCat} setEditingCat={setEditingCat}
            onSaveCat={handleSaveCat} onDeleteCategory={handleDeleteCategory}
          />
        )}

        {tab === 'users' && (
          <UsersTab
            users={users} reservations={reservations}
            onOpenCreateUser={openCreateUserModal}
            onOpenEditUser={openEditUserModal}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetUserPassword}
            onBlockUser={openBlockUserModal}
            onUnblockUser={handleUnblockUser}
          />
        )}

        {tab === 'settings' && (
          <SettingsTab
            settingsForm={settingsForm} setSettingsForm={setSettingsForm}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>

      <ReservationDetailModal
        detail={reservationDetail}
        onClose={() => setReservationDetail(null)}
        onStatusChange={handleStatusChange}
        onDeleteReservation={handleDeleteReservation}
        onNotifyPaid={notifyReservationPaid}
      />

      <UserModal
        open={showUserModal}
        editingUser={editingUser}
        userForm={userForm}
        setUserForm={setUserForm}
        userError={userError}
        savingUser={savingUser}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUser}
      />

      <BlockUserModal
        open={!!blockUserTarget}
        user={blockUserTarget}
        reason={blockReason}
        setReason={setBlockReason}
        onClose={() => setBlockUserTarget(null)}
        onConfirm={confirmBlockUser}
      />

      <EventModal
        open={showEventModal}
        isEditing={!!editingEvent}
        events={events}
        eventForm={eventForm}
        setEventForm={setEventForm}
        onFileUpload={handleFileUpload}
        onClose={() => { setShowEventModal(false); setEditingEvent(null) }}
        onSave={handleSaveEvent}
      />

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        itemLabel={confirmDialog?.itemLabel}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirmDialog}
      />
    </div>
  )
}
