-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 003 — flashcard_sets
--
-- Cabecera de un set de flashcards generado por IA. Las flashcards en sí
-- viven en otra tabla (`flashcards`) con FK a este set.
--
-- Idempotente.
-- Spec: specs/008-v2/Database-Spec.md §3.2
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcard_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_subject
  ON flashcard_sets (user_id, subject_id);
