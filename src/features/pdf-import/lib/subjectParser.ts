// Validación defensiva del JSON recibido del backend (Edge Function).
// Estas funciones son puras y testeables.
import type { SubjectDraft, ParseResult } from './types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

/**
 * Valida y normaliza un item individual de materia. Devuelve null si no es
 * recuperable (ej: sin nombre).
 */
export function validateSubjectDraft(raw: unknown): SubjectDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  if (!isNonEmptyString(obj.name)) return null

  const year = toNullableInt(obj.year)
  const semester = toNullableInt(obj.semester)
  const correlativeNames = toStringArray(obj.correlativeNames)

  // Confianza: si la IA no la marcó, la deducimos de la presencia de año + semestre.
  let confidence: 'high' | 'low'
  if (obj.confidence === 'high' || obj.confidence === 'low') {
    confidence = obj.confidence
  } else {
    confidence = year !== null && semester !== null ? 'high' : 'low'
  }

  return {
    name: obj.name.trim(),
    year,
    semester,
    correlativeNames,
    confidence,
  }
}

/**
 * Type-guard sobre el shape completo de `ParseResult`. Solo verifica los
 * campos clave; los items se validan con `validateSubjectDraft` aparte.
 */
export function isValidParseResult(data: unknown): data is {
  subjects: unknown[]
  partial?: boolean
  warning?: string | null
} {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.subjects)
}

/**
 * Toma un objeto crudo (del Edge Function) y devuelve un `ParseResult` válido
 * con materias normalizadas. Si el shape es inválido devuelve null.
 */
export function normalizeParseResult(data: unknown): ParseResult | null {
  if (!isValidParseResult(data)) return null
  const subjects = data.subjects
    .map(validateSubjectDraft)
    .filter((s): s is SubjectDraft => s !== null)

  return {
    ok: true,
    subjects,
    partial: typeof data.partial === 'boolean' ? data.partial : false,
    warning: typeof data.warning === 'string' && data.warning.trim().length > 0 ? data.warning : null,
  }
}
