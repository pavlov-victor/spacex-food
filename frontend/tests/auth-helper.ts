import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Page } from "@playwright/test";
export async function signInDemo(page: Page) {
  const content = readFileSync(".env.local", "utf8");
  const url = content.match(/^VITE_CONVEX_URL=(.*)$/m)?.[1]?.trim();
  if (!url)
    throw new Error(
      "Set VITE_CONVEX_URL in .env.local for backend browser tests.",
    );
  const client = new ConvexHttpClient(url);
  const result = await client.action(api.auth.signIn, {
    provider: "password",
    params: { username: "admin", password: "123", flow: "signIn" },
  });
  if (!result.tokens) throw new Error("Demo login failed.");
  await page.addInitScript(
    ({ url, tokens }) => {
      const namespace = url.replace(/[^a-zA-Z0-9]/g, "");
      localStorage.setItem(`__convexAuthJWT_${namespace}`, tokens.token);
      localStorage.setItem(
        `__convexAuthRefreshToken_${namespace}`,
        tokens.refreshToken,
      );
    },
    { url, tokens: result.tokens },
  );
}
