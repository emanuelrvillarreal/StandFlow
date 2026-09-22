import { CheckCircle, AlertTriangle, Info } from 'lucide-react'

const TONES = {
  success: {
    iconWrap: 'bg-accent/10 border-accent/30',
    icon: 'text-accent',
    IconCmp: CheckCircle,
  },
  danger: {
    iconWrap: 'bg-red-500/10 border-red-500/30',
    icon: 'text-red-400',
    IconCmp: AlertTriangle,
  },
  neutral: {
    iconWrap: 'bg-accent/10 border-accent/30',
    icon: 'text-accent',
    IconCmp: Info,
  },
}

// Popup de aviso, para reemplazar el alert() del navegador en mensajes de
// "listo, ya está" (una sola acción: cerrar). Para confirmaciones con
// "¿estás seguro?" se sigue usando ConfirmDialog.
export default function NoticeDialog({
  open, title = 'Listo', message, itemLabel,
  closeLabel = 'Entendido', tone = 'success',
  onClose,
}) {
  if (!open) return null
  const t = TONES[tone] || TONES.success
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
          {message && <p className="text-sm text-muted leading-relaxed">{message}</p>}
        </div>
        <div className="p-4 bg-ink-900 border-t border-ink-700">
          <button onClick={onClose} autoFocus
            className="w-full px-4 py-2.5 bg-accent hover:bg-accent-soft text-ink-950 rounded-xl font-bold transition">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
