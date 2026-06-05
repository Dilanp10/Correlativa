# API-Contracts.md — Correlativa v2

**Fecha:** 2026-06-05
**Estado:** Borrador — pendiente aprobación

---

## 1. Resumen

v2 agrega 3 superficies de API:

1. **Supabase PostgREST** — queries y mutations sobre las nuevas tablas (`study_notes`, `flashcard_sets`, `flashcards`) y la columna `type` de `subject_correlatives`.
2. **Edge Functions nuevas** — `generate-summary` y `generate-flashcards`.
3. **Edge Function existente reusada** — `generate-quiz` (sin cambios, se llama desde el cliente igual que hoy).

Todas las llamadas requieren el JWT del usuario en `Authorization: Bearer <jwt>`.

---

## 2. Tipos TypeScript compartidos (`src/shared/types/v2.ts`)

```ts
// ── Correlativas v2 ──────────────────────────────────────────────────────────

export type CorrelativeType = 'para_cursar' | 'para_rendir'

export interface SubjectCorrelative {
  subject_id: string
  requires_subject_id: string
  type: CorrelativeType
  created_at: string
}

// Estado del nodo del árbol (extendido en v2)
export type TreeNodeState =
  | 'bloqueada'
  | 'disponible_cursar'
  | 'disponible_rendir'
  | 'cursando'
  | 'completada'

// ── Resúmenes ────────────────────────────────────────────────────────────────

export interface StudyNote {
  id: string
  user_id: string
  subject_id: string
  topic: string
  title: string
  content: string
  key_points: string[]
  created_at: string
}

// ── Flashcards ───────────────────────────────────────────────────────────────

export type FlashcardStatus = 'nueva' | 'repasar' | 'aprendida'

export interface FlashcardSet {
  id: string
  user_id: string
  subject_id: string
  topic: string
  created_at: string
}

export interface Flashcard {
  id: string
  set_id: string
  question: string
  answer: string
  status: FlashcardStatus
  reviewed_at: string | null
  position: number
}

export interface FlashcardSetWithCards extends FlashcardSet {
  flashcards: Flashcard[]
}

// ── Quiz (efímero, no se persiste) ───────────────────────────────────────────

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface QuizPayload {
  topic: string
  questions: QuizQuestion[]
}
```

---

## 3. Supabase PostgREST (queries y mutations)

Todas las queries van por el cliente `supabase` ya existente en `src/shared/lib/supabase/client.ts`. RLS las restringe automáticamente al `user_id` del JWT.

### 3.1 Correlativas con tipo

#### Leer correlativas de una materia (incluyendo tipo)

```ts
// src/features/correlatives/api/getCorrelatives.ts
export async function getCorrelativesBySubject(subjectId: string) {
  const { data, error } = await supabase
    .from('subject_correlatives')
    .select('subject_id, requires_subject_id, type')
    .eq('subject_id', subjectId)

  if (error) throw error
  return data as SubjectCorrelative[]
}
```

#### Cambiar el tipo de una correlativa

```ts
// src/features/correlatives/api/updateCorrelativeType.ts
export async function updateCorrelativeType(
  subjectId: string,
  requiresSubjectId: string,
  currentType: CorrelativeType,
  newType: CorrelativeType
) {
  // La PK es compuesta (subject_id, requires_subject_id, type).
  // Para "cambiar el type" hacemos DELETE + INSERT en una transacción lógica.
  const { error: delErr } = await supabase
    .from('subject_correlatives')
    .delete()
    .match({ subject_id: subjectId, requires_subject_id: requiresSubjectId, type: currentType })
  if (delErr) throw delErr

  const { error: insErr } = await supabase
    .from('subject_correlatives')
    .insert({ subject_id: subjectId, requires_subject_id: requiresSubjectId, type: newType })
  if (insErr) throw insErr
}
```

