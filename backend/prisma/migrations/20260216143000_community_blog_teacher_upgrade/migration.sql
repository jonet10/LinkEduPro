-- CreateEnum
CREATE TYPE "TeacherLevel" AS ENUM ('STANDARD', 'VERIFIED', 'CERTIFIED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TeacherVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "teacherLevel" "TeacherLevel" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "reputationScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "teacher_verifications" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "TeacherVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_likes" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_points" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "userId" INTEGER NOT NULL,
    "badgeId" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId", "badgeId")
);

-- CreateTable
CREATE TABLE "community_config" (
    "id" INTEGER NOT NULL,
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 3,
    "maxPostsPerMonth" INTEGER NOT NULL DEFAULT 10,
    "commentRatePerMin" INTEGER NOT NULL DEFAULT 10,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherVerification_teacherId_status_idx" ON "teacher_verifications"("teacherId", "status");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_createdAt_idx" ON "blog_posts"("authorId", "createdAt");
CREATE INDEX "BlogPost_isApproved_createdAt_idx" ON "blog_posts"("isApproved", "createdAt");

-- CreateIndex
CREATE INDEX "BlogComment_postId_createdAt_idx" ON "blog_comments"("postId", "createdAt");
CREATE INDEX "BlogComment_authorId_createdAt_idx" ON "blog_comments"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_likes_postId_userId_key" ON "blog_post_likes"("postId", "userId");
CREATE INDEX "BlogPostLike_postId_createdAt_idx" ON "blog_post_likes"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ReputationPoint_userId_createdAt_idx" ON "reputation_points"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");
CREATE INDEX "UserBadge_badgeId_awardedAt_idx" ON "user_badges"("badgeId", "awardedAt");

-- CreateIndex
CREATE INDEX "CommunityLog_actorId_createdAt_idx" ON "community_logs"("actorId", "createdAt");
CREATE INDEX "CommunityLog_entityType_createdAt_idx" ON "community_logs"("entityType", "createdAt");

-- AddForeignKey
ALTER TABLE "teacher_verifications" ADD CONSTRAINT "TeacherVerification_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_verifications" ADD CONSTRAINT "TeacherVerification_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "BlogPost_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_comments" ADD CONSTRAINT "BlogComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_likes" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_post_likes" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_points" ADD CONSTRAINT "ReputationPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_config" ADD CONSTRAINT "CommunityConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_logs" ADD CONSTRAINT "CommunityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed singleton config
INSERT INTO "community_config" ("id", "maxPostsPerDay", "maxPostsPerMonth", "commentRatePerMin", "updatedAt")
VALUES (1, 3, 10, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Seed default badges
INSERT INTO "badges" ("name", "description", "icon") VALUES
('Premier Article', 'Premier article publie', 'badge-first-article'),
('10 Articles Publies', 'A publie 10 articles', 'badge-ten-articles'),
('100 Commentaires', 'A publie 100 commentaires', 'badge-comments-100'),
('Professeur Verifie', 'Profil professeur verifie', 'badge-teacher-verified'),
('Professeur Certifie', 'Document professeur certifie', 'badge-teacher-certified'),
('Leader Educatif', 'Score de reputation >= 500', 'badge-leader-educatif')
ON CONFLICT ("name") DO NOTHING;
