import { motion } from 'framer-motion'
import type { GamificationState } from '@/features/gamification/lib/gamification'

interface Props {
  state: GamificationState | null
}

export default function LevelCard({ state }: Props) {
  if (!state) {
    return (
      <div className="bg-bg-surface rounded-2xl p-5 border border-muted/30">
        <div className="h-3 w-24 bg-muted/40 rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-muted/40 rounded animate-pulse mb-3" />
        <div className="h-3 bg-muted/40 rounded-full animate-pulse" />
      </div>
    )
  }

  const percent = Math.round(state.progress * 100)
  const xpToNext = state.xpForLevel - state.xpIntoLevel
  const isStart = state.totalXp === 0

  return (
    <div className="bg-bg-surface rounded-2xl p-5 border border-muted/30">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-accent text-sm leading-none">✦</span>
        <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Tu nivel</p>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <p className="text-4xl font-bold text-text-primary leading-none">Nivel {state.level}</p>
        <p className="text-sm text-text-secondary mb-1 shrink-0">
          {state.xpIntoLevel} / {state.xpForLevel} XP
        </p>
      </div>

      <div
        className="h-3 bg-bg-elevated rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso al nivel ${state.level + 1}`}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-warning rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>

      <p className="text-xs text-text-secondary mt-2">
        {isStart
          ? 'Empezá a sumar XP marcando una materia como aprobada.'
          : `Faltan ${xpToNext} XP para Nivel ${state.level + 1}`}
      </p>
    </div>
  )
}
