CREATE TABLE IF NOT EXISTS "password_reset_codes" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL,
  "phone" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_codes_student_id_fkey'
  ) THEN
    ALTER TABLE "password_reset_codes"
      ADD CONSTRAINT "password_reset_codes_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PasswordResetCode_phone_created_at_idx" ON "password_reset_codes"("phone", "created_at");
CREATE INDEX IF NOT EXISTS "PasswordResetCode_student_id_created_at_idx" ON "password_reset_codes"("student_id", "created_at");

