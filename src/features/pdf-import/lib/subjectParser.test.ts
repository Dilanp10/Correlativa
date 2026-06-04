import { describe, it, expect } from 'vitest'
import {
  validateSubjectDraft,
  isValidParseResult,
  normalizeParseResult,
} from './subjectParser'

describe('validateSubjectDraft', () => {
  it('valida una materia completa', () => {
    const result = validateSubjectDraft({
      name: 'Análisis Matemático I',
      year: 1,
      semester: 1,
      correlativeNames: [],
      confidence: 'high',
    })
    expect(result).toEqual({
      name: 'Análisis Matemático I',
      year: 1,
      semester: 1,
      correlativeNames: [],
      confidence: 'high',
    })
  })

  it('devuelve null si no hay nombre', () => {
    expect(validateSubjectDraft({ year: 1, semester: 1 })).toBeNull()
    expect(validateSubjectDraft({ name: '' })).toBeNull()
    expect(validateSubjectDraft({ name: '   ' })).toBeNull()
  })

  it('admite year y semester null', () => {
    const result = validateSubjectDraft({
      name: 'Materia',
      year: null,
      semester: null,
      correlativeNames: [],
    })
    expect(result?.year).toBeNull()
    expect(result?.semester).toBeNull()
    expect(result?.confidence).toBe('low')
  })

  it('parsea year/semester desde string', () => {
    const result = validateSubjectDraft({
      name: 'Materia',
      year: '2',
      semester: '1',
      correlativeNames: [],
    })
    expect(result?.year).toBe(2)
    expect(result?.semester).toBe(1)
  })

  it('marca confidence high cuando hay año y semestre', () => {
    const result = validateSubjectDraft({
      name: 'Materia',
      year: 1,
      semester: 2,
      correlativeNames: [],
    })
    expect(result?.confidence).toBe('high')
  })

  it('marca confidence low cuando falta año o semestre', () => {
    const result = validateSubjectDraft({ name: 'X', year: null, semester: 1 })
    expect(result?.confidence).toBe('low')
  })

  it('correlativeNames vacío por defecto', () => {
    const result = validateSubjectDraft({ name: 'Materia' })
    expect(result?.correlativeNames).toEqual([])
  })

  it('filtra correlativeNames vacíos o no-string', () => {
    const result = validateSubjectDraft({
      name: 'Materia',
      correlativeNames: ['Algebra', '', null, 42, '  ', 'Análisis'],
    })
    expect(result?.correlativeNames).toEqual(['Algebra', 'Análisis'])
  })

  it('devuelve null para inputs basura', () => {
    expect(validateSubjectDraft(null)).toBeNull()
    expect(validateSubjectDraft('string')).toBeNull()
    expect(validateSubjectDraft(42)).toBeNull()
    expect(validateSubjectDraft([])).toBeNull()
  })
})

describe('isValidParseResult', () => {
  it('acepta shape con subjects array', () => {
    expect(isValidParseResult({ subjects: [] })).toBe(true)
    expect(isValidParseResult({ subjects: [{ name: 'x' }], partial: false })).toBe(true)
  })

  it('rechaza shape inválido', () => {
    expect(isValidParseResult(null)).toBe(false)
    expect(isValidParseResult({})).toBe(false)
    expect(isValidParseResult({ subjects: 'no array' })).toBe(false)
  })
})

describe('normalizeParseResult', () => {
  it('normaliza una respuesta completa', () => {
    const result = normalizeParseResult({
      subjects: [
        { name: 'A', year: 1, semester: 1, correlativeNames: [] },
        { name: 'B', year: 2, semester: 1, correlativeNames: ['A'] },
      ],
      partial: false,
      warning: null,
    })
    expect(result?.ok).toBe(true)
    expect(result?.subjects).toHaveLength(2)
    expect(result?.partial).toBe(false)
    expect(result?.warning).toBeNull()
  })

  it('descarta materias inválidas y mantiene las válidas', () => {
    const result = normalizeParseResult({
      subjects: [
        { name: 'A' },
        { year: 1 }, // sin nombre → descartada
        { name: 'B', year: 2 },
      ],
    })
    expect(result?.subjects.map(s => s.name)).toEqual(['A', 'B'])
  })

  it('devuelve null si el shape es inválido', () => {
    expect(normalizeParseResult(null)).toBeNull()
    expect(normalizeParseResult({})).toBeNull()
  })

  it('normaliza warning string vacío a null', () => {
    const result = normalizeParseResult({ subjects: [], warning: '   ' })
    expect(result?.warning).toBeNull()
  })

  it('defaultea partial a false si no viene', () => {
    const result = normalizeParseResult({ subjects: [] })
    expect(result?.partial).toBe(false)
  })
})
