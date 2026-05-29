import { useEffect } from 'react'
import { useStreak } from '@/features/streaks/hooks/useStreak'
import { onActivity } from '@/shared/lib/userActivityBus'

/**
 * Se monta una sola vez (en App) y suscribe recordActivity al bus de actividad.
 * Cualquier acción válida (cambio de estado de materia, completar evento, futura
 * sesión de estudio) actualiza la racha sin importar la pantalla.
 */
export default function StreakActivityConsumer(): null {
  const { recordActivity } = useStreak()

  useEffect(() => {
    return onActivity(recordActivity)
  }, [recordActivity])

  return null
}
