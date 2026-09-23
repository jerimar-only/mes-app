// prisma/seed-users.ts
// Usage: npx tsx prisma/seed-users.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const encoderPasswordHash = await bcrypt.hash("encoder", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: {
      email: "admin",
      passwordHash: adminPasswordHash,
      fullName: "Administrator",
      role: "ADMINISTRATOR",
    },
  });

  const encoder = await prisma.user.upsert({
    where: { email: "encoder" },
    update: {},
    create: {
      email: "encoder",
      passwordHash: encoderPasswordHash,
      fullName: "Encoder",
      role: "ENCODER",
    },
  });

  console.log("Created/verified accounts:");
  console.log(`  admin   (username: admin, password: admin)   — id ${admin.id}`);
  console.log(`  encoder (username: encoder, password: encoder) — id ${encoder.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
