import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
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

async function inspectData() {
  const rawUrl = loadEnv();
  const poolerUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

  try {
    const reports = await prisma.report.findMany({
      select: { id: true, referenceNumber: true, titleFr: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    console.log(`\n==================================================`);
    console.log(`📋 INSPECTION OF DATABASE REPORTS (${reports.length})`);
    console.log(`==================================================`);
    reports.forEach((r) => {
      const isTestPrefix =
        r.referenceNumber.includes("TEST") ||
        r.referenceNumber.includes("LIVE") ||
        r.referenceNumber.includes("AUDIT") ||
        r.referenceNumber.includes("DEMO") ||
        r.titleFr.toLowerCase().includes("test") ||
        r.titleFr.toLowerCase().includes("audit");
      console.log(`• [${r.referenceNumber}] ${r.titleFr.slice(0, 45)} (Category: ${r.category}, Clear Test/Demo Flag: ${isTestPrefix ? "YES" : "NO"})`);
    });

    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, fullName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    console.log(`\n==================================================`);
    console.log(`👥 INSPECTION OF DATABASE USERS (${users.length})`);
    console.log(`==================================================`);
    let testIdentifiedCount = 0;
    users.forEach((u) => {
      const isTestUser =
        u.email.includes("test") ||
        u.email.includes("audit") ||
        u.email.includes("demo") ||
        u.email.includes("example") ||
        u.email.includes("phase") ||
        u.email.includes("mock") ||
        u.email.endsWith("@ballegh.tn") ||
        u.email.endsWith("@commune-tunis.gov.tn") ||
        u.fullName.toLowerCase().includes("test") ||
        u.fullName.toLowerCase().includes("demo");
      if (isTestUser) testIdentifiedCount++;
      console.log(`• [${u.role}] ${u.email} (${u.fullName}) -> Identified as staff/test/demo: ${isTestUser ? "YES" : "NO"}`);
    });

    console.log(`\n• Total users with clear staff/demo/test naming: ${testIdentifiedCount}/${users.length}`);

  } finally {
    await prisma.$disconnect();
  }
}

inspectData().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
