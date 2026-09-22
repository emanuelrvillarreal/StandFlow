import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BrandFooter from '../components/BrandFooter'

export default function LoginPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sendingRecovery, setSendingRecovery] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    })

    if (loginError) {
      setError('Email o contraseña incorrectos')
      return
    }

    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role_id, is_blocked').eq('id', data.user.id).single()

      if (profile?.role_id === -1 || profile?.is_blocked) {
        await supabase.auth.signOut()
        setError('Tu cuenta no está habilitada. Contactá al organizador del evento.')
        return
      }

      // Un Sponsor (tiene un registro propio) entra directo a su vista de consulta.
      const { count: sponsorCount } = await supabase
        .from('sponsor_registrations').select('id', { count: 'exact', head: true }).eq('user_id', data.user.id)

      const from = location.state?.from?.pathname
      navigate(profile?.role_id === 1 ? '/admin' : from || (sponsorCount > 0 ? '/sponsor/panel' : '/events'))
    }
  }

  async function handlePasswordRecovery() {
    setError('')
    setMessage('')

    if (!form.email.trim()) {
      setError('Ingresá tu email para recuperar la contraseña')
      return
    }

    setSendingRecovery(true)
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    })
    setSendingRecovery(false)

    if (recoveryError) {
      setError(recoveryError.message)
      return
    }

    setMessage('Te enviamos un email para recuperar tu contraseña.')
  }

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
          <p className="text-muted text-sm mt-1">Gestión y reserva de stands</p>
        </div>

        <div style={{ "--i": 1 }} className="anim-rise bg-ink-800/80 backdrop-blur border border-ink-600 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-display font-semibold text-white mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-accent/10 border border-accent/30 text-accent-soft px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input
                type="email" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-muted">Contraseña</label>
                <button
                  type="button"
                  onClick={handlePasswordRecovery}
                  disabled={sendingRecovery}
                  className="text-xs font-medium text-accent hover:text-accent-soft disabled:opacity-60 transition"
                >
                  {sendingRecovery ? 'Enviando...' : 'Olvidé mi contraseña'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent pr-12 transition"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit"
              className="w-full bg-accent hover:bg-accent-soft text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
              Ingresar
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-accent font-medium hover:text-accent-soft transition">Registrarse</Link>
          </p>
          <p className="text-center text-muted text-sm mt-3">
            ¿Sos Sponsor?{' '}
            <Link to="/sponsor" className="text-amber-400 font-medium hover:text-amber-300 transition">Registrate acá.</Link>
          </p>
          <p className="text-center text-muted text-xs mt-3">
            <Link to="/events" className="hover:text-muted transition">Ver eventos sin iniciar sesión</Link>
          </p>
        </div>
      </div>
      <BrandFooter className="absolute bottom-0 inset-x-0" />
    </div>
  )
}
