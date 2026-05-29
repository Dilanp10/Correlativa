import { useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useScheduleStore } from '@/features/agenda/store/scheduleStore'
import type { ClassSchedule } from '@/shared/types'

export interface ScheduleInput {
  subject_id: string
  weekday: number
  start_time: string
  end_time: string
}

export function useClassSchedule() {
  const user = useAuthStore(s => s.user)
  const store = useScheduleStore()
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (useScheduleStore.getState().loaded) return
    if (loadingRef.current) return

    loadingRef.current = true
    let cancelled = false

    const load = async () => {
      useScheduleStore.getState().setLoading(true)
      try {
        const { data, error } = await supabase
          .from('class_schedule')
          .select('*')
          .eq('user_id', user.id)

        if (error) throw error
        if (cancelled) return

        useScheduleStore.getState().setSlots(data ?? [])
      } catch (err) {
        console.error('Error cargando horario:', err)
      } finally {
        loadingRef.current = false
        useScheduleStore.getState().setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      loadingRef.current = false
    }
  }, [user?.id])

  async function createSlot(input: ScheduleInput) {
    if (!user) return
    const tempId = `optimistic-${crypto.randomUUID()}`
    const optimistic: ClassSchedule = {
      id: tempId,
      user_id: user.id,
      subject_id: input.subject_id,
      weekday: input.weekday,
      start_time: input.start_time,
      end_time: input.end_time,
      created_at: new Date().toISOString(),
    }
    store.upsertLocal(optimistic)

    try {
      const { data, error } = await supabase
        .from('class_schedule')
        .insert({
          user_id: user.id,
          subject_id: input.subject_id,
          weekday: input.weekday,
          start_time: input.start_time,
          end_time: input.end_time,
        })
        .select('*')
        .single()

      if (error) throw error
      store.replaceLocal(tempId, data)
    } catch (err) {
      console.error('Error creando bloque de horario:', err)
      store.removeLocal(tempId)
    }
  }

  async function updateSlot(id: string, patch: Partial<ScheduleInput>) {
    const prev = store.getById(id)
    if (!prev) return
    store.upsertLocal({ ...prev, ...patch })

    try {
      const { error } = await supabase.from('class_schedule').update(patch).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error actualizando bloque de horario:', err)
      store.upsertLocal(prev)
    }
  }

  async function deleteSlot(id: string) {
    const prev = store.getById(id)
    if (!prev) return
    store.removeLocal(id)

    try {
      const { error } = await supabase.from('class_schedule').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error eliminando bloque de horario:', err)
      store.upsertLocal(prev)
    }
  }

  return {
    slots: store.slots,
    isLoading: store.isLoading,
    loaded: store.loaded,
    createSlot,
    updateSlot,
    deleteSlot,
  }
}
