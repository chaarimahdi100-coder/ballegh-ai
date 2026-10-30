import { PrismaClient, UserRole } from "@prisma/client";
import * as fs from "fs";
import { resolveSupabaseUrl } from "./test-db-connection";

function loadEnv(): string {
  const content = fs.readFileSync(".env.local", "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) {
      return t.split("=")[1].replace(/["']/g, "").trim();
    }
  }
  return "";
}

async function manageUserRole() {
  const email = process.argv[2]?.trim().toLowerCase();
  const targetRole = process.argv[3]?.trim().toUpperCase() as UserRole;

  if (!email || !targetRole) {
    console.error("Usage: npx tsx scripts/manage-user-role.ts <email> <CITIZEN|MUNICIPAL_AGENT|ADMIN>");
    process.exit(1);
  }

  const validRoles: UserRole[] = ["CITIZEN", "MUNICIPAL_AGENT", "ADMIN"];
  if (!validRoles.includes(targetRole)) {
    console.error(`Invalid role: ${targetRole}. Must be one of: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  const rawUrl = loadEnv();
  const poolerUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!existing) {
      console.error(`User with email "${email}" not found in database.`);
      process.exit(1);
    }

    console.log(`Current state for ${existing.email} (${existing.fullName}): Role = ${existing.role}`);

    if (existing.role === targetRole) {
      console.log(`User already has role ${targetRole}. No update needed.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: targetRole },
      select: { id: true, email: true, fullName: true, role: true, updatedAt: true },
    });

    console.log(`\n✅ Successfully updated user role!`);
    console.log(`- Email: ${updated.email}`);
    console.log(`- Name: ${updated.fullName}`);
    console.log(`- Previous Role: ${existing.role}`);
    console.log(`- New Role: ${updated.role}`);
    console.log(`- Updated At: ${updated.updatedAt.toISOString()}`);
  } finally {
    await prisma.$disconnect();
  }
}

manageUserRole().catch((err) => {
  console.error("Error updating user role:", err);
  process.exit(1);
});
