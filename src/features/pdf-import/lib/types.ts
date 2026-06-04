// Tipos del cliente para la feature de importación de plan de estudios.
// Definidos según specs/007-importar-plan-pdf/contracts/parse-study-plan.contract.md.

export type PdfImportError =
  | 'invalid_file'
  | 'invalid_input'
  | 'unauthorized'
  | 'no_subjects_found'
  | 'rate_limit'
  | 'ai_invalid_response'
  | 'network'
  | 'internal'

export interface SubjectDraft {
  name: string
  year: number | null
  semester: number | null
  correlativeNames: string[]
  confidence: 'high' | 'low'
}

export interface ParseResult {
  ok: true
  subjects: SubjectDraft[]
  partial: boolean
  warning: string | null
}

export interface SaveResult {
  ok: true
  inserted: number
  skipped: number
  correlativesLinked: number
  correlativesUnresolved: string[]
}

export interface PdfImportFailure {
  ok: false
  error: PdfImportError
  message: string
}

export type ParseResponse = ParseResult | PdfImportFailure
export type SaveResponse = SaveResult | PdfImportFailure
