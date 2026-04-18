import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import {
  LayoutDashboard, Users, Calendar, Tag, LogOut,
  CheckCircle, XCircle, Clock, TrendingUp, Download,
  Plus, Edit2, Trash2, Eye, Filter, Map, MessageCircle
} from 'lucide-react'

const STATUS_LABELS = { pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado', reserved:'Reservado' }
const STATUS_STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  paid:      'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
  reserved:  'bg-blue-50 text-blue-700 border border-blue-200',
}

function exportCSV(reservations, events, users, stands, categories) {
  const header = ['Evento','Stand','Nombre Stand','Nombre','Apellido','Email','Teléfono','Categoría','Compartido','Comparte con','Instagram','Importe','Estado']
  const rows = reservations.map(r => {
    const ev = events.find(e => e.id === r.eventId)
    const st = ev?.stands.find(s => s.id === r.standId)
    const user = users.find(u => u.id === r.userId)
    const cat = categories.find(c => c.id === r.categoryId)
    return [
      ev?.name ?? '', st?.number ?? r.standId, r.standName,
      user?.name ?? '', user?.lastName ?? '', user?.email ?? '', user?.phone ?? '',
      cat?.name ?? '', r.shared ? 'Sí' : 'No', r.sharedWith ?? '', r.instagram ?? '',
      r.amount, STATUS_LABELS[r.status] ?? r.status,
    ]
  })
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'reservas.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { events, reservations, users, categories, currentUser } = state
  const [tab, setTab] = useState('dashboard')
  const [filterEventId, setFilterEventId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [catForm, setCatForm] = useState({ name: '', color: '#3B82F6' })
  const [editingCat, setEditingCat] = useState(null)

  const allStands = events.flatMap(e => e.stands)
  const totalAvailable = allStands.filter(s => s.status === 'available').length
  const totalPending = reservations.filter(r => r.status === 'pending').length
  const totalPaid = reservations.filter(r => r.status === 'paid').length
  const totalRevenue = reservations.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0)

  const filteredRes = reservations.filter(r => {
    if (filterEventId !== 'all' && r.eventId !== filterEventId) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCategory !== 'all' && r.categoryId !== filterCategory) return false
    return true
  })

  function getEvent(id) { return events.find(e => e.id === id) }
  function getStand(eventId, standId) { return getEvent(eventId)?.stands.find(s => s.id === standId) }
  function getUser(id) { return users.find(u => u.id === id) }

  function handleStatusChange(resId, newStatus) {
    dispatch({ type: 'UPDATE_RESERVATION_STATUS', id: resId, status: newStatus })
  }

  function handleAddCategory() {
    if (!catForm.name.trim()) return
    dispatch({ type: 'ADD_CATEGORY', category: { id: 'cat' + Date.now(), ...catForm } })
    setCatForm({ name: '', color: '#3B82F6' })
  }

  function handleSaveCat() {
    dispatch({ type: 'UPDATE_CATEGORY', category: editingCat })
    setEditingCat(null)
  }

  const TABS = [
    { id:'dashboard', label:'Dashboard', icon: LayoutDashboard },
    { id:'reservations', label:'Reservas', icon: Calendar },
    { id:'categories', label:'Categorías', icon: Tag },
    { id:'users', label:'Usuarios', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <LayoutDashboard size={16}/>
            </div>
            <span className="font-bold text-lg">Panel Administrador</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/events')}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <Eye size={14}/> Ver eventos
            </button>
            <button onClick={() => { dispatch({ type:'LOGOUT' }); navigate('/') }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <LogOut size={14}/> Salir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition whitespace-nowrap ${tab===t.id ? 'bg-gray-50 text-violet-700' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              <t.icon size={14}/>{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Pendientes', value: totalPending, icon: Clock, color:'text-yellow-600 bg-yellow-50' },
                { label:'Pagados', value: totalPaid, icon: CheckCircle, color:'text-green-600 bg-green-50' },
                { label:'Disponibles', value: totalAvailable, icon: Map, color:'text-blue-600 bg-blue-50' },
                { label:'Recaudado', value: `$${totalRevenue.toLocaleString('es-AR')}`, icon: TrendingUp, color:'text-violet-600 bg-violet-50' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-5">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                    <stat.icon size={20}/>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Category distribution */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-800 mb-4">Distribución por categoría</h3>
              <div className="space-y-3">
                {categories.map(cat => {
                  const count = reservations.filter(r => r.categoryId === cat.id).length
                  const total = reservations.length || 1
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="text-gray-500">{count} reservas</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{width: `${(count/total)*100}%`, background: cat.color}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Events summary */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-800 mb-4">Resumen por evento</h3>
              <div className="space-y-3">
                {events.map(ev => {
                  const evRes = reservations.filter(r => r.eventId === ev.id)
                  return (
                    <div key={ev.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{ev.name}</p>
                        <p className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString('es-AR')}</p>
                      </div>
                      <div className="flex gap-3 text-xs text-right">
                        <span className="text-yellow-600">{evRes.filter(r=>r.status==='pending').length} pend.</span>
                        <span className="text-green-600">{evRes.filter(r=>r.status==='paid').length} pag.</span>
                        <button onClick={() => navigate(`/events/${ev.id}/map`)}
                          className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg hover:bg-violet-200 transition">
                          Ver mapa
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Reservations ── */}
        {tab === 'reservations' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-wrap gap-3 items-center">
              <Filter size={16} className="text-gray-400"/>
              <select value={filterEventId} onChange={e => setFilterEventId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todos los eventos</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="all">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => exportCSV(filteredRes, events, users, allStands, categories)}
                className="ml-auto flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                <Download size={14}/> Exportar CSV
              </button>
            </div>

            <p className="text-sm text-gray-500">{filteredRes.length} reservas encontradas</p>

            <div className="space-y-3">
              {filteredRes.map(r => {
                const ev = getEvent(r.eventId)
                const stand = getStand(r.eventId, r.standId)
                const user = getUser(r.userId)
                const cat = categories.find(c => c.id === r.categoryId)
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{ev?.name}</p>
                        <p className="text-xs text-gray-400">Stand {stand?.number} — {r.standName}</p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Usuario</p>
                        <p className="font-medium">{user?.name} {user?.lastName}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Categoría</p>
                        {cat ? (
                          <p className="font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{background:cat.color}}/>
                            {cat.name}
                          </p>
                        ) : <p className="text-gray-400">—</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Importe</p>
                        <p className="font-bold text-violet-600">${r.amount.toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Compartido</p>
                        <p className="font-medium">{r.shared ? `Sí — ${r.sharedWith}` : 'No'}</p>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-2">
                      {r.status !== 'paid' && (
                        <button onClick={() => handleStatusChange(r.id, 'paid')}
                          className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition">
                          <CheckCircle size={12}/> Marcar pagado
                        </button>
                      )}
                      {r.status !== 'cancelled' && (
                        <button onClick={() => handleStatusChange(r.id, 'cancelled')}
                          className="flex items-center gap-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg transition">
                          <XCircle size={12}/> Cancelar
                        </button>
                      )}
                      {r.status === 'cancelled' && (
                        <button onClick={() => handleStatusChange(r.id, 'pending')}
                          className="flex items-center gap-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg transition">
                          <Clock size={12}/> Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {tab === 'categories' && (
          <div className="space-y-4 max-w-xl">
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h3 className="font-bold text-gray-800 mb-4">Agregar categoría</h3>
              <div className="flex gap-3">
                <input type="text" value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})}
                  placeholder="Nombre de categoría"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"/>
                <div className="flex items-center gap-2">
                  <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm,color:e.target.value})}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"/>
                </div>
                <button onClick={handleAddCategory}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1">
                  <Plus size={14}/> Agregar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border divide-y">
              {categories.map(cat => (
                <div key={cat.id} className="px-5 py-4 flex items-center justify-between">
                  {editingCat?.id === cat.id ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <input type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat,name:e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                      <input type="color" value={editingCat.color} onChange={e => setEditingCat({...editingCat,color:e.target.value})}
                        className="w-9 h-9 rounded-xl border cursor-pointer p-0.5"/>
                      <button onClick={handleSaveCat}
                        className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-green-600 transition">
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full" style={{background:cat.color}}/>
                      <span className="font-medium text-gray-800">{cat.name}</span>
                      <span className="text-xs text-gray-400">
                        {reservations.filter(r=>r.categoryId===cat.id).length} reservas
                      </span>
                    </div>
                  )}
                  {editingCat?.id !== cat.id && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingCat(cat)}
                        className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => dispatch({ type:'DELETE_CATEGORY', id:cat.id })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm border p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-bold text-violet-600">
                    {u.name[0]}{u.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.name} {u.lastName}</p>
                    <p className="text-sm text-gray-400">{u.email} • {u.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.role==='admin'?'bg-violet-100 text-violet-700':'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Expositor'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {reservations.filter(r=>r.userId===u.id).length} reservas
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
