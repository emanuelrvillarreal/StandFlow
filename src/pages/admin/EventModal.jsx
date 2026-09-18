import { Plus, Upload, Image as ImageIcon, Copy } from 'lucide-react'

export default function EventModal({ open, isEditing, events, eventForm, setEventForm, onFileUpload, onClose, onSave }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg">{isEditing ? 'Editar Evento' : 'Crear Nuevo Evento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre del evento</label>
              <input type="text" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="Ej: Expo Feria Verano 2026"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Lugar</label>
              <input type="text" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Ej: Centro de Convenciones"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2 ml-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!eventForm.endDate}
                  onChange={e => setEventForm({ ...eventForm, endDate: e.target.checked ? (eventForm.date || '') : '' })}
                  className="w-4 h-4 rounded accent-violet-600"
                />
                El evento dura más de un día
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{eventForm.endDate ? 'Desde' : 'Fecha'}</label>
                  <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
                </div>
                {eventForm.endDate && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Hasta</label>
                    <input type="date" value={eventForm.endDate} min={eventForm.date || undefined}
                      onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Estado</label>
                <select
                  value={eventForm.status}
                  onChange={e => setEventForm({ ...eventForm, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition bg-white"
                >
                  <option value="upcoming">Próximo</option>
                  <option value="active">Activo</option>
                  <option value="past">Finalizado</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Póster / Flyer del evento</label>
              <p className="text-[10px] text-gray-400 mb-2 -mt-1">Es la imagen que van a ver los expositores al elegir el evento.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-violet-300 hover:text-violet-600 transition group cursor-pointer bg-white">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, 'posterImage')} />
                  <Upload size={20} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-600 group-hover:text-violet-700">Subir Póster</p>
                    <p className="text-[10px]">JPEG o PNG</p>
                  </div>
                </label>
                <div className="p-1 border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden relative min-h-[60px]">
                  {eventForm.posterImage ? (
                    <img src={eventForm.posterImage} className="w-full h-full object-cover" alt="Preview Póster" />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 p-3">
                      <ImageIcon size={16} />
                      <p className="text-sm font-bold">Sin imagen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Configuración de Mapa (Salón)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-violet-300 hover:text-violet-600 transition group cursor-pointer bg-white">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, 'mapImageSalon')} />
                  <Upload size={20} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-600 group-hover:text-violet-700">Subir Captura</p>
                    <p className="text-[10px]">JPEG o PNG</p>
                  </div>
                </label>
                <div className="p-1 border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden relative min-h-[60px]">
                  {eventForm.mapImageSalon ? (
                    <img src={eventForm.mapImageSalon} className="w-full h-full object-cover" alt="Preview Salon" />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 p-3">
                      <ImageIcon size={16} />
                      <p className="text-sm font-bold">Sin imagen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Configuración de Mapa (Galería - Opcional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-violet-300 hover:text-violet-600 transition group cursor-pointer bg-white">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, 'mapImageGaleria')} />
                  <Upload size={20} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-600 group-hover:text-violet-700">Subir Captura</p>
                    <p className="text-[10px]">JPEG o PNG</p>
                  </div>
                </label>
                <div className="p-1 border-2 border-gray-100 rounded-2xl bg-gray-50 overflow-hidden relative min-h-[60px]">
                  {eventForm.mapImageGaleria ? (
                    <img src={eventForm.mapImageGaleria} className="w-full h-full object-cover" alt="Preview Galeria" />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 p-3">
                      <ImageIcon size={16} />
                      <p className="text-sm font-bold">Sin imagen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">WhatsApp del evento</label>
              <input type="text" value={eventForm.whatsapp} onChange={e => setEventForm({ ...eventForm, whatsapp: e.target.value })}
                placeholder="Ej: 5491112345678"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Instrucciones de pago / Alias</label>
              <textarea value={eventForm.paymentInstructions} onChange={e => setEventForm({ ...eventForm, paymentInstructions: e.target.value })}
                rows={3}
                placeholder="Ej: Transferir al alias FERIA.ARTE.2026. Enviar comprobante por WhatsApp."
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition text-sm" />
            </div>

            {!isEditing && (
              <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                <label className="flex items-center gap-2 text-xs font-bold text-violet-700 uppercase mb-3">
                  <Copy size={14} />
                  Estructura de Stands
                </label>
                <select
                  value={eventForm.copyFrom}
                  onChange={e => setEventForm({ ...eventForm, copyFrom: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-violet-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="none">✨ Evento Nuevo (Sin stands)</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>📋 Clonar de: {ev.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-violet-400 mt-2 italic px-1">
                  * Si clonas un evento, se copiarán todos los stands con sus posiciones actuales.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!eventForm.name || !eventForm.date}
            className="flex-[2] px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-200"
          >
            {isEditing ? 'Guardar cambios' : 'Crear Evento'}
          </button>
        </div>
      </div>
    </div>
  )
}
