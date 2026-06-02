import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useCareerStore } from '@/features/career/store/careerStore'
import ProtectedRoute from '@/shared/components/ProtectedRoute'
import CareerRequiredRoute from '@/shared/components/CareerRequiredRoute'

// Carga eager — necesarios para auth flow inicial
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import OnboardingPage from '@/pages/OnboardingPage'

import LevelUpWatcher from '@/features/gamification/components/LevelUpWatcher'
import StreakActivityConsumer from '@/features/streaks/components/StreakActivityConsumer'

// Carga lazy — solo se descargan cuando el usuario navega a esa ruta.
// TreePage incluye @xyflow/react (~250 kB), así no bloquea el primer load.
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TreePage      = lazy(() => import('@/pages/TreePage'))
const AgendaPage    = lazy(() => import('@/pages/AgendaPage'))
const StudyPage     = lazy(() => import('@/pages/StudyPage'))
const ProfilePage   = lazy(() => import('@/pages/ProfilePage'))

async function loadUserCareer(userId: string) {
  const setActiveCareer = useCareerStore.getState().setActiveCareer
  const setCareerLoading = useCareerStore.getState().setLoading

  // Marcamos "cargando" ANTES de leer la base. Si no, el navigate post-login
  // corre antes de que termine esta lectura async y el guard, viendo
  // isLoading=false + activeCareer=null, redirige a onboarding por error.
  setCareerLoading(true)

  const { data: profile } = await supabase
    .from('users')
    .select('active_career_id')
    .eq('id', userId)
    .single()

  if (!profile?.active_career_id) {
    setActiveCareer(null)
    setCareerLoading(false)
    return
  }

  const { data: career } = await supabase
    .from('careers')
    .select('*, university:universities(id, name, short_name)')
    .eq('id', profile.active_career_id)
    .single()

  setActiveCareer(career ?? null)
  setCareerLoading(false)
}

// Fallback minimalista mientras se descarga el chunk lazy
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  const setUser = useAuthStore(s => s.setUser)
  const setSession = useAuthStore(s => s.setSession)
  const setAuthLoading = useAuthStore(s => s.setLoading)
  const resetCareer = useCareerStore(s => s.reset)

  useEffect(() => {
    // Carga inicial de sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user) {
        loadUserCareer(session.user.id)
      } else {
        useCareerStore.getState().setLoading(false)
      }
    })

    // Escuchar cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Diferimos fuera del callback: hacer await de queries de Supabase
        // dentro de onAuthStateChange puede trabar la sesión (deadlock conocido
        // de supabase-js v2, ver docs de onAuthStateChange).
        const userId = session.user.id
        setTimeout(() => loadUserCareer(userId), 0)
      } else {
        resetCareer()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setAuthLoading, resetCareer])

  return (
    <BrowserRouter>
      {/* Watcher global de subida de nivel — se monta una vez y observa
          los stores; solo actúa cuando los datos están cargados. */}
      <LevelUpWatcher />
      {/* Consumer del bus de actividad — actualiza la racha del usuario
          cuando subjects/agenda/futuras features emiten emitActivity(). */}
      <StreakActivityConsumer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CareerRequiredRoute>
                  <DashboardPage />
                </CareerRequiredRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tree"
            element={
              <ProtectedRoute>
                <CareerRequiredRoute>
                  <TreePage />
                </CareerRequiredRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <CareerRequiredRoute>
                  <AgendaPage />
                </CareerRequiredRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudiar"
            element={
              <ProtectedRoute>
                <CareerRequiredRoute>
                  <StudyPage />
                </CareerRequiredRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <CareerRequiredRoute>
                  <ProfilePage />
                </CareerRequiredRoute>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
