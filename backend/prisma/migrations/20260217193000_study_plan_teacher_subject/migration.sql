DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plans' AND column_name = 'subject'
  ) THEN
    ALTER TABLE "study_plans" ADD COLUMN "subject" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plans' AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE "study_plans" ADD COLUMN "created_by_id" INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_plans_created_by_id_fkey'
  ) THEN
    ALTER TABLE "study_plans"
      ADD CONSTRAINT "study_plans_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "Student"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "StudyPlan_subject_idx" ON "study_plans"("subject");
CREATE INDEX IF NOT EXISTS "StudyPlan_created_by_id_idx" ON "study_plans"("created_by_id");

