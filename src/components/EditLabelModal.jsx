import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'

const COLORS = ['#0b0b16', '#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea', '#ffffff']
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']

export default function EditLabelModal({ label, onSave, onDelete, onClose }) {
  const [text, setText] = useState(label?.text ?? '')
  const [color, setColor] = useState(label?.color ?? '#0b0b16')
  const [rotation, setRotation] = useState(label?.rotation ?? 0)
  const isNew = !label?.id
  const textColor = color === '#ffffff' ? '#0b0b16' : '#ffffff'

  function handleSave() {
    if (!text.trim()) return
    onSave({ ...label, text: text.trim(), color, rotation: Number(rotation) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">{isNew ? 'Nuevo texto sobre el mapa' : 'Editar texto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
            <input type="text" autoFocus value={text} onChange={e => setText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ej: ENTRADA, SALIDA, BAÑOS..."/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flechas rápidas</label>
            <div className="flex flex-wrap gap-1.5">
              {ARROWS.map(a => (
                <button key={a} type="button" onClick={() => setText(t => `${t}${a}`.trim())}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-lg hover:bg-gray-50 transition">
                  {a}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Tocá una para agregarla al texto (podés combinar, ej: "SALIDA →").</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${color === c ? 'border-violet-600 scale-110' : 'border-gray-200'}`}
                  style={{ background: c }} title={c}/>
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer" title="Otro color"/>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Rotación</label>
              <span className="text-xs text-gray-400">{rotation}°</span>
            </div>
            <input type="range" min="0" max="359" value={rotation} onChange={e => setRotation(e.target.value)}
              className="w-full accent-violet-600"/>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Vista previa</p>
            <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border border-white/30 shadow inline-block"
                style={{ background: color, color: textColor, transform: `rotate(${rotation}deg)` }}>
                {text || 'TEXTO'}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400">También lo podés arrastrar directamente en el mapa para ubicarlo.</p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {!isNew && (
            <button onClick={() => onDelete(label.id)}
              className="p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition">
              <Trash2 size={18}/>
            </button>
          )}
          <button onClick={handleSave}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">
            {isNew ? 'Agregar' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
