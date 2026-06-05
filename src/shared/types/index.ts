// ── Enums ─────────────────────────────────────────────────────────────────────

export type SubjectStatus =
  | 'no_cursada'
  | 'cursando'
  | 'regular'
  | 'promocionada'
  | 'aprobada'
  | 'final_pendiente'
  | 'libre'

// v2: `disponible` se separa en dos estados según el tipo de correlativa cumplida.
//   - disponible_cursar: cumplís las correlativas "para cursar" → podés inscribirte
//   - disponible_rendir: ya regularizaste la materia → vas camino al final
export type TreeNodeState =
  | 'bloqueada'
  | 'disponible_cursar'
  | 'disponible_rendir'
  | 'cursando'
  | 'completada'

export type CorrelativeType = 'para_cursar' | 'para_rendir'

export type AgendaEventType = 'examen' | 'entrega' | 'recordatorio'

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
  type: CorrelativeType
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

export interface AgendaEvent {
  id: string
  user_id: string
  subject_id: string | null
  type: AgendaEventType
  title: string
  notes: string | null
  due_at: string
  all_day: boolean
  completed: boolean
  created_at: string
  updated_at: string
}

export interface ClassSchedule {
  id: string
  user_id: string
  subject_id: string
  weekday: number // 1 = lunes … 7 = domingo (ISO)
  start_time: string // 'HH:MM:SS'
  end_time: string
  created_at: string
}

export interface StreakState {
  /** 'YYYY-MM-DD' en zona local del usuario. null = nunca tuvo actividad. */
  lastActiveDate: string | null
  /** Días consecutivos contados al cierre de lastActiveDate. */
  currentStreak: number
  /** 'YYYY-MM' del mes en que se gastó el congelador. null = sin usar este mes. */
  freezeUsedMonth: string | null
}

export interface UserStudySession {
  id: string
  user_id: string
  subject_id: string
  completed_at: string
  correct_count: number
  total_questions: number
}

export interface UserStudySession {
  id: string
  user_id: string
  subject_id: string
  completed_at: string
  correct_count: number
  total_questions: number
}

// ── Tipos compuestos ──────────────────────────────────────────────────────────

export interface SubjectWithCorrelatives extends Subject {
  /** Unión de todas las correlativas (cualquier tipo). Se usa para los edges del árbol. */
  requires: string[]
  /** Correlativas que hay que tener regularizadas/aprobadas para CURSAR esta materia. */
  requiresCursar: string[]
  /** Correlativas que hay que tener aprobadas para RENDIR el final de esta materia. */
  requiresRendir: string[]
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
