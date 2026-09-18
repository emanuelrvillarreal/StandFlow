// Parsea una fecha "YYYY-MM-DD" como fecha local (no UTC), para evitar que
// se muestre un día antes en husos horarios detrás de UTC (como Argentina).
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatEventDate(event, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const start = parseLocalDate(event.date)
  if (!event.endDate || event.endDate === event.date) {
    return start.toLocaleDateString('es-AR', options)
  }

  const end = parseLocalDate(event.endDate)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

  if (sameMonth) {
    const startDay = start.toLocaleDateString('es-AR', { day: 'numeric' })
    const endLabel = end.toLocaleDateString('es-AR', options)
    return `${startDay} al ${endLabel}`
  }

  const startLabel = start.toLocaleDateString('es-AR', options)
  const endLabel = end.toLocaleDateString('es-AR', options)
  return `${startLabel} al ${endLabel}`
}
