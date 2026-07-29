# Amakai

Monorepo for the Amakai marketing site and client portal — two separate Next.js apps that share UI and configuration.

## Structure

```
apps/
  landing/   Marketing site (amakai.com)
  portal/    Client portal (portal.amakai.com)
packages/
  shared/    UI components, theme, and cross-app config
```

## Scripts

From the repo root:

- `npm run dev:landing` — landing site at [http://localhost:3000](http://localhost:3000)
- `npm run dev:portal` — portal at [http://localhost:3001](http://localhost:3001)
- `npm run build:landing` / `npm run build:portal` — production builds
- `npm run lint` — lint all workspaces

Run both apps in separate terminals during local development.

## Deployment

Deploy each app as its own project (e.g. two Vercel projects from the same repo):

| App     | Root directory | Example domain          |
|---------|--------------|-------------------------|
| Landing | `apps/landing` | `https://amakai.com`    |
| Portal  | `apps/portal`  | `https://portal.amakai.com` |

Set these environment variables per project:

**Landing (`apps/landing`)**

- `NEXT_PUBLIC_SITE_URL` — public URL of the landing site
- `NEXT_PUBLIC_PORTAL_URL` — public URL of the portal (used for Sign in / Get started links)

**Portal (`apps/portal`)**

- `NEXT_PUBLIC_SITE_URL` — public URL of the portal
- `NEXT_PUBLIC_LANDING_URL` — public URL of the landing site (used for “Back to the site”)

Local dev defaults to `localhost:3000` (landing) and `localhost:3001` (portal) via `NEXT_PUBLIC_APP` in each app's `next.config.ts`.

Copy `.env.example` to `.env` locally if you need to override URLs. Do not commit `.env`.
