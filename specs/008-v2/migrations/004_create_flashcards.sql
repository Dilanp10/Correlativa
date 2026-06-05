-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 004 — flashcards + ENUM flashcard_status
--
-- Tarjetas individuales de un set. Cada una tiene estado (nueva/repasar/
-- aprendida) que se actualiza durante el repaso.
--
-- Idempotente.
-- Spec: specs/008-v2/Database-Spec.md §3.2
-- ─────────────────────────────────────────────────────────────────────────────

-- ENUM flashcard_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'flashcard_status'
  ) THEN
    CREATE TYPE flashcard_status AS ENUM ('nueva', 'repasar', 'aprendida');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS flashcards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id       uuid NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  question     text NOT NULL,
  answer       text NOT NULL,
  status       flashcard_status NOT NULL DEFAULT 'nueva',
  reviewed_at  timestamptz,
  position     smallint NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_flashcards_set
  ON flashcards (set_id, position);

CREATE INDEX IF NOT EXISTS idx_flashcards_status
  ON flashcards (set_id, status);
