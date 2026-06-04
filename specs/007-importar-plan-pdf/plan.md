# Implementation Plan: Importar Plan de Estudios desde PDF

**Branch**: `007-importar-plan-pdf` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-importar-plan-pdf/spec.md`

## Summary

El usuario sube el PDF oficial de su plan de estudios. Un Edge Function extrae el texto con `unpdf` y lo pasa a GitHub Models (gpt-4o-mini) para estructurarlo en JSON. El resultado (lista de materias con año, cuatrimestre y correlativas) se muestra al usuario para confirmar. Al confirmar, el mismo Edge Function inserta las materias en `subjects` y `subject_correlatives` usando la service role key. El banner del Dashboard desaparece cuando `userSubjects.length > 0` (derivado del estado existente). El onboarding agrega un paso opcional al final.

---

## Technical Context

**Language/Version**: TypeScript estricto (front) + Deno (Edge Function).

**Primary Dependencies**:
- `unpdf` (unjs) — extracción de texto de PDF en Deno/Edge.
- GitHub Models (`gpt-4o-mini`) — estructuración del texto en JSON.
- Supabase Edge Functions — backend.
- Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) — insert masivo.

**Storage**: Sin bucket nuevo. Procesamiento on the fly (sin guardar el PDF).

**Testing**: Vitest sobre la lógica de parseo/validación del JSON de materias (funciones puras).

**Target Platform**: Mobile-first, web.

**Project Type**: Single-project SPA + Edge Functions backend.

**Performance Goals**: Procesamiento completo (upload → IA → preview) en menos de 15 segundos en condiciones normales.

**Constraints**:
- PDF máximo 5 MB.
- Texto enviado a IA: máximo 50.000 caracteres.
- Sin tablas nuevas; inserts en `subjects` y `subject_correlatives` existentes.
- Supabase free tier.

**Scale/Scope**: ~1 Edge Function nueva (`parse-study-plan`), ~1 feature nueva (`src/features/pdf-import/`), 1 pantalla de preview, 1 paso en onboarding, 1 banner en Dashboard.

---

## Constitution Check

| Principio | Cumple | Notas |
|---|---|---|
| I. Spec-Driven Development | ✅ | Flujo completo speckit seguido. |
| II. Mobile-first | ✅ | Upload nativo en mobile, preview scrollable, botones grandes. |
| III. Feature-first desacoplada | ✅ | Nueva `features/pdf-import/`; banner en Dashboard es un componente separado. |
| IV. TypeScript estricto + lógica pura testeable | ✅ | Validación del JSON de materias en `lib/` con tests Vitest. |
| V. Estado derivado | ✅ | Banner derivado de `userSubjects.length > 0`. Sin columna nueva. |
| Stack y restricciones | ✅ | Edge Function + unpdf + GitHub Models; todo en free tier. |
| Separación engagement/progreso | ✅ | Esta feature carga datos académicos reales (subjects), no métricas de engagement. No toca XP, racha ni logros. |

**Resultado**: PASA. Sin violaciones.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-importar-plan-pdf/
├── spec.md
├── plan.md              ← este archivo
├── research.md          ← decisiones D1-D7
├── data-model.md
├── quickstart.md
├── contracts/
│   └── parse-study-plan.contract.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
src/
├── features/
│   └── pdf-import/                       # NUEVA feature
│       ├── lib/
│       │   ├── subjectParser.ts           # validación del JSON de materias (pura)
│       │   └── subjectParser.test.ts      # tests Vitest
│       ├── api/
│       │   └── parseStudyPlan.ts          # cliente → Edge Function
│       ├── hooks/
│       │   └── usePdfImport.ts            # estado de la importación
│       └── components/
│           ├── PdfUploader.tsx            # selector de archivo + botón
│           ├── SubjectPreview.tsx         # lista de materias detectadas + confirmar
│           └── PdfImportBanner.tsx        # banner del Dashboard (derivado del estado)
├── pages/
│   ├── PdfImportPage.tsx                  # pantalla completa de importación
│   ├── OnboardingPage.tsx                 # agregar paso opcional al final
│   └── DashboardPage.tsx                  # montar PdfImportBanner condicionalmente
└── App.tsx                                # agregar ruta /importar-plan

supabase/
└── functions/
    └── parse-study-plan/
        └── index.ts                       # Edge Function nueva
```

---

## Flujo de datos end-to-end

```
[Usuario] → selecciona PDF
    ↓
[PdfUploader] → envía como multipart/form-data
    ↓
[Edge Function parse-study-plan]
  1. Recibe binario del PDF (≤ 5 MB)
  2. Extrae texto con unpdf
  3. Trunca a 50K chars si es necesario
  4. Llama a GitHub Models con prompt estructurado
  5. Valida JSON devuelto (nombre, año, cuatrimestre, correlativas[])
  6. Devuelve { subjects: SubjectDraft[] }
    ↓
[SubjectPreview] → muestra lista + botón "Confirmar"
    ↓
[Usuario confirma]
    ↓
[Edge Function parse-study-plan — segunda llamada con action: 'save']
  - Inserta en subjects (ON CONFLICT DO NOTHING)
  - Inserta en subject_correlatives (resolución de nombres a IDs)
  - Devuelve { inserted: number, skipped: number }
    ↓
[subjectsStore.reload()] → actualiza el árbol
[Banner desaparece] → userSubjects.length > 0
```

---

## Complexity Tracking

> Sin violaciones de constitución. No aplica.
