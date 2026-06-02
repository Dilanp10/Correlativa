import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { generateQuiz, generateExercises } from '@/features/study/api/generateQuiz'
import { useStudyStore } from '@/features/study/store/studyStore'
import type { StudyMode } from '@/features/study/lib/exercise'

export function useGenerateQuiz() {
  const { subjects } = useSubjects()

  async function generate(subjectId: string, mode: StudyMode, topic?: string) {
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return

    useStudyStore.getState().startGenerating()

    if (mode === 'exercises') {
      const result = await generateExercises(subject.name, topic?.trim() || undefined)
      if (result.ok) {
        useStudyStore.getState().setExerciseSet(result.exerciseSet)
      } else {
        useStudyStore.getState().setError({ code: result.error, message: result.message })
      }
    } else {
      const result = await generateQuiz(subject.name, topic?.trim() || undefined)
      if (result.ok) {
        useStudyStore.getState().setQuiz(result.quiz)
      } else {
        useStudyStore.getState().setError({ code: result.error, message: result.message })
      }
    }
  }

  return { generate }
}
