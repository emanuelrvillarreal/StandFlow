import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { Calendar, MapPin, ChevronRight, LogOut, User, LayoutDashboard } from 'lucide-react'

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

  function logout() {
    dispatch({ type: 'LOGOUT' })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-gray-800 text-lg">Stands App</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.role === 'admin' && (
              <button onClick={() => navigate('/admin')}
                className="flex items-center gap-1 text-sm text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition">
                <LayoutDashboard size={16}/> Panel Admin
              </button>
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
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Eventos disponibles</h1>
          <p className="text-gray-500 mt-1">Hola, {currentUser?.name}. Seleccioná un evento para ver sus stands.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(ev => (
            <button key={ev.id}
              onClick={() => navigate(`/events/${ev.id}/map`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md hover:border-violet-200 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <MapPin className="text-violet-600" size={22}/>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.status]}`}>
                  {STATUS_LABELS[ev.status]}
                </span>
              </div>
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
          ))}
        </div>
      </div>
    </div>
  )
}
