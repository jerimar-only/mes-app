-- AlterTable
ALTER TABLE "ApprehensionRecord" ADD COLUMN     "acpEndorsedToPenro" DATE,
ADD COLUMN     "acpEndorsedToRo" DATE,
ADD COLUMN     "caseStatus" TEXT,
ADD COLUMN     "gpsCoordinates" TEXT,
ADD COLUMN     "landClassification" TEXT,
ADD COLUMN     "otherRemarks" TEXT,
ADD COLUMN     "sourcePlace" TEXT;
