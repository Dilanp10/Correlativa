import { describe, it, expect } from 'vitest'
import type { Exercise } from './exercise'
import {
  normalizeText,
  parseNumber,
  checkExercise,
  scoreExercises,
  isValidExerciseSet,
} from './exercise'

describe('normalizeText', () => {
  it('saca acentos, mayúsculas y espacios', () => {
    expect(normalizeText('  Derivada ')).toBe('derivada')
    expect(normalizeText('Función')).toBe('funcion')
    expect(normalizeText('ÁRBOL')).toBe('arbol')
  })

  it('saca artículo inicial', () => {
    expect(normalizeText('la derivada')).toBe('derivada')
    expect(normalizeText('El teorema')).toBe('teorema')
  })

  it('saca signos de puntuación', () => {
    expect(normalizeText('¿derivada?')).toBe('derivada')
    expect(normalizeText('O(n).')).toBe('on')
  })
})

describe('parseNumber', () => {
  it('parsea enteros y decimales con punto', () => {
    expect(parseNumber('42')).toBe(42)
    expect(parseNumber('3.14')).toBeCloseTo(3.14)
  })
  it('acepta coma decimal', () => {
    expect(parseNumber('3,14')).toBeCloseTo(3.14)
  })
  it('ignora espacios', () => {
    expect(parseNumber('  10 ')).toBe(10)
  })
  it('devuelve null si no es número', () => {
    expect(parseNumber('hola')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
})

describe('checkExercise — numérico', () => {
  const ex: Exercise = {
    statement: '2+2',
    answerType: 'number',
    expectedNumber: 4,
    solution: 'Sumá 2 y 2.',
  }

  it('acepta valor exacto', () => expect(checkExercise(ex, '4')).toBe(true))
  it('acepta 4.0', () => expect(checkExercise(ex, '4.0')).toBe(true))
  it('rechaza valor distinto', () => expect(checkExercise(ex, '5')).toBe(false))
  it('rechaza texto', () => expect(checkExercise(ex, 'cuatro')).toBe(false))

  it('respeta tolerancia explícita', () => {
    const exTol: Exercise = { ...ex, expectedNumber: 3.14159, tolerance: 0.01 }
    expect(checkExercise(exTol, '3.14')).toBe(true)
    expect(checkExercise(exTol, '3.1')).toBe(false)
  })
})

describe('checkExercise — texto', () => {
  const ex: Exercise = {
    statement: '¿Cómo se llama la operación inversa de la integral?',
    answerType: 'text',
    acceptedAnswers: ['derivada', 'derivación'],
    solution: 'La derivada es la inversa de la integral.',
  }

  it('acepta respuesta exacta', () => expect(checkExercise(ex, 'derivada')).toBe(true))
  it('acepta con artículo y acento', () => expect(checkExercise(ex, 'La Derivación')).toBe(true))
  it('acepta otra forma de la lista', () => expect(checkExercise(ex, 'derivacion')).toBe(true))
  it('rechaza respuesta incorrecta', () => expect(checkExercise(ex, 'integral')).toBe(false))
  it('rechaza vacío', () => expect(checkExercise(ex, '')).toBe(false))
})

describe('scoreExercises', () => {
  const exercises: Exercise[] = [
    { statement: '2+2', answerType: 'number', expectedNumber: 4, solution: '' },
    { statement: 'inversa de integral', answerType: 'text', acceptedAnswers: ['derivada'], solution: '' },
    { statement: '10/2', answerType: 'number', expectedNumber: 5, solution: '' },
    { statement: '3*3', answerType: 'number', expectedNumber: 9, solution: '' },
    { statement: 'derivada de constante', answerType: 'number', expectedNumber: 0, solution: '' },
  ]

  it('todo correcto → perfect', () => {
    const r = scoreExercises(exercises, ['4', 'derivada', '5', '9', '0'], 's1')
    expect(r.correctCount).toBe(5)
    expect(r.isPerfect).toBe(true)
  })

  it('mix → cuenta solo correctas', () => {
    const r = scoreExercises(exercises, ['4', 'integral', '5', '8', '0'], 's1')
    expect(r.correctCount).toBe(3)
    expect(r.isPerfect).toBe(false)
  })

  it('respuestas faltantes cuentan como incorrectas', () => {
    const r = scoreExercises(exercises, ['4'], 's1')
    expect(r.correctCount).toBe(1)
  })
})

describe('isValidExerciseSet', () => {
  const numEx: Exercise = { statement: 'x', answerType: 'number', expectedNumber: 1, solution: 'y' }
  const txtEx: Exercise = { statement: 'x', answerType: 'text', acceptedAnswers: ['a'], solution: 'y' }

  it('set válido → true', () => {
    expect(isValidExerciseSet({ exercises: [numEx, txtEx, numEx, txtEx, numEx] })).toBe(true)
  })
  it('null → false', () => expect(isValidExerciseSet(null)).toBe(false))
  it('cantidad incorrecta → false', () => {
    expect(isValidExerciseSet({ exercises: [numEx, txtEx] })).toBe(false)
  })
  it('numérico sin expectedNumber → false', () => {
    expect(isValidExerciseSet({
      exercises: [{ statement: 'x', answerType: 'number', solution: 'y' }, txtEx, numEx, txtEx, numEx],
    })).toBe(false)
  })
  it('texto sin acceptedAnswers → false', () => {
    expect(isValidExerciseSet({
      exercises: [{ statement: 'x', answerType: 'text', solution: 'y' }, txtEx, numEx, txtEx, numEx],
    })).toBe(false)
  })
})
