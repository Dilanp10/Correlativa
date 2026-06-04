# Data Model: Importar Plan de Estudios desde PDF

> Esta feature NO agrega tablas nuevas. Solo escribe en tablas ya existentes
> (`subjects`, `subject_correlatives`) y lee del estado ya existente
> (`userSubjects`) para el banner.

---

## Entidades en memoria (transitorias)

### SubjectDraft

Materia detectada del PDF, antes de confirmar. No se persiste hasta que el
usuario confirma.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre de la materia (extraído del PDF). |
| `year` | `number \| null` | Año de la carrera (1, 2, 3...). Null si no se detectó. |
| `semester` | `number \| null` | Cuatrimestre/semestre (1 o 2). Null si no se detectó. |
| `correlativeNames` | `string[]` | Nombres de materias correlativas (como texto; se resuelven a IDs en el backend). |
| `confidence` | `'high' \| 'low'` | Confianza del parser. 'low' si faltan datos clave (año o semestre). |

### ParseResult

Resultado de la Edge Function al procesar el PDF.

| Campo | Tipo | Descripción |
|---|---|---|
| `subjects` | `SubjectDraft[]` | Materias detectadas. |
| `partial` | `boolean` | True si la extracción fue incompleta (PDF con texto ilegible en partes). |
| `warning` | `string \| null` | Mensaje opcional al usuario (ej: "No se pudo leer la página 3"). |

### SaveResult

Resultado de la Edge Function al confirmar la inserción.

| Campo | Tipo | Descripción |
|---|---|---|
| `inserted` | `number` | Materias nuevas insertadas. |
| `skipped` | `number` | Materias que ya existían (ON CONFLICT DO NOTHING). |
| `correlativesLinked` | `number` | Relaciones de correlativas creadas. |
| `correlativesUnresolved` | `string[]` | Nombres de correlativas que no pudieron resolverse a IDs. |

---

## Tablas existentes afectadas

### `subjects` (ya existe)

El Edge Function inserta filas nuevas con:
- `career_id`: de la carrera activa del usuario.
- `name`, `year`, `semester`: del SubjectDraft.
- `is_custom`: `true` (materias importadas por el usuario se marcan como custom).

Deduplicación: `ON CONFLICT (career_id, name) DO NOTHING`.

### `subject_correlatives` (ya existe)

El Edge Function resuelve los `correlativeNames` a IDs de materias ya
insertadas e inserta las relaciones.
Si un nombre no se resuelve → se omite y se reporta en `correlativesUnresolved`.

---

## Estado derivado (sin persistir)

### Condición del banner

```ts
// src/pages/DashboardPage.tsx
const showPdfBanner = subjectsLoaded && userSubjects.length === 0
```

No hay columna `pdf_imported` ni flag persistido. El banner simplemente
refleja si el usuario tiene o no materias. Idempotente y reversible.

---

## Notas de seguridad

- El Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para el insert (bypasses RLS).
- El JWT del usuario se valida en el Edge Function antes de hacer cualquier
  insert, igual que `generate-quiz`. Solo el dueño de la sesión puede disparar
  la importación.
- El PDF nunca se guarda; se descarta en memoria tras el procesamiento.
