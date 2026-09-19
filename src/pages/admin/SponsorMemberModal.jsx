import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

const EMPTY = { firstName: '', lastName: '', dni: '', phone: '', email: '', birthDate: '' }

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition'
const labelCls = 'block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1'

function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// Alta o edición de un integrante de un Sponsor (solo administradores).
export default function SponsorMemberModal({ target, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setLocalError('')
    setForm(target?.member ? {
      firstName: target.member.firstName || '', lastName: target.member.lastName || '',
      dni: target.member.dni || '', phone: target.member.phone || '',
      email: target.member.email || '', birthDate: target.member.birthDate || '',
    } : EMPTY)
  }, [target])

  if (!target) return null
  const isEditing = !!target.member

  function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dni.trim() || !form.phone.trim() || !form.email.trim()) {
      setLocalError('Completá nombre, apellido, DNI, teléfono y mail.')
      return
    }
    if (!form.email.includes('@')) { setLocalError('El mail no es válido.'); return }
    if (form.birthDate && (form.birthDate > todayISO() || form.birthDate < '1900-01-01')) {
      setLocalError('La fecha de nacimiento no es válida.')
      return
    }
    setLocalError('')
    onSave(form)
  }

  const f = k => ({ value: form[k], onChange: e => setForm({ ...form, [k]: e.target.value }) })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{isEditing ? 'Modificar integrante' : 'Agregar integrante'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{target.eventName} · Stand {target.standNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {(localError || error) && (
            <div role="alert" className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{localError || error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input type="text" {...f('firstName')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input type="text" {...f('lastName')} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>DNI</label>
              <input type="text" inputMode="numeric" {...f('dni')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" {...f('phone')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mail</label>
            <input type="email" {...f('email')} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Fecha de nacimiento</label>
            <input type="date" min="1900-01-01" max={todayISO()} {...f('birthDate')} className={inputCls} />
            <p className="text-[11px] text-gray-400 mt-1 ml-1">Opcional acá: los registros viejos no la tienen.</p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-[2] px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-200">
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar integrante'}
          </button>
        </div>
      </div>
    </div>
  )
}
