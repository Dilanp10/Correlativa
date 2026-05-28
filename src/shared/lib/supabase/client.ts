import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase no configuradas. Revisá tu .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Guarda la sesión en localStorage para que sobreviva recargas y
    // cierres del navegador (no hace falta loguearse cada vez).
    persistSession: true,
    // Renueva el token de acceso automáticamente antes de que expire.
    autoRefreshToken: true,
    // Lee la sesión del fragmento de URL en flujos OAuth/magic link.
    detectSessionInUrl: true,
    // Clave propia en localStorage para evitar colisiones.
    storageKey: 'correlativa-auth',
  },
})
