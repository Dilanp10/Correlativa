-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 001 — subject_correlatives: agregar columna `type` + cambiar PK
--
-- Cambios:
--   1. Agrega columna `type` (text NOT NULL default 'para_cursar') con CHECK
--   2. Cambia la PRIMARY KEY a compuesta con `type` para soportar que la misma
--      relación exista como ambos tipos (caso real: cursar requiere regular,
--      rendir el final requiere aprobada).
--   3. Crea índice (subject_id, type) para queries por tipo
--
-- Idempotente: se puede correr múltiples veces sin romper.
-- Spec: specs/008-v2/Database-Spec.md §2.1
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Agregar columna type
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

-- 2) Cambiar la PRIMARY KEY a (subject_id, requires_subject_id, type)
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'subject_correlatives'::regclass
    AND contype = 'p';

  IF pk_name IS NOT NULL THEN
    -- Solo recreamos si la PK actual no incluye `type`.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'subject_correlatives'::regclass
        AND c.contype = 'p'
        AND a.attname = 'type'
    ) THEN
      EXECUTE format('ALTER TABLE subject_correlatives DROP CONSTRAINT %I', pk_name);
      ALTER TABLE subject_correlatives
        ADD PRIMARY KEY (subject_id, requires_subject_id, type);
    END IF;
  ELSE
    -- Caso raro: no había PK. La creamos.
    ALTER TABLE subject_correlatives
      ADD PRIMARY KEY (subject_id, requires_subject_id, type);
  END IF;
END $$;

-- 3) Índice compuesto para queries por (subject_id, type)
CREATE INDEX IF NOT EXISTS idx_subject_correlatives_subject_type
  ON subject_correlatives (subject_id, type);
