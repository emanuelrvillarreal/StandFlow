import { X } from 'lucide-react'
import { formatDateTime, formatBirthDate } from '../../lib/formatDateTime'

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
      <p className="text-sm text-gray-800 break-words">{value}</p>
    </div>
  )
}

export default function UserDetailModal({ user, reservationsCount = 0, onClose }) {
  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/60 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">{user.name} {user.lastName}</h2>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {user.businessPhoto && (
            <img src={user.businessPhoto} alt={user.businessName || ''} className="w-full h-44 object-cover rounded-xl border" />
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Nombre" value={`${user.name} ${user.lastName}`.trim()} />
            <Field label="Emprendimiento" value={user.businessName} />
            <Field label="Email" value={user.email} />
            <Field label="Teléfono" value={user.phone} />
            <Field label="Instagram" value={user.instagram} />
            <Field label="Fecha de nacimiento" value={formatBirthDate(user.birthDate)} />
            <Field label="Tipo de cuenta" value={user.role_id === 1 ? (user.isSysadmin ? 'Sysadmin' : 'Admin') : 'Expositor'} />
            {user.role_id !== 1 && <Field label="Stands permitidos por evento" value={user.maxStands} />}
            <Field label="Estado" value={user.isBlocked ? 'Bloqueado' : 'Activo'} />
            <Field label="Reservas" value={reservationsCount} />
            <Field label="Se registró el" value={user.createdAt ? formatDateTime(user.createdAt) : '—'} />
          </div>

          {user.isBlocked && user.blockedReason && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Motivo del bloqueo</p>
              <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-xl p-3">{user.blockedReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
