import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales de Supabase en el archivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente sin sesión persistida, usado para crear usuarios desde el panel
// de administración sin pisar la sesión del admin logueado.
export function createIsolatedAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
