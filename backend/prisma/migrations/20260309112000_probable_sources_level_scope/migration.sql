ALTER TABLE probable_exercise_sources
  ADD COLUMN IF NOT EXISTS level "AcademicLevel" NOT NULL DEFAULT 'NSIV';

DROP INDEX IF EXISTS probable_exercise_sources_unique;

CREATE UNIQUE INDEX IF NOT EXISTS probable_exercise_sources_unique
  ON probable_exercise_sources (subject, topic, file_name, level);

CREATE INDEX IF NOT EXISTS probable_exercise_sources_level_subject_topic_idx
  ON probable_exercise_sources (level, subject, topic);
