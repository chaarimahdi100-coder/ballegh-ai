# BALLEGH AI — VERCEL PRODUCTION DEPLOYMENT CHECKLIST & GUIDE

> **Target Platform**: [Vercel](https://vercel.com) (Next.js App Router Serverless)  
> **Backend Database**: Supabase PostgreSQL (Managed Supavisor / PgBouncer Pooler)  
> **Object Storage**: Supabase Storage (Private bucket `ballegh-reports`)  
> **AI Inference**: Google Gemini 2.5 Flash via `@google/genai`  
> **Transactional Email**: Resend API (`resend`) with SMTP fallback  

---

## 1. Vercel Project Creation

1. **Log in to Vercel**: Navigate to [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Add New Project**:
   - Click **Add New...** → **Project**.
   - Select your Git provider (GitHub / GitLab / Bitbucket) and import the repository: `ballegh-ai`.
3. **Configure Project Settings**:
   - **Framework Preset**: `Next.js` (detected automatically).
   - **Root Directory**: `./` (leave default unless in a monorepo subfolder).
   - **Build Command**: `npm run build` (or override with `npx prisma generate && next build`).
   - **Output Directory**: `.next` (default).
   - **Install Command**: `npm install` (default).
   - **Node.js Version**: `20.x` or `22.x` (Recommended: `20.x` LTS in **Settings → General**).

---

## 2. Environment Variables Matrix

Configure all environment variables in **Vercel Project Dashboard → Settings → Environment Variables**.

> [!CAUTION]
> **CRITICAL SECURITY RULE**: Never prefix server secrets with `NEXT_PUBLIC_`.  
> Any variable prefixed with `NEXT_PUBLIC_` is baked into client-side JavaScript bundles and publicly inspectable in the browser.

| Variable Name | Required? | Scope | Environments | Description |
| :--- | :---: | :---: | :---: | :--- |
| `DATABASE_URL` | **Yes** | **Server-Only** | Production, Preview, Dev | Supabase PostgreSQL pooled connection URI (port `6543` for transaction pooler or `5432` with `?pgbouncer=true`). |
| `DIRECT_URL` | Optional | **Server-Only** | Production, Preview, Dev | Direct connection URI to PostgreSQL (port `5432`), required if running Prisma migrations from external CI. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | **Public** | Production, Preview, Dev | Supabase project URL (e.g. `https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | **Public** | Production, Preview, Dev | Supabase anonymous public API key (safe for client, restricted by Supabase RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Server-Only** | Production, Preview, Dev | Supabase administrative service-role secret. Required for accessing private `ballegh-reports` bucket. **NEVER expose to client**. |
| `SUPABASE_REPORTS_BUCKET` | Optional | **Server-Only** | Production, Preview, Dev | Name of the private storage bucket. Defaults to `ballegh-reports`. |
| `GEMINI_API_KEY` | **Yes** | **Server-Only** | Production, Preview, Dev | Google AI Studio API key for Gemini 2.5 Flash live inference. |
| `AUTH_SECRET` (or `JWT_SECRET`) | **Yes** | **Server-Only** | Production, Preview, Dev | 32+ character random string used to sign and verify session JWTs. Generate with `openssl rand -base64 32`. |
| `RESEND_API_KEY` | Optional / Recommended | **Server-Only** | Production, Preview, Dev | Resend API key (`re_...`) for transactional municipal dispatch emails. |
| `EMAIL_PROVIDER` | Optional | **Server-Only** | Production, Preview, Dev | Explicit provider selector: `resend`, `smtp`, or `none`. Defaults to `resend` if `RESEND_API_KEY` is present. |
| `EMAIL_FROM` | **Yes** (if sending email) | **Server-Only** | Production, Preview, Dev | Sender address. Use `onboarding@resend.dev` for initial sandbox testing; use `notifications@<your-verified-domain>` in production. |
| `SMTP_HOST` | Optional | **Server-Only** | Production, Preview, Dev | SMTP host (if using SMTP instead of Resend, e.g. `smtp.sendgrid.net`). |
| `SMTP_PORT` | Optional | **Server-Only** | Production, Preview, Dev | SMTP port (e.g. `587` or `465`). |
| `SMTP_USER` | Optional | **Server-Only** | Production, Preview, Dev | SMTP authentication username. |
| `SMTP_PASSWORD` | Optional | **Server-Only** | Production, Preview, Dev | SMTP authentication password / token. |
| `NEXT_PUBLIC_APP_URL` | Optional | **Public** | Production, Preview, Dev | Base public URL of the application (e.g. `https://ballegh-ai.vercel.app` or custom domain). |

---

## 3. Database Preparation & Connection Pooling

Next.js on Vercel runs API routes and Server Components as ephemeral serverless Lambda functions. Without pooling, concurrent invocations can exhaust PostgreSQL connection limits.

### A. Connection Pooling Setup
1. In Supabase Dashboard, go to **Project Settings → Database → Connection string**.
2. Select the **Transaction** mode pooler (Supavisor, port `6543`) for `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   ```
3. Set the **Session** mode direct connection (port `5432`) for `DIRECT_URL` (used for schema migrations):
   ```env
   DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
   ```

### B. Applying Prisma Migrations to Supabase
Run the migrations against your Supabase production database before triggering the initial Vercel deployment:
```bash
npx prisma migrate deploy
```
Verify the tables exist in the Supabase Table Editor:
`reports`, `report_photos`, `ai_analyses`, `municipal_services`, `human_reviews`, `timeline_events`, `duplicate_clusters`, `users`.

---

## 4. Storage Preparation (`ballegh-reports`)

Citizen photos contain sensitive municipal and geolocation data and must remain strictly private.

### A. Create the Bucket
1. Open **Supabase Dashboard → Storage → Buckets**.
2. Verify or create a bucket named `ballegh-reports`.
3. Set **Public bucket** toggle to **OFF (Private)**.
4. Set **Maximum file size limit** to `5 MB`.
5. Set **Allowed MIME types** to:
   - `image/jpeg`
   - `image/png`
   - `image/webp`

### B. Architecture Verification
- Direct public URLs (`https://<project-ref>.supabase.co/storage/v1/object/public/...`) return HTTP 400/403 (enforcing privacy).
- Photos are served exclusively through the authenticated proxy route `/api/photos/[...path]` using the server-side `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. Transactional Email Configuration (Resend)

### A. Initial Free-Tier Sandbox (`onboarding@resend.dev`)
When deploying without a custom domain, Resend provides the shared test sender `onboarding@resend.dev`.

> [!WARNING]
> **Resend Free Sandbox Limitation**:  
> In testing sandbox mode (`onboarding@resend.dev`), Resend **ONLY** permits sending emails to the single email address associated with your Resend account owner.  
> Dispatching emails to external municipal addresses (e.g., `voirie@commune-tunis.gov.tn`) will fail with HTTP 403 `validation_error`.  
> For live demonstration, set the municipal service recipient or test reviewer email to your Resend account email.

### B. Production Custom Domain Setup (Full Delivery)
To deliver emails to real Tunisian municipal authorities:
1. Purchase or configure your domain (e.g. `ballegh.tn` or `mail.ballegh.tn`).
2. Go to [Resend Dashboard → Domains](https://resend.com/domains) and click **Add Domain**.
3. Add the generated DNS records at your DNS registrar:
   - **DKIM**: CNAME `resend._domainkey.yourdomain.com` → `feedback-smtp.us-east-1.amazonses.com`
   - **SPF**: TXT `bounces.yourdomain.com` → `v=spf1 include:amazonses.com ~all`
   - **DMARC**: TXT `_dmarc.yourdomain.com` → `v=DMARC1; p=none;`
4. Wait for DNS propagation and click **Verify Domain** in Resend.
5. In Vercel Environment Variables, update `EMAIL_FROM` to:
   ```env
   EMAIL_FROM="Ballegh AI <notifications@yourdomain.com>"
   ```

### C. Human-in-the-Loop Gating
- Emails are **never** dispatched automatically upon citizen report creation.
- An email is only triggered when a municipal agent explicitly clicks **"Approuver et Transmettre"** (`POST /api/municipal/reports/:id/review` with `decision: "FORWARD"`).

---

## 6. Post-Deployment Smoke Test Script (Live Production URL)

Execute this 10-step smoke test against your deployed `https://ballegh-*.vercel.app` domain:

1. **Homepage & Brand Integrity**:
   - Open `https://ballegh-*.vercel.app/`.
   - Verify the Ballegh AI logo renders at proportional size (32px/40px, no overflow or massive SVG scaling).
   - Verify the language selector toggles between French (`fr`) and Arabic (`ar`) with correct RTL layout.

2. **Citizen Registration & Session**:
   - Navigate to `/citizen/register`.
   - Register a new citizen account with a valid email and phone number.
   - Confirm immediate redirect to `/citizen/dashboard` with valid JWT cookie `ballegh_token`.

3. **New Report Creation**:
   - Go to `/citizen/reports/new`.
   - Verify typography is clear, comfortable, and properly styled (no micro 10px text).
   - Select category `Voirie & Chaussée` (Roads).
   - Enter title and description.
   - Attach a real JPEG or PNG photo under 5MB.
   - Select a location on the interactive map or enter Tunis coordinates.
   - Click **"Envoyer le signalement"**.

4. **Private Storage & Proxy Verification**:
   - In report details (`/citizen/reports/[id]`), verify the photo thumbnail loads.
   - Inspect the image URL in browser dev tools: it must point to `/api/photos/reports/...` (authenticated proxy), NOT a raw public Supabase URL.
   - Open an incognito window and paste the image URL: it must return HTTP 401 Unauthorized.

5. **Gemini 2.5 Flash Live AI Triage**:
   - Verify the report details page displays the AI analysis card.
   - Confirm Category, Urgency Score, Recommended Service (`Direction de la Voirie`), and Safety Recommendations are populated.

6. **Municipal Portal Role-Based Access Control**:
   - Navigate to `/municipal/dashboard` as a citizen: verify you are redirected or receive HTTP 403.
   - Log in with municipal credentials (`voirie@commune-tunis.gov.tn`).
   - Confirm access to `/municipal/dashboard`, `/municipal/reports`, and `/municipal/map`.

7. **Municipal Review & Decision**:
   - Open the newly submitted citizen report in the municipal portal.
   - Click **"Examiner le signalement"**.
   - Modify the priority or service if necessary.
   - Submit a review with decision **"Valider & Assigner"**.
   - Confirm the report status changes to `ASSIGNED` / `FORWARDED` and timeline logs the agent's name.

8. **Email Dispatch Verification**:
   - In the municipal review modal, check the email dispatch log.
   - In Resend dashboard (`resend.com/emails`), verify the email was recorded (or in sandbox mode, delivered to the verified developer email).

9. **Timeline & Field Resolution**:
   - Progress the report status through `IN_PROGRESS` to `RESOLVED_BY_MUNICIPALITY`.
   - Switch back to the citizen session: verify the citizen sees the "Résolu par la municipalité" banner.
   - As citizen, click **"Confirmer la résolution sur le terrain"**.
   - Confirm the status advances to `CONFIRMED_BY_CITIZEN`.

10. **Admin Portal & Audit Integrity**:
    - Log in with admin credentials (`admin@ballegh.tn`).
    - Navigate to `/admin/dashboard`, `/admin/users`, and `/admin/settings`.
    - Verify user counts, system health metrics, and audit log entries reflect the entire lifecycle without data anomalies.
