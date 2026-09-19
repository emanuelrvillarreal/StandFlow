const ACTIVE_RESERVATION_STATUSES = ['pending', 'deposit_paid', 'paid', 'reserved']

// Espeja la regla de la base (función can_participate):
// - evento libre                               -> 'open'
// - admin                                      -> 'approved'
// - solicitud aprobada, o ya tiene una reserva -> 'approved'
// - si no: el estado de su solicitud ('pending' | 'rejected') o 'none'
export function getEventAccess({ event, user, requests, reservations }) {
  if (!event?.requiresApproval) return { status: 'open' }
  if (user?.role_id === 1) return { status: 'approved' }

  const request = requests.find(r => r.eventId === event.id && r.userId === user?.id)
  if (request?.status === 'approved') return { status: 'approved', request }

  // Quien ya tenía una reserva activa sigue adentro, salvo que lo hayan rechazado.
  const hasActiveReservation = reservations.some(
    r => r.eventId === event.id && r.userId === user?.id && ACTIVE_RESERVATION_STATUSES.includes(r.status)
  )
  if (hasActiveReservation && request?.status !== 'rejected') return { status: 'approved', request }

  return request ? { status: request.status, request } : { status: 'none' }
}

export const REQUEST_STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }
