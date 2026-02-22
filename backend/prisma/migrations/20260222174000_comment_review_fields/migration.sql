ALTER TABLE "comments"
ADD COLUMN "correction_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
ADD COLUMN "score" INTEGER,
ADD COLUMN "max_score" INTEGER,
ADD COLUMN "teacher_feedback" TEXT,
ADD COLUMN "is_pinned_best" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "corrected_by" INTEGER,
ADD COLUMN "corrected_at" TIMESTAMP(3);

ALTER TABLE "comments"
ADD CONSTRAINT "Comment_correctedBy_fkey"
FOREIGN KEY ("corrected_by") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Comment_postId_pinned_idx"
ON "comments" ("postId", "is_pinned_best");
