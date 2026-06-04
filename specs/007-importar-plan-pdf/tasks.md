# Tasks: Importar Plan de Estudios desde PDF

**Feature**: `specs/007-importar-plan-pdf/`
**Input**: spec.md (3 historias priorizadas), plan.md (estructura), research.md (D1-D7), data-model.md (entidades), contracts/parse-study-plan.contract.md (Edge Function + tipos TS).

**Format**: `- [ ] [TaskID] [P?] [Story?] Descripción con path`
- `[P]` = paralelizable con otras tareas (archivos distintos, sin dependencias).
- `[USx]` = pertenece a User Story x (P1=US1, P2=US2, P3=US3).
- Tareas sin `[USx]` son setup, foundational o polish (cross-cutting).

---

## Phase 1: Setup

- [X] **T001** Crear estructura de carpetas: `src/features/pdf-import/{lib,api,hooks,components}/` y `supabase/functions/parse-study-plan/`.
- [X] **T002** [P] Verificar que el secret `GITHUB_MODELS_TOKEN` ya existe en Supabase (reusa el de `generate-quiz`). Si no existe, documentarlo en quickstart.

---

## Phase 2: Foundational (bloqueante para todas las historias)

Establece los contratos compartidos y el esqueleto del Edge Function antes de
que cualquier historia pueda implementarse.

- [X] **T003** [P] Crear tipos TS en `src/features/pdf-import/lib/types.ts` (`SubjectDraft`, `ParseResult`, `SaveResult`, `PdfImportError`, etc.) según `contracts/parse-study-plan.contract.md`.
- [X] **T004** [P] Crear `src/features/pdf-import/lib/subjectParser.ts` con función pura `validateSubjectDraft(raw: unknown): SubjectDraft | null` y `isValidParseResult(data: unknown): boolean` (validación defensiva del JSON que viene del backend).
- [X] **T005** [P] Tests Vitest en `src/features/pdf-import/lib/subjectParser.test.ts` (cubrir: subject válido, faltan campos, year/semester null, correlatives vacío, shape inválido).
- [X] **T006** Esqueleto del Edge Function en `supabase/functions/parse-study-plan/index.ts`: handler con CORS (mismos headers que `generate-quiz`), validación de JWT en `Authorization`, routing por `action` (`parse` | `save`), validación del body. Sin lógica de parseo todavía — solo devuelve 501 para cada action.

---

## Phase 3: User Story 1 — Cargar materias desde el PDF (P1)

**Goal**: El usuario sube el PDF, ve las materias detectadas, confirma, y aparecen en su árbol.

**Independent Test**: Login → ir a `/importar-plan` → seleccionar PDF → esperar preview → confirmar → verificar materias en el árbol.

### Backend (Edge Function)

