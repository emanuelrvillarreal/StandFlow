import { useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../store'
import { supabase } from '../lib/supabase'
import StandDot from '../components/StandDot'
import StandModal from '../components/StandModal'
import ReservationFlow from '../components/ReservationFlow'
import EditStandModal from '../components/EditStandModal'
import EventAccessGate from '../components/EventAccessGate'
import { getEventAccess } from '../lib/eventAccess'
import { ArrowLeft, Edit3, Plus, Layers, Info } from 'lucide-react'

const STATUS_LABELS = { available:'Disponible', pending:'Pendiente', reserved:'Reservado', blocked:'Bloqueado' }
const STATUS_COLORS = { available:'#22c55e', pending:'#eab308', reserved:'#ef4444', blocked:'#9ca3af' }

function toStandRow(stand, eventId) {
  return {
    id: stand.id,
    event_id: eventId,
    number: stand.number,
    sector: stand.sector,
    x: stand.x,
    y: stand.y,
    price: stand.price,
    status: stand.status,
    category_id: stand.categoryId || null,
  }
}

function createUuid() {
  return crypto.randomUUID()
}

export default function MapPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
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

  if (!event) return <div className="min-h-screen bg-ink-950 text-muted p-8 text-center">Evento no encontrado.</div>

  // Evento con confirmación: solo entran los aprobados (y el admin).
  const access = getEventAccess({ event, user: currentUser, requests: state.eventRequests, reservations: state.reservations })
  if (access.status !== 'open' && access.status !== 'approved') {
    return <EventAccessGate event={event} access={access} />
  }

  const isAdmin = currentUser?.role_id === 1
  // Cupo: cada expositor tiene 1 stand por evento salvo que el admin le dé más.
  const ACTIVE_STATUSES = ['pending', 'deposit_paid', 'paid', 'reserved']
  const quota = currentUser?.maxStands || 1
  const usedStands = currentUser
    ? state.reservations.filter(r => r.userId === currentUser.id && r.eventId === event.id && ACTIVE_STATUSES.includes(r.status)).length
    : 0
  const quotaReached = !!currentUser && !isAdmin && usedStands >= quota
  const stands = event.stands.filter(s => s.sector === sector)
  const filteredStands = filterStatus === 'all' ? stands : stands.filter(s => s.status === filterStatus)

  // Sponsors es un mapa aparte: solo lo ve el admin (para armarlo). Los expositores
  // no lo ven ni pueden reservar ahí (la base tampoco les devuelve esos stands).
  const sectorTabs = ['salon', 'galeria', ...(isAdmin ? ['sponsor'] : [])]
  const SECTOR_LABELS = { salon: 'Salón', galeria: 'Galería', sponsor: 'Sponsors' }
  const mapSrc = sector === 'sponsor' ? event.sponsors?.image : event.mapImage?.[sector]

  function handleStandClick(stand) {
    if (editMode) {
      setEditingStand(stand)
    } else {
      setSelectedStand(stand)
    }
  }

  async function handleDragEnd(standId, x, y) {
    const { error } = await supabase.from('stands').update({ x, y }).eq('id', standId)
    if (error) {
      alert(`No se pudo guardar la ubicación del stand: ${error.message}`)
      return
    }

    dispatch({ type: 'UPDATE_STAND', eventId: event.id, standId, updates: { x, y } })
  }

  async function handleEditSave(updatedStand) {
    if (!updatedStand.id) {
      const newStand = {
        ...updatedStand,
        id: createUuid(),
        // El sector lo elige el formulario; si no, el del mapa que se está viendo.
        sector: updatedStand.sector || sector,
      }
      newStand.isSponsor = newStand.sector === 'sponsor'

      const { error } = await supabase.from('stands').insert(toStandRow(newStand, event.id))
      if (error) {
        alert(`No se pudo guardar el stand en la base de datos: ${error.message}`)
        return
      }

      dispatch({ type: 'ADD_STAND', eventId: event.id, stand: newStand })
    } else {
      const { error } = await supabase
        .from('stands')
        .update(toStandRow(updatedStand, event.id))
        .eq('id', updatedStand.id)

      if (error) {
        alert(`No se pudo actualizar el stand en la base de datos: ${error.message}`)
        return
      }

      dispatch({ type: 'UPDATE_STAND', eventId: event.id, standId: updatedStand.id, updates: { ...updatedStand, isSponsor: updatedStand.sector === 'sponsor' } })
    }
    setEditingStand(null)
  }

  async function handleDelete(standId) {
    const { error } = await supabase.from('stands').delete().eq('id', standId)
    if (error) {
      alert(`No se pudo eliminar el stand de la base de datos: ${error.message}`)
      return
    }

    dispatch({ type: 'DELETE_STAND', eventId: event.id, standId })
    setEditingStand(null)
  }

  // Los stands de Sponsors no cuentan: no se reservan como los de expositores.
  const exhibitorStands = event.stands.filter(s => s.sector !== 'sponsor')
  const stats = {
    available: exhibitorStands.filter(s=>s.status==='available').length,
    pending:   exhibitorStands.filter(s=>s.status==='pending').length,
    reserved:  exhibitorStands.filter(s=>s.status==='reserved').length,
    blocked:   exhibitorStands.filter(s=>s.status==='blocked').length,
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      {/* Header */}
      <div className="bg-ink-900/90 backdrop-blur border-b border-ink-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-muted hover:text-white transition">
            <ArrowLeft size={22}/>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-white truncate">{event.name}</h1>
            <p className="text-xs text-muted">Seleccioná un stand para reservar</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => { setEditMode(!editMode); setSelectedStand(null) }}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition ${editMode ? 'bg-amber-500 text-ink-950' : 'bg-ink-700 text-muted hover:bg-ink-600'}`}>
                  <Edit3 size={15}/>
                  <span className="hidden sm:inline">{editMode ? 'Editando' : 'Modo edición'}</span>
                </button>
                {editMode && (
                  <button
                    onClick={() => setEditingStand({ sector })}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl bg-accent text-ink-950 hover:bg-accent-soft transition">
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
          {sectorTabs.map(s => (
            <button key={s} onClick={() => setSector(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${sector===s?'bg-accent text-ink-950':'bg-ink-700 text-muted hover:bg-ink-600'}`}>
              <Layers size={13}/> {SECTOR_LABELS[s]}
            </button>
          ))}
          <button onClick={() => setShowCategories(!showCategories)}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${showCategories?'bg-accent/15 text-accent-soft border border-accent/30':'bg-ink-700 text-muted hover:bg-ink-600'}`}>
            <Info size={13}/> Leyenda
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-ink-900 border-b border-ink-700">
        <div className="max-w-5xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto">
          {Object.entries(stats).map(([key, count]) => (
            <button key={key} onClick={() => setFilterStatus(filterStatus===key?'all':key)}
              className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap px-2.5 py-1.5 rounded-full transition ${filterStatus===key?'ring-2 ring-offset-1 ring-offset-ink-900':'opacity-70 hover:opacity-100'}`}
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
          <div className="bg-ink-800 rounded-2xl border border-ink-600 p-4 mb-4">
            <h3 className="font-semibold text-white mb-3 text-sm">Categorías de stands</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat.id} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{background: cat.color + '20', color: cat.color}}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{background: cat.color}}/>
                  {cat.name}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium bg-ink-700 text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-ink-500"/>Sin categoría (por estado)
              </span>
            </div>
          </div>
        )}

        {quotaReached && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mb-4 text-sm text-accent-soft">
            Ya tenés {quota === 1 ? 'tu stand' : `tus ${usedStands} stands`} en este evento. {quota === 1 ? 'Cada expositor puede reservar un solo stand.' : `Podés reservar hasta ${quota}.`} Si necesitás más lugares, pedíselo a la organización.
          </div>
        )}

        {editMode && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 text-sm text-amber-300 flex items-center gap-2">
            <Edit3 size={15}/>
            <span><strong>Modo edición activo:</strong> Arrastrá los stands para reposicionarlos. Hacé click para editar propiedades.</span>
          </div>
        )}

        {/* Map */}
        <div className="anim-rise bg-ink-800 rounded-2xl border border-ink-600 overflow-hidden">
          <div className="map-container-wrapper w-full overflow-auto cursor-grab active:cursor-grabbing">
            <div className="map-container relative min-w-[700px] md:min-w-0 w-full" ref={mapRef}>
              {mapSrc ? (
                <img src={mapSrc} alt={`Plano ${sector}`} className="w-full h-auto block select-none" draggable={false}/>
              ) : (
                <div className="w-full min-h-[240px] flex items-center justify-center text-center text-sm text-muted px-6">
                  {isAdmin
                    ? 'Este sector todavía no tiene imagen. Subila desde Administrador > Eventos > Editar evento.'
                    : 'Este sector todavía no tiene mapa.'}
                </div>
              )}
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
          <div className="bg-ink-900 px-4 py-2 border-t border-ink-700 md:hidden flex items-center justify-center gap-2 text-[10px] text-muted">
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-ink-500 rounded-full"/> Deslizá para ver el mapa completo</div>
          </div>
        </div>

        {/* Stands list (mobile helper) */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filteredStands.map(stand => {
            const cat = categories.find(c => c.id === stand.categoryId)
            const color = stand.isSponsor && stand.status === 'available' ? '#f59e0b' : cat ? cat.color : STATUS_COLORS[stand.status]
            return (
              <button key={stand.id}
                onClick={() => handleStandClick(stand)}
                className="flex items-center gap-2 bg-ink-800 rounded-xl border border-ink-600 p-2 text-left hover:border-accent/50 transition">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{background: color}}>
                  <span className="text-white text-xs font-bold" style={{fontSize: stand.number.length > 2 ? 8 : 10}}>
                    {stand.number}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Stand {stand.number}</p>
                  <p className="text-xs text-muted">${stand.price.toLocaleString('es-AR')}</p>
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
          quotaReached={quotaReached}
          quota={quota}
          onClose={() => setSelectedStand(null)}
          onReserve={(s) => {
            setSelectedStand(null)
            if (!currentUser) {
              navigate('/login', { state: { from: location } })
              return
            }
            setReservingStand(s)
          }}
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
          stand={editingStand}
          categories={categories}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onClose={() => setEditingStand(null)}
        />
      )}
    </div>
  )
}
