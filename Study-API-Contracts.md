# Study-API-Contracts.md — Correlativa
## Paso 5 (SDD) — Contratos: Sesiones de Estudio con IA

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Study-Architecture.md`, `Study-Database-Spec.md`, `Study-UX-Spec.md` (aprobados).

---

## 1. Alcance

Esta feature tiene **dos superficies** de contratos:
1. **HTTP** — entre el front y la nueva Edge Function `generate-quiz`.
2. **TypeScript interno** — tipos, stores, hooks y cómo se enchufa con gamificación y rachas.

Además define **el prompt** que el backend le manda a GitHub Models y el **shape esperado** de la respuesta del modelo.

---

## 2. Contrato HTTP: `generate-quiz`

### 2.1 Endpoint
- **URL:** `https://<project>.supabase.co/functions/v1/generate-quiz`
- **Método:** `POST`
- **Cabeceras requeridas:**
  - `Authorization: Bearer <supabase_jwt>` — JWT del usuario logueado (el cliente lo agrega automáticamente con `supabase.functions.invoke`).
  - `Content-Type: application/json`

### 2.2 Request body
```ts
{
  subjectName: string;   // requerido, no vacío, max 200 chars
  topic?: string;        // opcional, max 200 chars
}
```

### 2.3 Response 200 (éxito)
```ts
{
  questions: Question[]  // exactamente 5 preguntas, mezcla de tipos
}
```

Donde `Question` es la discriminated union de §4.1.

### 2.4 Códigos de error
| Status | Caso | Body |
|---|---|---|
| `400` | Body inválido (sin subjectName, demasiado largo, etc.) | `{ error: "invalid_input", message: string }` |
| `401` | Sin JWT o JWT inválido | `{ error: "unauthorized" }` |
| `429` | GitHub Models devolvió rate limit | `{ error: "rate_limit", message: "Alcanzaste el límite gratuito por hoy." }` |
| `502` | IA devolvió respuesta inválida después del reintento | `{ error: "ai_invalid_response", message: "El modelo devolvió un quiz mal formado." }` |
| `500` | Cualquier otro error inesperado | `{ error: "internal", message: string }` |

### 2.5 Comportamiento interno del Edge Function
```
1. Validar JWT (Supabase ya lo expone via Deno.env y el header).
2. Parsear y validar body (Zod-like manual o esquema simple).
3. Construir mensajes (system + user prompts) según §3.
4. Llamar a GitHub Models con `response_format: { type: "json_object" }`.
5. Parsear el JSON devuelto. Validar shape (questions array de 5, cada una válida según §4.1).
6. Si la validación falla → 1 reintento (mismo prompt). Si vuelve a fallar → 502.
7. Si todo ok → 200 con { questions }.
```

---

## 3. Prompt para GitHub Models

### 3.1 System prompt (fijo)
```
Sos un profesor universitario argentino que arma quizzes cortos para que estudiantes repasen sus materias.

Tu salida es SIEMPRE un JSON válido con esta forma exacta:

{
  "questions": [
    // exactamente 5 elementos, mezcla de tipos
    {
      "type": "mc",
      "question": "string (en español argentino, claro y conciso)",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0|1|2|3,
      "explanation": "string (1-2 oraciones explicando por qué es la correcta)"
    },
    {
      "type": "tf",
      "question": "string (afirmación que pueda ser verdadera o falsa)",
      "correctValue": true|false,
      "explanation": "string (1-2 oraciones explicando)"
    }
  ]
}

Reglas:
- EXACTAMENTE 5 preguntas.
- Mezcla los tipos: idealmente 3-4 mc y 1-2 tf.
- En "mc": exactamente 4 opciones, una sola correcta, distractores plausibles.
- En "tf": "correctValue" es booleano (true/false, no string).
- Las preguntas en español argentino, nivel universitario.
- "explanation" es informativa, NUNCA dice "la opción A" porque las opciones están en un array sin letras.
- No incluyas markdown, ni código, ni comillas extra. Solo el JSON.
```

### 3.2 User prompt (dinámico, plantilla)
```
Materia: {subjectName}
{si hay topic}: Tema o foco: {topic}

Generá 5 preguntas para que el estudiante repase. Devolveme solo el JSON.
```

