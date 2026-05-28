export type AppErrorType = 'auth' | 'network' | 'not_found' | 'forbidden' | 'unknown'

export interface AppError {
  type: AppErrorType
  message: string
}

export function parseSupabaseError(error: unknown): AppError {
  if (!error || typeof error !== 'object') {
    return { type: 'unknown', message: 'Algo salió mal. Intentá de nuevo.' }
  }

  const err = error as { code?: string; message?: string; status?: number }

  if (err.message?.includes('Invalid login credentials')) {
    return { type: 'auth', message: 'Email o contraseña incorrectos.' }
  }
  if (err.message?.includes('User already registered')) {
    return { type: 'auth', message: 'Ya existe una cuenta con ese email.' }
  }
  if (err.message?.includes('Email not confirmed')) {
    return { type: 'auth', message: 'Confirmá tu email antes de iniciar sesión.' }
  }
  if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
    return { type: 'network', message: 'Sin conexión. Revisá tu internet.' }
  }
  if (err.code === '42501' || err.status === 403) {
    return { type: 'forbidden', message: 'No tenés permiso para hacer esa acción.' }
  }
  if (err.code === 'PGRST116' || err.status === 404) {
    return { type: 'not_found', message: 'No encontramos lo que buscabas.' }
  }

  return { type: 'unknown', message: 'Algo salió mal. Intentá de nuevo.' }
}
