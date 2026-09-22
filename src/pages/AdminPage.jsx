import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { supabase, createIsolatedAuthClient } from '../lib/supabase'
import {
  LayoutDashboard, Users, Calendar, Tag, LogOut,
  Eye, TrendingUp, Settings, ClipboardList, UserCheck, Sparkles, Menu, X, ClipboardCheck, Zap,
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
import RequestsTab from './admin/RequestsTab'
import SponsorsTab from './admin/SponsorsTab'
import SponsorMemberModal from './admin/SponsorMemberModal'
import AttendanceTab from './admin/AttendanceTab'
import SettingsTab from './admin/SettingsTab'
import ReservationDetailModal from './admin/ReservationDetailModal'
import ConfirmDialog from '../components/ConfirmDialog'
import NoticeDialog from '../components/NoticeDialog'
import UserModal from './admin/UserModal'
import BlockUserModal from './admin/BlockUserModal'
import EventModal from './admin/EventModal'

const EMPTY_EVENT_FORM = {
  name: '', date: '', endDate: '', location: '', status: 'upcoming', requiresApproval: false, allowPartialDays: false, whatsapp: '', paymentInstructions: '',
  posterImage: null, mapImageSalon: null, mapImageGaleria: null, mapImageSponsor: null, copyFrom: 'none',
  sponsorsEnabled: false, sponsorCode: '',
}

export default function AdminPage() {
  const { state, dispatch, logout, refreshUsers, refreshEventRequests, refreshSponsors, reloadData } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { events, reservations, users, categories, currentUser, expenses } = state
  const eventRequests = state.eventRequests || []
  const [tab, setTab] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [attendanceEventId, setAttendanceEventId] = useState('')
  const [memberModal, setMemberModal] = useState(null) // { registration, member|null, eventName, standNumber }
  const [savingMember, setSavingMember] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [filterEventId, setFilterEventId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [reservationPage, setReservationPage] = useState(1)
  const [reservationSort, setReservationSort] = useState('newest') // newest | oldest
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
    maxStands: 1,
    birthDate: '',
  })
  const [userError, setUserError] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [reservationDetail, setReservationDetail] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [notice, setNotice] = useState(null)

  // Popup de aviso ("listo, ya está"), en vez del alert() nativo del navegador.
  function showNotice({ title, itemLabel, message, tone }) {
    setNotice({ title, itemLabel, message, tone })
  }

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
    if (tab === 'reservations' || tab === 'users' || tab === 'finances' || tab === 'requests') refreshUsers()
    if (tab === 'requests') refreshEventRequests()
  }, [tab, refreshUsers, refreshEventRequests])

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
  const totalAvailable = allStands.filter(s => s.status === 'available' && s.sector !== 'sponsor').length
  const totalPending = reservations.filter(r => r.status === 'pending').length
  const totalDeposit = reservations.filter(r => r.status === 'deposit_paid').length
  const totalPaid = reservations.filter(r => r.status === 'paid').length
  // Plata que todavía falta cobrar: el precio completo del stand para las
  // pendientes (no pagaron nada), y lo que resta de la seña para las que
  // pagaron la mitad.
  const totalPendingAmount = reservations
    .filter(r => r.status === 'pending')
    .reduce((s, r) => s + (allStands.find(st => st.id === r.standId)?.price ?? r.amount ?? 0), 0)
  const totalDepositRemaining = reservations
    .filter(r => r.status === 'deposit_paid')
    .reduce((s, r) => {
      const total = allStands.find(st => st.id === r.standId)?.price ?? r.amount * 2
      return s + Math.max(0, total - r.amount)
    }, 0)
  const totalRevenue = reservations.filter(r => r.status === 'paid' || r.status === 'deposit_paid').reduce((s, r) => s + r.amount, 0)
  const totalManualIncome = (expenses || []).filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses = (expenses || []).filter(e => e.type !== 'income').reduce((s, e) => s + Number(e.amount), 0)
  const netRevenue = totalRevenue + totalManualIncome - totalExpenses

  const filteredRes = reservations
    .filter(r => {
      if (filterEventId !== 'all' && r.eventId !== filterEventId) return false
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterCategory !== 'all' && r.categoryId !== filterCategory) return false
      return true
    })
    .sort((a, b) => {
      const diff = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      return reservationSort === 'newest' ? -diff : diff
    })
  const reservationsPerPage = 10
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
    // Un stand tomado por un Sponsor no tiene reserva a propósito (es gratis).
    if ((state.sponsorRegistrations || []).some(r => r.standId === s.id)) return false
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
      showNotice({ title: 'No se pudo liberar', message: `No se pudo liberar el stand ${stand.number}: ${error.message}`, tone: 'danger' })
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
          showNotice({ title: 'No se pudo liberar', message: `No se pudieron liberar los stands: ${error.message}`, tone: 'danger' })
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
      showNotice({ title: 'Falta el celular', message: 'El expositor no tiene un número de celular cargado.', tone: 'danger' })
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

    // El importe y el tipo de pago se acomodan al estado que se está marcando:
    // "Pagado" es el precio completo, "Seña Paga" es la mitad. Si no se hace
    // esto, marcar "Pagado" sobre una reserva que había elegido seña deja el
    // monto viejo (la mitad) archivado, y Finanzas cuenta de menos la plata
    // real que entró.
    const stand = getStand(reservation.eventId, reservation.standId)
    const updates = { status: newStatus, paid_at: paidAt }
    // Si venía de "Seña Paga" y ahora se cobró el resto, esa fecha se guarda
    // aparte (no pisa la fecha de la seña): así Finanzas puede mostrar los dos
    // cobros como movimientos separados, cada uno en su día real.
    const wasDepositOnly = reservation.status === 'deposit_paid'
    updates.balance_paid_at = (newStatus === 'paid' && wasDepositOnly)
      ? (reservation.balancePaidAt || new Date().toISOString())
      : null
    if (stand?.price) {
      if (newStatus === 'paid') { updates.amount = stand.price; updates.payment_type = 'full' }
      else if (newStatus === 'deposit_paid') { updates.amount = stand.price / 2; updates.payment_type = 'deposit' }
    }

    const { error: reservationError } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', resId)

    if (reservationError) {
      showNotice({ title: 'No se pudo actualizar', message: `No se pudo actualizar la reserva: ${reservationError.message}`, tone: 'danger' })
      return
    }

    const { error: standError } = await supabase
      .from('stands')
      .update({ status: standStatus })
      .eq('id', reservation.standId)

    if (standError) {
      showNotice({ title: 'Reserva actualizada con un problema', message: `La reserva se actualizó, pero no se pudo actualizar el stand: ${standError.message}`, tone: 'danger' })
      return
    }

    dispatch({
      type: 'UPDATE_RESERVATION_STATUS', id: resId, status: newStatus, paidAt,
      amount: updates.amount, paymentType: updates.payment_type, balancePaidAt: updates.balance_paid_at,
    })
    if (reservationDetail?.reservation.id === resId) {
      setReservationDetail({
        ...reservationDetail,
        reservation: {
          ...reservationDetail.reservation, status: newStatus,
          amount: updates.amount ?? reservationDetail.reservation.amount,
          paymentType: updates.payment_type ?? reservationDetail.reservation.paymentType,
          balancePaidAt: updates.balance_paid_at,
        },
      })
    }
  }

  function handleDeleteReservation(reservation) {
    if (reservation.status !== 'cancelled') {
      showNotice({ title: 'No se puede eliminar', message: 'Primero tenés que cancelar la reserva para poder eliminarla.', tone: 'danger' })
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
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar la reserva: ${reservationError.message}`, tone: 'danger' })
          return
        }

        const { error: standError } = await supabase
          .from('stands')
          .update({ status: 'available', category_id: null })
          .eq('id', reservation.standId)

        if (standError) {
          showNotice({ title: 'Reserva eliminada con un problema', message: `La reserva se eliminó, pero no se pudo liberar el stand: ${standError.message}`, tone: 'danger' })
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
      showNotice({ title: 'No se pudo crear', message: `No se pudo crear la categoría: ${error.message}`, tone: 'danger' })
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
      showNotice({ title: 'No se pudo actualizar', message: `No se pudo actualizar la categoría: ${error.message}`, tone: 'danger' })
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
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar la categoría: ${error.message}`, tone: 'danger' })
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
      showNotice({ title: 'No se pudo registrar', message: `No se pudo registrar el movimiento: ${error.message}`, tone: 'danger' })
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
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar: ${error.message}`, tone: 'danger' })
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
      requiresApproval: !!event.requiresApproval,
      allowPartialDays: !!event.allowPartialDays,
      location: event.location || '',
      status: event.status || 'upcoming',
      whatsapp: event.whatsapp || '',
      paymentInstructions: event.paymentInstructions || '',
      posterImage: event.posterImage || null,
      mapImageSalon: event.mapImage?.salon || null,
      mapImageGaleria: event.mapImage?.galeria || null,
      copyFrom: 'none',
      sponsorsEnabled: !!event.sponsors?.enabled,
      sponsorCode: event.sponsors?.code || '',
      mapImageSponsor: event.sponsors?.image || null,
    })
    setShowEventModal(true)
  }

  // Guarda la configuración de Sponsors del evento (habilitado y código). El mapa y
  // los stands de Sponsors se manejan como los de Salón/Galería (sector "sponsor").
  // Devuelve un mensaje de error o null.
  async function saveSponsorConfig(eventId, form) {
    const code = (form.sponsorCode || '').trim().toUpperCase()
    const { error: cfgError } = await supabase.from('event_sponsor_settings').upsert({
      event_id: eventId,
      enabled: !!form.sponsorsEnabled,
      code: code || null,
      image: form.mapImageSponsor || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id' })
    if (cfgError) {
      return cfgError.code === '23505'
        ? 'Ese código de Sponsor ya lo usa otro evento. Elegí uno distinto.'
        : `No se pudo guardar la configuración de Sponsors: ${cfgError.message}`
    }
    return null
  }

  function sponsorFormError() {
    if (eventForm.sponsorsEnabled && !(eventForm.sponsorCode || '').trim()) {
      return 'Para habilitar Sponsors cargá un código (o generá uno).'
    }
    return null
  }

  async function handleCreateEvent() {
    const sourceEvent = eventForm.copyFrom !== 'none' ? events.find(e => e.id === eventForm.copyFrom) : null
    const newEvent = {
      id: createUuid(),
      name: eventForm.name,
      date: eventForm.date,
      endDate: eventForm.endDate || null,
      requiresApproval: !!eventForm.requiresApproval,
      allowPartialDays: !!eventForm.allowPartialDays,
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
          isSponsor: stand.sector === 'sponsor',
        }))
        : [],
      sponsors: { enabled: false, code: '' },
    }

    const { error: eventError } = await supabase.from('events').insert(toEventRow(newEvent))
    if (eventError) {
      showNotice({ title: 'No se pudo guardar', message: `No se pudo guardar el evento en la base de datos: ${eventError.message}`, tone: 'danger' })
      return
    }

    if (newEvent.stands.length > 0) {
      const { error: standsError } = await supabase
        .from('stands')
        .insert(newEvent.stands.map(stand => toStandRow(stand, newEvent.id)))

      if (standsError) {
        showNotice({ title: 'Evento creado con un problema', message: `El evento se creó, pero no se pudieron guardar los stands: ${standsError.message}`, tone: 'danger' })
      }
    }

    if (eventForm.sponsorsEnabled) {
      const sponsorError = await saveSponsorConfig(newEvent.id, eventForm)
      if (sponsorError) {
        showNotice({ title: 'Evento creado con un problema', message: `El evento se creó, pero: ${sponsorError}`, tone: 'danger' })
      } else {
        newEvent.sponsors = { enabled: true, code: (eventForm.sponsorCode || '').trim().toUpperCase(), image: eventForm.mapImageSponsor || null }
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
      requiresApproval: !!eventForm.requiresApproval,
      allowPartialDays: !!eventForm.allowPartialDays,
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
      showNotice({ title: 'No se pudo actualizar', message: `No se pudo actualizar el evento: ${error.message}`, tone: 'danger' })
      return
    }

    const sponsorsChanged =
      !!editingEvent.sponsors?.enabled !== !!eventForm.sponsorsEnabled ||
      (editingEvent.sponsors?.code || '') !== (eventForm.sponsorCode || '').trim().toUpperCase() ||
      (editingEvent.sponsors?.image || null) !== (eventForm.mapImageSponsor || null)
    if (sponsorsChanged) {
      const sponsorError = await saveSponsorConfig(editingEvent.id, eventForm)
      if (sponsorError) {
        showNotice({ title: 'No se pudo guardar', message: sponsorError, tone: 'danger' })
        return
      }
      updatedEvent.sponsors = {
        enabled: !!eventForm.sponsorsEnabled,
        code: (eventForm.sponsorCode || '').trim().toUpperCase(),
        image: eventForm.mapImageSponsor || null,
      }
    }

    dispatch({ type: 'UPDATE_EVENT', event: updatedEvent })
    setShowEventModal(false)
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
  }

  // Integrantes de un Sponsor: el admin puede sumar, corregir o quitar personas
  // (por ejemplo si cambia alguien del equipo) sin tocar la base a mano.
  function openMemberModal(registration, member = null) {
    const ev = events.find(e => e.id === registration.eventId)
    const stand = ev?.stands.find(s => s.id === registration.standId)
    setMemberError('')
    setMemberModal({ registration, member, eventName: ev?.name || 'Evento', standNumber: stand?.number ?? '' })
  }

  async function handleSaveMember(form) {
    const { registration, member } = memberModal
    setSavingMember(true)
    setMemberError('')
    const row = {
      first_name: form.firstName.trim(), last_name: form.lastName.trim(), dni: form.dni.trim(),
      phone: form.phone.trim(), email: form.email.trim(), birth_date: form.birthDate || null,
    }
    const { error } = member
      ? await supabase.from('sponsor_members').update(row).eq('id', member.id)
      : await supabase.from('sponsor_members').insert({
          ...row,
          registration_id: registration.id,
          position: registration.members.reduce((max, m, i) => Math.max(max, i), -1) + 1,
        })
    setSavingMember(false)
    if (error) { setMemberError(`No se pudo guardar: ${error.message}`); return }
    await refreshSponsors()
    setMemberModal(null)
  }

  function requestDeleteMember(registration, member) {
    if (registration.members.length <= 1) {
      showNotice({ title: 'No se puede quitar', message: 'Tiene que quedar al menos un integrante. Si querés dar de baja al Sponsor, usá "Liberar stand".', tone: 'danger' })
      return
    }
    requestConfirm({
      title: '¿Quitar a este integrante?',
      itemLabel: `${member.firstName} ${member.lastName}`,
      message: 'Se elimina de la lista del Sponsor (y su asistencia registrada). El stand y los demás integrantes no cambian.',
      confirmLabel: 'Sí, quitar',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('sponsor_members').delete().eq('id', member.id)
        if (error) { showNotice({ title: 'No se pudo quitar', message: `No se pudo quitar al integrante: ${error.message}`, tone: 'danger' }); return }
        await refreshSponsors()
      },
    })
  }

  function requestDeleteSponsorRegistration(reg) {
    const ev = events.find(e => e.id === reg.eventId)
    const stand = ev?.stands.find(s => s.id === reg.standId)
    requestConfirm({
      title: '¿Liberar el stand de este Sponsor?',
      itemLabel: `${ev?.name || 'Evento'} · Stand ${stand?.number ?? ''}`,
      message: 'Se elimina el registro del Sponsor y sus integrantes, y el stand vuelve a quedar disponible para otro Sponsor.',
      confirmLabel: 'Liberar stand',
      tone: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('sponsor_registrations').delete().eq('id', reg.id)
        if (error) {
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar el registro: ${error.message}`, tone: 'danger' })
          return
        }
        await refreshSponsors()
        dispatch({ type: 'UPDATE_STAND', eventId: reg.eventId, standId: reg.standId, updates: { status: 'available', categoryId: null } })
      },
    })
  }

  function handleSaveEvent() {
    if (!eventForm.name || !eventForm.date) return
    const spError = sponsorFormError()
    if (spError) { showNotice({ title: 'Revisá el formulario', message: spError, tone: 'danger' }); return }
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
          showNotice({ title: 'No se pudo eliminar', message: `No se pudieron eliminar las reservas del evento: ${reservationsError.message}`, tone: 'danger' })
          return
        }

        const { error: standsError } = await supabase.from('stands').delete().eq('event_id', event.id)
        if (standsError) {
          showNotice({ title: 'No se pudo eliminar', message: `No se pudieron eliminar los stands del evento: ${standsError.message}`, tone: 'danger' })
          return
        }

        const { error: eventError } = await supabase.from('events').delete().eq('id', event.id)
        if (eventError) {
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar el evento de la base de datos: ${eventError.message}`, tone: 'danger' })
          return
        }

        dispatch({ type: 'DELETE_EVENT', eventId: event.id })
      },
    })
  }

  function openCreateUserModal() {
    setEditingUser(null)
    setUserError('')
    setUserForm({ name: '', lastName: '', businessName: '', email: '', phone: '', password: '', role_id: 2, maxStands: 1, birthDate: '' })
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
      maxStands: user.maxStands || 1,
      birthDate: user.birthDate || '',
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
      showNotice({ title: 'Falta el email', message: 'Este usuario no tiene un email cargado.', tone: 'danger' })
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
          showNotice({ title: 'No se pudo enviar', message: `No se pudo enviar el email de recuperación: ${error.message}`, tone: 'danger' })
          return
        }

        showNotice({
          title: 'Email enviado',
          itemLabel: user.email,
          message: 'Le enviamos un email para que pueda elegir una nueva contraseña.',
          tone: 'success',
        })
      },
    })
  }

  function handleDeleteUser(user) {
    if (user.id === currentUser?.id) {
      showNotice({ title: 'No se puede', message: 'No podés eliminar tu propio usuario desde este panel.', tone: 'danger' })
      return
    }

    requestConfirm({
      title: '¿Dar de baja este usuario?',
      itemLabel: `${user.name} ${user.lastName}`,
      message: 'La cuenta deja de poder ingresar y desaparece de esta lista. Un sysadmin después puede eliminarla definitivamente de la base.',
      confirmLabel: 'Sí, dar de baja',
      onConfirm: async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ role_id: -1, role: 'deleted' })
          .eq('id', user.id)
        if (error) {
          showNotice({ title: 'No se pudo dar de baja', message: `No se pudo eliminar el usuario: ${error.message}`, tone: 'danger' })
          return
        }

        dispatch({ type: 'DELETE_USER', id: user.id })
      },
    })
  }

  // Eliminación definitiva (solo sysadmin): la cuenta desaparece de la base y del
  // sistema de usuarios. La base lo vuelve a verificar.
  function handlePurgeUser(user) {
    requestConfirm({
      title: '¿Eliminar definitivamente esta cuenta?',
      itemLabel: `${user.name} ${user.lastName} · ${user.email}`,
      message: 'Se borra de la base de datos y no se puede recuperar: también se eliminan sus reservas y solicitudes, y sus stands quedan libres. El mail queda disponible para volver a registrarse.',
      confirmLabel: 'Sí, eliminar definitivamente',
      onConfirm: async () => {
        const { error } = await supabase.rpc('purge_user_account', { p_user_id: user.id })
        if (error) {
          showNotice({ title: 'No se pudo eliminar', message: `No se pudo eliminar la cuenta: ${error.message}`, tone: 'danger' })
          return
        }
        dispatch({ type: 'REMOVE_DELETED_USER', id: user.id })
        // Sus reservas y stands cambiaron: se vuelven a traer los datos.
        reloadData()
      },
    })
  }

  // Vuelve a habilitar una cuenta dada de baja. No queda registrado qué tipo de
  // usuario era antes de la baja, así que vuelve como Expositor; si era admin,
  // se le cambia el tipo desde "Modificar" después de reactivarla.
  function handleReactivateUser(user) {
    requestConfirm({
      title: '¿Reactivar esta cuenta?',
      itemLabel: `${user.name} ${user.lastName} · ${user.email}`,
      message: 'Vuelve a poder ingresar, como Expositor. Si era administrador, después cambiale el tipo de usuario desde "Modificar".',
      confirmLabel: 'Sí, reactivar',
      tone: 'neutral',
      onConfirm: async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ role_id: 2, role: 'user' })
          .eq('id', user.id)
        if (error) {
          showNotice({ title: 'No se pudo reactivar', message: `No se pudo reactivar la cuenta: ${error.message}`, tone: 'danger' })
          return
        }
        dispatch({ type: 'REACTIVATE_USER', id: user.id })
      },
    })
  }

  function openBlockUserModal(user) {
    if (user.id === currentUser?.id) {
      showNotice({ title: 'No se puede', message: 'No podés bloquear tu propio usuario.', tone: 'danger' })
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
      showNotice({ title: 'No se pudo bloquear', message: `No se pudo bloquear al usuario: ${error.message}`, tone: 'danger' })
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
          showNotice({ title: 'No se pudo desbloquear', message: `No se pudo desbloquear al usuario: ${error.message}`, tone: 'danger' })
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
      showNotice({ title: 'No se pudo guardar', message: `No se pudo guardar la configuración en la base de datos: ${error.message}`, tone: 'danger' })
      return
    }

    dispatch({ type: 'UPDATE_GLOBAL_SETTINGS', settings: settingsForm })
    showNotice({ title: 'Guardado', message: 'Configuración guardada correctamente.', tone: 'success' })
  }

  async function decideRequest(request, status) {
    const decidedAt = new Date().toISOString()
    const { error } = await supabase
      .from('event_requests')
      .update({ status, decided_at: decidedAt })
      .eq('id', request.id)

    if (error) {
      showNotice({ title: 'No se pudo actualizar', message: `No se pudo actualizar la solicitud: ${error.message}`, tone: 'danger' })
      return
    }

    dispatch({ type: 'UPSERT_EVENT_REQUEST', request: { ...request, status, decidedAt } })
  }

  function handleDecideRequest(request, status) {
    if (request.status === 'approved' && status === 'rejected') {
      const u = users.find(x => x.id === request.userId)
      requestConfirm({
        title: '¿Revocar la aprobación?',
        itemLabel: u?.businessName || `${u?.name || ''} ${u?.lastName || ''}`.trim(),
        message: 'Ya no va a poder tomar nuevos stands en este evento. Las reservas que ya tiene se mantienen.',
        confirmLabel: 'Sí, revocar',
        onConfirm: () => decideRequest(request, status),
      })
      return
    }
    decideRequest(request, status)
  }

  const pendingRequestsCount = eventRequests.filter(r =>
    r.status === 'pending' && events.find(e => e.id === r.eventId)?.requiresApproval
  ).length

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'requests', label: 'Solicitudes de stand', icon: UserCheck, badge: pendingRequestsCount },
    { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
    { id: 'sponsors', label: 'Sponsors', icon: Sparkles, badge: 0 },
    { id: 'reservations', label: 'Reservas', icon: ClipboardList },
    { id: 'finances', label: 'Finanzas', icon: TrendingUp },
    { id: 'categories', label: 'Categorías', icon: Tag },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Luces de fondo muy suaves (solo decoración). */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="ambient-blob ambient-a -top-40 -right-32 w-[36rem] h-[36rem] opacity-70" />
        <div className="ambient-blob ambient-b bottom-0 left-1/3 w-[40rem] h-[40rem] opacity-60" />
      </div>
      <header className="admin-header text-white sticky top-0 z-40">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}
              className="lg:hidden w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:flex w-8 h-8 bg-white/10 border border-accent/40 rounded-xl items-center justify-center bolt-pulse">
              <Zap size={16} className="text-accent" />
            </div>
            <span className="font-bold text-lg">Panel Administrador</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/events')}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <Eye size={14} /> <span className="hidden sm:inline">Ver eventos</span>
            </button>
            <button onClick={async () => { await logout(); navigate('/') }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex w-full max-w-[90rem] mx-auto">
        {menuOpen && (
          <div className="fixed inset-0 top-16 bg-black/40 z-30 lg:hidden" onClick={() => setMenuOpen(false)} />
        )}

        <aside className={`fixed lg:sticky top-16 left-0 z-30 w-64 flex-shrink-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-100 overflow-y-auto transition-transform duration-200 lg:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
          <nav aria-label="Secciones del panel" className="p-3 space-y-1">
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false) }} aria-current={active ? 'page' : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    active ? 'admin-nav-active bg-violet-600 text-white' : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                  }`}>
                  {active && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-accent shadow-[0_0_10px_#2ee6d6]" />}
                  <t.icon size={18} className="flex-shrink-0" />
                  <span className="flex-1 text-left">{t.label}</span>
                  {t.badge > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${active ? 'bg-white text-violet-700' : 'bg-amber-400 text-violet-900'}`}>{t.badge}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

      <main className="admin-main relative z-10 flex-1 min-w-0 px-4 py-6">
      <div key={tab} className="anim-rise">
        {tab === 'dashboard' && (
          <DashboardTab
            events={events} reservations={reservations} categories={categories}
            totalPending={totalPending} totalDeposit={totalDeposit} totalPaid={totalPaid}
            totalPendingAmount={totalPendingAmount} totalDepositRemaining={totalDepositRemaining}
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
            onOpenAttendance={(ev) => { setAttendanceEventId(ev.id); setTab('attendance') }}
          />
        )}

        {tab === 'requests' && (
          <RequestsTab
            eventRequests={eventRequests} events={events} users={users}
            onDecide={handleDecideRequest}
          />
        )}

        {tab === 'attendance' && (
          <AttendanceTab
            events={events} reservations={reservations} users={users}
            sponsorRegistrations={state.sponsorRegistrations || []}
            initialEventId={attendanceEventId}
            onStatusChange={handleStatusChange}
          />
        )}

        {tab === 'sponsors' && (
          <SponsorsTab
            sponsorRegistrations={state.sponsorRegistrations || []} events={events} users={users}
            onDeleteRegistration={requestDeleteSponsorRegistration}
            onAddMember={(reg) => openMemberModal(reg)}
            onEditMember={(reg, m) => openMemberModal(reg, m)}
            onDeleteMember={requestDeleteMember}
          />
        )}

        {tab === 'reservations' && (
          <ReservationsTab
            events={events} categories={categories} users={users} allStands={allStands}
            filterEventId={filterEventId} setFilterEventId={setFilterEventId}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            reservationSort={reservationSort} setReservationSort={setReservationSort}
            filteredRes={filteredRes} paginatedRes={paginatedRes}
            reservationsPerPage={reservationsPerPage}
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
            isSysadmin={!!currentUser?.isSysadmin}
            deletedUsers={state.deletedUsers || []}
            onPurgeUser={handlePurgeUser}
            onReactivateUser={handleReactivateUser}
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
      </div>
      </main>
      </div>

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

      <SponsorMemberModal
        target={memberModal}
        saving={savingMember}
        error={memberError}
        onClose={() => setMemberModal(null)}
        onSave={handleSaveMember}
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

      <NoticeDialog
        open={!!notice}
        title={notice?.title}
        itemLabel={notice?.itemLabel}
        message={notice?.message}
        tone={notice?.tone}
        onClose={() => setNotice(null)}
      />
    </div>
  )
}
