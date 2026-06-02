// ── Tipos del quiz ──────────────────────────────────────────────────────────

export interface McQuestion {
  type: 'mc'
  question: string
  options: string[] // exactamente 4
  correctIndex: number // 0..3
  explanation: string
}

export interface TfQuestion {
  type: 'tf'
  question: string
  correctValue: boolean
  explanation: string
}

export type Question = McQuestion | TfQuestion

export interface Quiz {
  questions: Question[] // exactamente 5
}

// Respuesta del usuario para cada pregunta: index para mc, boolean para tf, null si no respondida.
export type Answer = number | boolean | null

export interface SessionResult {
  subjectId: string
  correctCount: number
  totalQuestions: number
  isPerfect: boolean
}

// ── Helpers puros ───────────────────────────────────────────────────────────

/** ¿La respuesta es correcta para la pregunta dada? */
export function isAnswerCorrect(question: Question, answer: Answer): boolean {
  if (answer === null) return false
  if (question.type === 'mc') return typeof answer === 'number' && answer === question.correctIndex
  return typeof answer === 'boolean' && answer === question.correctValue
}

/** Calcula el resultado de una sesión. */
export function scoreQuiz(quiz: Quiz, answers: Answer[], subjectId: string): SessionResult {
  const total = quiz.questions.length
  let correct = 0
  for (let i = 0; i < total; i++) {
    if (isAnswerCorrect(quiz.questions[i], answers[i] ?? null)) correct++
  }
  return {
    subjectId,
    correctCount: correct,
    totalQuestions: total,
    isPerfect: correct === total,
  }
}

/** Valida que un objeto sea un Quiz bien formado (defensa extra del lado del front). */
export function isValidQuiz(value: unknown): value is Quiz {
  if (!value || typeof value !== 'object') return false
  const obj = value as { questions?: unknown }
  if (!Array.isArray(obj.questions) || obj.questions.length !== 5) return false
  return obj.questions.every(isValidQuestion)
}

function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false
  const qq = q as Record<string, unknown>
  if (typeof qq.question !== 'string' || qq.question.length === 0) return false
  if (typeof qq.explanation !== 'string') return false
  if (qq.type === 'mc') {
    return (
      Array.isArray(qq.options) &&
      qq.options.length === 4 &&
      qq.options.every(o => typeof o === 'string' && o.length > 0) &&
      typeof qq.correctIndex === 'number' &&
      Number.isInteger(qq.correctIndex) &&
      qq.correctIndex >= 0 &&
      qq.correctIndex <= 3
    )
  }
  if (qq.type === 'tf') {
    return typeof qq.correctValue === 'boolean'
  }
  return false
}
