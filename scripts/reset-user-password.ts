import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

async function resetPassword() {
  const email = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.env.NEW_PASSWORD || process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: NEW_PASSWORD=\"<secret>\" npx tsx scripts/reset-user-password.ts <email>");
    console.error("  or:  npx tsx scripts/reset-user-password.ts <email> <password>");
    process.exit(1);
  }

  const rawUrl = loadEnv();
  const poolerUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log(`✅ Password successfully reset for ${user.email} (${user.fullName}, Role: ${user.role}).`);
    console.log("   Zero secrets printed to terminal or stored on disk.");
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword().catch((err) => {
  console.error("Password reset error:", err.message);
  process.exit(1);
});
