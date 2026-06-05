import { supabase } from '@/shared/lib/supabase/client'
import type { StudyNote } from '@/shared/types/v2'

// CRUD de resúmenes guardados (study_notes). RLS restringe todo al usuario.

export async function saveSummary(input: {
  subjectId: string
  topic: string
  title: string
  content: string
  keyPoints: string[]
}): Promise<StudyNote> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  const { data, error } = await supabase
    .from('study_notes')
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      topic: input.topic,
      title: input.title,
      content: input.content,
      key_points: input.keyPoints,
    })
    .select()
    .single()

  if (error) throw error
  return data as StudyNote
}

export async function getNotesBySubject(subjectId: string): Promise<StudyNote[]> {
  const { data, error } = await supabase
    .from('study_notes')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as StudyNote[]
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('study_notes').delete().eq('id', noteId)
  if (error) throw error
}
