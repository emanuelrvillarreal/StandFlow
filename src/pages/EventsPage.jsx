import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { Calendar, MapPin, ChevronRight, LogOut, User, LayoutDashboard, Plus, Trash2 } from 'lucide-react'

const STATUS_LABELS = { active: 'Activo', upcoming: 'Próximo', past: 'Finalizado' }
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100 text-blue-700',
  past: 'bg-gray-100 text-gray-500',
}

export default function EventsPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { currentUser, events } = state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function logout() {
    dispatch({ type: 'LOGOUT' })
    navigate('/')
  }

  async function handleDeleteEvent(event) {
    const confirmed = window.confirm(`¿Eliminar el evento "${event.name}"? Esta acción no se puede deshacer.`)
    if (!confirmed) return

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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-bold text-gray-800 text-base sm:text-lg">Stands Flow</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser?.role_id === 1 && (
              <>
                <button onClick={() => navigate('/admin', { state: { openNewEventModal: true } })}
                  className="flex items-center gap-1 text-sm text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition">
                  <Plus size={16}/> Crear nuevo evento
                </button>
                <button onClick={() => navigate('/admin')}
                  className="flex items-center gap-1 text-sm text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition">
                  <LayoutDashboard size={16}/> Panel Admin
                </button>
              </>
            )}
            <button onClick={() => navigate('/my-reservations')}
              className="flex items-center gap-1 text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition">
              <User size={16}/> Mis reservas
            </button>
            <button onClick={logout}
              className="flex items-center gap-1 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition">
              <LogOut size={16}/> Salir
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-500">
              <User size={24}/>
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t p-4 space-y-2">
            {currentUser?.role_id === 1 && (
              <>
                <button onClick={() => navigate('/admin', { state: { openNewEventModal: true } })} className="w-full flex items-center gap-3 p-3 text-violet-600 bg-violet-50 rounded-xl font-medium">
                  <Plus size={18}/> Crear nuevo evento
                </button>
                <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 p-3 text-violet-600 bg-violet-50 rounded-xl font-medium">
                  <LayoutDashboard size={18}/> Panel Administrador
                </button>
              </>
            )}
            <button onClick={() => navigate('/my-reservations')} className="w-full flex items-center gap-3 p-3 text-gray-700 bg-gray-50 rounded-xl font-medium">
              <User size={18}/> Mis reservas
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 p-3 text-red-500 bg-red-50 rounded-xl font-medium">
              <LogOut size={18}/> Cerrar sesión
            </button>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Eventos disponibles</h1>
            <p className="text-gray-500 mt-1">Hola, {currentUser?.name}. Seleccioná un evento para ver sus stands.</p>
          </div>
          {currentUser?.role_id === 1 && (
            <button
              onClick={() => navigate('/admin', { state: { openNewEventModal: true } })}
              className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
            >
              <Plus size={18}/> Crear nuevo evento
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(ev => (
            <div key={ev.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md hover:border-violet-200 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <MapPin className="text-violet-600" size={22}/>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                  {currentUser?.role_id === 1 && (
                    <button
                      onClick={() => handleDeleteEvent(ev)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar evento"
                      aria-label={`Eliminar evento ${ev.name}`}
                    >
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/events/${ev.id}/map`)}
                className="block w-full text-left"
              >
                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">{ev.name}</h3>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
                <Calendar size={14}/>
                <span>{new Date(ev.date).toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-4">
                <MapPin size={14}/>
                <span>{ev.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{ev.stands.filter(s=>s.status==='available').length} disponibles</span>
                  <span>{ev.stands.filter(s=>s.status==='reserved'||s.status==='pending').length} ocupados</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-violet-600 transition"/>
              </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
