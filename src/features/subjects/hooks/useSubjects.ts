import { useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import type { SubjectWithCorrelatives } from '@/shared/types'

export function useSubjects() {
  const user = useAuthStore(s => s.user)
  const activeCareer = useCareerStore(s => s.activeCareer)
  const store = useSubjectsStore()
  // Ref per-instance: prevents double-loading in React Strict Mode without
  // relying on the store's isLoading flag (which gets stuck when the first
  // mount's cleanup cancels setLoading(false)).
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!activeCareer || !user) return
    if (useSubjectsStore.getState().loaded) return
    if (loadingRef.current) return

    loadingRef.current = true
    let cancelled = false

    const load = async () => {
      useSubjectsStore.getState().setLoading(true)

      try {
        const { data: subjectsData, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('career_id', activeCareer.id)
          .order('year')
          .order('semester')

        if (error) throw error
        if (cancelled) return

        const rawSubjects = subjectsData ?? []

        if (rawSubjects.length === 0) {
          useSubjectsStore.getState().setSubjects([])
          useSubjectsStore.getState().setUserSubjects([])
          return
        }

        const subjectIds = rawSubjects.map(s => s.id)

        const [{ data: corrData }, { data: userSubjectsData }] = await Promise.all([
          supabase
            .from('subject_correlatives')
            .select('subject_id, requires_subject_id, type')
            .in('subject_id', subjectIds),
          supabase
            .from('user_subjects')
            .select('*')
            .eq('user_id', user.id)
            .in('subject_id', subjectIds),
        ])

        if (cancelled) return

        const correlatives = corrData ?? []

        const subjectsWithCorr: SubjectWithCorrelatives[] = rawSubjects.map(subject => {
          const own = correlatives.filter(c => c.subject_id === subject.id)
          const requiresCursar = own
            .filter(c => c.type === 'para_cursar')
            .map(c => c.requires_subject_id)
          const requiresRendir = own
            .filter(c => c.type === 'para_rendir')
            .map(c => c.requires_subject_id)
          // Unión sin duplicados (para los edges del árbol).
          const requires = Array.from(new Set(own.map(c => c.requires_subject_id)))

          return {
            ...subject,
            requires,
            requiresCursar,
            requiresRendir,
            unlocks: correlatives
              .filter(c => c.requires_subject_id === subject.id)
              .map(c => c.subject_id),
          }
        })

        useSubjectsStore.getState().setSubjects(subjectsWithCorr)
        useSubjectsStore.getState().setUserSubjects(userSubjectsData ?? [])
      } catch (err) {
        console.error('Error cargando materias:', err)
      } finally {
        // Always reset — never leave isLoading stuck on true.
        loadingRef.current = false
        useSubjectsStore.getState().setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      loadingRef.current = false // allow the next mount to try
    }
  }, [activeCareer?.id, user?.id])

  return {
    subjects: store.subjects,
    userSubjects: store.userSubjects,
    treeStates: store.treeStates,
    isLoading: store.isLoading,
    loaded: store.loaded,
  }
}
