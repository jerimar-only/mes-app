-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER');

-- CreateTable
CREATE TABLE "FieldDefinition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL DEFAULT 'TEXT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldValue" (
    "id" SERIAL NOT NULL,
    "apprehensionRecordId" INTEGER NOT NULL,
    "fieldDefinitionId" INTEGER NOT NULL,
    "textValue" TEXT,
    "numberValue" DOUBLE PRECISION,

    CONSTRAINT "FieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldDefinition_name_key" ON "FieldDefinition"("name");

-- CreateIndex
CREATE INDEX "FieldValue_fieldDefinitionId_idx" ON "FieldValue"("fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_apprehensionRecordId_fieldDefinitionId_key" ON "FieldValue"("apprehensionRecordId", "fieldDefinitionId");

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_apprehensionRecordId_fkey" FOREIGN KEY ("apprehensionRecordId") REFERENCES "ApprehensionRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "FieldDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
