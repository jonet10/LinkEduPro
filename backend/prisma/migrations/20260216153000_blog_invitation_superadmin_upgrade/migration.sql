-- Add enum value for teacher role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'TEACHER'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'TEACHER';
  END IF;
END $$;

-- Create posts table
CREATE TABLE IF NOT EXISTS "posts" (
  "id" SERIAL PRIMARY KEY,
  "authorId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "isGlobal" BOOLEAN NOT NULL DEFAULT true,
  "schoolId" INTEGER,
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "approvedBy" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Post_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_isApproved_createdAt_idx" ON "posts"("isApproved", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_schoolId_createdAt_idx" ON "posts"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_isDeleted_createdAt_idx" ON "posts"("isDeleted", "createdAt");

ALTER TABLE "posts"
  ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "posts"
  ADD CONSTRAINT "Post_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create categories/tags
CREATE TABLE IF NOT EXISTS "post_categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "post_tags" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "post_category_links" (
  "postId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("postId", "categoryId")
);

ALTER TABLE "post_category_links"
  ADD CONSTRAINT "PostCategoryLink_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_category_links"
  ADD CONSTRAINT "PostCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "post_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "post_tag_links" (
  "postId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("postId", "tagId")
);

ALTER TABLE "post_tag_links"
  ADD CONSTRAINT "PostTagLink_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_tag_links"
  ADD CONSTRAINT "PostTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "post_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" SERIAL PRIMARY KEY,
  "postId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "isHelpful" BOOLEAN NOT NULL DEFAULT false,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "comments"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_authorId_createdAt_idx" ON "comments"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_isDeleted_createdAt_idx" ON "comments"("isDeleted", "createdAt");

ALTER TABLE "comments"
  ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments"
  ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Likes table (new naming)
CREATE TABLE IF NOT EXISTS "post_likes" (
  "id" SERIAL PRIMARY KEY,
  "postId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("postId", "userId")
);

CREATE INDEX IF NOT EXISTS "PostLike_postId_createdAt_idx" ON "post_likes"("postId", "createdAt");

ALTER TABLE "post_likes"
  ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_likes"
  ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reports
CREATE TABLE IF NOT EXISTS "post_reports" (
  "id" SERIAL PRIMARY KEY,
  "postId" INTEGER NOT NULL,
  "reportedBy" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedBy" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "PostReport_postId_createdAt_idx" ON "post_reports"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "PostReport_status_createdAt_idx" ON "post_reports"("status", "createdAt");

ALTER TABLE "post_reports"
  ADD CONSTRAINT "PostReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_reports"
  ADD CONSTRAINT "PostReport_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_reports"
  ADD CONSTRAINT "PostReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Teacher invitations
CREATE TABLE IF NOT EXISTS "teacher_invitations" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "TeacherInvitation_email_expiresAt_idx" ON "teacher_invitations"("email", "expiresAt");
CREATE INDEX IF NOT EXISTS "TeacherInvitation_used_expiresAt_idx" ON "teacher_invitations"("used", "expiresAt");

ALTER TABLE "teacher_invitations"
  ADD CONSTRAINT "TeacherInvitation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill from previous optional community schema if present
INSERT INTO "posts" ("id", "authorId", "title", "content", "isApproved", "approvedBy", "approvedAt", "likeCount", "createdAt", "updatedAt")
SELECT bp."id", bp."authorId", bp."title", bp."content", bp."isApproved", bp."approvedBy", bp."approvedAt", bp."likeCount", bp."createdAt", bp."updatedAt"
FROM "blog_posts" bp
WHERE NOT EXISTS (SELECT 1 FROM "posts" p WHERE p."id" = bp."id")
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "comments" ("id", "postId", "authorId", "content", "isHelpful", "createdAt", "updatedAt")
SELECT bc."id", bc."postId", bc."authorId", bc."content", bc."isHelpful", bc."createdAt", bc."updatedAt"
FROM "blog_comments" bc
WHERE EXISTS (SELECT 1 FROM "posts" p WHERE p."id" = bc."postId")
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "post_likes" ("id", "postId", "userId", "createdAt")
SELECT bl."id", bl."postId", bl."userId", bl."createdAt"
FROM "blog_post_likes" bl
WHERE EXISTS (SELECT 1 FROM "posts" p WHERE p."id" = bl."postId")
ON CONFLICT ("postId", "userId") DO NOTHING;
