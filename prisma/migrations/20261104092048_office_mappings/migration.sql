-- AlterTable
ALTER TABLE "CenroOffice" ADD COLUMN     "defaultOfficerId" INTEGER,
ADD COLUMN     "penroOfficeId" INTEGER;

-- AlterTable
ALTER TABLE "PenroOffice" ADD COLUMN     "defaultOfficerId" INTEGER;

-- CreateIndex
CREATE INDEX "CenroOffice_penroOfficeId_idx" ON "CenroOffice"("penroOfficeId");

-- CreateIndex
CREATE INDEX "CenroOffice_defaultOfficerId_idx" ON "CenroOffice"("defaultOfficerId");

-- CreateIndex
CREATE INDEX "PenroOffice_defaultOfficerId_idx" ON "PenroOffice"("defaultOfficerId");

-- AddForeignKey
ALTER TABLE "CenroOffice" ADD CONSTRAINT "CenroOffice_penroOfficeId_fkey" FOREIGN KEY ("penroOfficeId") REFERENCES "PenroOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenroOffice" ADD CONSTRAINT "CenroOffice_defaultOfficerId_fkey" FOREIGN KEY ("defaultOfficerId") REFERENCES "CenroOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenroOffice" ADD CONSTRAINT "PenroOffice_defaultOfficerId_fkey" FOREIGN KEY ("defaultOfficerId") REFERENCES "PenroOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
