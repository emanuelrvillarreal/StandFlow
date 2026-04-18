import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './store'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EventsPage from './pages/EventsPage'
import MapPage from './pages/MapPage'
import MyReservationsPage from './pages/MyReservationsPage'
import AdminPage from './pages/AdminPage'

function RequireAuth({ children, adminOnly = false }) {
  const { state } = useApp()
  const location = useLocation()
  if (!state.currentUser) return <Navigate to="/" state={{ from: location }} replace />
  if (adminOnly && state.currentUser.role !== 'admin') return <Navigate to="/events" replace />
  return children
}

export default function App() {
  const { state } = useApp()
  return (
    <Routes>
      <Route path="/" element={state.currentUser ? <Navigate to={state.currentUser.role==='admin'?'/admin':'/events'}/> : <LoginPage/>} />
      <Route path="/register" element={<RegisterPage/>} />
      <Route path="/events" element={<RequireAuth><EventsPage/></RequireAuth>} />
      <Route path="/events/:eventId/map" element={<RequireAuth><MapPage/></RequireAuth>} />
      <Route path="/my-reservations" element={<RequireAuth><MyReservationsPage/></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth adminOnly><AdminPage/></RequireAuth>} />
      <Route path="*" element={<Navigate to="/"/>} />
    </Routes>
  )
}
