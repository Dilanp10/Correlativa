import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  display: number
  loaded: boolean
}

export default function StreakChip({ display, loaded }: Props) {
  // Detecta subida del valor para animar el "bump".
  const prevRef = useRef<number>(display)
  const [bumpKey, setBumpKey] = useState(0)

  useEffect(() => {
    if (display > prevRef.current) setBumpKey(k => k + 1)
    prevRef.current = display
  }, [display])

  if (!loaded) {
    return <div className="h-7 w-14 rounded-full bg-muted/30 animate-pulse" aria-hidden="true" />
  }

  const isZero = display === 0
  const ariaLabel = isZero ? 'Sin racha activa' : `Racha actual de ${display} días`

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border bg-bg-surface transition-opacity ${
        isZero ? 'opacity-60 border-muted/40' : 'border-warning/30'
      }`}
    >
      <span className="text-sm leading-none">🔥</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={bumpKey}
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 320, duration: 0.2 }}
          className="text-sm font-bold text-text-primary leading-none"
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
