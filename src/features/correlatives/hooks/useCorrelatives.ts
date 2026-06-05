import { useState, useCallback } from 'react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { updateCorrelativeType } from '@/features/correlatives/api/updateCorrelativeType'
import type { CorrelativeType } from '@/shared/types'

// Hook para editar el tipo de las correlativas de una materia.
// Optimistic UI: actualiza el store local al toque y persiste en background;
// si falla, revierte.
export function useCorrelatives() {
  const setCorrelativeType = useSubjectsStore(s => s.setCorrelativeType)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const updateType = useCallback(
    async (
      subjectId: string,
      requiresSubjectId: string,
      currentType: CorrelativeType,
      newType: CorrelativeType
    ) => {
      if (currentType === newType) return
      setError(null)
      setSavingKey(`${subjectId}:${requiresSubjectId}`)

      // Optimista
      setCorrelativeType(subjectId, requiresSubjectId, newType)

      try {
        await updateCorrelativeType(subjectId, requiresSubjectId, currentType, newType)
      } catch (err) {
        console.error('[correlatives] error actualizando tipo:', err)
        // Revertir
        setCorrelativeType(subjectId, requiresSubjectId, currentType)
        setError('No pudimos guardar el cambio. Probá de nuevo.')
      } finally {
        setSavingKey(null)
      }
    },
    [setCorrelativeType]
  )

  return { updateType, error, savingKey }
}
