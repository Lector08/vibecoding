import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

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
