# SpaceX Food CRM

> **B2B digital-menu platform for Serbian kafanas and restaurants** — born at SpaceX Hackathon Belgrade.

A restaurant owner photographs a paper menu, the system extracts dishes and categories, enriches each card with AI-generated English content and a styled food photo, then publishes a guest-facing digital menu reachable via QR code.

---

## Live demo

| Resource | URL |
|---|---|
| CRM (Render) | https://spacex-food-crm.onrender.com |
| Demo login | `admin` / `123` |
| Convex backend | `https://good-aardvark-691.eu-west-1.convex.cloud` |

---

## Features

- **Menu import** — upload 1–5 JPG/PNG photos of a paper menu; Dify + Grok vision extracts up to 250 dishes and 100 categories.
- **AI card generation** — per-dish: English name, description, classification (vegan / spicy / allergens / etc.), styled food image via fal.ai / Grok Imagine, on a custom table background.
- **Batch actions** — *Generate all cards* queues the whole menu server-side; closing the tab does not stop the queue. *Approve all generated cards* applies ready drafts in one click.
- **Publish & QR** — saves a public snapshot, returns a `/menu/:slug` link and a QR code guests can scan without logging in.
- **PDF / Print** — A4 menu PDF auto-rebuilds after imports, edits, approvals and publishes; includes QR when `PUBLIC_APP_URL` is set.
- **Org settings** — restaurant name, AI context, table photo used as the card background.

---

## Architecture

```
frontend/          React 19 · TypeScript · Vite 8 · Tailwind 4 · shadcn/Radix · Recharts
frontend/convex/   Convex Auth · orgs · menus · products · cards · jobs · storefront · PDF
dsl/menu/          Dify workflow — photo → categories + dishes  (latest: 0.0.3)
dsl/product/       Dify workflow — single dish enrichment        (latest: 0.0.8)
daytona/           PDF worker — A4 PDF + PNG preview generation
scripts/           DSL lint, release builder, helpers
docs/              API contract, deployment guide, PDF notes, demo script
```

**Data flow:**

```
Photo upload → Convex Storage
  → Dify spacex-menu (Grok vision) → categories + products in Convex
    → Dify spacex-product (Grok text + Exa facts + fal.ai image)
      → card draft (imageUrl in Convex Storage, text in cards.draftJson)
        → Apply card → Publish → public /menu/:slug snapshot
```

LLM workflows live entirely in Dify; Convex owns data, auth, file storage and background job scheduling.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/Radix UI |
| Charts | Recharts |
| Backend / DB | [Convex](https://convex.dev) — real-time queries, mutations, scheduled actions |
| Auth | Convex Auth (username + password) |
| LLM orchestration | [Dify](https://dify.ai) |
| Text model | Grok (xAI) |
| Web search / facts | Exa |
| Image generation | fal.ai, Grok Imagine |
| PDF generation | Daytona sandbox + Python worker |
| Hosting | Render (static site), Convex cloud |

---

## Repository layout

```
spacex-food/
├── frontend/
│   ├── src/            App + React components + hooks
│   ├── convex/         Backend functions, schema, auth
│   ├── tests/          Playwright browser tests
│   └── ...             Vite config, Tailwind, shadcn
├── dsl/
│   ├── menu/           Dify DSL snapshots (spacex-menu workflow)
│   └── product/        Dify DSL snapshots (spacex-product workflow)
├── daytona/            PDF worker + sync script
├── scripts/            DSL lint & release tools
├── docs/               Backend API, deployment, demo video script
├── resources/          Sample menu photos and card reference
└── render.yaml         Render blueprint (static site)
```

---

## Getting started (local dev)

**Prerequisites:** Node.js 24+, Python 3.11+, a Convex account, a Dify instance with Grok/Exa/fal credentials.

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Start Convex dev backend (creates .env.local automatically)
npx convex dev

# 3. Configure backend secrets (Dify keys, JWT)
node scripts/configure-backend.mjs
npx convex dev --once

# 4. Seed demo data
npx convex run bootstrap:seed '{}'

# 5. Start the dev server
npm run dev -- --host 127.0.0.1 --port 5176
# → http://127.0.0.1:5176  (login: admin / 123)
```

---

## Running checks

```bash
cd frontend

# Build
npm run build

# Backend type-check
npm run typecheck:backend

# Backend unit tests (Vitest, no live Convex needed)
npm run test:backend

# Playwright browser tests (requires live dev backend)
RUN_BACKEND_E2E=1 PLAYWRIGHT_CHANNEL=chrome npx playwright test
```

For DSL workflows:

```bash
python3 scripts/dsl_lint.py --strict dsl/menu/0.0.3.yml dsl/product/0.0.8.yml
python3 scripts/test_dsl_lint.py
python3 dsl/product/test_workflow.py
python3 -m unittest discover -s daytona -p 'test_*.py'
```

---

## Deployment

### Frontend → Render

The `render.yaml` in the repo root configures a static site automatically:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| `NODE_VERSION` | `24.12.0` |
| `VITE_CONVEX_URL` | your Convex deployment URL |

Push to `main` triggers a new deploy.

### Backend → Convex

```bash
cd frontend
npx convex deploy   # production only
```

Required environment variables on the Convex deployment:

| Variable | Description |
|---|---|
| `DIFY_API_URL` | Dify base URL |
| `DIFY_MENU_API` | API key for the `spacex-menu` app |
| `DIFY_PERSON_API` | API key for the `spacex-product` app |
| `DAYTONA_API_KEY` | Daytona workspace key |
| `DAYTONA_SNAPSHOT` | (optional) Daytona snapshot name |
| `PUBLIC_APP_URL` | Public CRM URL — adds QR code to PDFs |

### Dify workflows

Import release files (generated via `python3 scripts/dsl_release.py`) manually into your Dify instance:

- `dsl/menu/0.0.3.yml` → publish as `spacex-menu`
- `dsl/product/0.0.8.yml` → publish as `spacex-product`

The release script injects API keys from the local `.env`; release files (ending in `-release.yml`) are git-ignored.

---

## Environment variables (local)

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Convex CLI manages `CONVEX_DEPLOYMENT` automatically. Never commit `.env.local` or release DSL files.

---

## Data invariants

- All private operations verify org membership server-side.
- `applyCard` writes the English name/description and preserves `originalName`; AI never auto-changes price or confirmed ingredients/allergens.
- Publishing requires an accepted card and no active generation in progress.
- fal.ai images are persisted in Convex Storage; the provider's temporary URL is never used as the permanent card address.
- Image failures do not discard successfully generated text.

---

## Contributing

Work happens on `main`. Before editing `frontend/` read `frontend/AGENTS.md` and `docs/team-development.md`; for Convex functions read `frontend/convex/_generated/ai/guidelines.md`.

```bash
git pull --rebase origin main   # before starting
git push origin HEAD            # after completing a change
```

Do not force-push. Do not commit `package-lock.json` from the repo root.

---

## License

Internal project — SpaceX Hackathon Belgrade, 2026.
