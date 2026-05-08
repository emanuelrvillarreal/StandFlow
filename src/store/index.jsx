import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Initial Data ────────────────────────────────────────────────────────────
const INITIAL_CATEGORIES = [
  { id: 'cat1', name: 'Comerciales', color: '#3B82F6' },
  { id: 'cat2', name: 'Gastronómicos', color: '#F97316' },
  { id: 'cat3', name: 'Ilustradores', color: '#8B5CF6' },
]

// Stand positions mapped from the floor plan images (% of image width/height)
const SALON_STANDS = [
  { id: 's1',  number: '1',  sector: 'salon', x: 92, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's2',  number: '2',  sector: 'salon', x: 88, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's3',  number: '3',  sector: 'salon', x: 82, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's4',  number: '4',  sector: 'salon', x: 76, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's5',  number: '5',  sector: 'salon', x: 70, y: 9,  price: 5000, status: 'reserved',  categoryId: 'cat1' },
  { id: 's6',  number: '6',  sector: 'salon', x: 64, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's7',  number: '7',  sector: 'salon', x: 58, y: 9,  price: 5000, status: 'available', categoryId: null },
  { id: 's8',  number: '8',  sector: 'salon', x: 51, y: 17, price: 5000, status: 'available', categoryId: null },
  { id: 's9',  number: '9',  sector: 'salon', x: 47, y: 22, price: 5000, status: 'available', categoryId: null },
  { id: 's10', number: '10', sector: 'salon', x: 43, y: 28, price: 5000, status: 'pending',   categoryId: 'cat2' },
  { id: 's11', number: '11', sector: 'salon', x: 35, y: 33, price: 5000, status: 'available', categoryId: null },
  { id: 's12', number: '12', sector: 'salon', x: 42, y: 33, price: 5000, status: 'available', categoryId: null },
  { id: 's13', number: '13', sector: 'salon', x: 48, y: 38, price: 5000, status: 'available', categoryId: null },
  { id: 's14', number: '14', sector: 'salon', x: 54, y: 32, price: 5000, status: 'available', categoryId: null },
  { id: 's15', number: '15', sector: 'salon', x: 60, y: 32, price: 5000, status: 'available', categoryId: null },
  { id: 's16', number: '16', sector: 'salon', x: 65, y: 38, price: 5000, status: 'available', categoryId: null },
  { id: 's17', number: '17', sector: 'salon', x: 54, y: 43, price: 5000, status: 'available', categoryId: null },
  { id: 's18', number: '18', sector: 'salon', x: 60, y: 43, price: 5000, status: 'available', categoryId: null },
  { id: 's19', number: '19', sector: 'salon', x: 47, y: 55, price: 5000, status: 'available', categoryId: null },
  { id: 's20', number: '20', sector: 'salon', x: 54, y: 53, price: 5000, status: 'available', categoryId: null },
  { id: 's21', number: '21', sector: 'salon', x: 60, y: 53, price: 5000, status: 'available', categoryId: null },
  { id: 's22', number: '22', sector: 'salon', x: 66, y: 53, price: 5000, status: 'blocked',   categoryId: null },
  { id: 's23', number: '23', sector: 'salon', x: 53, y: 62, price: 5000, status: 'available', categoryId: null },
  { id: 's24', number: '24', sector: 'salon', x: 59, y: 62, price: 5000, status: 'available', categoryId: null },
  { id: 's25', number: '25', sector: 'salon', x: 40, y: 78, price: 5000, status: 'available', categoryId: null },
  { id: 's26', number: '26', sector: 'salon', x: 46, y: 78, price: 5000, status: 'available', categoryId: null },
  { id: 's27', number: '27', sector: 'salon', x: 41, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 's28', number: '28', sector: 'salon', x: 47, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 's29', number: '29', sector: 'salon', x: 53, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 's30', number: '30', sector: 'salon', x: 59, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 's31', number: '31', sector: 'salon', x: 65, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 's32', number: '32', sector: 'salon', x: 71, y: 91, price: 5000, status: 'available', categoryId: null },
  { id: 'sJ',  number: 'J',  sector: 'salon', x: 77, y: 93, price: 5000, status: 'available', categoryId: null },
]

