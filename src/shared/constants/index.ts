export const UNBLOCKING_STATUSES = ['aprobada', 'promocionada'] as const

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
