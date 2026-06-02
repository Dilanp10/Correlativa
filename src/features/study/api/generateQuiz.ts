import { supabase } from '@/shared/lib/supabase/client'
import type { Quiz } from '@/features/study/lib/quiz'
import { isValidQuiz } from '@/features/study/lib/quiz'
import type { ExerciseSet } from '@/features/study/lib/exercise'
import { isValidExerciseSet } from '@/features/study/lib/exercise'

export type GenerateQuizError =
  | 'invalid_input'
  | 'unauthorized'
  | 'rate_limit'
  | 'ai_invalid_response'
  | 'network'
  | 'internal'

export interface GenerateQuizFailure {
  ok: false
  error: GenerateQuizError
  message: string
}

export interface GenerateQuizSuccess {
  ok: true
  quiz: Quiz
}

export interface GenerateExercisesSuccess {
  ok: true
  exerciseSet: ExerciseSet
}

export type GenerateQuizResult = GenerateQuizSuccess | GenerateQuizFailure
export type GenerateExercisesResult = GenerateExercisesSuccess | GenerateQuizFailure

const ERROR_MESSAGES: Record<GenerateQuizError, string> = {
  invalid_input: 'Los datos son inválidos. Revisá la materia y el tema.',
  unauthorized: 'Tenés que estar logueado para generar contenido.',
  rate_limit: 'Alcanzaste el límite gratuito por hoy. Probá más tarde.',
  ai_invalid_response: 'Algo salió mal con la generación. Probá con otro tema o reintentá.',
  network: 'No pudimos generar el contenido. Revisá tu conexión y reintentá.',
  internal: 'No pudimos generar el contenido. Reintentá en un momento.',
}

function fail(error: GenerateQuizError): GenerateQuizFailure {
  return { ok: false, error, message: ERROR_MESSAGES[error] }
}

/** Llama al Edge Function y mapea los errores. Devuelve el data crudo o un failure. */
async function invokeGenerate(
  body: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | GenerateQuizFailure> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quiz', { body })

    if (error) {
      const ctx = (error as { context?: Response }).context
      const status = ctx?.status
      let serverBody: unknown = null
      try {
        serverBody = ctx ? await ctx.clone().json() : null
      } catch {
        // body no era JSON
      }
      console.error(
        `[generate] name=${(error as Error).name} | message=${(error as Error).message} | status=${status} | body=${JSON.stringify(serverBody)}`
      )

      const sb = serverBody as { error?: string } | null
      const serverError = sb?.error
      if (status === 401 || serverError === 'unauthorized') return fail('unauthorized')
      if (status === 429 || serverError === 'rate_limit') return fail('rate_limit')
      if (status === 400 || serverError === 'invalid_input') return fail('invalid_input')
      if (status === 502 || serverError === 'ai_invalid_response') return fail('ai_invalid_response')
      return fail('internal')
    }

    return { ok: true, data }
  } catch (err) {
    console.error('[generate] error de red:', err)
    return fail('network')
  }
}

export async function generateQuiz(
  subjectName: string,
  topic?: string
): Promise<GenerateQuizResult> {
  const res = await invokeGenerate({ subjectName, topic: topic?.trim() || undefined, mode: 'quiz' })
  if (!res.ok) return res

  if (!isValidQuiz(res.data)) {
    console.error('[generateQuiz] shape inesperado:', res.data)
    return fail('ai_invalid_response')
  }
  return { ok: true, quiz: res.data }
}

export async function generateExercises(
  subjectName: string,
  topic?: string
): Promise<GenerateExercisesResult> {
  const res = await invokeGenerate({ subjectName, topic: topic?.trim() || undefined, mode: 'exercises' })
  if (!res.ok) return res

  if (!isValidExerciseSet(res.data)) {
    console.error('[generateExercises] shape inesperado:', res.data)
    return fail('ai_invalid_response')
  }
  return { ok: true, exerciseSet: res.data }
}
