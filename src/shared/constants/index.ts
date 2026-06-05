// Estados que cuentan como "materia aprobada" — desbloquean correlativas
// PARA RENDIR el final (necesitás tener la correlativa con final aprobado).
export const UNBLOCKING_STATUSES = ['aprobada', 'promocionada'] as const

// Estados que cuentan como "materia regularizada o mejor" — desbloquean
// correlativas PARA CURSAR (alcanza con tener la cursada de la correlativa).
export const CURSAR_UNBLOCKING_STATUSES = ['regular', 'promocionada', 'aprobada'] as const

export const STATUS_LABELS: Record<string, string> = {
  no_cursada: 'No cursada',
  cursando: 'Cursando',
  regular: 'Regular',
  promocionada: 'Promocionada',
  aprobada: 'Aprobada',
  final_pendiente: 'Final pendiente',
  libre: 'Libre',
}

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  TREE: '/tree',
  AGENDA: '/agenda',
  STUDY: '/estudiar',
  PROFILE: '/profile',
  PDF_IMPORT: '/importar-plan',
} as const
