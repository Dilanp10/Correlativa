import type { SessionResult } from '@/features/study/lib/quiz'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Exercise {
  statement: string
  answerType: 'number' | 'text'
  expectedNumber?: number
  tolerance?: number
  acceptedAnswers?: string[]
  solution: string
}

export interface ExerciseSet {
  exercises: Exercise[] // exactamente 5
}

export type StudyMode = 'quiz' | 'exercises'

// ── Helpers de evaluación (puros) ─────────────────────────────────────────────

const LEADING_ARTICLES = /^(el|la|los|las|un|una|unos|unas)\s+/i
const COMBINING_MARKS = /[̀-ͯ]/g // acentos / diacríticos combinantes
const PUNCTUATION = /[.,;:!?¿¡"'()]/g

/** Normaliza texto para comparar: minúsculas, sin acentos, sin signos, sin artículo inicial. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .replace(LEADING_ARTICLES, '')
    .trim()
}

/** Parsea un número aceptando coma o punto decimal. Devuelve null si no es número. */
export function parseNumber(s: string): number | null {
  const cleaned = s.trim().replace(',', '.').replace(/\s/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** ¿La respuesta del usuario es correcta para el ejercicio? */
export function checkExercise(ex: Exercise, userAnswer: string): boolean {
  if (ex.answerType === 'number') {
    const user = parseNumber(userAnswer)
    if (user === null || ex.expectedNumber === undefined) return false
    const tol = ex.tolerance ?? Math.max(1e-6, Math.abs(ex.expectedNumber) * 1e-4)
    return Math.abs(user - ex.expectedNumber) <= tol
  }

  // text
  const accepted = ex.acceptedAnswers ?? []
  const norm = normalizeText(userAnswer)
  if (norm === '') return false
  return accepted.some(a => normalizeText(a) === norm)
}

/** Calcula el resultado de una sesión de ejercicios. */
export function scoreExercises(
  exercises: Exercise[],
  answers: string[],
  subjectId: string
): SessionResult {
  const total = exercises.length
  let correct = 0
  for (let i = 0; i < total; i++) {
    if (checkExercise(exercises[i], answers[i] ?? '')) correct++
  }
  return {
    subjectId,
    correctCount: correct,
    totalQuestions: total,
    isPerfect: correct === total,
  }
}

// ── Validación defensiva del shape de la IA ──────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isValidExercise(e: unknown): e is Exercise {
  if (!e || typeof e !== 'object') return false
  const obj = e as Record<string, unknown>
  if (!isString(obj.statement) || !isString(obj.solution)) return false

  if (obj.answerType === 'number') {
    return typeof obj.expectedNumber === 'number' && Number.isFinite(obj.expectedNumber)
  }
  if (obj.answerType === 'text') {
    return (
      Array.isArray(obj.acceptedAnswers) &&
      obj.acceptedAnswers.length > 0 &&
      obj.acceptedAnswers.every(isString)
    )
  }
  return false
}

export function isValidExerciseSet(data: unknown): data is ExerciseSet {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.exercises) &&
    obj.exercises.length === 5 &&
    obj.exercises.every(isValidExercise)
  )
}
