import { useState, useEffect } from 'react'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

// Permite al expositor completar o corregir los datos de seguro de su reserva
// después de haberla hecho (al reservar solo se los pide una vez). Reusa la
// misma función del backend (submit_reservation_insurance), que reemplaza lo
// que el expositor haya cargado antes sin tocar lo que agregó el admin a mano.
export default function InsuranceDataModal({ reservation, onClose }) {
  const { state } = useApp()
  const { currentUser } = state
  const [loading, setLoading] = useState(true)
  const [insurance, setInsurance] = useState({
    titularFirstName: '', titularLastName: '', titularDni: '', titularBirthDate: '',
    hasCompanions: 'no', companionsCount: 1,
    companionFirstName: '', companionLastName: '', companionDni: '', companionBirthDate: '',
  })
  const setIns = (k, v) => setInsurance(prev => ({ ...prev, [k]: v }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('reservation_insurance').select('*').eq('reservation_id', reservation.id)
      .eq('added_by_admin', false).order('position').then(({ data, error }) => {
        if (!error && data) {
          const titular = data.find(p => p.role === 'titular')
          const companion = data.find(p => p.role === 'acompanante')
          setInsurance(prev => ({
            ...prev,
            titularFirstName: titular?.first_name || currentUser?.name || '',
            titularLastName: titular?.last_name || currentUser?.lastName || '',
            titularDni: titular?.dni || '',
            titularBirthDate: titular?.birth_date || currentUser?.birthDate || '',
            hasCompanions: companion ? 'si' : 'no',
            companionFirstName: companion?.first_name || '',
            companionLastName: companion?.last_name || '',
            companionDni: companion?.dni || '',
            companionBirthDate: companion?.birth_date || '',
          }))
        }
        setLoading(false)
      })
  }, [reservation.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!insurance.titularFirstName.trim() || !insurance.titularLastName.trim() || !insurance.titularDni.trim() || !insurance.titularBirthDate) {
      setError('Completá nombre, apellido, DNI y fecha de nacimiento del titular.')
      return
    }
    const people = [{
      role: 'titular',
      first_name: insurance.titularFirstName.trim(),
      last_name: insurance.titularLastName.trim(),
      dni: insurance.titularDni.trim(),
      birth_date: insurance.titularBirthDate,
    }]
    if (insurance.hasCompanions === 'si') {
      if (!insurance.companionFirstName.trim() || !insurance.companionLastName.trim() || !insurance.companionDni.trim() || !insurance.companionBirthDate) {
        setError('Completá nombre, apellido, DNI y fecha de nacimiento del acompañante.')
        return
      }
      people.push({
        role: 'acompanante',
        first_name: insurance.companionFirstName.trim(),
        last_name: insurance.companionLastName.trim(),
        dni: insurance.companionDni.trim(),
        birth_date: insurance.companionBirthDate,
      })
    }
    setError('')
    setSubmitting(true)
    const { error: rpcError } = await supabase.rpc('submit_reservation_insurance', {
      p_reservation_id: reservation.id,
      p_people: people,
    })
    setSubmitting(false)
    if (rpcError) { setError(`No se pudo guardar: ${rpcError.message}`); return }
    setDone(true)
  }

  const companionsCount = Math.max(1, Number(insurance.companionsCount) || 1)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-ink-800 border border-ink-600 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-600 flex-shrink-0">
          <div className="flex-1">
            <h3 className="font-display font-bold text-white">Datos para el seguro</h3>
            <p className="text-xs text-muted">Stand {reservation.standName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition"><X size={20}/></button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-muted text-sm">Cargando...</div>
        ) : done ? (
          <div className="px-6 py-10 text-center space-y-4">
            <p className="text-white font-semibold">¡Datos guardados!</p>
            <button onClick={onClose} className="w-full bg-ink-700 hover:bg-ink-600 text-white font-semibold py-3 rounded-xl transition">Cerrar</button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <p className="text-xs text-muted">Completá los datos reales de quien esté a cargo del stand y, si corresponde, de un acompañante.</p>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Titular del stand</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required placeholder="Nombre *" value={insurance.titularFirstName} onChange={e => setIns('titularFirstName', e.target.value)}
                    className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                  <input type="text" required placeholder="Apellido *" value={insurance.titularLastName} onChange={e => setIns('titularLastName', e.target.value)}
                    className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                </div>
                <input type="text" required placeholder="DNI *" value={insurance.titularDni} onChange={e => setIns('titularDni', e.target.value)}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                <div>
                  <label className="block text-xs text-muted mb-1">Fecha de nacimiento *</label>
                  <input type="date" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={insurance.titularBirthDate} onChange={e => setIns('titularBirthDate', e.target.value)}
                    className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">¿Va a haber acompañante(s) en el stand?</label>
                <div className="flex gap-3">
                  {['no','si'].map(v => (
                    <label key={v} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer transition ${insurance.hasCompanions===v?'border-accent bg-accent/10 text-accent-soft':'border-ink-600 text-muted hover:bg-ink-700'}`}>
                      <input type="radio" name="hasCompanions" value={v} checked={insurance.hasCompanions===v} onChange={() => setIns('hasCompanions', v)} className="sr-only"/>
                      {v === 'si' ? 'Sí' : 'No'}
                    </label>
                  ))}
                </div>
              </div>

              {insurance.hasCompanions === 'si' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">¿Cuántos acompañantes?</label>
                    <input type="number" min="1" max="20" value={insurance.companionsCount}
                      onChange={e => setIns('companionsCount', e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={e => setIns('companionsCount', Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                  </div>

                  {companionsCount > 1 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm px-4 py-3 rounded-xl">
                      Tenés más de un acompañante. Acá podés cargar los datos de uno; para el resto y su pago del seguro, comunicate con la organización del evento.
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white">Acompañante 1</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" required placeholder="Nombre *" value={insurance.companionFirstName} onChange={e => setIns('companionFirstName', e.target.value)}
                        className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                      <input type="text" required placeholder="Apellido *" value={insurance.companionLastName} onChange={e => setIns('companionLastName', e.target.value)}
                        className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                    </div>
                    <input type="text" required placeholder="DNI *" value={insurance.companionDni} onChange={e => setIns('companionDni', e.target.value)}
                      className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                    <div>
                      <label className="block text-xs text-muted mb-1">Fecha de nacimiento *</label>
                      <input type="date" required min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={insurance.companionBirthDate} onChange={e => setIns('companionBirthDate', e.target.value)}
                        className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
                    </div>
                  </div>
                </>
              )}
            </form>

            <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t border-ink-600">
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                {submitting ? 'Guardando...' : 'Guardar datos de seguro'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
