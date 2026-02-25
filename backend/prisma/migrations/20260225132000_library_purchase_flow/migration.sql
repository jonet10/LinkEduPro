DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LibraryPurchaseStatus') THEN
    CREATE TYPE "LibraryPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "library_purchases" (
  "id" SERIAL NOT NULL,
  "bookId" INTEGER NOT NULL,
  "buyerId" INTEGER NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HTG',
  "status" "LibraryPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" "RemedialPaymentMethod" NOT NULL DEFAULT 'MONCASH',
  "orderRef" TEXT,
  "providerTxId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibraryPurchase_orderRef_key"
  ON "library_purchases"("orderRef");
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryPurchase_bookId_buyerId_key"
  ON "library_purchases"("bookId", "buyerId");
CREATE INDEX IF NOT EXISTS "LibraryPurchase_buyerId_createdAt_idx"
  ON "library_purchases"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "LibraryPurchase_bookId_status_idx"
  ON "library_purchases"("bookId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LibraryPurchase_bookId_fkey'
  ) THEN
    ALTER TABLE "library_purchases"
      ADD CONSTRAINT "LibraryPurchase_bookId_fkey"
      FOREIGN KEY ("bookId") REFERENCES "library_books"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LibraryPurchase_buyerId_fkey'
  ) THEN
    ALTER TABLE "library_purchases"
      ADD CONSTRAINT "LibraryPurchase_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
