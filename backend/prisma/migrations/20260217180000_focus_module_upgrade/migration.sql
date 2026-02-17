-- Focus module upgrade

ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP(3);
ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP(3);
ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "cycle_type" TEXT;
ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'COMPLETED';

CREATE INDEX IF NOT EXISTS "PomodoroSession_user_id_start_time_end_time_idx" ON "pomodoro_sessions"("user_id", "start_time", "end_time");

CREATE TABLE IF NOT EXISTS "focus_songs" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "category" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" INTEGER
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FocusSong_created_by_fkey'
  ) THEN
    ALTER TABLE "focus_songs"
      ADD CONSTRAINT "FocusSong_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FocusSong_created_at_idx" ON "focus_songs"("created_at");
CREATE INDEX IF NOT EXISTS "FocusSong_created_by_created_at_idx" ON "focus_songs"("created_by", "created_at");

CREATE TABLE IF NOT EXISTS "focus_song_listens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "song_id" INTEGER NOT NULL,
  "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FocusSongListen_user_id_fkey'
  ) THEN
    ALTER TABLE "focus_song_listens"
      ADD CONSTRAINT "FocusSongListen_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FocusSongListen_song_id_fkey'
  ) THEN
    ALTER TABLE "focus_song_listens"
      ADD CONSTRAINT "FocusSongListen_song_id_fkey"
      FOREIGN KEY ("song_id") REFERENCES "focus_songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FocusSongListen_user_id_played_at_idx" ON "focus_song_listens"("user_id", "played_at");
CREATE INDEX IF NOT EXISTS "FocusSongListen_song_id_played_at_idx" ON "focus_song_listens"("song_id", "played_at");

CREATE TABLE IF NOT EXISTS "focus_statistics" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "total_time" INTEGER NOT NULL DEFAULT 0,
  "pomodoros_completed" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FocusStatistic_user_date_unique" UNIQUE ("user_id", "date")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FocusStatistic_user_id_fkey'
  ) THEN
    ALTER TABLE "focus_statistics"
      ADD CONSTRAINT "FocusStatistic_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FocusStatistic_date_idx" ON "focus_statistics"("date");

-- seed baseline focus songs
INSERT INTO "focus_songs" ("title", "url", "category")
SELECT * FROM (VALUES
  ('Rain Ambience', 'https://cdn.pixabay.com/audio/2022/10/25/audio_7f005f4f6d.mp3', 'rain'),
  ('Forest Nature Loop', 'https://cdn.pixabay.com/audio/2022/11/17/audio_c98c079d43.mp3', 'nature'),
  ('Lo-Fi Study Beat', 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8f58f5f6e.mp3', 'lofi')
) AS seed(title, url, category)
WHERE NOT EXISTS (
  SELECT 1 FROM "focus_songs" fs WHERE fs."title" = seed.title
);
