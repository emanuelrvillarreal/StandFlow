import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { ArrowLeft, MessageCircle, Calendar, Tag, Store, Instagram, Pencil } from 'lucide-react'
import { formatEventDate } from '../lib/formatEventDate'

const STATUS_LABELS = { pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado', reserved:'Reservado' }
const STATUS_STYLES = {
  pending:   'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  paid:      'bg-accent/10 text-accent-soft border-accent/30',
  cancelled: 'bg-red-500/10 text-red-300 border-red-500/30',
  reserved:  'bg-sky-400/10 text-sky-300 border-sky-400/30',
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
    // El número de WhatsApp es del evento; la plantilla sigue siendo global (Admin).
    const whatsappNumber = String(ev.whatsapp || state.settings?.whatsappNumber || '').replace(/\D/g, '')

    let msg = state.settings?.whatsappTemplate || (
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `📍 Evento: {evento}\n` +
      `🏷️ Stand: {stand_numero} - {stand_nombre}\n` +
      `📂 Categoría: {categoria}\n` +
      `💰 Importe: {importe}\n` +
      `👤 Nombre: {usuario_nombre}\n` +
      `📧 Email: {usuario_email}\n` +
      `📱 Teléfono: {usuario_telefono}\n` +
      `{compartido}\n` +
      `{instagram}\n\n` +
      `Adjunto el comprobante de pago.`
    )

    const sharedText = r.shared ? `🤝 Comparte con: ${r.sharedWith}` : ''
    const instaText = r.instagram ? `📸 Instagram: ${r.instagram}` : ''

    const replacements = {
      '{evento}': ev.name,
      '{stand_numero}': stand?.number || r.standId,
      '{stand_nombre}': r.standName,
      '{categoria}': cat?.name || '-',
      '{importe}': `$${r.amount.toLocaleString('es-AR')}`,
      '{usuario_nombre}': `${currentUser.name} ${currentUser.lastName}`,
      '{usuario_email}': currentUser.email,
      '{usuario_telefono}': currentUser.phone,
      '{compartido}': sharedText,
      '{instagram}': instaText
    }

    Object.entries(replacements).forEach(([tag, val]) => {
      msg = msg.replaceAll(tag, val)
    })

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="bg-ink-900/90 backdrop-blur border-b border-ink-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-ink-500 hover:text-white transition">
            <ArrowLeft size={22}/>
          </button>
          <h1 className="font-display font-bold text-white text-lg">Mis reservas</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {myRes.length > 0 && (
          <button onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-4 bg-ink-800 border border-ink-600 hover:border-accent/50 rounded-2xl p-4 mb-6 text-left transition">
            <div className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {currentUser?.businessPhoto ? (
                <img src={currentUser.businessPhoto} alt={currentUser.businessName || ''} className="w-full h-full object-cover" />
              ) : (
                <Store className="text-ink-500" size={22} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-white truncate">{currentUser?.businessName || 'Así te van a ver los organizadores'}</p>
              {currentUser?.instagram ? (
                <p className="text-sm text-pink-400 flex items-center gap-1"><Instagram size={12} /> {currentUser.instagram}</p>
              ) : (
                <p className="text-sm text-ink-500/80">Agregá tu emprendimiento, foto e Instagram</p>
              )}
            </div>
            <Pencil size={16} className="text-ink-500 flex-shrink-0" />
          </button>
        )}
        {myRes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-ink-800 border border-ink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-ink-500" size={28}/>
            </div>
            <p className="text-ink-500/80">No tenés reservas aún.</p>
            <button onClick={() => navigate('/events')}
              className="mt-4 bg-accent text-ink-950 px-6 py-2.5 rounded-full font-bold hover:bg-accent-soft transition">
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
                <div key={r.id} className="bg-ink-800 rounded-2xl border border-ink-600 overflow-hidden">
                  <div className="px-5 py-4 border-b border-ink-600 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{ev?.name}</p>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {ev && formatEventDate(ev)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Stand</span>
                      <span className="font-medium text-white">{stand?.number || r.standId} — {r.standName}</span>
                    </div>
                    {cat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Categoría</span>
                        <span className="flex items-center gap-1 font-medium text-white">
                          <span className="w-2.5 h-2.5 rounded-full" style={{background: cat.color}}/>
                          {cat.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Importe</span>
                      <span className="font-bold text-accent-soft">${r.amount.toLocaleString('es-AR')}</span>
                    </div>
                    {r.shared && (
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Comparte con</span>
                        <span className="font-medium text-white">{r.sharedWith}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Reservado el</span>
                      <span className="text-ink-500/80">{new Date(r.createdAt).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs px-3 py-2.5 rounded-xl">
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
