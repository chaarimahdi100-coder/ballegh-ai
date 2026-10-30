import * as fs from "fs";
import * as path from "path";
import * as https from "https";

function queryVercel(pathName: string, method: string, body?: any): Promise<any> {
  const authPath = "C:/Users/user/AppData/Roaming/com.vercel.cli/Data/auth.json";
  const projectPath = ".vercel/project.json";

  const auth = JSON.parse(fs.readFileSync(authPath, "utf-8"));
  const project = JSON.parse(fs.readFileSync(projectPath, "utf-8"));

  const fullPath = pathName.includes("?") 
    ? `${pathName}&teamId=${project.orgId}` 
    : `${pathName}?teamId=${project.orgId}`;

  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.vercel.com",
      port: 443,
      path: fullPath,
      method,
      headers: {
        "Authorization": `Bearer ${auth.token}`,
        "User-Agent": "ballegh-phase3-updater",
        ...(payload ? {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        } : {})
      },
      timeout: 15000
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("Vercel API timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase3() {
  console.log("==================================================");
  console.log("🚀 BALLEGH AI — PHASE 3: VERCEL PRODUCTION ENV SETUP");
  console.log("==================================================");

  const projectPath = ".vercel/project.json";
  const project = JSON.parse(fs.readFileSync(projectPath, "utf-8"));

  // 1. Fetch current env vars to get exact IDs and states
  const getRes = await queryVercel(`/v9/projects/${project.projectId}/env`, "GET");
  const envs: any[] = getRes.body?.envs || [];

  const targetsToUpdate = [
    "GEMINI_API_KEY",
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ];

  console.log(`• Found ${envs.length} environment variables in Vercel project ${project.projectName}`);

  for (const varName of targetsToUpdate) {
    const existing = envs.find(e => e.key === varName);
    if (!existing) {
      console.error(`❌ Variable ${varName} not found in project!`);
      continue;
    }

    console.log(`\n• Processing '${varName}' (ID: ${existing.id}):`);
    console.log(`  - Current Targets: [${existing.target.join(", ")}]`);

    if (existing.target.includes("production") && existing.target.includes("preview")) {
      console.log(`  ✅ Already configured for both production and preview. No change needed.`);
      continue;
    }

    // PATCH to expand target to ['production', 'preview'] preserving preview and existing value
    const newTargets = Array.from(new Set([...existing.target, "production"]));
    console.log(`  - Updating targets to: [${newTargets.join(", ")}]...`);

    const patchRes = await queryVercel(
      `/v9/projects/${project.projectId}/env/${existing.id}`,
      "PATCH",
      { target: newTargets }
    );

    if (patchRes.status === 200) {
      console.log(`  ✅ SUCCESS! Updated targets to: [${(patchRes.body.target || []).join(", ")}]`);
      console.log(`  - UpdatedAt: ${new Date(patchRes.body.updatedAt).toISOString()}`);
    } else {
      console.error(`  ❌ FAILED with status ${patchRes.status}:`, patchRes.body);
      throw new Error(`Failed to update ${varName}`);
    }
  }

  // 2. Verification of all variables post-change
  console.log("\n🔍 [Verification] Re-querying Vercel API for all project variables...");
  const verifyRes = await queryVercel(`/v9/projects/${project.projectId}/env`, "GET");
  const updatedEnvs: any[] = verifyRes.body?.envs || [];

  console.log(`\nFinal Environment Variables State in Vercel:`);
  for (const item of updatedEnvs) {
    console.log(`  - ${item.key.padEnd(26)} : targets = [${item.target.join(", ")}] (type: ${item.type})`);
  }

  console.log("\n==================================================");
  console.log("PHASE 3 VERCEL CONFIGURATION COMPLETE (0 DEPLOYMENTS)");
  console.log("==================================================");
}

runPhase3().catch(err => {
  console.error("Fatal error during Phase 3:", err);
  process.exit(1);
});
