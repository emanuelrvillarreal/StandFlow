import { useState } from 'react'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { X, ArrowLeft, CheckCircle, MessageCircle } from 'lucide-react'

function toReservationRow(reservation) {
  return {
    id: reservation.id,
    event_id: reservation.eventId,
    stand_id: reservation.standId,
    user_id: reservation.userId,
    stand_name: reservation.standName,
    shared: reservation.shared,
    shared_with: reservation.sharedWith,
    instagram: reservation.instagram,
    category_id: reservation.categoryId,
    status: reservation.status,
    amount: reservation.amount,
    payment_type: reservation.paymentType,
    created_at: reservation.createdAt,
  }
}

export default function ReservationFlow({ stand, event, onClose }) {
  const { state, dispatch } = useApp()
  const { currentUser, categories } = state
  const [step, setStep] = useState('form') // form | confirm
  const [form, setForm] = useState({ standName: currentUser?.businessName || '', shared:'no', sharedWith:'', instagram:'', categoryId:'', paymentType: 'full' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reservation, setReservation] = useState(null)
  const f = k => ({ value: form[k], onChange: e => setForm({...form, [k]: e.target.value}) })
  const calculatedAmount = form.paymentType === 'deposit' ? stand.price / 2 : stand.price

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.standName.trim()) { setError('El nombre del stand es obligatorio'); return }
    if (!form.categoryId) { setError('Seleccioná una categoría'); return }
    if (form.shared === 'si' && !form.sharedWith.trim()) { setError('Indicá con quién compartís'); return }
    setError('')
    setSubmitting(true)

    const res = {
      id: crypto.randomUUID(),
      eventId: event.id,
      standId: stand.id,
      userId: currentUser.id,
      standName: form.standName,
      shared: form.shared === 'si',
      sharedWith: form.sharedWith,
      instagram: form.instagram,
      categoryId: form.categoryId,
      status: 'pending',
      amount: calculatedAmount,
      paymentType: form.paymentType,
      createdAt: new Date().toISOString(),
    }

    // Actualización condicionada: solo tiene efecto si el stand sigue "available".
    // Esto evita que dos personas reserven el mismo stand si hacen click casi
    // al mismo tiempo (el segundo intento no afecta ninguna fila y se corta acá).
    const { data: standUpdateRows, error: standError } = await supabase
      .from('stands')
      .update({ status: 'pending', category_id: form.categoryId })
      .eq('id', stand.id)
      .eq('status', 'available')
      .select('id')

    if (standError) {
      setError(`No se pudo actualizar el estado del stand: ${standError.message}`)
      setSubmitting(false)
      return
    }

    if (!standUpdateRows || standUpdateRows.length === 0) {
      setError('Este stand ya fue reservado por otra persona. Elegí otro stand.')
      setSubmitting(false)
      return
    }

    const baseRow = toReservationRow(res)
    let reservationError = null
    {
      const { error } = await supabase.from('reservations').insert(baseRow)
      reservationError = error || null
    }
    // Si la columna payment_type (o paid_at) aún no existe en Supabase,
    // PostgREST responde "Could not find the 'payment_type' column ... in the
    // schema cache". Reintentamos sin esas columnas para no bloquear la reserva.
    // Solución definitiva: ejecutar supabase-rls-policies.sql en el SQL Editor.
    if (reservationError && /payment_type|paid_at/i.test(reservationError.message)) {
      const fallbackRow = { ...baseRow }
      delete fallbackRow.payment_type
      delete fallbackRow.paid_at
      const { error: retryError } = await supabase.from('reservations').insert(fallbackRow)
      reservationError = retryError || null
      if (!reservationError) {
        console.warn(
          'Reserva guardada sin payment_type/paid_at: falta ejecutar el ALTER TABLE en Supabase (ver supabase-rls-policies.sql).'
        )
      }
    }
    if (reservationError) {
      // El rollback puede fallar por RLS (la policy solo permite available->pending).
      // En ese caso el stand queda huérfano en 'pending' sin reserva: lo avisamos
      // en consola y el admin puede liberarlo o correr el SQL de limpieza.
      const { error: rollbackError } = await supabase.from('stands').update({ status: 'available', category_id: null }).eq('id', stand.id)
      if (rollbackError) {
        console.warn(`No se pudo revertir el stand ${stand.id} tras fallar la reserva:`, rollbackError.message)
      }
      const hint = /schema cache/i.test(reservationError.message)
        ? ' Falta actualizar la base de datos: ejecutá supabase-rls-policies.sql en Supabase > SQL Editor.'
        : ''
      setError(`No se pudo guardar la reserva: ${reservationError.message}${hint}`)
      setSubmitting(false)
      return
    }

    dispatch({ type: 'ADD_RESERVATION', reservation: res })
    setReservation(res)
    setStep('confirm')
    setSubmitting(false)
  }

  function buildWhatsApp() {
    const cat = categories.find(c => c.id === form.categoryId)
    // El número de WhatsApp es del evento (cada evento puede tener uno distinto);
    // la plantilla del mensaje sigue siendo la configuración global de Admin.
    const whatsappNumber = String(event.whatsapp || state.settings?.whatsappNumber || '').replace(/\D/g, '')

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

    const sharedText = form.shared === 'si' ? `🤝 Comparte con: ${form.sharedWith}` : ''
    const instaText = form.instagram ? `📸 Instagram: ${form.instagram}` : ''

    const replacements = {
      '{evento}': event.name,
      '{stand_numero}': stand.number,
      '{stand_nombre}': form.standName,
      '{categoria}': cat?.name || '-',
      '{importe}': `$${stand.price.toLocaleString('es-AR')}`,
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

  if (step === 'confirm') {
    const cat = categories.find(c => c.id === form.categoryId)
    const paymentInstructions = event.paymentInstructions || 'Enviá el comprobante de pago por WhatsApp para confirmar tu reserva.'
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-ink-800 border border-ink-600 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="overflow-y-auto">
          <div className="px-6 pt-8 pb-4 text-center">
            <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-accent" size={32}/>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-1">¡Reserva registrada!</h3>
            <p className="text-muted text-sm">Tu reserva quedó pendiente de confirmación.</p>
          </div>

          <div className="mx-6 bg-ink-900 border border-ink-600 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Stand</span>
              <span className="font-medium text-white">{stand.number} — {form.standName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Categoría</span>
              <span className="font-medium text-white">{cat?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Evento</span>
              <span className="font-medium text-white text-right max-w-[60%]">{event.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Importe</span>
              <span className="font-bold text-accent-soft">${stand.price.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Estado</span>
              <span className="font-medium text-yellow-300">Pendiente de pago</span>
            </div>
          </div>

          <div className="mx-6 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm px-4 py-3 rounded-xl mb-5">
            <p className="font-semibold mb-1">Datos para el pago</p>
            <p>{paymentInstructions}</p>
          </div>

          </div>

          <div className="px-6 py-4 space-y-3 border-t border-ink-600 bg-ink-800 flex-shrink-0">
            <button onClick={buildWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
              <MessageCircle size={18}/> Confirmar por WhatsApp
            </button>
            <button onClick={onClose}
              className="w-full bg-ink-700 hover:bg-ink-600 text-white font-semibold py-3 rounded-xl transition">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-ink-800 border border-ink-600 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-600 flex-shrink-0">
          <button onClick={onClose} className="text-muted hover:text-white transition"><ArrowLeft size={20}/></button>
          <div>
            <h3 className="font-display font-bold text-white">Reservar Stand {stand.number}</h3>
            <p className="text-xs text-muted">{event.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted hover:text-white transition"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Nombre del stand <span className="text-red-400">*</span>
            </label>
            <input type="text" required {...f('standName')}
              className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
              placeholder="Ej: Ropa Artesanal, Joyería..."/>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Categoría <span className="text-red-400">*</span>
            </label>
            <select required {...f('categoryId')}
              className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition">
              <option value="">Seleccioná una categoría...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">¿Stand compartido?</label>
            <div className="flex gap-3">
              {['no','si'].map(v => (
                <label key={v} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer transition ${form.shared===v?'border-accent bg-accent/10 text-accent-soft':'border-ink-600 text-muted hover:bg-ink-700'}`}>
                  <input type="radio" name="shared" value={v} checked={form.shared===v} onChange={() => setForm({...form, shared:v})} className="sr-only"/>
                  {v === 'si' ? 'Sí' : 'No'}
                </label>
              ))}
            </div>
          </div>

          {form.shared === 'si' && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Nombre con quien compartís <span className="text-red-400">*</span>
                </label>
                <input type="text" {...f('sharedWith')}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                  placeholder="Nombre completo"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Instagram (opcional)</label>
                <input type="text" {...f('instagram')}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                  placeholder="@usuario"/>
              </div>
            </>
          )}

          <div className="bg-ink-900 border border-ink-600 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Modo de pago</label>
              <div className="flex gap-3">
                {[
                  { id: 'full', label: 'Totalidad (100%)' },
                  { id: 'deposit', label: 'Seña (50%)' }
                ].map(v => (
                  <label key={v.id} className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-xl cursor-pointer transition ${form.paymentType===v.id?'border-accent bg-accent/15 text-accent-soft':'border-ink-600 bg-ink-800 text-muted hover:bg-ink-700'}`}>
                    <input type="radio" name="paymentType" value={v.id} checked={form.paymentType===v.id} onChange={() => setForm({...form, paymentType:v.id})} className="sr-only"/>
                    <span className="text-sm font-medium">{v.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-ink-600 pt-4">
              <span className="text-muted text-sm">A pagar ahora</span>
              <span className="font-display font-bold text-xl text-accent-soft">${calculatedAmount.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </form>

        <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t border-ink-600">
          <button type="submit" onClick={handleSubmit} disabled={submitting}
            className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
            {submitting ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}
