import { Plus, Upload, Image as ImageIcon, Copy, Sparkles, RefreshCw } from 'lucide-react'

function generateSponsorCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'SP-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

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

            {eventForm.endDate && (
              <div className={`rounded-2xl border p-4 transition ${eventForm.allowPartialDays ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Elegir días de asistencia</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {eventForm.allowPartialDays
                        ? 'Cada expositor elige en qué días de estos va a estar con su stand.'
                        : 'Todos se asumen presentes los días completos del evento; no se les pregunta nada.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Permitir elegir días de asistencia"
                    aria-checked={!!eventForm.allowPartialDays}
                    onClick={() => setEventForm({ ...eventForm, allowPartialDays: !eventForm.allowPartialDays })}
                    className={`relative flex-shrink-0 w-12 h-7 rounded-full transition ${eventForm.allowPartialDays ? 'bg-violet-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${eventForm.allowPartialDays ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            )}

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

            <div className={`rounded-2xl border p-4 transition ${eventForm.requiresApproval ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">Requiere confirmación</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {eventForm.requiresApproval
                      ? 'Con confirmación: los expositores envían una solicitud y solo los que vos apruebes pueden elegir stand.'
                      : 'Libre: cualquier expositor registrado puede elegir su stand directamente.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!eventForm.requiresApproval}
                  onClick={() => setEventForm({ ...eventForm, requiresApproval: !eventForm.requiresApproval })}
                  className={`relative flex-shrink-0 w-12 h-7 rounded-full transition ${eventForm.requiresApproval ? 'bg-violet-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${eventForm.requiresApproval ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {isEditing && (
                <p className="text-[11px] text-gray-400 mt-2">
                  Quienes ya tienen una reserva en este evento siguen pudiendo participar.
                </p>
              )}
            </div>

            <div className={`rounded-2xl border p-4 transition ${eventForm.sponsorsEnabled ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500" /> Sponsors</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {eventForm.sponsorsEnabled
                      ? 'Habilitado: los Sponsors se registran con el código de este evento y eligen uno de los stands reservados para ellos. Es gratis.'
                      : 'Este evento no tiene Sponsors.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Habilitar Sponsors"
                  aria-checked={!!eventForm.sponsorsEnabled}
                  onClick={() => setEventForm({ ...eventForm, sponsorsEnabled: !eventForm.sponsorsEnabled })}
                  className={`relative flex-shrink-0 w-12 h-7 rounded-full transition ${eventForm.sponsorsEnabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${eventForm.sponsorsEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {eventForm.sponsorsEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Código de Sponsor</label>
                    <div className="flex gap-2">
                      <input type="text" value={eventForm.sponsorCode || ''}
                        onChange={e => setEventForm({ ...eventForm, sponsorCode: e.target.value.toUpperCase() })}
                        placeholder="Ej: SP-FERIA26"
                        className="flex-1 min-w-0 px-4 py-2.5 border border-amber-200 rounded-2xl focus:ring-2 focus:ring-amber-400 outline-none transition bg-white font-mono tracking-wider text-sm" />
                      <button type="button" onClick={() => setEventForm({ ...eventForm, sponsorCode: generateSponsorCode() })}
                        className="px-3 py-2.5 bg-white border border-amber-200 rounded-2xl text-amber-700 hover:bg-amber-100 transition flex items-center gap-1.5 text-xs font-bold">
                        <RefreshCw size={14} /> Generar
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Cada evento tiene su propio código. Compartilo solo con los Sponsors.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Configuración de Mapa (Sponsors)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-3 border-2 border-dashed border-amber-200 rounded-2xl text-gray-400 hover:border-amber-400 hover:text-amber-600 transition cursor-pointer bg-white">
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, 'mapImageSponsor')} />
                        <Upload size={18} />
                        <span className="text-sm font-bold text-gray-600">Subir Captura</span>
                      </label>
                      <div className="p-1 border-2 border-gray-100 rounded-2xl bg-white overflow-hidden min-h-[52px] relative">
                        {eventForm.mapImageSponsor ? (
                          <>
                            <img src={eventForm.mapImageSponsor} className="w-full h-full object-cover" alt="Mapa de Sponsors" />
                            <button type="button" onClick={() => setEventForm({ ...eventForm, mapImageSponsor: null })}
                              className="absolute top-2 right-2 bg-white/90 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">Quitar</button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 p-3">
                            <ImageIcon size={16} />
                            <p className="text-sm font-bold">Sin imagen</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1 leading-relaxed">
                      Se ve como una pestaña "Sponsors" en el mapa del evento. Ahí, en modo edición, creás y ubicás los stands
                      que van a poder elegir los Sponsors (sector Sponsors). Esos stands son gratis y no los pueden tomar los expositores.
                    </p>
                  </div>
                </div>
              )}
            </div>

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
