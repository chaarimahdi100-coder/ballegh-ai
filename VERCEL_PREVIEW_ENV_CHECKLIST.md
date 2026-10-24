# BALLEGH AI — VERCEL PREVIEW ENVIRONMENT VARIABLES CHECKLIST

**Date:** 2026-10-24  
**Target Repository:** `https://github.com/chaarimahdi100-coder/ballegh-ai`  
**Target Environment:** Vercel Preview (Staging / Branch Deployments)  
**Security Rule:** Zero real secrets, passwords, or active keys are printed in this document.

---

## 1. Executive Summary & Vercel Preview Readiness

The Ballegh AI codebase was audited to determine the exact environment variable requirements for deploying to **Vercel Preview**.

### Core Architecture Highlights:
- **Build-Time Isolation:** Next.js static page generation completes cleanly even without an active database connection. However, runtime API handlers and server components require database and storage variables.
- **Graceful Degradation:** Both the AI multimodal vision service (Gemini) and the transactional email subsystem (Resend/SMTP) feature verified fallback modes. If optional API keys are omitted, the application runs stably in certified simulation mode without crashing.
- **Client/Server Secret Boundary:** All database connection strings, JWT secrets, and service-role keys are strictly server-side (`Server-Only`). The browser never receives access to elevated credentials.

---

## 2. Master Environment Variables Matrix

| Variable Name | Code-Verified Precedence | Scope | Required for Preview? | Fallback if Omitted |
| :--- | :--- | :---: | :---: | :--- |
| **`DATABASE_URL`** | `process.env.DATABASE_URL` | **Server-Only** | **REQUIRED** | None (DB queries fail at runtime). |
| **`AUTH_SECRET`** | `AUTH_SECRET` > `JWT_SECRET` | **Server-Only** | **REQUIRED** | Insecure hardcoded default (Rejected for security). |
| **`JWT_SECRET`** | Fallback to `AUTH_SECRET` | **Server-Only** | **RECOMMENDED** | Mirrors `AUTH_SECRET` for full compatibility. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | `process.env.SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | **REQUIRED** | In-memory storage (Lost on serverless container recycled). |
| **`NEXT_PUBLIC_SUPABASE_URL`** | `SUPABASE_URL` > `NEXT_PUBLIC_SUPABASE_URL` | **Public & Server** | **REQUIRED** | Extracted from `DATABASE_URL` regex if possible. |
| **`ALLOW_DEMO_SWITCH`** | `process.env.ALLOW_DEMO_SWITCH` | **Server-Only** | **RECOMMENDED** | `"false"` (Blocks 1-click header role switcher). |
| **`GEMINI_API_KEY`** | `process.env.GEMINI_API_KEY` | **Server-Only** | **OPTIONAL** | Deterministic rule engine (`ballegh-rule-engine-v1.0`). |
| **`GEMINI_MODEL`** | `GEMINI_MODEL` > `"gemini-3.8-flash"` | **Server-Only** | **OPTIONAL** | Defaults to `"gemini-3.8-flash"`. |
| **`RESEND_API_KEY`** | `process.env.RESEND_API_KEY` | **Server-Only** | **OPTIONAL** | `PENDING_SMTP_CONFIG` (Safe simulation mode). |
| **`EMAIL_FROM`** | `EMAIL_FROM` > `RESEND_FROM_EMAIL` | **Server-Only** | **OPTIONAL** | `"Ballegh AI <notifications@ballegh.tn>"`. |
| **`NEXT_PUBLIC_APP_URL`** | `process.env.NEXT_PUBLIC_APP_URL` | **Public & Server** | **OPTIONAL** | Vercel dynamic preview domain (`*.vercel.app`). |
| **`DIRECT_URL`** | `process.env.DIRECT_URL` | **Server-Only** | **NOT NEEDED** | Not referenced in `prisma/schema.prisma`. |

---

## 3. Code-Verified Answers to Specific Questions

### A. Authentication Secret Variable Name (`AUTH_SECRET` vs. `JWT_SECRET`)
- **Code Reference:** [`lib/auth/jwt.ts#L18`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/lib/auth/jwt.ts) and [`middleware.ts#L8`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/middleware.ts)
- **Exact Code Logic:**
  ```typescript
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET;
  ```
- **Precedence Rule:**
  1. `AUTH_SECRET` is evaluated **first**.
  2. If `AUTH_SECRET` is unset, `JWT_SECRET` is evaluated.
  3. If both are unset, the app falls back to `DEFAULT_SECRET`.
