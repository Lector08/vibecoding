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
};

export default withNextIntl(nextConfig);
