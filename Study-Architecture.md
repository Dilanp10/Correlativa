# Study-Architecture.md — Correlativa
## Paso 2 (SDD) — Arquitectura Técnica: Sesiones de Estudio con IA

> Estado: **borrador, pendiente de aprobación.** No se avanza a Database-Spec hasta que esté aprobado.
> Depende de: `Study-PRD.md` (aprobado).

---

## 1. Vista general

Por primera vez en el proyecto hay **backend propio** (una Supabase Edge Function). Es necesario porque la API key de GitHub Models **no puede vivir en el front** (Vite hace bundle de todo y se filtraría). El resto sigue los mismos patrones que las features anteriores.

```
[Frontend (React)]
  StudyPage  ──► useGenerateQuiz()  ──► supabase.functions.invoke('generate-quiz', {subjectName, topic?})
                                                                       │
                                                                       ▼
[Backend (Supabase Edge Function, Deno)]
  generate-quiz
    1. Valida JWT del usuario (rechaza anónimos).
    2. Construye prompt con subjectName + topic.
    3. Llama a GitHub Models API (gpt-4o-mini).
    4. Valida que la respuesta sea JSON con el shape esperado.
    5. Devuelve { questions: [...] } al cliente.

[Frontend de nuevo]
  StudyPage muestra preguntas → usuario responde → al terminar:
    - insert en user_study_sessions (Supabase, RLS).
    - emitActivity() → racha 🔥.
    - useGamification recomputa XP automáticamente.
```

---

## 2. Diagrama de módulos (frontend)

```
src/features/study/
├── lib/
│   └── quiz.ts                # Tipos (Question, Quiz, etc.) + helpers puros (scoring).
├── api/
│   └── generateQuiz.ts        # Cliente: llama a la Edge Function.
├── store/
│   ├── studyStore.ts          # Estado de la sesión EN CURSO (current question, answers, score).
│   └── sessionsStore.ts       # Historial persistido (user_study_sessions del usuario).
├── hooks/
│   ├── useGenerateQuiz.ts     # loading/error wrapper sobre generateQuiz.
│   └── useStudySessions.ts    # Carga + insert de sesiones completadas.
└── components/
    ├── SubjectPicker.tsx      # Dropdown materia + input tema opcional.
    ├── QuizQuestion.tsx       # Una pregunta (MC o V/F) con feedback inmediato.
    └── QuizSummary.tsx        # Pantalla final con puntaje + CTAs.

src/pages/
└── StudyPage.tsx              # Lazy route, composición de los componentes.
```

```
supabase/functions/
└── generate-quiz/
    └── index.ts               # Edge Function en Deno.
```

---

## 3. Backend: Edge Function `generate-quiz`

### 3.1 Contrato HTTP
- **Método:** `POST`
- **Auth:** Bearer token (Supabase JWT del usuario logueado).
- **Body (JSON):** `{ subjectName: string; topic?: string }`
- **Respuesta 200:** `{ questions: Question[] }` (5 elementos).
- **Errores:**
  - `401` si no hay JWT válido.
  - `429` si GitHub Models devuelve rate limit.
  - `502` si la IA devolvió algo inservible después de 1 reintento.
  - `500` si hubo otro error inesperado.

### 3.2 Secretos
Se configuran en Supabase Dashboard → Edge Functions → Secrets (o via CLI):
- `GITHUB_MODELS_TOKEN` — GitHub Personal Access Token (PAT) con permiso `models:read`.

Yo te paso las instrucciones exactas en el Paso 6 (Implementation-Plan). El token no se commitea a git ni queda en el código.

### 3.3 Modelo elegido
**`gpt-4o-mini`** vía GitHub Models. Razones:
- Rápido (~2-3 seg para 5 preguntas).
- Calidad alta para tareas educativas en español.
- Soporta `response_format: { type: "json_object" }` → forzamos JSON válido del lado del modelo.
- Está en la cuota gratuita de GitHub Models.

Alternativas evaluadas: `Llama-3.1-70B` (más capaz pero más lento), `Phi-3.5` (más rápido pero menos preciso). Si en práctica `gpt-4o-mini` no funciona bien, es 1 línea de código cambiar el modelo.

### 3.4 Estrategia de prompt
- **System prompt** (fijo): define el rol ("sos un profesor universitario que arma quizzes cortos"), exige JSON válido, define el shape exacto de cada tipo de pregunta, instruye a hacer las preguntas en español argentino y a incluir una explicación clara.
- **User prompt** (dinámico): "Generá 5 preguntas sobre `{subjectName}`{si hay topic: ` enfocadas en {topic}`}. Mezclá tipos `mc` y `tf`. Devolveme JSON con el shape definido."
- **`response_format: { type: "json_object" }`** garantiza JSON.

### 3.5 Validación defensiva
Aunque pidamos JSON forzado, el parser igual:
1. Hace `JSON.parse` con try/catch.
2. Valida que `questions` exista, sea array, y tenga 5 elementos.
3. Valida cada pregunta: tipo válido, opciones del largo correcto, índices/valores válidos.
4. Si algo falla → 1 reintento (otro llamado al modelo). Si vuelve a fallar → `502`.

---

## 4. Frontend: tipos compartidos

```ts
// features/study/lib/quiz.ts

export type Question =
  | { type: 'mc'; question: string; options: string[]; correctIndex: number; explanation: string }
  | { type: 'tf'; question: string; correctValue: boolean; explanation: string }

export interface Quiz {
  questions: Question[]
}

export interface SessionResult {
  correctCount: number
  totalQuestions: number
  isPerfect: boolean
}
```

