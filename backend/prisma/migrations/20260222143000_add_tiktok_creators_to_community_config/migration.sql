ALTER TABLE "community_config"
ADD COLUMN "tiktok_creators" JSONB NOT NULL DEFAULT '[]'::jsonb;
