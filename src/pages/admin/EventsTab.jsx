import { Plus, Calendar, MapPin, Clock, Edit2, Map, Trash2, ClipboardCheck } from 'lucide-react'
import { formatEventDate } from '../../lib/formatEventDate'

export default function EventsTab({ events, navigate, onOpenCreateEvent, onEditEvent, onDeleteEvent, onOpenAttendance = () => {} }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{events.length} eventos registrados</p>
        <button
          onClick={onOpenCreateEvent}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
        >
          <Plus size={18} /> Nuevo Evento
        </button>
      </div>

      <div className="grid gap-4">
        {events.map(ev => (
          <div key={ev.id} className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {ev.posterImage ? (
                <img src={ev.posterImage} alt={ev.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 flex-shrink-0">
                  <Calendar size={24} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{ev.name}</h3>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ev.requiresApproval ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                    {ev.requiresApproval ? 'Con confirmación' : 'Libre'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatEventDate(ev, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button onClick={() => onOpenAttendance(ev)}
                className="flex items-center gap-1.5 px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition text-xs font-semibold" title="Asistencia y pagos">
                <ClipboardCheck size={16} /> Asistencia
              </button>
              <button onClick={() => onEditEvent(ev)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar evento">
                <Edit2 size={18} />
              </button>
              <button onClick={() => navigate(`/events/${ev.id}/map`)}
                className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Ver Mapa">
                <Map size={18} />
              </button>
              <button onClick={() => onDeleteEvent(ev)}
                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