- **Verdict & Recommendation:** Set **`AUTH_SECRET`** as the primary variable (32+ characters, generated via `openssl rand -base64 32`). Setting `JWT_SECRET` to the exact same value in Vercel is recommended to prevent any discrepancy across development scripts and external tools.

---

### B. Supabase Connection String Format for Prisma
- **Code Reference:** [`prisma/schema.prisma#L1-L4`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/prisma/schema.prisma) and [`lib/db.ts#L10-L23`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/lib/db.ts)
- **Prisma Schema Configuration:**
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- **Automatic Resolution in Code (`lib/db.ts`):**
  If a direct connection string is supplied (`postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`), `resolveDatabaseUrl()` automatically rewrites it to use the IPv4 pooler host:
  `postgresql://[USER].[REF]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/[DB]`.
- **Recommended Format for Vercel Serverless Functions:**
  For serverless runtime environments (Vercel Preview & Production), connection pooling via PgBouncer on port `6543` is strongly recommended to prevent connection exhaustion:
  ```text
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
  ```
  *(Alternative Session Pooler format on port `5432` also works: `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`)*.

---

### C. Can Email Safely Remain Disabled in Vercel Preview?
- **Code Reference:** [`lib/services/emailService.ts#L279-L299`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/lib/services/emailService.ts)
- **Verdict:** **YES, 100% SAFELY DISABLED.**
- **Exact Behavior when `RESEND_API_KEY` and `SMTP_HOST` are omitted:**
  1. The service detects that no external email transport is configured.
  2. The function `dispatchOfficialEmail()` returns:
     ```typescript
     {
       success: true,
       isSimulated: true,
       provider: "simulated",
       transportStatus: "PENDING_SMTP_CONFIG",
       deliveryState: "simulated"
     }
     ```
  3. The report lifecycle transitions smoothly from `human_validated` to `forwarded` (`officialEmailSent: true`).
  4. Municipal agents and citizen authors can proceed to mark the incident as `in_progress` and `resolved`.
  5. Zero outbound HTTP calls are made to Resend or SMTP, preventing accidental real email dispatches or sandbox errors during testing.

---

### D. Demo Account Switcher (`ALLOW_DEMO_SWITCH`)
- **Code Reference:** [`app/api/auth/demo-switch/route.ts#L14-L25`](file:///c:/Users/user/Nouveau%20dossier/freelance%20projet%20inividuel/ballegh-ai/app/api/auth/demo-switch/route.ts)
- **Behavior on Vercel:** Vercel automatically sets `NODE_ENV="production"`.
- **Preview Configuration:**
  - If `ALLOW_DEMO_SWITCH="true"`, evaluators of the Vercel Preview deployment can use the top navigation dropdown to instantly switch between **Citoyen**, **Agent Municipal**, and **Administrateur** without entering passwords.
  - If `ALLOW_DEMO_SWITCH="false"`, the demo switch route returns `HTTP 403 Forbidden`, enforcing standard login via `/login`.

---

## 4. Step-by-Step Vercel Setup Instructions

1. Open your project on [Vercel Dashboard](https://vercel.com).
2. Navigate to **Settings** > **Environment Variables**.
3. Configure the following variables for the **Preview** (and optionally **Production**) environment:

### Tier 1: Essential Runtime Variables (Required)
```text
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
AUTH_SECRET=[GENERATE_32_CHAR_RANDOM_SECRET]
JWT_SECRET=[SAME_AS_AUTH_SECRET]
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SUPABASE_SERVICE_ROLE_KEY]
ALLOW_DEMO_SWITCH=true
```

### Tier 2: AI & Optional Integrations
```text
GEMINI_API_KEY=[YOUR_GOOGLE_AI_STUDIO_KEY]
GEMINI_MODEL=gemini-3.8-flash
```
*(Leave `RESEND_API_KEY` and SMTP variables empty for Preview to keep official municipal email dispatch in safe simulation mode).*

---

## 5. Verification Checklist After Adding Variables

- [ ] Trigger a new Preview Deployment from GitHub branch `master` on Vercel.
- [ ] Confirm build log shows:
  ```text
  ✓ Compiled successfully
  ✓ Generating static pages (24/24)
  ```
- [ ] Visit `https://[PREVIEW-URL].vercel.app/`.
- [ ] Verify login at `/login` with test accounts or using the header demo switcher.
- [ ] Submit a new report with photo at `/citizen/reports/new` and confirm image persists via private Supabase Storage proxy.
- [ ] Log in as Municipal Agent at `/municipal/reports`, approve the report, and confirm email dispatch records `PENDING_SMTP_CONFIG` simulation mode.