const GALERIA_STANDS = [
  { id: 'g33', number: '33', sector: 'galeria', x: 12, y: 91, price: 4500, status: 'available', categoryId: null },
  { id: 'g34', number: '34', sector: 'galeria', x: 12, y: 82, price: 4500, status: 'available', categoryId: null },
  { id: 'g35', number: '35', sector: 'galeria', x: 12, y: 74, price: 4500, status: 'available', categoryId: null },
  { id: 'g36', number: '36', sector: 'galeria', x: 12, y: 66, price: 4500, status: 'available', categoryId: null },
  { id: 'g37', number: '37', sector: 'galeria', x: 12, y: 59, price: 4500, status: 'available', categoryId: null },
  { id: 'g38', number: '38', sector: 'galeria', x: 12, y: 52, price: 4500, status: 'available', categoryId: null },
  { id: 'g39', number: '39', sector: 'galeria', x: 12, y: 45, price: 4500, status: 'available', categoryId: null },
  { id: 'g40', number: '40', sector: 'galeria', x: 12, y: 38, price: 4500, status: 'available', categoryId: null },
  { id: 'g41', number: '41', sector: 'galeria', x: 12, y: 31, price: 4500, status: 'pending',   categoryId: 'cat3' },
  { id: 'g80', number: '80', sector: 'galeria', x: 12, y: 25, price: 4500, status: 'available', categoryId: null },
  { id: 'g79', number: '79', sector: 'galeria', x: 12, y: 18, price: 4500, status: 'available', categoryId: null },
  { id: 'g70', number: '70', sector: 'galeria', x: 71, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g71', number: '71', sector: 'galeria', x: 66, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g72', number: '72', sector: 'galeria', x: 61, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g73', number: '73', sector: 'galeria', x: 56, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g74', number: '74', sector: 'galeria', x: 51, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g75', number: '75', sector: 'galeria', x: 46, y: 24, price: 4500, status: 'reserved',  categoryId: 'cat1' },
  { id: 'g76', number: '76', sector: 'galeria', x: 41, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g77', number: '77', sector: 'galeria', x: 36, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g78', number: '78', sector: 'galeria', x: 31, y: 24, price: 4500, status: 'available', categoryId: null },
  { id: 'g53', number: '53', sector: 'galeria', x: 12, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g54', number: '54', sector: 'galeria', x: 18, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g55', number: '55', sector: 'galeria', x: 24, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g56', number: '56', sector: 'galeria', x: 30, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g57', number: '57', sector: 'galeria', x: 36, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g58', number: '58', sector: 'galeria', x: 42, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g59', number: '59', sector: 'galeria', x: 48, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g60', number: '60', sector: 'galeria', x: 54, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g61', number: '61', sector: 'galeria', x: 60, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g62', number: '62', sector: 'galeria', x: 66, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g63', number: '63', sector: 'galeria', x: 72, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g64', number: '64', sector: 'galeria', x: 78, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g65', number: '65', sector: 'galeria', x: 84, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g66', number: '66', sector: 'galeria', x: 88, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g67', number: '67', sector: 'galeria', x: 92, y: 12, price: 4500, status: 'available', categoryId: null },
  { id: 'g68', number: '68', sector: 'galeria', x: 88, y: 6,  price: 4500, status: 'available', categoryId: null },
  { id: 'g42', number: '42', sector: 'galeria', x: 84, y: 66, price: 4500, status: 'available', categoryId: null },
  { id: 'g43', number: '43', sector: 'galeria', x: 84, y: 56, price: 4500, status: 'available', categoryId: null },
  { id: 'g44', number: '44', sector: 'galeria', x: 84, y: 48, price: 4500, status: 'available', categoryId: null },
  { id: 'g45', number: '45', sector: 'galeria', x: 84, y: 40, price: 4500, status: 'available', categoryId: null },
  { id: 'g46', number: '46', sector: 'galeria', x: 84, y: 33, price: 4500, status: 'available', categoryId: null },
  { id: 'g47', number: '47', sector: 'galeria', x: 84, y: 25, price: 4500, status: 'available', categoryId: null },
  { id: 'g48', number: '48', sector: 'galeria', x: 90, y: 28, price: 4500, status: 'available', categoryId: null },
  { id: 'g49', number: '49', sector: 'galeria', x: 90, y: 37, price: 4500, status: 'available', categoryId: null },
  { id: 'g50', number: '50', sector: 'galeria', x: 90, y: 45, price: 4500, status: 'available', categoryId: null },
  { id: 'g51', number: '51', sector: 'galeria', x: 90, y: 53, price: 4500, status: 'available', categoryId: null },
  { id: 'g52', number: '52', sector: 'galeria', x: 90, y: 61, price: 4500, status: 'available', categoryId: null },
  { id: 'g81', number: '81', sector: 'galeria', x: 84, y: 74, price: 4500, status: 'available', categoryId: null },
  { id: 'g82', number: '82', sector: 'galeria', x: 84, y: 81, price: 4500, status: 'available', categoryId: null },
  { id: 'gg7', number: 'G7', sector: 'galeria', x: 84, y: 88, price: 4500, status: 'available', categoryId: null },
  { id: 'gg6', number: 'G6', sector: 'galeria', x: 84, y: 93, price: 4500, status: 'available', categoryId: null },
  { id: 'gg5', number: 'G5', sector: 'galeria', x: 90, y: 69, price: 4500, status: 'available', categoryId: null },
  { id: 'gg4', number: 'G4', sector: 'galeria', x: 90, y: 76, price: 4500, status: 'available', categoryId: null },
  { id: 'gg3', number: 'G3', sector: 'galeria', x: 90, y: 82, price: 4500, status: 'available', categoryId: null },
  { id: 'gg2', number: 'G2', sector: 'galeria', x: 90, y: 88, price: 4500, status: 'available', categoryId: null },
  { id: 'gg1', number: 'G1', sector: 'galeria', x: 90, y: 93, price: 4500, status: 'available', categoryId: null },
  { id: 'g69', number: '69', sector: 'galeria', x: 78, y: 24, price: 4500, status: 'available', categoryId: null },
]

const INITIAL_EVENTS = [
  {
    id: 'ev1',
    name: 'Feria de Arte y Diseño 2026',
    date: '2026-05-15',
    location: 'Centro Cultural San Martín',
    status: 'active',
    mapImage: { salon: '/maps/salon.jpeg', galeria: '/maps/galeria.jpeg' },
    whatsapp: '5491112345678',
    paymentInstructions: 'Transferir al CBU 0000-0000000000-0000. Alias: FERIA.ARTE.2026. Enviar comprobante por WhatsApp.',
    stands: [...SALON_STANDS, ...GALERIA_STANDS],
  },
  {
    id: 'ev2',
    name: 'Expo Ilustradores',
    date: '2026-07-20',
    location: 'Palais de Glace',
    status: 'upcoming',
    mapImage: { salon: '/maps/salon.jpeg', galeria: '/maps/galeria.jpeg' },
    whatsapp: '5491198765432',
    paymentInstructions: 'Transferir al CBU 1111-1111111111-1111. Alias: EXPO.ILUSTRADORES.',
    stands: SALON_STANDS.slice(0, 15).map(s => ({ ...s, id: 'ev2_' + s.id, status: 'available' })),
  },
]

const INITIAL_USERS = [
  { id: 'u1', name: 'Admin', lastName: 'Sistema', email: 'admin@stands.com', phone: '1100000000', password: 'admin123', role: 'admin' },
  { id: 'u2', name: 'Juan', lastName: 'Pérez', email: 'juan@test.com', phone: '1155551234', password: '123456', role: 'user' },
]

const INITIAL_RESERVATIONS = [
  {
    id: 'r1', eventId: 'ev1', standId: 's5', userId: 'u2',
    standName: 'Ropa Artesanal', shared: false, sharedWith: '', instagram: '',
    categoryId: 'cat1', status: 'reserved', amount: 5000,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'r2', eventId: 'ev1', standId: 'g75', userId: 'u2',
    standName: 'Joyería Única', shared: true, sharedWith: 'María García', instagram: '@mariag',
    categoryId: 'cat1', status: 'paid', amount: 4500,
    createdAt: '2026-04-11T14:00:00Z',
  },
  {
    id: 'r3', eventId: 'ev1', standId: 's10', userId: 'u2',
    standName: 'Empanadas Caseras', shared: false, sharedWith: '', instagram: '',
    categoryId: 'cat2', status: 'pending', amount: 5000,
    createdAt: '2026-04-12T09:00:00Z',
  },
  {
    id: 'r4', eventId: 'ev1', standId: 'g41', userId: 'u2',
    standName: 'Arte Digital', shared: false, sharedWith: '', instagram: '@artedigital',
    categoryId: 'cat3', status: 'pending', amount: 4500,
    createdAt: '2026-04-13T11:00:00Z',
  },
]

const INITIAL_SETTINGS = {
  whatsappNumber: '5491112345678',
  whatsappTemplate: `¡Hola! Quiero confirmar mi reserva:

📍 Evento: {evento}
🏷️ Stand: {stand_numero} - {stand_nombre}
📂 Categoría: {categoria}
💰 Importe: {importe}
👤 Nombre: {usuario_nombre}
📧 Email: {usuario_email}
📱 Teléfono: {usuario_telefono}
{compartido}
{instagram}

Adjunto el comprobante de pago.`
  ,
  whatsappPaidTemplate: `Hola {usuario_nombre}!
Te confirmamos que tu cupo ya quedÃ³ completo porque registramos el pago.

Evento: {evento}
Stand: {stand_numero} - {stand_nombre}
CategorÃ­a: {categoria}
Importe: {importe}

Muchas gracias.`
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.user }
    case 'LOGOUT':
      return { ...state, currentUser: null }
    case 'REGISTER':
      return { ...state, users: [...state.users, action.user], currentUser: action.user }
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] }
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.user.id ? action.user : u) }
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.id) }
    case 'ADD_RESERVATION':
      return {
        ...state,
        reservations: [...state.reservations, action.reservation],
        events: state.events.map(ev =>
          ev.id === action.reservation.eventId
            ? {
                ...ev,
                stands: ev.stands.map(st =>
                  st.id === action.reservation.standId ? { ...st, status: 'pending' } : st
                ),
              }
            : ev
        ),
      }
    case 'UPDATE_RESERVATION_STATUS': {
      const { id, status } = action
      const res = state.reservations.find(r => r.id === id)
      if (!res) return state
      let newStandStatus = (status === 'paid' || status === 'deposit_paid') ? 'reserved' : status === 'cancelled' ? 'available' : 'pending'
      return {
        ...state,
        reservations: state.reservations.map(r => r.id === id ? { ...r, status } : r),
        events: state.events.map(ev =>
          ev.id === res.eventId
            ? {
                ...ev,
                stands: ev.stands.map(st =>
                  st.id === res.standId ? { ...st, status: newStandStatus } : st
                ),
              }
            : ev
        ),
      }
    }
    case 'DELETE_RESERVATION': {
      const res = state.reservations.find(r => r.id === action.id)
      if (!res) return state

      return {
        ...state,
        reservations: state.reservations.filter(r => r.id !== action.id),
        events: state.events.map(ev =>
          ev.id === res.eventId
            ? {
                ...ev,
                stands: ev.stands.map(st =>
                  st.id === res.standId ? { ...st, status: 'available', categoryId: null } : st
                ),
              }
            : ev
        ),
      }
    }
    case 'UPDATE_STAND': {
      const { eventId, standId, updates } = action
      return {
        ...state,
        events: state.events.map(ev =>
          ev.id === eventId
            ? { ...ev, stands: ev.stands.map(st => st.id === standId ? { ...st, ...updates } : st) }
            : ev
        ),
      }
    }
    case 'ADD_STAND': {
      return {
        ...state,
        events: state.events.map(ev =>
          ev.id === action.eventId
            ? { ...ev, stands: [...ev.stands, action.stand] }
            : ev
        ),
      }
    }
    case 'DELETE_STAND': {
      return {
        ...state,
        events: state.events.map(ev =>
          ev.id === action.eventId
            ? { ...ev, stands: ev.stands.filter(st => st.id !== action.standId) }
            : ev
        ),
      }
    }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] }
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.category.id ? action.category : c) }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.id) }
    case 'BATCH_UPDATE_STANDS': {
      // Replace all stands of an event with the given array
      return {
        ...state,
        events: state.events.map(ev =>
          ev.id === action.eventId ? { ...ev, stands: action.stands } : ev
        ),
      }
    }
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event] }
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(ev => ev.id === action.event.id ? action.event : ev) }
    case 'UPDATE_EVENT_SETTINGS': {
      const { eventId, settings } = action
      return {
        ...state,
        events: state.events.map(ev =>
          ev.id === eventId ? { ...ev, ...settings } : ev
        ),
      }
    }
    case 'UPDATE_GLOBAL_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'SET_DATA':
      return { 
        ...state, 
        events: action.events, 
        categories: action.categories,
        reservations: action.reservations,
        expenses: action.expenses || [],
        users: action.users ?? state.users,
        settings: action.settings ?? state.settings,
        loading: false 
      }
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.expense] }
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) }
    case 'SET_USER':
      return { ...state, currentUser: action.user }
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter(ev => ev.id !== action.eventId),
        reservations: state.reservations.filter(res => res.eventId !== action.eventId),
      }
    default:
      return state
  }
}

