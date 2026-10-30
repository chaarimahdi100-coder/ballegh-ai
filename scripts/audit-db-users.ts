import { PrismaClient } from "@prisma/client";
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

async function auditUsers() {
  const rawUrl = loadEnv();
  const poolerUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        district: true,
        organization: true,
        createdAt: true,
      },
    });

    console.log(`Total users in DB: ${users.length}`);
    const byRole: Record<string, number> = {};
    for (const u of users) {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    }
    console.log("Count by role:", byRole);

    console.log("\nStaff users (ADMIN / MUNICIPAL_AGENT):");
    users
      .filter((u) => u.role !== "CITIZEN")
      .forEach((u) => {
        console.log(`- [${u.role}] ${u.email} | ${u.fullName} | Created: ${u.createdAt.toISOString()}`);
      });

    console.log("\nSample Citizen users (latest 5):");
    users
      .filter((u) => u.role === "CITIZEN")
      .slice(0, 5)
      .forEach((u) => {
        console.log(`- [${u.role}] ${u.email} | ${u.fullName} | Created: ${u.createdAt.toISOString()}`);
      });
  } finally {
    await prisma.$disconnect();
  }
}

auditUsers().catch(console.error);
