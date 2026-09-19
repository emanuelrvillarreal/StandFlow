import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './store'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SponsorPage from './pages/SponsorPage'
import SponsorPanelPage from './pages/SponsorPanelPage'
import EventsPage from './pages/EventsPage'
import MapPage from './pages/MapPage'
import MyReservationsPage from './pages/MyReservationsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )
}

// Una cuenta de Sponsor solo usa su panel: no navega eventos ni reserva como expositor.
function ExhibitorArea({ children }) {
  const { state } = useApp()
  if (state.loading) return <LoadingScreen />
  const isAdmin = state.currentUser?.role === 'admin' || state.currentUser?.role_id === 1
  const isSponsor = !isAdmin && !!state.currentUser &&
    (state.sponsorRegistrations || []).some(r => r.userId === state.currentUser.id)
  if (isSponsor) return <Navigate to="/sponsor/panel" replace />
  return children
}

function RequireAuth({ children, adminOnly = false, exhibitorOnly = false }) {
  const { state } = useApp()
  const location = useLocation()
  const isAdmin = state.currentUser?.role === 'admin' || state.currentUser?.role_id === 1

  // Mientras se restaura la sesión (ej: al entrar directo a una URL o
  // refrescar la página) no hay que decidir todavía: si redirigimos acá
  // en base al currentUser inicial (null), rebotamos a un usuario que en
  // realidad sí tiene sesión válida, apenas un instante antes de que
  // termine de cargar.
  if (state.loading) return <LoadingScreen />

  if (!state.currentUser) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/events" replace />
  // Mis reservas y Mi perfil son solo para expositores: el admin va a su panel.
  if (exhibitorOnly && isAdmin) return <Navigate to="/admin" replace />
  return children
}

// Solo en desarrollo (npm run dev): recuerda que local y producción comparten la misma base.
function DevBadge() {
  if (!import.meta.env.DEV) return null
  return (
    <div className="fixed bottom-2 left-2 z-[100] pointer-events-none text-[10px] font-mono px-2 py-1 rounded-md bg-red-500/90 text-white shadow">
      LOCAL · usa la base REAL
    </div>
  )
}

export default function App() {
  const { state } = useApp()
  const isAdmin = state.currentUser?.role === 'admin' || state.currentUser?.role_id === 1

  return (
    <>
    <DevBadge />
    <Routes>
      <Route path="/" element={state.loading ? <LoadingScreen/> : <Navigate to={isAdmin ? '/admin' : '/events'}/>} />
      <Route path="/login" element={!state.loading && state.currentUser ? <Navigate to={isAdmin ? '/admin' : '/events'}/> : <LoginPage/>} />
      <Route path="/register" element={<RegisterPage/>} />
      <Route path="/sponsor" element={<SponsorPage/>} />
      <Route path="/sponsor/panel" element={<RequireAuth><SponsorPanelPage/></RequireAuth>} />
      <Route path="/reset-password" element={<ResetPasswordPage/>} />
      <Route path="/events" element={<ExhibitorArea><EventsPage/></ExhibitorArea>} />
      <Route path="/events/:eventId/map" element={<RequireAuth><ExhibitorArea><MapPage/></ExhibitorArea></RequireAuth>} />
      <Route path="/my-reservations" element={<RequireAuth exhibitorOnly><ExhibitorArea><MyReservationsPage/></ExhibitorArea></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth exhibitorOnly><ExhibitorArea><ProfilePage/></ExhibitorArea></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth adminOnly><AdminPage/></RequireAuth>} />
      <Route path="*" element={<Navigate to="/"/>} />
    </Routes>
    </>
  )
}
