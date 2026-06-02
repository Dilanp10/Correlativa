import { motion, AnimatePresence } from 'framer-motion'
import type { Question, Answer } from '@/features/study/lib/quiz'
import { isAnswerCorrect } from '@/features/study/lib/quiz'

interface Props {
  question: Question
  index: number
  total: number
  answered: Answer
  onAnswer: (value: number | boolean) => void
  onNext: () => void
  isLast: boolean
}

export default function QuizQuestion({
  question,
  index,
  total,
  answered,
  onAnswer,
  onNext,
  isLast,
}: Props) {
  const hasAnswered = answered !== null
  const correct = hasAnswered ? isAnswerCorrect(question, answered) : false

  return (
    <motion.div
      key={index}
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      {/* Indicador de progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            Pregunta {index + 1} de {total}
          </span>
        </div>
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
      <p className="text-base font-semibold text-text-primary leading-snug">
        {question.question}
      </p>

      {/* Opciones MC */}
      {question.type === 'mc' && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            const isChosen = answered === i
            const isCorrectOpt = i === question.correctIndex

            let className =
              'w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all min-h-[52px]'

            if (!hasAnswered) {
              className += ' bg-bg-surface border-muted/40 text-text-primary hover:border-accent/60 hover:bg-bg-elevated active:scale-[0.98]'
            } else if (isCorrectOpt) {
              className += ' bg-success/15 border-success text-success'
            } else if (isChosen) {
              className += ' bg-red-500/15 border-red-500 text-red-400'
            } else {
              className += ' bg-bg-surface border-muted/20 text-text-secondary opacity-60'
            }

            return (
              <button
                key={i}
                onClick={() => !hasAnswered && onAnswer(i)}
                disabled={hasAnswered}
                className={className}
              >
                <span className="flex items-center justify-between">
                  <span>{opt}</span>
                  {hasAnswered && isCorrectOpt && <span className="text-success">✓</span>}
                  {hasAnswered && isChosen && !isCorrectOpt && <span className="text-red-400">✗</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Opciones TF */}
      {question.type === 'tf' && (
        <div className="flex gap-3">
          {([true, false] as const).map(val => {
            const label = val ? 'Verdadero' : 'Falso'
            const isChosen = answered === val
            const isCorrectOpt = val === question.correctValue

            let className =
              'flex-1 py-3.5 rounded-xl border text-sm font-semibold transition-all min-h-[52px]'

            if (!hasAnswered) {
              className += ' bg-bg-surface border-muted/40 text-text-primary hover:border-accent/60 hover:bg-bg-elevated active:scale-[0.98]'
            } else if (isCorrectOpt) {
              className += ' bg-success/15 border-success text-success'
            } else if (isChosen) {
              className += ' bg-red-500/15 border-red-500 text-red-400'
            } else {
              className += ' bg-bg-surface border-muted/20 text-text-secondary opacity-60'
            }

            return (
              <button
                key={String(val)}
                onClick={() => !hasAnswered && onAnswer(val)}
                disabled={hasAnswered}
                className={className}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`rounded-xl p-4 space-y-1 ${
                correct ? 'bg-success/10 border border-success/30' : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <p className={`text-sm font-semibold ${correct ? 'text-success' : 'text-red-400'}`}>
                {correct ? '¡Correcto!' : 'Incorrecto'}
              </p>
              <p className="text-sm text-text-secondary">{question.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón siguiente */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={onNext}
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
