import { supabase } from '@/shared/lib/supabase/client'
import type {
  GenerateFlashcardsRequest,
  GenerateFlashcardsResponse,
  StudyAIErrorResponse,
  ApiResult,
} from '@/shared/types/v2'

// Llama a la edge function generate-flashcards y normaliza el resultado.
export async function generateFlashcards(
  input: GenerateFlashcardsRequest
): Promise<ApiResult<GenerateFlashcardsResponse>> {
  const { data, error } = await supabase.functions.invoke<
    GenerateFlashcardsResponse | StudyAIErrorResponse
  >('generate-flashcards', { body: input })

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
