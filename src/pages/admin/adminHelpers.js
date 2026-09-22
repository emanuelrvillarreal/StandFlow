import { formatDateTime, formatDaysList } from '../../lib/formatDateTime'

export const STATUS_LABELS = { pending: 'Pendiente', deposit_paid: 'Seña Paga', paid: 'Pagado', cancelled: 'Cancelado', reserved: 'Reservado' }

export const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  deposit_paid: 'bg-orange-50 text-orange-700 border border-orange-200',
  paid: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
  reserved: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const PAYMENT_TYPE_LABELS = { deposit: 'Seña (50%)', full: 'Total (100%)' }

export function exportCSV(reservations, events, users, stands, categories) {
  const header = ['Evento', 'Stand', 'Nombre Stand', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Categoría', 'Compartido', 'Comparte con', 'Instagram', 'Importe', 'Tipo de pago', 'Estado', 'Días', 'Fecha y hora de alta']
  const rows = reservations.map(r => {
    const ev = events.find(e => e.id === r.eventId)
    const st = ev?.stands.find(s => s.id === r.standId)
    const user = users.find(u => u.id === r.userId)
    const cat = categories.find(c => c.id === r.categoryId)
    return [
      ev?.name ?? '', st?.number ?? r.standId, r.standName,
      user?.name ?? '', user?.lastName ?? '', user?.email ?? '', user?.phone ?? '',
      cat?.name ?? '', r.shared ? 'Sí' : 'No', r.sharedWith ?? '', r.instagram ?? '',
      r.amount, PAYMENT_TYPE_LABELS[r.paymentType || 'full'], STATUS_LABELS[r.status] ?? r.status,
      formatDaysList(r.days) || 'Todos',
      formatDateTime(r.createdAt),
    ]
  })
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'reservas.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function toEventRow(event) {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    end_date: event.endDate || null,
    requires_approval: !!event.requiresApproval,
    allow_partial_days: !!event.allowPartialDays,
    location: event.location,
    status: event.status,
    map_image: event.mapImage,
    poster_image: event.posterImage || null,
    whatsapp: event.whatsapp,
    payment_instructions: event.paymentInstructions,
  }
}

export function toStandRow(stand, eventId) {
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
    is_sponsor_stand: stand.sector === 'sponsor',
  }
}

export function createUuid() {
  return crypto.randomUUID()
}

export function toProfileRow(user) {
  return {
    id: user.id,
    first_name: user.name,
    last_name: user.lastName,
    email: user.email,
    phone: user.phone,
    business_name: user.businessName || null,
    max_stands: Math.max(1, Number(user.maxStands) || 1),
    birth_date: user.birthDate || null,
    role: Number(user.role_id) === 1 ? 'admin' : 'user',
    role_id: Number(user.role_id),
  }
}

export function mapProfile(profile) {
  return {
    ...profile,
    name: profile.name ?? profile.first_name ?? '',
    lastName: profile.lastName ?? profile.last_name ?? '',
    businessName: profile.businessName ?? profile.business_name ?? '',
    instagram: profile.instagram ?? '',
    businessPhoto: profile.businessPhoto ?? profile.business_photo ?? '',
    isBlocked: profile.isBlocked ?? profile.is_blocked ?? false,
    blockedReason: profile.blockedReason ?? profile.blocked_reason ?? '',
    maxStands: Number(profile.maxStands ?? profile.max_stands ?? 1) || 1,
    birthDate: profile.birthDate ?? profile.birth_date ?? '',
  }
}

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}
