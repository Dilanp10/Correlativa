# Study-Database-Spec.md — Correlativa
## Paso 3 (SDD) — Esquema de Base de Datos: Sesiones de Estudio

> Estado: **borrador, pendiente de aprobación.**
> Depende de: `Study-Architecture.md` (aprobado).

---

## 1. Cambios

Una sola tabla nueva: **`user_study_sessions`**. Sin cambios en tablas existentes. RLS estándar (mismo patrón que `user_subjects` y `agenda_events`).

---

## 2. Tabla `user_study_sessions`

Cada fila representa **una sesión de estudio completada**. Las filas son inmutables (no se editan): si más adelante se quisiera permitir edición, se agrega `updated_at` en ese momento.

```sql
CREATE TABLE user_study_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  correct_count   int  NOT NULL,
  total_questions int  NOT NULL,
  CONSTRAINT valid_correct_count  CHECK (correct_count >= 0),
  CONSTRAINT valid_total_questions CHECK (total_questions > 0),
  CONSTRAINT correct_le_total      CHECK (correct_count <= total_questions)
);
```

### 2.1 Decisiones de campos
- **`subject_id` NOT NULL:** toda sesión está atada a una materia (decisión del PRD: el usuario elige obligatoriamente la materia para generar el quiz).
- **`ON DELETE CASCADE` en `user_id` y `subject_id`:** si el usuario o la materia se borran, las sesiones asociadas también — consistente con `user_subjects` y `agenda_events`.
- **`completed_at` con default `now()`:** simplifica los inserts.
- **`correct_count` y `total_questions` como `int`:** sesiones de 5 preguntas hoy; el campo soporta sesiones más largas en el futuro sin cambio de esquema.
- **Tres `CHECK`:** garantizan invariantes a nivel de base de datos (más robusto que confiar solo en el cliente).

### 2.2 Por qué `int` y no `smallint` o numéricos chicos
La diferencia de tamaño es marginal y `int` es el default natural en Postgres / Supabase, evitando casts en la app.

### 2.3 Por qué sin `updated_at`
Las sesiones son **inmutables**: se insertan al terminar el quiz y nunca cambian. Sin updated_at no hace falta trigger.

---

## 3. Índice

```sql
CREATE INDEX idx_user_study_sessions_user_completed
  ON user_study_sessions (user_id, completed_at DESC);
```

Soporta la consulta principal: "traer las sesiones del usuario actual, las más recientes primero". Cubre también el filtro por `user_id` solo (usado por `useStudySessions` para cargar todas y por `useGamification` para sumar XP).

---

## 4. Row Level Security

Mismo criterio que `user_subjects` y `agenda_events`: cada usuario opera solo sus propias filas.

```sql
ALTER TABLE user_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_study_sessions_select_own"
  ON user_study_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_study_sessions_insert_own"
  ON user_study_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_study_sessions_update_own"
  ON user_study_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "user_study_sessions_delete_own"
  ON user_study_sessions FOR DELETE
  USING (user_id = auth.uid());
```

UPDATE y DELETE se incluyen por consistencia con las otras tablas, aunque el frontend no las use en esta iteración (las filas son inmutables a nivel de producto).

---

## 5. Lo que NO cambia
- Tablas existentes (`users`, `subjects`, `user_subjects`, `agenda_events`, `class_schedule`, `careers`, `universities`, `subject_correlatives`).
- Políticas RLS existentes.
- Triggers existentes.

---

## 6. Plan operativo
La migración se corre en una sola query en Supabase SQL Editor. **La preparo y te la paso en el Paso 6 (Implementation-Plan)**, junto con las instrucciones para configurar el `GITHUB_MODELS_TOKEN` como secret en Supabase Edge Functions.
