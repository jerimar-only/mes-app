-- CreateEnum
CREATE TYPE "ApprehensionStatus" AS ENUM ('FOR_RESOLUTION', 'UNDER_ADJUDICATION', 'CONFISCATED', 'DONATED', 'RELEASED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "CenroOffice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CenroOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprehensionRecord" (
    "id" SERIAL NOT NULL,
    "cenroOfficeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "dateOfApprehension" TEXT,
    "placeOfApprehension" TEXT,
    "circumstances" TEXT,
    "custodianLocation" TEXT,
    "otherAgencies" TEXT,
    "conveyanceEquipment" TEXT,
    "remarks" TEXT,
    "status" "ApprehensionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "docketNumber" TEXT,
    "orderOfFinalityDate" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprehensionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestProductItem" (
    "id" SERIAL NOT NULL,
    "apprehensionRecordId" INTEGER NOT NULL,
    "description" TEXT,
    "volumeCuM" DOUBLE PRECISION,
    "estimatedValue" DOUBLE PRECISION,

    CONSTRAINT "ForestProductItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CenroOffice_name_key" ON "CenroOffice"("name");

-- CreateIndex
CREATE INDEX "ApprehensionRecord_cenroOfficeId_idx" ON "ApprehensionRecord"("cenroOfficeId");

-- CreateIndex
CREATE INDEX "ApprehensionRecord_year_idx" ON "ApprehensionRecord"("year");

-- CreateIndex
CREATE INDEX "ApprehensionRecord_status_idx" ON "ApprehensionRecord"("status");

-- CreateIndex
CREATE INDEX "ForestProductItem_apprehensionRecordId_idx" ON "ForestProductItem"("apprehensionRecordId");

-- AddForeignKey
ALTER TABLE "ApprehensionRecord" ADD CONSTRAINT "ApprehensionRecord_cenroOfficeId_fkey" FOREIGN KEY ("cenroOfficeId") REFERENCES "CenroOffice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestProductItem" ADD CONSTRAINT "ForestProductItem_apprehensionRecordId_fkey" FOREIGN KEY ("apprehensionRecordId") REFERENCES "ApprehensionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
