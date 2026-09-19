import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Sparkles, LogOut, Users as UsersIcon } from 'lucide-react'
import { useApp } from '../store'
import { formatEventDate } from '../lib/formatEventDate'
import { formatBirthDate } from '../lib/formatDateTime'

// Vista de solo consulta para el Sponsor: muestra lo que registró.
// La base solo le deja leer sus propios registros (no hay permiso de edición).
export default function SponsorPanelPage() {
  const { state, logout, refreshSponsors } = useApp()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  // Al abrir el panel se traen los registros al día (una recarga general que
  // venía en curso podía haberlos dejado vacíos).
  useEffect(() => {
    if (state.loading || !state.currentUser) return
    refreshSponsors().finally(() => setLoaded(true))
  }, [state.loading, state.currentUser?.id, refreshSponsors])
  const mine = (state.sponsorRegistrations || []).filter(r => r.userId === state.currentUser?.id)

  return (
    <div className="min-h-screen bg-ink-950 p-4 relative overflow-hidden">
      <div aria-hidden="true" className="ambient-blob ambient-b -top-32 -right-24 w-[30rem] h-[30rem]" />
      <div className="w-full max-w-lg mx-auto relative py-6">
        <div className="anim-rise flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ink-800 border border-accent/30 rounded-xl flex items-center justify-center bolt-pulse">
              <Zap className="text-accent" size={20} />
            </div>
            <h1 className="text-xl font-display font-bold text-white uppercase tracking-wide">Mi Sponsor</h1>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={async () => { await logout(); navigate('/login') }}
              className="text-muted hover:text-white bg-ink-800 border border-ink-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>

        {mine.length === 0 && !loaded ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>
        ) : mine.length === 0 ? (
          <div className="bg-ink-800/80 border border-ink-600 rounded-2xl p-8 text-center text-muted">
            <Sparkles className="mx-auto mb-3 text-amber-400" />
            <p className="mb-4">Todavía no tenés un registro de Sponsor.</p>
            <Link to="/sponsor" className="text-accent hover:text-accent-soft font-medium">Registrarme con un código</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mine.map((r, idx) => {
              const ev = state.events.find(e => e.id === r.eventId)
              const stand = ev?.stands.find(s => s.id === r.standId)
              return (
                <div key={r.id} style={{ "--i": idx + 1 }} className="anim-rise bg-ink-800/80 border border-ink-600 rounded-2xl p-6">
                  <p className="text-xs text-amber-300 font-semibold uppercase flex items-center gap-1.5 mb-1"><Sparkles size={12} /> Sponsor</p>
                  <h2 className="font-display font-bold text-white text-xl leading-tight">{ev?.name || 'Evento'}</h2>
                  {ev && <p className="text-xs text-muted mt-1">{formatEventDate(ev)}{ev.location ? ` · ${ev.location}` : ''}</p>}

                  <div className="bg-ink-900 border border-ink-600 rounded-xl p-4 mt-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted">Stand</span><span className="text-white font-medium">{stand?.number ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Costo</span><span className="text-amber-300 font-bold">Sin cargo</span></div>
                  </div>

                  <p className="text-xs font-bold text-muted uppercase mt-5 mb-2 flex items-center gap-1.5">
                    <UsersIcon size={12} /> Integrantes ({r.members.length})
                  </p>
                  <div className="space-y-2">
                    {r.members.map(m => (
                      <div key={m.id} className="bg-ink-900 border border-ink-600 rounded-xl px-4 py-3 text-sm">
                        <p className="text-white font-medium">{m.firstName} {m.lastName}</p>
                        <p className="text-muted text-xs mt-0.5">DNI {m.dni} · {m.phone} · {m.email}{m.birthDate ? ` · Nac. ${formatBirthDate(m.birthDate)}` : ''}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted mt-4">Solo consulta. Para cambiar algún dato, contactá a la organización del evento.</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
