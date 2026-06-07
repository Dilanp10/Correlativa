import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useAgenda } from '@/features/agenda/hooks/useAgenda'
import { useGamification } from '@/features/gamification/hooks/useGamification'
import LevelCard from '@/features/gamification/components/LevelCard'
import { useStreak } from '@/features/streaks/hooks/useStreak'
import StreakChip from '@/features/streaks/components/StreakChip'
import PdfImportBanner from '@/features/pdf-import/components/PdfImportBanner'
import AvailableNowCard from '@/features/dashboard/components/AvailableNowCard'
import MilestoneCelebration from '@/features/dashboard/components/MilestoneCelebration'
import { useMilestoneStore } from '@/features/dashboard/store/milestoneStore'
import BottomNav from '@/shared/components/BottomNav'

function StatCard({
  label,
  value,
  color = 'text-text-primary',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl px-4 py-4 flex flex-col gap-1">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const activeCareer = useCareerStore(s => s.activeCareer)
  const getProgress = useSubjectsStore(s => s.getProgress)
  const { isLoading } = useSubjects()
  useAgenda() // precarga eventos de agenda para alimentar la gamificación
  const { state: gamificationState } = useGamification()
  const { display: streakDisplay, loaded: streakLoaded } = useStreak()

  const progress = getProgress()
  const checkMilestone = useMilestoneStore(s => s.checkMilestone)

  // Si el usuario cruzó un umbral de carrera, dispara el modal de celebración.
  // Se chequea solo cuando los datos están cargados (evita parpadeos al cargar).
  useEffect(() => {
    if (isLoading) return
    if (progress.total === 0) return
    checkMilestone(progress.percentComplete)
  }, [isLoading, progress.total, progress.percentComplete, checkMilestone])

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-20 md:pb-6 md:ml-56">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">
              {activeCareer?.university?.short_name ?? ''}
            </p>
            <h1 className="text-2xl font-bold text-text-primary leading-tight">
              {activeCareer?.name ?? 'Mi carrera'}
            </h1>
          </div>
          <div className="shrink-0 mt-1">
            <StreakChip display={streakDisplay} loaded={streakLoaded} />
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 md:px-8 space-y-6 md:max-w-4xl">
        {/* Banner para importar plan desde PDF (solo si no hay materias) */}
        <PdfImportBanner />

        {/* ⭐ PROTAGONISTA: ¿Qué puedo cursar ahora? */}
        <AvailableNowCard available={progress.available} isLoading={isLoading} />

        {/* Barra de progreso (compacta) */}
        <div className="bg-bg-surface rounded-2xl p-4 border border-muted/30">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
              Progreso de carrera
            </p>
            <p className="text-lg font-bold text-text-primary">
              {isLoading ? '—' : `${progress.percentComplete}%`}
              {!isLoading && progress.total > 0 && (
                <span className="text-xs text-text-secondary font-normal ml-2">
                  {progress.approved}/{progress.total}
                </span>
              )}
            </p>
          </div>

          {isLoading ? (
            <div className="h-2.5 bg-muted/40 rounded-full animate-pulse" />
          ) : (
            <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          )}
        </div>

        {/* Stats grid — 3 métricas (la 4ta "Disponibles" se promovió a AvailableNowCard arriba) */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Aprobadas"
              value={progress.approved}
              color="text-success"
            />
            <StatCard
              label="Cursando"
              value={progress.inProgress}
              color="text-accent"
            />
            <StatCard
              label="Promedio"
              value={progress.averageGrade !== null ? progress.averageGrade.toFixed(1) : '—'}
              color="text-warning"
            />
          </div>
        )}

        {/* Nivel (gamificación) — baja en jerarquía: ya no es lo primero */}
        <LevelCard state={gamificationState} />
      </div>

      <BottomNav />

      {/* Modal de celebración al cruzar milestones (25/50/75/100%) */}
      <MilestoneCelebration />
    </div>
  )
}
