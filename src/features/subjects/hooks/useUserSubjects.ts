import { useAuthStore } from '@/features/auth/store/authStore'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { supabase } from '@/shared/lib/supabase/client'
import type { SubjectStatus } from '@/shared/types'

export function useUserSubjects() {
  const user = useAuthStore(s => s.user)
  const store = useSubjectsStore()

  async function updateStatus(
    subjectId: string,
    status: SubjectStatus,
    grade: number | null = null
  ) {
    if (!user) return

    const prev = store.getUserSubject(subjectId)
    store.optimisticUpdate(subjectId, status, grade)

    try {
      const { error } = await supabase
        .from('user_subjects')
        .upsert(
          {
            user_id: user.id,
            subject_id: subjectId,
            status,
            grade,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,subject_id' }
        )

      if (error) throw error
    } catch (err) {
      console.error('Error actualizando estado de materia:', err)
      store.rollbackUpdate(subjectId, prev)
    }
  }

  return { updateStatus }
}
