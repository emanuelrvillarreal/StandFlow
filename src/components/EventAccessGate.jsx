import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Clock, XCircle, MessageCircle, Send } from 'lucide-react'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { formatEventDate } from '../lib/formatEventDate'

// Pantalla que ve un expositor en lugar del mapa cuando el evento es "con
// confirmación" y todavía no fue aprobado.
export default function EventAccessGate({ event, access }) {
  const { state, dispatch, refreshEventRequests } = useApp()
  const navigate = useNavigate()
  const { currentUser } = state
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const whatsapp = String(event.whatsapp || state.settings?.whatsappNumber || '').replace(/\D/g, '')

  async function handleRequest() {
    setSending(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('event_requests')
      .insert({ event_id: event.id, user_id: currentUser.id, status: 'pending', message: note.trim() || null })
      .select()
      .single()
    setSending(false)

    if (insertError) {
      // Ya existía una solicitud (ej: la hizo desde otro dispositivo): se recarga el estado real.
      if (insertError.code === '23505') {
        await refreshEventRequests()
        return
      }
      setError(`No se pudo enviar la solicitud: ${insertError.message}`)
      return
    }

    dispatch({
      type: 'UPSERT_EVENT_REQUEST',
      request: {
        id: data.id,
        eventId: data.event_id,
        userId: data.user_id,
        status: data.status,
        message: data.message || '',
        createdAt: data.created_at,
        decidedAt: data.decided_at,
      },
    })
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <div className="bg-ink-900/90 backdrop-blur border-b border-ink-700">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-muted hover:text-white transition">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display font-bold text-white truncate">{event.name}</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="anim-rise w-full max-w-md bg-ink-800 border border-ink-600 rounded-2xl overflow-hidden">
          {event.posterImage && (
            <img src={event.posterImage} alt={event.name} className="w-full max-h-72 object-cover" />
          )}

          <div className="p-6 text-center space-y-4">
            {access.status === 'none' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <ShieldCheck className="text-accent" size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white mb-1">Evento con confirmación</h2>
                  <p className="text-sm text-muted">
                    Para participar tenés que enviar una solicitud. Los organizadores la revisan y, si te aprueban,
                    vas a poder elegir tu stand.
                  </p>
                  <p className="text-xs text-muted mt-2">{formatEventDate(event)} · {event.location}</p>
                </div>

                {!currentUser?.businessName && (
                  <p className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-xl px-3 py-2">
                    Completá tu emprendimiento y tu foto en <Link to="/profile" className="underline font-medium">Mi perfil</Link>:
                    es lo que ven los organizadores para decidir.
                  </p>
                )}

                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Contanos brevemente qué vendés (opcional)"
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                />

                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <button onClick={handleRequest} disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                  <Send size={16} /> {sending ? 'Enviando...' : 'Solicitar participar'}
                </button>
              </>
            )}

            {access.status === 'pending' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                  <Clock className="text-yellow-300" size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white mb-1">Solicitud en revisión</h2>
                  <p className="text-sm text-muted">
                    Recibimos tu solicitud el {new Date(access.request.createdAt).toLocaleDateString('es-AR')}.
                    Cuando los organizadores la aprueben vas a poder elegir tu stand desde acá.
                  </p>
                </div>
              </>
            )}

            {access.status === 'rejected' && (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <XCircle className="text-red-400" size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white mb-1">Solicitud no aprobada</h2>
                  <p className="text-sm text-muted">
                    Esta vez no pudimos aprobar tu participación en este evento. Si querés saber más, escribile a los organizadores.
                  </p>
                </div>
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition">
                    <MessageCircle size={16} /> Escribir a los organizadores
                  </a>
                )}
              </>
            )}

            <button onClick={() => navigate('/events')} className="text-sm text-muted hover:text-white transition">
              Volver a los eventos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
