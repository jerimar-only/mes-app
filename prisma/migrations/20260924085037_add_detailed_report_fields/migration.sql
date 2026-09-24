/*
  Warnings:

  - You are about to drop the column `conveyanceEquipment` on the `ApprehensionRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApprehensionRecord" DROP COLUMN "conveyanceEquipment",
ADD COLUMN     "apprehendingAgency" TEXT,
ADD COLUMN     "claimantRespondent" TEXT,
ADD COLUMN     "month" INTEGER;

-- AlterTable
ALTER TABLE "ForestProductItem" ADD COLUMN     "forms" TEXT,
ADD COLUMN     "quantity" TEXT,
ADD COLUMN     "species" TEXT,
ADD COLUMN     "volumeBdFt" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Conveyance" (
    "id" SERIAL NOT NULL,
    "apprehensionRecordId" INTEGER NOT NULL,
    "type" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Conveyance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "apprehensionRecordId" INTEGER NOT NULL,
    "type" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conveyance_apprehensionRecordId_idx" ON "Conveyance"("apprehensionRecordId");

-- CreateIndex
CREATE INDEX "Equipment_apprehensionRecordId_idx" ON "Equipment"("apprehensionRecordId");

-- CreateIndex
CREATE INDEX "ApprehensionRecord_month_idx" ON "ApprehensionRecord"("month");

-- AddForeignKey
ALTER TABLE "Conveyance" ADD CONSTRAINT "Conveyance_apprehensionRecordId_fkey" FOREIGN KEY ("apprehensionRecordId") REFERENCES "ApprehensionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_apprehensionRecordId_fkey" FOREIGN KEY ("apprehensionRecordId") REFERENCES "ApprehensionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
