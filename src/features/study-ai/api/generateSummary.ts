import { supabase } from '@/shared/lib/supabase/client'
import type {
  GenerateSummaryRequest,
  GenerateSummaryResponse,
  StudyAIErrorResponse,
  ApiResult,
} from '@/shared/types/v2'

// Llama a la edge function generate-summary y normaliza el resultado a
// { ok, data } | { ok, error } con mensaje listo para mostrar.
export async function generateSummary(
  input: GenerateSummaryRequest
): Promise<ApiResult<GenerateSummaryResponse>> {
  const { data, error } = await supabase.functions.invoke<
    GenerateSummaryResponse | StudyAIErrorResponse
  >('generate-summary', { body: input })

  if (error) {
    return { ok: false, error: 'No pudimos conectar con el servidor. Probá de nuevo.' }
  }
  if (!data) {
    return { ok: false, error: 'No recibimos respuesta. Probá de nuevo.' }
  }
  if ('error' in data) {
    return { ok: false, error: data.message }
  }

  return { ok: true, data }
}
