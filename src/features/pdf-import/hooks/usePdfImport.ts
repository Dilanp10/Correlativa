import { create } from 'zustand'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useCareerStore } from '@/features/career/store/careerStore'
import { parsePdf, saveSubjects } from '@/features/pdf-import/api/parseStudyPlan'
import type { SubjectDraft } from '@/features/pdf-import/lib/types'

export type ImportPhase = 'idle' | 'parsing' | 'preview' | 'saving' | 'done' | 'error'

interface PdfImportState {
  phase: ImportPhase
  subjects: SubjectDraft[]
  parseWarning: string | null
  error: string | null
  inserted: number
  skipped: number
  correlativesLinked: number
  correlativesUnresolved: string[]

  parse(file: File): Promise<void>
  save(): Promise<void>
  reset(): void
  updateSubject(index: number, patch: Partial<SubjectDraft>): void
  removeSubject(index: number): void
  addSubject(year: number | null): void
}

const INITIAL = {
  phase: 'idle' as ImportPhase,
  subjects: [] as SubjectDraft[],
  parseWarning: null as string | null,
  error: null as string | null,
  inserted: 0,
  skipped: 0,
  correlativesLinked: 0,
  correlativesUnresolved: [] as string[],
}

const usePdfImportStore = create<PdfImportState>((set, get) => ({
  ...INITIAL,

  async parse(file) {
    set({ ...INITIAL, phase: 'parsing' })

    const result = await parsePdf(file)

    if (!result.ok) {
      set({ phase: 'error', error: result.message })
      return
    }

    if (result.subjects.length === 0) {
      set({
        phase: 'error',
        error: 'No encontramos materias en el PDF. Probá con otro archivo.',
      })
      return
    }

    set({
      phase: 'preview',
      subjects: result.subjects,
      parseWarning: result.warning,
      error: null,
    })
  },

  async save() {
    const { subjects, phase } = get()
    if (phase !== 'preview' || subjects.length === 0) return

    const careerId = useCareerStore.getState().activeCareer?.id
    if (!careerId) {
      set({ phase: 'error', error: 'No hay carrera activa.' })
      return
    }

    set({ phase: 'saving', error: null })

    const result = await saveSubjects(careerId, subjects)

    if (!result.ok) {
      set({ phase: 'error', error: result.message })
      return
    }

    // Forzar recarga del subjectsStore para que el árbol vea las nuevas materias.
    useSubjectsStore.getState().reset()

    set({
      phase: 'done',
      inserted: result.inserted,
      skipped: result.skipped,
      correlativesLinked: result.correlativesLinked,
      correlativesUnresolved: result.correlativesUnresolved,
    })
  },

  reset() {
    set({ ...INITIAL })
  },

  updateSubject(index, patch) {
    const { subjects } = get()
    if (index < 0 || index >= subjects.length) return
    const next = subjects.slice()
    next[index] = { ...next[index], ...patch }
    set({ subjects: next })
  },

  removeSubject(index) {
    const { subjects } = get()
    if (index < 0 || index >= subjects.length) return
    set({ subjects: subjects.filter((_, i) => i !== index) })
  },

  addSubject(year) {
    const { subjects } = get()
    set({
      subjects: [
        ...subjects,
        {
          name: '',
          year,
          semester: 1,
          correlativeNames: [],
          confidence: 'low',
        },
      ],
    })
  },
}))

export function usePdfImport() {
  return usePdfImportStore()
}
