ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "verification_token" TEXT,
  ADD COLUMN IF NOT EXISTS "token_expiry" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_verification_tokens'
  ) THEN
    WITH latest_token AS (
      SELECT DISTINCT ON (evt.student_id)
        evt.student_id,
        evt.token,
        evt.expires_at
      FROM email_verification_tokens evt
      WHERE evt.used_at IS NULL
      ORDER BY evt.student_id, evt.created_at DESC
    )
    UPDATE "Student" s
    SET
      "verification_token" = lt.token,
      "token_expiry" = lt.expires_at
    FROM latest_token lt
    WHERE s.id = lt.student_id
      AND s.email_verified = FALSE
      AND s.verification_token IS NULL;

    DROP TABLE IF EXISTS "email_verification_tokens";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Student_verification_token_idx" ON "Student"("verification_token");
CREATE INDEX IF NOT EXISTS "Student_token_expiry_idx" ON "Student"("token_expiry");
