// Fecha y hora legibles (es-AR): "18/09/2026 14:32". Vacío si no hay fecha.
export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// Fecha "YYYY-MM-DD" -> "18/09/1990" (sin pasar por zonas horarias).
export function formatBirthDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

// Solo la hora: "14:32".
export function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Días de un evento como "YYYY-MM-DD" (desde date hasta endDate, máximo 31).
export function eventDays(event) {
  if (!event?.date) return []
  const [y, m, d] = event.date.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  let end = start
  if (event.endDate && event.endDate > event.date) {
    const [ey, em, ed] = event.endDate.split('-').map(Number)
    end = new Date(ey, em - 1, ed)
  }
  const out = []
  for (let cur = new Date(start); cur <= end && out.length < 31; cur.setDate(cur.getDate() + 1)) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`)
  }
  return out
}

// Etiqueta corta de un día, "YYYY-MM-DD" -> "21 nov" (sin año, para listas).
export function formatShortDay(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// Lista de días elegidos para una reserva, en texto corto: "21 y 22 nov",
// "21, 22 y 23 nov", o null si no aplica (evento de un solo día, o "todos").
export function formatDaysList(days) {
  if (!Array.isArray(days) || days.length === 0) return null
  const sorted = [...days].sort()
  const labels = sorted.map(formatShortDay)
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}

export function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
