import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import BottomNav from '@/shared/components/BottomNav'
import { ROUTES } from '@/shared/constants'

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
  const navigate = useNavigate()
  const activeCareer = useCareerStore(s => s.activeCareer)
  const getProgress = useSubjectsStore(s => s.getProgress)
  const { isLoading } = useSubjects()

  const progress = getProgress()

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-20">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">
          {activeCareer?.university?.short_name ?? ''}
        </p>
        <h1 className="text-2xl font-bold text-text-primary leading-tight">
          {activeCareer?.name ?? 'Mi carrera'}
        </h1>
      </div>

      <div className="flex-1 px-5 space-y-6">
        {/* Barra de progreso */}
        <div className="bg-bg-surface rounded-2xl p-5 border border-muted/30">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
                Progreso de carrera
              </p>
              <p className="text-4xl font-bold text-text-primary mt-1">
                {isLoading ? '—' : `${progress.percentComplete}%`}
              </p>
            </div>
            {!isLoading && progress.total > 0 && (
              <p className="text-sm text-text-secondary mb-1">
                {progress.approved} de {progress.total} aprobadas
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="h-3 bg-muted/40 rounded-full animate-pulse" />
          ) : (
            <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          )}
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
              label="Disponibles"
              value={progress.available}
              color="text-text-primary"
            />
            <StatCard
              label="Promedio"
              value={progress.averageGrade !== null ? progress.averageGrade.toFixed(1) : '—'}
              color="text-warning"
            />
          </div>
        )}

        {/* CTA al árbol */}
        <button
          onClick={() => navigate(ROUTES.TREE)}
          className="w-full bg-accent/10 border border-accent/30 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-accent/15 transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">Ver árbol de correlativas</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {progress.available > 0
                ? `Tenés ${progress.available} materia${progress.available !== 1 ? 's' : ''} disponible${progress.available !== 1 ? 's' : ''} para cursar`
                : 'Visualizá tu progreso completo'}
            </p>
          </div>
          <span className="text-accent text-xl ml-3">→</span>
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
