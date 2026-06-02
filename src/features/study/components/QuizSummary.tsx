import { motion } from 'framer-motion'
import type { SessionResult } from '@/features/study/lib/quiz'
import { XP } from '@/features/gamification/lib/gamification'

interface Props {
  result: SessionResult
  streakUpdated: boolean
  onPlayAgain: () => void
  onBack: () => void
}

export default function QuizSummary({ result, streakUpdated, onPlayAgain, onBack }: Props) {
  const { correctCount, totalQuestions, isPerfect } = result
  const xpEarned = XP.STUDY_SESSION + (isPerfect ? XP.STUDY_SESSION_PERFECT : 0)

  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      {/* Ícono */}
      <motion.div
        className="text-6xl"
        animate={isPerfect ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 1.2, repeat: isPerfect ? Infinity : 0, ease: 'easeInOut' }}
      >
        {isPerfect ? '⭐' : '🎯'}
      </motion.div>

      {/* Título */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">
          {isPerfect ? '¡Quiz perfecto!' : '¡Quiz terminado!'}
        </h2>
        {!isPerfect && (
          <p className="text-sm text-text-secondary">
            {correctCount === 0
              ? 'Para la próxima 💪'
              : 'Buena. Volvé a intentar para fijarlo.'}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="bg-bg-surface rounded-2xl border border-muted/30 px-8 py-5 space-y-1 w-full max-w-xs">
        <p className="text-4xl font-bold text-text-primary">
          {correctCount} / {totalQuestions}
        </p>
        <p className="text-sm text-text-secondary">respuestas correctas</p>
      </div>

      {/* XP */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-2xl font-bold text-warning">+{xpEarned} XP</span>
        {isPerfect && (
          <span className="text-xs text-warning/70">
            +{XP.STUDY_SESSION} base · +{XP.STUDY_SESSION_PERFECT} bonus perfecto
          </span>
        )}
        {streakUpdated && (
          <span className="text-sm text-text-secondary mt-1">🔥 racha actualizada</span>
        )}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full pt-2">
        <button
          onClick={onPlayAgain}
          className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-95 transition-all"
        >
          Otra sesión
        </button>
        <button
          onClick={onBack}
          className="w-full text-text-secondary font-medium rounded-xl py-2 text-sm hover:text-text-primary transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
