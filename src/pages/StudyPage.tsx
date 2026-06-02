import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from '@/shared/components/BottomNav'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useStudyStore } from '@/features/study/store/studyStore'
import { useGenerateQuiz } from '@/features/study/hooks/useGenerateQuiz'
import { useStudySessions } from '@/features/study/hooks/useStudySessions'
import SubjectPicker from '@/features/study/components/SubjectPicker'
import ModeToggle from '@/features/study/components/ModeToggle'
import QuizQuestion from '@/features/study/components/QuizQuestion'
import ExerciseCard from '@/features/study/components/ExerciseCard'
import QuizSummary from '@/features/study/components/QuizSummary'
import { scoreQuiz } from '@/features/study/lib/quiz'
import { scoreExercises } from '@/features/study/lib/exercise'
import { ROUTES } from '@/shared/constants'

export default function StudyPage() {
  const navigate = useNavigate()
  const { subjects } = useSubjects()
  const { generate } = useGenerateQuiz()
  const { insertSession } = useStudySessions()

  const phase = useStudyStore(s => s.phase)
  const mode = useStudyStore(s => s.mode)
  const selectedSubjectId = useStudyStore(s => s.selectedSubjectId)
  const topic = useStudyStore(s => s.topic)
  const quiz = useStudyStore(s => s.quiz)
  const exerciseSet = useStudyStore(s => s.exerciseSet)
  const exerciseAnswers = useStudyStore(s => s.exerciseAnswers)
  const currentIndex = useStudyStore(s => s.currentIndex)
  const answers = useStudyStore(s => s.answers)
  const result = useStudyStore(s => s.result)
  const error = useStudyStore(s => s.error)
  const setMode = useStudyStore(s => s.setMode)
  const setSubjectId = useStudyStore(s => s.setSubjectId)
  const setTopic = useStudyStore(s => s.setTopic)
  const answer = useStudyStore(s => s.answer)
  const answerExercise = useStudyStore(s => s.answerExercise)
  const next = useStudyStore(s => s.next)
  const finish = useStudyStore(s => s.finish)
  const resetToPicking = useStudyStore(s => s.resetToPicking)

  const streakUpdatedRef = useRef(false)

  useEffect(() => {
    return () => {
      useStudyStore.getState().resetAll()
    }
  }, [])

  async function handleGenerate() {
    if (!selectedSubjectId) return
    await generate(selectedSubjectId, mode, topic)
  }

  async function persistAndFinish(sessionResult: ReturnType<typeof scoreQuiz>) {
    finish(sessionResult)
    streakUpdatedRef.current = false
    const inserted = await insertSession(sessionResult)
    if (inserted) streakUpdatedRef.current = true
  }

  async function handleNextQuiz() {
    if (!quiz) return
    const isLast = currentIndex === quiz.questions.length - 1
    if (isLast) {
      await persistAndFinish(scoreQuiz(quiz, answers, selectedSubjectId!))
    } else {
      next()
    }
  }

  async function handleNextExercise() {
    if (!exerciseSet) return
    const isLast = currentIndex === exerciseSet.exercises.length - 1
    if (isLast) {
      await persistAndFinish(scoreExercises(exerciseSet.exercises, exerciseAnswers, selectedSubjectId!))
    } else {
      next()
    }
  }

  const isEmpty = subjects.length === 0
  const generatingLabel = mode === 'exercises' ? 'Armando tus ejercicios...' : 'Armando tu quiz...'

  return (
    <div className="min-h-screen bg-bg-base flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-text-primary">Estudiar</h1>
        {phase === 'picking' && (
          <p className="text-sm text-text-secondary mt-0.5">
            {mode === 'exercises'
              ? 'Resolvé ejercicios generados por IA y aprendé el paso a paso.'
              : 'Generá un quiz corto de cualquier materia con IA.'}
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
              Cargá tus materias en el árbol para poder estudiar.
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
          <div className="flex flex-col gap-5">
            <ModeToggle mode={mode} onChange={setMode} />
            <SubjectPicker
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
              topic={topic}
              isGenerating={false}
              onSubjectChange={setSubjectId}
              onTopicChange={setTopic}
              onGenerate={handleGenerate}
              generateLabel={mode === 'exercises' ? 'Generar ejercicios' : 'Generar quiz'}
            />
          </div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center gap-4 pt-20">
            <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-text-primary font-medium">{generatingLabel}</p>
            <p className="text-text-secondary text-sm">Esto puede tardar unos segundos.</p>
            <button
              onClick={() => resetToPicking(true)}
              className="mt-4 text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Playing — Quiz */}
        {phase === 'playing' && mode === 'quiz' && quiz && (
          <AnimatePresence mode="wait">
            <QuizQuestion
              key={currentIndex}
              question={quiz.questions[currentIndex]}
              index={currentIndex}
              total={quiz.questions.length}
              answered={answers[currentIndex] ?? null}
              onAnswer={answer}
              onNext={handleNextQuiz}
              isLast={currentIndex === quiz.questions.length - 1}
            />
          </AnimatePresence>
        )}

        {/* Playing — Ejercicios */}
        {phase === 'playing' && mode === 'exercises' && exerciseSet && (
          <AnimatePresence mode="wait">
            <ExerciseCard
              key={currentIndex}
              exercise={exerciseSet.exercises[currentIndex]}
              index={currentIndex}
              total={exerciseSet.exercises.length}
              answer={exerciseAnswers[currentIndex] ?? ''}
              onAnswerChange={v => answerExercise(currentIndex, v)}
              onNext={handleNextExercise}
              isLast={currentIndex === exerciseSet.exercises.length - 1}
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
