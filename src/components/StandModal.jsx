import { useState } from 'react'
import { X, Tag, DollarSign, Hash, Info } from 'lucide-react'

const STATUS_LABELS = { available:'Disponible', pending:'Pendiente', reserved:'Reservado', blocked:'Bloqueado' }
const STATUS_COLORS = { available:'text-green-600 bg-green-50', pending:'text-yellow-600 bg-yellow-50', reserved:'text-red-600 bg-red-50', blocked:'text-gray-500 bg-gray-100' }

export default function StandModal({ stand, category, event, onClose, onReserve }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-xl text-gray-900">Stand {stand.number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={22}/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <Hash size={16} className="text-gray-500"/>
            </div>
            <div>
              <p className="text-xs text-gray-400">Número de stand</p>
              <p className="font-semibold text-gray-800">{stand.number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <Info size={16} className="text-gray-500"/>
            </div>
            <div>
              <p className="text-xs text-gray-400">Sector</p>
              <p className="font-semibold text-gray-800 capitalize">{stand.sector}</p>
            </div>
          </div>

          {category && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: category.color + '20'}}>
                <Tag size={16} style={{color: category.color}}/>
              </div>
              <div>
                <p className="text-xs text-gray-400">Categoría</p>
                <p className="font-semibold text-gray-800">{category.name}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-green-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-400">Precio</p>
              <p className="font-semibold text-gray-800">${stand.price.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[stand.status]}`}>
            <span className="w-2 h-2 rounded-full bg-current"/>
            {STATUS_LABELS[stand.status]}
          </div>
        </div>

        <div className="px-6 pb-6">
          {stand.status === 'available' ? (
            <button onClick={() => onReserve(stand)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">
              Reservar este stand
            </button>
          ) : (
            <button disabled
              className="w-full bg-gray-100 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed">
              {STATUS_LABELS[stand.status]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