**Nota:** las correlativas de carreras NO custom son lectura pública pero los UPDATE solo aplican a carreras propias del usuario (RLS heredada de `careers.is_custom = true AND created_by = auth.uid()`). Para carreras pre-cargadas, la edición de tipo solo afecta al usuario que la activó (decisión de v2: hacemos un override por usuario en una tabla aparte si llega a hacer falta; por ahora se edita directo y se asume que el usuario maneja su carrera).

> **Decisión pendiente:** ¿permitimos editar el tipo en carreras pre-cargadas? Si sí, necesitamos una tabla `user_correlative_overrides`. Si no, el botón "Editar tipo" solo aparece en carreras custom o importadas por el usuario.

---

### 3.2 Resúmenes (`study_notes`)

#### Crear (insert) — se llama después de recibir la respuesta de la edge function

```ts
// src/features/study-ai/api/saveSummary.ts
export async function saveSummary(input: {
  subjectId: string
  topic: string
  title: string
  content: string
  keyPoints: string[]
}): Promise<StudyNote> {
  const { data, error } = await supabase
    .from('study_notes')
    .insert({
      subject_id: input.subjectId,
      topic: input.topic,
      title: input.title,
      content: input.content,
      key_points: input.keyPoints,
    })
    .select()
    .single()

  if (error) throw error
  return data as StudyNote
}
```

(No mandamos `user_id` — lo completa Supabase desde el JWT via `DEFAULT auth.uid()` definido en la tabla. Si no estuviera el default, se setea en el insert.)

#### Leer resúmenes de una materia

```ts
export async function getNotesBySubject(subjectId: string): Promise<StudyNote[]> {
  const { data, error } = await supabase
    .from('study_notes')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as StudyNote[]
}
```

#### Borrar un resumen

```ts
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('study_notes').delete().eq('id', noteId)
  if (error) throw error
}
```

---

### 3.3 Flashcard sets

#### Crear un set completo (con todas sus tarjetas, en 2 queries)

```ts
// src/features/study-ai/api/saveFlashcardSet.ts
export async function saveFlashcardSet(input: {
  subjectId: string
  topic: string
  cards: { question: string; answer: string }[]
}): Promise<FlashcardSetWithCards> {
  // 1) Crear el set
  const { data: set, error: setErr } = await supabase
    .from('flashcard_sets')
    .insert({ subject_id: input.subjectId, topic: input.topic })
    .select()
    .single()
  if (setErr) throw setErr

  // 2) Insertar las flashcards en bulk
  const rows = input.cards.map((c, i) => ({
    set_id: set.id,
    question: c.question,
    answer: c.answer,
    position: i,
  }))

  const { data: cards, error: cardsErr } = await supabase
    .from('flashcards')
    .insert(rows)
    .select()
  if (cardsErr) throw cardsErr

  return { ...(set as FlashcardSet), flashcards: cards as Flashcard[] }
}
```

#### Leer sets de una materia (con sus tarjetas)

```ts
export async function getFlashcardSets(subjectId: string): Promise<FlashcardSetWithCards[]> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .select('*, flashcards(*)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FlashcardSetWithCards[]
}
```

#### Marcar una flashcard

```ts
export async function updateFlashcardStatus(cardId: string, status: FlashcardStatus): Promise<void> {
  const { error } = await supabase
    .from('flashcards')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw error
}
```

#### Borrar un set completo (cascada borra las flashcards)

```ts
export async function deleteFlashcardSet(setId: string): Promise<void> {
  const { error } = await supabase.from('flashcard_sets').delete().eq('id', setId)
  if (error) throw error
}
```

---

## 4. Edge Functions

### 4.1 `generate-summary` (NUEVA)

**Endpoint:** `POST /functions/v1/generate-summary`

**Headers:**
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**
```ts
interface GenerateSummaryRequest {
  subjectName: string      // "Análisis Matemático I" — contexto para el prompt
  topic: string            // "Integrales por sustitución" — tema específico
  text?: string            // texto opcional pegado por el usuario (max 10.000 chars)
}
```

