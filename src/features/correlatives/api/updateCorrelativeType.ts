import { supabase } from '@/shared/lib/supabase/client'
import type { CorrelativeType } from '@/shared/types'

// Cambia el tipo de una correlativa. Como la PK es compuesta
// (subject_id, requires_subject_id, type), "cambiar el type" = borrar la fila
// vieja e insertar la nueva.
//
// RLS: solo aplica a correlativas de carreras del usuario (custom/importadas).
// Para carreras pre-cargadas el UPDATE no pasa la policy y tira error → la UI
// solo muestra el botón de edición en carreras propias.
export async function updateCorrelativeType(
  subjectId: string,
  requiresSubjectId: string,
  currentType: CorrelativeType,
  newType: CorrelativeType
): Promise<void> {
  if (currentType === newType) return

  const { error: delErr } = await supabase
    .from('subject_correlatives')
    .delete()
    .match({
      subject_id: subjectId,
      requires_subject_id: requiresSubjectId,
      type: currentType,
    })
  if (delErr) throw delErr

  const { error: insErr } = await supabase.from('subject_correlatives').insert({
    subject_id: subjectId,
    requires_subject_id: requiresSubjectId,
    type: newType,
  })
  if (insErr) throw insErr
}
