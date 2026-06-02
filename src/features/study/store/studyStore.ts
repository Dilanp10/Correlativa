import { create } from 'zustand'
import type { Quiz, Answer, SessionResult } from '@/features/study/lib/quiz'
import type { ExerciseSet, StudyMode } from '@/features/study/lib/exercise'
import type { GenerateQuizError } from '@/features/study/api/generateQuiz'

export type StudyPhase = 'picking' | 'generating' | 'playing' | 'summary' | 'error'

interface StudyStore {
  phase: StudyPhase
  mode: StudyMode

  // Inputs del picking
  selectedSubjectId: string | null
  topic: string

  // Quiz en curso (mode === 'quiz')
  quiz: Quiz | null
  answers: Answer[]

  // Ejercicios en curso (mode === 'exercises')
  exerciseSet: ExerciseSet | null
  exerciseAnswers: string[]

  currentIndex: number
  result: SessionResult | null
  error: { code: GenerateQuizError; message: string } | null

  // Setters / acciones
  setMode(m: StudyMode): void
  setSubjectId(id: string | null): void
  setTopic(t: string): void
  startGenerating(): void
  setQuiz(q: Quiz): void
  setExerciseSet(s: ExerciseSet): void
  setError(e: { code: GenerateQuizError; message: string }): void
  answer(value: number | boolean): void
  answerExercise(index: number, value: string): void
  next(): void
  finish(result: SessionResult): void
  resetToPicking(keepSubject?: boolean): void
  resetAll(): void
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  phase: 'picking',
  mode: 'quiz',
  selectedSubjectId: null,
  topic: '',
  quiz: null,
  answers: [],
  exerciseSet: null,
  exerciseAnswers: [],
  currentIndex: 0,
  result: null,
  error: null,

  setMode(m) {
    set({ mode: m })
  },

  setSubjectId(id) {
    set({ selectedSubjectId: id })
  },

  setTopic(t) {
    set({ topic: t })
  },

  startGenerating() {
    set({
      phase: 'generating',
      quiz: null,
      answers: [],
      exerciseSet: null,
      exerciseAnswers: [],
      currentIndex: 0,
      result: null,
      error: null,
    })
  },

  setQuiz(q) {
    set({ quiz: q, phase: 'playing', answers: Array(q.questions.length).fill(null) })
  },

  setExerciseSet(s) {
    set({
      exerciseSet: s,
      phase: 'playing',
      exerciseAnswers: Array(s.exercises.length).fill(''),
    })
  },

  setError(e) {
    set({ phase: 'error', error: e })
  },

  answer(value) {
    const { currentIndex, answers } = get()
    if (answers[currentIndex] !== null) return
    const updated = [...answers]
    updated[currentIndex] = value
    set({ answers: updated })
  },

  answerExercise(index, value) {
    const updated = [...get().exerciseAnswers]
    updated[index] = value
    set({ exerciseAnswers: updated })
  },

  next() {
    const { currentIndex, mode, quiz, exerciseSet } = get()
    const total = mode === 'quiz' ? quiz?.questions.length ?? 0 : exerciseSet?.exercises.length ?? 0
    const nextIndex = currentIndex + 1
    if (nextIndex < total) set({ currentIndex: nextIndex })
  },

  finish(result) {
    set({ phase: 'summary', result })
  },

  resetToPicking(keepSubject = true) {
    const { selectedSubjectId, mode } = get()
    set({
      phase: 'picking',
      mode, // conserva el modo elegido
      quiz: null,
      answers: [],
      exerciseSet: null,
      exerciseAnswers: [],
      currentIndex: 0,
      result: null,
      error: null,
      topic: '',
      selectedSubjectId: keepSubject ? selectedSubjectId : null,
    })
  },

  resetAll() {
    set({
      phase: 'picking',
      mode: 'quiz',
      selectedSubjectId: null,
      topic: '',
      quiz: null,
      answers: [],
      exerciseSet: null,
      exerciseAnswers: [],
      currentIndex: 0,
      result: null,
      error: null,
    })
  },
}))
