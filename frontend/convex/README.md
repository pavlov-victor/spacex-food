# SpaceX food backend

Convex schema and authenticated API for organizations, menus, products, photos and background Dify jobs.

Read [the API contract](../../docs/backend-api.md) and [deployment instructions](../../docs/deployment.md).

- `auth.ts`, `auth.config.ts`, `http.ts`: Convex Auth password login and signup.
- `organizations.ts`, `catalog.ts`, `files.ts`: organization-scoped data and image upload.
- `jobs.ts`: authenticated job creation/retry and internal transactional completion.
- `workflows.ts`, `lib/dify.ts`: Dify streaming API, recovery and image persistence.
- `bootstrap.ts`: internal demo account seed (CLI only).
- `schema.ts`, `validators.ts`, `lib/access.ts`: schema, validation and authorization.

`npm run test:backend` runs isolated tests with mocked providers; no Dify/x.ai calls.
