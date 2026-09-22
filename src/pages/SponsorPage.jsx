import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft, KeyRound, CheckCircle, Plus, Trash2, Sparkles, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store'
import { formatEventDate } from '../lib/formatEventDate'
import BrandFooter from '../components/BrandFooter'

const inputCls = 'w-full px-4 py-3 bg-ink-900 border border-ink-600 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition'
const emptyMember = () => ({ firstName: '', lastName: '', dni: '', phone: '', email: '', birthDate: '' })

function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function SponsorPage() {
  const { state, refreshSponsors } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState('code') // code | stand | members | done
  const [code, setCode] = useState('')
  const [info, setInfo] = useState(null)
  const [standId, setStandId] = useState(null)
  const [members, setMembers] = useState([emptyMember()])
  const [account, setAccount] = useState({ email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [result, setResult] = useState(null)

  const loggedIn = !!state.currentUser
  const isAdminUser = state.currentUser?.role_id === 1
  const isExhibitorUser = loggedIn && !isAdminUser && (
    state.reservations.some(r => r.userId === state.currentUser.id) ||
    (state.eventRequests || []).some(r => r.userId === state.currentUser.id)
  )
  const wrongAccount = isAdminUser || isExhibitorUser
  const stand = info?.stands.find(s => s.id === standId)

  async function lookup(currentCode) {
    const { data, error: rpcError } = await supabase.rpc('sponsor_lookup', { p_code: currentCode })
    if (rpcError) return { error: rpcError.message }
    return { data }
  }

  async function handleCode(e) {
    e.preventDefault()
    setError('')
    if (!code.trim()) { setError('Ingresá el código de Sponsor.'); return }
    if (wrongAccount) { setError('Cerrá sesión y usá una cuenta nueva para registrarte como Sponsor.'); return }
    setBusy(true)
    const { data, error: lookupError } = await lookup(code)
    setBusy(false)
    if (lookupError) { setError(lookupError); return }
    setInfo(data)
    setStandId(null)
    setStep('stand')
  }

  function handleStandNext() {
    setError('')
    if (!standId) { setError('Elegí un stand para continuar.'); return }
    setStep('members')
  }

  function updateMember(i, key, value) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: value } : m))
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setError('')

    for (const [i, m] of members.entries()) {
      if (!m.firstName.trim() || !m.lastName.trim() || !m.dni.trim() || !m.phone.trim() || !m.email.trim() || !m.birthDate) {
        setError(`Completá todos los datos del integrante ${i + 1}.`)
        return
      }
      if (m.birthDate > todayISO() || m.birthDate < '1900-01-01') {
        setError(`La fecha de nacimiento del integrante ${i + 1} no es válida.`)
        return
      }
    }
    if (!loggedIn) {
      if (!account.email.trim()) { setError('Ingresá el mail de tu cuenta.'); return }
      if (account.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
      if (account.password !== account.confirm) { setError('Las contraseñas no coinciden.'); return }
    }

    setBusy(true)

    // Sin sesión, primero se crea la cuenta del Sponsor (con los datos del primer integrante).
    if (!loggedIn) {
      const first = members[0]
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
        options: { data: { name: first.firstName, lastName: first.lastName, phone: first.phone } },
      })
      if (signUpError) {
        setBusy(false)
        setError(/registered|already/i.test(signUpError.message)
          ? 'Ese mail ya tiene una cuenta. Iniciá sesión y volvé a entrar con tu código.'
          : signUpError.message)
        return
      }
      if (!data.session) {
        setBusy(false)
        setError('Tu cuenta se creó, pero hay que confirmar el mail antes de continuar. Revisá tu casilla, iniciá sesión y volvé a entrar con tu código.')
        return
      }
      await supabase.from('profiles').upsert({
        id: data.user.id,
        first_name: first.firstName,
        last_name: first.lastName,
        email: account.email.trim(),
        phone: first.phone,
        role: 'user',
        role_id: 2,
      }, { onConflict: 'id' })
    }

    const { data, error: regError } = await supabase.rpc('register_sponsor', {
      p_code: code,
      p_stand_id: standId,
      p_members: members.map(m => ({
        first_name: m.firstName, last_name: m.lastName, dni: m.dni, phone: m.phone, email: m.email, birth_date: m.birthDate,
      })),
    })
    setBusy(false)

    if (regError) {
      // Si otro Sponsor se llevó el stand justo antes, volvemos a elegir con la lista al día.
      if (/ya no está disponible/i.test(regError.message)) {
        const { data: fresh } = await lookup(code)
        if (fresh) setInfo(fresh)
        setStandId(null)
        setStep('stand')
      }
      setError(regError.message)
      return
    }

    setResult(data)
    setStep('done')
    refreshSponsors?.()
  }

  const backTarget = { stand: 'code', members: 'stand' }[step]

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div aria-hidden="true" className="ambient-blob ambient-b -top-32 -right-24 w-[30rem] h-[30rem]" />
      <div aria-hidden="true" className="ambient-blob ambient-a -bottom-32 -left-24 w-[30rem] h-[30rem]" />

      <div className={`w-full relative my-6 transition-all ${step === "stand" ? "max-w-4xl" : "max-w-md"}`}>
        <div className="anim-rise text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ink-800 border border-accent/30 rounded-2xl mb-4 bolt-pulse">
            <Zap className="text-accent" size={30} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-wide text-white uppercase">Stands Flow</h1>
        </div>

        <div style={{ "--i": 1 }} className="anim-rise bg-ink-800/80 backdrop-blur border border-ink-600 rounded-2xl shadow-2xl p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            {step !== 'done' && (
              backTarget
                ? <button type="button" onClick={() => { setError(''); setStep(backTarget) }} className="text-muted hover:text-white transition"><ArrowLeft size={20} /></button>
                : <Link to="/login" className="text-muted hover:text-white transition"><ArrowLeft size={20} /></Link>
            )}
            <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" /> Registro de Sponsor
            </h2>
          </div>

          {error && <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {wrongAccount && step !== 'done' && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-lg mb-4 text-sm">
              Estás con una cuenta de {isAdminUser ? 'administrador' : 'expositor'}. Para registrarte como Sponsor cerrá sesión y usá otra cuenta (otro mail).
            </div>
          )}

          {step === 'code' && (
            <form onSubmit={handleCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Código de Sponsor</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="text" value={code} autoFocus autoComplete="off"
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className={`${inputCls} pl-11 font-mono tracking-wider`} placeholder="Ej: SP-XXXXXXXX" />
                </div>
                <p className="text-xs text-muted mt-2">
                  Si no tenés un código de Sponsor, solicitá el código a la organización del evento.
                </p>
              </div>
              <button type="submit" disabled={busy}
                className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                {busy ? 'Validando...' : 'Continuar'}
              </button>
            </form>
          )}

          {step === 'stand' && info && (
            <div className="space-y-4">
              <div className="bg-ink-900 border border-ink-600 rounded-xl p-4">
                <p className="text-xs text-muted">Evento</p>
                <p className="font-display font-bold text-white text-lg leading-tight">{info.event_name}</p>
                <p className="text-xs text-muted mt-1">
                  {formatEventDate({ date: info.date, endDate: info.end_date })}{info.location ? ` · ${info.location}` : ''}
                </p>
              </div>

              {info.sponsor_image && (
                <div className="rounded-xl border border-ink-600 overflow-x-auto" data-sponsor-map>
                  <div className="relative min-w-[680px] sm:min-w-0">
                  <img src={info.sponsor_image} alt="Mapa de Sponsors" className="w-full h-auto block select-none" draggable={false} />
                  {info.stands.map(s => {
                    const free = s.status === 'available'
                    const selected = s.id === standId
                    return (
                      <button key={s.id} type="button" disabled={!free}
                        onClick={() => setStandId(s.id)}
                        title={free ? `Stand ${s.number}` : `Stand ${s.number} (ocupado)`}
                        style={{ left: `${s.x}%`, top: `${s.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white text-[11px] sm:text-sm font-bold text-white shadow-lg transition ${
                          selected ? 'bg-accent !text-ink-950 scale-125 ring-4 ring-accent/40'
                            : free ? 'bg-amber-500 hover:scale-110'
                            : 'bg-red-500 opacity-70 cursor-not-allowed'}`}>
                        {s.number}
                      </button>
                    )
                  })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted mb-2">Elegí tu stand</p>
                {info.sponsor_image && <p className="text-[11px] text-muted mb-2 sm:hidden">Deslizá el mapa para verlo completo.</p>}
                {info.stands.length === 0 ? (
                  <p className="text-sm text-muted bg-ink-900 border border-ink-600 rounded-xl p-4">
                    La organización todavía no asignó stands para Sponsors en este evento.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {info.stands.map(s => {
                      const free = s.status === 'available'
                      const selected = s.id === standId
                      return (
                        <button key={s.id} type="button" disabled={!free}
                          data-stand={s.number}
                          onClick={() => setStandId(s.id)}
                          title={free ? `Stand ${s.number} (${s.sector})` : 'Ocupado'}
                          className={`min-w-[52px] px-3 py-2 rounded-xl border text-sm font-bold transition ${
                            selected ? 'bg-accent text-ink-950 border-accent shadow-glow'
                              : free ? 'bg-ink-900 border-ink-600 text-white hover:border-accent/60'
                              : 'bg-ink-900 border-ink-700 text-muted opacity-40 line-through cursor-not-allowed'}`}>
                          {s.number}
                        </button>
                      )
                    })}
                  </div>
                )}
                {info.stands.length > 0 && !info.stands.some(s => s.status === 'available') && (
                  <p className="text-xs text-yellow-300 mt-3">Todos los stands de Sponsors ya están ocupados.</p>
                )}
              </div>

              <button type="button" onClick={handleStandNext}
                className="w-full bg-accent hover:bg-accent-soft text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                Continuar
              </button>
            </div>
          )}

          {step === 'members' && info && (
            <form onSubmit={handleConfirm} className="space-y-5">
              <div className="bg-ink-900 border border-ink-600 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted">Evento</span><span className="text-white font-medium text-right">{info.event_name}</span></div>
                <div className="flex justify-between"><span className="text-muted">Stand</span><span className="text-white font-medium">{stand?.number}</span></div>
                <div className="flex justify-between"><span className="text-muted">Costo</span><span className="text-amber-300 font-bold">Sin cargo</span></div>
              </div>

              {!loggedIn && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted">Tu cuenta</p>
                  <input type="email" placeholder="Mail de la cuenta" value={account.email}
                    onChange={e => setAccount({ ...account, email: e.target.value })} className={inputCls} />
                  <div className="grid grid-cols-2 gap-3">
                    {[['password', 'Contraseña'], ['confirm', 'Repetir']].map(([key, label]) => (
                      <div key={key} className="relative">
                        <input type={showPass ? 'text' : 'password'} placeholder={label} value={account[key]}
                          onChange={e => setAccount({ ...account, [key]: e.target.value })}
                          autoComplete="new-password" className={`${inputCls} pr-11`} />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPass}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition">
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm font-medium text-muted">Integrantes</p>
                {members.map((m, i) => (
                  <div key={i} data-member={i} className="bg-ink-900 border border-ink-600 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted uppercase">Integrante {i + 1}</span>
                      {members.length > 1 && (
                        <button type="button" onClick={() => setMembers(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-300 transition" aria-label={`Quitar integrante ${i + 1}`}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Nombre" value={m.firstName} onChange={e => updateMember(i, 'firstName', e.target.value)} className={inputCls} />
                      <input type="text" placeholder="Apellido" value={m.lastName} onChange={e => updateMember(i, 'lastName', e.target.value)} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" inputMode="numeric" placeholder="DNI" value={m.dni} onChange={e => updateMember(i, 'dni', e.target.value)} className={inputCls} />
                      <input type="tel" placeholder="Teléfono" value={m.phone} onChange={e => updateMember(i, 'phone', e.target.value)} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1 ml-1">Fecha de nacimiento</label>
                        <input type="date" aria-label={`Fecha de nacimiento del integrante ${i + 1}`} value={m.birthDate}
                          min="1900-01-01" max={todayISO()}
                          onChange={e => updateMember(i, 'birthDate', e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-1 ml-1">Mail</label>
                        <input type="email" placeholder="Mail" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setMembers(prev => [...prev, emptyMember()])}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-ink-500 hover:border-accent/60 text-muted hover:text-accent-soft py-2.5 rounded-xl text-sm font-medium transition">
                  <Plus size={16} /> Agregar integrante
                </button>
              </div>

              <button type="submit" disabled={busy}
                className="w-full bg-accent hover:bg-accent-soft disabled:opacity-60 text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                {busy ? 'Registrando...' : 'Confirmar registro'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-accent" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white mb-1">¡Registro confirmado!</h3>
                <p className="text-muted text-sm">
                  Tu stand {stand?.number} en {result?.event_name || info?.event_name} quedó reservado. Sin costo.
                </p>
              </div>
              <p className="text-xs text-muted">Ya podés ingresar con tu mail y contraseña para consultar tu registro.</p>
              <button type="button" onClick={() => navigate('/sponsor/panel')}
                className="w-full bg-accent hover:bg-accent-soft text-ink-950 font-display font-bold py-3 rounded-xl transition shadow-glow">
                Ver mi registro
              </button>
            </div>
          )}

          {step !== 'done' && (
            <p className="text-center text-muted text-sm mt-6">
              <Link to="/login" className="text-accent font-medium hover:text-accent-soft transition">Volver a iniciar sesión</Link>
            </p>
          )}
        </div>
      </div>
      <BrandFooter className="absolute bottom-0 inset-x-0" />
    </div>
  )
}
