ALTER TABLE "study_plans"
  ADD COLUMN IF NOT EXISTS "chapter_order" INTEGER,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "exercises" TEXT;

CREATE INDEX IF NOT EXISTS "study_plans_subject_chapter_order_idx" ON "study_plans"("subject", "chapter_order");

UPDATE "study_plans"
SET "chapter_order" = CAST(SUBSTRING("title" FROM 'M([0-9]+)') AS INTEGER)
WHERE "chapter_order" IS NULL
  AND "title" ~ 'M[0-9]+'
  AND "subject" = 'Chimie';

UPDATE "study_plans"
SET "notes" = "description"
WHERE "notes" IS NULL
  AND "subject" = 'Chimie';

UPDATE "study_plans"
SET "exercises" = '1) Resume le chapitre.\n2) Reponds a 5 questions de comprehension.\n3) Resolus 3 exercices d''application.'
WHERE "exercises" IS NULL
  AND "subject" = 'Chimie';
