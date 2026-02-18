DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AcademicLevel') THEN
    CREATE TYPE "AcademicLevel" AS ENUM ('9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "student_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "level" "AcademicLevel" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE "student_profiles"
      ADD CONSTRAINT "student_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "student_profiles_level_idx" ON "student_profiles"("level");

INSERT INTO "student_profiles" ("user_id", "level", "created_at", "updated_at")
SELECT
  s.id,
  CASE s.level
    WHEN 'LEVEL_9E' THEN CAST('9e' AS "AcademicLevel")
    WHEN 'NS1' THEN CAST('NSI' AS "AcademicLevel")
    WHEN 'NS2' THEN CAST('NSII' AS "AcademicLevel")
    WHEN 'NS3' THEN CAST('NSIII' AS "AcademicLevel")
    WHEN 'TERMINALE' THEN CAST('NSIV' AS "AcademicLevel")
    WHEN 'UNIVERSITE' THEN CAST('Universitaire' AS "AcademicLevel")
    ELSE CAST('NSIV' AS "AcademicLevel")
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Student" s
WHERE s.role = 'STUDENT'
  AND NOT EXISTS (
    SELECT 1 FROM "student_profiles" sp WHERE sp.user_id = s.id
  );

CREATE TABLE IF NOT EXISTS "exams" (
  "id" SERIAL PRIMARY KEY,
  "subject" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "level" "AcademicLevel" NOT NULL
);

CREATE INDEX IF NOT EXISTS "exams_level_idx" ON "exams"("level");
CREATE INDEX IF NOT EXISTS "exams_subject_idx" ON "exams"("subject");

CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id" SERIAL PRIMARY KEY,
  "exam_id" INTEGER NOT NULL,
  "question_text" TEXT NOT NULL,
  "topic" TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_exam_id_fkey'
  ) THEN
    ALTER TABLE "exam_questions"
      ADD CONSTRAINT "exam_questions_exam_id_fkey"
      FOREIGN KEY ("exam_id") REFERENCES "exams"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "questions_topic_idx" ON "exam_questions"("topic");
CREATE INDEX IF NOT EXISTS "questions_exam_id_idx" ON "exam_questions"("exam_id");
