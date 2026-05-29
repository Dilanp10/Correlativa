import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGamification } from '@/features/gamification/hooks/useGamification'
import { useCareerStore } from '@/features/career/store/careerStore'
import LevelUpOverlay from '@/features/gamification/components/LevelUpOverlay'

/**
 * Detecta subidas de nivel en cualquier parte de la app y muestra el overlay festivo.
 *
 * - Primer cómputo = baseline silencioso (no celebra).
 * - Bajadas de nivel no muestran nada.
 * - Cambio de carrera re-baselinea (para no celebrar cuando los datos terminan de cargar).
 * - Múltiples subidas en una sola acción se encolan: una a la vez.
 */
export default function LevelUpWatcher() {
  const { state, loaded } = useGamification()
  const activeCareerId = useCareerStore(s => s.activeCareer?.id ?? null)

  const prevLevelRef = useRef<number | null>(null)
  const prevCareerIdRef = useRef<string | null>(null)

  const [queue, setQueue] = useState<number[]>([])

  useEffect(() => {
    if (!loaded || !state) return

    // Cambió la carrera: re-baselinea para evitar celebraciones fantasma
    // mientras los datos terminan de cargar.
    if (prevCareerIdRef.current !== activeCareerId) {
      prevCareerIdRef.current = activeCareerId
      prevLevelRef.current = state.level
      return
    }

    // Primer cómputo de esta sesión: solo guarda baseline.
    if (prevLevelRef.current === null) {
      prevLevelRef.current = state.level
      return
    }

    // Subida de nivel: encolar todos los niveles cruzados.
    if (state.level > prevLevelRef.current) {
      const newLevels: number[] = []
      for (let l = prevLevelRef.current + 1; l <= state.level; l++) newLevels.push(l)
      setQueue(q => [...q, ...newLevels])
      prevLevelRef.current = state.level
      return
    }

    // Bajada de nivel: actualiza el ref sin celebrar.
    if (state.level < prevLevelRef.current) {
      prevLevelRef.current = state.level
    }
  }, [loaded, state, activeCareerId])

  function pop() {
    setQueue(q => q.slice(1))
  }

  const current = queue[0]

  return (
    <AnimatePresence>
      {current !== undefined && <LevelUpOverlay key={current} level={current} onClose={pop} />}
    </AnimatePresence>
  )
}
