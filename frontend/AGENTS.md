# Frontend collaboration

Read `../docs/team-development.md` before changing this application.

The teammate owns design, pages, JSX layout, components, styles, and visual assets.
The logic agent owns `src/domain`, `src/data`, `src/hooks`, `src/fixtures`, and future `convex/` backend functions.
Keep data access, business validation, API calls, and credentials out of page components.
Preserve the public hook contract when changing storage or networking.
Coordinate edits to `main.tsx`, dependencies/lockfiles, and shared configuration.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
