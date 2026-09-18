import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { Eye, EyeOff, Store } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
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
      // El onAuthStateChange en el store se encargará de actualizar el usuario.
      // Aquí solo redirigimos.
      const { data: profile } = await supabase.from('profiles').select('role_id').eq('id', data.user.id).single()
      navigate(profile?.role_id === 1 ? '/admin' : '/events')
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Stands Flow</h1>
          <p className="text-gray-500 mt-1">Gestión y reserva de stands</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <button
                  type="button"
                  onClick={handlePasswordRecovery}
                  disabled={sendingRecovery}
                  className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-60"
                >
                  {sendingRecovery ? 'Enviando...' : 'Olvidé mi contraseña'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <button type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition">
              Ingresar
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-violet-600 font-medium hover:underline">Registrarse</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
