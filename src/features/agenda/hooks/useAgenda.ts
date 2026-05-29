import { useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useAgendaStore } from '@/features/agenda/store/agendaStore'
import { emitActivity } from '@/shared/lib/userActivityBus'
import type { AgendaEvent, AgendaEventType } from '@/shared/types'

export interface AgendaEventInput {
  type: AgendaEventType
  title: string
  subject_id: string | null
  due_at: string
  all_day: boolean
  notes: string | null
}

export function useAgenda() {
  const user = useAuthStore(s => s.user)
  const store = useAgendaStore()
  // Ref per-instance para evitar doble carga en React Strict Mode.
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (useAgendaStore.getState().loaded) return
    if (loadingRef.current) return

    loadingRef.current = true
    let cancelled = false

    const load = async () => {
      useAgendaStore.getState().setLoading(true)
      try {
        const { data, error } = await supabase
          .from('agenda_events')
          .select('*')
          .eq('user_id', user.id)
          .order('due_at', { ascending: true })

        if (error) throw error
        if (cancelled) return

        useAgendaStore.getState().setEvents(data ?? [])
      } catch (err) {
        console.error('Error cargando agenda:', err)
      } finally {
        loadingRef.current = false
        useAgendaStore.getState().setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      loadingRef.current = false
    }
  }, [user?.id])

  async function createEvent(input: AgendaEventInput) {
    if (!user) return
    const now = new Date().toISOString()
    const tempId = `optimistic-${crypto.randomUUID()}`

    const optimistic: AgendaEvent = {
      id: tempId,
      user_id: user.id,
      subject_id: input.subject_id,
      type: input.type,
      title: input.title,
      notes: input.notes,
      due_at: input.due_at,
      all_day: input.all_day,
      completed: false,
      created_at: now,
      updated_at: now,
    }
    store.upsertLocal(optimistic)

    try {
      const { data, error } = await supabase
        .from('agenda_events')
        .insert({
          user_id: user.id,
          subject_id: input.subject_id,
          type: input.type,
          title: input.title,
          notes: input.notes,
          due_at: input.due_at,
          all_day: input.all_day,
        })
        .select('*')
        .single()

      if (error) throw error
      // Reemplazamos el temp por la fila real (con id definitivo del server).
      store.replaceLocal(tempId, data)
    } catch (err) {
      console.error('Error creando evento:', err)
      store.removeLocal(tempId)
    }
  }

  async function updateEvent(
    id: string,
    patch: Partial<AgendaEventInput> & { completed?: boolean }
  ): Promise<boolean> {
    const prev = store.getById(id)
    if (!prev) return false

    const optimistic: AgendaEvent = { ...prev, ...patch, updated_at: new Date().toISOString() }
    store.upsertLocal(optimistic)

    try {
      const { error } = await supabase.from('agenda_events').update(patch).eq('id', id)
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error actualizando evento:', err)
      store.upsertLocal(prev)
      return false
    }
  }

  async function toggleComplete(id: string) {
    const ev = store.getById(id)
    if (!ev) return
    const newCompleted = !ev.completed
    const ok = await updateEvent(id, { completed: newCompleted })
    // Solo cuenta como actividad cuando se MARCA como hecho (no al desmarcar).
    if (ok && newCompleted) emitActivity()
  }

  async function deleteEvent(id: string) {
    const prev = store.getById(id)
    if (!prev) return
    store.removeLocal(id)

    try {
      const { error } = await supabase.from('agenda_events').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error eliminando evento:', err)
      store.upsertLocal(prev)
    }
  }

  return {
    events: store.events,
    isLoading: store.isLoading,
    loaded: store.loaded,
    createEvent,
    updateEvent,
    toggleComplete,
    deleteEvent,
  }
}
