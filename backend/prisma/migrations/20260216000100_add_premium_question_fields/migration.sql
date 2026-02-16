-- AlterTable
ALTER TABLE "Question"
ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "frequencyScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sourceTopic" TEXT;

-- Index for premium selection speed
CREATE INDEX IF NOT EXISTS "Question_subjectId_isPremium_frequencyScore_idx"
ON "Question"("subjectId", "isPremium", "frequencyScore");
