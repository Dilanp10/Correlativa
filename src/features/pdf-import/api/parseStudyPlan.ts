import { supabase } from '@/shared/lib/supabase/client'
import { normalizeParseResult } from '@/features/pdf-import/lib/subjectParser'
import type {
  ParseResponse,
  SaveResponse,
  SubjectDraft,
  PdfImportError,
  PdfImportFailure,
} from '@/features/pdf-import/lib/types'

const ERROR_MESSAGES: Record<PdfImportError, string> = {
  invalid_file: 'El archivo no es un PDF válido o supera el límite (5 MB).',
  invalid_input: 'Los datos son inválidos. Volvé a intentarlo.',
  unauthorized: 'Tenés que estar logueado para importar el plan.',
  no_subjects_found: 'No encontramos materias en el PDF. ¿Estás seguro de que es un plan de estudios?',
  rate_limit: 'Alcanzaste el límite gratuito por hoy. Probá más tarde.',
  ai_invalid_response: 'No pudimos procesar el PDF. Probá con otro o cargá las materias a mano.',
  network: 'No pudimos conectar con el servidor. Revisá tu conexión y reintentá.',
  internal: 'Algo salió mal en el servidor. Reintentá en un momento.',
}

function fail(error: PdfImportError, override?: string): PdfImportFailure {
  return { ok: false, error, message: override ?? ERROR_MESSAGES[error] }
}

/**
 * Toma el error que devuelve supabase.functions.invoke y lo mapea a un
 * `PdfImportError`. Sigue el mismo patrón que generateQuiz.ts.
 */
async function mapInvokeError(err: unknown): Promise<PdfImportFailure> {
  const ctx = (err as { context?: Response }).context
  const status = ctx?.status
  let serverBody: { error?: string; message?: string } | null = null
  try {
    serverBody = ctx ? await ctx.clone().json() : null
  } catch {
    // body no era JSON
  }
  console.error(
    `[pdf-import] name=${(err as Error)?.name} | message=${(err as Error)?.message} | status=${status} | body=${JSON.stringify(serverBody)}`
  )

  const serverError = serverBody?.error as PdfImportError | undefined
  const serverMessage = serverBody?.message

  if (status === 401 || serverError === 'unauthorized') return fail('unauthorized', serverMessage)
  if (status === 429 || serverError === 'rate_limit') return fail('rate_limit', serverMessage)
  if (status === 422 || serverError === 'no_subjects_found') return fail('no_subjects_found', serverMessage)
  if (status === 400) {
    if (serverError === 'invalid_file') return fail('invalid_file', serverMessage)
    return fail('invalid_input', serverMessage)
  }
  if (status === 502 || serverError === 'ai_invalid_response') return fail('ai_invalid_response', serverMessage)
  return fail('internal', serverMessage)
}

export async function parsePdf(file: File): Promise<ParseResponse> {
  // Validación de tamaño en el cliente para feedback inmediato.
  if (file.size > 5 * 1024 * 1024) {
    return fail('invalid_file', 'El PDF supera el límite de 5 MB.')
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const { data, error } = await supabase.functions.invoke('parse-study-plan', {
      body: formData,
    })

    if (error) return await mapInvokeError(error)

    const normalized = normalizeParseResult(data)
    if (!normalized) {
      console.error('[parsePdf] shape inesperado:', data)
      return fail('ai_invalid_response')
    }
    return normalized
  } catch (err) {
    console.error('[parsePdf] error de red:', err)
    return fail('network')
  }
}

export async function saveSubjects(
  careerId: string,
  subjects: SubjectDraft[]
): Promise<SaveResponse> {
  if (!careerId) return fail('invalid_input', 'careerId requerido.')
  if (subjects.length === 0) return fail('invalid_input', 'No hay materias para guardar.')

  // Solo mandamos los campos que el backend necesita (sin confidence).
  const payload = {
    action: 'save',
    careerId,
    subjects: subjects.map(s => ({
      name: s.name,
      year: s.year,
      semester: s.semester,
      correlativeNames: s.correlativeNames,
    })),
  }

  try {
    const { data, error } = await supabase.functions.invoke('parse-study-plan', {
      body: payload,
    })

    if (error) return await mapInvokeError(error)

    const obj = data as Record<string, unknown> | null
    if (
      !obj ||
      typeof obj.inserted !== 'number' ||
      typeof obj.skipped !== 'number' ||
      typeof obj.correlativesLinked !== 'number' ||
      !Array.isArray(obj.correlativesUnresolved)
    ) {
      console.error('[saveSubjects] shape inesperado:', data)
      return fail('internal')
    }

    return {
      ok: true,
      inserted: obj.inserted,
      skipped: obj.skipped,
      correlativesLinked: obj.correlativesLinked,
      correlativesUnresolved: obj.correlativesUnresolved.filter(
        (s): s is string => typeof s === 'string'
      ),
    }
  } catch (err) {
    console.error('[saveSubjects] error de red:', err)
    return fail('network')
  }
}
