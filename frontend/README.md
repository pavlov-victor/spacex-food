# SpaceX food CRM

React + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix, neutral), Recharts.

```sh
npm install
npm run dev
```

`npm run build` checks TypeScript and builds `dist/`. `npm run lint` runs Oxlint.

Implemented from the dashboard reference: responsive navigation, menu/category/product counters, retention and time-saved charts, add-product dialog, and a searchable list of locally added products. Added products persist in localStorage. Metrics use sample data; the product count adds locally created products to the illustrative baseline of 168.

Menus, Categories, and Org settings have explicit placeholder screens awaiting references. Log out exits the demo view; authentication and Dify/backend integration are not connected. No API keys are needed by this frontend.

UI setup follows https://ui.shadcn.com/docs/installation/vite.

Browser checks: `npx playwright install chromium` then `npx playwright test`. Alternatively, use installed Chrome: `PLAYWRIGHT_CHANNEL=chrome npx playwright test`.
