import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useStreakStore } from '@/features/streaks/store/streakStore'
import { applyActivity, computeDisplayStreak, todayLocal } from '@/features/streaks/lib/streak'
import type { StreakState } from '@/shared/types'

export interface UseStreakResult {
  display: number
  raw: StreakState
  loaded: boolean
  recordActivity: () => Promise<void>
}

export function useStreak(): UseStreakResult {
  const user = useAuthStore(s => s.user)
  const state = useStreakStore(s => s.state)
  const loaded = useStreakStore(s => s.loaded)
  const loadingRef = useRef(false)

  // Carga inicial (con guard tipo Strict Mode).
  useEffect(() => {
    if (!user) return
    if (useStreakStore.getState().loaded) return
    if (loadingRef.current) return

    loadingRef.current = true
    let cancelled = false

    const load = async () => {
      useStreakStore.getState().setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('last_active_date, current_streak, freeze_used_month')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (cancelled || !data) return

        useStreakStore.getState().setState({
          lastActiveDate: data.last_active_date ?? null,
          currentStreak: data.current_streak ?? 0,
          freezeUsedMonth: data.freeze_used_month ?? null,
        })
      } catch (err) {
        console.error('Error cargando racha:', err)
      } finally {
        loadingRef.current = false
        useStreakStore.getState().setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      loadingRef.current = false
    }
  }, [user?.id])

  const recordActivity = useCallback(async () => {
    if (!user) return
    const current = useStreakStore.getState().state
    const next = applyActivity(current, todayLocal())
    if (next === null) return

    // Optimistic update
    useStreakStore.getState().setState(next)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          last_active_date: next.lastActiveDate,
          current_streak: next.currentStreak,
          freeze_used_month: next.freezeUsedMonth,
        })
        .eq('id', user.id)
      if (error) throw error
    } catch (err) {
      console.error('Error persistiendo racha:', err)
      useStreakStore.getState().setState(current)
    }
  }, [user?.id])

  return {
    display: loaded ? computeDisplayStreak(state, todayLocal()) : 0,
    raw: state,
    loaded,
    recordActivity,
  }
}
