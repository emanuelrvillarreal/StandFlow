import { Plus, ShieldOff } from 'lucide-react'

export default function BlockUserModal({ open, user, reason, setReason, onClose, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <ShieldOff size={18} />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">Bloquear usuario</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{user?.name} {user?.lastName}</span> no va a poder volver a iniciar sesión hasta que lo desbloquees.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Motivo (interno, solo lo ves vos)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: no pagó la seña a tiempo, comportamiento inadecuado..."
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-400 outline-none transition text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">El expositor nunca va a ver este motivo.</p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-[2] px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition">
            Bloquear usuario
          </button>
        </div>
      </div>
    </div>
  )
}
