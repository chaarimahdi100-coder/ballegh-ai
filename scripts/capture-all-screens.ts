import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

const PORT = 3001;
const CDP_PORT = 9222;
const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots");
const PER_SCREEN_TIMEOUT_MS = 25000;
const CDP_SEND_TIMEOUT_MS = 15000;

function requestHttp(urlPath: string, method = "GET", body?: any, cookie?: string): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        path: urlPath,
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

async function getAuthCookie(email: string, password = "ChangeMe2026!"): Promise<string> {
  const res = await requestHttp("/api/auth/login", "POST", { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} (status ${res.status}): ${res.body}`);
  }
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || !setCookie[0]) {
    throw new Error(`No Set-Cookie returned for ${email}`);
  }
  const match = setCookie[0].match(/ballegh_session=([^;]+)/);
  if (!match) throw new Error("Could not extract ballegh_session value");
  return match[1];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class CdpClient {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();

  async connect(wsUrl: string, timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`WebSocket connection timeout to ${wsUrl}`)), timeoutMs);
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      this.ws.onerror = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data as any).toString("utf-8");
          const msg = JSON.parse(raw);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject, timer } = this.pending.get(msg.id)!;
            clearTimeout(timer);
            this.pending.delete(msg.id);
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          }
        } catch (parseErr) {
          console.error("Failed to parse CDP message:", parseErr);
        }
      };
    });
  }

  send(method: string, params: any = {}, timeoutMs = CDP_SEND_TIMEOUT_MS): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP method '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  close() {
    for (const [, { reject, timer }] of this.pending) {
      clearTimeout(timer);
      reject(new Error("CDP client closed"));
    }
    this.pending.clear();
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log("==================================================");
  console.log("📸 BALLEGH AI — REAL BROWSER VISUAL QA CAPTURE");
  console.log("==================================================");

  // 1. Authenticate sessions
  console.log("\n🔐 Authenticating test sessions via HTTP API...");
  const citizenToken = await getAuthCookie("citoyen@tunis.tn");
  const agentToken = await getAuthCookie("agent@commune-tunis.gov.tn");
  const adminToken = await getAuthCookie("admin@ballegh.tn");
  console.log("  ✅ Citizen token: verified");
  console.log("  ✅ Municipal Agent token: verified");
  console.log("  ✅ Admin token: verified");

  // 2. Launch isolated Chrome headless browser
  console.log("\n🚀 Starting isolated headless Chrome on CDP port " + CDP_PORT + "...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = path.resolve(process.env.TEMP || "C:\\temp", "chrome_qa_run_" + Date.now());

  const chromeProc: ChildProcess = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${tempProfile}`,
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const cleanupChrome = () => {
    try {
      chromeProc.kill("SIGKILL");
    } catch {}
    try {
      if (fs.existsSync(tempProfile)) {
        fs.rmSync(tempProfile, { recursive: true, force: true });
      }
    } catch {}
  };

  process.on("exit", cleanupChrome);
  process.on("SIGINT", () => { cleanupChrome(); process.exit(1); });
  process.on("SIGTERM", () => { cleanupChrome(); process.exit(1); });

  // 3. Connect to CDP page target
  let targetWsUrl = "";
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/list`);
      if (res.ok) {
        const tabs: any = await res.json();
        const pageTab = tabs.find((t: any) => t.type === "page" && !t.url.startsWith("chrome-extension://"));
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          targetWsUrl = pageTab.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!targetWsUrl) {
    cleanupChrome();
    throw new Error("Could not find a valid page target in Chrome DevTools Protocol");
  }

  console.log("🔌 Connected to Chrome DevTools Protocol target: " + targetWsUrl);
  const cdp = new CdpClient();
  await cdp.connect(targetWsUrl);

  await cdp.send("Network.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const screens = [
    { name: "01_landing_public", path: "/", token: null },
    { name: "02_login_public", path: "/login", token: null },
    { name: "03_register_public", path: "/register", token: null },
    { name: "04_citizen_dashboard", path: "/citizen/dashboard", token: citizenToken },
    { name: "05_citizen_reports_new", path: "/citizen/reports/new", token: citizenToken },
    { name: "06_citizen_reports_list", path: "/citizen/reports", token: citizenToken },
    { name: "07_municipal_dashboard", path: "/municipal/dashboard", token: agentToken },
    { name: "08_municipal_reports_queue", path: "/municipal/reports", token: agentToken },
    { name: "09_municipal_map", path: "/municipal/map", token: agentToken },
    { name: "10_admin_dashboard", path: "/admin/dashboard", token: adminToken },
    { name: "11_admin_users", path: "/admin/users", token: adminToken },
    { name: "12_admin_settings", path: "/admin/settings", token: adminToken },
  ];

  console.log(`\n📷 Capturing ${screens.length} key application screens...`);
  let successCount = 0;
  let failureCount = 0;
  const failureDetails: Array<{ name: string; path: string; error: string }> = [];

  for (const screen of screens) {
    const screenPromise = (async () => {
      process.stdout.write(`• Capturing ${screen.name} (${screen.path})... `);
      await cdp.send("Network.clearBrowserCookies");
      if (screen.token) {
        await cdp.send("Network.setCookie", {
          name: "ballegh_session",
          value: screen.token,
          url: `http://localhost:${PORT}`,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        });
      }

      // Pre-warm route via HTTP to eliminate on-demand Next.js compilation delay
      await requestHttp(screen.path, "GET", undefined, screen.token ? `ballegh_session=${screen.token}` : undefined).catch(() => {});

      const navResult = await cdp.send("Page.navigate", { url: `http://localhost:${PORT}${screen.path}` });
      if (navResult.errorText) {
        throw new Error(`Navigation failed: ${navResult.errorText}`);
      }

      await sleep(1500); // Allow hydration & API data load

      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      if (!shot.data) {
        throw new Error("No image data returned by Page.captureScreenshot");
      }

      const outPath = path.join(SCREENSHOT_DIR, `${screen.name}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      const stat = fs.statSync(outPath);
      console.log(`✅ OK (${stat.size} bytes)`);
      successCount++;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Screen capture exceeded timeout of ${PER_SCREEN_TIMEOUT_MS}ms`)), PER_SCREEN_TIMEOUT_MS);
    });

    try {
      await Promise.race([screenPromise, timeoutPromise]);
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      failureCount++;
      failureDetails.push({ name: screen.name, path: screen.path, error: err.message });
    }
  }

  cdp.close();
  cleanupChrome();

  console.log("\n==================================================");
  console.log(`📊 SCREENSHOT CAPTURE RESULTS: ${successCount}/${screens.length} SUCCEEDED, ${failureCount} FAILED`);
  console.log("==================================================");

  if (failureCount > 0) {
    console.error("\n❌ Failures detected during visual QA:");
    for (const fail of failureDetails) {
      console.error(`  - ${fail.name} (${fail.path}): ${fail.error}`);
    }
    process.exit(1);
  }

  console.log("\n🎉 All screens captured successfully and saved to ./screenshots/");
  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL QA CAPTURE RUNNER ERROR:", err);
  process.exit(1);
});
