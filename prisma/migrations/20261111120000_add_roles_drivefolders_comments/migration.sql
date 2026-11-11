-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('ROOT', 'PENRO', 'CENRO', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'PENRO_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'CENRO_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'REGIONAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "penroOfficeId" INTEGER;

-- CreateTable
CREATE TABLE "RecordComment" (
    "id" SERIAL NOT NULL,
    "apprehensionRecordId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveFolder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "penroOfficeId" INTEGER,
    "cenroOfficeId" INTEGER,
    "parentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordComment_apprehensionRecordId_idx" ON "RecordComment"("apprehensionRecordId");

-- CreateIndex
CREATE INDEX "RecordComment_userId_idx" ON "RecordComment"("userId");

-- CreateIndex
CREATE INDEX "DriveFolder_penroOfficeId_idx" ON "DriveFolder"("penroOfficeId");

-- CreateIndex
CREATE INDEX "DriveFolder_cenroOfficeId_idx" ON "DriveFolder"("cenroOfficeId");

-- CreateIndex
CREATE INDEX "DriveFolder_parentId_idx" ON "DriveFolder"("parentId");

-- CreateIndex
CREATE INDEX "DriveFolder_type_idx" ON "DriveFolder"("type");

-- CreateIndex
CREATE INDEX "User_penroOfficeId_idx" ON "User"("penroOfficeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_penroOfficeId_fkey" FOREIGN KEY ("penroOfficeId") REFERENCES "PenroOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordComment" ADD CONSTRAINT "RecordComment_apprehensionRecordId_fkey" FOREIGN KEY ("apprehensionRecordId") REFERENCES "ApprehensionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordComment" ADD CONSTRAINT "RecordComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_penroOfficeId_fkey" FOREIGN KEY ("penroOfficeId") REFERENCES "PenroOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_cenroOfficeId_fkey" FOREIGN KEY ("cenroOfficeId") REFERENCES "CenroOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

