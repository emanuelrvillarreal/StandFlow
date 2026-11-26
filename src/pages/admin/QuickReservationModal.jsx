import { useState } from 'react'
import { Plus, Zap, Search, Check, Eye, EyeOff } from 'lucide-react'

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition text-sm'
const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase mb-1 ml-0.5'

// Carga rápida: para anotar a alguien que nunca pasó por el sistema (pagó o
// avisó directo al admin) sin tener que ir al mapa ni armar todo paso a paso.
export default function QuickReservationModal({
  open, events, categories, users,
  form, setForm, error, saving,
  onClose, onSave,
}) {
  const [userSearch, setUserSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  if (!open) return null

  const set = (k, v) => setForm({ ...form, [k]: v })
  const event = events.find(e => e.id === form.eventId)
  const availableStands = event
    ? event.stands
        .filter(s => s.status === 'available' && s.sector !== 'sponsor')
        .sort((a, b) => String(a.number).localeCompare(String(b.number), 'es', { numeric: true }))
    : []
  const eventCategories = categories.filter(c => c.eventId === form.eventId)
  const stand = event?.stands.find(s => s.id === form.standId)

  const q = userSearch.trim().toLowerCase()
  const matchingUsers = q.length < 2 ? [] : users.filter(u => {
    if (u.role_id === 1 || u.role_id === 3) return false
    const haystack = [u.name, u.lastName, u.businessName, u.email, u.phone].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  }).slice(0, 8)
  const selectedExistingUser = users.find(u => u.id === form.existingUserId)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/60 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Carga rápida</h2>
            <p className="text-xs text-gray-400">Para alguien que pagó o avisó directo, sin pasar por el sistema.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Cerrar">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div role="alert" className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className={labelCls}>Evento</label>
            <select value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value, standId: '', categoryId: '' })}
              className={`${inputCls} bg-white`}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.status === 'past' ? ' (finalizado)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Stand disponible</label>
            <select value={form.standId} onChange={e => set('standId', e.target.value)} className={`${inputCls} bg-white`}>
              <option value="">Seleccioná un stand...</option>
              {availableStands.map(s => <option key={s.id} value={s.id}>N° {s.number} — {s.sector} — ${Number(s.price).toLocaleString('es-AR')}</option>)}
            </select>
            {event && availableStands.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">Este evento no tiene stands disponibles.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Categoría</label>
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={`${inputCls} bg-white`}>
              <option value="">Seleccioná una categoría...</option>
              {eventCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3.5 bg-gray-50/60 space-y-3">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold bg-white">
              <button type="button" onClick={() => set('isNewUser', true)}
                className={`flex-1 py-2 transition ${form.isNewUser ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                Persona nueva
              </button>
              <button type="button" onClick={() => set('isNewUser', false)}
                className={`flex-1 py-2 transition ${!form.isNewUser ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                Ya es usuario
              </button>
            </div>

            {form.isNewUser ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" placeholder="Nombre *" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
                  <input type="text" placeholder="Apellido *" value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} />
                </div>
                <input type="text" placeholder="Emprendimiento (opcional)" value={form.businessName} onChange={e => set('businessName', e.target.value)} className={inputCls} />
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="email" placeholder="Email *" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
                  <input type="tel" placeholder="Teléfono (opcional)" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
                </div>
                <input type="text" placeholder="DNI / CUIT *" value={form.dni} onChange={e => set('dni', e.target.value)} className={inputCls} />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña (opcional, para pasarle a la persona)"
                    value={form.password} onChange={e => set('password', e.target.value)} className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Si le querés dar a la persona una contraseña para que entre directo, escribila acá (mínimo 6 caracteres). Si lo dejás vacío, se genera una automática y después podés usar "Reenviar recuperación" desde Usuarios.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedExistingUser ? (
                  <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{selectedExistingUser.name} {selectedExistingUser.lastName}</p>
                      <p className="text-xs text-gray-500">{selectedExistingUser.businessName || selectedExistingUser.email}</p>
                    </div>
                    <button onClick={() => { set('existingUserId', ''); setUserSearch('') }}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600">Cambiar</button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        placeholder="Buscar por nombre, emprendimiento o email..."
                        className={`${inputCls} pl-9`} />
                    </div>
                    {matchingUsers.length > 0 && (
                      <div className="border border-gray-200 rounded-xl divide-y max-h-40 overflow-y-auto bg-white">
                        {matchingUsers.map(u => (
                          <button key={u.id} onClick={() => set('existingUserId', u.id)}
                            className="w-full text-left px-3 py-2 hover:bg-violet-50 transition flex items-center justify-between gap-2">
                            <span className="text-sm">
                              <span className="font-medium text-gray-900">{u.name} {u.lastName}</span>
                              {u.businessName && <span className="text-gray-500"> · {u.businessName}</span>}
                            </span>
                            <Check size={14} className="text-gray-300" />
                          </button>
                        ))}
                      </div>
                    )}
                    {q.length >= 2 && matchingUsers.length === 0 && (
                      <p className="text-[11px] text-gray-400">No encontré usuarios con eso.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Estado de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pending', label: 'Sin pagar' },
                { id: 'deposit_paid', label: 'Pagó seña' },
                { id: 'paid', label: 'Pagó todo' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => set('paymentStatus', opt.id)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${form.paymentStatus === opt.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Monto {stand ? `(precio del stand: $${Number(stand.price).toLocaleString('es-AR')})` : ''}</label>
            <input type="number" min="0" placeholder="Se calcula solo si lo dejás vacío" value={form.amount}
              onChange={e => set('amount', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition">
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-[2] px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-violet-200">
            {saving ? 'Guardando...' : 'Cargar reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}
