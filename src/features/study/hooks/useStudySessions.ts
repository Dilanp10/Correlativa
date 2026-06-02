import { useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useSessionsStore } from '@/features/study/store/sessionsStore'
import { emitActivity } from '@/shared/lib/userActivityBus'
import type { SessionResult } from '@/features/study/lib/quiz'
import type { UserStudySession } from '@/shared/types'

export function useStudySessions() {
  const user = useAuthStore(s => s.user)
  const store = useSessionsStore()
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (useSessionsStore.getState().loaded) return
    if (loadingRef.current) return

    loadingRef.current = true
    let cancelled = false

    const load = async () => {
      useSessionsStore.getState().setLoading(true)
      try {
        const { data, error } = await supabase
          .from('user_study_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

        if (error) throw error
        if (cancelled) return
        useSessionsStore.getState().setSessions(data ?? [])
      } catch (err) {
        console.error('Error cargando sesiones de estudio:', err)
      } finally {
        loadingRef.current = false
        useSessionsStore.getState().setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      loadingRef.current = false
    }
  }, [user?.id])

  async function insertSession(result: SessionResult): Promise<UserStudySession | null> {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('user_study_sessions')
        .insert({
          user_id: user.id,
          subject_id: result.subjectId,
          correct_count: result.correctCount,
          total_questions: result.totalQuestions,
        })
        .select('*')
        .single()

      if (error) throw error

      useSessionsStore.getState().upsertLocal(data)
      // Actividad válida para la racha 🔥
      emitActivity()
      return data
    } catch (err) {
      console.error('Error guardando sesión de estudio:', err)
      return null
    }
  }

  return {
    sessions: store.sessions,
    loaded: store.loaded,
    insertSession,
  }
}
