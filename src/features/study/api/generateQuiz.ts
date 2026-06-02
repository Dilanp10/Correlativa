import { supabase } from '@/shared/lib/supabase/client'
import type { Quiz } from '@/features/study/lib/quiz'
import { isValidQuiz } from '@/features/study/lib/quiz'

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

export type GenerateQuizResult = GenerateQuizSuccess | GenerateQuizFailure

const ERROR_MESSAGES: Record<GenerateQuizError, string> = {
  invalid_input: 'Los datos del quiz son inválidos. Revisá la materia y el tema.',
  unauthorized: 'Tenés que estar logueado para generar un quiz.',
  rate_limit: 'Alcanzaste el límite gratuito de quizzes por hoy. Probá más tarde.',
  ai_invalid_response: 'Algo salió mal con la generación. Probá con otro tema o reintentá.',
  network: 'No pudimos generar tu quiz. Revisá tu conexión y reintentá.',
  internal: 'No pudimos generar tu quiz. Reintentá en un momento.',
}

export async function generateQuiz(
  subjectName: string,
  topic?: string
): Promise<GenerateQuizResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: { subjectName, topic: topic?.trim() || undefined },
    })

    // Error HTTP del Edge Function: supabase-js lo envuelve en FunctionsHttpError,
    // donde error.context es el Response. Hay que leer status y body de ahí.
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
        `[generateQuiz] name=${(error as Error).name} | message=${(error as Error).message} | status=${status} | body=${JSON.stringify(serverBody)}`
      )

      const body = serverBody as { error?: string; message?: string } | null
      const serverError = body?.error
      if (status === 401 || serverError === 'unauthorized') return fail('unauthorized')
      if (status === 429 || serverError === 'rate_limit') return fail('rate_limit')
      if (status === 400 || serverError === 'invalid_input') return fail('invalid_input')
      if (status === 502 || serverError === 'ai_invalid_response') return fail('ai_invalid_response')
      return fail('internal')
    }

    // Validar que el shape sea correcto (defensa extra)
    if (!isValidQuiz(data)) {
      console.error('[generateQuiz] shape inesperado:', data)
      return fail('ai_invalid_response')
    }

    return { ok: true, quiz: data }
  } catch (err) {
    console.error('[generateQuiz] error de red:', err)
    return fail('network')
  }
}

function fail(error: GenerateQuizError): GenerateQuizFailure {
  return { ok: false, error, message: ERROR_MESSAGES[error] }
}