**Response 200:**
```ts
interface GenerateSummaryResponse {
  title: string            // título conciso generado por la IA
  content: string          // cuerpo del resumen (Markdown soportado)
  keyPoints: string[]      // 3-7 bullets con puntos clave
}
```

**Errores:**
```ts
type ErrorCode =
  | 'unauthorized'        // 401 — JWT faltante o inválido
  | 'invalid_input'       // 400 — topic vacío o subjectName faltante
  | 'rate_limit'          // 429 — GitHub Models rate limit
  | 'ai_invalid_response' // 502 — la IA devolvió algo no parseable
  | 'internal'            // 500 — error del servidor

interface ErrorResponse {
  error: ErrorCode
  message: string         // mensaje en español argentino, listo para mostrar
}
```

**Comportamiento:**
- Si `text` está presente, el prompt instruye a la IA a basarse en ese texto.
- Si no, la IA genera en base a su conocimiento general del tema.
- El `text` se trunca a 10.000 chars en el servidor (no en el cliente).
- 1 reintento automático si la respuesta no parsea como JSON.
- Timeout efectivo: ~25 segundos.

---

### 4.2 `generate-flashcards` (NUEVA)

**Endpoint:** `POST /functions/v1/generate-flashcards`

**Headers:** iguales a `generate-summary`.

**Request body:**
```ts
interface GenerateFlashcardsRequest {
  subjectName: string
  topic: string
  text?: string            // max 10.000 chars
  count: number            // 5–20, default 10
}
```

**Response 200:**
```ts
interface GenerateFlashcardsResponse {
  flashcards: {
    question: string       // pregunta corta y concreta
    answer: string         // respuesta de 1-3 oraciones
  }[]
}
```

**Errores:** mismos códigos que `generate-summary`.

**Comportamiento:**
- Genera exactamente `count` flashcards. Si la IA devuelve menos, se acepta el resultado parcial (con `partial = true` en una iteración futura; en v2 solo se acepta).
- Las flashcards no se insertan en DB desde la edge function. El cliente recibe el array y, en una segunda llamada, hace el `saveFlashcardSet` de §3.3.
- 1 reintento si JSON inválido.

---

### 4.3 `generate-quiz` (EXISTENTE — sin cambios)

Se reutiliza tal cual está. El cliente lo invoca y maneja la respuesta en memoria (no se guarda en DB).

**Endpoint:** `POST /functions/v1/generate-quiz`

**Request body:**
```ts
interface GenerateQuizRequest {
  subjectName: string
  topic: string
  text?: string
  count: number            // 5, 10 o 15
}
```

**Response 200:**
```ts
interface GenerateQuizResponse {
  questions: {
    id: string             // "q1", "q2", ...
    question: string
    options: string[]      // siempre 4 opciones
    correctIndex: number   // 0-3
    explanation: string    // explicación de la respuesta correcta
  }[]
}
```

**Persistencia:** ninguna. El estado vive en el componente `QuizSession` y se descarta al cerrar.

---

## 5. Manejo de errores en el cliente

### 5.1 Patrón general para edge functions

```ts
// src/features/study-ai/api/generateSummary.ts
import { supabase } from '@/shared/lib/supabase/client'

interface SummaryResult {
  ok: true
  data: GenerateSummaryResponse
}

interface SummaryError {
  ok: false
  error: string  // mensaje listo para mostrar en UI
}

export async function generateSummary(
  input: GenerateSummaryRequest
): Promise<SummaryResult | SummaryError> {
  const { data, error } = await supabase.functions.invoke<
    GenerateSummaryResponse | ErrorResponse
  >('generate-summary', { body: input })

  if (error) {
    return { ok: false, error: 'No pudimos conectar con el servidor. Probá de nuevo.' }
  }

  if ('error' in data) {
    return { ok: false, error: data.message }
  }

  return { ok: true, data }
}
```

