# SpaceX food CRM

React + TypeScript + Vite, shadcn/ui, Convex + Convex Auth, Dify workflows.

```sh
npm install
npx convex dev
# Another terminal:
npm run dev
```

`npx convex dev` configures `.env.local` with `VITE_CONVEX_URL`. Credentials and deployment secrets stay outside Git.

Backend deployed to the configured development project. The first organization is **SpaceX Food Demo**, login **admin / 123**. The current preview pages still need the designer's login/logout and workflow forms. Data hooks already use Convex; anonymous callers cannot read or modify organization data.

- [Backend API and designer integration](../docs/backend-api.md)
- [Render + Convex deployment](../docs/deployment.md)
- [Team file ownership](../docs/team-development.md)

Checks: `npm run test:backend`, `npm run typecheck:backend`, `npm run build`, `npm run lint`. Browser integration: `RUN_BACKEND_E2E=1 PLAYWRIGHT_CHANNEL=chrome npx playwright test` against the configured seeded dev backend. Test output is ignored by Git.

For a new development deployment, `node scripts/configure-backend.mjs` configures authentication keys and copies the two named Dify API keys from the root `.env` over stdin without printing them. It preserves an existing auth key pair. Then run `npx convex dev --once` and `npx convex run bootstrap:seed '{}'`. The seed is internal and does not reset an existing admin password.

Manual live diagnostics: `node scripts/smoke-backend.mjs` checks login; adding `--import` imports the sample menu through Dify. `node scripts/check-workflows.mjs` reads saved status; `--generate` explicitly starts the sample card generation. These optional flags call external AI services and are not used by automated tests.
