ALTER TABLE "posts"
ADD COLUMN "post_type" VARCHAR(20) NOT NULL DEFAULT 'ARTICLE',
ADD COLUMN "audience_scope" VARCHAR(20) NOT NULL DEFAULT 'GLOBAL';

ALTER TABLE "comments"
ADD COLUMN "image_url" TEXT;

CREATE TABLE "comment_reactions" (
  "id" SERIAL NOT NULL,
  "comment_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "emoji" VARCHAR(16) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommentReaction_commentId_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommentReaction_userId_fkey"
    FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommentReaction_unique_comment_user"
  ON "comment_reactions" ("comment_id", "user_id");

CREATE INDEX "CommentReaction_comment_emoji_idx"
  ON "comment_reactions" ("comment_id", "emoji");
