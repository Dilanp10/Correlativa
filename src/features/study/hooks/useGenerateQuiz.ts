import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { generateQuiz } from '@/features/study/api/generateQuiz'
import { useStudyStore } from '@/features/study/store/studyStore'

export function useGenerateQuiz() {
  const { subjects } = useSubjects()

  async function generate(subjectId: string, topic?: string) {
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return

    useStudyStore.getState().startGenerating()

    const result = await generateQuiz(subject.name, topic?.trim() || undefined)

    if (result.ok) {
      useStudyStore.getState().setQuiz(result.quiz)
    } else {
      useStudyStore.getState().setError({ code: result.error, message: result.message })
    }
  }

  return { generate }
}
