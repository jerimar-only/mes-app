-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('GOOD_CONDITION', 'DETERIORATING', 'DETERIORATED');

-- CreateEnum
CREATE TYPE "AssetServiceStatus" AS ENUM ('SERVICEABLE', 'UNSERVICEABLE');

-- AlterTable
ALTER TABLE "ApprehensionRecord" ADD COLUMN     "acpConducted" BOOLEAN,
ADD COLUMN     "acpDate" DATE,
ADD COLUMN     "appraisalConveyances" BOOLEAN,
ADD COLUMN     "appraisalConveyancesDate" DATE,
ADD COLUMN     "appraisalEquipment" BOOLEAN,
ADD COLUMN     "appraisalEquipmentDate" DATE,
ADD COLUMN     "appraisalForestProducts" BOOLEAN,
ADD COLUMN     "appraisalForestProductsDate" DATE,
ADD COLUMN     "apprehendingOfficer" TEXT,
ADD COLUMN     "cenroOfficer" TEXT,
ADD COLUMN     "dateOfPromulgation" TEXT,
ADD COLUMN     "donationConvDate" TEXT,
ADD COLUMN     "donationConvDonee" TEXT,
ADD COLUMN     "donationConvDonor" TEXT,
ADD COLUMN     "donationEquipDate" TEXT,
ADD COLUMN     "donationEquipDonee" TEXT,
ADD COLUMN     "donationEquipDonor" TEXT,
ADD COLUMN     "donationFpDate" TEXT,
ADD COLUMN     "donationFpDonee" TEXT,
ADD COLUMN     "donationFpDonor" TEXT,
ADD COLUMN     "donationFpVolume" TEXT,
ADD COLUMN     "donationMade" BOOLEAN,
ADD COLUMN     "hasRespondent" BOOLEAN,
ADD COLUMN     "penroOffice" TEXT,
ADD COLUMN     "penroOfficer" TEXT,
ADD COLUMN     "promulgatedBy" TEXT,
ADD COLUMN     "respondentAddress" TEXT,
ADD COLUMN     "respondentContact" TEXT,
ADD COLUMN     "timeOfApprehension" TEXT;

-- AlterTable
ALTER TABLE "Conveyance" ADD COLUMN     "plateNo" TEXT,
ADD COLUMN     "serviceStatus" "AssetServiceStatus";

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "registered" BOOLEAN,
ADD COLUMN     "serviceStatus" "AssetServiceStatus";

-- AlterTable
ALTER TABLE "ForestProductItem" ADD COLUMN     "conditionStatus" "ProductCondition",
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE INDEX "ApprehensionRecord_penroOffice_idx" ON "ApprehensionRecord"("penroOffice");
