import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Exercise } from '@/features/study/lib/exercise'
import { checkExercise } from '@/features/study/lib/exercise'

interface Props {
  exercise: Exercise
  index: number
  total: number
  answer: string
  onAnswerChange: (value: string) => void
  onNext: () => void
  isLast: boolean
}

export default function ExerciseCard({
  exercise,
  index,
  total,
  answer,
  onAnswerChange,
  onNext,
  isLast,
}: Props) {
  const [verified, setVerified] = useState(false)
  const correct = verified ? checkExercise(exercise, answer) : false

  function handleVerify() {
    if (answer.trim() === '') return
    setVerified(true)
  }

  function handleNext() {
    setVerified(false)
    onNext()
  }

  return (
    <motion.div
      key={index}
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      {/* Progreso */}
      <div className="space-y-2">
        <span className="text-xs text-text-secondary">
          Ejercicio {index + 1} de {total}
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < index ? 'bg-accent' : i === index ? 'bg-accent/60' : 'bg-muted/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Enunciado */}
      <p className="text-base font-semibold text-text-primary leading-snug whitespace-pre-wrap">
        {exercise.statement}
      </p>

      {/* Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Tu respuesta
        </label>
        <input
          type="text"
          inputMode={exercise.answerType === 'number' ? 'decimal' : 'text'}
          value={answer}
          onChange={e => onAnswerChange(e.target.value)}
          disabled={verified}
          placeholder={exercise.answerType === 'number' ? 'Ej: 42' : 'Escribí tu respuesta'}
          onKeyDown={e => {
            if (e.key === 'Enter' && !verified) handleVerify()
          }}
          className="w-full bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
        />
      </div>

      {/* Botón verificar */}
      {!verified && (
        <button
          onClick={handleVerify}
          disabled={answer.trim() === ''}
          className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50"
        >
          Verificar
        </button>
      )}

      {/* Feedback con solución */}
      <AnimatePresence>
        {verified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3"
          >
            <div
              className={`rounded-xl p-4 ${
                correct ? 'bg-success/10 border border-success/30' : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <p className={`text-sm font-semibold ${correct ? 'text-success' : 'text-red-400'}`}>
                {correct ? '¡Bien! 🎯' : 'No es correcto'}
              </p>
              {!correct && exercise.answerType === 'number' && exercise.expectedNumber !== undefined && (
                <p className="text-sm text-text-secondary mt-1">
                  Respuesta esperada: <span className="text-text-primary font-medium">{exercise.expectedNumber}</span>
                </p>
              )}
              {!correct && exercise.answerType === 'text' && exercise.acceptedAnswers?.[0] && (
                <p className="text-sm text-text-secondary mt-1">
                  Respuesta esperada: <span className="text-text-primary font-medium">{exercise.acceptedAnswers[0]}</span>
                </p>
              )}
            </div>

            {/* Paso a paso (siempre visible tras verificar) */}
            <div className="rounded-xl bg-bg-elevated border border-muted/40 p-4">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                Cómo se resuelve
              </p>
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {exercise.solution}
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-95 transition-all"
            >
              {isLast ? 'Ver resultado' : 'Siguiente'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
