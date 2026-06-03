import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useAchievements } from '@/features/achievements/hooks/useAchievements'
import { ACHIEVEMENTS, type Achievement } from '@/features/achievements/lib/achievements'
import AchievementUnlockOverlay from '@/features/achievements/components/AchievementUnlockOverlay'

const BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

/**
 * Detecta logros recién desbloqueados en cualquier parte de la app y muestra
 * el overlay festivo. Mismo patrón que LevelUpWatcher:
 * - Primer cómputo = baseline silencioso (no celebra logros ya conseguidos).
 * - Cambio de carrera re-baselinea (evita celebraciones fantasma al cargar).
 * - Pérdidas de logro (reversión) no muestran nada.
 * - Múltiples desbloqueos a la vez se encolan: uno por uno.
 */
export default function AchievementWatcher() {
  const { summary, loaded } = useAchievements()
  const activeCareerId = useCareerStore(s => s.activeCareer?.id ?? null)

  const prevIdsRef = useRef<Set<string> | null>(null)
  const prevCareerIdRef = useRef<string | null>(null)

  const [queue, setQueue] = useState<Achievement[]>([])

  useEffect(() => {
    if (!loaded || !summary) return

    const currentIds = new Set(
      summary.statuses.filter(s => s.unlocked).map(s => s.achievement.id)
    )

    // Cambió la carrera: re-baselinea.
    if (prevCareerIdRef.current !== activeCareerId) {
      prevCareerIdRef.current = activeCareerId
      prevIdsRef.current = currentIds
      return
    }

    // Primer cómputo de la sesión: solo baseline.
    if (prevIdsRef.current === null) {
      prevIdsRef.current = currentIds
      return
    }

    // Logros nuevos (están ahora y no antes).
    const newlyUnlocked: Achievement[] = []
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) {
        const achievement = BY_ID.get(id)
        if (achievement) newlyUnlocked.push(achievement)
      }
    }

    if (newlyUnlocked.length > 0) {
      setQueue(q => [...q, ...newlyUnlocked])
    }

    // Actualizar baseline siempre (cubre también reversiones, sin celebrar).
    prevIdsRef.current = currentIds
  }, [loaded, summary, activeCareerId])

  function pop() {
    setQueue(q => q.slice(1))
  }

  const current = queue[0]

  return (
    <AnimatePresence>
      {current !== undefined && (
        <AchievementUnlockOverlay key={current.id} achievement={current} onClose={pop} />
      )}
    </AnimatePresence>
  )
}