### 3.3 Parámetros del modelo
```ts
{
  model: 'gpt-4o-mini',
  messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
  response_format: { type: 'json_object' },
  temperature: 0.7,
  max_tokens: 1500,
}
```

---

## 4. Tipos TypeScript (frontend)

### 4.1 `Question` (discriminated union)
```ts
// features/study/lib/quiz.ts

export interface McQuestion {
  type: 'mc'
  question: string
  options: string[]       // exactamente 4
  correctIndex: number    // 0..3
  explanation: string
}

export interface TfQuestion {
  type: 'tf'
  question: string
  correctValue: boolean
  explanation: string
}

export type Question = McQuestion | TfQuestion

export interface Quiz {
  questions: Question[]  // exactamente 5
}
```

### 4.2 `SessionResult`
```ts
export interface SessionResult {
  subjectId: string
  correctCount: number
  totalQuestions: number
  isPerfect: boolean
}
```

### 4.3 Entidad de DB (en shared/types)
```ts
// shared/types/index.ts (extensión)

export interface UserStudySession {
  id: string
  user_id: string
  subject_id: string
  completed_at: string
  correct_count: number
  total_questions: number
}
```

---

## 5. Cliente del Edge Function

```ts
// features/study/api/generateQuiz.ts

export type GenerateQuizError =
  | 'invalid_input'
  | 'unauthorized'
  | 'rate_limit'
  | 'ai_invalid_response'
  | 'network'
  | 'internal'

export interface GenerateQuizFailure {
  ok: false
  error: GenerateQuizError
  message: string
}

export interface GenerateQuizSuccess {
  ok: true
  quiz: Quiz
}

export type GenerateQuizResult = GenerateQuizSuccess | GenerateQuizFailure

export async function generateQuiz(
  subjectName: string,
  topic?: string
): Promise<GenerateQuizResult>
```

**Comportamiento:**
- Llama a `supabase.functions.invoke('generate-quiz', { body: { subjectName, topic } })`.
- Mapea status codes y errores de red al tipo `GenerateQuizError`.
- Nunca tira excepción — siempre devuelve el discriminated union, la UI decide qué mostrar.

---

## 6. Store de sesión en curso — `features/study/store/studyStore.ts`

```ts
export type StudyPhase = 'picking' | 'generating' | 'playing' | 'summary' | 'error'

interface StudyStore {
  phase: StudyPhase

  // Inputs del picking
  selectedSubjectId: string | null
  topic: string

  // Datos del quiz en curso
  quiz: Quiz | null
  currentIndex: number          // 0..4
  answers: (number | boolean | null)[]  // longitud 5, null si no respondida
  /** Score calculado al cerrar el quiz. */
  result: SessionResult | null

  // Error si phase === 'error'
  error: { code: GenerateQuizError; message: string } | null

  // Setters principales
  setSubjectId(id: string | null): void
  setTopic(t: string): void
  startGenerating(): void
  setQuiz(q: Quiz): void
  setError(e: { code: GenerateQuizError; message: string }): void
  answer(value: number | boolean): void  // responde la pregunta actual
  next(): void                            // avanza o pasa a summary
  finish(result: SessionResult): void     // pasa a summary
  resetToPicking(keepSubject?: boolean): void
}
```

Es estado **efímero**. Reset cuando el usuario sale de StudyPage o termina la sesión.

---

## 7. Store de historial — `features/study/store/sessionsStore.ts`

```ts
interface SessionsStore {
  sessions: UserStudySession[]
  isLoading: boolean
  loaded: boolean

  setSessions(s: UserStudySession[]): void
  setLoading(loading: boolean): void
  upsertLocal(s: UserStudySession): void
  reset(): void
}
```

Análogo a `useAgendaStore`. Carga inicial vía `useStudySessions`.

---

## 8. Hooks

### 8.1 `useGenerateQuiz`
```ts
export interface UseGenerateQuizResult {
  generate: (subjectName: string, topic?: string) => Promise<void>
  // No expone state propio: actualiza el studyStore directamente.
}

export function useGenerateQuiz(): UseGenerateQuizResult
```

