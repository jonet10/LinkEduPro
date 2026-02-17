-- v2.0 learning suite + profile extension (safe additive migration)

-- Create enums if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EducationLevel') THEN
    CREATE TYPE "EducationLevel" AS ENUM ('9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentType') THEN
    CREATE TYPE "ContentType" AS ENUM ('quiz', 'pdf', 'video', 'revision');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentStatus') THEN
    CREATE TYPE "ContentStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');
  END IF;
END $$;

-- Extend users table (Student model)
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "level" "EducationLevel";
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "dark_mode" BOOLEAN NOT NULL DEFAULT false;

-- Focus mode
CREATE TABLE IF NOT EXISTS "music_tracks" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "level" "EducationLevel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MusicTrack_level_idx" ON "music_tracks"("level");

CREATE TABLE IF NOT EXISTS "pomodoro_sessions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "duration" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PomodoroSession_user_id_fkey'
  ) THEN
    ALTER TABLE "pomodoro_sessions"
      ADD CONSTRAINT "PomodoroSession_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PomodoroSession_user_id_created_at_idx" ON "pomodoro_sessions"("user_id", "created_at");

-- Level-based content
CREATE TABLE IF NOT EXISTS "contents" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "level" "EducationLevel" NOT NULL,
  "type" "ContentType" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'pending',
  "teacher_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Content_teacher_id_fkey'
  ) THEN
    ALTER TABLE "contents"
      ADD CONSTRAINT "Content_teacher_id_fkey"
      FOREIGN KEY ("teacher_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Content_level_status_created_at_idx" ON "contents"("level", "status", "created_at");
CREATE INDEX IF NOT EXISTS "Content_teacher_id_created_at_idx" ON "contents"("teacher_id", "created_at");

CREATE TABLE IF NOT EXISTS "approval_logs" (
  "id" SERIAL PRIMARY KEY,
  "content_id" INTEGER NOT NULL,
  "admin_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApprovalLog_content_id_fkey'
  ) THEN
    ALTER TABLE "approval_logs"
      ADD CONSTRAINT "ApprovalLog_content_id_fkey"
      FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApprovalLog_admin_id_fkey'
  ) THEN
    ALTER TABLE "approval_logs"
      ADD CONSTRAINT "ApprovalLog_admin_id_fkey"
      FOREIGN KEY ("admin_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ApprovalLog_content_id_timestamp_idx" ON "approval_logs"("content_id", "timestamp");
CREATE INDEX IF NOT EXISTS "ApprovalLog_admin_id_timestamp_idx" ON "approval_logs"("admin_id", "timestamp");

-- Study plans
CREATE TABLE IF NOT EXISTS "study_plans" (
  "id" SERIAL PRIMARY KEY,
  "level" "EducationLevel" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "StudyPlan_level_idx" ON "study_plans"("level");

CREATE TABLE IF NOT EXISTS "personal_study_plans" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "custom_preferences" JSONB,
  "exam_date" TIMESTAMP(3)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PersonalStudyPlan_user_id_fkey'
  ) THEN
    ALTER TABLE "personal_study_plans"
      ADD CONSTRAINT "PersonalStudyPlan_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PersonalStudyPlan_user_id_idx" ON "personal_study_plans"("user_id");

-- New quiz system (v2)
CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" SERIAL PRIMARY KEY,
  "level" "EducationLevel" NOT NULL,
  "title" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LevelQuiz_level_created_at_idx" ON "quizzes"("level", "created_at");

CREATE TABLE IF NOT EXISTS "questions" (
  "id" SERIAL PRIMARY KEY,
  "quiz_id" INTEGER NOT NULL,
  "question_text" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "correct_answer" TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LevelQuestion_quiz_id_fkey'
  ) THEN
    ALTER TABLE "questions"
      ADD CONSTRAINT "LevelQuestion_quiz_id_fkey"
      FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LevelQuestion_quiz_id_idx" ON "questions"("quiz_id");

CREATE TABLE IF NOT EXISTS "quiz_results" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "quiz_id" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuizResult_user_id_fkey'
  ) THEN
    ALTER TABLE "quiz_results"
      ADD CONSTRAINT "QuizResult_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuizResult_quiz_id_fkey'
  ) THEN
    ALTER TABLE "quiz_results"
      ADD CONSTRAINT "QuizResult_quiz_id_fkey"
      FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "QuizResult_user_id_completed_at_idx" ON "quiz_results"("user_id", "completed_at");
CREATE INDEX IF NOT EXISTS "QuizResult_quiz_id_completed_at_idx" ON "quiz_results"("quiz_id", "completed_at");
