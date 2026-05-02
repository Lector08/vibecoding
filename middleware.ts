import createIntlMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";

// IMPORTANT: keep the routing config inlined here. When middleware runs on
// Vercel's Node.js runtime the bundler does NOT inline cross-file imports,
// so a `from "./i18n/routing"` (or "@/i18n/routing") resolves to a sibling
// file that the strict ESM resolver then refuses to load without a ".js"
// extension. Defining `routing` in-place sidesteps the whole issue.
// The exported `routing` from `i18n/routing.ts` must stay in sync with this.
const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "uk",
  localePrefix: "always",
});

export default createIntlMiddleware(routing);

export const config = {
  // Node.js runtime (stable in Next.js 15.5+). We avoid the Edge runtime
  // because next-intl 3.26.x crashes on Edge with MIDDLEWARE_INVOCATION_FAILED
  // when Vercel injects request headers containing non-ASCII characters
  // (e.g. cf-ipcity for cities with Cyrillic / accented names). Node.js
  // decodes those headers correctly and avoids the entire bug class.
  runtime: "nodejs",

  // Run on every path except API, static files, and Next internals.
  // Locale prefix is enforced by next-intl above; auth gating is done
  // per-page in Server Components via `auth()` so the middleware stays
  // lightweight and works with both locales.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
