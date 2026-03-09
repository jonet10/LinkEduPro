ALTER TABLE probable_exercise_sources
  ADD COLUMN IF NOT EXISTS level "AcademicLevel" NOT NULL DEFAULT 'NSIV';

ALTER TABLE probable_exercise_sources
  DROP CONSTRAINT IF EXISTS probable_exercise_sources_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'probable_exercise_sources_unique'
      AND conrelid = 'probable_exercise_sources'::regclass
  ) THEN
    ALTER TABLE probable_exercise_sources
      ADD CONSTRAINT probable_exercise_sources_unique
      UNIQUE (subject, topic, file_name, level);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS probable_exercise_sources_level_subject_topic_idx
  ON probable_exercise_sources (level, subject, topic);