- [X] **T007** [US1] Implementar action `parse` en `supabase/functions/parse-study-plan/index.ts`: recibir multipart/form-data, extraer binario del PDF (validar tamaño ≤ 5 MB), llamar a `unpdf` para sacar texto, truncar a 50.000 chars si excede.
- [X] **T008** [US1] En el mismo handler, construir prompt para GitHub Models pidiendo JSON estructurado de materias (nombre, año, semestre, correlativas[]). Reutilizar el patrón de `generate-quiz/index.ts`. `response_format: json_object`, modelo `gpt-4o-mini`, max_tokens 4000.
- [X] **T009** [US1] Validar el JSON devuelto por la IA (cantidad mínima de materias, shape de cada item). Si falla, reintentar 1 vez; si vuelve a fallar, devolver 502 con `ai_invalid_response`. Si no se detectan materias, devolver 422 con `no_subjects_found`.
- [X] **T010** [US1] Implementar action `save` en el mismo Edge Function: validar JWT, recibir `{ careerId, subjects[] }`, crear cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY`, insertar materias en `subjects` con `ON CONFLICT (career_id, name) DO NOTHING`. Devolver IDs insertados vs skipped.
- [X] **T011** [US1] En `save`, resolver correlativas: para cada `correlativeName` en cada materia, buscar el ID por nombre dentro de las materias recién insertadas + ya existentes de esa carrera. Insertar en `subject_correlatives`. Reportar `correlativesUnresolved` (nombres que no matchearon).

### Cliente API

- [X] **T012** [P] [US1] Crear `src/features/pdf-import/api/parseStudyPlan.ts` con `parsePdf(file: File)` y `saveSubjects(careerId, subjects)`. Mismo patrón de manejo de errores que `generateQuiz.ts` (parsea `error.context` cuando supabase-js falla, mapea status → `PdfImportError`).

### Hook + state machine

- [X] **T013** [US1] Crear `src/features/pdf-import/hooks/usePdfImport.ts` con state machine (`idle | parsing | preview | saving | done | error`). Expone `parse(file)`, `save()`, `reset()`. Mantiene `subjects` detectadas en estado local. Al `save` exitoso, fuerza recarga del `subjectsStore` para que el árbol vea las nuevas materias.

### Componentes

- [X] **T014** [P] [US1] Crear `src/features/pdf-import/components/PdfUploader.tsx`: input `type="file"` con `accept="application/pdf"`, validación de tamaño en el cliente (5 MB), estado disabled cuando está procesando.
- [X] **T015** [P] [US1] Crear `src/features/pdf-import/components/SubjectPreview.tsx`: lista de `SubjectDraft[]` agrupadas por año, badge de `confidence`, banner amarillo si `partial: true` o hay warning, botones "Confirmar" y "Cancelar".
- [X] **T016** [US1] Crear `src/pages/PdfImportPage.tsx`: compone `PdfUploader` + `SubjectPreview` + estados de carga/error/done. Usa `usePdfImport`. Header con título y descripción. Mobile-first con `max-w-md mx-auto`. Al `done`, navegación al árbol con mensaje festivo breve.

### Ruteo

- [X] **T017** [US1] Agregar ruta `/importar-plan` en `src/App.tsx` (lazy load + `ProtectedRoute` + `CareerRequiredRoute`).
- [X] **T018** [US1] Agregar constante `ROUTES.PDF_IMPORT = '/importar-plan'` en `src/shared/constants/index.ts`.

### Deploy manual del Edge Function

- [ ] **T019** [US1] **MANUAL (usuario)**: Re-deploy del Edge Function `parse-study-plan` en Supabase Dashboard → Edge Functions → Deploy new function. Pegar el `index.ts` final. **Desactivar "Verify JWT with legacy secret"** (mismo patrón que `generate-quiz` para evitar el problema de CORS que ya resolvimos).

---

## Phase 4: User Story 2 — Banner en Dashboard (P2)

**Goal**: Mientras el usuario no tenga materias cargadas, ver un banner en Dashboard que invita a subir el PDF.

**Independent Test**: Login con usuario sin materias → ver banner en Dashboard → tocar banner → navega a `/importar-plan`. Al cargar materias (por cualquier vía), el banner desaparece.

- [X] **T020** [P] [US2] Crear `src/features/pdf-import/components/PdfImportBanner.tsx`: lee `useSubjectsStore` (`userSubjects`, `loaded`). Renderiza `null` si no cargó o si hay materias. Si no hay materias: card con título, descripción corta y CTA "Subir plan de estudios" que navega a `ROUTES.PDF_IMPORT`. Mobile-first, estilo coherente con `LevelCard` (border, accent).
- [X] **T021** [US2] Integrar `<PdfImportBanner />` en `src/pages/DashboardPage.tsx`, antes del `LevelCard` (o donde tenga sentido visualmente, por encima del resto del contenido).

---

## Phase 5: User Story 3 — Oferta en onboarding (P3)

**Goal**: Al terminar el setup inicial de carrera, ofrecer subir el PDF antes de entrar al Dashboard.

**Independent Test**: Crear usuario nuevo → completar onboarding (universidad + carrera) → ver pantalla "¿Subís tu plan?" con dos opciones → ambas funcionan.

- [X] **T022** [US3] Modificar `src/pages/OnboardingPage.tsx`: después del paso de carrera, agregar un paso opcional final (sub-step interno o vista renderizada condicionalmente) con copy "¿Querés cargar tus materias desde el PDF de tu plan de estudios?" y dos botones: "Subir ahora" (→ `/importar-plan`) y "Lo hago después" (→ `/dashboard`).
- [X] **T023** [P] [US3] En el flujo de "Subir ahora", pasar query param o flag `from=onboarding` a `/importar-plan` (para que al terminar, navegue al Dashboard en lugar de al árbol — coherencia de UX).
- [X] **T024** [US3] En `PdfImportPage.tsx`, leer el query param y ajustar la navegación post-`done` si viene de onboarding.

---

## Phase 6: Polish & Cross-Cutting

- [X] **T025** [P] Verificar accesibilidad: `aria-label` en el botón del banner, focus management en `PdfImportPage` cuando cambia de fase.
- [X] **T026** [P] Verificar mobile: probar upload en celular real (file picker nativo iOS/Android), scroll en preview con muchas materias.
- [X] **T027** Correr `npx tsc --noEmit` + `npx vitest run` + `npm run build`. Todo en verde.
- [X] **T028** Commit final con mensaje siguiendo el estilo del repo (feat:, conventional commits) + push a main.
- [ ] **T029** Probar end-to-end en producción tras el deploy de Vercel + redeploy del Edge Function.

---

## Dependencias

```
Phase 1 (Setup) ────────────────────────────────────────────┐
   │                                                         │
