-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CENRO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cenroOfficeId" INTEGER;

-- CreateIndex
CREATE INDEX "User_cenroOfficeId_idx" ON "User"("cenroOfficeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cenroOfficeId_fkey" FOREIGN KEY ("cenroOfficeId") REFERENCES "CenroOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
