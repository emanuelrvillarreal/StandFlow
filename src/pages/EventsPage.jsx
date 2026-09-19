import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, ChevronRight, LogOut, User, LayoutDashboard, Plus, Trash2, Zap, LogIn, Store } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatEventDate } from '../lib/formatEventDate'
import { getEventAccess } from '../lib/eventAccess'

const STATUS_LABELS = { active: 'Activo', upcoming: 'Próximo', past: 'Finalizado' }
const STATUS_STYLES = {
  active: 'bg-accent/15 text-accent-soft border border-accent/30',
  upcoming: 'bg-sky-400/10 text-sky-300 border border-sky-400/30',
  past: 'bg-ink-600 text-muted border border-ink-500/50',
}
// Variante con fondo sólido, para que el badge se lea bien sobre cualquier póster.
const STATUS_STYLES_ON_IMAGE = {
  active: 'bg-ink-950/80 backdrop-blur-sm text-accent-soft border border-accent/40',
  upcoming: 'bg-ink-950/80 backdrop-blur-sm text-sky-300 border border-sky-400/40',
  past: 'bg-ink-950/80 backdrop-blur-sm text-muted border border-ink-500/50',
}

export default function EventsPage() {
  const { state, dispatch, logout } = useApp()
  const navigate = useNavigate()
  const { currentUser, events } = state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const isAdmin = currentUser?.role_id === 1

  async function handleLogout() {
    await logout()
    navigate('/events')
  }

  async function confirmDeleteEvent() {
    const event = deleteTarget
    setDeleteTarget(null)
    if (!event) return

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

  return (
    <div className="min-h-screen bg-ink-950 relative overflow-hidden">
      <div aria-hidden="true" className="ambient-blob ambient-a -top-40 -left-40 w-[34rem] h-[34rem]" />
      <div aria-hidden="true" className="ambient-blob ambient-b top-1/3 -right-48 w-[38rem] h-[38rem]" />
      <nav className="bg-ink-900/90 backdrop-blur border-b border-ink-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink-800 border border-accent/30 rounded-lg flex items-center justify-center bolt-pulse">
              <Zap className="text-accent" size={16} />
            </div>
            <span className="font-display font-bold text-white text-base sm:text-lg tracking-wide uppercase">Stands Flow</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={() => navigate('/admin', { state: { openNewEventModal: true } })}
                  className="flex items-center gap-1 text-sm text-accent hover:bg-accent/10 px-3 py-2 rounded-lg transition">
                  <Plus size={16} /> Crear nuevo evento
                </button>
                <button onClick={() => navigate('/admin')}
                  className="flex items-center gap-1 text-sm text-accent hover:bg-accent/10 px-3 py-2 rounded-lg transition">
                  <LayoutDashboard size={16} /> Panel Admin
                </button>
              </>
            )}
            {currentUser ? (
              <>
                {!isAdmin && (
                  <>
                    <button onClick={() => navigate('/profile')}
                      className="flex items-center gap-1 text-sm text-muted hover:text-white hover:bg-ink-700 px-3 py-2 rounded-lg transition">
                      <Store size={16} /> Mi perfil
                    </button>
                    <button onClick={() => navigate('/my-reservations')}
                      className="flex items-center gap-1 text-sm text-muted hover:text-white hover:bg-ink-700 px-3 py-2 rounded-lg transition">
                      <User size={16} /> Mis reservas
                    </button>
                  </>
                )}
                <button onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition">
                  <LogOut size={16} /> Salir
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-sm font-semibold text-ink-950 bg-accent hover:bg-accent-soft px-4 py-2 rounded-full transition">
                <LogIn size={15} /> Iniciar sesión
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-muted">
              <User size={24} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-ink-900 border-t border-ink-700 p-4 space-y-2">
            {isAdmin && (
              <>
                <button onClick={() => navigate('/admin', { state: { openNewEventModal: true } })} className="w-full flex items-center gap-3 p-3 text-accent bg-accent/10 rounded-xl font-medium">
                  <Plus size={18} /> Crear nuevo evento
                </button>
                <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 p-3 text-accent bg-accent/10 rounded-xl font-medium">
                  <LayoutDashboard size={18} /> Panel Administrador
                </button>
              </>
            )}
            {currentUser ? (
              <>
                {!isAdmin && (
                  <>
                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-3 text-white bg-ink-700 rounded-xl font-medium">
                      <Store size={18} /> Mi perfil
                    </button>
                    <button onClick={() => navigate('/my-reservations')} className="w-full flex items-center gap-3 p-3 text-white bg-ink-700 rounded-xl font-medium">
                      <User size={18} /> Mis reservas
                    </button>
                  </>
                )}
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 bg-red-500/10 rounded-xl font-medium">
                  <LogOut size={18} /> Cerrar sesión
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="w-full flex items-center gap-3 p-3 text-ink-950 bg-accent rounded-xl font-bold">
                <LogIn size={18} /> Iniciar sesión
              </button>
            )}
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="anim-rise">
            <h1 className="text-3xl font-display font-bold tracking-wide text-white uppercase">Eventos disponibles</h1>
            <div className="title-line h-0.5 w-24 mt-2 rounded-full bg-gradient-to-r from-accent to-accent2" />
            <p className="text-muted mt-2">
              {currentUser ? `Hola, ${currentUser.name}. Seleccioná un evento para ver sus stands.` : 'Seleccioná un evento para ver sus stands.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin', { state: { openNewEventModal: true } })}
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-soft text-ink-950 px-4 py-2.5 rounded-full text-sm font-bold transition shadow-glow"
            >
              <Plus size={18} /> Crear nuevo evento
            </button>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => currentUser ? (
            <div key={ev.id} style={{ '--i': i + 1 }}
              className="anim-rise card-lift group relative bg-ink-800 rounded-2xl border border-ink-600 overflow-hidden hover:border-accent/50">
              {ev.posterImage ? (
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img src={ev.posterImage} alt={ev.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/10 to-transparent" />
                  <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES_ON_IMAGE[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget(ev)}
                      className="absolute top-3 left-3 p-2 text-white/80 hover:text-red-400 bg-black/40 hover:bg-black/60 rounded-lg transition"
                      title="Eliminar evento"
                      aria-label={`Eliminar evento ${ev.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent2 to-accent opacity-70" />
              )}
              <div className="p-6">
                {!ev.posterImage && (
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-ink-900 border border-ink-600 rounded-xl flex items-center justify-center">
                    <MapPin className="text-accent" size={22} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ev.status]}`}>
                      {STATUS_LABELS[ev.status]}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(ev)}
                        className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Eliminar evento"
                        aria-label={`Eliminar evento ${ev.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                )}
                <button
                  onClick={() => navigate(`/events/${ev.id}/map`)}
                  className="block w-full text-left"
                >
                  <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">{ev.name}</h3>
                  {ev.requiresApproval && (() => {
                    const access = getEventAccess({ event: ev, user: currentUser, requests: state.eventRequests, reservations: state.reservations })
                    const chip = isAdmin
                      ? { text: 'Con confirmación', cls: 'bg-accent/10 text-accent-soft border-accent/30' }
                      : access.status === 'approved' ? { text: 'Aprobado', cls: 'bg-accent/10 text-accent-soft border-accent/30' }
                      : access.status === 'pending' ? { text: 'Solicitud en revisión', cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' }
                      : access.status === 'rejected' ? { text: 'Solicitud no aprobada', cls: 'bg-red-500/10 text-red-300 border-red-500/30' }
                      : { text: 'Con confirmación · solicitá participar', cls: 'bg-violet-500/10 text-violet-200 border-violet-400/30' }
                    return (
                      <span className={`inline-block mb-2 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${chip.cls}`}>{chip.text}</span>
                    )
                  })()}
                  <div className="flex items-center gap-1.5 text-muted text-sm mb-1">
                    <Calendar size={14} />
                    <span>{formatEventDate(ev)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted text-sm mb-4">
                    <MapPin size={14} />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-muted">
                      <span>{ev.stands.filter(s => s.status === 'available' && s.sector !== 'sponsor').length} disponibles</span>
                      <span>{ev.stands.filter(s => s.status === 'reserved' || s.status === 'pending').length} ocupados</span>
                    </div>
                    <ChevronRight size={16} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <button key={ev.id} style={{ '--i': i + 1 }}
              onClick={() => navigate(`/events/${ev.id}/map`)}
              className="anim-rise card-lift group text-left bg-ink-800 rounded-2xl border border-ink-600 overflow-hidden hover:border-accent/50">
              {ev.posterImage ? (
                <div className="relative">
                  <img src={ev.posterImage} alt={ev.name} className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES_ON_IMAGE[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                </div>
              ) : (
                <div className="aspect-[3/2] flex items-center justify-center bg-ink-900">
                  <Calendar className="text-accent" size={40} />
                </div>
              )}
              <div className="p-4 flex items-center justify-between gap-3">
                <h3 className="font-display font-bold text-white text-lg leading-tight">{ev.name}</h3>
                {!ev.posterImage && (
                  <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar este evento?"
        itemLabel={deleteTarget?.name}
        message="Se van a borrar también todos sus stands y reservas. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
