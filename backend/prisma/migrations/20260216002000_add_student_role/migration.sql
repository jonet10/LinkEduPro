-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STUDENT';
