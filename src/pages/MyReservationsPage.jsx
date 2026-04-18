import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { ArrowLeft, MessageCircle, Calendar, Tag } from 'lucide-react'

const STATUS_LABELS = { pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado', reserved:'Reservado' }
const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid:      'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  reserved:  'bg-blue-50 text-blue-700 border-blue-200',
}

export default function MyReservationsPage() {
  const { state } = useApp()
  const navigate = useNavigate()
  const { currentUser, reservations, events, categories } = state

  const myRes = reservations.filter(r => r.userId === currentUser?.id)

  function getEvent(eventId) { return events.find(e => e.id === eventId) }
  function getStand(eventId, standId) {
    const ev = getEvent(eventId)
    return ev?.stands.find(s => s.id === standId)
  }
  function getCat(catId) { return categories.find(c => c.id === catId) }

  function openWhatsApp(r) {
    const ev = getEvent(r.eventId)
    const stand = getStand(r.eventId, r.standId)
    if (!ev) return
    const cat = getCat(r.categoryId)
    const msg = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `📍 Evento: ${ev.name}\n` +
      `🏷️ Stand: ${stand?.number || r.standId} - ${r.standName}\n` +
      `📂 Categoría: ${cat?.name || '-'}\n` +
      `💰 Importe: $${r.amount.toLocaleString('es-AR')}\n` +
      `👤 Nombre: ${currentUser.name} ${currentUser.lastName}\n` +
      `📧 Email: ${currentUser.email}\n` +
      (r.shared ? `🤝 Comparte con: ${r.sharedWith}\n` : '') +
      `\nAdjunto el comprobante de pago.`
    )
    window.open(`https://wa.me/${ev.whatsapp}?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-gray-400 hover:text-gray-700">
            <ArrowLeft size={22}/>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Mis reservas</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {myRes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-gray-400" size={28}/>
            </div>
            <p className="text-gray-500">No tenés reservas aún.</p>
            <button onClick={() => navigate('/events')}
              className="mt-4 bg-violet-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-violet-700 transition">
              Ver eventos
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myRes.map(r => {
              const ev = getEvent(r.eventId)
              const stand = getStand(r.eventId, r.standId)
              const cat = getCat(r.categoryId)
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{ev?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev && new Date(ev.date).toLocaleDateString('es-AR', {day:'numeric',month:'long',year:'numeric'})}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Stand</span>
                      <span className="font-medium">{stand?.number || r.standId} — {r.standName}</span>
                    </div>
                    {cat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Categoría</span>
                        <span className="flex items-center gap-1 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full" style={{background: cat.color}}/>
                          {cat.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Importe</span>
                      <span className="font-bold text-violet-600">${r.amount.toLocaleString('es-AR')}</span>
                    </div>
                    {r.shared && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Comparte con</span>
                        <span className="font-medium">{r.sharedWith}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reservado el</span>
                      <span className="text-gray-600">{new Date(r.createdAt).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2.5 rounded-xl">
                        {ev?.paymentInstructions || 'Enviá el comprobante de pago por WhatsApp para confirmar tu reserva.'}
                      </div>
                      <button onClick={() => openWhatsApp(r)}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition text-sm">
                        <MessageCircle size={16}/> Enviar comprobante por WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
