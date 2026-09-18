import { Plus } from 'lucide-react'

export default function UserModal({
  open, editingUser, userForm, setUserForm, userError, savingUser,
  onClose, onSave,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg">{editingUser ? 'Modificar usuario' : 'Crear nuevo usuario'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {userError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{userError}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nombre</label>
              <input type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Apellido</label>
              <input type="text" value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Emprendimiento</label>
            <input type="text" value={userForm.businessName} onChange={e => setUserForm({ ...userForm, businessName: e.target.value })}
              placeholder="Ej: Ropa Artesanal MJ"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Email</label>
            <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
              disabled={!!editingUser}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-400" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Teléfono</label>
            <input type="tel" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Contraseña inicial</label>
              <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Tipo de usuario</label>
            <select value={userForm.role_id} onChange={e => setUserForm({ ...userForm, role_id: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none transition bg-white">
              <option value={2}>Expositor</option>
              <option value={1}>Administrador</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition">
            Cancelar
          </button>
          <button onClick={onSave} disabled={savingUser}
            className="flex-[2] px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-lg shadow-violet-200">
            {savingUser ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}
