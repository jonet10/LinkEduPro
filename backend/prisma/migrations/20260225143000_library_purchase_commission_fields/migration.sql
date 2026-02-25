ALTER TABLE "library_purchases"
  ADD COLUMN IF NOT EXISTS "platformCommission" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sellerAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0;

UPDATE "library_purchases"
SET
  "platformCommission" = ROUND(("amount" * 0.10)::numeric, 2),
  "sellerAmount" = ROUND(("amount" - ("amount" * 0.10))::numeric, 2)
WHERE "status" = CAST('PAID' AS "LibraryPurchaseStatus")
  AND ("platformCommission" = 0 AND "sellerAmount" = 0);
