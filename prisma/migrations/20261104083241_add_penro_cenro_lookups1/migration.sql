-- CreateTable
CREATE TABLE "PenroOffice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PenroOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenroOfficer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PenroOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenroOfficer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CenroOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PenroOffice_name_key" ON "PenroOffice"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PenroOfficer_name_key" ON "PenroOfficer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CenroOfficer_name_key" ON "CenroOfficer"("name");
