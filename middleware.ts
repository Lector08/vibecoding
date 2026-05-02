import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createIntlMiddleware(routing);

export const config = {
  // Run on every path except API, static files, and Next internals.
  // Locale prefix is enforced by next-intl above; auth gating is done
  // per-page in Server Components via `auth()` so the middleware stays
  // lightweight and works with both locales.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
