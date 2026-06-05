import { useState, useEffect, useCallback } from 'react'
import { generateFlashcards } from '@/features/study-ai/api/generateFlashcards'
import {
  saveFlashcardSet,
  getFlashcardSets,
  updateFlashcardStatus,
  deleteFlashcardSet,
} from '@/features/study-ai/api/flashcardSets'
import type { FlashcardSetWithCards, FlashcardStatus } from '@/shared/types/v2'

// Maneja el flujo de flashcards de una materia: generar (con persistencia),
// listar los sets, marcar tarjetas y borrar sets.
export function useFlashcards(subjectId: string | null, subjectName: string) {
  const [sets, setSets] = useState<FlashcardSetWithCards[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!subjectId) {
      setSets([])
      return
    }
    let cancelled = false
    getFlashcardSets(subjectId)
      .then(data => {
        if (!cancelled) setSets(data)
      })
      .catch(err => console.error('[study-ai] error cargando flashcards:', err))
    return () => {
      cancelled = true
    }
  }, [subjectId])

  // Devuelve el set recién creado (o null si falló), para que la UI lo abra.
  const generate = useCallback(
    async (topic: string, count: number, text?: string): Promise<FlashcardSetWithCards | null> => {
      if (!subjectId) return null
      setError(null)
      setIsGenerating(true)

      try {
        const result = await generateFlashcards({ subjectName, topic, text, count })
        if (!result.ok) {
          setError(result.error)
          return null
        }

        try {
          const set = await saveFlashcardSet({
            subjectId,
            topic,
            cards: result.data.flashcards,
          })
          setSets(prev => [set, ...prev])
          return set
        } catch (saveErr) {
          console.error('[study-ai] error guardando flashcards:', saveErr)
          setError('Generamos las tarjetas pero no pudimos guardarlas. Probá de nuevo.')
          return null
        }
      } finally {
        setIsGenerating(false)
      }
    },
    [subjectId, subjectName]
  )

  const markCard = useCallback(
    async (setId: string, cardId: string, status: FlashcardStatus) => {
      // Optimista
      setSets(prev =>
        prev.map(set =>
          set.id !== setId
            ? set
            : {
                ...set,
                flashcards: set.flashcards.map(c =>
                  c.id === cardId ? { ...c, status } : c
                ),
              }
        )
      )
      try {
        await updateFlashcardStatus(cardId, status)
      } catch (err) {
        console.error('[study-ai] error marcando flashcard:', err)
        // No revertimos visualmente para no interrumpir el repaso; se re-sincroniza
        // al reabrir el set.
      }
    },
    []
  )

  const removeSet = useCallback(
    async (setId: string) => {
      const prev = sets
      setSets(list => list.filter(s => s.id !== setId))
      try {
        await deleteFlashcardSet(setId)
      } catch (err) {
        console.error('[study-ai] error borrando set:', err)
        setSets(prev)
      }
    },
    [sets]
  )

  return { sets, isGenerating, error, generate, markCard, removeSet }
}
