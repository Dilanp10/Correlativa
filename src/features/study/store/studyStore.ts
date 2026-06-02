import { create } from 'zustand'
import type { Quiz, Answer, SessionResult } from '@/features/study/lib/quiz'
import type { GenerateQuizError } from '@/features/study/api/generateQuiz'

export type StudyPhase = 'picking' | 'generating' | 'playing' | 'summary' | 'error'

interface StudyStore {
  phase: StudyPhase

  // Inputs del picking
  selectedSubjectId: string | null
  topic: string

  // Quiz en curso
  quiz: Quiz | null
  currentIndex: number
  answers: Answer[]

  // Resultado al terminar
  result: SessionResult | null

  // Error si phase === 'error'
  error: { code: GenerateQuizError; message: string } | null

  // Setters / acciones
  setSubjectId(id: string | null): void
  setTopic(t: string): void
  startGenerating(): void
  setQuiz(q: Quiz): void
  setError(e: { code: GenerateQuizError; message: string }): void
  answer(value: number | boolean): void
  next(): void
  finish(result: SessionResult): void
  resetToPicking(keepSubject?: boolean): void
  resetAll(): void
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  phase: 'picking',
  selectedSubjectId: null,
  topic: '',
  quiz: null,
  currentIndex: 0,
  answers: [],
  result: null,
  error: null,

  setSubjectId(id) {
    set({ selectedSubjectId: id })
  },

  setTopic(t) {
    set({ topic: t })
  },

  startGenerating() {
    set({ phase: 'generating', quiz: null, currentIndex: 0, answers: [], result: null, error: null })
  },

  setQuiz(q) {
    set({ quiz: q, phase: 'playing', answers: Array(q.questions.length).fill(null) })
  },

  setError(e) {
    set({ phase: 'error', error: e })
  },

  answer(value) {
    const { currentIndex, answers } = get()
    // Bloquea si ya respondió esta pregunta
    if (answers[currentIndex] !== null) return
    const updated = [...answers]
    updated[currentIndex] = value
    set({ answers: updated })
  },

  next() {
    const { currentIndex, quiz } = get()
    if (!quiz) return
    const nextIndex = currentIndex + 1
    if (nextIndex < quiz.questions.length) {
      set({ currentIndex: nextIndex })
    }
    // Si es la última pregunta, StudyPage llama a finish() tras ver el resultado
  },

  finish(result) {
    set({ phase: 'summary', result })
  },

  resetToPicking(keepSubject = true) {
    const { selectedSubjectId } = get()
    set({
      phase: 'picking',
      quiz: null,
      currentIndex: 0,
      answers: [],
      result: null,
      error: null,
      topic: '',
      selectedSubjectId: keepSubject ? selectedSubjectId : null,
    })
  },

  resetAll() {
    set({
      phase: 'picking',
      selectedSubjectId: null,
      topic: '',
      quiz: null,
      currentIndex: 0,
      answers: [],
      result: null,
      error: null,
    })
  },
}))
