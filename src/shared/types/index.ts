// ── Enums ─────────────────────────────────────────────────────────────────────

export type SubjectStatus =
  | 'no_cursada'
  | 'cursando'
  | 'regular'
  | 'promocionada'
  | 'aprobada'
  | 'final_pendiente'
  | 'libre'

export type TreeNodeState = 'bloqueada' | 'disponible' | 'cursando' | 'completada'

// ── Entidades de base de datos ────────────────────────────────────────────────

export interface University {
  id: string
  name: string
  short_name: string
  country: string
  is_active: boolean
  created_at: string
}

export interface Career {
  id: string
  university_id: string
  name: string
  short_name: string | null
  total_years: number | null
  is_custom: boolean
  created_by: string | null
  is_active: boolean
  created_at: string
}

export interface Subject {
  id: string
  career_id: string
  name: string
  short_name: string | null
  code: string | null
  year: number
  semester: number
  is_elective: boolean
  credits: number | null
  created_at: string
}

export interface SubjectCorrelative {
  subject_id: string
  requires_subject_id: string
  created_at: string
}

export interface UserProfile {
  id: string
  display_name: string
  active_career_id: string | null
  created_at: string
  updated_at: string
}

export interface UserSubject {
  id: string
  user_id: string
  subject_id: string
  status: SubjectStatus
  grade: number | null
  notes: string | null
  updated_at: string
  created_at: string
}

// ── Tipos compuestos ──────────────────────────────────────────────────────────

export interface SubjectWithCorrelatives extends Subject {
  requires: string[]
  unlocks: string[]
}

export interface CareerWithUniversity extends Career {
  university: Pick<University, 'id' | 'name' | 'short_name'>
}

export interface CareerProgress {
  total: number
  approved: number
  inProgress: number
  available: number
  blocked: number
  percentComplete: number
  averageGrade: number | null
}
