import { supabase } from '@/shared/lib/supabase/client'
import type { FlashcardSet, Flashcard, FlashcardSetWithCards, FlashcardStatus } from '@/shared/types/v2'

// CRUD de sets de flashcards. RLS restringe todo al usuario.

export async function saveFlashcardSet(input: {
  subjectId: string
  topic: string
  cards: { question: string; answer: string }[]
}): Promise<FlashcardSetWithCards> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // 1) Crear el set
  const { data: set, error: setErr } = await supabase
    .from('flashcard_sets')
    .insert({ user_id: userId, subject_id: input.subjectId, topic: input.topic })
    .select()
    .single()
  if (setErr) throw setErr

  // 2) Insertar las flashcards en bulk
  const rows = input.cards.map((c, i) => ({
    set_id: set.id,
    question: c.question,
    answer: c.answer,
    position: i,
  }))

  const { data: cards, error: cardsErr } = await supabase
    .from('flashcards')
    .insert(rows)
    .select()
  if (cardsErr) throw cardsErr

  return { ...(set as FlashcardSet), flashcards: (cards ?? []) as Flashcard[] }
}

export async function getFlashcardSets(subjectId: string): Promise<FlashcardSetWithCards[]> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .select('*, flashcards(*)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Ordenamos las flashcards de cada set por position (el join no garantiza orden).
  const sets = (data ?? []) as FlashcardSetWithCards[]
  for (const set of sets) {
    set.flashcards.sort((a, b) => a.position - b.position)
  }
  return sets
}

export async function updateFlashcardStatus(
  cardId: string,
  status: FlashcardStatus
): Promise<void> {
  const { error } = await supabase
    .from('flashcards')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw error
}

export async function deleteFlashcardSet(setId: string): Promise<void> {
  // ON DELETE CASCADE borra las flashcards asociadas.
  const { error } = await supabase.from('flashcard_sets').delete().eq('id', setId)
  if (error) throw error
}