const AppContext = createContext(null)

const STORAGE_KEY = 'standflow_full_state'

function mapProfile(profile) {
  return {
    ...profile,
    name: profile.name ?? profile.first_name ?? '',
    lastName: profile.lastName ?? profile.last_name ?? '',
  }
}

async function fetchAllRows(table, orderColumn = 'id', pageSize = 1000) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) return { data: null, error }

    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return { data: rows, error: null }
}

function applyReservationsToStands(stands, reservations) {
  const activeStatuses = ['pending', 'deposit_paid', 'paid', 'reserved']
  const standStatusById = new Map()
  const standCategoryById = new Map()

  reservations.forEach(reservation => {
    if (!activeStatuses.includes(reservation.status)) return

    const current = standStatusById.get(reservation.standId)
    const nextStatus = (reservation.status === 'paid' || reservation.status === 'reserved' || reservation.status === 'deposit_paid') ? 'reserved' : 'pending'
    if (!current || current === 'pending') {
      standStatusById.set(reservation.standId, nextStatus)
    }
    if (reservation.categoryId) {
      standCategoryById.set(reservation.standId, reservation.categoryId)
    }
  })

  return stands.map(stand => ({
    ...stand,
    status: standStatusById.get(stand.id) || stand.status,
    categoryId: standCategoryById.get(stand.id) || stand.categoryId,
  }))
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    return JSON.parse(saved)
  } catch { return null }
}

