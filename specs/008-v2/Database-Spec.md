# Database-Spec.md — Correlativa v2

**Fecha:** 2026-06-05
**Estado:** Borrador — pendiente aprobación
**Basado en:** specs/002-mvp-core/data-model.md (v1)

---

## 1. Diagrama actualizado (v2)

```
[v1] universities ──┐
                    │
[v1] careers ───────┤
   │                │
[v1] subjects ──────┤
   │   ▲            │
   │   │            │
[v1+v2] subject_correlatives    ← se agrega columna `type`
   │                │
[v1] user_subjects ─┘
   │
[v1] users
   │
   ├── [v2] study_notes        (resúmenes guardados)
   └── [v2] flashcard_sets
              │
              └── [v2] flashcards

(los quizzes NO se persisten — son one-shot)
```

---

## 2. Cambios a tablas existentes

### 2.1 `subject_correlatives` — agregar columna `type`

```sql
-- Migración (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subject_correlatives' AND column_name = 'type'
  ) THEN
    ALTER TABLE subject_correlatives
      ADD COLUMN type text NOT NULL DEFAULT 'para_cursar'
      CHECK (type IN ('para_cursar', 'para_rendir'));
  END IF;
END $$;

-- Índice compuesto para queries por (subject_id, type)
CREATE INDEX IF NOT EXISTS idx_subject_correlatives_subject_type
  ON subject_correlatives (subject_id, type);
```

**Cambio en la PRIMARY KEY:**
Originalmente era `(subject_id, requires_subject_id)`. En v2 una misma relación puede existir como `para_cursar` y `para_rendir` (un caso real: para cursar Análisis II necesitás Análisis I regularizada; para rendir el final necesitás Análisis I aprobada).

```sql
-- Cambio de PRIMARY KEY (migración cuidadosa)
ALTER TABLE subject_correlatives DROP CONSTRAINT subject_correlatives_pkey;
ALTER TABLE subject_correlatives
  ADD PRIMARY KEY (subject_id, requires_subject_id, type);
```

**Semántica final:**

| type | Significado |
|---|---|
| `para_cursar` | Hay que tener `requires_subject_id` en estado `regular`, `promocionada` o `aprobada` para **inscribirse a cursar** `subject_id` |
| `para_rendir` | Hay que tener `requires_subject_id` en estado `aprobada` o `promocionada` para **rendir el final** de `subject_id` |

---

## 3. Nuevas tablas

### 3.1 `study_notes` — resúmenes guardados

```sql
CREATE TABLE study_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic       text NOT NULL,                  -- "Integrales", "Cinemática"
  title       text NOT NULL,                  -- título generado por IA
  content     text NOT NULL,                  -- cuerpo del resumen
  key_points  text[] NOT NULL DEFAULT '{}',   -- bullets de puntos clave
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_notes_user_subject ON study_notes (user_id, subject_id);
CREATE INDEX idx_study_notes_created_at ON study_notes (user_id, created_at DESC);
```

**Persistencia automática:** cada resumen generado se guarda en el momento (sin botón explícito). El usuario puede borrarlo después si quiere.

---

### 3.2 `flashcard_sets` + `flashcards`

```sql
CREATE TABLE flashcard_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_sets_user_subject ON flashcard_sets (user_id, subject_id);

CREATE TYPE flashcard_status AS ENUM ('nueva', 'repasar', 'aprendida');

CREATE TABLE flashcards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id        uuid NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  question      text NOT NULL,
  answer        text NOT NULL,
  status        flashcard_status NOT NULL DEFAULT 'nueva',
  reviewed_at   timestamptz,
  position      smallint NOT NULL DEFAULT 0      -- orden dentro del set
);

CREATE INDEX idx_flashcards_set ON flashcards (set_id, position);
CREATE INDEX idx_flashcards_status ON flashcards (set_id, status);
```

**¿Por qué separar `flashcard_sets` y `flashcards`?**
- Permite borrar/regenerar un set completo sin perder otros.
- El usuario puede tener varios sets por materia (uno por unidad temática).
- El estado por tarjeta permite repaso espaciado simple sin SRS complejo (eso queda para v3).

---

## 4. Row Level Security (RLS)

Todas las tablas nuevas son **privadas por usuario**. RLS estricta.

```sql
-- study_notes
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_notes_owner_select" ON study_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_notes_owner_insert" ON study_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_notes_owner_delete" ON study_notes
  FOR DELETE USING (auth.uid() = user_id);

-- flashcard_sets
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_sets_owner_all" ON flashcard_sets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- flashcards (acceso vía join con flashcard_sets)
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcards_owner_all" ON flashcards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      WHERE fs.id = flashcards.set_id AND fs.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      WHERE fs.id = flashcards.set_id AND fs.user_id = auth.uid()
    )
  );
```

**RLS para `subject_correlatives.type`:** no cambia. Las correlativas son del catálogo (lectura pública si la carrera no es custom; lectura privada si lo es) — el cambio de columna no afecta esa lógica.

---

## 5. Migraciones (orden de ejecución)

```
001_alter_subject_correlatives_type.sql
002_create_study_notes.sql
003_create_flashcard_sets.sql
004_create_flashcards.sql
005_rls_policies_v2.sql
```

Cada migración es **idempotente** (`IF NOT EXISTS`, `DO $$ ... END $$`) para poder correrlas múltiples veces sin romper.

---

## 6. Datos seed (no se necesita)

v2 no agrega datos pre-cargados. Todo lo nuevo es generado por el usuario.

---

## 7. Consideraciones de performance

| Query | Índice que la cubre |
|---|---|
| "Correlativas para cursar de la materia X" | `idx_subject_correlatives_subject_type` |
| "Mis resúmenes de la materia X" | `idx_study_notes_user_subject` |
| "Mis últimos resúmenes" | `idx_study_notes_created_at` |
| "Tarjetas del set X en orden" | `idx_flashcards_set` |
| "Tarjetas del set X a repasar" | `idx_flashcards_status` |

---

## 8. Rollback plan

Si algo se rompe en producción:

```sql
-- Quitar tipo (vuelve a v1 sin breaking)
ALTER TABLE subject_correlatives DROP CONSTRAINT subject_correlatives_pkey;
ALTER TABLE subject_correlatives ADD PRIMARY KEY (subject_id, requires_subject_id);
ALTER TABLE subject_correlatives DROP COLUMN type;

-- Drop tablas nuevas (no hay dependencias en v1)
DROP TABLE flashcards;
DROP TABLE flashcard_sets;
DROP TABLE study_notes;
DROP TYPE flashcard_status;
```

---

*Pendiente aprobación antes de continuar con UX-Spec.md*
