import { useState } from 'react'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { IdCard } from 'lucide-react'

// Cuentas viejas (de antes de que el DNI/CUIT sea obligatorio) no lo tienen
// cargado. En vez de ir a buscarlas una por una, se les pide acá apenas
// entran — no se puede cerrar sin completarlo, pero no bloquea el resto del
// sistema: solo tapa la pantalla hasta que lo guardan.
export default function DniRequiredModal() {
  const { state, dispatch } = useApp()
  const { currentUser } = state
  const [dni, setDni] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (state.loading || !currentUser || currentUser.dni) return null

  async function handleSave(e) {
    e.preventDefault()
    if (!dni.trim()) { setError('Ingresá tu DNI o CUIT.'); return }
    setSaving(true)
    setError('')
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ dni: dni.trim() })
      .eq('id', currentUser.id)
    setSaving(false)
    if (updateError) { setError(`No se pudo guardar: ${updateError.message}`); return }
    dispatch({ type: 'SET_USER', user: { ...currentUser, dni: dni.trim() } })
    dispatch({ type: 'UPDATE_USER', user: { ...currentUser, dni: dni.trim() } })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center">
          <IdCard size={22} />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg leading-tight">Nos falta tu DNI/CUIT</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lo necesitamos para identificar tu cuenta. Completalo para seguir usando el sistema.
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          <input type="text" autoFocus value={dni} onChange={e => setDni(e.target.value)}
            placeholder="DNI o CUIT"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button type="submit" disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
            {saving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
