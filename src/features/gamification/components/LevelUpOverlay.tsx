import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  level: number
  onClose: () => void
  autoDismissMs?: number
}

export default function LevelUpOverlay({ level, onClose, autoDismissMs = 2500 }: Props) {
  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(onClose, autoDismissMs)
    return () => clearTimeout(t)
  }, [onClose, autoDismissMs])

  // Cierre con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-black/75 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
    >
      <motion.div
        className="bg-bg-surface rounded-3xl border border-accent/40 px-8 py-10 flex flex-col items-center text-center max-w-sm w-full shadow-2xl shadow-accent/20"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          className="text-6xl mb-3"
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 280, delay: 0.05 }}
        >
          ⭐
        </motion.div>

        <p id="levelup-title" className="text-base font-semibold text-text-primary mb-2">
          ¡Subiste de nivel!
        </p>

        <motion.p
          className="text-5xl font-bold bg-gradient-to-r from-accent to-warning bg-clip-text text-transparent leading-tight mb-3"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260, delay: 0.15 }}
        >
          Nivel {level}
        </motion.p>

        <p className="text-sm text-text-secondary mb-5">Seguí así.</p>

        <button
          onClick={onClose}
          className="bg-accent text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-accent/90 active:scale-95 transition-all"
        >
          Continuar
        </button>
      </motion.div>
    </motion.div>
  )
}