`Question` es una **discriminated union** sobre `type`. El front renderiza una UI distinta según `q.type === 'mc'` vs `'tf'`.

---

## 5. Estado de la sesión en curso (`studyStore`)

```
Estados posibles del flujo:
  'picking'   → usuario elige materia / tema
  'generating'→ spinner mientras la IA responde
  'playing'   → mostrando preguntas
  'summary'   → resumen final con CTAs
  'error'     → mensaje de error con retry
```

Manejado en `studyStore` (zustand). Es estado **efímero** (no se persiste). Reset al salir de la página o terminar una sesión.

---

## 6. Persistencia: `user_study_sessions`

Tabla nueva con `(id, user_id, subject_id, completed_at, correct_count, total_questions)`. RLS: own rows. Schema completo va en el Database-Spec.

Carga: `useStudySessions` con el mismo patrón de `useAgenda` (load on first use, strict-mode guard).

Insert: al final de una sesión exitosa, **una sola fila** se inserta. Sin update masivo.

---

## 7. Integración con gamificación (XP) y rachas

### 7.1 Racha
Al insertar una sesión completada, llamamos `emitActivity()` → el `StreakActivityConsumer` ya montado en App actualiza la racha. **Cero cambios** en streaks.

### 7.2 XP — el cambio más sustancial
`useGamification` ya lee subjects + agenda. Le sumamos sesiones como **tercera fuente**:

```ts
// computeXp ahora recibe también las sesiones:
function computeXp(userSubjects, events, sessions): number
```

XP por sesión:
- `+25` por cada sesión con `correct_count > 0`.
- `+10` adicional si `correct_count === total_questions` (perfecta).

Esto significa que `useGamification` ahora también lee `useSessionsStore`. Mismo patrón de cross-feature read que ya tiene con subjects y agenda. **Es la única razón** por la que toco gamificación: agregar una fuente más al cómputo.

### 7.3 Separación con progreso académico (refuerzo del PRD)
`computeCareerProgress` NO cambia. Sigue mirando solo `userSubjects` aprobadas/promocionadas. Las sesiones de estudio solo afectan XP/racha, no el porcentaje de carrera.

---

## 8. UI / Navegación

### 8.1 Quinta tab en `BottomNav`
- Texto: "Estudiar"
- Ícono: 🧠 / libro abierto (decisión fina en UX-Spec).
- Padding reducido en `BottomNav` de `px-4` a `px-2.5` para que entren los 5 items en pantallas chicas. Probado mentalmente: ~320px de ancho de pantalla bien manejable.

### 8.2 Ruta
- `/study` o `/estudiar`. Voy con `/estudiar` por consistencia con español.
- Lazy load igual que las otras páginas.
- Protegida por `ProtectedRoute` + `CareerRequiredRoute`.

---

## 9. Manejo de errores

| Caso | Comportamiento |
|---|---|
| Rate limit GitHub Models (429) | "Alcanzaste el límite gratuito de quizzes por hoy. Probá más tarde." |
| API no responde / timeout | "No pudimos generar el quiz. Reintentá." (botón retry) |
| JSON malformado (después del reintento del backend) | "Algo salió mal generando el quiz. Probá con otro tema o reintentá." |
| Usuario sin sesión (auth) | El cliente no debería llegar acá; si llega, mensaje genérico. |
| Sin internet | Spinner + timeout → mismo mensaje de "no pudimos generar". |
| Insert de sesión falla post-quiz | Mostramos resumen igual, log a consola; el XP no se actualiza esta vez. Aceptable: el usuario vio sus aciertos. |

---

## 10. Performance y costo

- **Cold start Edge Function:** ~100-500ms en Supabase free tier.
- **GitHub Models:** ~2-5 seg para 5 preguntas con gpt-4o-mini.
- **Tiempo perceptible total:** ~3-6 seg desde "Generar quiz" hasta primera pregunta. Spinner durante todo eso.
- **Costo:** $0 mientras estemos en cuota gratuita. Los límites son por hora y por día, no por mes — si los pasás, esperás.

---

## 11. Decisiones técnicas y por qué (resumen)

| # | Decisión | Razón |
|---|---|---|
| D1 | Backend = Supabase Edge Function | Ya integrado con tu auth; no agrega plataforma nueva. |
| D2 | Modelo = `gpt-4o-mini` | Mejor balance velocidad/calidad/cuota en GitHub Models. |
| D3 | JSON forzado vía `response_format` | Hace el parsing del front mucho más confiable. |
| D4 | Validación + 1 reintento en backend | Defensa contra JSON ocasionalmente roto. |
| D5 | Validación de JWT en Edge Function | Evita que cualquiera del internet queme tu cuota. |
| D6 | Tabla `user_study_sessions` (no contador) | Permite stats por materia y logros futuros. |
| D7 | XP como tercera fuente en `computeXp` | Mantiene el modelo "XP derivado del estado". |
| D8 | `useSessionsStore` leído desde `useGamification` | Mismo patrón cross-feature que ya tenemos. |
| D9 | Padding reducido en BottomNav para 5 items | Mínima fricción; alternativas peores. |

---

## 12. Lo que NO cambia
- Sistema de progreso académico (`computeCareerProgress`).
- Stores existentes (subjects, agenda, career, auth, gamification, streaks) — salvo que `useGamification` agregue una lectura más.
- Tablas existentes.
- Flujo de auth, onboarding, árbol, agenda.

---

## 13. Decisiones cerradas
1. **Modelo:** `gpt-4o-mini` vía GitHub Models.
2. **Auth en Edge Function:** validamos JWT — solo usuarios logueados pueden disparar quizzes.
3. **BottomNav:** se mantienen 5 tabs ajustando padding.
