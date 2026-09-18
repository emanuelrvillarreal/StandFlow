import { X, Tag, DollarSign, Hash, Info } from 'lucide-react'

const STATUS_LABELS = { available:'Disponible', pending:'Pendiente', reserved:'Reservado', blocked:'Bloqueado' }
const STATUS_STYLES = { available:'text-accent-soft bg-accent/10 border border-accent/30', pending:'text-yellow-300 bg-yellow-500/10 border border-yellow-500/30', reserved:'text-red-300 bg-red-500/10 border border-red-500/30', blocked:'text-muted bg-ink-700 border border-ink-600' }

export default function StandModal({ stand, category, event, onClose, onReserve }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-ink-800 border border-ink-600 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-600">
          <h3 className="font-display font-bold text-xl text-white">Stand {stand.number}</h3>
          <button onClick={onClose} className="text-muted hover:text-white transition">
            <X size={22}/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink-900 border border-ink-600 rounded-xl flex items-center justify-center">
              <Hash size={16} className="text-muted"/>
            </div>
            <div>
              <p className="text-xs text-muted">Número de stand</p>
              <p className="font-semibold text-white">{stand.number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink-900 border border-ink-600 rounded-xl flex items-center justify-center">
              <Info size={16} className="text-muted"/>
            </div>
            <div>
              <p className="text-xs text-muted">Sector</p>
              <p className="font-semibold text-white capitalize">{stand.sector}</p>
            </div>
          </div>

          {category && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: category.color + '20'}}>
                <Tag size={16} style={{color: category.color}}/>
              </div>
              <div>
                <p className="text-xs text-muted">Categoría</p>
                <p className="font-semibold text-white">{category.name}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-accent-soft"/>
            </div>
            <div>
              <p className="text-xs text-muted">Precio</p>
              <p className="font-semibold text-white">${stand.price.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_STYLES[stand.status]}`}>
            <span className="w-2 h-2 rounded-full bg-current"/>
            {STATUS_LABELS[stand.status]}
          </div>
        </div>

        <div className="px-6 pb-6">
          {stand.status === 'available' ? (
            <button onClick={() => onReserve(stand)}
              className="w-full bg-accent hover:bg-accent-soft text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
              Reservar este stand
            </button>
          ) : (
            <button disabled
              className="w-full bg-ink-700 text-muted font-semibold py-3 rounded-xl cursor-not-allowed">
              {STATUS_LABELS[stand.status]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
