# Customer menu

Same React app and Render deployment, public route `/menu/:slug`; CRM remains at `/`. Demo: `/menu/sava`, no sign-in required. Entry splits bundles: CRM charts and auth do not load on the storefront.

## Ownership

- Designer: CRM `src/App.tsx`, CRM components and styles.
- Customer UI: `frontend/src/storefront/Storefront.tsx`, scoped `storefront.css`.
- Data hook: `frontend/src/hooks/use-public-menu.ts`; connection: `storefront/PublicMenuProvider.tsx`.
- Backend: `convex/storefront.ts`, `storefrontSchema.ts`; seed: `convex/demoMenu.ts`.
- Shared entry: `src/main.tsx` → `src/entry.tsx`, CRM wrapper `src/crm-entry.tsx`.

## Publishing from CRM

Authenticated `api.storefront.publish({ menuId, slug, name, reviewed: true })` publishes or replaces a snapshot after review. Slugs are unique lowercase letters/numbers/hyphens, maximum 64 characters. Only members of the menu's organization can publish/unpublish. Limit: 250 products per menu. Check names, descriptions, prices, ingredients and confirmed tags before setting reviewed. Original names/descriptions are preserved; review translations in CRM before publication.

`api.storefront.unpublish({ slug })` hides the menu. Anonymous `api.storefront.menu({ slug })` returns null for unpublished/unknown menus. Public results contain only snapshot fields, not organization IDs, raw Dify responses, jobs or credentials. Draft changes stay private until republishing. Republishing picks up generated images. Demo snapshot uses local illustrative photos; normal publish uses generated card images from Convex Storage.

## Demo

From frontend: `npx convex run demoMenu:seed '{}'` (internal, requires developer access). Creates ten fictional products in `Sava · Customer demo` under the existing admin organization, with four categories, confirmed example tags/ingredients and RSD prices. Preserves imported Savada data and credentials. Re-running does nothing when sava exists. Demo recipes/prices are fictional. No Dify calls.

Phone preview: `npm run dev -- --host 0.0.0.0 --port 5174` then `http://<computer-LAN-IP>:5174/menu/sava`, same Wi-Fi. Render's existing `/*` → `/index.html` rewrite supports direct route opening. Render deployment still needs configuration; local preview is not a hosted deployment.

## Photos

Restaurant interior and schnitzel supplied by project owner. Stock demo photos downloaded locally, no external visitor requests:
- Burger: https://images.unsplash.com/photo-1568901346375-23c9450c58cd
- Salad: https://images.unsplash.com/photo-1512621776951-a57141f2eefd
- Cake: https://images.unsplash.com/photo-1578985545062-69928b1d9587

Photos are illustrative and reused across recipe variations. Replace with actual restaurant photos/generated cards for real publication.
