import { Plus } from 'lucide-react'

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition text-sm'
const labelCls = 'block text-[11px] font-bold text-gray-500 uppercase mb-1 ml-0.5'

export default function UserModal({
  open, editingUser, userForm, setUserForm, userError, savingUser,
  onClose, onSave,
}) {
  if (!open) return null

  const set = (k, v) => setUserForm({ ...userForm, [k]: v })
  const isAdminRole = Number(userForm.role_id) === 1

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      {/* Alto máximo + desplazamiento interno: la cabecera y los botones quedan siempre a la vista. */}
      <div data-user-modal className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/60 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{editingUser ? 'Modificar usuario' : 'Crear nuevo usuario'}</h2>
            {editingUser && (
              <p className="text-xs text-gray-400 truncate">{editingUser.email}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Cerrar">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {userError && (
            <div role="alert" className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">{userError}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input type="text" value={userForm.name} onChange={e => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input type="text" value={userForm.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Emprendimiento</label>
            <input type="text" value={userForm.businessName} onChange={e => set('businessName', e.target.value)}
              placeholder="Ej: Ropa Artesanal MJ" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={userForm.email} onChange={e => set('email', e.target.value)}
              disabled={!!editingUser} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={userForm.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nacimiento</label>
              <input type="date" min="1900-01-01" value={userForm.birthDate || ''} onChange={e => set('birthDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          {!editingUser && (
            <div>
              <label className={labelCls}>Contraseña inicial</label>
              <input type="password" value={userForm.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password" className={inputCls} />
            </div>
          )}

          <div className={`grid gap-3 ${isAdminRole ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className={labelCls}>Tipo de usuario</label>
              <select value={userForm.role_id} onChange={e => set('role_id', Number(e.target.value))} className={`${inputCls} bg-white`}>
                <option value={2}>Expositor</option>
                <option value={1}>Administrador</option>
              </select>
            </div>
            {!isAdminRole && (
              <div>
                <label className={labelCls}>Stands por evento</label>
                <input type="number" min="1" max="99" value={userForm.maxStands ?? 1}
                  onChange={e => set('maxStands', Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputCls} font-bold`} />
              </div>
            )}
          </div>
          {!isAdminRole && (
            <p className="text-[11px] text-gray-400 -mt-1.5 leading-relaxed">
              Cuántos stands puede reservar esta cuenta en cada evento. Los expositores normales tienen 1;
              subilo solo para quienes necesiten más de un lugar. Los administradores no tienen límite.
            </p>
          )}
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition">
            Cancelar
          </button>
          <button onClick={onSave} disabled={savingUser}
            className="flex-[2] px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-violet-200">
            {savingUser ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}
