import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import StandDot from '../components/StandDot'
import StandModal from '../components/StandModal'
import ReservationFlow from '../components/ReservationFlow'
import EditStandModal from '../components/EditStandModal'
import { ArrowLeft, Edit3, Plus, Eye, Layers, Info } from 'lucide-react'

const STATUS_LABELS = { available:'Disponible', pending:'Pendiente', reserved:'Reservado', blocked:'Bloqueado' }
const STATUS_COLORS = { available:'#22c55e', pending:'#eab308', reserved:'#ef4444', blocked:'#9ca3af' }

export default function MapPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const { events, categories, currentUser } = state
  const event = events.find(e => e.id === eventId)
  const mapRef = useRef(null)

  const [sector, setSector] = useState('salon')
  const [editMode, setEditMode] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [selectedStand, setSelectedStand] = useState(null)
  const [reservingStand, setReservingStand] = useState(null)
  const [editingStand, setEditingStand] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  if (!event) return <div className="p-8 text-center">Evento no encontrado.</div>

  const isAdmin = currentUser?.role === 'admin'
  const stands = event.stands.filter(s => s.sector === sector)
  const filteredStands = filterStatus === 'all' ? stands : stands.filter(s => s.status === filterStatus)

  const mapSrc = sector === 'salon' ? event.mapImage.salon : event.mapImage.galeria

  function handleStandClick(stand) {
    if (editMode) {
      setEditingStand(stand)
    } else {
      setSelectedStand(stand)
    }
  }

  function handleDragEnd(standId, x, y) {
    dispatch({ type: 'UPDATE_STAND', eventId: event.id, standId, updates: { x, y } })
  }

  function handleEditSave(updatedStand) {
    if (!updatedStand.id) {
      const newStand = {
        ...updatedStand,
        id: 'st' + Date.now(),
        sector,
      }
      dispatch({ type: 'ADD_STAND', eventId: event.id, stand: newStand })
    } else {
      dispatch({ type: 'UPDATE_STAND', eventId: event.id, standId: updatedStand.id, updates: updatedStand })
    }
    setEditingStand(null)
  }

  function handleDelete(standId) {
    dispatch({ type: 'DELETE_STAND', eventId: event.id, standId })
    setEditingStand(null)
  }

  const stats = {
    available: event.stands.filter(s=>s.status==='available').length,
    pending:   event.stands.filter(s=>s.status==='pending').length,
    reserved:  event.stands.filter(s=>s.status==='reserved').length,
    blocked:   event.stands.filter(s=>s.status==='blocked').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-gray-400 hover:text-gray-700 transition">
            <ArrowLeft size={22}/>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{event.name}</h1>
            <p className="text-xs text-gray-400">Seleccioná un stand para reservar</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => { setEditMode(!editMode); setSelectedStand(null) }}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition ${editMode ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  <Edit3 size={15}/>
                  <span className="hidden sm:inline">{editMode ? 'Editando' : 'Modo edición'}</span>
                </button>
                {editMode && (
                  <button
                    onClick={() => setEditingStand({})}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
                    <Plus size={15}/>
                    <span className="hidden sm:inline">Nuevo</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sector tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2">
          {['salon','galeria'].map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${sector===s?'bg-violet-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Layers size={13}/> {s === 'salon' ? 'Salón' : 'Galería'}
            </button>
          ))}
          <button onClick={() => setShowCategories(!showCategories)}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${showCategories?'bg-violet-100 text-violet-700':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Info size={13}/> Leyenda
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto">
          {Object.entries(stats).map(([key, count]) => (
            <button key={key} onClick={() => setFilterStatus(filterStatus===key?'all':key)}
              className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap px-2.5 py-1.5 rounded-full transition ${filterStatus===key?'ring-2 ring-offset-1':'opacity-70 hover:opacity-100'}`}
              style={filterStatus===key?{background:STATUS_COLORS[key]+'20',color:STATUS_COLORS[key],ringColor:STATUS_COLORS[key]}:{color:STATUS_COLORS[key]}}>
              <span className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[key]}}/>
              {STATUS_LABELS[key]}: {count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {/* Category legend */}
        {showCategories && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Categorías de stands</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat.id} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{background: cat.color + '20', color: cat.color}}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{background: cat.color}}/>
                  {cat.name}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400"/>Sin categoría (por estado)
              </span>
            </div>
          </div>
        )}

        {editMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
            <Edit3 size={15}/>
            <span><strong>Modo edición activo:</strong> Arrastrá los stands para reposicionarlos. Hacé click para editar propiedades.</span>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="map-container w-full" ref={mapRef}>
            <img src={mapSrc} alt={`Plano ${sector}`} className="w-full h-auto block select-none" draggable={false}/>
            {filteredStands.map(stand => {
              const cat = categories.find(c => c.id === stand.categoryId)
              return (
                <StandDot key={stand.id}
                  stand={stand}
                  category={cat}
                  editMode={editMode}
                  onClick={handleStandClick}
                  onDragEnd={handleDragEnd}
                  mapRef={mapRef}
                />
              )
            })}
          </div>
        </div>

        {/* Stands list (mobile helper) */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filteredStands.map(stand => {
            const cat = categories.find(c => c.id === stand.categoryId)
            const color = cat ? cat.color : STATUS_COLORS[stand.status]
            return (
              <button key={stand.id}
                onClick={() => handleStandClick(stand)}
                className="flex items-center gap-2 bg-white rounded-xl border p-2 text-left hover:shadow-sm transition">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{background: color}}>
                  <span className="text-white text-xs font-bold" style={{fontSize: stand.number.length > 2 ? 8 : 10}}>
                    {stand.number}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">Stand {stand.number}</p>
                  <p className="text-xs text-gray-400">${stand.price.toLocaleString('es-AR')}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stand info modal */}
      {selectedStand && !editMode && (
        <StandModal
          stand={selectedStand}
          category={categories.find(c => c.id === selectedStand.categoryId)}
          event={event}
          onClose={() => setSelectedStand(null)}
          onReserve={(s) => { setSelectedStand(null); setReservingStand(s) }}
        />
      )}

      {/* Reservation flow */}
      {reservingStand && (
        <ReservationFlow
          stand={reservingStand}
          event={event}
          onClose={() => setReservingStand(null)}
        />
      )}

      {/* Edit stand modal */}
      {editingStand !== null && (
        <EditStandModal
          stand={editingStand.id ? editingStand : null}
          categories={categories}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onClose={() => setEditingStand(null)}
        />
      )}
    </div>
  )
}
