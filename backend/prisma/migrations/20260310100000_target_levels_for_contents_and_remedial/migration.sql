-- Allow targeting multiple classes for publications.

ALTER TABLE "contents"
  ADD COLUMN IF NOT EXISTS "target_levels" "EducationLevel"[] NOT NULL DEFAULT '{}'::"EducationLevel"[];

CREATE INDEX IF NOT EXISTS "Content_target_levels_idx"
  ON "contents" USING GIN ("target_levels");

ALTER TABLE "remedial_sessions"
  ADD COLUMN IF NOT EXISTS "target_levels" "AcademicLevel"[] NOT NULL DEFAULT '{}'::"AcademicLevel"[];

CREATE INDEX IF NOT EXISTS "remedial_sessions_target_levels_idx"
  ON "remedial_sessions" USING GIN ("target_levels");

