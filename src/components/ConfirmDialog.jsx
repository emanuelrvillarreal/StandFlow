import { AlertTriangle, Info } from 'lucide-react'

const TONES = {
  danger: {
    iconWrap: 'bg-red-500/10 border-red-500/30',
    icon: 'text-red-400',
    confirmBtn: 'bg-red-500 hover:bg-red-600',
    IconCmp: AlertTriangle,
  },
  neutral: {
    iconWrap: 'bg-accent/10 border-accent/30',
    icon: 'text-accent',
    confirmBtn: 'bg-accent hover:bg-accent-soft text-ink-950',
    IconCmp: Info,
  },
}

export default function ConfirmDialog({
  open, title = '¿Estás seguro?', message, itemLabel,
  confirmLabel = 'Eliminar', cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm, onCancel,
}) {
  if (!open) return null
  const t = TONES[tone] || TONES.danger
  const Icon = t.IconCmp

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-ink-800 border border-ink-600 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 mx-auto mb-4 rounded-full border flex items-center justify-center ${t.iconWrap}`}>
            <Icon className={t.icon} size={26} />
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2">{title}</h3>
          {itemLabel && (
            <p className="inline-block max-w-full truncate px-3 py-1.5 mb-2 rounded-full bg-ink-900 border border-ink-600 text-sm font-medium text-accent-soft">
              {itemLabel}
            </p>
          )}
          <p className="text-sm text-ink-500/90 leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-ink-900 border-t border-ink-700 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-ink-600 rounded-xl font-semibold text-ink-500/90 hover:bg-ink-700 hover:text-white transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold transition ${t.confirmBtn}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
