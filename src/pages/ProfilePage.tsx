import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useAgendaStore } from '@/features/agenda/store/agendaStore'
import { useScheduleStore } from '@/features/agenda/store/scheduleStore'
import { useStreakStore } from '@/features/streaks/store/streakStore'
import { useSessionsStore } from '@/features/study/store/sessionsStore'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useAchievements } from '@/features/achievements/hooks/useAchievements'
import AchievementsGallery from '@/features/achievements/components/AchievementsGallery'
import { signOut } from '@/shared/lib/supabase/auth'
import { supabase } from '@/shared/lib/supabase/client'
import BottomNav from '@/shared/components/BottomNav'
import { ROUTES } from '@/shared/constants'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const resetAuth = useAuthStore(s => s.reset)
  const activeCareer = useCareerStore(s => s.activeCareer)
  const resetCareer = useCareerStore(s => s.reset)
  const resetSubjects = useSubjectsStore(s => s.reset)
  const resetAgenda = useAgendaStore(s => s.reset)
  const resetSchedule = useScheduleStore(s => s.reset)
  const resetStreak = useStreakStore(s => s.reset)
  const resetSessions = useSessionsStore(s => s.reset)
  const getProgress = useSubjectsStore(s => s.getProgress)
  useSubjects()
  const { summary: achievementsSummary } = useAchievements()

  const [changingCareer, setChangingCareer] = useState(false)

  const progress = getProgress()
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? 'Estudiante'
  const email = user?.email ?? ''

  async function handleSignOut() {
    await signOut()
    resetAuth()
    resetCareer()
    resetSubjects()
    resetAgenda()
    resetSchedule()
    resetStreak()
    resetSessions()
    navigate(ROUTES.LOGIN)
  }

  async function handleChangeCareer() {
    if (!user) return
    setChangingCareer(true)
    await supabase.from('users').update({ active_career_id: null }).eq('id', user.id)
    resetCareer()
    resetSubjects()
    navigate(ROUTES.ONBOARDING)
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-20 md:pb-6 md:ml-56">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-text-primary">Perfil</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* Info del usuario */}
        <div className="bg-bg-surface rounded-2xl border border-muted/30 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-accent">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-text-primary truncate">{displayName}</p>
              <p className="text-sm text-text-secondary truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Info de carrera */}
        <div className="bg-bg-surface rounded-2xl border border-muted/30 p-5 space-y-3">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Carrera actual
          </p>
          <div>
            <p className="text-sm font-semibold text-text-primary">{activeCareer?.name}</p>
            <p className="text-xs text-text-secondary mt-0.5">{activeCareer?.university?.name}</p>
          </div>

          {progress.total > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-muted/30">
              <div className="text-center">
                <p className="text-lg font-bold text-success">{progress.approved}</p>
                <p className="text-xs text-text-secondary">Aprobadas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-accent">{progress.inProgress}</p>
                <p className="text-xs text-text-secondary">Cursando</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-text-primary">{progress.percentComplete}%</p>
                <p className="text-xs text-text-secondary">Completada</p>
              </div>
            </div>
          )}
        </div>

        {/* Logros */}
        <div className="bg-bg-surface rounded-2xl border border-muted/30 p-5">
          <AchievementsGallery summary={achievementsSummary} />
        </div>

        {/* Acciones */}
        <div className="bg-bg-surface rounded-2xl border border-muted/30 overflow-hidden divide-y divide-muted/30">
          <button
            onClick={handleChangeCareer}
            disabled={changingCareer}
            className="w-full px-5 py-4 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors flex items-center justify-between disabled:opacity-50"
          >
            <span>{changingCareer ? 'Cambiando…' : 'Cambiar carrera'}</span>
            <span className="text-text-secondary">→</span>
          </button>
          <button
            onClick={() => navigate('/importar-plan')}
            className="w-full px-5 py-4 text-left text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors flex items-center justify-between"
          >
            <span>Importar plan de estudios (PDF)</span>
            <span className="text-text-secondary">→</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full px-5 py-4 text-left text-sm font-medium text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-between"
          >
            <span>Cerrar sesión</span>
            <span className="text-red-400/60">→</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
