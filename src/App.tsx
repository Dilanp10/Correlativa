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

// Carga lazy — solo se descargan cuando el usuario navega a esa ruta.
// TreePage incluye @xyflow/react (~250 kB), así no bloquea el primer load.
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TreePage      = lazy(() => import('@/pages/TreePage'))
const ProfilePage   = lazy(() => import('@/pages/ProfilePage'))

async function loadUserCareer(userId: string) {
  const setActiveCareer = useCareerStore.getState().setActiveCareer
  const setCareerLoading = useCareerStore.getState().setLoading

  console.log('[DEBUG] loadUserCareer → start, userId =', userId)

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_career_id')
    .eq('id', userId)
    .single()

  console.log('[DEBUG] lectura users →', { profile, profileError })

  if (!profile?.active_career_id) {
    console.log('[DEBUG] sin active_career_id → redirige a onboarding')
    setActiveCareer(null)
    setCareerLoading(false)
    return
  }

  const { data: career, error: careerError } = await supabase
    .from('careers')
    .select('*, university:universities(id, name, short_name)')
    .eq('id', profile.active_career_id)
    .single()

  console.log('[DEBUG] lectura careers →', { career, careerError })

  setActiveCareer(career ?? null)
  setCareerLoading(false)
  console.log('[DEBUG] loadUserCareer → fin, activeCareer =', career ?? null)
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
      console.log('[DEBUG] getSession →', session?.user?.id ?? 'sin sesión')
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[DEBUG] onAuthStateChange →', event, session?.user?.id ?? 'sin sesión')
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserCareer(session.user.id)
      } else {
        resetCareer()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setAuthLoading, resetCareer])

  return (
    <BrowserRouter>
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