function persistingDispatch(dispatch) {
  return (action) => {
    dispatch(action)
    // After any action, we trigger a save of the current state
    // Note: Due to how useReducer works, the state saved here might be the PREVIOUS one
    // if not careful. A better way is to save in the next tick or use a middle-ware approach.
    // For this simple app, we'll handle it inside the Provider or with a sync trick.
  }
}

export function AppProvider({ children }) {
  const initialState = {
    currentUser: null,
    users: INITIAL_USERS, // Restauramos los usuarios de prueba
    events: [],
    reservations: [],
    categories: [],
    settings: INITIAL_SETTINGS,
    loading: true
  }

  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Verificar sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          if (profile?.role_id === -1) {
            await supabase.auth.signOut()
            dispatch({ type: 'SET_USER', user: null })
          } else {
            dispatch({ type: 'SET_USER', user: { ...session.user, ...mapProfile(profile) } })
          }
        }

        // 2. Escuchar cambios en la sesión
        supabase.auth.onAuthStateChange((_event, session) => {
          setTimeout(async () => {
            if (session) {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
              if (profile?.role_id === -1) {
                await supabase.auth.signOut()
                dispatch({ type: 'SET_USER', user: null })
              } else {
                dispatch({ type: 'SET_USER', user: { ...session.user, ...mapProfile(profile) } })
              }
            } else {
              dispatch({ type: 'SET_USER', user: null })
            }
          }, 0)
        })

        // 3. Cargar datos de la app
        const [
          { data: categories, error: catError },
          { data: events, error: evError },
          { data: stands, error: stError },
          { data: reservations, error: resError },
          { data: profiles, error: profilesError },
          { data: expenses, error: expError },
          { data: appSettings, error: settingsError }
        ] = await Promise.all([
          fetchAllRows('categories', 'id'),
          fetchAllRows('events', 'date'),
          fetchAllRows('stands', 'id'),
          fetchAllRows('reservations', 'created_at'),
          fetchAllRows('profiles', 'id'),
          fetchAllRows('expenses', 'created_at'),
          supabase.from('app_settings').select('*').eq('id', 'whatsapp').maybeSingle()
        ])

        if (catError || evError || stError || resError || profilesError) {
          console.error("Error cargando datos de Supabase:", { catError, evError, stError, resError, profilesError })
          return
        }

        if (expError) {
          console.warn("La tabla expenses aún no existe o falló:", expError)
        }

        if (settingsError) {
          console.warn("No se pudo cargar app_settings; se usan ajustes por defecto:", settingsError)
        }

        // Mapear propiedades para que coincidan con el código (snake_case -> camelCase)

        // Mapear propiedades para que coincidan con el código (snake_case -> camelCase)
        const mappedCategories = (categories || []).map(cat => ({
          ...cat,
          // (los campos id, name, color ya coinciden)
        }))

        const mappedStands = (stands || []).map(s => ({
          ...s,
          categoryId: s.category_id, // Importante: convertir a camelCase
          eventId: s.event_id
        }))

        const mappedReservations = (reservations || []).map(r => ({
          ...r,
          eventId: r.event_id,
          standId: r.stand_id,
          userId: r.user_id,
          standName: r.stand_name,
          sharedWith: r.shared_with,
          categoryId: r.category_id,
          createdAt: r.created_at
        }))

        const mappedStandsWithReservations = applyReservationsToStands(mappedStands, mappedReservations)
        const mappedUsers = (profiles || []).filter(p => p.role_id !== -1).map(mapProfile)
        const eventsWithStands = (events || []).map(ev => ({
          ...ev,
          mapImage: ev.map_image, // Convertir map_image -> mapImage
          paymentInstructions: ev.payment_instructions,
          stands: mappedStandsWithReservations.filter(s => s.eventId === ev.id)
        }))

        dispatch({ 
          type: 'SET_DATA', 
          events: eventsWithStands, 
          categories: mappedCategories, 
          reservations: mappedReservations,
          expenses: expenses || [],
          users: mappedUsers,
          settings: appSettings?.value ? { ...INITIAL_SETTINGS, ...appSettings.value } : INITIAL_SETTINGS
        })
      } catch (err) {
        console.error("Error crítico en fetchData:", err)
      }
    }

    fetchData()
  }, [])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
