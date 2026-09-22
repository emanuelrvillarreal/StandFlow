import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BrandFooter from '../components/BrandFooter'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: form.password })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setMessage('Contraseña actualizada correctamente. Ya podés iniciar sesión.')
      supabase.auth.signOut()
      setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  const f = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) })

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div aria-hidden="true" className="ambient-blob ambient-a -top-32 -left-24 w-[30rem] h-[30rem]" />
      <div aria-hidden="true" className="ambient-blob ambient-b -bottom-32 -right-24 w-[30rem] h-[30rem]" />

      <div className="w-full max-w-md relative">
        <div className="anim-rise text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink-800 border border-accent/30 rounded-2xl mb-4 bolt-pulse">
            <Zap className="text-accent" size={30} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-wide text-white uppercase">Stands Flow</h1>
        </div>

        <div style={{ "--i": 1 }} className="anim-rise bg-ink-800/80 backdrop-blur border border-ink-600 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-center text-accent">
              <Lock size={20} />
            </div>
            <h2 className="text-xl font-display font-semibold text-white">Nueva contraseña</h2>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {message && <div className="bg-accent/10 border border-accent/30 text-accent-soft px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Contraseña nueva</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  {...f('password')}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent pr-12 transition"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition">
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                {...f('confirm')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow"
            >
              {saving ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
      <BrandFooter className="absolute bottom-0 inset-x-0" />
    </div>
  )
}
