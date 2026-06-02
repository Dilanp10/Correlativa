import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from '@/shared/components/BottomNav'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useStudyStore } from '@/features/study/store/studyStore'
import { useGenerateQuiz } from '@/features/study/hooks/useGenerateQuiz'
import { useStudySessions } from '@/features/study/hooks/useStudySessions'
import SubjectPicker from '@/features/study/components/SubjectPicker'
import QuizQuestion from '@/features/study/components/QuizQuestion'
import QuizSummary from '@/features/study/components/QuizSummary'
import { scoreQuiz } from '@/features/study/lib/quiz'
import { ROUTES } from '@/shared/constants'

export default function StudyPage() {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { generate } = useGenerateQuiz()
  const { insertSession } = useStudySessions()

  const phase = useStudyStore(s => s.phase)
  const selectedSubjectId = useStudyStore(s => s.selectedSubjectId)
  const topic = useStudyStore(s => s.topic)
  const quiz = useStudyStore(s => s.quiz)
  const currentIndex = useStudyStore(s => s.currentIndex)
  const answers = useStudyStore(s => s.answers)
  const result = useStudyStore(s => s.result)
  const error = useStudyStore(s => s.error)
  const setSubjectId = useStudyStore(s => s.setSubjectId)
  const setTopic = useStudyStore(s => s.setTopic)
  const answer = useStudyStore(s => s.answer)
  const next = useStudyStore(s => s.next)
  const finish = useStudyStore(s => s.finish)
  const resetToPicking = useStudyStore(s => s.resetToPicking)

  const streakUpdatedRef = useRef(false)

  // Reset al desmontar (salir de la página)
  useEffect(() => {
    return () => {
      useStudyStore.getState().resetAll()
    }
  }, [])

  async function handleGenerate() {
    if (!selectedSubjectId) return
    await generate(selectedSubjectId, topic)
  }

  async function handleNext() {
    if (!quiz) return
    const isLast = currentIndex === quiz.questions.length - 1

    if (isLast) {
      // Calcular resultado y guardar sesión
      const sessionResult = scoreQuiz(quiz, answers, selectedSubjectId!)
      finish(sessionResult)
      streakUpdatedRef.current = false
      const inserted = await insertSession(sessionResult)
      if (inserted) streakUpdatedRef.current = true
    } else {
      next()
    }
  }

  const isEmpty = subjects.length === 0

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-text-primary">Estudiar</h1>
        {phase === 'picking' && (
          <p className="text-sm text-text-secondary mt-0.5">
            Generá un quiz corto de cualquier materia con IA.
          </p>
        )}
      </div>

      <div className="px-5 flex-1">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center text-center gap-3 pt-16 px-4">
            <p className="text-4xl">📚</p>
            <p className="text-text-primary font-semibold">No tenés materias cargadas</p>
            <p className="text-text-secondary text-sm">
              Cargá tus materias en el árbol para poder generar un quiz.
            </p>
            <button
              onClick={() => navigate(ROUTES.TREE)}
              className="mt-2 bg-accent text-white rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Ir al árbol
            </button>
          </div>
        )}

        {/* Picking */}
        {!isEmpty && phase === 'picking' && (
          <SubjectPicker
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            topic={topic}
            isGenerating={false}
            onSubjectChange={setSubjectId}
            onTopicChange={setTopic}
            onGenerate={handleGenerate}
          />
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center gap-4 pt-20">
            <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-text-primary font-medium">Armando tu quiz...</p>
            <p className="text-text-secondary text-sm">Esto puede tardar unos segundos.</p>
            <button
              onClick={() => resetToPicking(true)}
              className="mt-4 text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && quiz && (
          <AnimatePresence mode="wait">
            <QuizQuestion
              key={currentIndex}
              question={quiz.questions[currentIndex]}
              index={currentIndex}
              total={quiz.questions.length}
              answered={answers[currentIndex] ?? null}
              onAnswer={answer}
              onNext={handleNext}
              isLast={currentIndex === quiz.questions.length - 1}
            />
          </AnimatePresence>
        )}

        {/* Summary */}
        {phase === 'summary' && result && (
          <QuizSummary
            result={result}
            streakUpdated={streakUpdatedRef.current}
            onPlayAgain={() => resetToPicking(true)}
            onBack={() => navigate(ROUTES.DASHBOARD)}
          />
        )}

        {/* Error */}
        {phase === 'error' && error && (
          <div className="flex flex-col items-center text-center gap-4 pt-16 px-4">
            <p className="text-4xl">⚠️</p>
            <p className="text-text-primary font-semibold">Algo salió mal</p>
            <p className="text-text-secondary text-sm">{error.message}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              <button
                onClick={() => resetToPicking(true)}
                className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm active:scale-95 transition-all"
              >
                Reintentar
              </button>
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
