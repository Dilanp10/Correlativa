# Implementation-Plan.md — Correlativa v2

**Fecha:** 2026-06-05
**Estado:** Borrador — pendiente aprobación
**Decisión fijada:** edición de tipo de correlativa solo en carreras custom/importadas por el usuario.

---

## 1. Filosofía del plan

- **Incremental y deployable a cada paso.** Cada fase deja la app funcionando.
- **Backwards compatible.** v1 sigue andando intacto durante toda la migración.
- **Vertical slices.** Cada feature se implementa entera (DB → API → UI) antes de pasar a la siguiente.
- **Validar primero lo más riesgoso.** Las edge functions de IA van temprano para detectar problemas de calidad.

---

## 2. Fases de implementación

### Fase 0 — Preparación (1 sesión)

**Objetivo:** dejar el repo y la DB listos para los cambios.

- [ ] Crear branch `feature/v2`
- [ ] Crear archivo `src/shared/types/v2.ts` con todos los tipos del API-Contracts.md
- [ ] Crear carpetas vacías `src/features/study-ai/` y `src/features/correlatives/` con la estructura del Architecture.md
- [ ] Confirmar que `GITHUB_MODELS_TOKEN` sigue activo en Supabase (probar con `generate-quiz`)

**Done cuando:** la app compila igual que antes, con las carpetas y tipos nuevos en su lugar pero sin uso.

---

### Fase 1 — Migración de DB (1 sesión)

**Objetivo:** tener el schema de v2 deployado sin romper v1.

- [ ] Escribir migración SQL `001_alter_subject_correlatives_type.sql`
  - Agregar columna `type` con default `'para_cursar'`
  - Cambiar PK a `(subject_id, requires_subject_id, type)`
  - Crear índice `idx_subject_correlatives_subject_type`
- [ ] Escribir `002_create_study_notes.sql`
- [ ] Escribir `003_create_flashcard_sets.sql`
- [ ] Escribir `004_create_flashcards.sql` (incluye el ENUM `flashcard_status`)
- [ ] Escribir `005_rls_policies_v2.sql`
- [ ] Aplicar las 5 migraciones en Supabase (dashboard SQL editor)
- [ ] Verificar con queries manuales que RLS funciona (intentar leer un `study_note` de otro user → debe fallar)
- [ ] Verificar que v1 sigue funcionando: abrir la app, abrir el árbol, ver correlativas

**Done cuando:** las 4 tablas/columnas existen en producción, RLS validada, v1 intacto.

---

### Fase 2 — Edge Functions de IA (2 sesiones)

**Objetivo:** tener las 2 nuevas edge functions deployadas y respondiendo bien.

**Sesión 2A — `generate-summary`:**
- [ ] Crear `supabase/functions/generate-summary/index.ts` basado en el patrón de `generate-quiz`
  - System prompt en español argentino con instrucciones claras
  - Validación JWT manual (igual que `parse-study-plan`)
  - Llamada a GitHub Models con `gpt-4o-mini`
  - Parseo y validación de respuesta JSON
  - Manejo de errores tipados (`unauthorized`, `invalid_input`, `rate_limit`, etc.)
  - 1 reintento si JSON inválido
  - Truncado de `text` a 10.000 chars
- [ ] Deployar con `npx supabase functions deploy generate-summary`
- [ ] Probar manualmente con curl/postman:
  - Caso feliz: tema "Integrales" sin texto → respuesta válida
  - Con texto: tema + apunte pegado → respuesta basada en el texto
  - Sin auth: 401
  - Tema vacío: 400

**Sesión 2B — `generate-flashcards`:**
- [ ] Crear `supabase/functions/generate-flashcards/index.ts` (mismo patrón)
  - Prompt que pide N flashcards con question/answer cortas
  - Parámetro `count` (5-20)
- [ ] Deployar
- [ ] Probar manualmente: pedir 10 flashcards de "Leyes de Newton" → recibir 10 pares

**Done cuando:** ambas edge functions deployadas, probadas manualmente con respuestas razonables en español argentino.

---

### Fase 3 — Feature `correlatives/` (1 sesión)

**Objetivo:** árbol entiende y muestra los dos tipos de correlativa.

- [ ] `src/features/correlatives/api/getCorrelatives.ts`
- [ ] `src/features/correlatives/api/updateCorrelativeType.ts`
- [ ] `src/features/correlatives/hooks/useCorrelatives.ts`
- [ ] Actualizar `useSubjectsStore`:
  - El cálculo de `treeStates` ahora distingue `disponible_cursar` vs `disponible_rendir`
  - Una materia puede tener ambos estados a la vez (cursando + disponible_rendir)
- [ ] Actualizar `SubjectNode.tsx`:
  - Nuevo color para `disponible_rendir`
  - Badge "FINAL" cuando aplica
- [ ] Actualizar `TreePage.tsx`:
  - Nueva leyenda con el badge