Phase 2 (Foundational: T003-T006) ──┐                       │
   │                                  │                       │
Phase 3 (US1) ──────────────────────┼──── independiente ────┤
   │ Backend T007-T011                │                       │
   │ Cliente T012                     │                       │
   │ Hook T013                        │                       │
   │ Componentes T014-T016            │                       │
   │ Ruteo T017-T018                  │                       │
   │ Deploy T019 (manual)             │                       │
   │                                  │                       │
Phase 4 (US2) ── depende solo de T017-T018 (necesita la ruta) ┤
   │ Componente T020 + integración T021                      │
   │                                                         │
Phase 5 (US3) ── depende de T017-T018                        │
   │ T022-T024                                               │
   │                                                         │
Phase 6 (Polish) ── después de todo                          ┘
```

**Orden de implementación recomendado**: 1 → 2 → 3 (MVP completo) → 4 → 5 → 6.

**MVP funcional**: con Phase 1 + 2 + 3 (T001-T019) el usuario ya puede importar su PDF entrando manualmente a `/importar-plan`. El banner y el onboarding son refinamientos.

---

## Oportunidades de paralelismo

Dentro de **Phase 2**: T003, T004, T005 son archivos distintos y pueden trabajarse en paralelo. T006 toca el Edge Function (otro lenguaje, otra carpeta).

Dentro de **Phase 3**: una vez listo el backend (T007-T011), T012 (cliente) + T014 (PdfUploader) + T015 (SubjectPreview) pueden ir en paralelo porque tocan archivos distintos. T013 (hook) y T016 (PdfImportPage) los conectan.

**Phase 4 y 5** pueden hacerse en paralelo entre sí (US2 y US3 son independientes — solo comparten la ruta `/importar-plan` que ya existe tras Phase 3).

---

## Independent Test Criteria por historia

| Historia | Cómo probar de punta a punta |
|---|---|
| **US1 (P1)** | Ir manualmente a `/importar-plan`, subir PDF, ver preview, confirmar, ver materias en el árbol. |
| **US2 (P2)** | Login con usuario sin materias → ver banner en Dashboard. Cargar 1 materia → banner desaparece. |
| **US3 (P3)** | Crear cuenta nueva → completar onboarding → ver paso "¿Subís tu plan?" → "Lo hago después" → llegar al Dashboard. |

---

## Notas

- **Tests**: la spec no pidió tests exhaustivos (la lógica más sensible está en el backend, donde se prueba con quickstart manual). Solo se piden tests Vitest sobre `subjectParser` (validación defensiva del JSON), que es la única lógica pura del front.
- **Deploy del Edge Function (T019)**: igual que `generate-quiz` y como ya está documentado en otras features, es paso manual del usuario en Supabase Dashboard.
- **Reuso**: NO hay tablas nuevas. NO se agrega bucket de Storage (procesamiento on-the-fly). NO se cambia RLS.
