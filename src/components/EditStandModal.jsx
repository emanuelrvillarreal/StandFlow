import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'

const STATUSES = ['available','pending','reserved','blocked']
const STATUS_LABELS = { available:'Disponible', pending:'Pendiente', reserved:'Reservado', blocked:'Bloqueado' }

export default function EditStandModal({ stand, categories, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    number: stand?.number ?? '',
    price: stand?.price ?? 5000,
    sector: stand?.sector ?? 'salon',
    status: stand?.status ?? 'available',
    categoryId: stand?.categoryId ?? '',
    x: stand?.x ?? 50,
    y: stand?.y ?? 50,
  })
  const isNew = !stand?.id

  function handleSave() {
    if (!form.number.trim()) return
    onSave({ ...stand, ...form, price: Number(form.price), x: Number(form.x), y: Number(form.y) })
  }

  const f = k => ({ value: form[k], onChange: e => setForm({...form, [k]: e.target.value}) })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">{isNew ? 'Nuevo stand' : `Editar Stand ${stand.number}`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número / ID</label>
            <input type="text" {...f('number')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ej: 23, G1, A5"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
              <input type="number" {...f('price')} min="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
              <select {...f('sector')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                <option value="salon">Salón</option>
                <option value="galeria">Galería</option>
                <option value="sponsor">Sponsors</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select {...f('status')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select {...f('categoryId')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X (%)</label>
              <input type="number" {...f('x')} min="0" max="100" step="0.5"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y (%)</label>
              <input type="number" {...f('y')} min="0" max="100" step="0.5"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
          </div>
          <p className="text-xs text-gray-400">También podés arrastrar el stand directamente en el mapa.</p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {!isNew && (
            <button onClick={() => onDelete(stand.id)}
              className="p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition">
              <Trash2 size={18}/>
            </button>
          )}
          <button onClick={handleSave}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">
            {isNew ? 'Crear stand' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
