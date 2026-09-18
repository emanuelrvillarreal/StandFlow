import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Camera, Instagram, Store, Zap } from 'lucide-react'

export default function ProfilePage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { currentUser } = state

  const [form, setForm] = useState({
    businessName: currentUser?.businessName || '',
    instagram: currentUser?.instagram || '',
    businessPhoto: currentUser?.businessPhoto || '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setForm(prev => ({ ...prev, businessPhoto: reader.result }))
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        business_name: form.businessName || null,
        instagram: form.instagram || null,
        business_photo: form.businessPhoto || null,
      })
      .eq('id', currentUser.id)

    setSaving(false)

    if (updateError) {
      setError(`No se pudo guardar: ${updateError.message}`)
      return
    }

    dispatch({ type: 'SET_USER', user: { ...currentUser, ...form } })
    setMessage('Perfil actualizado correctamente.')
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="bg-ink-900/90 backdrop-blur border-b border-ink-700 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-ink-500 hover:text-white transition">
            <ArrowLeft size={22} />
          </button>
          <span className="font-display font-bold text-white text-lg tracking-wide uppercase">Mi Perfil</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-ink-800 border border-ink-600 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-display font-semibold text-white mb-1">Datos de tu emprendimiento</h2>
            <p className="text-sm text-ink-500/80">Esto se va a mostrar cuando reserves un stand, para que los organizadores sepan quién sos.</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {message && <div className="bg-accent/10 border border-accent/30 text-accent-soft px-4 py-3 rounded-lg text-sm">{message}</div>}

          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-ink-900 border border-ink-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {form.businessPhoto ? (
                <img src={form.businessPhoto} alt="Foto del emprendimiento" className="w-full h-full object-cover" />
              ) : (
                <Store className="text-ink-500" size={32} />
              )}
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-700 hover:bg-ink-600 text-white text-sm font-medium cursor-pointer transition">
              <Camera size={16} />
              Subir foto
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-500/90 mb-1.5">
              <Zap size={14} /> Nombre del emprendimiento
            </label>
            <input type="text" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })}
              placeholder="Ej: Ropa Artesanal MJ"
              className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-500/90 mb-1.5">
              <Instagram size={14} /> Instagram
            </label>
            <input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })}
              placeholder="@tuemprendimiento"
              className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
