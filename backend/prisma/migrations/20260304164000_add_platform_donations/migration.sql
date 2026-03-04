DO $$ BEGIN
  CREATE TYPE "PlatformDonationStatus" AS ENUM ('PENDING','SUCCESS','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "platform_donations" (
  "id" SERIAL PRIMARY KEY,
  "donor_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HTG',
  "payment_method" "RemedialPaymentMethod" NOT NULL DEFAULT 'MONCASH',
  "status" "PlatformDonationStatus" NOT NULL DEFAULT 'PENDING',
  "order_ref" TEXT UNIQUE,
  "provider_tx_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlatformDonation_donorId_createdAt_idx"
ON "platform_donations"("donor_id","created_at");

CREATE INDEX IF NOT EXISTS "PlatformDonation_status_createdAt_idx"
ON "platform_donations"("status","created_at");