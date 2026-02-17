-- CreateEnum
CREATE TYPE "LibraryBookStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "library_books" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "status" "LibraryBookStatus" NOT NULL DEFAULT 'PENDING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "uploadedBy" INTEGER NOT NULL,
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryBook_status_createdAt_idx" ON "library_books"("status", "createdAt");
CREATE INDEX "LibraryBook_isDeleted_createdAt_idx" ON "library_books"("isDeleted", "createdAt");
CREATE INDEX "LibraryBook_uploadedBy_createdAt_idx" ON "library_books"("uploadedBy", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_isRead_createdAt_idx" ON "user_notifications"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "library_books" ADD CONSTRAINT "LibraryBook_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_books" ADD CONSTRAINT "LibraryBook_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
