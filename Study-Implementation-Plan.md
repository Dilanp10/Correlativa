# Study-Implementation-Plan.md — Correlativa
## Paso 6 (SDD) — Plan de Implementación: Sesiones de Estudio con IA

> Estado: **borrador, pendiente de aprobación.** Es el último paso antes de codear.
> Depende de: todos los pasos previos aprobados.

---

## 1. Orden de desarrollo y dependencias

Tres tareas son **tuyas** (T1-T4), todas tienen que estar hechas para que la feature funcione en runtime. Yo te paso instrucciones precisas:

```
T1 Crear GitHub PAT (vos)
T2 Cargar secret en Supabase (vos)
T3 Correr migración SQL (vos)
T4 Crear Edge Function en Supabase Dashboard (vos, copy/paste del código que te paso)

                  │
                  ▼ (en paralelo conmigo)

T5  Tipos en shared/types (UserStudySession)
T6  Lib quiz.ts (Question, Quiz)
T7  Cliente generateQuiz.ts
T8  Stores (studyStore, sessionsStore)
T9  Hooks (useGenerateQuiz, useStudySessions)
T10 Componentes (SubjectPicker, QuizQuestion, QuizSummary)
T11 Página StudyPage
T12 Update gamificación (computeXp con sessions)
T13 Tests nuevos de gamification + tests del scoring del quiz
T14 BottomNav (5° tab) + ruta en App + reset en logout
T15 Build, push, verificación
```

Yo puedo arrancar T5-T15 ni bien apruebes este plan. T1-T4 son tuyas y las podés ir haciendo en paralelo; sin ellas el deploy va a estar bien pero la pestaña Estudiar va a tirar error al generar.

---

## 2. Tareas tuyas (las hago una por una, te guío paso a paso)

### T1 — Crear GitHub PAT
1. Andá a https://github.com/settings/tokens (Tokens classic).
2. Click **"Generate new token (classic)"**.
3. Nombre: `correlativa-models`. Expiración: la que quieras (ej: 90 días).
4. **No tildes ningún scope** — para GitHub Models no hace falta scope adicional.
5. Generate → **copiá el token** (empieza con `ghp_`). Lo vas a pegar en T2.

### T2 — Cargar secret en Supabase
1. Supabase Dashboard → tu proyecto → **Edge Functions** → **Manage secrets**.
2. Agregá: nombre `GITHUB_MODELS_TOKEN`, valor = el PAT del paso T1.
3. Guardá.

### T3 — Migración SQL
Supabase Dashboard → SQL Editor → New query → pegá esto y Run:

```sql
CREATE TABLE user_study_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  correct_count   int  NOT NULL,
  total_questions int  NOT NULL,
  CONSTRAINT valid_correct_count    CHECK (correct_count >= 0),
  CONSTRAINT valid_total_questions  CHECK (total_questions > 0),
  CONSTRAINT correct_le_total       CHECK (correct_count <= total_questions)
);

CREATE INDEX idx_user_study_sessions_user_completed
  ON user_study_sessions (user_id, completed_at DESC);

ALTER TABLE user_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_study_sessions_select_own"
  ON user_study_sessions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_study_sessions_insert_own"
  ON user_study_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_study_sessions_update_own"
  ON user_study_sessions FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_study_sessions_delete_own"
  ON user_study_sessions FOR DELETE USING (user_id = auth.uid());
```

### T4 — Crear el Edge Function en el Dashboard

1. Supabase Dashboard → **Edge Functions** → **Deploy a new function** (o **+ Function**).
2. Nombre: `generate-quiz`. **Important:** el nombre tiene que ser exactamente ese.
3. En el editor que se abre, pegá el código que te voy a dejar yo en el archivo `supabase/functions/generate-quiz/index.ts` del repo (lo dejo escrito como parte de mi tarea para que solo tengas que copiar/pegar).
4. **Verify JWT:** activado (es el default). Esto cumple con la decisión D5 (rechazar anónimos).
5. Deploy.

> *Por qué Dashboard y no Supabase CLI:* el CLI requiere instalación y login local; para una sola function el Dashboard es más simple. Si más adelante hay varias functions, evaluamos pasar a CLI.

---

## 3. Tareas mías (código)

### T5 — Tipo `UserStudySession`
- Agregar la interface a `shared/types/index.ts`.
- **Done cuando:** `tsc` pasa con el tipo declarado.

### T6 — Lib `features/study/lib/quiz.ts`
- Tipos: `McQuestion`, `TfQuestion`, `Question` (discriminated union), `Quiz`, `SessionResult`.
- Helper: `scoreQuiz(quiz, answers): SessionResult` — pura, testeable.
- **Done cuando:** los tipos compilan y `scoreQuiz` tiene su test (parte de T13).

### T7 — Cliente `features/study/api/generateQuiz.ts`
- `generateQuiz(subjectName, topic?)` → `GenerateQuizResult`.
- Usa `supabase.functions.invoke`. Mapea errores HTTP al union.
- Nunca tira excepción.
- **Done cuando:** llamarla desde un componente devuelve siempre `ok: true | false` con datos válidos.

### T8 — Stores
- `studyStore.ts`: state machine (`phase`, `selectedSubjectId`, `topic`, `quiz`, `currentIndex`, `answers`, `result`, `error`) + setters.
- `sessionsStore.ts`: `sessions`, `loaded`, `isLoading`, `setSessions`, `upsertLocal`, `reset`.
- **Done cuando:** un componente puede leer estado y disparar transiciones.

