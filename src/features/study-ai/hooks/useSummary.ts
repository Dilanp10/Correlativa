import { useState, useEffect, useCallback } from 'react'
import { generateSummary } from '@/features/study-ai/api/generateSummary'
import { saveSummary, getNotesBySubject, deleteNote } from '@/features/study-ai/api/studyNotes'
import type { StudyNote, GenerateSummaryResponse } from '@/shared/types/v2'

// Maneja el flujo de resúmenes de una materia: generar (con persistencia
// automática), listar los guardados y borrar.
export function useSummary(subjectId: string | null, subjectName: string) {
  const [saved, setSaved] = useState<StudyNote[]>([])
  const [current, setCurrent] = useState<GenerateSummaryResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar los resúmenes guardados al cambiar de materia.
  useEffect(() => {
    if (!subjectId) {
      setSaved([])
      return
    }
    let cancelled = false
    getNotesBySubject(subjectId)
      .then(notes => {
        if (!cancelled) setSaved(notes)
      })
      .catch(err => {
        console.error('[study-ai] error cargando resúmenes:', err)
      })
    return () => {
      cancelled = true
    }
  }, [subjectId])

  const generate = useCallback(
    async (topic: string, text?: string) => {
      if (!subjectId) return
      setError(null)
      setCurrent(null)
      setIsGenerating(true)

      try {
        const result = await generateSummary({ subjectName, topic, text })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setCurrent(result.data)

        // Persistencia automática.
        try {
          const note = await saveSummary({
            subjectId,
            topic,
            title: result.data.title,
            content: result.data.content,
            keyPoints: result.data.keyPoints,
          })
          setSaved(prev => [note, ...prev])
        } catch (saveErr) {
          console.error('[study-ai] error guardando resumen:', saveErr)
          // No bloqueamos: el resumen igual se muestra en pantalla.
        }
      } finally {
        setIsGenerating(false)
      }
    },
    [subjectId, subjectName]
  )

  const removeNote = useCallback(async (noteId: string) => {
    const prev = saved
    setSaved(list => list.filter(n => n.id !== noteId))
    try {
      await deleteNote(noteId)
    } catch (err) {
      console.error('[study-ai] error borrando resumen:', err)
      setSaved(prev) // revertir
    }
  }, [saved])

  const clearCurrent = useCallback(() => setCurrent(null), [])

  return { saved, current, isGenerating, error, generate, removeNote, clearCurrent }
}
