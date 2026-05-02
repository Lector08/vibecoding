import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // googleapis + google-auth-library + gaxios rely on Node-internal class
  // shapes that get mangled when bundled by Turbopack/webpack. Marking them
  // as external makes Next.js `require()` them at runtime instead, which
  // preserves their prototype methods (and fixes "missing required
  // authentication credential" errors when calling Google APIs).
  serverExternalPackages: ["googleapis", "google-auth-library", "gaxios"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  // We deliberately do NOT use a next-intl middleware. On Vercel the
  // bundler crashed both Edge runtime (MIDDLEWARE_INVOCATION_FAILED with
  // no actionable trace) and Node runtime (CJS/ESM mismatch when loading
  // /var/task/middleware.js). Defaulting to /uk via a static redirect is
  // simpler, faster, and avoids the entire problem class. The locale
  // switcher in the UI handles user-driven changes after first load.
  async redirects() {
    return [
      { source: "/", destination: "/uk", permanent: false },
      { source: "/login", destination: "/uk/login", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
