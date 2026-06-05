-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 005 — RLS policies para tablas de v2
--
-- Todas las tablas nuevas son privadas por usuario. Las flashcards heredan
-- la propiedad vía join con flashcard_sets.
--
-- Idempotente (las policies se recrean con DROP IF EXISTS + CREATE).
-- Spec: specs/008-v2/Database-Spec.md §4
-- ─────────────────────────────────────────────────────────────────────────────

-- ── study_notes ──────────────────────────────────────────────────────────────
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_notes_owner_select" ON study_notes;
DROP POLICY IF EXISTS "study_notes_owner_insert" ON study_notes;
DROP POLICY IF EXISTS "study_notes_owner_delete" ON study_notes;

CREATE POLICY "study_notes_owner_select" ON study_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "study_notes_owner_insert" ON study_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_notes_owner_delete" ON study_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ── flashcard_sets ───────────────────────────────────────────────────────────
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcard_sets_owner_all" ON flashcard_sets;

CREATE POLICY "flashcard_sets_owner_all" ON flashcard_sets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── flashcards (acceso vía join) ─────────────────────────────────────────────
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcards_owner_all" ON flashcards;

CREATE POLICY "flashcards_owner_all" ON flashcards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      WHERE fs.id = flashcards.set_id AND fs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      WHERE fs.id = flashcards.set_id AND fs.user_id = auth.uid()
    )
  );
