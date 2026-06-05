-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 002 — study_notes (resúmenes guardados)
--
-- Tabla para los resúmenes generados por IA que el usuario quiere conservar.
-- Persistencia automática (sin botón "guardar"): cada resumen se inserta
-- apenas la IA responde.
--
-- Idempotente.
-- Spec: specs/008-v2/Database-Spec.md §3.1
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic       text NOT NULL,
  title       text NOT NULL,
  content     text NOT NULL,
  key_points  text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_subject
  ON study_notes (user_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_study_notes_created_at
  ON study_notes (user_id, created_at DESC);
