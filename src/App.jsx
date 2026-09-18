import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './store'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
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

export default function App() {
  const { state } = useApp()
  const isAdmin = state.currentUser?.role === 'admin' || state.currentUser?.role_id === 1

  return (
    <Routes>
      <Route path="/" element={state.loading ? <LoadingScreen/> : <Navigate to={isAdmin ? '/admin' : '/events'}/>} />
      <Route path="/login" element={!state.loading && state.currentUser ? <Navigate to={isAdmin ? '/admin' : '/events'}/> : <LoginPage/>} />
      <Route path="/register" element={<RegisterPage/>} />
      <Route path="/reset-password" element={<ResetPasswordPage/>} />
      <Route path="/events" element={<EventsPage/>} />
      <Route path="/events/:eventId/map" element={<RequireAuth><MapPage/></RequireAuth>} />
      <Route path="/my-reservations" element={<RequireAuth exhibitorOnly><MyReservationsPage/></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth exhibitorOnly><ProfilePage/></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth adminOnly><AdminPage/></RequireAuth>} />
      <Route path="*" element={<Navigate to="/"/>} />
    </Routes>
  )
}
