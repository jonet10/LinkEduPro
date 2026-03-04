DO $$ BEGIN
  CREATE TYPE "EduCollectProjectStatus" AS ENUM ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','FUNDING','FUNDED','CLOSED','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EduCollectDonorType" AS ENUM ('STUDENT','PARTNER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EduCollectPaymentMethod" AS ENUM ('MONCASH','NATCASH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EduCollectVisibilityType" AS ENUM ('PUBLIC','NAME_ONLY','ANONYMOUS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EduCollectDonationStatus" AS ENUM ('PENDING','CONFIRMED','FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EduCollectFlagStatus" AS ENUM ('OPEN','RESOLVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "educollect_rule_acceptances" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "rules_version" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "educollect_partner_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE REFERENCES "Student"("id") ON DELETE CASCADE,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMP(3),
  "verified_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "educollect_projects" (
  "id" SERIAL PRIMARY KEY,
  "owner_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "target_amount" DECIMAL(12,2) NOT NULL,
  "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "contributor_count" INTEGER NOT NULL DEFAULT 0,
  "budget_items" JSONB NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "school" TEXT NOT NULL,
  "proof_url" TEXT NOT NULL,
  "teacher_validation_text" TEXT NOT NULL,
  "teacher_validation_signature" TEXT,
  "status" "EduCollectProjectStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "review_note" TEXT,
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "disbursed_to" TEXT,
  "disbursement_note" TEXT,
  "disbursed_by" INTEGER,
  "disbursed_at" TIMESTAMP(3),
  "suspended_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "educollect_donations" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "educollect_projects"("id") ON DELETE CASCADE,
  "donor_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "donor_type" "EduCollectDonorType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "payment_method" "EduCollectPaymentMethod" NOT NULL,
  "transaction_reference" TEXT,
  "visibility_type" "EduCollectVisibilityType" NOT NULL,
  "status" "EduCollectDonationStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "educollect_project_reports" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "educollect_projects"("id") ON DELETE CASCADE,
  "author_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "educollect_project_flags" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "educollect_projects"("id") ON DELETE CASCADE,
  "reporter_id" INTEGER NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "EduCollectFlagStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "educollect_transaction_logs" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER REFERENCES "educollect_projects"("id") ON DELETE SET NULL,
  "donation_id" INTEGER,
  "actor_id" INTEGER,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EduCollectRuleAcceptance_user_id_accepted_at_idx" ON "educollect_rule_acceptances"("user_id","accepted_at");
CREATE INDEX IF NOT EXISTS "EduCollectPartnerProfile_is_verified_idx" ON "educollect_partner_profiles"("is_verified");
CREATE INDEX IF NOT EXISTS "EduCollectProject_owner_id_created_at_idx" ON "educollect_projects"("owner_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectProject_status_created_at_idx" ON "educollect_projects"("status","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectDonation_project_id_created_at_idx" ON "educollect_donations"("project_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectDonation_donor_id_created_at_idx" ON "educollect_donations"("donor_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectDonation_status_created_at_idx" ON "educollect_donations"("status","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectProjectReport_project_id_created_at_idx" ON "educollect_project_reports"("project_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectProjectFlag_project_id_created_at_idx" ON "educollect_project_flags"("project_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectTransactionLog_project_id_created_at_idx" ON "educollect_transaction_logs"("project_id","created_at");
CREATE INDEX IF NOT EXISTS "EduCollectTransactionLog_actor_id_created_at_idx" ON "educollect_transaction_logs"("actor_id","created_at");