- [ ] Actualizar `SubjectDetailSheet.tsx`:
  - Sección "Para cursar" con sus correlativas
  - Sección "Para rendir el final" con sus correlativas
  - Iconos ✓/⚠/✗ según estado
- [ ] **Solo en carreras custom o importadas:** botón "Editar correlativas" → abre modal con toggles `para_cursar` / `para_rendir` por correlativa

**Done cuando:** el árbol muestra ambos estados, el detalle muestra correlativas separadas por tipo, y un usuario con carrera custom puede cambiar el tipo de una correlativa.

---

### Fase 4 — Feature `study-ai/` base (1 sesión)

**Objetivo:** punto de entrada en el detalle de materia, esqueleto del sheet con los 3 modos.

- [ ] `src/features/study-ai/components/StudyAISheet.tsx`:
  - Sheet que se abre desde `SubjectDetailSheet`
  - 3 cards: Quiz / Resumen / Flashcards
  - Historial reciente (queries a Supabase: últimos 3 resúmenes + 3 sets de flashcards)
- [ ] Botón "🤖 Estudiar con IA" en `SubjectDetailSheet`
- [ ] Navegación interna del sheet (router de pestañas o sub-views)

**Done cuando:** desde cualquier materia se puede abrir el StudyAISheet y ver los 3 modos (aunque cada uno todavía no funcione).

---

### Fase 5 — Resumen (1 sesión)

**Objetivo:** flujo completo de generar y persistir resúmenes.

- [ ] `src/features/study-ai/api/generateSummary.ts` (llama edge function)
- [ ] `src/features/study-ai/api/saveSummary.ts` (insert en `study_notes`)
- [ ] `src/features/study-ai/api/getNotes.ts` (`getNotesBySubject`)
- [ ] `src/features/study-ai/api/deleteNote.ts`
- [ ] `src/features/study-ai/hooks/useSummary.ts`
- [ ] `src/features/study-ai/components/SummaryForm.tsx` (input de tema + textarea de texto opcional)
- [ ] `src/features/study-ai/components/SummaryView.tsx` (muestra title + keyPoints + content)
- [ ] Loading state mientras genera (spinner + texto)
- [ ] Manejo de errores (toast con mensaje del API-Contracts)
- [ ] En `SubjectDetailSheet`, sección "Mis resúmenes" con lista de los guardados (botón borrar por resumen)

**Done cuando:** el usuario puede generar un resumen, se guarda automáticamente, lo ve en el detalle de la materia, y puede borrarlo.

---

### Fase 6 — Flashcards (2 sesiones)

**Objetivo:** generar, persistir y repasar flashcards.

**Sesión 6A — generación y persistencia:**
- [ ] `generateFlashcards.ts` (llama edge function)
- [ ] `saveFlashcardSet.ts` (insert set + bulk insert cards)
- [ ] `getFlashcardSets.ts`
- [ ] `deleteFlashcardSet.ts`
- [ ] `updateFlashcardStatus.ts` (optimistic UI)
- [ ] `useFlashcards.ts`
- [ ] `FlashcardForm.tsx` (input tema + textarea + slider de cantidad 5-20)

**Sesión 6B — UI de repaso:**
- [ ] `FlashcardDeck.tsx`:
  - Muestra una flashcard a la vez con progress bar
  - Tap o botón "Voltear" → flip 3D con Framer Motion (0.4s)
  - Botones "Repasar" / "Aprendida"
  - Avanza automáticamente a la siguiente
  - Al terminar: pantalla de resumen con counts + opción "Repasar las pendientes" (filtra `status='repasar'`)
- [ ] Accesibilidad: botón "Voltear" aparte del tap
- [ ] Lista de sets guardados en el StudyAISheet + en el detalle de materia

**Done cuando:** el usuario genera un set, repasa todas las tarjetas marcándolas, y puede volver a abrir el set para repasar solo las pendientes.

---

### Fase 7 — Quiz (1 sesión)

**Objetivo:** flujo de quiz funcionando (sin persistencia).

- [ ] `src/features/study-ai/api/generateQuiz.ts` (llama la edge function ya existente)
- [ ] `useQuiz.ts` (estado en memoria)
- [ ] `QuizForm.tsx` (input + selector 5/10/15)
- [ ] `QuizSession.tsx`:
  - Una pregunta a la vez con progress bar
  - 4 opciones (radio buttons grandes)
  - Botón "Responder" deshabilitado hasta seleccionar
  - Al responder: opción correcta verde, incorrecta del usuario roja, explicación visible
  - Botón "Siguiente"
- [ ] `QuizResult.tsx`:
  - Score X/Y con animación
  - Confetti (Framer Motion) si score ≥ 70%
  - Botones: "Revisar respuestas" / "Hacer otro quiz" / "Volver"
- [ ] Modal de confirmación al salir a mitad del quiz

**Done cuando:** el usuario puede generar un quiz, responder todas las preguntas, ver el resultado con feedback por pregunta.

---

### Fase 8 — Pulido y QA (1 sesión)

**Objetivo:** experiencia consistente y robusta.

