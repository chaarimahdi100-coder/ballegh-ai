import http from "node:http";

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function requestHttp(path: string, method = "GET", body?: any, cookie?: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port: 3001,
        path,
        method,
        headers: {
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginUser(email: string, password = "ChangeMe2026!"): Promise<string> {
  const res = await requestHttp("/api/auth/login", "POST", { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} with status ${res.status}: ${res.body}`);
  }
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || !setCookie[0]) {
    throw new Error(`No Set-Cookie returned for ${email}`);
  }
  return setCookie[0].split(";")[0];
}

async function verifyRoute(
  name: string,
  path: string,
  cookie?: string,
  options?: { shouldContain?: string[]; shouldNotContain?: string[] }
) {
  process.stdout.write(`• Checking ${name} (${path})... `);
  const res = await requestHttp(path, "GET", undefined, cookie);

  if (res.status !== 200) {
    console.log(`❌ FAIL (HTTP ${res.status})`);
    throw new Error(`Route ${path} failed with HTTP ${res.status}`);
  }

  // Check expected / forbidden tokens
  if (options?.shouldContain) {
    for (const token of options.shouldContain) {
      if (!res.body.includes(token)) {
        console.log(`❌ FAIL (Missing token: "${token}")`);
        throw new Error(`Route ${path} missing expected content "${token}"`);
      }
    }
  }

  if (options?.shouldNotContain) {
    for (const token of options.shouldNotContain) {
      if (res.body.includes(token)) {
        console.log(`❌ FAIL (Found forbidden error token: "${token}")`);
        throw new Error(`Route ${path} contains forbidden error token "${token}"`);
      }
    }
  }

  // Parse scripts and stylesheets
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  const linkCssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;

  const assets: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = scriptRegex.exec(res.body)) !== null) {
    assets.push(m[1]);
  }
  while ((m = linkCssRegex.exec(res.body)) !== null) {
    assets.push(m[1]);
  }

  let failedAssets = 0;
  for (const asset of assets) {
    const assetRes = await requestHttp(asset, "GET", undefined, cookie);
    if (assetRes.status !== 200) {
      failedAssets++;
      console.warn(`    ⚠️ Failed asset ${asset} (HTTP ${assetRes.status})`);
    }
  }

  if (failedAssets > 0) {
    console.log(`❌ FAIL (${failedAssets} broken assets)`);
    throw new Error(`Route ${path} has ${failedAssets} broken assets`);
  }

  console.log(`✅ PASS (HTTP 200, ${assets.length} assets verified)`);
}

async function run() {
  console.log("==================================================");
  console.log("🔍 BALLEGH AI — RUNTIME ROUTE & ASSET AUDIT (PORT 3001)");
  console.log("==================================================\n");

  console.log("🔐 Authenticating test sessions...");
  const citizenCookie = await loginUser("citoyen@tunis.tn");
  console.log("  ✅ Citizen authenticated (Yassine Ben Amor)");

  const agentCookie = await loginUser("agent@commune-tunis.gov.tn");
  console.log("  ✅ Municipal Agent authenticated (Ing. Samira Trabelsi)");

  const adminCookie = await loginUser("admin@ballegh.tn");
  console.log("  ✅ Admin authenticated (Karim Mansour)\n");

  console.log("🌐 Testing Public & Portal Routes:\n");

  const errorTokens = [
    "Cannot read properties of undefined (reading 'call')",
    "Cannot find module './611.js'",
    "WebpackError",
    "Application error: a client-side exception has occurred",
  ];

  // 1. Root /
  await verifyRoute("Landing Page", "/", undefined, {
    shouldContain: ["BALLEGH", "AI"],
    shouldNotContain: errorTokens,
  });

  // 2. /login
  await verifyRoute("Login Page", "/login", undefined, {
    shouldContain: ["Connexion", "Adresse e-mail"],
    shouldNotContain: errorTokens,
  });

  // 3. /register
  await verifyRoute("Register Page", "/register", undefined, {
    shouldContain: ["Création de compte", "Adresse e-mail"],
    shouldNotContain: errorTokens,
  });

  // 4. /citizen/dashboard
  await verifyRoute("Citizen Dashboard", "/citizen/dashboard", citizenCookie, {
    shouldContain: ["Yassine Ben Amor", "Nouveau signalement"],
    shouldNotContain: errorTokens,
  });

  // 5. /citizen/reports/new
  await verifyRoute("Citizen New Report", "/citizen/reports/new", citizenCookie, {
    shouldContain: ["Créer un nouveau signalement", "Nid-de-poule"],
    shouldNotContain: errorTokens,
  });

  // 6. /citizen/reports
  await verifyRoute("Citizen Reports History", "/citizen/reports", citizenCookie, {
    shouldContain: ["Mes signalements"],
    shouldNotContain: errorTokens,
  });

  // 7. /municipal/dashboard
  await verifyRoute("Municipal Dashboard", "/municipal/dashboard", agentCookie, {
    shouldContain: ["Poste de Commandement Municipal"],
    shouldNotContain: errorTokens,
  });

  // 8. /admin/dashboard
  await verifyRoute("Admin Dashboard", "/admin/dashboard", adminCookie, {
    shouldContain: ["Supervision Administrative"],
    shouldNotContain: errorTokens,
  });

  console.log("\n🧪 Testing Dashboard API Data Endpoints:\n");

  // API /api/reports?myOnly=true
  process.stdout.write("• Checking GET /api/reports?myOnly=true... ");
  const myReportsRes = await requestHttp("/api/reports?myOnly=true", "GET", undefined, citizenCookie);
  if (myReportsRes.status === 200) {
    const data = JSON.parse(myReportsRes.body);
    console.log(`✅ PASS (HTTP 200, ${data.reports ? data.reports.length : 0} reports returned)`);
  } else {
    console.log(`❌ FAIL (HTTP ${myReportsRes.status})`);
    throw new Error(`/api/reports?myOnly=true failed with HTTP ${myReportsRes.status}`);
  }

  // API /api/auth/me
  process.stdout.write("• Checking GET /api/auth/me (Citizen Session)... ");
  const meRes = await requestHttp("/api/auth/me", "GET", undefined, citizenCookie);
  if (meRes.status === 200) {
    const data = JSON.parse(meRes.body);
    console.log(`✅ PASS (HTTP 200, user="${data.user?.fullName}", role="${data.user?.role}")`);
  } else {
    console.log(`❌ FAIL (HTTP ${meRes.status})`);
    throw new Error(`/api/auth/me failed with HTTP ${meRes.status}`);
  }

  console.log("\n==================================================");
  console.log("🎉 ALL ROUTES, ASSETS & DATA ENDPOINTS VERIFIED CLEAN!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("\n[FATAL AUDIT FAILURE]:", err.message);
  process.exit(1);
});
