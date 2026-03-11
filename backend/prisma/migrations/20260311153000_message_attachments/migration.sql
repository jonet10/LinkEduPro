-- Add attachments to messages (optional, JSON array of files).
ALTER TABLE "messages" ADD COLUMN "attachments" JSONB;

