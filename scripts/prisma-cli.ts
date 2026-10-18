import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

// Load .env.local natively without external dependencies
function loadEnvLocal(): void {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

import { resolveSupabaseUrl } from "./test-db-connection";

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolveSupabaseUrl(process.env.DATABASE_URL, true);
}

const args = process.argv.slice(2).join(" ");
if (!args) {
  console.error("Usage: tsx scripts/prisma-cli.ts <prisma-command>");
  process.exit(1);
}

try {
  execSync(`npx prisma ${args}`, {
    stdio: "inherit",
    env: process.env,
  });
} catch (err: any) {
  process.exit(err.status || 1);
}
