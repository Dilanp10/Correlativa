import { motion, AnimatePresence } from 'framer-motion'
import { useMilestoneStore, type MilestoneThreshold } from '@/features/dashboard/store/milestoneStore'

// Modal de celebración cuando el usuario cruza un milestone de carrera.
// Spec: specs/009-competitive-ui-redesign/contracts/ui-contracts.md §5

const MILESTONE_CONTENT: Record<MilestoneThreshold, { emoji: string; phrase: string }> = {
  25: {
    emoji: '🎓',
    phrase: 'Arrancaste con todo. Un cuarto de la carrera en el bolsillo.',
  },
  50: {
    emoji: '🔥',
    phrase: 'Llegaste a la mitad. Ya sos veterano/a de la facu.',
  },
  75: {
    emoji: '⚡',
    phrase: 'Tres cuartos. La meta está cerca. No pares.',
  },
  100: {
    emoji: '🏆',
    phrase: '¡Lo lograste! Sos profesional. 🎉',
  },
}

export default function MilestoneCelebration() {
  const pendingMilestone = useMilestoneStore(s => s.pendingMilestone)
  const dismissMilestone = useMilestoneStore(s => s.dismissMilestone)

  const content = pendingMilestone !== null ? MILESTONE_CONTENT[pendingMilestone] : null

  return (
    <AnimatePresence>
      {pendingMilestone !== null && content && (
        <>
          <motion.div
            key="ms-overlay"
            className="fixed inset-0 bg-black/70 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissMilestone}
          />
          <motion.div
            key="ms-modal"
            className="fixed inset-0 z-[110] flex items-center justify-center px-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-bg-surface border-2 border-accent rounded-3xl px-6 py-8 max-w-xs w-full text-center pointer-events-auto"
              initial={{ scale: 0.8, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320, duration: 0.4 }}
              role="dialog"
              aria-modal="true"
              aria-label={`Hito de carrera: ${pendingMilestone}% completada`}
            >
              <motion.p
                className="text-6xl mb-3"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {content.emoji}
              </motion.p>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                ¡{pendingMilestone}% completada!
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                {content.phrase}
              </p>
              <button
                type="button"
                onClick={dismissMilestone}
                className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm active:scale-[0.98] transition-transform"
              >
                ¡Seguí así!
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
