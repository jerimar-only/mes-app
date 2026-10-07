import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.forestProductItem.deleteMany();
  await prisma.conveyance.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.apprehensionRecord.deleteMany();
  // CenroOffice is intentionally kept
  console.log('Apprehension data deleted. CenroOffice table retained.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());