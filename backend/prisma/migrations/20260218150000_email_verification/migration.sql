ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_student_id_fkey'
  ) THEN
    ALTER TABLE "email_verification_tokens"
      ADD CONSTRAINT "email_verification_tokens_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_key"
  ON "email_verification_tokens"("token");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_student_id_created_at_idx"
  ON "email_verification_tokens"("student_id", "created_at");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_created_at_idx"
  ON "email_verification_tokens"("email", "created_at");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_token_used_at_idx"
  ON "email_verification_tokens"("token", "used_at");

UPDATE "Student"
SET "email_verified" = TRUE
WHERE "email" IS NULL;
