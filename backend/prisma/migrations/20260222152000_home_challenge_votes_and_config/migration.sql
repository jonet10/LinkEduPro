ALTER TABLE "community_config"
ADD COLUMN "home_challenge_title" TEXT NOT NULL DEFAULT 'Vote de la semaine',
ADD COLUMN "home_challenge_subtitle" TEXT NOT NULL DEFAULT 'Choisis la personne qui doit rester en tête cette semaine.',
ADD COLUMN "home_challenge_theme" VARCHAR(40) NOT NULL DEFAULT 'TIKTOKERS';

CREATE TABLE "home_challenge_votes" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "week_key" VARCHAR(20) NOT NULL,
  "challenge_theme" VARCHAR(40) NOT NULL,
  "candidate_handle" VARCHAR(120) NOT NULL,
  "comment" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "home_challenge_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HomeChallengeVote_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HomeChallengeVote_unique_user_week_theme"
  ON "home_challenge_votes"("user_id", "week_key", "challenge_theme");

CREATE INDEX "HomeChallengeVote_week_theme_idx"
  ON "home_challenge_votes"("week_key", "challenge_theme");

CREATE INDEX "HomeChallengeVote_candidate_week_idx"
  ON "home_challenge_votes"("candidate_handle", "week_key");
