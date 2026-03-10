-- Teachers can work in multiple schools and teach multiple subjects.

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "teaching_schools" TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "teaching_subjects" TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS "Student_teaching_schools_idx"
  ON "Student" USING GIN ("teaching_schools");

CREATE INDEX IF NOT EXISTS "Student_teaching_subjects_idx"
  ON "Student" USING GIN ("teaching_subjects");