- [ ] Revisar todos los copys en español argentino
- [ ] Probar en mobile real (no solo devtools)
- [ ] Verificar accesibilidad: `aria-label` en botones icon-only, foco visible, contraste
- [ ] Validar manejo de errores en todos los flujos (rate limit, sin conexión, JWT expirado)
- [ ] Revisar performance del árbol con muchas materias (que el nuevo cálculo no sea lento)
- [ ] Animaciones: flip de flashcard, confetti, pulse de desbloqueo
- [ ] Verificar que el StudyAISheet no rompe el scroll del SubjectDetailSheet (sheets anidados en mobile)

**Done cuando:** la app se siente terminada, sin bugs visibles, animaciones fluidas.

---

### Fase 9 — Deploy a producción (1 sesión)

**Objetivo:** v2 live para usuarios.

- [ ] Merge de `feature/v2` a `main`
- [ ] Vercel deploya automáticamente
- [ ] Verificar que las edge functions están deployadas en Supabase
- [ ] Smoke test en producción: login → árbol → generar resumen → generar flashcards → quiz
- [ ] Anunciar v2 (si aplica)

**Done cuando:** v2 funcionando en producción sin errores en logs.

---

## 3. Tabla de dependencias

```
Fase 0 (prep)
    │
    ▼
Fase 1 (DB) ────────────┐
    │                   │
    ▼                   │
Fase 2 (edge funcs) ────┤
    │                   │
    ▼                   ▼
Fase 3 (correlativas)   Fase 4 (study-ai base)
                        │
                  ┌─────┴─────┐
                  ▼     ▼     ▼
              Fase 5  Fase 6  Fase 7
              (resu)  (flash) (quiz)
                  │     │     │
                  └─────┴─────┘
                        ▼
                Fase 8 (pulido)
                        ▼
                Fase 9 (deploy)
```

Fases 3, 5, 6, 7 son independientes entre sí (se pueden paralelizar si trabajan varias personas, o ir en cualquier orden si trabaja una sola).

---

## 4. Criterios globales de "done" por fase

Cada fase debe cumplir antes de pasar a la siguiente:

- ✅ Código tipado fuerte, sin `any`
- ✅ Sin errores ni warnings en `npm run build`
- ✅ Manejo explícito de errores en cada API call
- ✅ Mobile-first verificado en devtools (375×667)
- ✅ Copys en español argentino
- ✅ Sin tocar features de v1 (regresión cero)

---

## 5. Estimación de esfuerzo

| Fase | Sesiones | Riesgo |
|---|---|---|
| 0 — Preparación | 1 | Bajo |
| 1 — DB | 1 | Medio (RLS puede ser tricky) |
| 2 — Edge functions | 2 | Alto (calidad de la IA) |
| 3 — Correlativas | 1 | Medio (lógica del árbol) |
| 4 — Study-ai base | 1 | Bajo |
| 5 — Resumen | 1 | Bajo |
| 6 — Flashcards | 2 | Medio (animación + UX) |
| 7 — Quiz | 1 | Bajo |
| 8 — Pulido | 1 | Bajo |
| 9 — Deploy | 1 | Bajo |
| **Total** | **12 sesiones** | |

Una "sesión" = 1-2 horas de trabajo enfocado. Total estimado: ~20-25 horas de implementación.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| GitHub Models cambia rate limits o lo cierran | Abstraer el cliente de IA detrás de una función `callModel()` reutilizable, fácil de cambiar de proveedor |
| Calidad de los resúmenes/flashcards inconsistente | Iterar prompts en Fase 2 con ejemplos reales antes de avanzar |
| Lógica del árbol con tipos se vuelve confusa | Tests unitarios del cálculo de `treeStates` (con casos: cursando + dispo_rendir, etc.) |
| Migración de PK rompe queries existentes | Probar en staging primero; rollback plan documentado en Database-Spec |
| Sheets anidados en mobile rompen el scroll | Usar `vaul` o un componente de sheet probado en mobile; revisar en Fase 4 |

---

## 7. Lo que NO se hace en v2 (recordatorio)

- ❌ Persistencia de quizzes
- ❌ Notificaciones push
- ❌ Compartir árbol como imagen/link
- ❌ Simulador de cuatrimestre
- ❌ Edición de tipo en carreras pre-cargadas (solo en custom/importadas)
- ❌ Repaso espaciado (SRS) para flashcards — solo estados manuales (nueva/repasar/aprendida)
- ❌ Multi-idioma — sigue solo español argentino
- ❌ Tests E2E — solo tests unitarios del árbol si hace falta

---

## 8. Después de v2

Roadmap tentativo v3 (no se ejecuta ahora, solo para referencia):

- Simulador de cuatrimestre
- Compartir árbol
- Notificaciones de finales/parciales
- SRS para flashcards
- Modo offline básico
- Migración a Claude API o OpenAI pagos si la calidad de GitHub Models limita
- App nativa con Capacitor (si los usuarios la piden)

---

*Pendiente aprobación antes de comenzar la implementación (Fase 0).*
