import { MessageCircle, Settings } from 'lucide-react'

export default function SettingsTab({ settingsForm, setSettingsForm, onSaveSettings }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <MessageCircle size={18} className="text-violet-600" />
          Configuración de WhatsApp
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Número de WhatsApp (con código de país, ej: 54911...)
            </label>
            <input
              type="text"
              value={settingsForm.whatsappNumber}
              onChange={e => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="Ej: 5491112345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Plantilla para enviar comprobante
            </label>
            <textarea
              value={settingsForm.whatsappTemplate}
              onChange={e => setSettingsForm({ ...settingsForm, whatsappTemplate: e.target.value })}
              rows={10}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
              placeholder="Escribe el mensaje..."
            />
            <div className="mt-3 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Etiquetas disponibles:</p>
              <div className="flex flex-wrap gap-2">
                {['{evento}', '{stand_numero}', '{stand_nombre}', '{categoria}', '{importe}', '{usuario_nombre}', '{usuario_email}', '{usuario_telefono}', '{compartido}', '{instagram}'].map(tag => (
                  <code key={tag} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-violet-600">{tag}</code>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Plantilla de confirmación de cupo
            </label>
            <textarea
              value={settingsForm.whatsappPaidTemplate || ''}
              onChange={e => setSettingsForm({ ...settingsForm, whatsappPaidTemplate: e.target.value })}
              rows={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono"
              placeholder="Mensaje para avisar que el cupo quedó confirmado..."
            />
            <div className="mt-3 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Etiquetas disponibles:</p>
              <div className="flex flex-wrap gap-2">
                {['{evento}', '{stand_numero}', '{stand_nombre}', '{categoria}', '{importe}', '{usuario_nombre}', '{usuario_email}', '{usuario_telefono}'].map(tag => (
                  <code key={tag} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-violet-600">{tag}</code>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onSaveSettings}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition shadow-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Settings className="text-amber-600" size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-sm mb-1">Información importante</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Las etiquetas se reemplazarán automáticamente con la información real de la reserva cuando el usuario haga click en el botón de WhatsApp. Asegúrate de incluirlas para que recibas todos los datos necesarios.
          </p>
        </div>
      </div>
    </div>
  )
}
