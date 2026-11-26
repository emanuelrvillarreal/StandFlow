import { useEffect, useState } from 'react'
import { Plus, CheckCircle, XCircle, Clock, Trash2, MessageCircle, Mail, Instagram, Store, X, AlertTriangle, Shield, UserPlus } from 'lucide-react'
import { STATUS_LABELS } from './adminHelpers'
import { formatDateTime, formatBirthDate, formatDaysList, eventDays } from '../../lib/formatDateTime'
import { supabase } from '../../lib/supabase'

const PAYMENT_TYPE_STYLES = {
  deposit: 'bg-amber-50 text-amber-700 border border-amber-200',
  full: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

export default function ReservationDetailModal({ detail, onClose, onStatusChange, onDeleteReservation, onNotifyPaid, onResendPaymentEmail = () => {}, onSendExpirationWarning = () => {}, readOnly = false, allowAddInsurance = !readOnly, currentUser = null, users = [] }) {
  const [photoPreview, setPhotoPreview] = useState(false)
  const [insurancePeople, setInsurancePeople] = useState([])
  const [addingCompanion, setAddingCompanion] = useState(false)
  const [companionForm, setCompanionForm] = useState({ first_name: '', last_name: '', dni: '', birth_date: '' })
  const [insuranceErr, setInsuranceErr] = useState('')
  const [insuranceSaving, setInsuranceSaving] = useState(false)
  const reservationId = detail?.reservation?.id

  useEffect(() => {
    if (!reservationId) { setInsurancePeople([]); return }
    let cancelled = false
    supabase.from('reservation_insurance').select('*').eq('reservation_id', reservationId).order('position').then(({ data, error }) => {
      if (cancelled || error) return
      setInsurancePeople(data || [])
    })
    return () => { cancelled = true }
  }, [reservationId])

  async function handleAddCompanion() {
    if (!companionForm.first_name.trim() || !companionForm.last_name.trim() || !companionForm.dni.trim() || !companionForm.birth_date) {
      setInsuranceErr('Completá nombre, apellido, DNI y fecha de nacimiento.')
      return
    }
    setInsuranceSaving(true)
    setInsuranceErr('')
    const { data, error } = await supabase.from('reservation_insurance').insert({
      reservation_id: reservationId, role: 'acompanante',
      first_name: companionForm.first_name.trim(), last_name: companionForm.last_name.trim(),
      dni: companionForm.dni.trim(), birth_date: companionForm.birth_date,
      added_by_admin: true, created_by: currentUser?.id || null, position: insurancePeople.length,
    }).select().single()
    setInsuranceSaving(false)
    if (error) { setInsuranceErr(`No se pudo agregar: ${error.message}`); return }
    setInsurancePeople(list => [...list, data])
    setCompanionForm({ first_name: '', last_name: '', dni: '', birth_date: '' })
    setAddingCompanion(false)
  }

  async function handleDeleteInsurancePerson(id) {
    const { error } = await supabase.from('reservation_insurance').delete().eq('id', id)
    if (!error) setInsurancePeople(list => list.filter(p => p.id !== id))
  }

  if (!detail) return null
  const { reservation, event, stand, user, category, creator } = detail
  const paymentType = reservation.paymentType || 'full'
  const depositPct = stand?.price ? Math.round((reservation.amount / stand.price) * 100) : null
  const paymentTypeLabel = paymentType === 'deposit' ? `Seña${depositPct ? ` (${depositPct}%)` : ''}` : 'Total (100%)'
  const isPartialDays = Array.isArray(reservation.days) && reservation.days.length < eventDays(event).length

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
              {isPartialDays && (
                <p className="text-[11px] text-gray-400 mt-1">Días: {formatDaysList(reservation.days)}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Categoría</p>
              <p className="font-medium">{category?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Estado</p>
              {!readOnly && <p className="font-bold text-violet-600">${reservation.amount.toLocaleString('es-AR')}</p>}
              <p className="text-gray-500">{STATUS_LABELS[reservation.status]}</p>
              {reservation.createdAt && <p className="text-[11px] text-gray-400 mt-1">Se anotó el {formatDateTime(reservation.createdAt)}</p>}
              {reservation.createdBy && (
                <p className="text-[11px] text-violet-600 mt-0.5">
                  Carga rápida por {creator ? `${creator.name} ${creator.lastName || ''}`.trim() : 'un administrador'}
                  {creator?.role_id === 3 ? ' (Visualizador)' : ''}
                </p>
              )}
              {!readOnly && (
                <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PAYMENT_TYPE_STYLES[paymentType]}`}>
                  {paymentTypeLabel}
                </span>
              )}
            </div>
          </div>

          {reservation.categoryDetails && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Detalles del stand</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.categoryDetails}</p>
            </div>
          )}

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

          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5"><Shield size={16} className="text-violet-600" /> Datos de seguro</h3>
            {insuranceErr && <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm mb-3">{insuranceErr}</div>}
            {insurancePeople.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">Todavía no cargó los datos de seguro.</div>
            ) : (
              <div className="space-y-2">
                {insurancePeople.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {p.first_name} {p.last_name}
                        <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.role === 'titular' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'}`}>
                          {p.role === 'titular' ? 'Titular' : 'Acompañante'}
                        </span>
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        DNI {p.dni} · Nac. {formatBirthDate(p.birth_date)}
                        {p.added_by_admin && ` · cargado por ${(() => {
                          const c = users.find(u => u.id === p.created_by)
                          if (!c) return 'el admin'
                          const name = `${c.name} ${c.lastName || ''}`.trim()
                          return c.role_id === 3 ? `${name} (Visualizador)` : name
                        })()}`}
                      </p>
                    </div>
                    {!readOnly && p.role === 'acompanante' && (
                      <button onClick={() => handleDeleteInsurancePerson(p.id)} className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {allowAddInsurance && (addingCompanion ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre *" value={companionForm.first_name} onChange={e => setCompanionForm({ ...companionForm, first_name: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <input type="text" placeholder="Apellido *" value={companionForm.last_name} onChange={e => setCompanionForm({ ...companionForm, last_name: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <input type="text" placeholder="DNI *" value={companionForm.dni} onChange={e => setCompanionForm({ ...companionForm, dni: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <input type="date" value={companionForm.birth_date} onChange={e => setCompanionForm({ ...companionForm, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <div className="flex gap-2">
                  <button onClick={handleAddCompanion} disabled={insuranceSaving}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition">
                    {insuranceSaving ? 'Guardando...' : 'Guardar acompañante'}
                  </button>
                  <button onClick={() => { setAddingCompanion(false); setInsuranceErr('') }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingCompanion(true)}
                className="mt-3 flex items-center gap-1.5 text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg text-sm font-medium transition">
                <UserPlus size={15} /> Agregar acompañante
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3">
          {!readOnly && reservation.status !== 'paid' && (
            <button onClick={() => onStatusChange(reservation.id, 'paid')}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <CheckCircle size={14} /> Marcar pagado
            </button>
          )}
          {!readOnly && reservation.status !== 'cancelled' && (
            <button onClick={() => onStatusChange(reservation.id, 'cancelled')}
              className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition">
              <XCircle size={14} /> Cancelar
            </button>
          )}
          {!readOnly && reservation.status === 'cancelled' && (
            <button onClick={() => onStatusChange(reservation.id, 'pending')}
              className="flex items-center gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <Clock size={14} /> Reactivar
            </button>
          )}
          {!readOnly && reservation.status === 'cancelled' && (
            <button onClick={() => onDeleteReservation(reservation)}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
          {!readOnly && user?.phone && (
            <button onClick={() => onNotifyPaid(reservation, event, stand, user)}
              className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <MessageCircle size={14} /> Avisar cupo completo
            </button>
          )}
          {!readOnly && (reservation.status === 'deposit_paid' || reservation.status === 'paid') && (
            <button onClick={() => onResendPaymentEmail(reservation)}
              className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <Mail size={14} /> Reenviar mail de pago
            </button>
          )}
          {!readOnly && reservation.status === 'pending' && (
            <button onClick={() => onSendExpirationWarning(reservation)}
              className="flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium transition">
              <AlertTriangle size={14} /> Avisar vencimiento (72 hs)
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
