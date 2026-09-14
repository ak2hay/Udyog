# Rkyves Manufacturing ERP

Working name: **Rkyves** (rename later in `packages/shared/src/brand.ts`).

Multi-tenant manufacturing ERP MVP covering:

**Quote → Sales Order → Production → Job Cards → QC → Dispatch → Invoice**

plus masters, inventory, purchase/GRN, AR/AP, dashboards, and audit logs.

## Stack

- Next.js 15 (App Router) + Tailwind 4 + DM Sans / Fraunces
- Neon Postgres + Drizzle ORM
- Better Auth (email/password)
- pnpm workspaces

## Quick start

```bash
pnpm install
# schema already applied to Neon project rkyves-manufacturing-erp
pnpm db:seed
pnpm --filter @rkyves/web dev
```

Open http://localhost:3000 (prefer freeing port 3000 so env URLs match; auth also trusts localhost:3000–3020).

1. **Sign up** at `/signup`
2. On onboarding, click **Join demo tenant** (requires `pnpm db:seed` first)  
   — or create a fresh company
3. Run the loop: Quotation → SO → Production → Issue materials → Job cards → QC → Dispatch → Invoice

## Workspace layout

```
apps/web              Next.js app
packages/db           Drizzle schema, services, seed
packages/shared       Brand, roles, document prefixes
```

## Env

See `.env.example`. Local secrets live in `.env` and `apps/web/.env.local` (gitignored).

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Neon Postgres |
| `BETTER_AUTH_SECRET` | Auth signing |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Public app URL |
| `SUPER_ADMIN_EMAILS` | Bootstrap Super Admin access (comma-separated) |
| `PLATFORM_SECRETS_KEY` | Encrypt SMTP/Razorpay secrets in DB |

Neon project: `rkyves-manufacturing-erp` (`tiny-violet-08853489`).

## Super Admin portal

1. Set `SUPER_ADMIN_EMAILS` to your account email in `.env` / `apps/web/.env.local`
2. Sign up at `/signup` with that email (or add yourself via seed after signup)
3. Run `pnpm db:push` then `pnpm db:seed` (seeds Starter/Growth/Enterprise plans + settings)
4. Open [http://localhost:3000/superadmin](http://localhost:3000/superadmin)

Configure SMTP, OTP, and Razorpay under **Settings**. Manage tenants, plans, subscriptions, billing events, and platform admins from the sidebar.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter @rkyves/web dev` | Dev server |
| `pnpm --filter @rkyves/web build` | Production build |
| `pnpm db:seed` | Seed demo manufacturing data |
| `pnpm db:push` | Push Drizzle schema to Neon |

## Deploy (Vercel)

Live: [https://udyog-five.vercel.app](https://udyog-five.vercel.app)  
Repo: [ak2hay/Udyog](https://github.com/ak2hay/Udyog). Next.js in `apps/web` includes UI + Server Actions + Better Auth — no separate backend service.

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Project settings:
   - **Framework**: Next.js
   - **Root Directory**: `apps/web`
   - **Include source files outside of the Root Directory**: enabled (for `@rkyves/db` / `@rkyves/shared`)
   - **Install / Build**: leave defaults (`pnpm install`, `pnpm build`)
3. Environment variables (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Long random secret (32+ chars) |
| `BETTER_AUTH_URL` | Public app URL, e.g. `https://your-project.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Same public URL |
| `SUPER_ADMIN_EMAILS` | Your email(s) for `/superadmin` bootstrap |
| `PLATFORM_SECRETS_KEY` | Secret for encrypting SMTP/Razorpay settings |

4. Deploy. After the production URL is known, set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to that URL (and any custom domain), then redeploy.

Schema and demo seed are **not** part of the Vercel build. Run locally against Neon when needed:

```bash
pnpm db:push
pnpm db:seed
```
