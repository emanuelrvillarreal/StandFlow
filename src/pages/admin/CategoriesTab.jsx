import { Plus, Edit2, Trash2 } from 'lucide-react'

export default function CategoriesTab({
  categories, reservations,
  catForm, setCatForm, onAddCategory,
  editingCat, setEditingCat, onSaveCat, onDeleteCategory,
}) {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="font-bold text-gray-800 mb-4">Agregar categoría</h3>
        <div className="flex gap-3">
          <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
            placeholder="Nombre de categoría"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          <div className="flex items-center gap-2">
            <input type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })}
              className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
          </div>
          <button onClick={onAddCategory}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1">
            <Plus size={14} /> Agregar
          </button>
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Detalles del stand (opcional)</label>
          <textarea value={catForm.details} onChange={e => setCatForm({ ...catForm, details: e.target.value })}
            placeholder={'Ej: 1,80 x 73, incluye 2 sillas por mesa.\nNo incluye corriente eléctrica.\nNo incluye mantel.'}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none" />
          <p className="text-[11px] text-gray-400 mt-1">Se le muestra al expositor cuando elige un stand de esta categoría, y queda guardado en su reserva.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border divide-y">
        {categories.map(cat => (
          <div key={cat.id} className="px-5 py-4">
            <div className="flex items-center justify-between">
              {editingCat?.id === cat.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input type="text" value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <input type="color" value={editingCat.color} onChange={e => setEditingCat({ ...editingCat, color: e.target.value })}
                    className="w-9 h-9 rounded-xl border cursor-pointer p-0.5" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full" style={{ background: cat.color }} />
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">
                    {reservations.filter(r => r.categoryId === cat.id).length} reservas
                  </span>
                </div>
              )}
              {editingCat?.id !== cat.id && (
                <div className="flex gap-1">
                  <button onClick={() => setEditingCat({ ...cat, details: cat.details || '' })}
                    className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => onDeleteCategory(cat)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {editingCat?.id === cat.id ? (
              <div className="mt-3">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Detalles del stand (opcional)</label>
                <textarea value={editingCat.details} onChange={e => setEditingCat({ ...editingCat, details: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={onSaveCat}
                    className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-green-600 transition">
                    Guardar
                  </button>
                  <button onClick={() => setEditingCat(null)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : cat.details ? (
              <p className="text-xs text-gray-400 mt-2 ml-11 whitespace-pre-line">{cat.details}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
