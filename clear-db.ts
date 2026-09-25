import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.forestProductItem.deleteMany();
  await prisma.conveyance.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.apprehensionRecord.deleteMany();
  await prisma.cenroOffice.deleteMany();
  console.log('All apprehension data deleted.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());