Comportamiento:
- Llama a `studyStore.startGenerating()`.
- Llama `generateQuiz(subjectName, topic)`.
- Si `ok` → `studyStore.setQuiz(result.quiz)`, phase pasa a `playing`.
- Si `!ok` → `studyStore.setError({ code, message })`, phase pasa a `error`.

### 8.2 `useStudySessions`
```ts
export interface UseStudySessionsResult {
  sessions: UserStudySession[]
  loaded: boolean
  insertSession: (result: SessionResult) => Promise<UserStudySession | null>
}

export function useStudySessions(): UseStudySessionsResult
```

Comportamiento:
- Carga inicial: select de `user_study_sessions` filtrado por `user_id`, ordenado por `completed_at DESC`. Patrón Strict Mode con `useRef`.
- `insertSession(result)`:
  - Insert en Supabase.
  - Si éxito → `upsertLocal(newRow)` + `emitActivity()` (racha) + devuelve la fila.
  - Si error → log a consola, devuelve null.

---

## 9. Integración con gamificación (cambio en `useGamification`)

### 9.1 Firma actualizada de `computeXp`
```ts
// features/gamification/lib/gamification.ts

export function computeXp(
  userSubjects: UserSubject[],
  events: AgendaEvent[],
  sessions: UserStudySession[]  // ← NUEVO
): number
```

### 9.2 Nuevas constantes
```ts
export const XP = {
  APROBADA: 100,
  PROMOCIONADA: 130,
  CURSANDO: 20,
  AGENDA_EVENT_COMPLETED: 15,
  STUDY_SESSION: 25,         // ← NUEVO
  STUDY_SESSION_PERFECT: 10, // ← NUEVO (bonus adicional)
} as const
```

### 9.3 Lógica adicional en `computeXp`
```ts
for (const s of sessions) {
  xp += XP.STUDY_SESSION
  if (s.correct_count === s.total_questions) {
    xp += XP.STUDY_SESSION_PERFECT
  }
}
```

### 9.4 Hook `useGamification` (cambio)
Ahora también lee `useSessionsStore`. La UI no cambia: `LevelCard` y `LevelUpWatcher` reciben el mismo `GamificationState`.

### 9.5 Tests actualizados
Los 13 tests de `gamification.test.ts` siguen pasando porque pasan `[]` como tercer argumento. Se agregan 3-4 tests nuevos cubriendo el XP de sesiones.

---

## 10. Integración con racha
Sin cambios en streaks. `insertSession` ya invoca `emitActivity()` después del insert exitoso. El `StreakActivityConsumer` ya montado en App actualiza la racha.

---

## 11. Reads/Writes a Supabase

### 11.1 Read (al cargar el historial)
```ts
const { data, error } = await supabase
  .from('user_study_sessions')
  .select('*')
  .eq('user_id', user.id)
  .order('completed_at', { ascending: false })
```

### 11.2 Insert (al finalizar una sesión)
```ts
const { data, error } = await supabase
  .from('user_study_sessions')
  .insert({
    user_id: user.id,
    subject_id: result.subjectId,
    correct_count: result.correctCount,
    total_questions: result.totalQuestions,
  })
  .select('*')
  .single()
```

RLS `user_study_sessions_insert_own` ya permite si `user_id = auth.uid()`.

---

## 12. Manejo de errores (front)

| Caso | Acción del front |
|---|---|
| `generateQuiz` devuelve `rate_limit` | Phase = `error`, mensaje específico. CTA "Reintentar" recompone phase = `picking`. |
| `generateQuiz` devuelve `ai_invalid_response` | Phase = `error`, sugerencia de probar con otro tema. |
| `generateQuiz` devuelve `network` o `internal` | Phase = `error`, mensaje genérico + reintentar. |
| `insertSession` falla | Phase queda en `summary` (el usuario ya vio sus aciertos), log a consola, sin XP/racha esta vez. |
| Quiz sin respuestas válidas (defensa extra) | Validación adicional en `setQuiz` antes de pasar a `playing`. Si falla → phase = `error`. |

---

## 13. Lo que NO se expone
- Setters manuales de XP, racha o de sesiones desde fuera.
- Endpoint para forzar regeneración de un quiz específico.
- No hay paginación del historial (todas las sesiones del usuario; volumen esperado bajo).
- No hay endpoint público de la Edge Function (requiere JWT).
