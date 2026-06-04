# Contrato: Edge Function `parse-study-plan`

Una sola Edge Function maneja dos acciones:
1. `parse`: recibe el PDF y devuelve las materias detectadas.
2. `save`: recibe las materias confirmadas y las inserta en la DB.

---

## HTTP Contract

**URL**: `https://<project>.supabase.co/functions/v1/parse-study-plan`
**Método**: `POST`
**Auth**: `Bearer <supabase_jwt>` (igual que `generate-quiz`)
**Verify JWT**: desactivado en dashboard (mismo patrón que `generate-quiz`; el
Edge Function valida el JWT manualmente para el `save` — protege el insert).
**CORS**: `Access-Control-Allow-Origin: *` con los headers del patrón ya existente.

---

## Acción 1: `parse`

### Request
```
Content-Type: multipart/form-data
Body:
  action: "parse"
  file: <PDF binary>     ← máximo 5 MB
```

### Response 200
```ts
{
  subjects: Array<{
    name: string
    year: number | null
    semester: number | null
    correlativeNames: string[]
    confidence: 'high' | 'low'
  }>
  partial: boolean
  warning: string | null
}
```

### Errores
| Status | Error | Causa |
|---|---|---|
| 400 | `invalid_file` | No es PDF o supera 5 MB |
| 422 | `no_subjects_found` | El PDF no contiene materias detectables |
| 429 | `rate_limit` | GitHub Models devolvió rate limit |
| 502 | `ai_invalid_response` | La IA devolvió JSON inválido tras reintento |
| 500 | `internal` | Error inesperado |

---

## Acción 2: `save`

### Request
```ts
Content-Type: application/json
Body: {
  action: "save"
  careerId: string
  subjects: Array<{
    name: string
    year: number | null
    semester: number | null
    correlativeNames: string[]
  }>
}
```

### Response 200
```ts
{
  inserted: number
  skipped: number
  correlativesLinked: number
  correlativesUnresolved: string[]
}
```

### Errores
| Status | Error | Causa |
|---|---|---|
| 401 | `unauthorized` | JWT inválido o ausente |
| 400 | `invalid_input` | Body malformado o careerId faltante |
| 500 | `internal` | Error al insertar en DB |

---

## Tipos TypeScript del cliente — `features/pdf-import/api/parseStudyPlan.ts`

```ts
export type PdfImportError =
  | 'invalid_file'
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

export async function parsePdf(file: File): Promise<ParseResponse>
export async function saveSubjects(
  careerId: string,
  subjects: SubjectDraft[]
): Promise<SaveResponse>
```

---

## Hook — `features/pdf-import/hooks/usePdfImport.ts`

```ts
export type ImportPhase =
  | 'idle'       // esperando que el usuario suba un archivo
  | 'parsing'    // Edge Function procesando el PDF
  | 'preview'    // mostrando materias detectadas al usuario
  | 'saving'     // insertando en DB
  | 'done'       // éxito
  | 'error'      // algo falló

export interface UsePdfImportResult {
  phase: ImportPhase
  subjects: SubjectDraft[]     // detectadas (phase: preview)
  parseWarning: string | null  // si extracción fue parcial
  error: string | null         // mensaje de error (phase: error)
  inserted: number             // materias insertadas (phase: done)
  parse: (file: File) => Promise<void>
  save: () => Promise<void>
  reset: () => void
}

export function usePdfImport(): UsePdfImportResult
```

---

## Componentes

```ts
// PdfUploader.tsx — selector de archivo
interface PdfUploaderProps {
  onFile: (file: File) => void
  disabled?: boolean
}

// SubjectPreview.tsx — lista + confirmar
interface SubjectPreviewProps {
  subjects: SubjectDraft[]
  warning: string | null
  onConfirm: () => void
  onCancel: () => void
  isSaving: boolean
}

// PdfImportBanner.tsx — banner en Dashboard
// Sin props: lee subjectsStore directamente.
// Renderiza null si userSubjects.length > 0 o !subjectsLoaded.

// PdfImportPage.tsx — página completa
// Compone PdfUploader + SubjectPreview + estados de carga/error/done.
```