### T9 — Hooks
- `useGenerateQuiz.ts`: orquesta `generateQuiz` + studyStore.
- `useStudySessions.ts`: carga inicial (strict-mode guard) + `insertSession(result)` con `emitActivity()` post-success.
- **Done cuando:** completar una sesión inserta correctamente, dispara la racha, y la lista en memoria se actualiza.

### T10 — Componentes
- `SubjectPicker.tsx`: dropdown materias + input tema + botón generar.
- `QuizQuestion.tsx`: renderiza MC o TF según `q.type`, maneja feedback + botón Siguiente.
- `QuizSummary.tsx`: resumen, XP, CTAs.
- **Done cuando:** se ven igual a los wireframes del UX-Spec, mobile-first.

### T11 — Página `StudyPage.tsx`
- Lazy route.
- Renderiza según `phase`: picking / generating / playing / summary / error.
- **Done cuando:** flujo completo de punta a punta funciona en pantalla.

### T12 — Update de gamificación
- `gamification.ts`: agregar `STUDY_SESSION` y `STUDY_SESSION_PERFECT` a `XP`. Cambiar firma de `computeXp` y `computeGamification` para aceptar `sessions: UserStudySession[]`.
- `useGamification.ts`: leer `useSessionsStore`.
- **Done cuando:** los tests existentes (con `[]` como tercer arg) siguen pasando y los nuevos (T13) cubren el cálculo con sesiones.

### T13 — Tests
- Tests existentes de gamification: actualizar firma de las llamadas para pasar `[]`.
- Tests nuevos en `gamification.test.ts`: cubrir XP por sesión, por sesión perfecta, combinado.
- Tests del nuevo `scoreQuiz` en `quiz.test.ts`: combina MC y TF con respuestas correctas/incorrectas.
- **Done cuando:** `npx vitest run` da todo verde.

### T14 — BottomNav + ruta + logout
- `shared/constants/index.ts`: agregar `ROUTES.STUDY = '/estudiar'`.
- `BottomNav.tsx`: nuevo item "Estudiar" con SVG cerebro, padding por item de `px-4` → `px-2.5`.
- `App.tsx`: `const StudyPage = lazy(() => import('@/pages/StudyPage'))` + ruta protegida.
- `ProfilePage.tsx`: agregar `resetSessions` y `resetStudy` al `handleSignOut`.
- **Done cuando:** la 5° tab aparece, la ruta carga, y el logout limpia los stores.

### T15 — Build, commit, push, verificación
- `npx tsc --noEmit` + `npx vitest run` + `npm run build` sin errores.
- Commit con mensaje siguiendo el estilo del repo.
- Push → Vercel redeploya el front.
- **Done cuando:** en producción, generar un quiz funciona end-to-end (asumiendo T1-T4 también listas).

---

## 4. El Edge Function (te lo dejo escrito en T4)

Por transparencia, el código de la función va a tener esta estructura aprox:
- Validar JWT (Supabase lo expone via header).
- Parsear/validar body con campos requeridos.
- Construir mensajes (system + user).
- Llamar a `https://models.inference.ai.azure.com/chat/completions` con `Authorization: Bearer ${Deno.env.get('GITHUB_MODELS_TOKEN')}`.
- Parsear y validar la respuesta del modelo, con 1 reintento si está rota.
- Devolver JSON `{ questions }` o error con status correcto.

El código exacto lo escribo en T4 dentro del repo (`supabase/functions/generate-quiz/index.ts`) y vos solo copiás/pegás en el dashboard de Supabase.

---

## 5. Riesgo y mitigación

| Riesgo | Mitigación |
|---|---|
| GitHub Models cambia su API o se cae | Errores claros 502/429 en el front, mensajes útiles al usuario. |
| El modelo devuelve JSON inválido | Validación + 1 reintento en backend, después error 502. |
| Cuota agotada de un día | Error 429 con mensaje claro al usuario. |
| Cliente reenvía mientras está generando | `studyStore.phase === 'generating'` deshabilita el botón. |
| Insert de sesión falla | Summary se ve igual, log a consola, no se contabiliza XP/racha esta vez. |
| Tests rompen por cambio de firma de computeXp | Actualizo los 13 tests en el mismo commit que el cambio. |

---

## 6. Estimación
~10 archivos nuevos (lib, api, 2 stores, 2 hooks, 3 componentes, página) + 1 Edge Function + ~5 edits chicos (gamification, BottomNav, App, ProfilePage, tests). **Riesgo medio** por el backend nuevo, pero compensado por buen alcance del API-Contracts.

---

## 7. Qué NO tocar
- Sistema de progreso académico (`computeCareerProgress`).
- Streaks (solo se suma una llamada a `emitActivity()` en `insertSession`).
- Otras features ya construidas (subjects, agenda, career, auth).
- Confirmado en UX-Spec: sin contenido manual del usuario en esta tanda.

---

## 8. Decisiones a confirmar antes de codear

1. **Deploy del Edge Function via Dashboard** (vos copy/paste el código). Mi recomendación: sí, es lo más simple. Si preferís instalar Supabase CLI lo discutimos.
2. **¿Querés que arranque ya con T5-T11 mientras vos hacés T1-T4?** Recomiendo sí: las tareas son independientes.
