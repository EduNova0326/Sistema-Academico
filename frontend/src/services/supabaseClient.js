import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const getProjectRef = (url) => {
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return 'local'
  }
}

const projectRef = getProjectRef(SUPABASE_URL)
const storageKey = `sb-${projectRef}-auth-token`
const isAuthScreen =
  typeof window !== 'undefined' &&
  (window.location.pathname === '/login' || window.location.pathname === '/register')

const clearStorageKeys = (storage) => {
  if (!storage) return

  Object.keys(storage).forEach((key) => {
    if (key.startsWith(`sb-${projectRef}-`)) {
      storage.removeItem(key)
    }
  })
}

export const clearPersistedSession = () => {
  if (typeof window === 'undefined') return

  try {
    clearStorageKeys(window.localStorage)
    clearStorageKeys(window.sessionStorage)
  } catch (error) {
    console.error('No se pudo limpiar la sesion persistida:', error)
  }
}

if (isAuthScreen) {
  clearPersistedSession()
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export const supabaseAuth = {
  signIn:       (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut:      ()                => supabase.auth.signOut(),
  getUser:      ()                => supabase.auth.getUser(),
  onAuthChange: (cb)              => supabase.auth.onAuthStateChange(cb),
}
        
