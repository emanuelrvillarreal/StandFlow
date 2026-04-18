import { useState } from 'react'
import { useApp } from '../store'
import { X, ArrowLeft, CheckCircle, MessageCircle } from 'lucide-react'

export default function ReservationFlow({ stand, event, onClose }) {
  const { state, dispatch } = useApp()
  const [step, setStep] = useState('form') // form | confirm
  const [form, setForm] = useState({ standName:'', shared:'no', sharedWith:'', instagram:'', categoryId:'' })
  const [error, setError] = useState('')
  const [reservation, setReservation] = useState(null)

  const { currentUser, categories } = state
  const f = k => ({ value: form[k], onChange: e => setForm({...form, [k]: e.target.value}) })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.standName.trim()) { setError('El nombre del stand es obligatorio'); return }
    if (!form.categoryId) { setError('Seleccioná una categoría'); return }
    if (form.shared === 'si' && !form.sharedWith.trim()) { setError('Indicá con quién compartís'); return }
    setError('')

    const res = {
      id: 'r' + Date.now(),
      eventId: event.id,
      standId: stand.id,
      userId: currentUser.id,
      standName: form.standName,
      shared: form.shared === 'si',
      sharedWith: form.sharedWith,
      instagram: form.instagram,
      categoryId: form.categoryId,
      status: 'pending',
      amount: stand.price,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_RESERVATION', reservation: res })
    setReservation(res)
    setStep('confirm')
  }

  function buildWhatsApp() {
    const cat = categories.find(c => c.id === form.categoryId)
    const msg = encodeURIComponent(
      `¡Hola! Quiero confirmar mi reserva:\n\n` +
      `📍 Evento: ${event.name}\n` +
      `🏷️ Stand: ${stand.number} - ${form.standName}\n` +
      `📂 Categoría: ${cat?.name || '-'}\n` +
      `💰 Importe: $${stand.price.toLocaleString('es-AR')}\n` +
      `👤 Nombre: ${currentUser.name} ${currentUser.lastName}\n` +
      `📧 Email: ${currentUser.email}\n` +
      `📱 Teléfono: ${currentUser.phone}\n` +
      (form.shared === 'si' ? `🤝 Comparte con: ${form.sharedWith}\n` : '') +
      (form.instagram ? `📸 Instagram: ${form.instagram}\n` : '') +
      `\nAdjunto el comprobante de pago.`
    )
    window.open(`https://wa.me/${event.whatsapp}?text=${msg}`, '_blank')
  }

  if (step === 'confirm') {
    const cat = categories.find(c => c.id === form.categoryId)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-8 pb-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500" size={32}/>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">¡Reserva registrada!</h3>
            <p className="text-gray-500 text-sm">Tu reserva quedó pendiente de confirmación.</p>
          </div>

          <div className="mx-6 bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Stand</span>
              <span className="font-medium">{stand.number} — {form.standName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categoría</span>
              <span className="font-medium">{cat?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Evento</span>
              <span className="font-medium text-right max-w-[60%]">{event.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Importe</span>
              <span className="font-bold text-violet-600">${stand.price.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estado</span>
              <span className="font-medium text-yellow-600">Pendiente de pago</span>
            </div>
          </div>

          <div className="mx-6 bg-yellow-50 text-yellow-800 text-sm px-4 py-3 rounded-xl mb-5">
            Para confirmarla, enviá el comprobante por WhatsApp.
          </div>

          <div className="px-6 pb-6 space-y-3">
            <button onClick={buildWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
              <MessageCircle size={18}/> Enviar mensaje por WhatsApp
            </button>
            <button onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20}/></button>
          <div>
            <h3 className="font-bold text-gray-900">Reservar Stand {stand.number}</h3>
            <p className="text-xs text-gray-400">{event.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del stand <span className="text-red-500">*</span>
            </label>
            <input type="text" required {...f('standName')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ej: Ropa Artesanal, Joyería..."/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select required {...f('categoryId')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="">Seleccioná una categoría...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">¿Stand compartido?</label>
            <div className="flex gap-3">
              {['no','si'].map(v => (
                <label key={v} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer transition ${form.shared===v?'border-violet-500 bg-violet-50 text-violet-700':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="shared" value={v} checked={form.shared===v} onChange={() => setForm({...form, shared:v})} className="sr-only"/>
                  {v === 'si' ? 'Sí' : 'No'}
                </label>
              ))}
            </div>
          </div>

          {form.shared === 'si' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre con quien compartís <span className="text-red-500">*</span>
                </label>
                <input type="text" {...f('sharedWith')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Nombre completo"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (opcional)</label>
                <input type="text" {...f('instagram')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="@usuario"/>
              </div>
            </>
          )}

          <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-500 text-sm">Importe</span>
            <span className="font-bold text-xl text-violet-600">${stand.price.toLocaleString('es-AR')}</span>
          </div>
        </form>

        <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t">
          <button type="submit" onClick={handleSubmit}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">
            Confirmar reserva
          </button>
        </div>
      </div>
    </div>
  )
}
