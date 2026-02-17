-- Advanced search engine support

CREATE TABLE IF NOT EXISTS "tags" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "publication_tags" (
  "publication_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("publication_id", "tag_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PublicationTag_publication_id_fkey'
  ) THEN
    ALTER TABLE "publication_tags"
      ADD CONSTRAINT "PublicationTag_publication_id_fkey"
      FOREIGN KEY ("publication_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PublicationTag_tag_id_fkey'
  ) THEN
    ALTER TABLE "publication_tags"
      ADD CONSTRAINT "PublicationTag_tag_id_fkey"
      FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PublicationTag_tag_id_idx" ON "publication_tags"("tag_id");

CREATE TABLE IF NOT EXISTS "course_tags" (
  "course_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("course_id", "tag_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseTag_course_id_fkey'
  ) THEN
    ALTER TABLE "course_tags"
      ADD CONSTRAINT "CourseTag_course_id_fkey"
      FOREIGN KEY ("course_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseTag_tag_id_fkey'
  ) THEN
    ALTER TABLE "course_tags"
      ADD CONSTRAINT "CourseTag_tag_id_fkey"
      FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CourseTag_tag_id_idx" ON "course_tags"("tag_id");

CREATE TABLE IF NOT EXISTS "search_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "query" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SearchHistory_user_id_fkey'
  ) THEN
    ALTER TABLE "search_history"
      ADD CONSTRAINT "SearchHistory_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SearchHistory_user_id_created_at_idx" ON "search_history"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "SearchHistory_query_idx" ON "search_history"("query");

-- Full text + filter support indexes
CREATE INDEX IF NOT EXISTS "Subject_name_idx" ON "Subject"("name");
CREATE INDEX IF NOT EXISTS "Subject_createdAt_idx" ON "Subject"("createdAt");
CREATE INDEX IF NOT EXISTS "Student_role_idx" ON "Student"("role");
CREATE INDEX IF NOT EXISTS "Student_lastName_idx" ON "Student"("lastName");
CREATE INDEX IF NOT EXISTS "Post_createdAt_likeCount_idx" ON "posts"("createdAt", "likeCount");
CREATE INDEX IF NOT EXISTS "Post_title_fts_idx" ON "posts" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content", '')));
CREATE INDEX IF NOT EXISTS "Subject_name_fts_idx" ON "Subject" USING GIN (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '')));
CREATE INDEX IF NOT EXISTS "Student_teacher_fts_idx" ON "Student" USING GIN (to_tsvector('simple', coalesce("firstName", '') || ' ' || coalesce("lastName", '') || ' ' || coalesce("school", '')));
