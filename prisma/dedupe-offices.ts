import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Maps the old plain-name office to the canonical "CENRO ___" one to keep.
// Adjust the right-hand side if your canonical names differ.
const DUPLICATES: Record<string, string> = {
  "ALCALA": "CENRO ALCALA",
  "APARRI": "CENRO APARRI",
  "SANCHEZ MIRA": "CENRO SANCHEZ MIRA",
  "SOLANA": "CENRO SOLANA",
  "TUGUEGARAO": "CENRO TUGUEGARAO",
};

async function main() {
  for (const [oldName, canonicalName] of Object.entries(DUPLICATES)) {
    const oldOffice = await prisma.cenroOffice.findUnique({ where: { name: oldName } });
    const canonicalOffice = await prisma.cenroOffice.findUnique({ where: { name: canonicalName } });

    if (!oldOffice) {
      console.log(`Skip: "${oldName}" not found (already clean).`);
      continue;
    }
    if (!canonicalOffice) {
      console.log(`Skip: canonical "${canonicalName}" not found -- check spelling.`);
      continue;
    }

    // Move any apprehension records off the old duplicate onto the canonical office
    const moved = await prisma.apprehensionRecord.updateMany({
      where: { cenroOfficeId: oldOffice.id },
      data: { cenroOfficeId: canonicalOffice.id },
    });

    await prisma.cenroOffice.delete({ where: { id: oldOffice.id } });
    console.log(`Merged "${oldName}" into "${canonicalName}" (moved ${moved.count} record(s)), deleted duplicate.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
