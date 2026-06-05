// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartidos de v2 (correlativas tipadas + IA de estudio)
//
// Spec de referencia: specs/008-v2/API-Contracts.md §2
//
// Los tipos de v1 viven en `./index.ts`. Acá solo va lo nuevo de v2 o lo que
// extiende contratos existentes. En la Fase 3 algunos de estos van a moverse
// a index.ts cuando se actualice la lógica del árbol.
// ─────────────────────────────────────────────────────────────────────────────

// ── Correlativas tipadas ─────────────────────────────────────────────────────

export type CorrelativeType = 'para_cursar' | 'para_rendir'

export interface SubjectCorrelativeV2 {
  subject_id: string
  requires_subject_id: string
  type: CorrelativeType
  created_at: string
}

// Estado del nodo del árbol (extendido en v2).
// `disponible` de v1 se reemplaza por `disponible_cursar` + `disponible_rendir`.
export type TreeNodeStateV2 =
  | 'bloqueada'
  | 'disponible_cursar'
  | 'disponible_rendir'
  | 'cursando'
  | 'completada'

// ── Resúmenes (`study_notes`) ────────────────────────────────────────────────

export interface StudyNote {
  id: string
  user_id: string
  subject_id: string
  topic: string
  title: string
  content: string
  key_points: string[]
  created_at: string
}

// ── Flashcards (`flashcard_sets` + `flashcards`) ─────────────────────────────

export type FlashcardStatus = 'nueva' | 'repasar' | 'aprendida'

export interface FlashcardSet {
  id: string
  user_id: string
  subject_id: string
  topic: string
  created_at: string
}

export interface Flashcard {
  id: string
  set_id: string
  question: string
  answer: string
  status: FlashcardStatus
  reviewed_at: string | null
  position: number
}

export interface FlashcardSetWithCards extends FlashcardSet {
  flashcards: Flashcard[]
}

// ── Quiz (efímero, NO se persiste) ───────────────────────────────────────────

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface QuizPayload {
  topic: string
  questions: QuizQuestion[]
}

// ── Contratos de Edge Functions ──────────────────────────────────────────────

export interface GenerateSummaryRequest {
  subjectName: string
  topic: string
  text?: string
}

export interface GenerateSummaryResponse {
  title: string
  content: string
  keyPoints: string[]
}

export interface GenerateFlashcardsRequest {
  subjectName: string
  topic: string
  text?: string
  count: number
}

export interface GenerateFlashcardsResponse {
  flashcards: Array<{
    question: string
    answer: string
  }>
}

export interface GenerateQuizRequest {
  subjectName: string
  topic: string
  text?: string
  count: 5 | 10 | 15
}

export interface GenerateQuizResponse {
  questions: QuizQuestion[]
}

// ── Errores de API ───────────────────────────────────────────────────────────

export type StudyAIErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'rate_limit'
  | 'ai_invalid_response'
  | 'network'
  | 'internal'

export interface StudyAIErrorResponse {
  error: StudyAIErrorCode
  message: string
}

// Resultado tipado al estilo `{ ok: true, data } | { ok: false, error }`.
// Se usa en los wrappers de `src/features/study-ai/api/`.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
