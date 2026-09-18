import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', lastName: '', businessName: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          lastName: form.lastName,
          businessName: form.businessName,
          phone: form.phone
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        first_name: form.name,
        last_name: form.lastName,
        business_name: form.businessName || null,
        email: form.email,
        phone: form.phone,
        role: 'user',
        role_id: 2
      }, { onConflict: 'id' })
      navigate('/events')
    }
  }

  const f = (k) => ({ value: form[k], onChange: e => setForm({ ...form, [k]: e.target.value }) })

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-accent2/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-accent/20 blur-[120px]" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink-800 border border-accent/30 rounded-2xl mb-4 shadow-glow">
            <Zap className="text-accent" size={30} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-wide text-white uppercase">Stands Flow</h1>
        </div>

        <div className="bg-ink-800/80 backdrop-blur border border-ink-600 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/login" className="text-muted hover:text-white transition"><ArrowLeft size={20} /></Link>
            <h2 className="text-xl font-display font-semibold text-white">Crear cuenta</h2>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Nombre</label>
                <input type="text" required {...f('name')}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="Juan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Apellido</label>
                <input type="text" required {...f('lastName')}
                  className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="Pérez" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Nombre del emprendimiento</label>
              <input type="text" {...f('businessName')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="Ej: Ropa Artesanal MJ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Email</label>
              <input type="email" required {...f('email')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Teléfono</label>
              <input type="tel" required {...f('phone')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="11 1234-5678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Contraseña</label>
              <input type="password" required {...f('password')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Confirmar contraseña</label>
              <input type="password" required {...f('confirm')}
                className="w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition" placeholder="••••••••" />
            </div>
            <button type="submit"
              className="w-full bg-accent hover:bg-accent-soft text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
              Crear cuenta
            </button>
          </form>
          <p className="text-center text-muted text-sm mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-accent font-medium hover:text-accent-soft transition">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
