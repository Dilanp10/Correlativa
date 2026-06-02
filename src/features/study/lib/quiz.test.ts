import { describe, it, expect } from 'vitest'
import type { McQuestion, TfQuestion } from './quiz'
import { scoreQuiz, isAnswerCorrect, isValidQuiz } from './quiz'

const mc: McQuestion = {
  type: 'mc',
  question: '¿Cuál es la derivada de x²?',
  options: ['x', '2x', 'x²/2', '2'],
  correctIndex: 1,
  explanation: 'La regla de la potencia da 2x.',
}

const tf: TfQuestion = {
  type: 'tf',
  question: 'La derivada de una constante es 0.',
  correctValue: true,
  explanation: 'Las constantes no cambian, su tasa de cambio es 0.',
}

describe('isAnswerCorrect', () => {
  it('MC correcta', () => expect(isAnswerCorrect(mc, 1)).toBe(true))
  it('MC incorrecta', () => expect(isAnswerCorrect(mc, 0)).toBe(false))
  it('TF correcta', () => expect(isAnswerCorrect(tf, true)).toBe(true))
  it('TF incorrecta', () => expect(isAnswerCorrect(tf, false)).toBe(false))
  it('null → false', () => expect(isAnswerCorrect(mc, null)).toBe(false))
})

describe('scoreQuiz', () => {
  const questions = [mc, tf, mc, tf, mc]

  it('todo correcto → isPerfect, correctCount = 5', () => {
    const r = scoreQuiz({ questions }, [1, true, 1, true, 1], 's1')
    expect(r.correctCount).toBe(5)
    expect(r.isPerfect).toBe(true)
    expect(r.totalQuestions).toBe(5)
  })

  it('todo incorrecto → correctCount = 0, no perfect', () => {
    const r = scoreQuiz({ questions }, [0, false, 0, false, 0], 's1')
    expect(r.correctCount).toBe(0)
    expect(r.isPerfect).toBe(false)
  })

  it('mix → cuenta solo correctas', () => {
    const r = scoreQuiz({ questions }, [1, false, 1, true, 0], 's1')
    expect(r.correctCount).toBe(3)
    expect(r.isPerfect).toBe(false)
  })

  it('nulls no cuentan', () => {
    const r = scoreQuiz({ questions }, [null, null, 1, true, 1], 's1')
    expect(r.correctCount).toBe(3)
  })

  it('subjectId se propaga', () => {
    const r = scoreQuiz({ questions }, [1, true, 1, true, 1], 'abc')
    expect(r.subjectId).toBe('abc')
  })
})

describe('isValidQuiz', () => {
  const validQuiz = {
    questions: [mc, tf, mc, tf, mc],
  }

  it('quiz válido → true', () => expect(isValidQuiz(validQuiz)).toBe(true))
  it('null → false', () => expect(isValidQuiz(null)).toBe(false))
  it('menos de 5 preguntas → false', () => {
    expect(isValidQuiz({ questions: [mc, tf] })).toBe(false)
  })
  it('más de 5 preguntas → false', () => {
    expect(isValidQuiz({ questions: [mc, tf, mc, tf, mc, mc] })).toBe(false)
  })
  it('pregunta con tipo inválido → false', () => {
    expect(isValidQuiz({ questions: [{ type: 'x' }, tf, mc, tf, mc] })).toBe(false)
  })
  it('MC con opciones insuficientes → false', () => {
    expect(isValidQuiz({
      questions: [{ ...mc, options: ['a', 'b'] }, tf, mc, tf, mc],
    })).toBe(false)
  })
})
