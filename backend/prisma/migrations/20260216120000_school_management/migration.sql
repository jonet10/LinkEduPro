-- CreateEnum
CREATE TYPE "SchoolRole" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT', 'SCHOOL_TEACHER');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PUBLIC', 'PRIVATE', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolStudentSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateTable
CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_admins" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "SchoolRole" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdBySuperAdmin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_academic_years" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_classes" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_students" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "sex" "SchoolStudentSex" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_payment_types" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPaymentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_payments" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "paymentTypeId" INTEGER NOT NULL,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "status" "SchoolPaymentStatus" NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receiptPath" TEXT,
    "notes" TEXT,
    "recordedById" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_logs" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "actorId" INTEGER,
    "actorRole" "SchoolRole",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_email_key" ON "schools"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAdmin_email_key" ON "school_admins"("email");

-- CreateIndex
CREATE INDEX "SchoolAdmin_schoolId_role_idx" ON "school_admins"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAcademicYear_schoolId_label_key" ON "school_academic_years"("schoolId", "label");

-- CreateIndex
CREATE INDEX "SchoolAcademicYear_schoolId_isActive_idx" ON "school_academic_years"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_academicYearId_name_key" ON "school_classes"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "SchoolClass_schoolId_academicYearId_idx" ON "school_classes"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudent_schoolId_studentId_key" ON "school_students"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStudent_schoolId_academicYearId_classId_firstName_lastName_key" ON "school_students"("schoolId", "academicYearId", "classId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "SchoolStudent_schoolId_classId_idx" ON "school_students"("schoolId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPaymentType_schoolId_name_key" ON "school_payment_types"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPayment_schoolId_receiptNumber_key" ON "school_payments"("schoolId", "receiptNumber");

-- CreateIndex
CREATE INDEX "SchoolPayment_schoolId_paymentDate_idx" ON "school_payments"("schoolId", "paymentDate");

-- CreateIndex
CREATE INDEX "SchoolPayment_schoolId_deletedAt_idx" ON "school_payments"("schoolId", "deletedAt");

-- CreateIndex
CREATE INDEX "SchoolLog_schoolId_createdAt_idx" ON "school_logs"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "school_admins" ADD CONSTRAINT "SchoolAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_academic_years" ADD CONSTRAINT "SchoolAcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "SchoolClass_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "school_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_students" ADD CONSTRAINT "SchoolStudent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_students" ADD CONSTRAINT "SchoolStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_students" ADD CONSTRAINT "SchoolStudent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "school_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payment_types" ADD CONSTRAINT "SchoolPaymentType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "school_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "school_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "school_payment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_payments" ADD CONSTRAINT "SchoolPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "school_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_logs" ADD CONSTRAINT "SchoolLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_logs" ADD CONSTRAINT "SchoolLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "school_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