### 5.2 Errores de Supabase PostgREST

Todos los hooks de v2 (`useSummary`, `useFlashcards`, etc.) deben:
- Capturar errores y exponerlos en estado (`error: string | null`).
- Loguear en consola con prefijo `[study-ai]` o `[correlatives]`.
- Mostrar al usuario un mensaje genérico ("No pudimos guardar. Probá de nuevo.") salvo casos específicos.

### 5.3 Casos específicos a manejar

| Caso | Mensaje al usuario |
|---|---|
| Sin conexión | "Necesitás conexión para usar la IA de estudio." |
| Rate limit (429) | "Alcanzamos el límite gratuito. Probá en unos minutos." |
| Token expirado (401) | Redirigir a `/login` |
| Texto muy largo | (No bloquea — truncamos en server y avisamos inline) |
| Quiz sin respuesta seleccionada | (UI lo previene; botón deshabilitado) |

---

## 6. Optimistic UI

| Acción | Optimistic |
|---|---|
| Marcar flashcard | ✅ — se actualiza el status en estado local antes de la respuesta de Supabase. Si falla, revertir + toast. |
| Cambiar tipo de correlativa | ✅ — actualiza el árbol y el detalle al toque, mete UPDATE en background |
| Borrar resumen | ✅ — desaparece de la lista, si falla vuelve + toast |
| Generar (IA) | ❌ — no se puede prever el resultado |

---

## 7. Hooks de feature (firmas)

### `src/features/study-ai/hooks/useSummary.ts`

```ts
export function useSummary(subjectId: string) {
  return {
    generate: (topic: string, text?: string) => Promise<void>,
    saved: StudyNote[],           // resúmenes ya guardados (de Supabase)
    current: GenerateSummaryResponse | null,  // resultado recién generado
    deleteNote: (id: string) => Promise<void>,
    isGenerating: boolean,
    error: string | null,
  }
}
```

### `src/features/study-ai/hooks/useFlashcards.ts`

```ts
export function useFlashcards(subjectId: string) {
  return {
    generate: (topic: string, count: number, text?: string) => Promise<void>,
    sets: FlashcardSetWithCards[],
    deleteSet: (setId: string) => Promise<void>,
    markCard: (cardId: string, status: FlashcardStatus) => Promise<void>,
    isGenerating: boolean,
    error: string | null,
  }
}
```

### `src/features/study-ai/hooks/useQuiz.ts`

```ts
export function useQuiz(subjectId: string) {
  return {
    generate: (topic: string, count: 5 | 10 | 15, text?: string) => Promise<void>,
    questions: QuizQuestion[] | null,
    answer: (questionId: string, optionIndex: number) => void,
    answers: Map<string, number>,
    score: { correct: number; total: number } | null,
    reset: () => void,
    isGenerating: boolean,
    error: string | null,
  }
}
```

### `src/features/correlatives/hooks/useCorrelatives.ts`

```ts
export function useCorrelatives(subjectId: string) {
  return {
    correlatives: SubjectCorrelative[],
    updateType: (
      requiresSubjectId: string,
      currentType: CorrelativeType,
      newType: CorrelativeType
    ) => Promise<void>,
    isLoading: boolean,
    error: string | null,
  }
}
```

---

## 8. Cosas que NO van en API en v2

- **Endpoints REST tradicionales**: todo va por Supabase + Edge Functions.
- **Cliente directo a GitHub Models**: solo desde edge functions (no exponer el token).
- **Webhooks o realtime**: no se usan en v2 (futuro: notificaciones cuando una IA termina si pasamos a procesamiento async).
- **Versionado de API**: la v2 cambia el schema pero mantiene compat hacia atrás; no se necesita prefijo `/v2/`.

---

*Pendiente aprobación antes de continuar con Implementation-Plan.md*
