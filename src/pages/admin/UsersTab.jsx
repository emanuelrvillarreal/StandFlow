import { useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, KeyRound, Search, ShieldOff, ShieldCheck } from 'lucide-react'

export default function UsersTab({ users, reservations, onOpenCreateUser, onOpenEditUser, onDeleteUser, onResetPassword, onBlockUser, onUnblockUser }) {
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => {
      const haystack = [u.name, u.lastName, u.businessName, u.email, u.phone].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [users, search])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{users.length} usuarios registrados</p>
        <button
          onClick={onOpenCreateUser}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
        >
          <Plus size={18} /> Crear nuevo usuario
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, emprendimiento, email o teléfono..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {search && (
        <p className="text-xs text-gray-400 -mt-1">{filteredUsers.length} resultado{filteredUsers.length === 1 ? '' : 's'}</p>
      )}

      {filteredUsers.map(u => (
        <div key={u.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex items-center justify-between flex-wrap gap-3 ${u.isBlocked ? 'border-red-200 bg-red-50/30' : ''}`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${u.isBlocked ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}>
              {u.name?.[0]}{u.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{u.name} {u.lastName}</p>
              {u.businessName && <p className="text-sm text-violet-600 font-medium truncate">{u.businessName}</p>}
              <p className="text-sm text-gray-400 truncate">{u.email} • {u.phone}</p>
              {u.isBlocked && u.blockedReason && (
                <p className="text-xs text-red-500 mt-1 italic truncate" title={u.blockedReason}>Motivo: {u.blockedReason}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.role_id === 1 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
              {u.role_id === 1 ? 'Admin' : 'Expositor'}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {u.isBlocked ? 'Bloqueado' : 'Activo'}
            </span>
            <span className="text-xs text-gray-400">
              {reservations.filter(r => r.userId === u.id).length} reservas
            </span>
            {u.isBlocked ? (
              <button onClick={() => onUnblockUser(u)}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Desbloquear">
                <ShieldCheck size={16} />
              </button>
            ) : (
              <button onClick={() => onBlockUser(u)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Bloquear">
                <ShieldOff size={16} />
              </button>
            )}
            <button onClick={() => onResetPassword(u)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Reenviar recuperación de contraseña">
              <KeyRound size={16} />
            </button>
            <button onClick={() => onOpenEditUser(u)}
              className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition" title="Modificar">
              <Edit2 size={16} />
            </button>
            <button onClick={() => onDeleteUser(u)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400 text-sm">
          No se encontraron usuarios que coincidan con la búsqueda.
        </div>
      )}
    </div>
  )
}
