ALTER TABLE "password_reset_codes"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "password_reset_codes"
  ALTER COLUMN "phone" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "PasswordResetCode_email_created_at_idx"
  ON "password_reset_codes"("email", "created_at");
