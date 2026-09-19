import { useState } from 'react'
import { Plus, CheckCircle, XCircle, Clock, Trash2, MessageCircle, Instagram, Store, X } from 'lucide-react'
import { STATUS_LABELS } from './adminHelpers'
import { formatDateTime, formatBirthDate } from '../../lib/formatDateTime'

const PAYMENT_TYPE_LABELS = { deposit: 'Seña (50%)', full: 'Total (100%)' }
const PAYMENT_TYPE_STYLES = {
  deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
  full: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export default function ReservationDetailModal({ detail, onClose, onStatusChange, onDeleteReservation, onNotifyPaid }) {
  const [photoPreview, setPhotoPreview] = useState(false)
  if (!detail) return null
  const { reservation, event, stand, user, category } = detail
  const paymentType = reservation.paymentType || 'full'

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Detalle de reserva</h2>
            <p className="text-sm text-gray-400">{event?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Stand</p>
              <p className="font-bold text-gray-900">N° {stand?.number ?? reservation.standId}</p>
              <p className="text-gray-500">{reservation.standName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Categoría</p>
              <p className="font-medium">{category?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Importe / Estado</p>
              <p className="font-bold text-violet-600">${reservation.amount.toLocaleString('es-AR')}</p>
              <p className="text-gray-500">{STATUS_LABELS[reservation.status]}</p>
              {reservation.createdAt && <p className="text-[11px] text-gray-400 mt-1">Se anotó el {formatDateTime(reservation.createdAt)}</p>}
              <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PAYMENT_TYPE_STYLES[paymentType]}`}>
                {PAYMENT_TYPE_LABELS[paymentType]}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">Datos del expositor (titular de la cuenta)</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0">
                {user?.businessPhoto ? (
                  <button onClick={() => setPhotoPreview(true)} title="Ver foto en grande"
                    className="block rounded-2xl overflow-hidden border hover:opacity-90 transition cursor-zoom-in">
                    <img src={user.businessPhoto} alt={user.businessName || 'Emprendimiento'} className="w-16 h-16 object-cover" />
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border flex items-center justify-center">
                    <Store className="text-gray-300" size={26} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{user?.businessName || 'Sin emprendimiento cargado'}</p>
                <p className="text-sm text-gray-500 truncate">{user?.name} {user?.lastName}</p>
                {user?.instagram && (
                  <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-pink-600 hover:underline mt-0.5">
                    <Instagram size={12} /> {user.instagram}
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Celular</p>
                <p className="font-medium">{user?.phone || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium break-all">{user?.email || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Fecha de nacimiento</p>
                <p className="font-medium">{formatBirthDate(user?.birthDate) || '-'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">Datos compartidos</h3>
            {reservation.shared ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Comparte con</p>
                  <p className="font-medium">{reservation.sharedWith}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Instagram</p>
                  <p className="font-medium">{reservation.instagram || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">No comparte stand.</div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3">
          {reservation.status !== 'paid' && (
            <button onClick={() => onStatusChange(reservation.id, 'paid')}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <CheckCircle size={14} /> Marcar pagado
            </button>
          )}
          {reservation.status !== 'cancelled' && (
            <button onClick={() => onStatusChange(reservation.id, 'cancelled')}
              className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition">
              <XCircle size={14} /> Cancelar
            </button>
          )}
          {reservation.status === 'cancelled' && (
            <button onClick={() => onStatusChange(reservation.id, 'pending')}
              className="flex items-center gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <Clock size={14} /> Reactivar
            </button>
          )}
          {reservation.status === 'cancelled' && (
            <button onClick={() => onDeleteReservation(reservation)}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
          {user?.phone && (
            <button onClick={() => onNotifyPaid(reservation, event, stand, user)}
              className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <MessageCircle size={14} /> Avisar cupo completo
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
    {photoPreview && user?.businessPhoto && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={() => setPhotoPreview(false)}>
        <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPhotoPreview(false)}
            className="absolute -top-3 -right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-lg transition">
            <X size={18} />
          </button>
          <img src={user.businessPhoto} alt={user.businessName || 'Foto del emprendimiento'}
            className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white" />
          <p className="text-center text-white/80 text-sm mt-3">{user.businessName || 'Foto del emprendimiento'}</p>
        </div>
      </div>
    )}
    </>
  )
}
